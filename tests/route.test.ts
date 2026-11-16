import { describe, expect, it } from "vitest";
import { MAPS } from "../src/data/maps";
import { FIXTURE as SPOTS } from "./fixtures";
import { parent, parseRoute, toHash, type Route } from "../src/route";

const ctSpot = SPOTS.find((s) => s.side === "ct")!;
const parse = (hash: string) => parseRoute(hash, MAPS, SPOTS);

describe("parseRoute/toHash", () => {
  it.each(["#/", "#/mirage", "#/mirage/ct", `#/mirage/ct/${ctSpot.id}`])("Roundtrip %s", (hash) => {
    expect(toHash(parse(hash))).toBe(hash);
  });

  it.each(["", "#", "#/quatsch"])("%j führt zur Startseite", (hash) => {
    expect(parse(hash)).toEqual({ screen: "maps" });
  });

  it.each(["#/inferno", "#/xyz"])("%s (inaktiv/unbekannt) führt zum Map-Pool", (hash) => {
    expect(parse(hash)).toEqual({ screen: "maps" });
  });

  it.each(["#/mirage", "#/mirage/x"])("%s (fehlende/ungültige Seite) führt zur Seitenwahl", (hash) => {
    expect(parse(hash)).toEqual({ screen: "side", map: "mirage" });
  });

  it.each(["#/mirage/t", "#/mirage/t/gibtsnicht", `#/mirage/t/${ctSpot.id}`])("%s (fehlender/veralteter Spot oder falsche Seite) führt zur Karte", (hash) => {
    expect(parse(hash)).toEqual({ screen: "map", map: "mirage", side: "t" });
  });

  it("zeigt bei einem Spot einer anderen Map die Karte", () => {
    const otherSpot = { ...ctSpot, map: "inferno" };
    expect(parseRoute(`#/mirage/ct/${otherSpot.id}`, MAPS, [otherSpot])).toEqual({ screen: "map", map: "mirage", side: "ct" });
  });
});

describe("parent", () => {
  it("geht Schritt für Schritt zurück bis zur Startseite", () => {
    const spot: Route = { screen: "spot", side: "ct", map: "mirage", spot: ctSpot.id };
    expect(parent(spot)).toEqual({ screen: "map", side: "ct", map: "mirage" });
    expect(parent(parent(spot))).toEqual({ screen: "side", map: "mirage" });
    expect(parent(parent(parent(spot)))).toEqual({ screen: "maps" });
    expect(parent({ screen: "maps" })).toEqual({ screen: "maps" });
  });
});
