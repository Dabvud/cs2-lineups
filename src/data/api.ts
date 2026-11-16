import type { SpotInput } from "../../supabase/functions/spots/logic";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import { toSpot, type SpotRow } from "./remote";
import type { Spot } from "./types";

export class PinError extends Error {
  constructor() {
    super("PIN falsch");
    this.name = "PinError";
  }
}

export class LockedError extends Error {
  constructor() {
    super("Zu viele Fehlversuche – bitte in 10 Minuten nochmal");
    this.name = "LockedError";
  }
}

export class InvalidError extends Error {
  details: string[];
  constructor(details: string[]) {
    super("Ungültige Angaben");
    this.name = "InvalidError";
    this.details = details;
  }
}

async function request(pin: string, action: string, input?: SpotInput | { id: string }, files: { stand?: Blob; aim?: Blob } = {}) {
  const body = new FormData();
  body.set("pin", pin);
  body.set("action", action);
  if (input) body.set("spot", JSON.stringify(input));
  for (const kind of ["stand", "aim"] as const) {
    if (files[kind]) body.set(kind, files[kind], `${kind}.jpg`);
  }
  const response = await fetch(`${SUPABASE_URL}/functions/v1/spots`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body,
  });
  if (response.status === 401) throw new PinError();
  if (response.status === 429) throw new LockedError();
  if (response.status === 400) {
    const data = await response.json();
    throw new InvalidError(Array.isArray(data.details) ? data.details.filter((d: unknown) => typeof d === "string") : []);
  }
  if (!response.ok) throw new Error(`Anfrage fehlgeschlagen (${response.status})`);
  const data: { ok: boolean; spot?: SpotRow } = await response.json();
  if (!data.ok) throw new Error("Ungültige Serverantwort");
  return data;
}

export async function checkPin(pin: string): Promise<boolean> {
  try {
    await request(pin, "check");
    return true;
  } catch (error) {
    if (error instanceof PinError) return false;
    throw error;
  }
}

export async function saveSpot(pin: string, action: "create" | "update", input: SpotInput, files: { stand?: Blob; aim?: Blob }): Promise<Spot> {
  const { spot } = await request(pin, action, input, files);
  if (!spot) throw new Error("Spot fehlt in der Serverantwort");
  return toSpot(spot);
}

export async function deleteSpot(pin: string, id: string): Promise<void> {
  await request(pin, "delete", { id });
}
