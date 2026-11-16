import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { SPOTS } from "../src/data/lineups";
import { embedUrl, watchUrl } from "../src/embed";

const spot = (side: string, name: string) => SPOTS.find((s) => s.side === side && s.name === name)!;
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const go = (hash: string) => act(() => {
  location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
});

beforeEach(() => history.replaceState(null, "", "/"));
afterEach(() => vi.restoreAllMocks());

it("startet mit T und CT ohne Zurück-Pfeil", () => {
  render(<App />);
  expect(screen.getByRole("button", { name: "T" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "CT" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Zurück" })).not.toBeInTheDocument();
});

it("zeigt nach T den Map-Pool mit nur Mirage aktiv", () => {
  render(<App />);
  click("T");
  expect(location.hash).toBe("#/t");
  expect(screen.getByRole("button", { name: "Zurück" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Mirage/ })).toBeEnabled();
  for (const name of ["Inferno", "Dust2"]) {
    const tile = screen.getByRole("button", { name: new RegExp(name) });
    expect(tile).toBeDisabled();
    expect(tile).toHaveTextContent("bald");
  }
});

it("zeigt auf dem Radar einen Punkt je Landestelle, in Prozent positioniert", () => {
  render(<App />);
  go("#/t/mirage");
  const radar = screen.getByTestId("radar");
  const points = within(radar).getAllByRole("button");
  const distinct = new Set(SPOTS.filter((s) => s.side === "t").map((s) => `${s.x},${s.y}`));
  expect(points).toHaveLength(distinct.size);
  for (const p of points) {
    expect(p.style.left).toMatch(/%$/);
    expect(p.style.top).toMatch(/%$/);
  }
});

it("öffnet per Punkt das Lineup mit Video ab der richtigen Stelle", () => {
  render(<App />);
  go("#/t/mirage");
  click("Jungle");
  const jungle = spot("t", "Jungle");
  expect(screen.getByRole("heading", { name: "Jungle" })).toBeInTheDocument();
  expect(screen.getByTitle("Jungle")).toHaveAttribute("src", embedUrl(jungle));
  expect(screen.getByRole("link", { name: "Auf YouTube öffnen" })).toHaveAttribute("href", watchUrl(jungle));
});

it("führt der Zurück-Pfeil Schritt für Schritt bis zur Startseite", () => {
  render(<App />);
  go(`#/t/mirage/${spot("t", "Jungle").id}`);
  click("Zurück");
  expect(location.hash).toBe("#/t/mirage");
  click("Zurück");
  expect(location.hash).toBe("#/t");
  click("Zurück");
  expect(location.hash).toBe("#/");
  expect(screen.getByRole("button", { name: "CT" })).toBeInTheDocument();
});

it("geht mit dem Zurück-Pfeil im Verlauf zurück statt neue Einträge anzulegen", () => {
  const back = vi.spyOn(history, "back").mockImplementation(() => {});
  render(<App />);
  click("T");
  click("Mirage");
  click("Jungle");
  const length = history.length;
  click("Zurück");
  expect(back).toHaveBeenCalledOnce();
  expect(history.length).toBe(length);
});

it("ersetzt bei einem Direktlink den Eintrag, statt die App zu verlassen", () => {
  const back = vi.spyOn(history, "back");
  history.replaceState(null, "", `/#/t/mirage/${spot("t", "Jungle").id}`);
  render(<App />);
  const length = history.length;
  click("Zurück");
  expect(back).not.toHaveBeenCalled();
  expect(history.length).toBe(length);
  expect(location.hash).toBe("#/t/mirage");
  expect(screen.getByTestId("radar")).toBeInTheDocument();
});

it("bietet bei gleicher Landestelle eine Auswahl an", async () => {
  render(<App />);
  go("#/t/mirage");
  click("Window");
  click("Mid Window (aus T-Spawn) Smoke");
  expect(screen.getByRole("heading", { name: "Mid Window (aus T-Spawn)" })).toBeInTheDocument();
  click("Zurück");
  fireEvent.click(await screen.findByRole("button", { name: "Window" }));
  click("Mid Window (von Top Mid) Smoke");
  expect(screen.getByRole("heading", { name: "Mid Window (von Top Mid)" })).toBeInTheDocument();
});

it("öffnet einen Direktlink sofort", () => {
  const ct = spot("ct", "B defensiv");
  history.replaceState(null, "", `/#/ct/mirage/${ct.id}`);
  render(<App />);
  expect(screen.getByRole("heading", { name: "B defensiv" })).toBeInTheDocument();
});

it("zeigt bei veraltetem Spot die Karte", () => {
  history.replaceState(null, "", "/#/t/mirage/gibtsnicht");
  render(<App />);
  expect(screen.getByTestId("radar")).toBeInTheDocument();
});

it("weist ohne Internet darauf hin", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  history.replaceState(null, "", `/#/t/mirage/${spot("t", "Jungle").id}`);
  render(<App />);
  expect(screen.getByText("Für Videos brauchst du Internet")).toBeInTheDocument();
});

it("zeigt Text nur, wenn vorhanden", () => {
  const jungle = spot("t", "Jungle");
  history.replaceState(null, "", `/#/t/mirage/${jungle.id}`);
  const { rerender } = render(<App />);
  expect(screen.queryByTestId("lineup-text")).not.toBeInTheDocument();
  jungle.text = "Testzeile";
  rerender(<App />);
  go("#/t/mirage");
  go(`#/t/mirage/${jungle.id}`);
  expect(screen.getByTestId("lineup-text")).toHaveTextContent("Testzeile");
  delete jungle.text;
});
