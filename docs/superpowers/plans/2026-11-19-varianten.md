# Lineup-Varianten Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Varianten am selben Landepunkt sichtbar machen (Zahl im Kreis), per Bildkacheln wählen und auf der Lineup-Seite direkt wechseln.

**Architecture:** Nur Darstellung. `groupByLanding` in `MapScreen.tsx` bleibt die einzige Gruppierlogik und wird exportiert; `LineupScreen` bekommt die Geschwister von `App.tsx` gereicht.

**Tech Stack:** React + TypeScript, Vite, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-19-varianten-design.md`

## Global Constraints
- Keine Änderung an Datenbank, Edge Function, Editor.
- Bestehende Tests bleiben grün (`npm test`), Build läuft (`npm run build`).
- Texte deutsch; Typnamen „Smoke“/„Molly“ wie `TYPE_NAME`.

## Review Focus
- Ramp (CT): Smoke und Molly am selben Punkt → Kacheln zeigen den Typ, sonst sind beide „Ramp“ nicht zu unterscheiden. Test in Task 1.
- Variante ohne Standbild (ct-ramp-molly hat nur Zielbild) → Kachel nimmt Zielbild. Test in Task 1.
- Wechsel per „Andere Variante“ darf keinen Verlaufseintrag anlegen: einmal „Zurück“ = Karte. Test in Task 2.
- Spot ohne Geschwister: kein Wechsel-Knopf. Test in Task 2.

---

### Task 1: Zahl im Kreis + Bildkacheln im Auswahlfenster

**Files:**
- Modify: `src/screens/MapScreen.tsx`, `src/styles.css` (`.dot`, `.chooser*`)
- Test: `tests/App.test.tsx`

**Interfaces:**
- Produces: `export function groupByLanding(spots: Spot[]): Spot[][]` (bisher intern, unverändert).

- [ ] **Step 1: Tests schreiben**
  - „zeigt die Anzahl der Varianten im Kreis“: auf `#/mirage/t` hat der Button „Window“ Text „2“; Button „Jungle“ enthält keine Ziffer.
  - Bilder: die Seed-Fixture hat für Window/Ramp keine Bilder → in diesem Test `seedCache`/`stubFetch` mit einer Kopie von `FIXTURE` aufrufen, in der `t-window-spawn`/`t-window-top` `stand`+`aim` und `ct-ramp-molly` nur `aim` (`https://x/…jpg`) hat.
  - „zeigt Varianten als Bildkacheln mit Typ“: Window antippen → Dialog „Lineup wählen“ enthält Überschrift „2 Varianten“ und je Kachel ein `img`; auf `#/mirage/ct` „Ramp“ antippen → Kacheln „Ramp Smoke“ und „Ramp Molly“ existieren, die Molly-Kachel zeigt das Zielbild.
  - Bestehender Test „bietet bei gleicher Landestelle eine Auswahl an“ bleibt unverändert grün (Kachel-Name = `${name} ${Typ}`).
- [ ] **Step 2:** `npx vitest run tests/App.test.tsx` → neue Tests FAIL.
- [ ] **Step 3: Umsetzen**
  - Im Punkt: `<span className={g.length > 1 ? "dot count" : "dot"}>{g.length > 1 ? g.length : null}</span>`; `aria-label` bleibt die Beschriftung.
  - Dialog: `<h2>` mit Beschriftung + `<small>N Varianten</small>`, Kacheln in `.chooser-tiles` mit Klasse `cols-2|cols-3` (3 → `cols-3`, sonst `cols-2`); Kachel = `button` mit `aria-label={`${s.name} ${TYPE_NAME[s.type]}`}`, Bild `s.stand ?? s.aim` (nur wenn vorhanden), Name, Typ, `s.text`; darunter Knopf „Abbrechen“.
  - CSS: `.dot.count` 24px, Ziffer zentriert, dunkle Schrift; Kacheln wie im Entwurf (16:9-Bild, `min-width: 0`), Dialogbreite `min(640px, 100%)`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: Varianten-Zahl im Kreis und Bildkacheln`

### Task 2: „Andere Variante“ auf der Lineup-Seite

**Files:**
- Modify: `src/screens/LineupScreen.tsx`, `src/App.tsx` (case `"spot"`), `src/styles.css`
- Test: `tests/App.test.tsx`

**Interfaces:**
- Consumes: `groupByLanding` aus Task 1.
- Produces: `LineupScreen` Props `siblings?: Spot[]`, `onSwitch?: (id: string) => void`.

- [ ] **Step 1: Tests schreiben**
  - „wechselt direkt zur anderen Variante“: `#/mirage/t` → Window → „Mid Window (aus T-Spawn) Smoke“ → Knopf „⇄ Andere Variante: Mid Window (von Top Mid)“ → Überschrift „Mid Window (von Top Mid)“; einmal „Zurück“ → `getByTestId("radar")` sichtbar.
  - „zeigt ohne Varianten keinen Wechsel“: Jungle-Spot → kein Button mit Name `/Andere Variante/`.
- [ ] **Step 2:** `npx vitest run tests/App.test.tsx` → FAIL.
- [ ] **Step 3: Umsetzen**
  - `App.tsx`: Geschwister = die Gruppe aus `groupByLanding(spots.filter(gleiche Map+Seite))`, die den Spot enthält, ohne ihn selbst; `onSwitch={(id) => go({ ...route, spot: id }, true)}`.
  - `LineupScreen`: unter Text/Quelle je Geschwister `<button className="switch-variant">⇄ Andere Variante: {s.name}</button>`.
- [ ] **Step 4:** `npm test && npm run build` → PASS.
- [ ] **Step 5: Commit** `feat: Wechsel zwischen Varianten auf der Lineup-Seite`
