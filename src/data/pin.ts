const KEY = "cs2-lineups.pin";

export function getPin(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setPin(pin: string): void {
  try {
    localStorage.setItem(KEY, pin);
  } catch {
    // Bei gesperrtem Speicher gilt der PIN nur für die laufende Sitzung.
  }
}

export function clearPin(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Die App verwirft zusätzlich ihren PIN im Arbeitsspeicher.
  }
}
