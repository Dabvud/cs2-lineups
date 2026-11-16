import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useSpots } from "../src/data/useSpots";
import { loadCache } from "../src/data/remote";
import { FIXTURE, seedCache, stubFetch, stubFetchFail } from "./fixtures";

beforeEach(() => localStorage.clear());

it("lädt und speichert Spots beim Start", async () => {
  stubFetch();
  const { result } = renderHook(useSpots);
  expect(result.current.status).toBe("loading");
  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(result.current.spots).toHaveLength(22);
  expect(loadCache()).toEqual(result.current.spots);
});

it("behält bei Netzfehlern den Cache und kann erneut laden", async () => {
  seedCache();
  stubFetchFail();
  const { result } = renderHook(useSpots);
  expect(result.current.spots).toEqual(FIXTURE);
  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(result.current.spots).toEqual(FIXTURE);
  stubFetch([]);
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(result.current.spots).toEqual([]);
  expect(loadCache()).toEqual([]);
});

it("aktualisiert, ergänzt und entfernt Spots in State und Cache", async () => {
  seedCache();
  stubFetchFail();
  const { result } = renderHook(useSpots);
  await waitFor(() => expect(result.current.status).toBe("error"));
  const updated = { ...FIXTURE[0], name: "Neuer Name" };
  const added = { ...FIXTURE[1], id: "t-neu" };
  act(() => {
    result.current.upsert(updated);
    result.current.upsert(added);
    result.current.remove(FIXTURE[1].id);
  });
  expect(result.current.spots).toHaveLength(22);
  expect(result.current.spots.find((s) => s.id === updated.id)).toEqual(updated);
  expect(result.current.spots).toContainEqual(added);
  expect(result.current.spots.some((s) => s.id === FIXTURE[1].id)).toBe(false);
  expect(loadCache()).toEqual(result.current.spots);
});

it("ignoriert eine alte Antwort nach erneutem Laden", async () => {
  let finishOld!: (response: unknown) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { finishOld = resolve; })));
  const { result } = renderHook(useSpots);
  stubFetch([]);
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.status).toBe("ready"));
  await act(async () => finishOld({ ok: true, json: async () => [{ id: "alt" }] }));
  expect(result.current.spots).toEqual([]);
  expect(loadCache()).toEqual([]);
});
