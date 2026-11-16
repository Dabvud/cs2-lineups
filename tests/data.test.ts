import { describe, expect, it } from "vitest";
import { MAPS } from "../src/data/maps";
import { validate } from "../src/data/validate";
import { FIXTURE as SPOTS } from "./fixtures";
import type { Spot } from "../src/data/types";

const base = SPOTS[0];
const errorsFor = (patch: Partial<Spot> | Record<string, unknown>) => validate(MAPS, [{ ...base, ...patch } as Spot]);

describe("validate", () => {
  it("akzeptiert den echten Datenbestand", () => {
    expect(validate(MAPS, SPOTS)).toEqual([]);
  });

  it("meldet doppelte ids", () => {
    expect(validate(MAPS, [base, { ...base }])).toHaveLength(1);
  });

  it("akzeptiert Spots ohne Videoangaben", () => {
    expect(errorsFor({ videoId: undefined, start: undefined, end: undefined })).toEqual([]);
  });

  it.each([
    ["x über 100", { x: 101 }],
    ["y unter 0", { y: -1 }],
    ["start nicht vor end", { start: 30, end: 30 }],
    ["unbekannte Map", { map: "gibtsnicht" }],
    ["ungültige Seite", { side: "x" }],
    ["ungültiger Typ", { type: "flash" }],
    ["inaktive Map", { map: "inferno" }],
  ])("meldet %s", (_name, patch) => {
    expect(errorsFor(patch)).toHaveLength(1);
  });
});

describe("Mirage-Bestand", () => {
  it("hat zu jedem Lineup eine Wurfanleitung", () => {
    expect(SPOTS.filter((s) => !s.text).map((s) => s.id)).toEqual([]);
  });

  it("hat 15 T- und 7 CT-Lineups", () => {
    expect(SPOTS.filter((s) => s.side === "t")).toHaveLength(15);
    expect(SPOTS.filter((s) => s.side === "ct")).toHaveLength(7);
  });

  it.each([
    ["t", "Ticket/CT", "Q4Dwg9Z0wZ0", 335, 371],
    ["t", "Bench", "SGeV9W39X68", 479, 514],
    ["ct", "B Aps", "xPCYPKFG44E", 1041, 1048],
  ])("%s %s hat die Zeiten aus der Spec", (side, name, videoId, start, end) => {
    const spot = SPOTS.find((s) => s.side === side && s.name === name);
    expect(spot).toMatchObject({ videoId, start, end });
  });
});
