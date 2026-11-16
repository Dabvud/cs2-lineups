import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSpots, loadCache, saveCache } from "./remote";
import type { Spot } from "./types";

export function useSpots(): {
  spots: Spot[];
  status: "loading" | "ready" | "error";
  reload(): void;
  upsert(spot: Spot): void;
  remove(id: string): void;
} {
  const [spots, setSpots] = useState<Spot[]>(() => loadCache() ?? []);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [request, setRequest] = useState(0);
  const currentSpots = useRef(spots);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    void fetchSpots().then((loaded) => {
      if (!active) return;
      currentSpots.current = loaded;
      setSpots(loaded);
      saveCache(loaded);
      setStatus("ready");
    }).catch(() => {
      if (active) setStatus("error");
    });
    return () => { active = false; };
  }, [request]);

  const reload = useCallback(() => setRequest((value) => value + 1), []);

  const update = useCallback((change: (previous: Spot[]) => Spot[]) => {
    const next = change(currentSpots.current);
    currentSpots.current = next;
    setSpots(next);
    saveCache(next);
  }, []);

  const upsert = useCallback((spot: Spot) => update((previous) => (
    previous.some((s) => s.id === spot.id)
      ? previous.map((s) => s.id === spot.id ? spot : s)
      : [...previous, spot]
  )), [update]);

  const remove = useCallback((id: string) => update((previous) => previous.filter((s) => s.id !== id)), [update]);

  return { spots, status, reload, upsert, remove };
}
