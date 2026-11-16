import type { MapInfo, Side, Spot } from "./data/types";

export type Route =
  | { screen: "maps" }
  | { screen: "side"; map: string }
  | { screen: "map"; map: string; side: Side }
  | { screen: "new"; map: string; side: Side }
  | { screen: "edit"; map: string; side: Side; spot: string }
  | { screen: "spot"; map: string; side: Side; spot: string };

/** Unbekannte oder veraltete Teile fallen auf die nächsthöhere gültige Seite zurück. */
export function parseRoute(hash: string, maps: MapInfo[], spots: Spot[]): Route {
  const [map, side, spot, action] = hash.replace(/^#\/?/, "").split("/");
  if (!map || !maps.some((m) => m.id === map && m.active)) return { screen: "maps" };
  if (side !== "t" && side !== "ct") return { screen: "side", map };
  if (spot === "neu") return { screen: "new", map, side };
  if (!spot || !spots.some((s) => s.id === spot && s.map === map && s.side === side)) return { screen: "map", map, side };
  if (action === "bearbeiten") return { screen: "edit", map, side, spot };
  return { screen: "spot", map, side, spot };
}

export function toHash(route: Route): string {
  switch (route.screen) {
    case "maps": return "#/";
    case "side": return `#/${route.map}`;
    case "map": return `#/${route.map}/${route.side}`;
    case "new": return `#/${route.map}/${route.side}/neu`;
    case "edit": return `#/${route.map}/${route.side}/${route.spot}/bearbeiten`;
    case "spot": return `#/${route.map}/${route.side}/${route.spot}`;
  }
}

export function parent(route: Route): Route {
  switch (route.screen) {
    case "side":
    case "maps": return { screen: "maps" };
    case "map": return { screen: "side", map: route.map };
    case "spot": return { screen: "map", map: route.map, side: route.side };
    case "new": return { screen: "map", map: route.map, side: route.side };
    case "edit": return { screen: "spot", map: route.map, side: route.side, spot: route.spot };
  }
}
