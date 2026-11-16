import { expect, it } from "vitest";
import { watchUrl } from "../src/embed";

const spot = { videoId: "Q4Dwg9Z0wZ0", start: 335, end: 371 };

it("verlinkt das Original an derselben Stelle", () => {
  expect(watchUrl(spot)).toBe("https://www.youtube.com/watch?v=Q4Dwg9Z0wZ0&t=335s");
});
