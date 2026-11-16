import { useState } from "react";
import TopBar from "../components/TopBar";
import type { MapInfo, Side, Spot } from "../data/types";

type Props = { side: Side; map: MapInfo; spots: Spot[]; onPick: (spot: string) => void; onBack: () => void };

const pointLabel = (s: Spot) => (s.type === "molly" ? `${s.label} (Molly)` : s.label);
const TYPE_NAME = { smoke: "Smoke", molly: "Molly" } as const;

/** Lineups mit exakt gleicher Landestelle teilen sich einen Punkt. */
function groupByLanding(spots: Spot[]): Spot[][] {
  const groups = new Map<string, Spot[]>();
  for (const s of spots) {
    const key = `${s.x},${s.y}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.values()];
}

export default function MapScreen({ side, map, spots, onPick, onBack }: Props) {
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
              <span className="dot" />
              <span className="tag" aria-hidden="true">{[...new Set(g.map((s) => s.label))].join(" / ")}</span>
            </button>
          );
        })}
        </div>
      </div>
      <p className="legend">
        <span className="dot smoke" /> Smoke <span className="dot molly" /> Molly
      </p>
      {choice && (
        <div className="chooser" role="dialog" aria-label="Lineup wählen" onClick={() => setChoice(null)}>
          <div className="chooser-box">
            {choice.map((s) => (
              <button type="button" key={s.id} onClick={() => onPick(s.id)}>
                {s.name} <small>{TYPE_NAME[s.type]}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
