import type { MapInfo } from "../data/types";

type Props = { maps: MapInfo[]; onPick: (map: string) => void };

export default function MapPoolScreen({ maps, onPick }: Props) {
  return (
    <main className="screen">
      <h1 className="eyebrow">Map wählen</h1>
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
