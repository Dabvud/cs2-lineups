import { useState } from "react";
import TopBar from "../components/TopBar";
import type { MapInfo, Side, Spot } from "../data/types";

type Props = { side: Side; map: MapInfo; spots: Spot[]; onPick: (spot: string) => void; onBack: () => void; onNew: () => void };

export function displayLabel(s: Spot): string {
  const label = s.label?.trim() || s.name;
  return label.length > 14 ? `${label.slice(0, 14)}…` : label;
}

const pointLabel = (s: Spot) => (s.type === "molly" ? `${displayLabel(s)} (Molly)` : displayLabel(s));
const TYPE_NAME = { smoke: "Smoke", molly: "Molly" } as const;

/** Lineups mit exakt gleicher Landestelle teilen sich einen Punkt. */
export function groupByLanding(spots: Spot[]): Spot[][] {
  const groups = new Map<string, Spot[]>();
  for (const s of spots) {
    const key = `${s.x},${s.y}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.values()];
}

export default function MapScreen({ side, map, spots, onPick, onBack, onNew }: Props) {
  const [choice, setChoice] = useState<Spot[] | null>(null);
  const groups = groupByLanding(spots.filter((s) => s.map === map.id && s.side === side));

  return (
    <main className={`screen side-${side}`}>
      <TopBar title={`${map.name} · ${side.toUpperCase()}`} onBack={onBack} />
      <div className="radar" data-testid="radar">
        <div className="radar-layer">
        {map.radar && <img src={map.radar} alt="" />}
        {groups.map((g) => {
          const label = [...new Set(g.map(pointLabel))].join(" / ");
          const molly = g.every((s) => s.type === "molly");
          return (
            <button
              type="button"
              key={g[0].id}
              className={`point ${molly ? "molly" : "smoke"}`}
              style={{ left: `${g[0].x}%`, top: `${g[0].y}%` }}
              aria-label={label}
              onClick={() => (g.length === 1 ? onPick(g[0].id) : setChoice(g))}
            >
              <span className={g.length > 1 ? "dot count" : "dot"}>{g.length > 1 ? g.length : null}</span>
              <span className="tag" aria-hidden="true">{[...new Set(g.map(displayLabel))].join(" / ")}</span>
            </button>
          );
        })}
        </div>
      </div>
      <p className="legend">
        <span className="dot smoke" /> Smoke <span className="dot molly" /> Molly
      </p>
      <button type="button" className="new-spot" aria-label="Neuer Spot" onClick={onNew}>+</button>
      {choice && (
        <div className="chooser" role="dialog" aria-label="Lineup wählen" onClick={() => setChoice(null)}>
          <div className="chooser-box" onClick={(e) => e.stopPropagation()}>
            <h2>
              {[...new Set(choice.map(displayLabel))].join(" / ")}
              <small>{choice.length} Varianten</small>
            </h2>
            <div className={`chooser-tiles ${choice.length === 3 ? "cols-3" : "cols-2"}`}>
              {choice.map((s) => {
                const image = s.stand ?? s.aim;
                return (
                  <button type="button" key={s.id} aria-label={`${s.name} ${TYPE_NAME[s.type]}`} onClick={() => onPick(s.id)}>
                    {image && <img src={image} alt="" />}
                    <strong>{s.name}</strong>
                    <small>{TYPE_NAME[s.type]}</small>
                    {s.text && <span>{s.text}</span>}
                  </button>
                );
              })}
            </div>
            <button type="button" className="chooser-cancel" onClick={() => setChoice(null)}>Abbrechen</button>
          </div>
        </div>
      )}
    </main>
  );
}
