import { radarStyle } from "../data/maps";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import type { SpotInput } from "../../supabase/functions/spots/logic";
import TopBar from "../components/TopBar";
import { deleteSpot, InvalidError, LockedError, PinError, saveSpot } from "../data/api";
import type { MapInfo, NadeType, Side, Spot } from "../data/types";
import { compressImage } from "../editor/image";
import { snapPoint } from "../editor/snap";

type Point = { x: number; y: number };
type Props = {
  map: MapInfo; side: Side; spots: Spot[]; spot?: Spot; pin: string | null;
  onBack: () => void; onPinRequired: () => void;
  onSave: (spot: Spot) => void; onDelete: (id: string) => void;
};

function usePreview(file?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!file) { setUrl(undefined); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function DeleteDialog({ name, busy, onCancel, onConfirm }: { name: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    if (element.showModal) element.showModal();
    else element.setAttribute("open", "");
    return () => element.close?.();
  }, []);
  return (
    <dialog ref={dialog} className="editor-dialog" aria-modal="true" aria-labelledby="delete-title" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
      <h2 id="delete-title">Spot „{name}“ wirklich löschen?</h2>
      <div className="editor-actions">
        <button type="button" className="editor-button" disabled={busy} autoFocus onClick={onCancel}>Abbrechen</button>
        <button type="button" className="editor-button danger" disabled={busy} onClick={onConfirm}>{busy ? "Löscht …" : "Ja, löschen"}</button>
      </div>
    </dialog>
  );
}

export default function EditScreen({ map, side, spots, spot, pin, onBack, onPinRequired, onSave, onDelete }: Props) {
  const [name, setName] = useState(spot?.name ?? "");
  const [label, setLabel] = useState(spot?.label ?? "");
  const [type, setType] = useState<NadeType | null>(spot?.type ?? null);
  const [text, setText] = useState(spot?.text ?? "");
  const [point, setPoint] = useState<Point | null>(spot ? { x: spot.x, y: spot.y } : null);
  const [stand, setStand] = useState<Blob>();
  const [aim, setAim] = useState<Blob>();
  const standPreview = usePreview(stand) ?? spot?.stand;
  const aimPreview = usePreview(aim) ?? spot?.aim;
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const others = spots.filter((s) => s.map === map.id && s.side === side);
  const missing = [
    ...(!spot && !stand ? ["Bild ‚Hier hinstellen‘"] : []),
    ...(!spot && !aim ? ["Bild ‚Hierhin zielen‘"] : []),
    ...(!name.trim() ? ["Name"] : []),
    ...(!type ? ["Smoke oder Molly"] : []),
    ...(!point ? ["Landepunkt"] : []),
  ];

  function selectPoint(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setPoint(snapPoint({
      x: Math.min(100, Math.max(0, (event.clientX - rect.left) / rect.width * 100)),
      y: Math.min(100, Math.max(0, (event.clientY - rect.top) / rect.height * 100)),
    }, others));
  }

  function movePoint(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 5 : 1;
    const current = point ?? { x: 50, y: 50 };
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPoint(snapPoint(current, others));
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      setPoint({
        x: Math.min(100, Math.max(0, current.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0))),
        y: Math.min(100, Math.max(0, current.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0))),
      });
    }
  }

  function report(error: unknown, action: "save" | "delete") {
    if (error instanceof PinError) {
      onPinRequired();
    } else if (error instanceof LockedError) {
      setErrors([error.message]);
    } else if (error instanceof InvalidError) {
      setErrors(error.details.length ? error.details : ["Bitte die Angaben prüfen."]);
    } else {
      setErrors([action === "save" ? "Speichern fehlgeschlagen – nochmal versuchen" : "Löschen fehlgeschlagen – nochmal versuchen"]);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || missing.length || !point || !type) return;
    if (!pin) { onPinRequired(); return; }
    setBusy(true);
    setErrors([]);
    try {
      const files: { stand?: Blob; aim?: Blob } = {};
      for (const [kind, file] of [["stand", stand], ["aim", aim]] as const) {
        if (!file) continue;
        const compressed = await compressImage(file);
        if (compressed.size > 1_000_000) throw new InvalidError([`Bild ‚${kind === "stand" ? "Hier hinstellen" : "Hierhin zielen"}‘ ist nach dem Verkleinern größer als 1 MB. Bitte ein kleineres Bild wählen.`]);
        files[kind] = compressed;
      }
      const input: SpotInput = {
        ...(spot ? { id: spot.id } : {}),
        map: map.id, side, type, name: name.trim(), label: label.trim() || null,
        x: point.x, y: point.y, text: text.trim() || null,
      };
      onSave(await saveSpot(pin, spot ? "update" : "create", input, files));
    } catch (error) {
      report(error, "save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!spot || busy) return;
    if (!pin) { setConfirmDelete(false); onPinRequired(); return; }
    setBusy(true);
    setErrors([]);
    try {
      await deleteSpot(pin, spot.id);
      onDelete(spot.id);
    } catch (error) {
      report(error, "delete");
    } finally {
      setConfirmDelete(false);
      setBusy(false);
    }
  }

  return (
    <main className={`screen editor-screen side-${side}`}>
      <TopBar title={spot ? "Spot bearbeiten" : "Neuer Spot"} onBack={() => { if (!busy) onBack(); }} />
      <p className="editor-context">{map.name} · {side.toUpperCase()}</p>
      <form className="spot-editor" onSubmit={(event) => void save(event)}>
        <fieldset disabled={busy} className="editor-fields">
          <legend className="sr-only">Spot-Angaben</legend>
          <div className="editor-images">
            {([ ["stand", "Hier hinstellen", standPreview], ["aim", "Hierhin zielen", aimPreview] ] as const).map(([kind, title, preview]) => (
              <div className="image-field" key={kind}>
                <label htmlFor={`image-${kind}`}>Bild ‚{title}‘</label>
                {preview && <img className="image-preview" src={preview} alt={`Vorschau: ${title}`} />}
                <input id={`image-${kind}`} type="file" accept="image/*" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) (kind === "stand" ? setStand : setAim)(file);
                }} />
                {spot && <small className="field-hint">Ohne neue Auswahl bleibt das bisherige Bild erhalten.</small>}
              </div>
            ))}
          </div>
          <div className="editor-grid">
            <div className="editor-details">
              <label htmlFor="spot-name">Name</label>
              <input id="spot-name" value={name} onChange={(event) => setName(event.target.value)} />
              <label htmlFor="spot-label">Kurzname auf der Karte</label>
              <input id="spot-label" maxLength={14} value={label} onChange={(event) => setLabel(event.target.value)} aria-describedby="label-hint" />
              <small id="label-hint" className="field-hint">Optional, bis zu 14 Zeichen. Leer: Name auf der Karte.</small>
              <fieldset className="nade-type">
                <legend>Smoke oder Molly</legend>
                <div className="type-buttons">
                  <button type="button" className="editor-button" aria-pressed={type === "smoke"} onClick={() => setType("smoke")}><span className="dot smoke" /> Smoke</button>
                  <button type="button" className="editor-button" aria-pressed={type === "molly"} onClick={() => setType("molly")}><span className="dot molly" /> Molly</button>
                </div>
              </fieldset>
              <label htmlFor="spot-text">Wurfanleitung (optional)</label>
              <input id="spot-text" value={text} placeholder="z. B. Jumpthrow" onChange={(event) => setText(event.target.value)} />
            </div>
            <div className="editor-map">
              <h2>Landepunkt</h2>
              <p id="editor-radar-help" className="field-hint">Auf der Karte antippen, wo die Granate landet. Mit der Tastatur: Pfeiltasten verschieben, Enter rastet ein.</p>
              <div className="radar editor-radar">
                <div className="radar-layer" style={radarStyle(map)} role="button" tabIndex={busy ? -1 : 0} aria-disabled={busy} aria-label="Landepunkt auf der Karte setzen" aria-describedby="editor-radar-help" onClick={(event) => { if (!busy) selectPoint(event); }} onKeyDown={(event) => { if (!busy) movePoint(event); }}>
                  {map.radar && <img src={map.radar} alt="" draggable={false} />}
                  {others.map((s) => <span key={s.id} className={`point editor-reference ${s.type}`} style={{ left: `${s.x}%`, top: `${s.y}%` }} aria-hidden="true"><span className="dot" /></span>)}
                  {point && <span className={`point landing-point ${type ?? "smoke"}`} data-testid="landing-point" style={{ left: `${point.x}%`, top: `${point.y}%` }}><span className="dot" /><span className="tag">Landepunkt</span></span>}
                </div>
              </div>
              <p className="field-hint" role="status">{point ? `Landepunkt: ${Math.round(point.x * 10) / 10} % / ${Math.round(point.y * 10) / 10} %` : "Noch kein Landepunkt gesetzt."}</p>
            </div>
          </div>
        </fieldset>
        {missing.length > 0 && <p className="field-hint" id="missing-fields" data-testid="missing-fields">Noch ergänzen: {missing.join(", ")}</p>}
        {errors.length > 0 && <div className="editor-error" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
        <div className="editor-actions">
          {spot && <button type="button" className="editor-button danger" disabled={busy} onClick={() => setConfirmDelete(true)}>Löschen</button>}
          <button type="submit" className="editor-button primary" aria-describedby={missing.length ? "missing-fields" : undefined} disabled={busy || missing.length > 0}>{busy ? "Bitte warten …" : "Speichern"}</button>
        </div>
      </form>
      {confirmDelete && spot && <DeleteDialog name={spot.name} busy={busy} onCancel={() => setConfirmDelete(false)} onConfirm={() => void remove()} />}
    </main>
  );
}
