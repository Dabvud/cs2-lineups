import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { checkPin, deleteSpot, InvalidError, LockedError, PinError, saveSpot } from "../src/data/api";
import { getPin, setPin } from "../src/data/pin";
import { compressImage } from "../src/editor/image";
import { FIXTURE, seedCache, stubFetch } from "./fixtures";

vi.mock("../src/data/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/data/api")>(),
  checkPin: vi.fn(), saveSpot: vi.fn(), deleteSpot: vi.fn(),
}));
vi.mock("../src/editor/image", () => ({ compressImage: vi.fn(async (file: Blob) => file) }));

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const saved = { ...FIXTURE.find((s) => s.id === "t-jungle")!, id: "t-neu-abc123", name: "Neuer Jungle" };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  seedCache();
  stubFetch();
  history.replaceState(null, "", "/#/mirage/t");
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:preview");
    static revokeObjectURL = vi.fn();
  });
  vi.mocked(checkPin).mockResolvedValue(true);
  vi.mocked(saveSpot).mockResolvedValue(saved);
  vi.mocked(deleteSpot).mockResolvedValue();
});

async function open(hash = "#/mirage/t/neu", pin = true) {
  if (pin) setPin("123456");
  history.replaceState(null, "", `/${hash}`);
  render(<App />);
  await act(async () => {});
}

function land(x = 44.5, y = 63.5) {
  const layer = screen.getByRole("button", { name: "Landepunkt auf der Karte setzen" });
  vi.spyOn(layer, "getBoundingClientRect").mockReturnValue({ left: 100, top: 50, width: 1000, height: 1000 } as DOMRect);
  fireEvent.click(layer, { clientX: 100 + x * 10, clientY: 50 + y * 10 });
}

function fill() {
  const stand = new File(["stand"], "stand.png", { type: "image/png" });
  const aim = new File(["aim"], "aim.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Bild ‚Hier hinstellen‘"), { target: { files: [stand] } });
  fireEvent.change(screen.getByLabelText("Bild ‚Hierhin zielen‘"), { target: { files: [aim] } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: saved.name } });
  click("Smoke");
  land();
  return { stand, aim };
}

async function enterPin() {
  fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "123456" } });
  click("Entsperren");
  await waitFor(() => expect(checkPin).toHaveBeenCalledWith("123456"));
}

it("+ fragt PIN und öffnet nach richtigem PIN das Formular", async () => {
  await open("#/mirage/t", false);
  click("Neuer Spot");
  expect(screen.getByRole("dialog", { name: "PIN eingeben" })).toBeVisible();
  await enterPin();
  await waitFor(() => expect(location.hash).toBe("#/mirage/t/neu"));
  expect(getPin()).toBe("123456");
  expect(screen.getByLabelText("Name")).toBeVisible();
});

it("falscher PIN bleibt im Dialog mit Hinweis", async () => {
  vi.mocked(checkPin).mockResolvedValue(false);
  await open("#/mirage/t", false);
  click("Neuer Spot");
  await enterPin();
  expect(await screen.findByText("PIN falsch")).toBeVisible();
  expect(screen.getByRole("dialog", { name: "PIN eingeben" })).toBeVisible();
  expect(getPin()).toBeNull();
  expect(location.hash).toBe("#/mirage/t");
});

it("zeigt bei gesperrter PIN-Prüfung die Wartezeit im Dialog", async () => {
  vi.mocked(checkPin).mockRejectedValueOnce(new LockedError());
  await open("#/mirage/t", false);
  click("Neuer Spot");
  await enterPin();
  const dialog = screen.getByRole("dialog", { name: "PIN eingeben" });
  expect(await within(dialog).findByText("Zu viele Fehlversuche – bitte in 10 Minuten nochmal")).toBeVisible();
  expect(getPin()).toBeNull();
  expect(location.hash).toBe("#/mirage/t");
});

it("Speichern gesperrt, solange Pflichtangaben fehlen", async () => {
  await open();
  expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
  const hint = screen.getByTestId("missing-fields");
  for (const field of ["Bild ‚Hier hinstellen‘", "Bild ‚Hierhin zielen‘", "Name", "Smoke oder Molly", "Landepunkt"]) {
    expect(hint).toHaveTextContent(field);
  }
  expect(screen.getByLabelText("Kurzname auf der Karte")).toHaveAttribute("maxlength", "14");
  expect(screen.getByLabelText("Bild ‚Hier hinstellen‘")).toHaveAttribute("accept", "image/*");
  expect(screen.queryByRole("button", { name: "Löschen" })).toBeNull();
});

it("Antippen der Karte setzt den Landepunkt und rastet ein", async () => {
  await open();
  land();
  expect(screen.getByTestId("landing-point").style.left).toBe("44%");
  expect(screen.getByTestId("landing-point").style.top).toBe("63%");
  land(80, 80);
  expect(screen.getByTestId("landing-point").style.left).toBe("80%");
});

it("rastet nur bei Spots derselben Map und Seite ein", async () => {
  const spots = [...FIXTURE,
    { ...saved, id: "ct-other", side: "ct" as const, x: 80, y: 80 },
    { ...saved, id: "other-map", map: "inferno", x: 80, y: 80 },
  ];
  seedCache(spots);
  stubFetch(spots);
  await open();
  land(80.5, 80.5);
  expect(screen.getByTestId("landing-point").style.left).toBe("80.5%");
});

it("Speichern legt an und zeigt danach das Lineup", async () => {
  await open();
  const files = fill();
  expect(screen.getByAltText("Vorschau: Hier hinstellen")).toHaveAttribute("src", "blob:preview");
  click("Speichern");
  expect(await screen.findByRole("heading", { name: saved.name })).toBeVisible();
  expect(location.hash).toBe(`#/mirage/t/${saved.id}`);
  expect(saveSpot).toHaveBeenCalledWith("123456", "create", expect.objectContaining({
    map: "mirage", side: "t", type: "smoke", name: saved.name, x: 44, y: 63,
  }), files);
  expect(compressImage).toHaveBeenCalledWith(files.stand);
  expect(compressImage).toHaveBeenCalledWith(files.aim);
  expect(JSON.parse(localStorage.getItem("cs2-lineups.spots")!)).toContainEqual(saved);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
});

it("401 beim Speichern löscht den PIN und fragt neu, Eingaben bleiben", async () => {
  vi.mocked(saveSpot).mockRejectedValueOnce(new PinError());
  await open();
  fill();
  click("Speichern");
  expect(await screen.findByRole("dialog", { name: "PIN eingeben" })).toBeVisible();
  expect(getPin()).toBeNull();
  expect(screen.getByLabelText("Name")).toHaveValue(saved.name);
  await enterPin();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByLabelText("Name")).toHaveValue(saved.name);
  click("Speichern");
  expect(await screen.findByRole("heading", { name: saved.name })).toBeVisible();
});

it("zeigt beim gesperrten Speichern die Wartezeit und erhält die Eingaben", async () => {
  vi.mocked(saveSpot).mockRejectedValueOnce(new LockedError());
  await open();
  const files = fill();
  click("Speichern");
  expect(await screen.findByText("Zu viele Fehlversuche – bitte in 10 Minuten nochmal")).toBeVisible();
  expect(screen.getByLabelText("Name")).toHaveValue(saved.name);
  expect(screen.getByTestId("landing-point").style.left).toBe("44%");
  expect(screen.getByAltText("Vorschau: Hier hinstellen")).toHaveAttribute("src", "blob:preview");
  expect(getPin()).toBe("123456");
  expect(location.hash).toBe("#/mirage/t/neu");
  click("Speichern");
  expect(await screen.findByRole("heading", { name: saved.name })).toBeVisible();
  expect(saveSpot).toHaveBeenLastCalledWith("123456", "create", expect.objectContaining({ name: saved.name }), files);
});

it("zeigt beim gesperrten Löschen die Wartezeit und erhält die Eingaben", async () => {
  vi.mocked(deleteSpot).mockRejectedValueOnce(new LockedError());
  await open("#/mirage/t/t-jungle/bearbeiten");
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Geänderter Jungle" } });
  click("Löschen");
  click("Ja, löschen");
  expect(await screen.findByText("Zu viele Fehlversuche – bitte in 10 Minuten nochmal")).toBeVisible();
  expect(screen.getByLabelText("Name")).toHaveValue("Geänderter Jungle");
  expect(screen.getByRole("button", { name: "Löschen" })).toBeEnabled();
  expect(getPin()).toBe("123456");
  expect(location.hash).toBe("#/mirage/t/t-jungle/bearbeiten");
  expect(JSON.parse(localStorage.getItem("cs2-lineups.spots")!).some((s: { id: string }) => s.id === "t-jungle")).toBe(true);
});

it("Netzwerkfehler beim Speichern lässt das Formular stehen", async () => {
  vi.mocked(saveSpot).mockRejectedValue(new Error("offline"));
  await open();
  fill();
  click("Speichern");
  expect(await screen.findByText("Speichern fehlgeschlagen – nochmal versuchen")).toBeVisible();
  expect(screen.getByLabelText("Name")).toHaveValue(saved.name);
  expect(screen.getByTestId("landing-point").style.left).toBe("44%");
  expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
});

it("zeigt Validierungsdetails des Servers und erhält die Eingaben", async () => {
  vi.mocked(saveSpot).mockRejectedValue(new InvalidError(["Bild ist zu groß."]));
  await open();
  fill();
  click("Speichern");
  expect(await screen.findByText("Bild ist zu groß.")).toBeVisible();
  expect(screen.getByLabelText("Name")).toHaveValue(saved.name);
});

it("Bearbeiten nur sichtbar mit gespeichertem PIN", async () => {
  await open("#/mirage/t/t-jungle", false);
  expect(screen.queryByRole("button", { name: "Bearbeiten" })).toBeNull();
  setPin("123456");
  act(() => window.dispatchEvent(new HashChangeEvent("hashchange")));
  // Ein erneuter Aufruf liest den inzwischen gespeicherten PIN.
  act(() => {
    location.hash = "#/mirage/t";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  click("Jungle");
  click("Bearbeiten");
  expect(location.hash).toBe("#/mirage/t/t-jungle/bearbeiten");
  expect(screen.getByLabelText("Name")).toHaveValue("Jungle");
  expect(screen.getByRole("button", { name: "Smoke" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
  click("Speichern");
  await waitFor(() => expect(saveSpot).toHaveBeenCalledWith("123456", "update", expect.objectContaining({ id: "t-jungle", name: "Jungle" }), {}));
});

it("Löschen fragt nach und entfernt den Spot", async () => {
  await open("#/mirage/t/t-jungle/bearbeiten");
  click("Löschen");
  expect(screen.getByText('Spot „Jungle“ wirklich löschen?')).toBeVisible();
  expect(deleteSpot).not.toHaveBeenCalled();
  click("Ja, löschen");
  await waitFor(() => expect(location.hash).toBe("#/mirage/t"));
  expect(deleteSpot).toHaveBeenCalledWith("123456", "t-jungle");
  expect(within(screen.getByTestId("radar")).queryByRole("button", { name: "Jungle" })).toBeNull();
  expect(JSON.parse(localStorage.getItem("cs2-lineups.spots")!).some((s: { id: string }) => s.id === "t-jungle")).toBe(false);
});

it("schützt auch einen direkten Editor-Link mit der PIN-Abfrage", async () => {
  await open("#/mirage/t/neu", false);
  expect(screen.getByRole("dialog", { name: "PIN eingeben" })).toBeVisible();
  click("Abbrechen");
  expect(location.hash).toBe("#/mirage/t");
});
