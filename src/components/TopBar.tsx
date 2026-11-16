export default function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="topbar">
      <button type="button" className="back" aria-label="Zurück" onClick={onBack}>←</button>
      <h1>{title}</h1>
    </header>
  );
}
