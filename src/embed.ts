import type { Spot } from "./data/types";

type Clip = Pick<Spot, "videoId" | "start" | "end">;

export const watchUrl = ({ videoId, start }: Clip) => `https://www.youtube.com/watch?v=${videoId}&t=${start}s`;
