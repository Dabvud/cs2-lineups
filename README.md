# CS2 Lineups

Smokes und Mollys für CS2 – schnell nachschauen zwischen den Runden. Ablauf: Map → T/CT → Punkt auf dem Radar → Bilder „Hier hinstellen“ / „Hierhin zielen“ mit Wurfanleitung.

Live: https://dabvud.github.io/cs2-lineups/ · Auf dem iPad installieren: https://dabvud.github.io/cs2-lineups/?installieren

## Wo die Daten liegen

- **App:** statisch auf GitHub Pages, Deploy bei jedem Push auf `main` (`.github/workflows/deploy.yml`).
- **Spots und Bilder:** Supabase-Projekt `ryvcxbmcsiuvgdehivao` (Region Frankfurt). Tabelle `spots`, Bild-Bucket `lineups`. Lesen ist öffentlich, Schreiben nur über die Edge Function `spots` mit PIN.
- Die App merkt sich auf jedem Gerät den zuletzt geladenen Stand, ohne Internet sieht man also weiter alle Spots.

## Spots pflegen

Auf der Karte unten rechts **+** (neuer Spot), auf einer Lineup-Seite **Bearbeiten** (erscheint, sobald auf dem Gerät einmal der PIN eingegeben wurde). Beim Bearbeiten gibt es auch **Löschen**.

## PIN ändern

In einer eigenen PowerShell im Projektordner (Supabase-CLI muss angemeldet sein: `npx supabase login`):

```
$pin = Read-Host "Neuer PIN"; npx supabase secrets set EDIT_PIN=$pin --project-ref ryvcxbmcsiuvgdehivao
```

Mindestens 6 Ziffern, nur Zahlen. Geräte mit dem alten PIN werden beim nächsten Speichern neu gefragt.

## Supabase ist pausiert

Kostenlose Projekte schlafen nach etwa einer Woche ohne Zugriff ein. Ein GitHub-Job (`.github/workflows/keepalive.yml`) liest deshalb alle 3 Tage einmal die Spots. Falls das Projekt trotzdem pausiert: https://supabase.com/dashboard → Projekt öffnen → **Restore project**.

Achtung: GitHub schaltet geplante Jobs ab, wenn 60 Tage lang nichts im Repo passiert (neue Spots zählen nicht, die liegen in Supabase). Dann unter GitHub → Actions → „Supabase wach halten“ → **Enable workflow** klicken. Solange die App regelmäßig benutzt wird, bleibt Supabase ohnehin wach.

Nach zu vielen falschen PINs (20 in 10 Minuten) sperrt der Server das Bearbeiten für 10 Minuten für alle.

## Backup

Alle Spots als JSON: `https://ryvcxbmcsiuvgdehivao.supabase.co/rest/v1/spots?select=*` (Header `apikey` = anon key aus `src/config.ts`). Die ursprünglichen 22 Spots samt Bildern liegen zusätzlich in `scripts/seed/`; `node scripts/migrate.mjs` spielt sie wieder ein (vorhandene werden übersprungen).

## Entwickeln

```
npm install
npm test
npm run dev
```

Edge Function deployen: `npx supabase functions deploy spots --project-ref ryvcxbmcsiuvgdehivao --use-api`
