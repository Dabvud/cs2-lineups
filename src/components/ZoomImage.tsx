import { useEffect, useRef, useState } from "react";

const HOLD_MS = 250;
const CANCEL_PX = 10;

/**
 * Bild, das beim Gedrückthalten an Ort und Stelle um die Fingerstelle heranzoomt.
 * Berührt wird der Rahmen, nicht das Bild (pointer-events: none) – sonst bieten Handys "Bild speichern" an.
 */
export default function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const timer = useRef<number>();
  const zoomedRef = useRef(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  zoomedRef.current = zoomed;

  function aim(x: number, y: number) {
    const r = frame.current!.getBoundingClientRect();
    const pct = (v: number, from: number, size: number) => (size > 0 ? Math.min(Math.max((v - from) / size, 0), 1) * 100 : 50);
    img.current!.style.transformOrigin = `${pct(x, r.left, r.width)}% ${pct(y, r.top, r.height)}%`;
  }

  // iOS entscheidet schon beim Aufsetzen, ob touchmove blockiert werden darf – darum ab Anzeige angemeldet
  useEffect(() => {
    const el = frame.current!;
    const block = (e: TouchEvent) => { if (zoomedRef.current) e.preventDefault(); };
    el.addEventListener("touchmove", block, { passive: false });
    return () => { el.removeEventListener("touchmove", block); window.clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    if (!start) return;
    const stop = () => { window.clearTimeout(timer.current); setZoomed(false); setStart(null); };
    const follow = (x: number, y: number) => {
      if (zoomed) aim(x, y);
      else if (Math.hypot(x - start.x, y - start.y) > CANCEL_PX) stop();
    };
    const move = (e: PointerEvent) => follow(e.clientX, e.clientY);
    // Safari bricht Pointer-Events beim Scrollen ab, darum auch über Touch folgen
    const touch = (e: TouchEvent) => follow(e.touches[0].clientX, e.touches[0].clientY);
    // Abbruch vor dem Zoom heißt: der Browser scrollt – dann nicht mehr zoomen
    const cancel = () => { if (!zoomed) stop(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("touchmove", touch);
    window.addEventListener("pointercancel", cancel);
    for (const ev of ["pointerup", "touchend", "touchcancel"]) window.addEventListener(ev, stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("touchmove", touch);
      window.removeEventListener("pointercancel", cancel);
      for (const ev of ["pointerup", "touchend", "touchcancel"]) window.removeEventListener(ev, stop);
    };
  }, [start, zoomed]);

  return (
    <div
      ref={frame}
      className="zoom-frame"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (start || e.button > 0) return; // läuft schon (zweiter Finger) oder rechte/mittlere Maustaste
        const p = { x: e.clientX, y: e.clientY };
        setStart(p);
        timer.current = window.setTimeout(() => { aim(p.x, p.y); setZoomed(true); }, HOLD_MS);
      }}
    >
      <img ref={img} className={zoomed ? "shot zoomed" : "shot"} src={src} alt={alt} draggable={false} />
    </div>
  );
}
