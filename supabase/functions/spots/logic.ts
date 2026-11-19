export type SpotInput = {
  id?: string;
  map: string;
  side: "t" | "ct";
  type: "smoke" | "molly";
  name: string;
  label?: string | null;
  x: number;
  y: number;
  text?: string | null;
  video_id?: string | null;
  start_s?: number | null;
  end_s?: number | null;
};

export type Action = "check" | "create" | "update" | "delete";

// Doppelt zu src/data/maps.ts: Bei einer neuen Map beide Listen ändern.
export const ACTIVE_MAPS = ["mirage", "inferno"];
export const MAX_IMAGE_BYTES = 1_000_000;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PIN_WINDOW_MINUTES = 10;
export const PIN_MAX_FAILURES = 20;

export function isLocked(failuresInWindow: number): boolean {
  return failuresInWindow >= PIN_MAX_FAILURES;
}

export function pinMatches(given: string, expected: string | undefined): boolean {
  if (!expected || !/^\d{6,}$/.test(expected)) return false;
  let difference = given.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ (given.charCodeAt(i) || 0);
  }
  return difference === 0;
}

export function validateInput(
  input: unknown,
  action: "create" | "update",
  images: { stand?: { size: number; type: string }; aim?: { size: number; type: string } },
): { ok: true; value: SpotInput } | { ok: false; errors: string[] } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Spot muss ein JSON-Objekt sein."] };
  }

  const data = input as Record<string, unknown>;
  const errors: string[] = [];
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const id = typeof data.id === "string" ? data.id.trim() : "";
  const label = typeof data.label === "string" ? data.label.trim() || null : null;
  const text = typeof data.text === "string" ? data.text.trim() || null : null;

  if (!name) errors.push("Name fehlt.");
  if (typeof data.map !== "string" || !ACTIVE_MAPS.includes(data.map)) errors.push("Map ist nicht aktiv.");
  if (data.side !== "t" && data.side !== "ct") errors.push("Seite muss t oder ct sein.");
  if (data.type !== "smoke" && data.type !== "molly") errors.push("Typ muss smoke oder molly sein.");
  for (const key of ["x", "y"] as const) {
    const coordinate = data[key];
    if (typeof coordinate !== "number" || !Number.isFinite(coordinate) || coordinate < 0 || coordinate > 100) {
      errors.push(`${key} muss zwischen 0 und 100 liegen.`);
    }
  }
  if (data.label != null && typeof data.label !== "string") {
    errors.push("Kurzname muss Text sein.");
  } else if (label && label.length > 14) {
    errors.push("Kurzname darf höchstens 14 Zeichen haben.");
  }
  if (data.text != null && typeof data.text !== "string") errors.push("Wurfanleitung muss Text sein.");
  if ((action === "update" && !id) || (data.id !== undefined && typeof data.id !== "string")) {
    errors.push("Gültige Spot-ID fehlt.");
  } else if (action === "create" && data.id !== undefined && !/^[a-z0-9-]{3,60}$/.test(data.id as string)) {
    errors.push("Spot-ID muss aus 3 bis 60 Kleinbuchstaben, Ziffern oder Bindestrichen bestehen.");
  }

  // Nur create übernimmt Migrationsvideos; Editor-Updates erhalten vorhandene Werte.
  const video: Pick<SpotInput, "video_id" | "start_s" | "end_s"> = {};
  if (action === "create") {
    if (data.video_id !== undefined) {
      if (data.video_id !== null && (typeof data.video_id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(data.video_id))) {
        errors.push("Video-ID ist ungültig.");
      } else {
        video.video_id = data.video_id as string | null;
      }
    }
    for (const key of ["start_s", "end_s"] as const) {
      const seconds = data[key];
      if (seconds === undefined) continue;
      if (seconds !== null && (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 0 || seconds > 2_147_483_647)) {
        errors.push(`${key} muss eine nicht negative ganze Sekundenzahl sein.`);
      } else {
        video[key] = seconds as number | null;
      }
    }
  }

  for (const kind of ["stand", "aim"] as const) {
    const image = images[kind];
    const title = kind === "stand" ? "Bild ‚Hier hinstellen‘" : "Bild ‚Hierhin zielen‘";
    if (!image) {
      // Der HTTP-Handler prüft den PIN, bevor er diese Ausnahme zulässt.
      if (action === "create" && data.allowMissingImages !== true) errors.push(`${title} fehlt.`);
      continue;
    }
    if (!Number.isFinite(image.size) || image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
      errors.push(`${title} muss zwischen 1 Byte und 1 MB groß sein.`);
    }
    if (!IMAGE_TYPES.includes(image.type)) errors.push(`${title} muss JPEG, PNG oder WebP sein.`);
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      ...(id ? { id } : {}),
      map: data.map as string,
      side: data.side as SpotInput["side"],
      type: data.type as SpotInput["type"],
      name,
      label,
      x: data.x as number,
      y: data.y as number,
      text,
      ...video,
    },
  };
}

export function newSpotId(side: "t" | "ct", name: string, rand: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);
  return `${side}-${slug}-${rand}`;
}

export function imagePath(id: string, kind: "stand" | "aim", rand: string): string {
  return `${id}/${kind}-${rand}.jpg`;
}
