import { describe, expect, it } from "vitest";
import {
  imagePath,
  isLocked,
  newSpotId,
  pinMatches,
  validateInput,
} from "../supabase/functions/spots/logic";

const spot = {
  map: "mirage",
  side: "t",
  type: "smoke",
  name: "  Jungle  ",
  label: "",
  x: 44,
  y: 63,
};
const jpeg = { size: 200_000, type: "image/jpeg" };
const images = { stand: jpeg, aim: jpeg };

describe("isLocked", () => {
  it.each([[19, false], [20, true], [0, false]] as const)("sperrt bei %i Fehlversuchen: %s", (failures, locked) => {
    expect(isLocked(failures)).toBe(locked);
  });
});

describe("pinMatches", () => {
  it.each([
    ["123456", "123456", true],
    ["123457", "123456", false],
    ["123456", undefined, false],
    ["12345", "12345", false],
    ["abcdef", "abcdef", false],
  ])("prüft PIN und Mindestlänge (Fall %#)", (given, expected, matches) => {
    expect(pinMatches(given, expected)).toBe(matches);
  });
});

describe("validateInput", () => {
  it.each(["t-jungle", "abc", "a".repeat(60)])("behält eine gültige Create-ID %s", (id) => {
    expect(validateInput({ ...spot, id }, "create", images)).toMatchObject({
      ok: true, value: { id },
    });
  });

  it.each(["A B", "ab", "a".repeat(61), "", " t-jungle", "t/jungle", 42, null])(
    "lehnt eine ungültige Create-ID ab (Fall %#)", (id) => {
      expect(validateInput({ ...spot, id }, "create", images).ok).toBe(false);
    },
  );

  it.each([{}, { aim: jpeg }, { stand: jpeg }])("erlaubt fehlende Migrationsbilder mit explizitem Flag (Fall %#)", (files) => {
    const result = validateInput({ ...spot, allowMissingImages: true }, "create", files);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.value).not.toHaveProperty("allowMissingImages");
  });

  it.each([undefined, false, "true", 1])("verlangt ohne boolesches true beide Bilder (Fall %#)", (allowMissingImages) => {
    expect(validateInput({ ...spot, allowMissingImages }, "create", {}).ok).toBe(false);
  });

  it("prüft auch mit allowMissingImages die vorhandenen Bilder", () => {
    expect(validateInput({ ...spot, allowMissingImages: true }, "create", {
      aim: { size: 1_000_001, type: "image/gif" },
    }).ok).toBe(false);
  });

  it("übernimmt ausdrücklich mitgegebene Videofelder bei create", () => {
    const video = { video_id: "Q4Dwg9Z0wZ0", start_s: 0, end_s: 81 };
    expect(validateInput({ ...spot, ...video }, "create", images)).toMatchObject({
      ok: true, value: video,
    });
  });

  it("fügt ohne Videofelder keine hinzu", () => {
    const result = validateInput(spot, "create", images);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const key of ["video_id", "start_s", "end_s"]) expect(result.value).not.toHaveProperty(key);
    }
  });

  it("akzeptiert explizit leere optionale Videofelder", () => {
    const video = { video_id: null, start_s: null, end_s: null };
    expect(validateInput({ ...spot, ...video }, "create", images)).toMatchObject({
      ok: true, value: video,
    });
  });

  it.each([
    { video_id: 42 }, { video_id: "kein gültiges Video" },
    { start_s: -1 }, { start_s: "15" }, { start_s: 1.5 },
    { end_s: Infinity }, { end_s: 2_147_483_648 },
  ])("lehnt ungültige Videofelder ab (Fall %#)", (video) => {
    expect(validateInput({ ...spot, ...video }, "create", images).ok).toBe(false);
  });

  it("akzeptiert Spots auf Inferno", () => {
    expect(validateInput({ ...spot, map: "inferno" }, "create", images).ok).toBe(true);
  });

  it("lässt die bestehenden Videofelder bei Editor-Updates unverändert", () => {
    const result = validateInput({
      ...spot, id: "t-jungle", video_id: "Q4Dwg9Z0wZ0", start_s: 0, end_s: 81,
    }, "update", {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const key of ["video_id", "start_s", "end_s"]) expect(result.value).not.toHaveProperty(key);
    }
  });

  it("akzeptiert create, trimmt den Namen und setzt einen leeren Kurznamen auf null", () => {
    expect(validateInput(spot, "create", images)).toEqual({
      ok: true,
      value: { ...spot, name: "Jungle", label: null, text: null },
    });
  });

  it.each([
    ["fehlenden Namen", { name: undefined }],
    ["Namen aus Leerzeichen", { name: "   " }],
    ["inaktive Map", { map: "dust2" }],
    ["ungültige Seite", { side: "x" }],
    ["ungültigen Typ", { type: "flash" }],
    ["x über 100", { x: 101 }],
    ["y unter 0", { y: -1 }],
    ["Kurznamen mit 15 Zeichen", { label: "123456789012345" }],
    ["x als Zeichenkette", { x: "44" }],
    ["x als NaN", { x: NaN }],
    ["y als Infinity", { y: Infinity }],
    ["Kurznamen als Zahl", { label: 123 }],
    ["Anleitung als Objekt", { text: {} }],
  ])("meldet genau einen Fehler für %s", (_name, patch) => {
    const result = validateInput({ ...spot, ...patch }, "create", images);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(1);
  });

  it.each([null, undefined, [], "Jungle", 42])("weist ungültige JSON-Werte zurück (Fall %#)", (input) => {
    const result = validateInput(input, "create", images);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
  });

  it.each([
    ["fehlendes Zielbild", { stand: jpeg }],
    ["fehlendes Standbild", { aim: jpeg }],
    ["Bild über 1 MB", { stand: { ...jpeg, size: 1_000_001 }, aim: jpeg }],
    ["GIF-Bild", { stand: jpeg, aim: { ...jpeg, type: "image/gif" } }],
  ])("meldet genau einen Fehler für %s", (_name, files) => {
    const result = validateInput(spot, "create", files);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(1);
  });

  it.each(["image/jpeg", "image/png", "image/webp"])("akzeptiert %s bis einschließlich 1 MB", (type) => {
    expect(validateInput(spot, "create", {
      stand: { size: 1_000_000, type }, aim: jpeg,
    }).ok).toBe(true);
  });

  it("verlangt beim Update eine ID", () => {
    const result = validateInput(spot, "update", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(1);
  });

  it("akzeptiert ein Update ohne neue Bilder und normalisiert optionale Texte", () => {
    expect(validateInput({ ...spot, id: "t-jungle", label: "  Jungle  ", text: "  Jumpthrow  " }, "update", {})).toEqual({
      ok: true,
      value: { ...spot, id: "t-jungle", name: "Jungle", label: "Jungle", text: "Jumpthrow" },
    });
  });

  it("akzeptiert die Koordinatengrenzen und einen Kurznamen mit 14 Zeichen", () => {
    expect(validateInput({ ...spot, x: 0, y: 100, label: "12345678901234" }, "create", images).ok).toBe(true);
  });
});

describe("IDs und Bildpfade", () => {
  it("erzeugt eine ID mit einem auf 20 Zeichen gekürzten Slug", () => {
    expect(newSpotId("t", "Mid Window (aus T-Spawn)!", "ab12")).toBe("t-mid-window-aus-t-spa-ab12");
  });

  it("erstellt einen Bildpfad mit Zufallsteil", () => {
    expect(imagePath("t-x-ab12", "aim", "9f")).toBe("t-x-ab12/aim-9f.jpg");
  });
});
