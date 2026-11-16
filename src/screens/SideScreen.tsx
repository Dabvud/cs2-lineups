import TopBar from "../components/TopBar";
import type { MapInfo, Side } from "../data/types";

type Props = { map: MapInfo; onPick: (side: Side) => void; onBack: () => void };

export default function SideScreen({ map, onPick, onBack }: Props) {
  return (
    <main className="screen side-screen">
      <TopBar title={map.name} onBack={onBack} />
      <p className="eyebrow">Seite wählen</p>
      <div className="sides">
        <button type="button" className="side t" onClick={() => onPick("t")}>T</button>
        <button type="button" className="side ct" onClick={() => onPick("ct")}>CT</button>
      </div>
    </main>
  );
}
