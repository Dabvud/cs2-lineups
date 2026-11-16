import { expect, it } from "vitest";
import { embedUrl, watchUrl } from "../src/embed";

const spot = { videoId: "Q4Dwg9Z0wZ0", start: 335, end: 371 };

it("bettet den Ausschnitt stumm, inline und mit Start/Ende ein", () => {
  expect(embedUrl(spot)).toBe("https://www.youtube-nocookie.com/embed/Q4Dwg9Z0wZ0?start=335&end=371&playsinline=1&autoplay=1&mute=1&rel=0");
});

it("verlinkt das Original an derselben Stelle", () => {
  expect(watchUrl(spot)).toBe("https://www.youtube.com/watch?v=Q4Dwg9Z0wZ0&t=335s");
});
