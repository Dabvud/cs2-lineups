import { useEffect, useRef, useState } from "react";

const HOLD_MS = 250;
const CANCEL_PX = 10;

/** Bild, das beim Gedrückthalten an Ort und Stelle um die Fingerstelle heranzoomt. */
export default function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const img = useRef<HTMLImageElement>(null);
  const timer = useRef<number>();
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);

  function aim(x: number, y: number) {
    const el = img.current!;
    const r = el.parentElement!.getBoundingClientRect();
    const pct = (v: number, from: number, size: number) => (size > 0 ? Math.min(Math.max((v - from) / size, 0), 1) * 100 : 50);
    el.style.transformOrigin = `${pct(x, r.left, r.width)}% ${pct(y, r.top, r.height)}%`;
  }

  useEffect(() => {
    if (!start) return;
    const stop = () => { window.clearTimeout(timer.current); setZoomed(false); setStart(null); };
    const follow = (x: number, y: number) => {
      if (zoomed) aim(x, y);
      else if (Math.hypot(x - start.x, y - start.y) > CANCEL_PX) stop();
    };
    const move = (e: PointerEvent) => follow(e.clientX, e.clientY);
    // Safari bricht Pointer-Events beim Scrollen ab, darum auch über Touch folgen; während des Zooms nicht scrollen
    const touch = (e: TouchEvent) => {
      if (zoomed) e.preventDefault();
      follow(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("touchmove", touch, { passive: false });
    for (const ev of ["pointerup", "touchend", "touchcancel"]) window.addEventListener(ev, stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("touchmove", touch);
      for (const ev of ["pointerup", "touchend", "touchcancel"]) window.removeEventListener(ev, stop);
    };
  }, [start, zoomed]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="zoom-frame">
      <img
        ref={img}
        className={zoomed ? "shot zoomed" : "shot"}
        src={src}
        alt={alt}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          const p = { x: e.clientX, y: e.clientY };
          setStart(p);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => { aim(p.x, p.y); setZoomed(true); }, HOLD_MS);
        }}
      />
    </div>
  );
}
