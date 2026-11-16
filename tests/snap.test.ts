import { expect, it } from "vitest";
import { snapPoint } from "../src/editor/snap";

it("rastet nahe einem bestehenden Punkt ein", () => {
  expect(snapPoint({ x: 44.5, y: 63.5 }, [{ x: 44, y: 63 }])).toEqual({ x: 44, y: 63 });
});
it("lässt entfernte Punkte unverändert", () => {
  expect(snapPoint({ x: 50, y: 50 }, [{ x: 44, y: 63 }])).toEqual({ x: 50, y: 50 });
});
it("rastet auch bei Abstand genau 2 ein", () => {
  expect(snapPoint({ x: 46, y: 63 }, [{ x: 44, y: 63 }])).toEqual({ x: 44, y: 63 });
});
it("wählt den nächsten Punkt und berücksichtigt den Radius", () => {
  expect(snapPoint({ x: 10, y: 10 }, [{ x: 12, y: 10 }, { x: 11, y: 10 }])).toEqual({ x: 11, y: 10 });
  expect(snapPoint({ x: 10, y: 10 }, [{ x: 11, y: 10 }], 0.5)).toEqual({ x: 10, y: 10 });
});
