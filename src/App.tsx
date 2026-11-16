import { useEffect, useState } from "react";
import { MAPS, SPOTS } from "./data/lineups";
import { canPromptInstall, detectPlatform, isStandalone, promptInstall, wantsInstall } from "./install";
import { parent, parseRoute, toHash, type Route } from "./route";
import InstallScreen from "./screens/InstallScreen";
import LineupScreen from "./screens/LineupScreen";
import MapPoolScreen from "./screens/MapPoolScreen";
import MapScreen from "./screens/MapScreen";
import SideScreen from "./screens/SideScreen";

const current = () => parseRoute(location.hash, MAPS, SPOTS);

export default function App() {
  const [platform] = useState(() => detectPlatform(navigator.userAgent, isStandalone()));
  const [installing, setInstalling] = useState(() => wantsInstall(location.search) && platform !== "installed");
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const [route, setRoute] = useState<Route>(current);

  useEffect(() => {
    const updatePrompt = () => setCanPrompt(canPromptInstall());
    const updateRoute = () => setRoute(current());
    window.addEventListener("beforeinstallprompt", updatePrompt);
    window.addEventListener("hashchange", updateRoute);
    return () => {
      window.removeEventListener("beforeinstallprompt", updatePrompt);
      window.removeEventListener("hashchange", updateRoute);
    };
  }, []);

  function go(next: Route) {
    location.hash = toHash(next);
    setRoute(next);
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

  const back = () => go(parent(route));
  switch (route.screen) {
    case "side":
      return <SideScreen onPick={(side) => go({ screen: "maps", side })} />;
    case "maps":
      return <MapPoolScreen side={route.side} maps={MAPS} onBack={back} onPick={(map) => go({ ...route, screen: "map", map })} />;
    case "map":
      return (
        <MapScreen
          side={route.side}
          map={MAPS.find((m) => m.id === route.map)!}
          spots={SPOTS}
          onBack={back}
          onPick={(spot) => go({ ...route, screen: "spot", spot })}
        />
      );
    case "spot":
      return <LineupScreen key={route.spot} spot={SPOTS.find((s) => s.id === route.spot)!} onBack={back} />;
  }
}
