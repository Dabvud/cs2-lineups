import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

// Node 22. Erst die aktualisierte Function deployen, dann manuell ausführen:
// node scripts/migrate.mjs [datei.json]   (Standard: spots.json, z. B. inferno.json)
const seedDirectory = new URL("./seed/", import.meta.url);
const missingImages = new Map([
  ["ct-topmid-molly", new Set(["stand", "aim"])],
  ["ct-a-plant-molly", new Set(["stand", "aim"])],
  ["ct-ramp-molly", new Set(["stand"])],
]);

function configValue(source, name) {
  const match = source.match(new RegExp(`^\\s*export\\s+const\\s+${name}\\s*=\\s*(["'])([^"'\\r\\n]+)\\1\\s*;?`, "m"));
  if (!match) throw new Error(`${name} fehlt in src/config.ts.`);
  return match[2];
}

async function imageFile(id, kind) {
  try {
    const bytes = await readFile(new URL(`images/${id}-${kind}.jpg`, seedDirectory));
    return new Blob([bytes], { type: "image/jpeg" });
  } catch (error) {
    // Nur die bekannten Alt-Spots dürfen unvollständige Bilder haben.
    if (error.code === "ENOENT" && missingImages.get(id)?.has(kind)) return undefined;
    throw new Error(`Bild ${id}-${kind}.jpg konnte nicht gelesen werden (${error.code ?? "unbekannt"}).`);
  }
}

async function main() {
  const config = await readFile(new URL("../src/config.ts", import.meta.url), "utf8");
  const url = configValue(config, "SUPABASE_URL").replace(/\/$/, "");
  const anonKey = configValue(config, "SUPABASE_ANON_KEY");
  const spots = JSON.parse(await readFile(new URL(process.argv[2] ?? "spots.json", seedDirectory), "utf8"));
  if (!Array.isArray(spots) || spots.some((spot) => !spot || typeof spot.id !== "string" || !/^[a-z0-9-]{3,60}$/.test(spot.id))) {
    throw new Error("Seed enthält ungültige Spots oder IDs.");
  }

  const readline = createInterface({ input: stdin, output: stdout });
  let pin;
  try {
    pin = (await readline.question("PIN eingeben: ")).trim();
  } finally {
    readline.close();
  }
  if (!/^\d{6,}$/.test(pin)) throw new Error("PIN muss aus mindestens 6 Ziffern bestehen.");

  for (const spot of spots) {
    const { id, map, side, type, name, label, x, y, text, videoId, start, end } = spot;
    try {
      const stand = await imageFile(id, "stand");
      const aim = await imageFile(id, "aim");
      const input = {
        id, map, side, type, name, label, x, y, text,
        video_id: videoId, start_s: start, end_s: end,
        ...(!stand || !aim ? { allowMissingImages: true } : {}),
      };
      const body = new FormData();
      body.set("pin", pin);
      body.set("action", "create");
      body.set("spot", JSON.stringify(input));
      if (stand) body.set("stand", stand, `${id}-stand.jpg`);
      if (aim) body.set("aim", aim, `${id}-aim.jpg`);

      const response = await fetch(`${url}/functions/v1/spots`, {
        method: "POST",
        headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
        body,
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 409) {
        console.log(`skip ${id}`);
        continue;
      }
      const responseText = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseText}`);
      const result = JSON.parse(responseText);
      if (result.ok !== true || result.spot?.id !== id) {
        throw new Error("Unerwartete Serverantwort: feste Spot-ID fehlt. Ist die aktuelle Function deployed?");
      }
      console.log(`ok ${id}`);
    } catch (error) {
      console.error(`fehler ${id}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(`fehler: ${error.message}`);
  process.exitCode = 1;
});
