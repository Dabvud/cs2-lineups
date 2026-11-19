import TopBar from "../components/TopBar";
import type { Spot } from "../data/types";
import { watchUrl } from "../embed";
import { TYPE_NAME } from "./MapScreen";

type Props = { spot: Spot; siblings?: Spot[]; onSwitch?: (id: string) => void; onBack: () => void; onEdit?: () => void };

export default function LineupScreen({ spot, siblings = [], onSwitch, onBack, onEdit }: Props) {
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
      {onSwitch && siblings.map((s) => (
        <button type="button" key={s.id} className="switch-variant" onClick={() => onSwitch(s.id)}>
          ⇄ Andere Variante: {s.name}{s.type !== spot.type && ` (${TYPE_NAME[s.type]})`}
        </button>
      ))}
    </main>
  );
}
