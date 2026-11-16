import TopBar from "../components/TopBar";
import type { MapInfo, Side } from "../data/types";

type Props = { side: Side; maps: MapInfo[]; onPick: (map: string) => void; onBack: () => void };

export default function MapPoolScreen({ side, maps, onPick, onBack }: Props) {
  return (
    <main className={`screen side-${side}`}>
      <TopBar title={`Map · ${side.toUpperCase()}`} onBack={onBack} />
      <div className="maps">
        {maps.map((m) => (
          <button
            type="button"
            key={m.id}
            className="map-tile"
            disabled={!m.active}
            onClick={() => onPick(m.id)}
            style={m.radar ? { backgroundImage: `url(${m.radar})` } : undefined}
          >
            <span>{m.name}</span>
            {!m.active && <small>bald</small>}
          </button>
        ))}
      </div>
    </main>
  );
}
