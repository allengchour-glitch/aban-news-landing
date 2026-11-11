# Sternenlicht-Projektor: Codex' Video (R176) einplanbar machen (11.11.2026)

**Anlass:** Codex hat am 11.11. ein Video zum Sternenlicht-Projektor als vier Metricool-Entwürfe abgelegt (Instagram und Facebook Mo 16.11. 19:00, TikTok Di 17.11. 19:00, YouTube-Short Do 19.11. 19:00; Bericht R176 im Handoff-Zweig). Die tägliche Freigabe (`automation/metricool_freigabe.py`) hielt alle vier: das Produkt stand nicht in der Wegweiser-Sammlung, und der TikTok-Text nannte das Produkt nicht.

## Was geprüft wurde (GEMESSEN 11.11. 09:35 bis 09:42 UTC)

- **Video** (18 s, 1080 × 1920, 25 Bilder je Sekunde, 5,5 MB, aus Metricool geladen, Einzelbilder gesichtet): keine Preise, keine Personen, keine Fremdmarken, keine Lieferangaben. Schwäche: Querformat-Quelle mit unscharfem Rand, viel dunkle Fläche (so steht es auch in Codex' eigener Gegenprüfung).
- **Produkt** `sternenlicht-projektor-fur-schlafzimmer-732544`: ACTIVE, im Onlineshop, 7 Varianten kaufbar (CHF 34.90 bis 51.90), kein Sperr-Tag.
- **Texte:** keine Preise, keine Lieferzeiten, kein Versprechen. Der Text verweist auf «die gewünschte Ausführung».

## Was geändert wurde (LIVE, zurückgelesen)

1. **Wegweiser:** Produkt in `aus-tiktok-und-instagram` aufgenommen (09:39 UTC, 26 → 27 Produkte). Werkzeug `wegweiser_aufnehmen.mjs` (Trockenlauf Vorgabe; nimmt nur ACTIVE, veröffentlichte, kaufbare Produkte ohne Sperr-Tag; Merkdatei `aufgenommen.json`). Rücknahme: `HANDLES=sternenlicht-projektor-fur-schlafzimmer-732544 ZURUECK=1 LIVE=1 node dropship/sternenlicht-1111/wegweiser_aufnehmen.mjs`.
2. **TikTok-Entwurf** (uuid `3614365779669041576`): nur der Text. Alt: «Eigenwerbung für LuxeStyle. Licht im Detail. Die gewünschte Ausführung findest du über den Link im Profil.» Neu: «Licht im Detail: der Sternenlicht-Projektor für Schlafzimmer. Welche Ausführung welche Scheiben mitbringt, steht beim Artikel. / Shop: luxestyle.ch/tt». Gründe: die Freigabe erkannte das Produkt nicht, TikTok hat keinen Profil-Link, die Kennzeichnung «Eigenwerbung» steht im Feld `commercialContentOwnBrand`. Bleibt Entwurf; Termin, Medium und Kennzeichnung unverändert; neue Beitrags-ID `424194999` (Metricool vergibt bei jedem Update eine neue). Werkzeug `tiktok_text.py`.

**Trockenlauf der Freigabe danach (09:40 UTC):** alle vier Entwürfe bestehen die Tore. Der Tageslauf (05:41 UTC) plant sie ein. **Stopp:** die uuids in `dropship/METRICOOL-HALTEN.txt` eintragen (Instagram `4156060813550767248`, Facebook `6680239273933357186`, TikTok `3614365779669041576`, YouTube `-7647174116509334899`).

## Vorbereitet, noch NICHT live: verständliche Modellnamen

Die Auswahl heisst nur «A» bis «G». Zuordnung laut CJ-Datenblatt (pid `1477820492730732544`, Feld «Light color», gelesen 11.11. 09:40 UTC) und laut den Variantenbildern (gesichtet):

| Wert | neu |
|---|---|
| A | A · Grundmodell |
| B | B · mit 6 Motivscheiben |
| C | C · Galaxie-Scheibe + 6 Motivscheiben |
| D | D · Akku, Bluetooth, 6 Motivscheiben |
| E | E · Akku, Bluetooth, Galaxie-Scheibe + 6 Motivscheiben |
| F | F · Spieluhr mit Akku, 6 Sternenlicht-Scheiben |
| G | G · drehend, Galaxie-Scheibe + 3 Farbscheiben |

Werkzeug `modell_namen.mjs` (Trockenlauf Vorgabe; prüft vor dem Schreiben, dass jede Variante die SKU ihres Buchstabens trägt; ändert nur die Namen der Optionswerte; Sicherung `sicherung_modell.json`; Rücknahme `ZURUECK=1 LIVE=1`). **Der Live-Lauf wurde am 11.11. vom Berechtigungssystem der Sitzung abgelehnt und nicht umgangen:** er braucht das ausdrückliche Ja des Besitzers. Das Video zeigt eine Galaxie-Projektion; eine Galaxie-Scheibe liegt laut Datenblatt nur den Modellen C, E und G bei.

## Ungemessen

Ob Instagram, Facebook, TikTok und YouTube das Video annehmen; Wirkung auf Besuche und Käufe; die Angaben des Datenblatts selbst (Lieferantenangabe, kein Muster geprüft).
