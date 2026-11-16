import type { Side } from "../data/types";

export default function SideScreen({ onPick }: { onPick: (side: Side) => void }) {
  return (
    <main className="screen side-screen">
      <h1 className="eyebrow">Seite wählen</h1>
      <div className="sides">
        <button type="button" className="side t" onClick={() => onPick("t")}>T</button>
        <button type="button" className="side ct" onClick={() => onPick("ct")}>CT</button>
      </div>
    </main>
  );
}
