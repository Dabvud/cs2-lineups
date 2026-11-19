export type Side = "t" | "ct";
export type NadeType = "smoke" | "molly";
export type MapInfo = { id: string; name: string; radar?: string; active: boolean; zoom?: number };
export type Spot = {
  id: string;
  map: string;
  side: Side;
  type: NadeType;
  name: string;
  /** Kurzname für das Schild auf dem Radar */
  label?: string;
  /** Landestelle in % des Radarbilds (0,0 = oben links) */
  x: number;
  y: number;
  videoId?: string;
  /** Sekunden im Video */
  start?: number;
  end?: number;
  /** Öffentliche URLs der Standbilder */
  stand?: string;
  aim?: string;
  text?: string;
};
