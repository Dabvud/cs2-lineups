import { vi } from "vitest";
import seed from "../scripts/seed/spots.json";
import type { Spot } from "../src/data/types";
import type { SpotRow } from "../src/data/remote";

export const FIXTURE: Spot[] = (seed as Spot[]).map((spot) => ({
  ...spot,
  ...(spot.id === "t-jungle" ? { stand: "https://x/stand.jpg", aim: "https://x/aim.jpg" } : {}),
}));

export function seedCache(spots = FIXTURE) {
  localStorage.setItem("cs2-lineups.spots", JSON.stringify(spots));
}

export function stubFetch(spots = FIXTURE) {
  const rows: SpotRow[] = spots.map((spot) => ({
    id: spot.id, map: spot.map, side: spot.side, type: spot.type, name: spot.name,
    label: spot.label ?? null, x: spot.x, y: spot.y,
    stand_path: spot.stand ? new URL(spot.stand).pathname.slice(1) : null,
    aim_path: spot.aim ? new URL(spot.aim).pathname.slice(1) : null,
    text: spot.text ?? null, video_id: spot.videoId ?? null,
    start_s: spot.start ?? null, end_s: spot.end ?? null,
  }));
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => rows });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

export function stubFetchFail() {
  const fetch = vi.fn().mockRejectedValue(new Error("offline"));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
