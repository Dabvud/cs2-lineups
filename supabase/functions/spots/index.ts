import { createClient } from "jsr:@supabase/supabase-js@2";
import { imagePath, isLocked, newSpotId, PIN_WINDOW_MINUTES, pinMatches, validateInput } from "./logic.ts";
import type { Action } from "./logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function invalid(...details: string[]): Response {
  return reply(400, { error: "invalid", details });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return invalid("Nur POST ist erlaubt.");

  let form: FormData;
  try {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      return invalid("multipart/form-data wird erwartet.");
    }
    form = await request.formData();
  } catch {
    return invalid("Formulardaten konnten nicht gelesen werden.");
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(500, { error: "server" });

  let client: ReturnType<typeof createClient>;
  try {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const now = Date.now();
    const { count, error } = await client.from("pin_attempts")
      .select("id", { count: "exact", head: true })
      .gte("at", new Date(now - PIN_WINDOW_MINUTES * 60_000).toISOString());
    if (error) throw error;
    if (count === null) throw new Error("Anzahl der PIN-Fehlversuche fehlt.");
    // Die globale Sperre gilt auch für einen richtigen PIN.
    if (isLocked(count)) return reply(429, { error: "locked" });

    const pin = form.get("pin");
    if (!pinMatches(typeof pin === "string" ? pin : "", Deno.env.get("EDIT_PIN"))) {
      const { error: insertError } = await client.from("pin_attempts").insert({});
      if (insertError) throw insertError;
      const { error: cleanupError } = await client.from("pin_attempts").delete()
        .lt("at", new Date(now - 24 * 60 * 60_000).toISOString());
      if (cleanupError) throw cleanupError;
      await sleep(1000);
      return reply(401, { error: "pin" });
    }
  } catch {
    console.error("spots: PIN-Prüfung fehlgeschlagen.");
    return reply(500, { error: "server" });
  }

  const action = form.get("action");
  const actions: Action[] = ["check", "create", "update", "delete"];
  if (typeof action !== "string" || !actions.includes(action as Action)) return invalid("Unbekannte Aktion.");
  if (action === "check") return reply(200, { ok: true });

  let input: unknown;
  try {
    const spot = form.get("spot");
    if (typeof spot !== "string") return invalid("Spot fehlt.");
    input = JSON.parse(spot);
  } catch {
    return invalid("Spot enthält kein gültiges JSON.");
  }

  const files: { stand?: File; aim?: File } = {};
  for (const kind of ["stand", "aim"] as const) {
    const file = form.get(kind);
    if (file !== null) {
      if (!(file instanceof File)) return invalid(`${kind} muss eine Datei sein.`);
      files[kind] = file;
    }
  }

  let id: string;
  let fields: Record<string, unknown> = {};
  if (action === "delete") {
    if (!input || typeof input !== "object" || Array.isArray(input)
      || !("id" in input) || typeof input.id !== "string" || !input.id.trim()) {
      return invalid("Gültige Spot-ID fehlt.");
    }
    id = input.id.trim();
  } else {
    // Die Aktionsliste oben beschränkt diesen Zweig auf create/update.
    const result = validateInput(input, action as "create" | "update", files);
    if (!result.ok) return invalid(...result.errors);
    const { id: inputId, ...value } = result.value;
    id = action === "create"
      ? inputId ?? newSpotId(value.side, value.name, crypto.randomUUID().slice(0, 6))
      : inputId!;
    fields = { ...value, updated_at: new Date().toISOString() };
  }

  // Neue Uploads bei einem fehlgeschlagenen DB-Schreibvorgang wieder entfernen.
  const uploaded: string[] = [];
  let saved = false;
  try {
    const bucket = client.storage.from("lineups");
    try {
      let old: { stand_path: string | null; aim_path: string | null } | null = null;
      // Auch vor Create prüfen: Wiederholte Migrationen laden keine Bilder erneut hoch.
      if (action === "create") {
        const { data, error } = await client.from("spots").select("id").eq("id", id).maybeSingle();
        if (error) throw error;
        if (data) return reply(409, { error: "exists" });
      } else {
        const { data, error } = await client.from("spots").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!data) return reply(404, { error: "not_found" });
        old = data;
      }

      if (action === "delete") {
        const paths = [old!.stand_path, old!.aim_path].filter((path): path is string => !!path);
        if (paths.length) {
          const { error } = await bucket.remove(paths);
          if (error) throw error;
        }
        const { error } = await client.from("spots").delete().eq("id", id);
        if (error) throw error;
        return reply(200, { ok: true });
      }

      const replaced: string[] = [];
      for (const kind of ["stand", "aim"] as const) {
        const file = files[kind];
        if (!file) continue;
        const path = imagePath(id, kind, crypto.randomUUID().slice(0, 6));
        const { error } = await bucket.upload(path, file, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        uploaded.push(path);
        fields[`${kind}_path`] = path;
        const oldPath = old?.[`${kind}_path`];
        if (oldPath) replaced.push(oldPath);
      }

      // Erst die neuen Pfade speichern, damit ein DB-Fehler keine alten Bilder zerstört.
      const query = action === "create"
        ? client.from("spots").insert({ id, ...fields })
        : client.from("spots").update(fields).eq("id", id);
      const { data, error } = await query.select("*").single();
      if (error) throw error;
      saved = true;
      if (replaced.length) {
        // Gespeichert ist schon – ein liegengebliebenes altes Bild ist kein Fehler für den Nutzer.
        const { error: removeError } = await bucket.remove(replaced);
        if (removeError) console.error("spots: Altes Bild konnte nicht gelöscht werden.");
      }
      return reply(200, { ok: true, spot: data });
    } catch (error) {
      if (!saved && uploaded.length) {
        const { error: cleanupError } = await bucket.remove(uploaded);
        if (cleanupError) console.error("spots: Neue Bilder konnten nicht aufgeräumt werden.");
      }
      // Ein paralleler Create kann die ID zwischen Prüfung und Insert belegen.
      if (action === "create" && error && typeof error === "object" && "code" in error && error.code === "23505") {
        return reply(409, { error: "exists" });
      }
      throw error;
    }
  } catch {
    // Keine Formulardaten oder Secrets protokollieren bzw. an den Client geben.
    console.error("spots: Datenbank- oder Storage-Operation fehlgeschlagen.");
    return reply(500, { error: "server" });
  }
});
