import { useEffect, useRef, useState, type FormEvent } from "react";
import { checkPin, LockedError } from "../data/api";

export default function PinDialog({ onSuccess, onCancel }: { onSuccess: (pin: string) => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    const element = dialog.current!;
    if (element.showModal) element.showModal();
    else element.setAttribute("open", "");
    input.current?.focus();
    return () => { active.current = false; element.close?.(); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !/^\d{6,}$/.test(pin)) return;
    setBusy(true);
    setError("");
    try {
      const valid = await checkPin(pin);
      if (!active.current) return;
      if (valid) onSuccess(pin);
      else {
        setError("PIN falsch");
        input.current?.focus();
        input.current?.select();
      }
    } catch (error) {
      if (active.current) setError(error instanceof LockedError
        ? error.message
        : "Keine Verbindung – PIN konnte nicht geprüft werden");
    } finally {
      if (active.current) setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className="editor-dialog" aria-modal="true" aria-labelledby="pin-title" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
      <form onSubmit={(event) => void submit(event)}>
        <h2 id="pin-title">PIN eingeben</h2>
        <label htmlFor="edit-pin">PIN</label>
        <input ref={input} id="edit-pin" type="password" inputMode="numeric" pattern="[0-9]{6,}" autoComplete="off" value={pin} aria-describedby="pin-hint pin-error" onChange={(event) => setPin(event.target.value)} />
        <p id="pin-hint" className="field-hint">Mindestens 6 Ziffern. Dieses Gerät merkt sich den PIN.</p>
        <p id="pin-error" role="alert">{error}</p>
        <div className="editor-actions">
          <button type="button" className="editor-button" onClick={onCancel}>Abbrechen</button>
          <button type="submit" className="editor-button primary" disabled={busy || !/^\d{6,}$/.test(pin)}>{busy ? "Prüft …" : "Entsperren"}</button>
        </div>
      </form>
    </dialog>
  );
}
