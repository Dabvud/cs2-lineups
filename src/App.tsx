import { useEffect, useState } from "react";
import { MAPS } from "./data/maps";
import { useSpots } from "./data/useSpots";
import { canPromptInstall, detectPlatform, isStandalone, promptInstall, wantsInstall } from "./install";
import { parent, parseRoute, toHash, type Route } from "./route";
import InstallScreen from "./screens/InstallScreen";
import LineupScreen from "./screens/LineupScreen";
import MapPoolScreen from "./screens/MapPoolScreen";
import MapScreen from "./screens/MapScreen";
import SideScreen from "./screens/SideScreen";

export default function App() {
  const [platform] = useState(() => detectPlatform(navigator.userAgent, isStandalone()));
  const [installing, setInstalling] = useState(() => wantsInstall(location.search) && platform !== "installed");
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const [hash, setHash] = useState(() => location.hash);
  const { spots, status, reload } = useSpots();
  const route = parseRoute(hash, MAPS, spots);

  useEffect(() => {
    const updatePrompt = () => setCanPrompt(canPromptInstall());
    const updateRoute = () => setHash(location.hash);
    window.addEventListener("beforeinstallprompt", updatePrompt);
    window.addEventListener("hashchange", updateRoute);
    return () => {
      window.removeEventListener("beforeinstallprompt", updatePrompt);
      window.removeEventListener("hashchange", updateRoute);
    };
  }, []);

  function go(next: Route) {
    // markiert Einträge der App, damit der Zurück-Pfeil sie per history.back() verlassen darf
    history.pushState({ app: true }, "", toHash(next));
    setHash(toHash(next));
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
        />
      );
    case "spot":
      return <LineupScreen key={route.spot} spot={spots.find((s) => s.id === route.spot)!} onBack={back} />;
  }
}
