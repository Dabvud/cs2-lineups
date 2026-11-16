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
};

export type Action = "check" | "create" | "update" | "delete";

// Doppelt zu src/data/maps.ts: Bei einer neuen Map beide Listen ändern.
export const ACTIVE_MAPS = ["mirage"];
export const MAX_IMAGE_BYTES = 1_000_000;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
  }

  for (const kind of ["stand", "aim"] as const) {
    const image = images[kind];
    const title = kind === "stand" ? "Bild ‚Hier hinstellen‘" : "Bild ‚Hierhin zielen‘";
    if (!image) {
      if (action === "create") errors.push(`${title} fehlt.`);
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
