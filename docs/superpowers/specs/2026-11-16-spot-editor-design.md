# CS2 Lineups – Spot-Editor (Design)

Stand: 2026-11-16 · Status: vom Nutzer freigegeben (2026-11-16)
Baut auf: `2026-11-16-cs2-lineups-design.md` (v0.3.0 live, Ablauf Map → T/CT → Radar → Lineup)

## Wozu

Bisher pflegt nur Claude die Lineups (Daten und Bilder liegen fest im Code, jede Änderung heißt neu bauen und hochladen). Der Kollege des Nutzers soll **selbst** Spots anlegen, bearbeiten und löschen, ohne Nutzer und ohne Claude. Typischer Fall: Er macht in CS2 mit F12 zwei Screenshots, lädt sie hoch, benennt den Spot, fertig.

## Ziele

- Auf der Radar-Karte (Map → T/CT) gibt es einen **+**-Knopf. Darüber legt er einen neuen Spot an:
  - **Bild „Hier hinstellen“** und **Bild „Hierhin zielen“** hochladen
  - **Name** eingeben
  - **Smoke oder Molly** wählen
  - **auf der Karte antippen, wo die Granate landet** (setzt den Punkt)
  - optional eine Zeile **Wurfanleitung** (z. B. „Jumpthrow“)
- Bestehende Spots **bearbeiten** (alle Felder, Bilder austauschen, Punkt neu setzen) und **löschen**.
- Änderungen sind **sofort für alle** sichtbar, die die App öffnen (iPad des Kollegen, Handy des Nutzers usw.).
- Die **22 bestehenden Spots** ziehen einmalig in den Online-Speicher um und sind danach genauso bearbeitbar.
- Hochladen funktioniert **vom iPad und vom PC** (F12-Screenshots liegen auf dem PC).

## Nicht-Ziele

- Kein Login mit Konten, keine Rechte pro Person, kein Änderungsverlauf.
- Kein Anlegen neuer Maps über den Editor (neue Maps bleiben Claude-Arbeit).
- Kein Video-Feld im Editor (bestehende Video-Links bleiben erhalten, neue Spots haben keinen).
- Kein gleichzeitiges Bearbeiten mit Konfliktlösung. Wer zuletzt speichert, gewinnt.

## Anti-Ziele

- Jemand mit dem öffentlichen Link kann Spots löschen oder Müll hochladen.
- Das Nachschlagen zwischen den Runden wird langsamer oder umständlicher als heute.
- Ohne Internet ist die App plötzlich leer.

## Rahmenbedingungen

- Statische App auf GitHub Pages bleibt. Neu dazu kommt **Supabase** (kostenloser Plan): Postgres-Tabelle für Spots, Storage-Bucket für Bilder, eine Edge Function für alle Schreibzugriffe.
- **Konto:** Das Supabase-Konto legt der Nutzer selbst an. Claude legt keine Konten an und gibt keine Passwörter ein. Für Einrichtung und Deploy meldet der Nutzer die Supabase-CLI selbst an (`! npx supabase login`), danach kann Claude per CLI Tabellen, Bucket und Function einrichten.
- **PIN:** Der Nutzer legt den PIN fest und setzt ihn selbst als Secret (`EDIT_PIN`) in Supabase. Er steht nie im Repo und nie im App-Code.
- Pushes zu GitHub nur mit OK des Nutzers.

## Ansätze

| | Ansatz | Abwägung |
|---|---|---|
| **A (gewählt)** | Supabase: Tabelle + Bild-Bucket, Lesen öffentlich, Schreiben nur über eine Edge Function mit PIN-Prüfung | Wenigste Einzelteile, PIN-Prüfung sauber auf dem Server, kostenlos, übersichtliches Dashboard |
| B | Cloudflare Worker + R2 + D1 | Kann dasselbe, aber mehr Einzelteile und unübersichtlicher für den Nutzer |
| C | Firebase | Auf echte Logins ausgelegt, PIN-Schutz wird umständlich |

**Schutz:** Der Nutzer hat **gemeinsamen PIN** statt echtem Login gewählt (einfacher für den Kollegen). Damit der PIN etwas schützt, wird er **auf dem Server** geprüft (Edge Function), nicht in der App. Die Datenbank erlaubt anonym nur Lesen.

## Was entschieden ist

### Bedienung

- **+**-Knopf auf der Radar-Karte (Map → T/CT), gut erreichbar, z. B. unten rechts. Die Seite (T/CT) und die Map ergeben sich aus der aktuellen Karte.
- **PIN-Abfrage** beim ersten Tipp auf **+** oder **Bearbeiten**. Danach merkt sich das Gerät den PIN (localStorage), bis er falsch wird (Server lehnt ab) → dann erneut fragen.
- Auf der **Lineup-Seite** ein Knopf **„Bearbeiten“**, aber nur sichtbar, wenn auf diesem Gerät schon ein PIN eingegeben wurde. So bleibt die Seite für normale Nutzer aufgeräumt.
- **Formular** (Anlegen und Bearbeiten gleich):
  1. Zwei Bildfelder „Hier hinstellen“ / „Hierhin zielen“ mit Vorschau (Datei wählen; am iPad auch Fotos-Mediathek), beim Anlegen Pflicht
  2. Name (Pflicht), darunter optional „Kurzname auf der Karte“
  3. Smoke / Molly (Pflicht, zwei Knöpfe)
  4. Karte: Antippen setzt den Landepunkt, erneutes Antippen verschiebt ihn (Pflicht)
  5. Wurfanleitung (optional, eine Zeile)
  6. **Speichern**. Beim Bearbeiten zusätzlich **Löschen** mit Rückfrage („Spot ‚Jungle‘ wirklich löschen?“)
- Pflichtfelder fehlen → Speichern gesperrt mit Hinweis, was fehlt. Beim Bearbeiten dürfen die Bilder bleiben, wie sie sind.

### Bilder

- Vor dem Hochladen in der App auf **max. 1280 px Breite, JPEG ~80 %** verkleinern (Canvas). Ein F12-Screenshot (1920×1080 PNG, mehrere MB) wird so etwa 150–250 KB.
- Nur Bilddateien annehmen (JPEG/PNG/WebP), Obergrenze nach dem Verkleinern 1 MB.

### Daten und Server

- Tabelle `spots`: `id` (text, eindeutig), `map`, `side` (`t`/`ct`), `type` (`smoke`/`molly`), `name`, `label` (Schild auf der Karte, Standard = `name`), `x`, `y` (0–100), `stand_path`, `aim_path` (Pfade im Bucket, optional), `text` (optional), `video_id`, `start`, `end` (optional, nur alte Spots), `updated_at`.
- Bucket `lineups`: öffentlich lesbar, Schreiben nur per Service-Role (also nur über die Function).
- Row Level Security: anonym nur `select`. Kein anonymes `insert/update/delete`.
- Edge Function `spots` (POST): nimmt `pin`, `action` (`create`/`update`/`delete`), Spot-Felder und optional zwei Bilder. Prüft den PIN gegen `EDIT_PIN`, prüft die Felder (gleiche Regeln wie `validate` heute: Map existiert und ist aktiv, Seite/Typ gültig, x/y 0–100, Name nicht leer), lädt Bilder hoch, schreibt die Zeile. Beim Löschen auch die Bilder löschen. Beim Ersetzen eines Bilds das alte löschen.
- **PIN-Schutz gegen Ausprobieren:** PIN mindestens 6 Ziffern. Bei falschem PIN antwortet die Function erst nach ~1 s.
- **Umzug:** Ein einmaliges Skript lädt die 22 bestehenden Spots samt Bildern hoch (gleiche IDs, Texte, Koordinaten, Video-Felder). Danach werden `ROWS`/`TEXTS` und `src/assets/lineups/` aus der App entfernt.

### App

- Die App lädt beim Start die Spots aus Supabase (öffentliche URL + anon key, nur Lesen) und **speichert den zuletzt geladenen Stand** auf dem Gerät. Ohne Internet zeigt sie diesen Stand. Bilder werden beim Ansehen im Browser-Cache bzw. per Service-Worker-Laufzeit-Cache gehalten.
- Während des ersten Ladens ohne gespeicherten Stand: kurzer Ladehinweis. Fehler beim Laden ohne gespeicherten Stand: Hinweis „Keine Verbindung – Spots konnten nicht geladen werden“ mit „Nochmal versuchen“.
- Neue Version der App wird sofort aktiv (Service Worker übernimmt ohne zweites Öffnen), damit Änderungen am Editor nicht hängen bleiben (Nutzer hatte nach v0.2.0 noch die alte Version mit Werbung).

### Claudes Entscheidungen nach der Prüfung

- **Supabase pausiert kostenlose Projekte nach etwa einer Woche ohne Aktivität.** Dagegen läuft ein **GitHub-Actions-Cron alle 3 Tage**, der die Spots einmal liest (öffentliche URL + anon key, also kein Geheimnis nötig). Sollte das Projekt trotzdem pausieren, steht in der README, wie man es im Dashboard wieder einschaltet.
- **Beim Anlegen sind beide Bilder Pflicht**, denn genau darum geht es. Beim Bearbeiten lassen sich Bilder nur ersetzen, nicht entfernen. Die zwei alten Spots ohne Bilder (`ct-topmid-molly`, `ct-a-plant-molly`) zeigen weiter Text und Video-Link.
- **Kurzname fürs Schild:** optionales Feld „Kurzname auf der Karte“ im Formular (max. 14 Zeichen). Ist es leer, nimmt die App den Namen, auf der Karte auf 14 Zeichen gekürzt. Ändert man den Namen eines alten Spots, bleibt sein Kurzname, bis man ihn selbst ändert.
- **Punkt einrasten:** Tippt man beim Setzen des Landepunkts sehr nah an einen bestehenden Punkt derselben Seite (≤ 2 % Abstand), übernimmt der neue Spot genau dessen Koordinaten. So entsteht ein gemeinsamer Punkt mit Auswahl statt zwei überlappender.
- Das Feld `area` entfällt (wird nirgends angezeigt). Die Video-Felder sind für neue Spots optional.
- Der PIN wird **gleich bei der Eingabe** gegen den Server geprüft (eigene Aktion `check`), nicht erst beim Speichern.

## Dem Bauenden überlassen

- Aussehen von Formular, PIN-Dialog und +-Knopf (im Stil der App: dunkel, große Tippflächen).
- Ob das Formular eine eigene Seite (`#/mirage/t/neu`, `#/mirage/t/<id>/bearbeiten`) oder ein Overlay ist. Eigene Hash-Seiten sind wegen Zurück-Pfeil/Wischgeste vorzuziehen.
- Wie neue IDs entstehen (z. B. `<side>-<kurzname>-<zufall>`).
- Wie die Function die Bilder empfängt (multipart oder base64), solange iPad-Safari und PC-Browser funktionieren.
- Tests: Formular-Validierung, PIN-Fluss (falscher PIN → erneut fragen), Laden mit/ohne gespeicherten Stand, Edge-Function-Logik (PIN, Validierung) als Unit-Tests ohne echten Server.

## Später (nicht jetzt)

- Weitere Maps freischalten (Claude).
- Mehr Schutz (echter Login), falls der PIN die Runde macht.
