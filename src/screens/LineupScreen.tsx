import TopBar from "../components/TopBar";
import type { Spot } from "../data/types";
import { watchUrl } from "../embed";

export default function LineupScreen({ spot, onBack, onEdit }: { spot: Spot; onBack: () => void; onEdit?: () => void }) {
  return (
    <main className={`screen side-${spot.side}`}>
      <TopBar title={spot.type === "molly" ? "Molly" : "Smoke"} onBack={onBack} />
      <h2 className="lineup-name">{spot.name}</h2>
      {onEdit && <button type="button" className="editor-button edit-spot" onClick={onEdit}>Bearbeiten</button>}
      {spot.stand || spot.aim ? (
        <div className="shots">
          {spot.stand && (
            <figure>
              <img src={spot.stand} alt={`Hier hinstellen: ${spot.name}`} />
              <figcaption>Hier hinstellen</figcaption>
            </figure>
          )}
          {spot.aim && (
            <figure>
              <img src={spot.aim} alt={`Hierhin zielen: ${spot.name}`} />
              <figcaption>Hierhin zielen</figcaption>
            </figure>
          )}
        </div>
      ) : (
        <p className="no-images">{spot.videoId ? "Bilder folgen – bis dahin hilft das Video." : "Bilder folgen."}</p>
      )}
      {spot.text && <p className="lineup-text" data-testid="lineup-text">{spot.text}</p>}
      {spot.videoId && <a className="source" href={watchUrl(spot)} target="_blank" rel="noreferrer">Video ansehen (YouTube)</a>}
    </main>
  );
}
