import { beforeEach, expect, it, vi } from "vitest";
import { clearPin, getPin, setPin } from "../src/data/pin";

beforeEach(() => localStorage.clear());

it("speichert und löscht den PIN unter dem vereinbarten Schlüssel", () => {
  expect(getPin()).toBeNull();
  setPin("123456");
  expect(localStorage.getItem("cs2-lineups.pin")).toBe("123456");
  expect(getPin()).toBe("123456");
  clearPin();
  expect(getPin()).toBeNull();
});

it("fängt gesperrten localStorage für Lesen, Schreiben und Löschen ab", () => {
  for (const method of ["getItem", "setItem", "removeItem"] as const) {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error("gesperrt"); });
  }
  expect(getPin()).toBeNull();
  expect(() => setPin("123456")).not.toThrow();
  expect(() => clearPin()).not.toThrow();
});
