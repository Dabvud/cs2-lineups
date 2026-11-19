import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { FIXTURE as SPOTS, seedCache, stubFetch, stubFetchFail } from "./fixtures";
import { displayLabel } from "../src/screens/MapScreen";
import { watchUrl } from "../src/embed";

const spot = (side: string, name: string) => SPOTS.find((s) => s.side === side && s.name === name)!;
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const go = (hash: string) => act(() => {
  location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
});

beforeEach(() => {
  history.replaceState(null, "", "/");
  localStorage.clear();
  seedCache();
  stubFetch();
});
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

it("zeigt die Anzahl der Varianten im Kreis", () => {
  render(<App />);
  go("#/mirage/t");
  expect(screen.getByRole("button", { name: "Window" })).toHaveTextContent("2");
  expect(screen.getByRole("button", { name: "Jungle" })).not.toHaveTextContent(/\d/);
});

it("zeigt Varianten als Bildkacheln mit Typ", () => {
  const img = (id: string) => `https://x/${id}.jpg`;
  const withImages = SPOTS.map((s) =>
    s.id === "t-window-spawn" || s.id === "t-window-top" ? { ...s, stand: img(`${s.id}-stand`), aim: img(`${s.id}-aim`) }
      : s.id === "ct-ramp-molly" ? { ...s, aim: img("ramp-aim") } : s);
  seedCache(withImages);
  stubFetch(withImages);
  render(<App />);
  go("#/mirage/t");
  click("Window");
  const dialog = screen.getByRole("dialog", { name: "Lineup wählen" });
  expect(within(dialog).getByRole("heading")).toHaveTextContent("2 Varianten");
  expect(dialog.querySelectorAll("img")).toHaveLength(2);
  go("#/mirage/ct");
  click("Ramp (Molly) / Ramp");
  expect(screen.getByRole("button", { name: "Ramp Smoke" })).toBeInTheDocument();
  const molly = screen.getByRole("button", { name: "Ramp Molly" });
  expect(molly.querySelector("img")).toHaveAttribute("src", img("ramp-aim"));
});

it("wechselt direkt zur anderen Variante", async () => {
  render(<App />);
  go("#/mirage/t");
  click("Window");
  click("Mid Window (aus T-Spawn) Smoke");
  click("⇄ Andere Variante: Mid Window (von Top Mid)");
  expect(screen.getByRole("heading", { name: "Mid Window (von Top Mid)" })).toBeInTheDocument();
  expect(location.hash).toBe("#/mirage/t/t-window-top");
  click("Zurück");
  expect(await screen.findByTestId("radar")).toBeInTheDocument();
});

it("nennt beim Wechsel den Typ, wenn Smoke und Molly gleich heißen", () => {
  render(<App />);
  go("#/mirage/ct");
  click("Ramp (Molly) / Ramp");
  click("Ramp Smoke");
  expect(screen.getByRole("button", { name: "⇄ Andere Variante: Ramp (Molly)" })).toBeInTheDocument();
});

it("springt nach dem Wechsel nach oben", () => {
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  render(<App />);
  go("#/mirage/t");
  click("Window");
  click("Mid Window (aus T-Spawn) Smoke");
  scroll.mockClear();
  click("⇄ Andere Variante: Mid Window (von Top Mid)");
  expect(scroll).toHaveBeenCalledWith(0, 0);
});

it("zeigt ohne Varianten keinen Wechsel", () => {
  render(<App />);
  go("#/mirage/t");
  click("Jungle");
  expect(screen.queryByRole("button", { name: /Andere Variante/ })).not.toBeInTheDocument();
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
  history.replaceState(null, "", "/#/mirage/t/t-jungle");
  render(<App />);
  expect(screen.getByAltText("Hier hinstellen: Jungle")).toHaveAttribute("src", "https://x/stand.jpg");
  expect(screen.getByAltText("Hierhin zielen: Jungle")).toHaveAttribute("src", "https://x/aim.jpg");
  expect(screen.getByText("Hier hinstellen")).toBeVisible();
  expect(screen.getByText("Hierhin zielen")).toBeVisible();
  expect(screen.queryByText(/Bilder folgen/)).toBeNull();
});

it("ohne Bilder Hinweis", () => {
  history.replaceState(null, "", "/#/mirage/ct/ct-topmid-molly");
  render(<App />);
  expect(screen.getByText("Bilder folgen – bis dahin hilft das Video.")).toBeVisible();
  expect(screen.queryByRole("img")).toBeNull();
});

it("zeigt Text nur, wenn vorhanden", async () => {
  seedCache(SPOTS.map((s) => ({ ...s, text: undefined })));
  stubFetch(SPOTS.map((s) => ({ ...s, text: "Testzeile" })));
  history.replaceState(null, "", "/#/mirage/t/t-jungle");
  render(<App />);
  expect(screen.queryByTestId("lineup-text")).not.toBeInTheDocument();
  expect(await screen.findByTestId("lineup-text")).toHaveTextContent("Testzeile");
});

it("zeigt ohne Cache und ohne Netz einen Fehler mit Nochmal versuchen", async () => {
  localStorage.clear();
  stubFetchFail();
  render(<App />);
  expect(await screen.findByText("Keine Verbindung – Spots konnten nicht geladen werden")).toBeVisible();
  stubFetch();
  click("Nochmal versuchen");
  expect(await screen.findByRole("button", { name: "Mirage" })).toBeVisible();
});

it("zeigt mit Cache und ohne Netz die Spots", async () => {
  stubFetchFail();
  history.replaceState(null, "", "/#/mirage/t");
  render(<App />);
  await act(async () => {});
  expect(within(screen.getByTestId("radar")).getByRole("button", { name: "Jungle" })).toBeVisible();
});

it("fällt nach neuem Laden bei gelöschtem Spot auf die Karte zurück", async () => {
  stubFetch(SPOTS.filter((s) => s.id !== "t-jungle"));
  history.replaceState(null, "", "/#/mirage/t/t-jungle");
  render(<App />);
  expect(screen.getByRole("heading", { name: "Jungle" })).toBeInTheDocument();
  expect(await screen.findByTestId("radar")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Jungle" })).not.toBeInTheDocument();
});

it("zeigt beim ersten Laden ohne Cache den Ladehinweis und erhält den Direktlink", async () => {
  localStorage.clear();
  history.replaceState(null, "", "/#/mirage/t/t-jungle");
  render(<App />);
  expect(screen.getByText("Lädt …")).toBeVisible();
  expect(await screen.findByRole("heading", { name: "Jungle" })).toBeVisible();
});

it("zeigt ohne videoId keinen Video-Link", () => {
  const spots = SPOTS.map((s) => ({ ...s, videoId: undefined, start: undefined, end: undefined }));
  seedCache(spots);
  stubFetch(spots);
  history.replaceState(null, "", "/#/mirage/t/t-jungle");
  render(<App />);
  expect(screen.queryByRole("link", { name: /Video ansehen/ })).not.toBeInTheDocument();
});

it("kürzt lange Namen ohne Kurznamen", () => {
  expect(displayLabel({ ...SPOTS[0], name: "Ein sehr langer Spotname", label: undefined })).toBe("Ein sehr lange…");
  expect(displayLabel({ ...SPOTS[0], name: "Jungle", label: "   " })).toBe("Jungle");
  expect(displayLabel({ ...SPOTS[0], label: "  Kurz  " })).toBe("Kurz");
  expect(displayLabel({ ...SPOTS[0], label: undefined, name: "12345678901234" })).toBe("12345678901234");
});
