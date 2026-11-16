import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { captureInstallPrompt } from "./install";
import "./styles.css";

captureInstallPrompt();
// neue Version sofort übernehmen (lädt die Seite einmal neu), statt erst beim übernächsten Öffnen
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
