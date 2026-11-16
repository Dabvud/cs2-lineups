import { beforeEach, expect, it, vi } from "vitest";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../src/config";
import { fetchSpots, imageUrl, loadCache, saveCache, toSpot, type SpotRow } from "../src/data/remote";
import { FIXTURE, stubFetch } from "./fixtures";

beforeEach(() => localStorage.clear());

const row: SpotRow = {
  id: "t-jungle", map: "mirage", side: "t", type: "smoke", name: "Jungle",
  label: null, x: 44, y: 63, stand_path: "t-jungle/stand-123.jpg", aim_path: null,
  text: null, video_id: null, start_s: null, end_s: null,
};

it("wandelt Bildpfade in öffentliche URLs und null in undefined um", () => {
  expect(imageUrl("t-jungle/stand-123.jpg")).toBe(`${SUPABASE_URL}/storage/v1/object/public/lineups/t-jungle/stand-123.jpg`);
  expect(toSpot(row)).toEqual({
    id: "t-jungle", map: "mirage", side: "t", type: "smoke", name: "Jungle",
    label: undefined, x: 44, y: 63, stand: imageUrl(row.stand_path!), aim: undefined,
    text: undefined, videoId: undefined, start: undefined, end: undefined,
  });
});

it("übernimmt optionale Videoangaben und Start bei 0", () => {
  expect(toSpot({ ...row, video_id: "video", start_s: 0, end_s: 30, text: "Wurf", label: "Kurz", aim_path: "aim.jpg" }))
    .toMatchObject({ videoId: "video", start: 0, end: 30, text: "Wurf", label: "Kurz", aim: imageUrl("aim.jpg") });
});

it("lädt Spots mit apikey und Authorization über die REST-API", async () => {
  const fetch = stubFetch();
  const spots = await fetchSpots();
  expect(fetch).toHaveBeenCalledWith(`${SUPABASE_URL}/rest/v1/spots?select=*`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  expect(spots).toHaveLength(22);
  expect(spots.find((s) => s.id === "t-jungle")?.stand).toBe(imageUrl("stand.jpg"));
});

it("meldet HTTP-Fehler", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
  await expect(fetchSpots()).rejects.toThrow();
});

it("speichert und liest den letzten Stand, auch eine leere Liste", () => {
  expect(loadCache()).toBeNull();
  saveCache(FIXTURE);
  expect(loadCache()).toEqual(FIXTURE);
  saveCache([]);
  expect(loadCache()).toEqual([]);
});

it.each(["kaputt", "null", "{}", "[null]", '[{"id":"x"}]'])("ignoriert kaputten Cache-Inhalt %s", (content) => {
  localStorage.setItem("cs2-lineups.spots", content);
  expect(loadCache()).toBeNull();
});

it("verträgt gesperrten oder vollen localStorage", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("gesperrt"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("voll"); });
  expect(loadCache()).toBeNull();
  expect(() => saveCache(FIXTURE)).not.toThrow();
});
