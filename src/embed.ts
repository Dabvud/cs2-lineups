import type { Spot } from "./data/types";

type Clip = Pick<Spot, "videoId" | "start" | "end">;

// stumm, weil iOS Videos mit Ton nicht selbst starten lässt
export const embedUrl = ({ videoId, start, end }: Clip) =>
  `https://www.youtube-nocookie.com/embed/${videoId}?start=${start}&end=${end}&playsinline=1&autoplay=1&mute=1&rel=0`;

export const watchUrl = ({ videoId, start }: Clip) => `https://www.youtube.com/watch?v=${videoId}&t=${start}s`;
