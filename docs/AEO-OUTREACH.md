# 🎯 AEO-Service — Verkaufs-Playbook & Outreach-Vorlagen

> Wandelt die fertige KI-Sichtbarkeits-Infrastruktur in zahlende Kunden. High-Ticket:
> **1 Kunde = viel Geld, keine Reichweite nötig.** Alle Tools existieren schon — hier ist
> die Verkaufs-Bewegung + fertige Copy (DE, UWG-konform: warm/value-first, keine Massen-Kaltmails).

## Das Angebot (schon gebaut)
| Produkt | Seite | Anker-Preis |
|---|---|---|
| **Einmal-Audit** (KI-Sichtbarkeits-Report) | `ki-audit.html` | €300–900 (Fulfillment via `aeo-report.mjs` in Sekunden) |
| **Monitor** (monatlicher Report) | `ki-sichtbarkeit-monitor.html` | recurring (Checkout live) |
| **Komplett-Paket** (Buch + Monitor + Report) | `ki-sichtbarkeit-paket.html` | Paketpreis (Checkout live) |

## Die Verkaufs-Bewegung (3 Schritte, ~10 Min/Lead)
1. **Lead finden:** `node tools/aeo-prospect-scan.mjs --limit 12`
   → sortiert Firmen nach schlechtestem KI-Score (= heißester Lead, größter Bedarf).
   Eigene Zielliste: `--file meine-firmen.txt` (1 URL/Zeile).
2. **Gratis-Mini-Audit als Türöffner:** `node tools/aeo-report.mjs https://kunde.de > audit.md`
   → fertiger Report (echte Messwerte, keine erfundenen Zahlen). Das verschenkst du als Köder.
3. **Ansprache** (Vorlage unten) mit dem Audit als Anhang → Termin → Monitor/Paket verkaufen.

> ⚠️ **UWG (DACH):** Kalt-Massenmails an Firmen sind heikel. Bevorzuge **warme Kontakte**
> (Netzwerk, Empfehlung, vorher kurz auf LinkedIn verbunden) oder telefonische Erstansprache
> mit anschließender Mail. Der Gratis-Audit macht jede Ansprache legitim & willkommen.

## Vorlage A — Warme E-Mail (mit Gratis-Audit)
**Betreff:** Empfiehlt ChatGPT {Firma}? (kurzer Check, kostenlos)

Hallo {Name},

ich habe getestet, ob KI-Assistenten wie ChatGPT & Gemini {Firma} bei Fragen aus Ihrer
Branche ({Branche}) empfehlen — immer mehr Kund:innen fragen dort zuerst, nicht mehr nur Google.

Das Ergebnis (kurzer Report im Anhang) zeigt {größte Lücke aus dem Scan} — das kostet Sie
potenziell Anfragen. Die gute Nachricht: das lässt sich gezielt verbessern.

Wenn's interessiert, zeige ich Ihnen in 15 Minuten die 3 wichtigsten Hebel. Passt diese Woche?

Beste Grüße, {Du}
— aban news · KI verständlich für Selbstständige

## Vorlage B — LinkedIn-DM (nach Vernetzung)
Hi {Name}, kurze Sache: Ich prüfe für {Branche}-Betriebe, ob ChatGPT/Gemini sie bei
Kundenfragen nennt. Bei {Firma} ist mir {Lücke} aufgefallen. Ich hab einen kurzen,
kostenlosen Report gemacht — soll ich ihn dir schicken? Kein Verkaufsdruck.

## Vorlage C — Follow-up (nach 4–5 Tagen, 1×)
Hallo {Name}, kurzes Nachfassen — der KI-Sichtbarkeits-Report für {Firma} liegt bereit.
Soll ich ihn dir schicken oder ist das Thema gerade nicht dran? Beides völlig okay.

## Branchen-Hooks (für „{Branche}" + Personalisierung)
Eigene Landingpage pro Segment vorhanden (`ki-sichtbarkeit-<branche>.html`) — als Beleg/Link mitschicken:
architekten · bäckereien · coaches · elektriker · fitnessstudios · fotografen · friseure ·
gastronomie · handwerk · hotels · immobilienmakler · kanzleien · kfz-werkstätten · kosmetikstudios ·
maler · optiker · physiotherapie · praxen · steuerberatung · tierarztpraxen · zahnärzte

## Ehrlich (Marken-Regel)
- Nur echte Messwerte (die Engine misst, erfindet nichts). **Keine Platzierungs-Garantie.**
- Gratis-Audit ist echt nützlich, auch wenn niemand kauft → Reputation statt Spam.
- Ziel: hilfreich auffallen, nicht nerven. Lieber 10 warme als 1000 kalte Kontakte.
