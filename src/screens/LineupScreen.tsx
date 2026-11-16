import TopBar from "../components/TopBar";
import type { Spot } from "../data/types";
import { embedUrl, watchUrl } from "../embed";
import { useOnline } from "../useOnline";

export default function LineupScreen({ spot, onBack }: { spot: Spot; onBack: () => void }) {
  const online = useOnline();
  return (
    <main className={`screen side-${spot.side}`}>
      <TopBar title={spot.type === "molly" ? "Molly" : "Smoke"} onBack={onBack} />
      <h2 className="lineup-name">{spot.name}</h2>
      {online ? (
        <div className="video">
          <iframe title={spot.name} src={embedUrl(spot)} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <p className="offline">Für Videos brauchst du Internet</p>
      )}
      {spot.text && <p className="lineup-text" data-testid="lineup-text">{spot.text}</p>}
      <a className="source" href={watchUrl(spot)} target="_blank" rel="noreferrer">Auf YouTube öffnen</a>
    </main>
  );
}
