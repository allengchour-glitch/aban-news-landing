# Produktkategorie (Taxonomie) — Stand 2026-09-29T12:32Z

Aktive gescannt: 174 · ohne Kategorie: 174 · heute gesetzt: 157 (SCHARF, CAP 3000) · danach offen: 17 · Fehler: 0

Grund: Der Shop-Kanal (App «Shop») zeigt nur Produkte mit Kategorie — 33'863 «nicht auffindbar» am 23.09. Die Importer setzen
productType, keine Taxonomie. Regel: productType → Taxonomie-ID (Tabelle im Skript, IDs beim Start verifiziert).

## Unbekannte Typen (nicht geraten — Tabelle ergänzen)

- Trend-Produkt: 9
- Trend-Gadget: 7
- Kinder: 1

## Beispiele (heute gesetzt)

- kreative-nachrichtentafel-953728 · Trend-Gadget → Home & Garden > Decor
- halsmassager-168064 · Trend-Gadget → Health & Beauty > Personal Care > Massage & Relaxation > Massagers
- ems-thermal-halsheber-mit-mikrostrom-015680 · Trend-Gadget → Health & Beauty > Personal Care > Massage & Relaxation > Massagers
- ruckenmassagegerat-10-magnetpunkte-96-nadeln-779520 · Trend-Gadget → Health & Beauty > Personal Care > Massage & Relaxation > Massagers
- elektrische-fussfeile-mit-massagefunktion-0d3665 · Trend-Gadget → Health & Beauty > Personal Care > Foot Care


## Nachtrag 29.09.2026 12:32 UTC — dritte Titelwelle (Verbesserungsrunde)
GEMESSEN: 174 aktive ohne Taxonomie-Kategorie, alle Sammeltypen (Trend-Gadget 109, Trend-Produkt 60, Selbst gestalten 4, Kinder 1).
Titel waren eindeutig, die Regeln verpassten Komposita und Transliterationen («Automatikuhr», «Sommermütze», «Faltenhundebett»,
«Kuechenreibe», «Glättbürste», «Perlenkette», «Hemden»). «Selbst gestalten» war kein Sammeltyp → Titelregeln griffen nie.
GETAN: 35 Regeln HINTER allen bestehenden (ändert keine alte Zuordnung), 12 neue Taxonomie-IDs per `taxonomy` gemessen
(Massagers, Posture Correctors, Shapewear, Mobile Phone Cases, Screen Protectors, Essential Oils, Perfumes, Hammocks, Door Mats …).
Trockenlauf je Titel gelesen; geratene Regeln wieder entfernt («Versteckte Leckereien», «Wandklettergerät», «Diamant-Tropfen»),
Fussfeile vor Massage. Kanarienvögel: Schlüsselring/Trainingsring/Beissring bleiben ohne Schmuck-Zuordnung.
ERGEBNIS: 157 gesetzt, 0 Fehler, unabhängig zurückgelesen 157/174; 17 bleiben offen (nicht geraten: Kristall-Set, Regentonne,
Innenraum-Bürsten, Gel-Pads …). Wächter: `kategorie_wache.py` täglich im Aufseher, Ampel «KATEGORIE: n».
