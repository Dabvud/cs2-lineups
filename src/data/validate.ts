import type { MapInfo, Spot } from "./types";

/** Prüft die Daten; leere Liste = gültig. Videoangaben sind optional. */
export function validate(maps: MapInfo[], spots: Spot[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const pct = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;
  for (const s of spots) {
    const at = `Spot ${s.id}`;
    if (seen.has(s.id)) errors.push(`${at}: id doppelt`);
    seen.add(s.id);
    const map = maps.find((m) => m.id === s.map);
    if (!map) errors.push(`${at}: Map ${s.map} unbekannt`);
    else if (!map.active) errors.push(`${at}: Map ${s.map} ist nicht aktiv`);
    if (s.side !== "t" && s.side !== "ct") errors.push(`${at}: Seite ${s.side} ungültig`);
    if (s.type !== "smoke" && s.type !== "molly") errors.push(`${at}: Typ ${s.type} ungültig`);
    if (!pct(s.x) || !pct(s.y)) errors.push(`${at}: Koordinaten außerhalb 0–100`);
    if (s.start !== undefined && s.end !== undefined && !(s.start < s.end)) {
      errors.push(`${at}: start muss vor end liegen`);
    }
  }
  return errors;
}
