import mirageRadar from "../assets/maps/mirage.png";
import type { MapInfo, Spot } from "./types";

const IMAGES = import.meta.glob<string>("../assets/lineups/*.jpg", { eager: true, import: "default" });

export const MAPS: MapInfo[] = [
  { id: "mirage", name: "Mirage", radar: mirageRadar, active: true },
  { id: "inferno", name: "Inferno", active: false },
  { id: "dust2", name: "Dust2", active: false },
];

// Landestellen in % des Radars, angelehnt an die Callouts von csdb.gg (siehe src/assets/maps/QUELLE.md).
// Quellen der Videos: siehe docs/superpowers/specs/2026-11-16-cs2-lineups-design.md
const TIGERR = "Q4Dwg9Z0wZ0";
const UTILITY10 = "SGeV9W39X68";
const NADES = "xPCYPKFG44E";

type Row = [id: string, side: Spot["side"], type: Spot["type"], name: string, label: string, area: Spot["area"], x: number, y: number, videoId: string, start: number, end: number];

const ROWS: Row[] = [
  ["t-window-spawn", "t", "smoke", "Mid Window (aus T-Spawn)", "Window", "Mid", 41, 50, TIGERR, 15, 81],
  ["t-connector", "t", "smoke", "Top Connector (aus T-Spawn)", "Connector", "Mid", 49, 51, TIGERR, 81, 115],
  ["t-catwalk-spawn", "t", "smoke", "Catwalk (aus T-Spawn)", "Catwalk", "Mid", 47, 40, TIGERR, 115, 141], // geschätzt
  ["t-mid-cross", "t", "smoke", "Mid Cross (aus T-Spawn)", "Cross", "Mid", 55, 46, TIGERR, 141, 157], // geschätzt
  ["t-window-top", "t", "smoke", "Mid Window (von Top Mid)", "Window", "Mid", 41, 50, TIGERR, 157, 218],
  ["t-catwalk-b", "t", "smoke", "Catwalk (für B)", "Catwalk", "B", 36, 38, TIGERR, 218, 256], // geschätzt
  ["t-market-window", "t", "smoke", "Market Window", "Market Window", "B", 21, 39, TIGERR, 256, 290], // geschätzt
  ["t-market-door", "t", "smoke", "Market Door", "Market Door", "B", 29, 39, TIGERR, 290, 335], // geschätzt
  ["t-ct", "t", "smoke", "Ticket/CT", "CT", "A", 46, 74, TIGERR, 335, 371], // geschätzt
  ["t-jungle", "t", "smoke", "Jungle", "Jungle", "A", 44, 63, TIGERR, 371, 403],
  ["t-stairs", "t", "smoke", "Stairs", "Stairs", "A", 53, 64, TIGERR, 403, 490],
  ["t-firebox-molly", "t", "molly", "Firebox", "Firebox", "A", 57, 70, UTILITY10, 122, 139], // geschätzt
  ["t-window-molly", "t", "molly", "Window (von Top Mid)", "Window", "Mid", 38, 47, UTILITY10, 343, 372],
  ["t-balcony-molly", "t", "molly", "Balcony", "Balcony", "B", 33, 24, UTILITY10, 452, 479], // geschätzt
  ["t-bench-molly", "t", "molly", "Bench", "Bench", "B", 14, 27, UTILITY10, 479, 514], // geschätzt
  ["ct-topmid-molly", "ct", "molly", "Top Mid", "Top Mid", "Mid", 69, 44, NADES, 821, 838],
  ["ct-bottom-con", "ct", "smoke", "Bottom Connector", "Bottom Con", "Mid", 48, 58, NADES, 909, 922],
  ["ct-ramp-molly", "ct", "molly", "Ramp", "Ramp", "A", 68, 65, NADES, 922, 931],
  ["ct-ramp", "ct", "smoke", "Ramp", "Ramp", "A", 68, 65, NADES, 931, 939],
  ["ct-palace", "ct", "smoke", "Palace (von Market)", "Palace", "A", 66, 74, NADES, 972, 988], // geschätzt
  ["ct-a-plant-molly", "ct", "molly", "A gegen den Plant", "Plant", "A", 54, 77, NADES, 1004, 1019], // geschätzt
  ["ct-b-aps", "ct", "smoke", "B Aps", "Aps", "B", 31, 22, NADES, 1041, 1048], // geschätzt
];

/** Wurfanleitung je Lineup, aus den Transkripten der Videos zusammengefasst. */
const TEXTS: Record<string, string> = {
  "t-window-spawn": "Ganz in die Ecke an der Treppe · zweiter Bogen im Teppich · Jumpthrow",
  "t-connector": "In die Mülltonne stellen · Ecke der ersten Stufe im Teppichmuster · Jumpthrow",
  "t-catwalk-spawn": "In die Mülltonne stellen · Kante des schrägen Palmblatts · Jumpthrow",
  "t-mid-cross": "In die Mülltonne stellen · Antennenspitze · normaler Wurf, kein Jump",
  "t-window-top": "Hinter den Kisten in die Ecke, ducken · Kistenecke · normaler Wurf",
  "t-catwalk-b": "Ecke in Back Alley · oberste Kante des Dachstücks · normaler Wurf",
  "t-market-window": "Gleiche Ecke · der Linie hoch bis zum Dach folgen · Jumpthrow",
  "t-market-door": "Gleiche Ecke · schräg runter bis zur Dachecke · Jumpthrow",
  "t-ct": "Ganz in die Ecke · Mitte des Holzbalkens · Jumpthrow",
  "t-jungle": "Auf den Steg, um die Ecke bis zum Holzbalken · Oberkante, leicht links · normaler Wurf",
  "t-stairs": "Gleiche Ecke wie Jungle · Risse in der Wand · Links + Rechts halten, Jumpthrow",
  "t-firebox-molly": "Knapp über die Mitte des Bauteils, über der Kante · Linksklick",
  "t-window-molly": "Linke Ecke an Top Mid, zurück bis zur Kante · mittleres Antennenstück · laufen und werfen",
  "t-balcony-molly": "Beim Rauslaufen in die Ecke · Linie in der Wand hoch bis zum Bauteil · Linksklick",
  "t-bench-molly": "Beim Hochlaufen an die rechte Wand · laufen und durchs Fenster werfen",
  "ct-topmid-molly": "Auf die Bank · Fadenkreuz setzen, ohne Maus nach links gehen · vorlaufen, Linksklick",
  "ct-bottom-con": "Auf Short hinter den Boost stellen · Linksklick",
  "ct-ramp-molly": "Aus CT-Spawn kommend · beim Vorlaufen Linksklick",
  "ct-ramp": "Rechts neben die Raketen · rechts vom Schornstein-Dach · Linksklick",
  "ct-palace": "Außerhalb von Market in die Ecke · Jumpthrow",
  "ct-a-plant-molly": "In die Ecke stellen · aufs Gebäude zielen · Linksklick",
  "ct-b-aps": "Hinter die Mülltonne stellen · Linksklick",
};

export const SPOTS: Spot[] = ROWS.map(([id, side, type, name, label, area, x, y, videoId, start, end]) => {
  const stand = IMAGES[`../assets/lineups/${id}-stand.jpg`];
  const aim = IMAGES[`../assets/lineups/${id}-aim.jpg`];
  return {
    id, map: "mirage", side, type, name, label, area, x, y, videoId, start, end,
    ...(TEXTS[id] ? { text: TEXTS[id] } : {}),
    ...(stand !== undefined ? { stand } : {}),
    ...(aim !== undefined ? { aim } : {}),
  };
});

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
