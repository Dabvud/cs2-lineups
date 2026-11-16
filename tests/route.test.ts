import { describe, expect, it } from "vitest";
import { MAPS, SPOTS } from "../src/data/lineups";
import { parent, parseRoute, toHash, type Route } from "../src/route";

const ctSpot = SPOTS.find((s) => s.side === "ct")!;
const parse = (hash: string) => parseRoute(hash, MAPS, SPOTS);

describe("parseRoute/toHash", () => {
  it.each(["#/", "#/t", "#/ct/mirage", `#/ct/mirage/${ctSpot.id}`])("Roundtrip %s", (hash) => {
    expect(toHash(parse(hash))).toBe(hash);
  });

  it.each(["", "#", "#/quatsch"])("%j führt zur Startseite", (hash) => {
    expect(parse(hash)).toEqual({ screen: "side" });
  });

  it.each(["#/t/inferno", "#/t/xyz"])("%s (inaktiv/unbekannt) führt zum Map-Pool", (hash) => {
    expect(parse(hash)).toEqual({ screen: "maps", side: "t" });
  });

  it.each(["#/t/mirage/gibtsnicht", `#/t/mirage/${ctSpot.id}`])("%s (veraltet/falsche Seite) führt zur Karte", (hash) => {
    expect(parse(hash)).toEqual({ screen: "map", side: "t", map: "mirage" });
  });
});

describe("parent", () => {
  it("geht Schritt für Schritt zurück bis zur Startseite", () => {
    const spot: Route = { screen: "spot", side: "ct", map: "mirage", spot: ctSpot.id };
    expect(parent(spot)).toEqual({ screen: "map", side: "ct", map: "mirage" });
    expect(parent(parent(spot))).toEqual({ screen: "maps", side: "ct" });
    expect(parent(parent(parent(spot)))).toEqual({ screen: "side" });
    expect(parent({ screen: "side" })).toEqual({ screen: "side" });
  });
});
