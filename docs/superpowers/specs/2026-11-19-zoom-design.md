# Zoom beim Gedrückthalten – Design (kurz)

**Warum:** Auf den Bildern „Hier hinstellen“ / „Hierhin zielen“ sind Details (Kanten, Fadenkreuz) am iPad klein. Der Nutzer will sie schnell größer sehen, ohne die Seite zu verlassen.

**Abgenommen am 2026-11-19** anhand des klickbaren Entwurfs (claude.ai Artifact „Lineup-Lupe Entwurf“, Version 3). Verworfen: runde Lupe über dem Finger, großes Kästchen in der Bildschirmmitte.

## Verhalten
- Finger ~250 ms auf einem der beiden Bilder halten → das Bild bleibt an Platz und Größe, der Inhalt wird 2,5-fach um die Fingerstelle vergrößert (Ränder abgeschnitten).
- Finger verschieben → Zoom-Mittelpunkt folgt; die Seite scrollt dabei nicht.
- Loslassen → normales Bild.
- Bewegt sich der Finger vor Ablauf der 250 ms mehr als 10 px → kein Zoom (normales Scrollen/Tippen).
- iOS-Bildmenü („Bild sichern“) beim langen Drücken ist abgeschaltet.

## Ansätze
1. **CSS-`transform: scale` mit `transform-origin` am Finger, im Rahmen mit `overflow: hidden` (gewählt):** kein zweites Bild, flüssig.
2. Hintergrundbild mit `background-position`: mehr Rechnerei, kein Vorteil.
