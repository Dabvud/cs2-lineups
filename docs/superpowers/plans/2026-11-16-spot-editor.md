# Spot-Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Kollege legt Spots selbst an (2 Bilder, Name, Smoke/Molly, Landepunkt, optional Anleitung), bearbeitet und löscht sie. Gespeichert wird in Supabase, geschützt durch einen PIN, der auf dem Server geprüft wird.

**Architecture:** Die App liest die Spots öffentlich über die Supabase-REST-API und speichert den letzten Stand in localStorage. Alle Schreibzugriffe laufen über eine Edge Function `spots`, die den PIN gegen das Secret `EDIT_PIN` prüft, die Eingaben prüft und mit Service-Role in Tabelle und Bild-Bucket schreibt. Die reine Logik der Function liegt in `logic.ts` und wird mit Vitest getestet.

**Tech Stack:** wie bisher (Vite 6, React 18, TS 5, vite-plugin-pwa, Vitest). Neu: Supabase (Postgres, Storage, Edge Functions/Deno), Supabase-CLI über `npx supabase`. **Keine** neue npm-Abhängigkeit in der App (fetch statt supabase-js). In der Function: `jsr:@supabase/supabase-js@2`.

**Spec:** `docs/superpowers/specs/2026-11-16-spot-editor-design.md`

## Global Constraints

- Supabase-Konto, CLI-Login (`npx supabase login`) und das Setzen von `EDIT_PIN` macht **der Nutzer selbst**. Der PIN steht nie im Repo, nie im App-Code, nie im Chat.
- PIN: mindestens 6 Ziffern. Falscher PIN → Function antwortet erst nach ~1 s mit 401.
- App kennt nur `SUPABASE_URL` und `SUPABASE_ANON_KEY` (öffentlich) in `src/config.ts`.
- Tabelle `spots` und Bucket `lineups`: anonym nur lesen. Schreiben ausschließlich über die Function.
- Bilder vor dem Upload: max. 1280 px Breite, JPEG Qualität 0.8. Function lehnt Bilder > 1 MB ab und nimmt nur `image/jpeg|png|webp` an.
- Beim Anlegen beide Bilder Pflicht, beim Bearbeiten nur ersetzen, nicht entfernen.
- Kurzname: optional, max. 14 Zeichen. Leer → Name, gekürzt auf 14 Zeichen.
- Einrasten: Abstand ≤ 2 (Prozentpunkte) zu einem bestehenden Punkt derselben Map+Seite → genau dessen x/y übernehmen.
- Neue Bildpfade enthalten einen Zufallsteil, damit Caches nie ein altes Bild zeigen.
- Commits enden mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push nur mit OK des Nutzers.
- Codex-Läufe committen nicht. Claude prüft und committet.

## Review Focus

1. **PIN wurde geändert, Gerät hat noch den alten gespeichert** → Speichern bekommt 401 → gespeicherter PIN wird gelöscht, PIN-Dialog erscheint, die Formulareingaben bleiben erhalten. Test in Task 4.
2. **Riesiges PNG vom PC (z. B. 3840×2160)** → wird vor dem Senden auf 1280 px verkleinert. Test der Größenberechnung in Task 4, Größengrenze der Function in Task 2.
3. **Netzwerkfehler beim Speichern** → Formular bleibt mit allen Eingaben stehen, Hinweis „Speichern fehlgeschlagen – nochmal versuchen“. Test in Task 4.
4. **Auf einem Gerät gelöschter Spot ist auf einem anderen noch per Link offen** → nach dem Laden der neuen Daten zeigt die App die Karte statt einer weißen Seite. Test in Task 3.
5. **Erster Start ohne Internet und ohne gespeicherten Stand** → Hinweis „Keine Verbindung – Spots konnten nicht geladen werden“ mit „Nochmal versuchen“. Mit gespeichertem Stand: Spots werden normal angezeigt. Test in Task 3.

---

### Task 1: Supabase einrichten (Claude + Nutzer)

**Files:**
- Create: `supabase/config.toml` (über `npx supabase init`), `supabase/migrations/20261116000000_spots.sql`
- Modify: `src/config.ts`

**Interfaces:**
- Produces: Tabelle `spots`, Bucket `lineups` (public), `SUPABASE_URL`, `SUPABASE_ANON_KEY` in `src/config.ts`.

- [ ] **Step 1:** Nutzer: Projekt im Dashboard anlegen (Region Frankfurt), danach `! npx supabase login`. Claude: `npx supabase init` (falls nötig) und `npx supabase link --project-ref <ref>`.
- [ ] **Step 2:** Migration schreiben:
  ```sql
  create table public.spots (
    id text primary key,
    map text not null,
    side text not null check (side in ('t','ct')),
    type text not null check (type in ('smoke','molly')),
    name text not null check (length(trim(name)) > 0),
    label text check (label is null or length(label) <= 14),
    x real not null check (x between 0 and 100),
    y real not null check (y between 0 and 100),
    stand_path text, aim_path text, text text,
    video_id text, start_s int, end_s int,
    updated_at timestamptz not null default now()
  );
  alter table public.spots enable row level security;
  create policy "spots lesen" on public.spots for select using (true);
  insert into storage.buckets (id, name, public) values ('lineups', 'lineups', true);
  ```
- [ ] **Step 3:** `npx supabase db push`. Erwartet: Migration angewendet. Prüfen: `curl "<URL>/rest/v1/spots?select=id" -H "apikey: <anon>"` → `[]`.
- [ ] **Step 4:** `SUPABASE_URL` und `SUPABASE_ANON_KEY` in `src/config.ts` als exportierte Konstanten eintragen (anon key steht im Dashboard bzw. `npx supabase projects api-keys`).
- [ ] **Step 5:** Nutzer setzt den PIN selbst in **seinem eigenen Terminal** (nicht über `!`): `npx supabase secrets set EDIT_PIN=<PIN>`.
- [ ] **Step 6:** Commit `chore: Supabase-Schema und Konfiguration`.

### Task 2: Edge Function `spots` (Codex)

**Files:**
- Create: `supabase/functions/spots/logic.ts` (rein, ohne Deno-APIs), `supabase/functions/spots/index.ts` (Deno-Handler)
- Test: `tests/function-logic.test.ts`

**Interfaces:**
- Produces (logic.ts):
  ```ts
  export type SpotInput = { id?: string; map: string; side: "t" | "ct"; type: "smoke" | "molly";
    name: string; label?: string | null; x: number; y: number; text?: string | null };
  export type Action = "check" | "create" | "update" | "delete";
  export const ACTIVE_MAPS = ["mirage"]; // shortcut: doppelt zu src/data/maps.ts, bei neuer Map beide ändern
  export const MAX_IMAGE_BYTES = 1_000_000;
  export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  export function pinMatches(given: string, expected: string | undefined): boolean; // false, wenn expected fehlt oder < 6 Zeichen
  export function validateInput(input: unknown, action: "create" | "update",
    images: { stand?: { size: number; type: string }; aim?: { size: number; type: string } }
  ): { ok: true; value: SpotInput } | { ok: false; errors: string[] };
  export function newSpotId(side: "t" | "ct", name: string, rand: string): string; // `${side}-${slug}-${rand}`, slug: a–z0–9 und "-", max 20 Zeichen
  export function imagePath(id: string, kind: "stand" | "aim", rand: string): string; // `${id}/${kind}-${rand}.jpg`
  ```
- Produces (HTTP): `POST <URL>/functions/v1/spots`, `multipart/form-data` mit Feldern `pin`, `action`, `spot` (JSON-String von `SpotInput`, bei `delete` nur `{id}`), Dateien `stand`, `aim` (optional). Header `Authorization: Bearer <anon key>`. Antworten: `200 {ok:true, spot?: SpotRow}`, `401 {error:"pin"}`, `400 {error:"invalid", details:string[]}`, `404 {error:"not_found"}`, `500 {error:"server"}`. `SpotRow` = Tabellenzeile (snake_case). CORS: `*` für Origin, `OPTIONS` beantworten.

- [ ] **Step 1: Tests schreiben** (`tests/function-logic.test.ts`):
  - `pinMatches("123456","123456")` true; `("123457","123456")` false; `("123456", undefined)` false; `("12345","12345")` false (expected zu kurz).
  - `validateInput` create gültig (map mirage, side t, type smoke, name „Jungle“, x 44, y 63, beide Bilder 200 kB jpeg) → ok, `label` leer → `null`, Name getrimmt.
  - Je ein Fehler für: fehlender Name / nur Leerzeichen, `map:"inferno"`, `side:"x"`, `type:"flash"`, `x:101`, `y:-1`, `label` mit 15 Zeichen, create ohne `aim`, Bild 1_000_001 Bytes, Bild `image/gif`, update ohne `id`.
  - update ohne Bilder → ok.
  - `newSpotId("t","Mid Window (aus T-Spawn)!","ab12")` === `"t-mid-window-aus-t-spa-ab12"`; `imagePath("t-x-ab12","aim","9f")` === `"t-x-ab12/aim-9f.jpg"`.
- [ ] **Step 2:** `npx vitest run tests/function-logic.test.ts` → FAIL (Datei fehlt).
- [ ] **Step 3:** `logic.ts` implementieren. `index.ts`: `Deno.serve`, CORS, FormData lesen, `pinMatches(pin, Deno.env.get("EDIT_PIN"))`, bei falsch `await sleep(1000)` + 401. `check` → 200. `create`: `validateInput`, ID per `newSpotId` mit `crypto.randomUUID().slice(0,6)`, Bilder per Service-Role-Client (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` aus env) nach `imagePath` hochladen (`contentType: image/jpeg`), Zeile einfügen, Zeile zurückgeben. `update`: Zeile laden (404 wenn fehlt), Felder setzen, `updated_at = now()`, für jedes neue Bild hochladen und altes Objekt löschen. `delete`: Zeile laden (404), beide Bilder löschen, Zeile löschen.
- [ ] **Step 4:** `npx vitest run tests/function-logic.test.ts` → PASS. `npx tsc -b` ohne Fehler (index.ts ist nicht in `tsconfig` include).
- [ ] **Step 5 (Claude):** `npx supabase functions deploy spots --no-verify-jwt=false`. Prüfen: `curl -X POST .../functions/v1/spots -H "Authorization: Bearer <anon>" -F pin=000000 -F action=check` → 401 nach ~1 s.
- [ ] **Step 6:** Commit `feat: Edge Function spots mit PIN-Prüfung`.

### Task 3: App lädt Spots aus Supabase (Codex)

**Files:**
- Create: `src/data/maps.ts` (MAPS aus lineups.ts hierher), `src/data/remote.ts`, `src/data/useSpots.ts`, `src/data/validate.ts` (validate aus lineups.ts hierher, Video-Felder optional), `tests/fixtures.ts`, `scripts/export-seed.ts`, `scripts/seed/spots.json`
- Modify: `src/data/types.ts`, `src/App.tsx`, `src/route.ts`, `src/screens/MapScreen.tsx`, `src/screens/LineupScreen.tsx`, `src/embed.ts`, alle Tests unter `tests/`
- Delete (am Ende dieses Tasks): nichts. `src/data/lineups.ts` bleibt bis Task 5 als Quelle für den Seed.

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (Task 1), `SpotRow` (Task 2).
- Produces:
  ```ts
  // types.ts
  export type Spot = { id: string; map: string; side: Side; type: NadeType; name: string;
    label?: string; x: number; y: number; stand?: string; aim?: string; text?: string;
    videoId?: string; start?: number; end?: number };   // area entfällt
  // remote.ts
  export type SpotRow = { id: string; map: string; side: Side; type: NadeType; name: string; label: string | null;
    x: number; y: number; stand_path: string | null; aim_path: string | null; text: string | null;
    video_id: string | null; start_s: number | null; end_s: number | null };
  export function imageUrl(path: string): string; // `${SUPABASE_URL}/storage/v1/object/public/lineups/${path}`
  export function toSpot(row: SpotRow): Spot;
  export async function fetchSpots(): Promise<Spot[]>; // GET /rest/v1/spots?select=*  (apikey + Authorization-Header)
  export function loadCache(): Spot[] | null;  // localStorage "cs2-lineups.spots", try/catch
  export function saveCache(spots: Spot[]): void;
  // useSpots.ts
  export function useSpots(): { spots: Spot[]; status: "loading" | "ready" | "error";
    reload(): void; upsert(spot: Spot): void; remove(id: string): void }; // upsert/remove aktualisieren State + Cache
  // MapScreen
  export function displayLabel(s: Spot): string; // s.label?.trim() || name, gekürzt auf 14 Zeichen ("…" am Ende, wenn gekürzt)
  ```
- `App` speichert nur den Hash als State und leitet die Route bei jedem Render per `parseRoute(hash, MAPS, spots)` ab, damit veraltete Spot-IDs nach dem Laden neuer Daten auf die Karte zurückfallen.

- [ ] **Step 1:** `scripts/export-seed.ts` schreiben, das `SPOTS` aus `src/data/lineups.ts` liest und als `scripts/seed/spots.json` speichert (Felder wie `Spot`, ohne `stand`/`aim`/`area`). Ausführen mit `npx vite-node scripts/export-seed.ts`. Erwartet: 22 Einträge. Die Bilder aus `src/assets/lineups/` nach `scripts/seed/images/` **kopieren** (Dateinamen bleiben).
- [ ] **Step 2: Tests schreiben/umstellen**
  - `tests/fixtures.ts`: `export const FIXTURE: Spot[]` aus `scripts/seed/spots.json` plus `stand`/`aim`-URLs nur für `t-jungle` (`"https://x/stand.jpg"`, `"https://x/aim.jpg"`). `export function seedCache(spots = FIXTURE)` (schreibt localStorage), `export function stubFetch(spots = FIXTURE)` (vi.stubGlobal fetch, antwortet mit SpotRows), `export function stubFetchFail()`.
  - `tests/data.test.ts`: `validate(MAPS, FIXTURE)` leer; bestehende Fehlerfälle behalten (ohne videoId-Fall); 15 T / 7 CT.
  - `tests/remote.test.ts`: `toSpot` setzt `stand` = `imageUrl(stand_path)`, `label` null → undefined; `fetchSpots` ruft die URL mit `apikey`-Header; Cache Roundtrip; kaputter Cache-Inhalt → `null`.
  - `tests/App.test.tsx`: vor jedem Test `seedCache(); stubFetch();`. Bestehende Tests bleiben inhaltlich. Neu:
    - „zeigt ohne Cache und ohne Netz einen Fehler mit Nochmal versuchen“: kein Cache, `stubFetchFail()` → Text „Keine Verbindung – Spots konnten nicht geladen werden“, Button „Nochmal versuchen“; danach `stubFetch()`, Klick → Button „Mirage“ sichtbar.
    - „zeigt mit Cache und ohne Netz die Spots“: `seedCache(); stubFetchFail();` → auf `#/mirage/t` ist das Radar mit Punkten zu sehen.
    - „fällt nach neuem Laden bei gelöschtem Spot auf die Karte zurück“: Cache mit Jungle, `#/mirage/t/t-jungle` offen, Fetch liefert ohne Jungle → nach `await` ist `getByTestId("radar")` da.
    - „kürzt lange Namen ohne Kurznamen“: `displayLabel({...,name:"Ein sehr langer Spotname", label: undefined})` === `"Ein sehr lange…"`.
- [ ] **Step 3:** `npx vitest run` → neue Tests FAIL.
- [ ] **Step 4:** Implementieren. `LineupScreen`: Video-Link nur, wenn `videoId` gesetzt; `watchUrl` mit `start ?? 0`. MapScreen nutzt `displayLabel`. `App` nutzt `useSpots()`; Status `loading` ohne Daten → „Lädt …“; `error` ohne Daten → Fehlertext + Button.
- [ ] **Step 5:** `npx vitest run` und `npx tsc -b` grün.
- [ ] **Step 6:** Commit `feat: Spots aus Supabase laden, letzter Stand offline`.

### Task 4: Editor, PIN und API-Client (Codex)

**Files:**
- Create: `src/data/api.ts`, `src/data/pin.ts`, `src/editor/image.ts`, `src/editor/snap.ts`, `src/screens/EditScreen.tsx`, `src/components/PinDialog.tsx`
- Modify: `src/route.ts`, `src/App.tsx`, `src/screens/MapScreen.tsx` (+-Knopf), `src/screens/LineupScreen.tsx` (Bearbeiten-Knopf), `src/styles.css`
- Test: `tests/editor.test.tsx`, `tests/route.test.ts`, `tests/snap.test.ts`, `tests/image.test.ts`

**Interfaces:**
- Consumes: HTTP-Schnittstelle aus Task 2, `useSpots().upsert/remove` aus Task 3.
- Produces:
  ```ts
  // route.ts – zusätzlich
  | { screen: "new"; map: string; side: Side }                 // #/mirage/t/neu
  | { screen: "edit"; map: string; side: Side; spot: string }  // #/mirage/t/<id>/bearbeiten
  // parent(new) = map, parent(edit) = spot; unbekannte Spot-ID bei edit → map
  // api.ts
  export class PinError extends Error {}
  export class InvalidError extends Error { details: string[] }
  export async function checkPin(pin: string): Promise<boolean>;
  export async function saveSpot(pin: string, action: "create" | "update", input: SpotInput,
    files: { stand?: Blob; aim?: Blob }): Promise<Spot>; // 401 → PinError, 400 → InvalidError, sonst Error
  export async function deleteSpot(pin: string, id: string): Promise<void>;
  // pin.ts – localStorage "cs2-lineups.pin", alles in try/catch
  export function getPin(): string | null; export function setPin(pin: string): void; export function clearPin(): void;
  // image.ts
  export function targetSize(w: number, h: number, maxWidth = 1280): { w: number; h: number };
  export async function compressImage(file: Blob, maxWidth = 1280, quality = 0.8): Promise<Blob>; // Canvas → image/jpeg
  // snap.ts
  export function snapPoint(p: { x: number; y: number }, others: { x: number; y: number }[], radius = 2): { x: number; y: number };
  ```
  `SpotInput` wird aus `supabase/functions/spots/logic.ts` per `import type` übernommen.

- [ ] **Step 1: Tests schreiben**
  - `tests/image.test.ts`: `targetSize(3840,2160)` → `{w:1280,h:720}`; `targetSize(1920,1080)` → `{w:1280,h:720}`; `targetSize(800,600)` → `{w:800,h:600}`.
  - `tests/snap.test.ts`: `snapPoint({x:44.5,y:63.5},[{x:44,y:63}])` → `{x:44,y:63}`; `({x:50,y:50},[{x:44,y:63}])` → `{x:50,y:50}`; Abstand genau 2 → rastet ein.
  - `tests/route.test.ts`: Roundtrips `#/mirage/t/neu`, `#/mirage/t/t-jungle/bearbeiten`; `#/mirage/t/gibtsnicht/bearbeiten` → map; parent-Fälle.
  - `tests/editor.test.tsx` (mit `seedCache/stubFetch`, `vi.mock("../src/data/api")`, `vi.mock("../src/editor/image")` → `compressImage` gibt Eingabe zurück):
    - „+ fragt PIN und öffnet nach richtigem PIN das Formular“: `#/mirage/t`, Button „Neuer Spot“ → Dialog „PIN eingeben“; `checkPin` → true; danach Hash `#/mirage/t/neu`, `getPin()` gesetzt.
    - „falscher PIN bleibt im Dialog mit Hinweis“: `checkPin` → false → Text „PIN falsch“.
    - „Speichern gesperrt, solange Pflichtangaben fehlen“: Button „Speichern“ disabled; Hinweis nennt fehlende Angaben („Bild ‚Hier hinstellen‘“, „Bild ‚Hierhin zielen‘“, „Name“, „Smoke oder Molly“, „Landepunkt“).
    - „Antippen der Karte setzt den Landepunkt und rastet ein“: Klick auf Formular-Radar bei Position entsprechend 44.5/63.5 % → Marker `style.left === "44%"` (Jungle 44/63).
    - „Speichern legt an und zeigt danach das Lineup“: alles ausgefüllt, `saveSpot` gibt Spot zurück → Hash `#/mirage/t/<neue id>`, Überschrift = Name; `saveSpot` mit `"create"` und beiden Blobs aufgerufen.
    - „401 beim Speichern löscht den PIN und fragt neu, Eingaben bleiben“: `saveSpot` wirft `PinError` → `getPin()` null, Dialog sichtbar, Namensfeld behält Wert.
    - „Netzwerkfehler beim Speichern lässt das Formular stehen“: `saveSpot` wirft `Error` → Text „Speichern fehlgeschlagen – nochmal versuchen“, Felder unverändert.
    - „Bearbeiten nur sichtbar mit gespeichertem PIN“: ohne PIN kein Button „Bearbeiten“ auf `#/mirage/t/t-jungle`; mit `setPin("123456")` sichtbar; Klick → `#/mirage/t/t-jungle/bearbeiten`, Felder vorbefüllt, Speichern ohne neue Bilder erlaubt.
    - „Löschen fragt nach und entfernt den Spot“: Button „Löschen“ → Text `Spot „Jungle“ wirklich löschen?`, „Ja, löschen“ → `deleteSpot(pin,"t-jungle")`, Hash `#/mirage/t`, kein Punkt „Jungle“ mehr.
- [ ] **Step 2:** `npx vitest run` → neue Tests FAIL.
- [ ] **Step 3:** Implementieren. +-Knopf: runder Button unten rechts auf der Karte, `aria-label="Neuer Spot"`. Formular-Radar wie MapScreen (gleiches Bild, gleiche Vergrößerung), Klickposition in % des `.radar-layer` umrechnen und `snapPoint` mit den Spots derselben Map+Seite. Dateiauswahl `<input type="file" accept="image/*">` je Bild, Vorschau per `URL.createObjectURL`. Bilder vor `saveSpot` mit `compressImage`. Kurzname-Feld `maxLength={14}`. Löschen nur im Bearbeiten-Modus. Nach Speichern `upsert`, nach Löschen `remove`.
- [ ] **Step 4:** `npx vitest run`, `npx tsc -b`, `npm run build` grün.
- [ ] **Step 5:** Commit `feat: Spot-Editor mit PIN`.

### Task 5: Bestehende Spots umziehen, eingebaute Daten entfernen (Codex + Nutzer)

**Files:**
- Create: `scripts/migrate.mjs`
- Delete: `src/data/lineups.ts` (MAPS lebt in `maps.ts`, validate in `validate.ts`), `src/assets/lineups/`, `scripts/export-seed.ts`
- Modify: Imports, die noch auf `lineups.ts` zeigen

**Interfaces:**
- Consumes: HTTP-Schnittstelle (Task 2). `scripts/seed/spots.json` und `scripts/seed/images/` (Task 3).

- [ ] **Step 1:** `scripts/migrate.mjs` (Node 22, nur eingebaute Module + fetch/FormData/Blob): fragt den PIN per `readline` ab (verdeckt nicht nötig), liest `spots.json`, für jeden Spot `action=create` mit festgelegter `id`. Die Function muss dafür bei `create` eine mitgegebene `id` übernehmen, wenn sie dem Muster `^[a-z0-9-]{3,60}$` entspricht und noch nicht existiert (Test in `tests/function-logic.test.ts` ergänzen: `validateInput` lässt so eine `id` bei create durch, lehnt `"A B"` ab). Videofelder werden für die Migration als zusätzliche Felder `video_id`, `start_s`, `end_s` mitgeschickt und nur dann übernommen. Spots ohne Bilder (`ct-topmid-molly`, `ct-a-plant-molly`, `ct-ramp-molly` nur aim) werden mit dem Flag `allowMissingImages: true` angelegt (nur von migrate gesetzt, Function erlaubt es nur zusammen mit gültigem PIN). Ausgabe je Spot `ok <id>` / `fehler <id>: <details>`. Bereits vorhandene IDs werden übersprungen (`skip <id>`), damit der Lauf wiederholbar ist.
- [ ] **Step 2 (Claude):** Function neu deployen. **Nutzer** führt in seinem eigenen Terminal `node scripts/migrate.mjs` aus. Erwartet: 22× `ok`. Prüfen: `curl .../rest/v1/spots?select=id` → 22 IDs.
- [ ] **Step 3:** Eingebaute Daten löschen, Imports anpassen. `npx vitest run`, `npx tsc -b`, `npm run build` grün. Build-Ausgabe enthält keine `lineups/*.jpg` mehr.
- [ ] **Step 4:** Commit `chore: eingebaute Spots durch Supabase ersetzt`.

### Task 6: Wach halten, sofortige Updates, README (Claude)

**Files:**
- Create: `.github/workflows/keepalive.yml`, `README.md`
- Modify: `src/main.tsx`, `vite.config.ts`

- [ ] **Step 1:** `keepalive.yml`: `schedule: cron "0 6 */3 * *"` + `workflow_dispatch`. Ein Schritt `curl -fsS "<URL>/rest/v1/spots?select=id&limit=1" -H "apikey: <anon>"` (öffentliche Werte direkt im Workflow).
- [ ] **Step 2:** Sofortiges Update: in `main.tsx` `import { registerSW } from "virtual:pwa-register"; registerSW({ immediate: true });` und in `vite.config.ts` `injectRegister: false`. `src/vite-env.d.ts` um `/// <reference types="vite-plugin-pwa/client" />` ergänzen. Workbox `runtimeCaching`: Requests auf `/storage/v1/object/public/lineups/` mit `CacheFirst`, Cache-Name `lineup-bilder`, max. 200 Einträge.
- [ ] **Step 3:** README: Was die App ist, wo die Daten liegen, PIN ändern (`npx supabase secrets set EDIT_PIN=…`), pausiertes Supabase-Projekt im Dashboard wieder starten, Spots-Backup (`/rest/v1/spots?select=*`).
- [ ] **Step 4:** `npx vitest run`, `npm run build` grün. Commit `chore: Keep-alive, sofortige Updates, README`.

### Task 7: Abschluss

- [ ] **Step 1:** Im Browser durchklicken: Mirage → T → + → PIN → Spot mit zwei Testbildern anlegen → erscheint auf der Karte → bearbeiten (Name ändern, Punkt verschieben) → löschen. Danach ist der Teststand wieder bei 22 Spots.
- [ ] **Step 2:** Abschluss-Review (frischer Reviewer, Review Focus oben).
- [ ] **Step 3:** Nach OK des Nutzers: Tag `v0.4.0`, Push, Deploy-Lauf prüfen, Live-Seite prüfen.
