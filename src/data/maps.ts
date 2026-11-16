import mirageRadar from "../assets/maps/mirage.png";
import type { MapInfo } from "./types";

export const MAPS: MapInfo[] = [
  { id: "mirage", name: "Mirage", radar: mirageRadar, active: true },
  { id: "inferno", name: "Inferno", active: false },
  { id: "dust2", name: "Dust2", active: false },
];
