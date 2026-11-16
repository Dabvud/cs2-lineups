import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import type { NadeType, Side, Spot } from "./types";

export type SpotRow = {
  id: string; map: string; side: Side; type: NadeType; name: string; label: string | null;
  x: number; y: number; stand_path: string | null; aim_path: string | null; text: string | null;
  video_id: string | null; start_s: number | null; end_s: number | null;
};

export function imageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/lineups/${path}`;
}

export function toSpot(row: SpotRow): Spot {
  return {
    id: row.id, map: row.map, side: row.side, type: row.type, name: row.name,
    label: row.label ?? undefined, x: row.x, y: row.y,
    stand: row.stand_path ? imageUrl(row.stand_path) : undefined,
    aim: row.aim_path ? imageUrl(row.aim_path) : undefined,
    text: row.text ?? undefined, videoId: row.video_id ?? undefined,
    start: row.start_s ?? undefined, end: row.end_s ?? undefined,
  };
}

export async function fetchSpots(): Promise<Spot[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/spots?select=*`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!response.ok) throw new Error(`Spots laden fehlgeschlagen (${response.status})`);
  const rows: SpotRow[] = await response.json();
  return rows.map(toSpot);
}

const CACHE_KEY = "cs2-lineups.spots";

function isSpot(value: unknown): value is Spot {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return typeof s.id === "string" && typeof s.map === "string" && typeof s.name === "string"
    && (s.side === "t" || s.side === "ct") && (s.type === "smoke" || s.type === "molly")
    && typeof s.x === "number" && Number.isFinite(s.x) && s.x >= 0 && s.x <= 100
    && typeof s.y === "number" && Number.isFinite(s.y) && s.y >= 0 && s.y <= 100
    && ["label", "stand", "aim", "text", "videoId"].every((key) => s[key] === undefined || typeof s[key] === "string")
    && ["start", "end"].every((key) => s[key] === undefined || (typeof s[key] === "number" && Number.isFinite(s[key])));
}

export function loadCache(): Spot[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every(isSpot) ? value : null;
  } catch {
    return null;
  }
}

export function saveCache(spots: Spot[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(spots));
  } catch {
    // Der geladene Stand bleibt bei gesperrtem oder vollem Speicher im State verfügbar.
  }
}
