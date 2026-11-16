# CS2 Lineups – Design (Beta: Mirage)

Stand: 2026-11-16 · Status: vom Nutzer freigegeben (2026-11-16)

## Wozu

Ein Freund des Nutzers spielt CS2 und hat beim Spielen ein iPad neben sich. In der kurzen Zeit zwischen zwei Runden (Freezetime oder Kaufphase) will er schnell nachsehen, wie ein bestimmter Smoke oder Molly geht. Die App muss ihn deshalb in wenigen Tipps ans Ziel bringen. Wie viel Inhalt sie hat, ist dafür weniger wichtig.

## Ziele

- Auf dem iPad in vier Schritten zum Lineup: Seite → Map → Spot → Video.
- Beta mit **einer Map (Mirage)**, **beide Seiten (T und CT)**, **Smokes und Mollys**, etwa 25 Spots.
- Läuft im Browser und lässt sich auf dem iPad als App auf den Homescreen legen.
- Weitere Maps kommen später nur als neue Dateneinträge (Radarbild + Spots) dazu, ohne Umbau.

## Nicht-Ziele (Beta)

- Keine weiteren Maps außer Mirage (andere Maps im Pool ausgegraut als „bald“).
- Keine Flashes oder HE-Granaten.
- Kein Upload, kein Login, kein Server. Inhalte pflegt der Nutzer über Claude im Repo.
- Keine eigenen Screenshots in der Beta (Option für später, siehe unten).
- Kein Eintrag im App-Hub dabvud.github.io, solange der Nutzer das nicht ausdrücklich will.
- Keine Suche, Favoriten oder Filter.

## Anti-Ziele (das wäre ein Fehlschlag, selbst wenn alles technisch funktioniert)

- Er braucht zwischen den Runden mehr als ein paar Sekunden, bis das Video läuft.
- Das Video startet am Anfang statt an der Stelle des Lineups, und er muss selbst spulen.
- Die App wirkt wie eine überladene Datenbank statt wie ein schnelles Nachschlagewerk.

## Rahmenbedingungen

- Hauptgerät: iPad (Safari bzw. als Homescreen-App), vor allem im Querformat. Hochformat muss trotzdem funktionieren.
- Claude kann CS2 nicht spielen. Ob die Lineups wirklich funktionieren, prüft der Freund beim ersten Ausprobieren.
- Inhalte sind eingebettete YouTube-Ausschnitte fremder Ersteller. Es werden keine Bilder oder Videos kopiert, nur eingebettet, mit Link zum Original.
- Für Videos braucht das iPad Internet. Die App selbst (Menüs, Karte) funktioniert auch offline.
- Veröffentlichen: Der Nutzer hat am 2026-11-16 im Voraus freigegeben, das Repo `Dabvud/cs2-lineups` anzulegen und die Beta zu pushen und zu veröffentlichen, **sobald sie lokal läuft und die Tests grün sind**. Weitere Pushes danach wieder nur mit OK.

## Ansätze

| | Ansatz | Abwägung |
|---|---|---|
| **A (gewählt)** | Vite + React + TypeScript als installierbare Web-App (vite-plugin-pwa), GitHub Pages, Deploy per GitHub Actions bei jedem Push | Gleicher Stack und Ablauf wie Impostor und 82-0. Installationshilfe lässt sich übernehmen, lässt sich gut erweitern, Tests mit Vitest. Etwas mehr Einrichtung am Anfang. |
| B | Eine einzelne HTML-Datei ohne Build | Klein und schnell gebaut. Wird mit jeder Map und jedem Extra unübersichtlicher, Installationshilfe und Tests müssten neu geschrieben werden. |
| (verworfen) | Playlist oder Notion-Board statt eigener App | Keine anklickbare Minimap, und genau die will der Nutzer. |

Der Nutzer hat **A** gewählt, weil die App wachsen soll („erstmal als Beta“, „erstmal nur Mirage“) und weil es zu seinen anderen Apps passt.

## Was der Nutzer entschieden hat

### Ablauf und Bildschirme

1. **Seite wählen:** zwei große Flächen, **T** und **CT**.
2. **Map-Pool:** Kacheln der Maps. In der Beta ist nur **Mirage** aktiv, weitere Kacheln sind ausgegraut („bald“).
3. **Spot wählen:** das Radarbild der Map mit **Punkten an den Landestellen** der Granaten (grau = Smoke, orange = Molly). Gezeigt werden nur die Spots der gewählten Seite. Ein Tipp auf einen Punkt öffnet das Lineup.
4. **Lineup:** Name des Spots, eingebetteter YouTube-Ausschnitt, der **direkt an der richtigen Sekunde** startet, darunter optional eine kurze Textzeile (Stand, Ziel, Wurfart) und ein Link zum Originalvideo.

Ab Bildschirm 2 gibt es **immer oben links einen Zurück-Pfeil**.

Entwurf aus dem Gespräch (Mockup): dunkle Oberfläche, T in Orange, CT in Blau wie im Spiel. Der Nutzer hat die Variante mit Minimap-Punkten gewählt und nicht die Liste nach Bereichen.

### Inhalte (Beta, Mirage)

Die Quellen hat der Nutzer bestätigt. Start und Ende kommen aus den Kapitelmarken der Videos, das Ende ist jeweils der Beginn des nächsten Kapitels.

**T-Smokes**: „11 MUST KNOW Smokes For Mirage (2025)“, Tigerr, https://www.youtube.com/watch?v=Q4Dwg9Z0wZ0

| Spot | Bereich | Start | Ende |
|---|---|---|---|
| Mid Window (aus T-Spawn) | Mid | 0:15 | 1:21 |
| Top Connector (aus T-Spawn) | Mid | 1:21 | 1:55 |
| Catwalk/Short (aus T-Spawn) | Mid | 1:55 | 2:21 |
| Mid Cross (aus T-Spawn) | Mid | 2:21 | 2:37 |
| Mid Window (von Top Mid) | Mid | 2:37 | 3:38 |
| Catwalk/Short (für B) | B | 3:38 | 4:16 |
| Market Window | B | 4:16 | 4:50 |
| Market Door | B | 4:50 | 5:35 |
| Ticket/CT | A | 5:35 | 6:11 |
| Jungle | A | 6:11 | 6:43 |
| Stairs | A | 6:43 | 8:10 |

Zwei Spots heißen „Mid Window“ und landen an derselben Stelle, werden aber von verschiedenen Positionen geworfen. Dasselbe gilt für „Catwalk“. Mehrere Lineups mit derselben Landestelle siehe „Dem Bauenden überlassen“.

**T-Mollys**: „Mirage Utility You MUST KNOW in UNDER 10 Minutes!“, https://www.youtube.com/watch?v=SGeV9W39X68

| Spot | Bereich | Start | Ende |
|---|---|---|---|
| Firebox | A | 2:02 | 2:19 |
| Window (von Top Mid) | Mid | 5:43 | 6:12 |
| Balcony | B | 7:32 | 7:59 |
| Bench | B | 7:59 | 8:34 |

**CT-Smokes und CT-Mollys**: „The ONLY CS2 MIRAGE NADES GUIDE You'll EVER NEED“, https://www.youtube.com/watch?v=xPCYPKFG44E, Abschnitt „CT nades“

| Spot | Typ | Bereich | Start | Ende |
|---|---|---|---|---|
| Window | Smoke | Mid | 13:16 | 13:41 |
| Top Mid | Molly | Mid | 13:41 | 13:58 |
| Bottom Connector | Smoke | Mid | 14:42 | 15:22 |
| Ramp | Molly | A | 15:22 | 15:31 |
| Ramp | Smoke | A | 15:31 | 15:39 |
| Palace (von Market) | Smoke | A | 16:12 | 16:28 |
| A defensiv | Smoke | A | 16:28 | 16:45 |
| A gegen den Plant | Molly | A | 16:45 | 17:10 |
| B Aps | Smoke | B | 17:21 | 17:28 |
| B defensiv | Smoke | B | 17:54 | 18:43 |

Geprüft am 2026-11-16: Alle drei Videos erlauben Einbettung (`playableInEmbed: true`).

Hinweis: Zwei der drei Videos stammen aus 2025. Falls Mirage seitdem geändert wurde, können einzelne Lineups falsch sein. Dann wird das Video ausgetauscht.

### Karte

Als Karte dient das offizielle Radarbild von Mirage aus CS2, wie es auch Fan-Seiten verwenden. Woher das Bild stammt, wird im Repo vermerkt. Die Punkte setzt Claude nach bestem Wissen auf die Landestellen. Bei einigen CT-Spots (z. B. „A defensiv“) ist die genaue Stelle geschätzt.

**Claudes Entscheidung (Ergebnis der Prüfung):**
- Jeder Punkt bekommt ein **kurzes Namensschild** (z. B. „Jungle“). So findet er auch einen leicht falsch gesetzten Punkt, ohne dass eine Liste nötig ist.
- Korrigiert wird **ohne Bearbeitungsmodus in der App**. Der Freund sagt dem Nutzer, was nicht stimmt („Jungle liegt weiter links“, „A defensiv landet bei Stairs“), und Claude ändert die Daten. Einen Modus zum Verschieben von Punkten gibt es erst, wenn das häufig vorkommt.

### Ort und Veröffentlichung

- Projekt: `Desktop\Meine Programme\cs2-lineups`, git, Branch `main`, Remote `github.com/Dabvud/<repo>`.
- Live unter `https://dabvud.github.io/<repo>/`, Deploy per GitHub Actions wie bei Impostor (`.github/workflows/deploy.yml`).
- Installationshilfe für den Homescreen: `?installieren` aus Impostor übernehmen (`src/components/InstallInstructions.tsx`, `src/screens/InstallScreen.tsx`).

## Dem Bauenden überlassen

- **Datenformat:** Eine Datei mit Maps und Spots. Pro Spot mindestens: eindeutige `id`, `map`, `side` (T/CT), `type` (smoke/molly), `name`, `area`, Landepunkt `x`/`y` in Prozent des Radarbilds, `videoId`, `start` und `end` in Sekunden, optional `text`. Pro Map: `id`, Name, Radarbild, `active`.
- **Gleiche Landestelle, mehrere Lineups:** Ein Punkt mit kleiner Auswahl der Varianten (z. B. „aus T-Spawn“ / „von Top Mid“) oder leicht versetzte Punkte. Hauptsache, beide sind mit einem Tipp erreichbar.
- **Video-Einbettung:** `youtube-nocookie.com/embed/<id>?start=…&end=…&playsinline=1`. Auf iOS startet ein Video mit Ton nicht von selbst. Ob das Video stumm automatisch startet oder einen großen Play-Knopf bekommt, entscheidet der Bauende nach Test auf dem iPad. Das Ziel: so wenige Tipps wie möglich.
- **Textzeile:** nur dort, wo ein Guide eindeutig dasselbe Lineup beschreibt. Sonst bleibt sie leer, statt geraten zu werden.
- **Offline:** App-Hülle und Radarbild offline verfügbar. Ohne Internet bekommt die Lineup-Seite einen Hinweis („Für Videos brauchst du Internet“).
- **Navigation:** Der Zustand steht in der URL (z. B. Hash), damit die Wischgeste zurück auf dem iPad und Neuladen funktionieren.
- **Arbeitstitel:** „CS2 Lineups“ bzw. Repo `cs2-lineups`, bis der Nutzer einen Namen nennt.
- **Tests:** Ein Datentest prüft, dass jede `id` eindeutig ist, `x`/`y` zwischen 0 und 100 liegen, `start` < `end`, jede `map` existiert und jede `side`/jeder `type` gültig ist. Dazu ein Rendertest für den Ablauf Seite → Map → Spot → Lineup.

## Später (nicht Beta)

- Weitere Maps (Inferno, Dust2 …) als Dateneinträge.
- Eigene Screenshots („wo stehen“, „wohin zielen“) vom Freund (F12 in CS2), vom Nutzer an Claude geschickt und ins Repo übernommen. Ein Upload direkt in der App ginge nur mit Online-Speicher und Login und ist bewusst zurückgestellt.
- Eintrag im App-Hub.
