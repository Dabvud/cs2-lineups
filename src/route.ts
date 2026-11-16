import type { MapInfo, Side, Spot } from "./data/types";

export type Route =
  | { screen: "side" }
  | { screen: "maps"; side: Side }
  | { screen: "map"; side: Side; map: string }
  | { screen: "spot"; side: Side; map: string; spot: string };

/** Unbekannte oder veraltete Teile fallen auf die nächsthöhere gültige Seite zurück. */
export function parseRoute(hash: string, maps: MapInfo[], spots: Spot[]): Route {
  const [side, map, spot] = hash.replace(/^#\/?/, "").split("/");
  if (side !== "t" && side !== "ct") return { screen: "side" };
  if (!map || !maps.some((m) => m.id === map && m.active)) return { screen: "maps", side };
  if (!spot || !spots.some((s) => s.id === spot && s.map === map && s.side === side)) return { screen: "map", side, map };
  return { screen: "spot", side, map, spot };
}

export function toHash(route: Route): string {
  switch (route.screen) {
    case "side": return "#/";
    case "maps": return `#/${route.side}`;
    case "map": return `#/${route.side}/${route.map}`;
    case "spot": return `#/${route.side}/${route.map}/${route.spot}`;
  }
}

export function parent(route: Route): Route {
  switch (route.screen) {
    case "side":
    case "maps": return { screen: "side" };
    case "map": return { screen: "maps", side: route.side };
    case "spot": return { screen: "map", side: route.side, map: route.map };
  }
}
