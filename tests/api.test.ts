import { expect, it, vi } from "vitest";
import { checkPin, deleteSpot, InvalidError, LockedError, PinError, saveSpot } from "../src/data/api";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../src/config";
import { imageUrl } from "../src/data/remote";
import type { SpotInput } from "../supabase/functions/spots/logic";

const input: SpotInput = { map: "mirage", side: "t", type: "smoke", name: "Test", x: 44, y: 63 };
function reply(status: number, body: unknown = { ok: true }) {
  const fetch = vi.fn().mockResolvedValue({ ok: status === 200, status, json: async () => body });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

it("prüft den PIN per multipart und Authorization-Header", async () => {
  const fetch = reply(200);
  expect(await checkPin("123456")).toBe(true);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe(`${SUPABASE_URL}/functions/v1/spots`);
  expect(options.method).toBe("POST");
  expect(options.headers.Authorization).toBe(`Bearer ${SUPABASE_ANON_KEY}`);
  expect(options.body.get("pin")).toBe("123456");
  expect(options.body.get("action")).toBe("check");
});

it("gibt nur bei 401 false zurück, bei Netz- und Serverfehlern einen Fehler", async () => {
  reply(401);
  expect(await checkPin("123456")).toBe(false);
  reply(500);
  await expect(checkPin("123456")).rejects.toThrow();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  await expect(checkPin("123456")).rejects.toThrow("offline");
});

it("wirft bei 429 einen LockedError bei der PIN-Prüfung", async () => {
  reply(429, { error: "locked" });
  await expect(checkPin("123456")).rejects.toBeInstanceOf(LockedError);
});

it("wirft bei 429 einen LockedError beim Speichern und Löschen", async () => {
  reply(429, { error: "locked" });
  await expect(saveSpot("123456", "update", input, {})).rejects.toBeInstanceOf(LockedError);
  await expect(deleteSpot("123456", "t-test")).rejects.toBeInstanceOf(LockedError);
});

it("sendet Spot und Bilder und wandelt die Serverzeile in einen Spot um", async () => {
  const fetch = reply(200, { ok: true, spot: { ...input, id: "t-test", label: null, stand_path: "t-test/stand-abc.jpg", aim_path: null, text: null, video_id: null, start_s: null, end_s: null } });
  const blob = new Blob(["image"], { type: "image/jpeg" });
  const spot = await saveSpot("123456", "create", input, { stand: blob, aim: blob });
  const form = fetch.mock.calls[0][1].body as FormData;
  expect(form.get("action")).toBe("create");
  expect(JSON.parse(form.get("spot") as string)).toEqual(input);
  expect(form.get("stand")).toBeInstanceOf(Blob);
  expect((form.get("aim") as Blob).type).toBe("image/jpeg");
  expect(spot.stand).toBe(imageUrl("t-test/stand-abc.jpg"));
});

it("übersetzt 401, 400 und andere HTTP-Fehler", async () => {
  reply(401);
  await expect(saveSpot("123456", "update", input, {})).rejects.toBeInstanceOf(PinError);
  reply(400, { error: "invalid", details: ["Name fehlt."] });
  try {
    await saveSpot("123456", "create", input, {});
    expect.fail("Fehler erwartet");
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidError);
    expect((error as InvalidError).details).toEqual(["Name fehlt."]);
  }
  reply(404);
  await expect(deleteSpot("123456", "t-test")).rejects.toThrow();
});

it("löscht mit action=delete und nur der ID als Spot", async () => {
  const fetch = reply(200);
  await deleteSpot("123456", "t-test");
  const form = fetch.mock.calls[0][1].body as FormData;
  expect(form.get("action")).toBe("delete");
  expect(JSON.parse(form.get("spot") as string)).toEqual({ id: "t-test" });
});
