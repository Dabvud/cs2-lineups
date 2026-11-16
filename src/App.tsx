import { useEffect, useState } from "react";
import { canPromptInstall, detectPlatform, isStandalone, promptInstall, wantsInstall } from "./install";
import InstallScreen from "./screens/InstallScreen";

export default function App() {
  const [platform] = useState(() => detectPlatform(navigator.userAgent, isStandalone()));
  const [installing, setInstalling] = useState(() => wantsInstall(location.search) && platform !== "installed");
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);

  useEffect(() => {
    const updatePrompt = () => setCanPrompt(canPromptInstall());
    window.addEventListener("beforeinstallprompt", updatePrompt);
    return () => window.removeEventListener("beforeinstallprompt", updatePrompt);
  }, []);

  function closeInstall() {
    const url = new URL(location.href);
    url.searchParams.delete("installieren");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    setInstalling(false);
  }

  if (installing) {
    return <InstallScreen platform={platform} canPrompt={canPrompt} onPrompt={() => void promptInstall().then(() => setCanPrompt(canPromptInstall()))} onClose={closeInstall} />;
  }
  return (
    <main className="screen">
      <button type="button">T</button>
      <button type="button">CT</button>
    </main>
  );
}
