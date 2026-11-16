import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SPOTS } from "../src/data/lineups";

const directory = new URL("./seed/", import.meta.url);
mkdirSync(directory, { recursive: true });
const spots = SPOTS.map(({ id, map, side, type, name, label, x, y, text, videoId, start, end }) => ({
  id, map, side, type, name, label, x, y, videoId, start, end, text,
}));
writeFileSync(new URL("spots.json", directory), JSON.stringify(spots, null, 2) + "\n");
console.log(`${spots.length} Spots nach ${fileURLToPath(directory)} exportiert`);
