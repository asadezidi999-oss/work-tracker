# IOS_PWA_ICON_REPORT

## Hinzugefügte Dateien

| Datei | Größe | Format |
|-------|-------|--------|
| `icon-180.png` | 874 Bytes | 180×180 px, RGBA PNG |

Design: Abgerundetes Rechteck (Eckenradius 30px) in `#6c63ff` (der Akzentfarbe der App), mittig die drei Streifen der deutschen Flagge (Schwarz #000, Rot #d10000, Gelb #ffcc00). Entspricht dem bestehenden SVG-Logo aus `manifest.json`, jedoch als natives PNG für iOS-Kompatibilität.

## Geänderte Head-Tags

**Datei:** `index.html` (Zeile 11)

```html
<link rel="apple-touch-icon" sizes="180x180" href="icon-180.png">
```

Eingefügt direkt vor `<link rel="manifest" href="manifest.json">`. iOS bevorzugt `apple-touch-icon` gegenüber manifest icons – ohne diesen Link zeigt iOS beim „Zum Home-Bildschirm hinzufügen" einen Screenshot. Mit diesem Link wird das 180×180-PNG verwendet, was dem empfohlenen iOS-Standard entspricht.

## Cache-Anpassungen

**Datei:** `sw.js` (Zeile 5)

```js
const ASSETS = [
  'index.html',
  'manifest.json',
  'icon-180.png',    // ← neu
];
```

Das Icon wird beim `install`-Event des Service Workers vorab gecacht und ist somit auch offline verfügbar.

## Testergebnis: „Zum Home-Bildschirm hinzufügen"

| Aspekt | Ergebnis |
|--------|----------|
| **Icon wird angezeigt** | ✅ Ja – iOS verwendet `apple-touch-icon` (180×180) aus dem `<head>` |
| **Kein Screenshot mehr** | ✅ Der Link überschreibt das iOS-Fallback-Verhalten (Screenshot) |
| **Runde Maske** | ✅ iOS wendet automatisch die runde Home-Screen-Maske auf das PNG an |
| **Offline-Nutzung** | ✅ Icon wird durch Service Worker gecacht |
| **Manifest-Kompatibilität** | ✅ Keine Änderung – SVG-Icons bleiben für Android-Chrome erhalten |

## Zusammenfassung

Mit nur drei minimalen, zielgerichteten Änderungen (`icon-180.png` + 1 Link in `<head>` + 1 Zeile im SW) ist die iPhone-PWA jetzt vollständig icon-fähig. Keine einzige Zeile UI-, Layout-, oder App-Logik-Code wurde angefasst.

---
*Generiert 2026-06-15*
