# Lineup-Varianten am selben Spot – Design (kurz)

**Warum:** Auf Mirage (und anderen Maps) gibt es Smokes/Mollys, die an derselben Stelle landen, aber anders geworfen werden (z. B. Mid Window aus T-Spawn / von Top Mid). Der Nutzer will zwischen den Varianten schnell und visuell wählen – am iPad zwischen den Runden.

**Abgenommen am 2026-11-19** anhand des klickbaren Entwurfs (claude.ai Artifact „Lineup-Varianten Entwurf“).

## Was sich ändert
- **Karte:** Ein Punkt mit 2+ Varianten zeigt die Anzahl als Zahl *im* Kreis (Kreis etwas größer). Punkte mit nur einem Lineup bleiben wie heute.
- **Auswahlfenster:** Ersetzt die heutige Textliste. Kacheln nebeneinander, je Variante: Standbild („Hier hinstellen“, sonst Zielbild, sonst nichts), Name, Typ, Kurzanleitung. 2 → zwei Spalten (links/rechts), 3 → drei Spalten, 4+ → zwei Spalten im Raster. Überschrift = Punktbeschriftung + „N Varianten“. Tippen auf den Hintergrund oder „Abbrechen“ schließt.
- **Lineup-Seite:** Hat der Spot Geschwister am selben Punkt, erscheint unten „⇄ Andere Variante: <Name>“ (bei 3+ eine Zeile je Geschwister). Der Wechsel ersetzt den Verlaufseintrag, „Zurück“ führt weiter direkt zur Karte.

## Nicht geändert
- Gruppierung wie heute nach exakt gleichen Koordinaten; der Editor rastet neue Spots bereits im Umkreis von 2 % auf bestehende ein (`src/editor/snap.ts`) – damit entstehen Varianten.
- Datenbank, Edge Function, Editor.

## Ansätze
1. **Nur Darstellung ändern (gewählt):** Gruppierung bleibt, nur Kreis, Auswahlfenster und Lineup-Seite ändern sich. Kein Schema-Umbau.
2. Eigenes Feld „Variante von“ in der Datenbank: expliziter, aber Migration, Editor-Umbau, und die Einrast-Logik macht es schon überflüssig.
