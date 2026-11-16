import { useEffect, useState } from "react";
import PinDialog from "./components/PinDialog";
import { MAPS } from "./data/maps";
import { clearPin, getPin, setPin } from "./data/pin";
import { useSpots } from "./data/useSpots";
import { canPromptInstall, detectPlatform, isStandalone, promptInstall, wantsInstall } from "./install";
import { parent, parseRoute, toHash, type Route } from "./route";
import InstallScreen from "./screens/InstallScreen";
import EditScreen from "./screens/EditScreen";
import LineupScreen from "./screens/LineupScreen";
import MapPoolScreen from "./screens/MapPoolScreen";
import MapScreen from "./screens/MapScreen";
import SideScreen from "./screens/SideScreen";

export default function App() {
  const [platform] = useState(() => detectPlatform(navigator.userAgent, isStandalone()));
  const [installing, setInstalling] = useState(() => wantsInstall(location.search) && platform !== "installed");
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const [hash, setHash] = useState(() => location.hash);
  const { spots, status, reload, upsert, remove } = useSpots();
  const route = parseRoute(hash, MAPS, spots);
  const [sessionPin, setSessionPin] = useState<string | null>(null);
  const [pinRejected, setPinRejected] = useState(false);
  const [pendingEditor, setPendingEditor] = useState<Route | null>(null);
  const pin = pinRejected ? null : sessionPin ?? getPin();
  const needsPin = pendingEditor !== null || ((route.screen === "new" || route.screen === "edit") && !pin);

  useEffect(() => {
    const updatePrompt = () => setCanPrompt(canPromptInstall());
    const updateRoute = () => { setHash(location.hash); setPendingEditor(null); };
    window.addEventListener("beforeinstallprompt", updatePrompt);
    window.addEventListener("hashchange", updateRoute);
    return () => {
      window.removeEventListener("beforeinstallprompt", updatePrompt);
      window.removeEventListener("hashchange", updateRoute);
    };
  }, []);

  function go(next: Route, replace = false) {
    // markiert Einträge der App, damit der Zurück-Pfeil sie per history.back() verlassen darf
    if (replace) history.replaceState(history.state, "", toHash(next));
    else history.pushState({ app: true }, "", toHash(next));
    setHash(toHash(next));
  }

  function openEditor(next: Route) {
    if (pin) go(next);
    else setPendingEditor(next);
  }

  function requirePin() {
    clearPin();
    setSessionPin(null);
    setPinRejected(true);
  }

  function back() {
    if (history.state?.app) {
      history.back(); // hashchange setzt die Route
      return;
    }
    // Direktlink: kein eigener Eintrag davor, also ersetzen statt die App zu verlassen
    const up = parent(route);
    history.replaceState(null, "", toHash(up));
    setHash(toHash(up));
  }

  function closeInstall() {
    const url = new URL(location.href);
    url.searchParams.delete("installieren");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    setInstalling(false);
  }

  if (installing) {
    return (
      <InstallScreen
        platform={platform}
        canPrompt={canPrompt}
        onPrompt={() => void promptInstall().then(() => setCanPrompt(canPromptInstall()))}
        onClose={closeInstall}
      />
    );
  }

  if (spots.length === 0 && status === "loading") {
    return <main className="screen"><p role="status">Lädt …</p></main>;
  }

  if (spots.length === 0 && status === "error") {
    return (
      <main className="screen">
        <p role="alert">Keine Verbindung – Spots konnten nicht geladen werden</p>
        <button type="button" onClick={reload}>Nochmal versuchen</button>
      </main>
    );
  }

  function renderScreen() {
    switch (route.screen) {
    case "maps":
      return <MapPoolScreen maps={MAPS} onPick={(map) => go({ screen: "side", map })} />;
    case "side":
      return (
        <SideScreen
          map={MAPS.find((m) => m.id === route.map)!}
          onBack={back}
          onPick={(side) => go({ ...route, screen: "map", side })}
        />
      );
    case "map":
      return (
        <MapScreen
          side={route.side}
          map={MAPS.find((m) => m.id === route.map)!}
          spots={spots}
          onBack={back}
          onPick={(spot) => go({ ...route, screen: "spot", spot })}
          onNew={() => openEditor({ ...route, screen: "new" })}
        />
      );
    case "spot":
      return <LineupScreen key={route.spot} spot={spots.find((s) => s.id === route.spot)!} onBack={back} onEdit={pin ? () => openEditor({ ...route, screen: "edit" }) : undefined} />;
    case "new":
    case "edit":
      return <EditScreen
        key={route.screen === "edit" ? route.spot : `new-${route.map}-${route.side}`}
        map={MAPS.find((m) => m.id === route.map)!}
        side={route.side}
        spots={spots}
        spot={route.screen === "edit" ? spots.find((s) => s.id === route.spot) : undefined}
        pin={pin}
        onBack={back}
        onPinRequired={requirePin}
        onSave={(spot) => {
          upsert(spot);
          go({ screen: "spot", map: spot.map, side: spot.side, spot: spot.id }, true);
        }}
        onDelete={(id) => {
          remove(id);
          go({ screen: "map", map: route.map, side: route.side }, true);
        }}
      />;
    }
  }

  return <>
    {renderScreen()}
    {needsPin && <PinDialog onSuccess={(value) => {
      setPin(value);
      setSessionPin(value);
      setPinRejected(false);
      if (pendingEditor) go(pendingEditor);
      setPendingEditor(null);
    }} onCancel={() => {
      setPendingEditor(null);
      if (route.screen === "new" || route.screen === "edit") go(parent(route), true);
    }} />}
  </>;
}
