import infernoRadar from "../assets/maps/inferno.png";
import mirageRadar from "../assets/maps/mirage.png";
import type { MapInfo } from "./types";

export const MAPS: MapInfo[] = [
  { id: "mirage", name: "Mirage", radar: mirageRadar, active: true },
  // Inferno füllt das Radarbild fast bis zum Rand, darum weniger Zoom als der Standard
  { id: "inferno", name: "Inferno", radar: infernoRadar, active: true, zoom: 1.04 },
  { id: "dust2", name: "Dust2", active: false },
];

/** Eigener Radar-Zoom einer Map; ohne Angabe gilt der Standard aus styles.css (.radar-layer). */
export const radarStyle = (map: MapInfo) =>
  map.zoom ? { transform: `scale(${map.zoom})`, transformOrigin: "50% 50%" } : undefined;
