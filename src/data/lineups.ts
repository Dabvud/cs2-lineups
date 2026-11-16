import type { MapInfo, Spot } from "./types";

export const MAPS: MapInfo[] = [
  { id: "mirage", name: "Mirage", active: true },
  { id: "inferno", name: "Inferno", active: false },
  { id: "dust2", name: "Dust2", active: false },
];

// Quellen: siehe docs/superpowers/specs/2026-11-16-cs2-lineups-design.md
const TIGERR = "Q4Dwg9Z0wZ0";
const UTILITY10 = "SGeV9W39X68";
const NADES = "xPCYPKFG44E";

type Row = [id: string, side: Spot["side"], type: Spot["type"], name: string, label: string, area: Spot["area"], x: number, y: number, videoId: string, start: number, end: number];

const ROWS: Row[] = [
  ["t-window-spawn", "t", "smoke", "Mid Window (aus T-Spawn)", "Window", "Mid", 40, 45, TIGERR, 15, 81],
  ["t-connector", "t", "smoke", "Top Connector (aus T-Spawn)", "Connector", "Mid", 45, 40, TIGERR, 81, 115],
  ["t-catwalk-spawn", "t", "smoke", "Catwalk (aus T-Spawn)", "Catwalk", "Mid", 35, 40, TIGERR, 115, 141],
  ["t-mid-cross", "t", "smoke", "Mid Cross (aus T-Spawn)", "Cross", "Mid", 50, 45, TIGERR, 141, 157],
  ["t-window-top", "t", "smoke", "Mid Window (von Top Mid)", "Window", "Mid", 40, 45, TIGERR, 157, 218],
  ["t-catwalk-b", "t", "smoke", "Catwalk (für B)", "Catwalk", "B", 30, 35, TIGERR, 218, 256],
  ["t-market-window", "t", "smoke", "Market Window", "Market Window", "B", 20, 30, TIGERR, 256, 290],
  ["t-market-door", "t", "smoke", "Market Door", "Market Door", "B", 25, 25, TIGERR, 290, 335],
  ["t-ct", "t", "smoke", "Ticket/CT", "CT", "A", 60, 70, TIGERR, 335, 371],
  ["t-jungle", "t", "smoke", "Jungle", "Jungle", "A", 55, 60, TIGERR, 371, 403],
  ["t-stairs", "t", "smoke", "Stairs", "Stairs", "A", 60, 60, TIGERR, 403, 490],
  ["t-firebox-molly", "t", "molly", "Firebox", "Firebox", "A", 70, 75, UTILITY10, 122, 139],
  ["t-window-molly", "t", "molly", "Window (von Top Mid)", "Window", "Mid", 42, 47, UTILITY10, 343, 372],
  ["t-balcony-molly", "t", "molly", "Balcony", "Balcony", "B", 15, 20, UTILITY10, 452, 479],
  ["t-bench-molly", "t", "molly", "Bench", "Bench", "B", 20, 20, UTILITY10, 479, 514],
  ["ct-window", "ct", "smoke", "Window", "Window", "Mid", 45, 50, NADES, 796, 821],
  ["ct-topmid-molly", "ct", "molly", "Top Mid", "Top Mid", "Mid", 55, 50, NADES, 821, 838],
  ["ct-bottom-con", "ct", "smoke", "Bottom Connector", "Bottom Con", "Mid", 50, 55, NADES, 882, 922],
  ["ct-ramp-molly", "ct", "molly", "Ramp", "Ramp", "A", 75, 65, NADES, 922, 931],
  ["ct-ramp", "ct", "smoke", "Ramp", "Ramp", "A", 77, 63, NADES, 931, 939],
  ["ct-palace", "ct", "smoke", "Palace (von Market)", "Palace", "A", 80, 80, NADES, 972, 988],
  ["ct-a-def", "ct", "smoke", "A defensiv", "A def.", "A", 70, 70, NADES, 988, 1005],
  ["ct-a-plant-molly", "ct", "molly", "A gegen den Plant", "Plant", "A", 72, 75, NADES, 1005, 1030],
  ["ct-b-aps", "ct", "smoke", "B Aps", "Aps", "B", 15, 30, NADES, 1041, 1048],
  ["ct-b-def", "ct", "smoke", "B defensiv", "B def.", "B", 20, 25, NADES, 1074, 1123],
];

export const SPOTS: Spot[] = ROWS.map(([id, side, type, name, label, area, x, y, videoId, start, end]) => ({
  id, map: "mirage", side, type, name, label, area, x, y, videoId, start, end,
}));

/** Prüft die Daten; leere Liste = gültig. */
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
    if (!(s.start < s.end)) errors.push(`${at}: start muss vor end liegen`);
    if (!s.videoId) errors.push(`${at}: videoId fehlt`);
  }
  return errors;
}
