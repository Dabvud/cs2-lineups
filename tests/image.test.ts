import { expect, it } from "vitest";
import { targetSize } from "../src/editor/image";

it.each([
  [3840, 2160, 1280, 720],
  [1920, 1080, 1280, 720],
  [800, 600, 800, 600],
  [2000, 3000, 1280, 1920],
])("verkleinert %s × %s ohne Hochskalieren", (w, h, outW, outH) => {
  expect(targetSize(w, h)).toEqual({ w: outW, h: outH });
});
