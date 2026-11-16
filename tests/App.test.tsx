import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { SPOTS } from "../src/data/lineups";
import { watchUrl } from "../src/embed";

const spot = (side: string, name: string) => SPOTS.find((s) => s.side === side && s.name === name)!;
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const go = (hash: string) => act(() => {
  location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
});

beforeEach(() => history.replaceState(null, "", "/"));
afterEach(() => vi.restoreAllMocks());

it("startet mit dem Map-Pool und nur Mirage aktiv ohne Zurück-Pfeil", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "Map wählen" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Mirage" })).toBeEnabled();
  for (const name of ["Inferno", "Dust2"]) {
    const tile = screen.getByRole("button", { name: new RegExp(name) });
    expect(tile).toBeDisabled();
    expect(tile).toHaveTextContent("bald");
  }
  expect(screen.queryByRole("button", { name: "Zurück" })).not.toBeInTheDocument();
});

it("zeigt nach Mirage die Seitenwahl mit Zurück-Pfeil", () => {
  render(<App />);
  click("Mirage");
  expect(location.hash).toBe("#/mirage");
  expect(screen.getByRole("heading", { name: "Mirage" })).toBeInTheDocument();
  expect(screen.getByText("Seite wählen")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Zurück" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "T" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "CT" })).toBeInTheDocument();
});

it.each(["T", "CT"])("öffnet nach Mirage und %s das passende Radar", (side) => {
  render(<App />);
  click("Mirage");
  click(side);
  expect(location.hash).toBe(`#/mirage/${side.toLowerCase()}`);
  expect(screen.getByRole("heading", { name: `Mirage · ${side}` })).toBeInTheDocument();
  expect(screen.getByTestId("radar")).toBeInTheDocument();
});

it("zeigt auf dem Radar einen Punkt je Landestelle, in Prozent positioniert", () => {
  render(<App />);
  go("#/mirage/t");
  const radar = screen.getByTestId("radar");
  const points = within(radar).getAllByRole("button");
  const distinct = new Set(SPOTS.filter((s) => s.side === "t").map((s) => `${s.x},${s.y}`));
  expect(points).toHaveLength(distinct.size);
  for (const p of points) {
    expect(p.style.left).toMatch(/%$/);
    expect(p.style.top).toMatch(/%$/);
  }
});

it("öffnet per Punkt das Lineup mit Videolink ab der richtigen Stelle", () => {
  const { container } = render(<App />);
  click("Mirage");
  click("T");
  click("Jungle");
  const jungle = spot("t", "Jungle");
  expect(screen.getByRole("heading", { name: "Jungle" })).toBeInTheDocument();
  expect(container.querySelector("iframe")).toBeNull();
  expect(screen.getByRole("link", { name: "Video ansehen (YouTube)" })).toHaveAttribute("href", watchUrl(jungle));
});

it("führt der Zurück-Pfeil Schritt für Schritt bis zur Startseite", () => {
  render(<App />);
  go(`#/mirage/t/${spot("t", "Jungle").id}`);
  click("Zurück");
  expect(location.hash).toBe("#/mirage/t");
  click("Zurück");
  expect(location.hash).toBe("#/mirage");
  click("Zurück");
  expect(location.hash).toBe("#/");
  expect(screen.getByRole("button", { name: "Mirage" })).toBeInTheDocument();
});

it("geht mit dem Zurück-Pfeil im Verlauf zurück statt neue Einträge anzulegen", () => {
  const back = vi.spyOn(history, "back").mockImplementation(() => {});
  render(<App />);
  click("Mirage");
  click("T");
  click("Jungle");
  const length = history.length;
  click("Zurück");
  expect(back).toHaveBeenCalledOnce();
  expect(history.length).toBe(length);
});

it("ersetzt bei einem Direktlink den Eintrag, statt die App zu verlassen", () => {
  const back = vi.spyOn(history, "back");
  history.replaceState(null, "", `/#/mirage/t/${spot("t", "Jungle").id}`);
  render(<App />);
  const length = history.length;
  click("Zurück");
  expect(back).not.toHaveBeenCalled();
  expect(history.length).toBe(length);
  expect(location.hash).toBe("#/mirage/t");
  expect(screen.getByTestId("radar")).toBeInTheDocument();
});

it("bietet bei gleicher Landestelle eine Auswahl an", async () => {
  render(<App />);
  go("#/mirage/t");
  click("Window");
  click("Mid Window (aus T-Spawn) Smoke");
  expect(screen.getByRole("heading", { name: "Mid Window (aus T-Spawn)" })).toBeInTheDocument();
  click("Zurück");
  fireEvent.click(await screen.findByRole("button", { name: "Window" }));
  click("Mid Window (von Top Mid) Smoke");
  expect(screen.getByRole("heading", { name: "Mid Window (von Top Mid)" })).toBeInTheDocument();
});

it("öffnet einen Direktlink sofort", () => {
  const ct = spot("ct", "B Aps");
  history.replaceState(null, "", `/#/mirage/ct/${ct.id}`);
  render(<App />);
  expect(screen.getByRole("heading", { name: "B Aps" })).toBeInTheDocument();
});

it("zeigt bei veraltetem Spot die Karte", () => {
  history.replaceState(null, "", "/#/mirage/t/gibtsnicht");
  render(<App />);
  expect(screen.getByTestId("radar")).toBeInTheDocument();
});

it("zeigt Standbilder mit Beschriftung", () => {
  const jungle = spot("t", "Jungle");
  jungle.stand = "/stand.jpg";
  jungle.aim = "/aim.jpg";
  try {
    history.replaceState(null, "", `/#/mirage/t/${jungle.id}`);
    render(<App />);
    expect(screen.getByAltText("Hier hinstellen: Jungle").getAttribute("src")).toMatch(/\/stand\.jpg$/);
    expect(screen.getByAltText("Hierhin zielen: Jungle").getAttribute("src")).toMatch(/\/aim\.jpg$/);
    expect(screen.getByText("Hier hinstellen")).toBeVisible();
    expect(screen.getByText("Hierhin zielen")).toBeVisible();
    expect(screen.queryByText(/Bilder folgen/)).toBeNull();
  } finally {
    delete jungle.stand;
    delete jungle.aim;
  }
});

it("ohne Bilder Hinweis", () => {
  const jungle = spot("t", "Jungle");
  const { stand, aim } = jungle;
  delete jungle.stand;
  delete jungle.aim;
  try {
    history.replaceState(null, "", `/#/mirage/t/${jungle.id}`);
    render(<App />);
    expect(screen.getByText("Bilder folgen – bis dahin hilft das Video.")).toBeVisible();
    expect(screen.queryByRole("img")).toBeNull();
  } finally {
    Object.assign(jungle, stand ? { stand } : {}, aim ? { aim } : {});
  }
});

it("zeigt Text nur, wenn vorhanden", () => {
  const jungle = spot("t", "Jungle");
  const original = jungle.text;
  delete jungle.text;
  history.replaceState(null, "", `/#/mirage/t/${jungle.id}`);
  const { rerender } = render(<App />);
  expect(screen.queryByTestId("lineup-text")).not.toBeInTheDocument();
  jungle.text = "Testzeile";
  rerender(<App />);
  go("#/mirage/t");
  go(`#/mirage/t/${jungle.id}`);
  expect(screen.getByTestId("lineup-text")).toHaveTextContent("Testzeile");
  jungle.text = original;
});
