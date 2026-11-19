import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ZoomImage from "../src/components/ZoomImage";

function setup(width = 200, height = 100) {
  render(<ZoomImage src="https://x/aim.jpg" alt="Hierhin zielen" />);
  const img = screen.getByAltText("Hierhin zielen");
  vi.spyOn(img.parentElement!, "getBoundingClientRect").mockReturnValue(
    { left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
  return img;
}
const hold = (img: HTMLElement, x = 50, y = 25) => {
  fireEvent.pointerDown(img, { clientX: x, clientY: y });
  act(() => { vi.advanceTimersByTime(250); });
};

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it("zoomt nach 250 ms an der Fingerstelle", () => {
  const img = setup();
  fireEvent.pointerDown(img, { clientX: 50, clientY: 25 });
  act(() => { vi.advanceTimersByTime(249); });
  expect(img).not.toHaveClass("zoomed");
  act(() => { vi.advanceTimersByTime(1); });
  expect(img).toHaveClass("zoomed");
  expect(img.style.transformOrigin).toBe("25% 25%");
});

it("folgt dem Finger", () => {
  const img = setup();
  hold(img);
  fireEvent.pointerMove(window, { clientX: 150, clientY: 75 });
  expect(img.style.transformOrigin).toBe("75% 75%");
});

it("loslassen beendet den Zoom", () => {
  const img = setup();
  hold(img);
  fireEvent.pointerUp(window);
  expect(img).not.toHaveClass("zoomed");
});

it("bricht bei Bewegung vor Ablauf ab", () => {
  const img = setup();
  fireEvent.pointerDown(img, { clientX: 50, clientY: 25 });
  fireEvent.pointerMove(window, { clientX: 50, clientY: 40 });
  act(() => { vi.advanceTimersByTime(300); });
  expect(img).not.toHaveClass("zoomed");
});

it("kein NaN bei Rahmengröße 0", () => {
  const img = setup(0, 0);
  hold(img);
  expect(img).toHaveClass("zoomed");
  expect(img.style.transformOrigin).not.toContain("NaN");
});

it("bricht ab, wenn am iPad vor Ablauf gewischt wird", () => {
  const img = setup();
  fireEvent.pointerDown(img, { clientX: 50, clientY: 25 });
  fireEvent.pointerCancel(window);
  fireEvent.touchMove(window, { touches: [{ clientX: 50, clientY: 60 }] });
  act(() => { vi.advanceTimersByTime(300); });
  expect(img).not.toHaveClass("zoomed");
});
