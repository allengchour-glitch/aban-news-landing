# Fitness- und Smart-Armbänder standen bei Google unter «Schmuck > Bracelets» (09.10.2026, «weiter»)

## Gemessen

Bei der Typ-Korrektur der Uhren am Nachmittag (`GRUPPENSTEMPEL-TYP-2026-10-09.md`) fiel auf: 26 Fitness-Armbänder mit Typ
«Elektronik» stehen bei Google unter «Apparel & Accessories > Jewelry > Bracelets». Beispiele sind «C33 Smart-Armband mit
Körperfett-Messung», «G69 Armband für Herzfrequenz & Blutsauerstoff» und «Pulsmesser Dual-Modus Armband».

**Warum `uhren_fein.py` sie nie sah:** Es liest nur Produkte, die bei Google schon im Zweig «Jewelry > Watches» stehen. Ein
Fitness-Armband, das gleich zu Beginn unter «Bracelets» einsortiert wurde, kommt dort nie vorbei.

**Ganzer Bracelets-Zweig:** 1'122 aktive Produkte. Fast alle sind echter Schmuck, z. B. Naturstein-, Silber- und
Zirkonia-Armbänder.

## Getan

`uhren_fein.py` hat jetzt einen **zweiten Durchgang über «Bracelets»** (`UHREN-FEIN-ARMBAND`). Die Regel dort ist
eingeschränkt:
- Erlaubt sind nur diese Ziele: Smartwatch (Shopify aa-6-12), Uhrenarmband (aa-6-10-1) und Uhrenzubehör (aa-6-10).
- **Nie «Watches» aus der Uhrwort-Regel.** Dort trifft «quar[zt]» jedes Rosenquarz-Armband und «automatik» jede
  Automatik-Schliesse.
- Für das Ziel Smartwatch braucht der Titel ein echtes Mess- oder Smart-Wort (smart, Puls, Herzfrequenz, Schrittzähler,
  Display, GPS …). Grund: Die Watches-Regel kennt «Sportarmband mit». Im Bracelets-Zweig traf das «Verstellbares
  Sportarmband mit Botschaft», also ein Spruchband. Das fiel im Trockenlauf auf.

**Kanarien:** 14/14 im Armband-Zweig, 39/39 in der Uhrenregel.
- Bleiben unverändert: Rosenquarz, Automatik-Schliesse, geflochtenes Lederarmband, Tigerauge, Antistatik, Magnetarmband,
  Spruchband.
- Werden umsortiert: Smart-Armband, Pulsmesser, GPS-SOS-Armband, «Lederarmband für Apple Watch».

**Live:** 18 umsortiert, 0 Fehler, Stichprobe von 8 zurückgelesen: 8/8 richtig.
- 17 nach «Jewelry > Watches» / Shopify Smart Watches (aa-6-12).
- 1 nach «Watch Bands» («Zirkon-Armband für Redmi Watch»).

**Wächter:** Der tägliche Aufruf in `fixer_keepalive.sh` (`uhren_fein.py` ohne Schalter) läuft jetzt über beide Zweige.
Neuimporte, die als «Bracelets» ankommen, werden am nächsten Morgen umsortiert. Mit `--nur-armband` läuft nur der zweite
Durchgang.

## Nachtrag 19:00 UTC: Ladegeräte im Watches-Zweig

13 Produkte im Watches-Zweig enthalten ein Lade- oder Halterungswort. Zwei Fehler in der Regel:
- **Ladegeräte wurden zu Smartwatches.** Die Zubehör-Regel kannte Charger, Powerbank und Ladestation nicht. Deshalb wurden
  «Weisser Magnet-Charger für Smartwatches», «Smartwatch-Ladestation» und «Kabellose Powerbank für Smartwatches» als
  Smartwatch eingeordnet.
- **Smartwatches blieben grobe «Watches».** Das Ausschlusswort «wireless charging» hielt «Smartwatch mit … Wireless Charging»
  dort fest.

Beides ist behoben, und die Kanarien sind von 39 auf 46 gestiegen, alle 46/46 bestanden. **Live 5/0.**

Bleibt unverändert und wird nur gemeldet: «3-in-1 Magnethalterung für iPhone, Apple Watch & AirPods» und «3-in-1 Ladestation
mit Uhr». Beides sind Mehrgeräte-Halter; ihre Einordnung (Elektronik > Power) gehört nicht in die Uhrenregel.

## Offen

- **Smart Ring:** Steht unter «Rings». Google hat keine passende Klasse.

## Lehre

**Ein Feinlauf, der nur seinen eigenen Zweig liest, findet falsch einsortierte Ware im Nachbarzweig nie.**
- Wer eine Klasse «fein» macht, braucht einen zweiten Blick auf die Nachbarzweige.
- Dort gilt eine **eingeschränkte** Regel: Eine Uhrwort-Regel, die im eigenen Zweig harmlos ist (Quarz, Automatik,
  Sportarmband mit …), richtet im Nachbarzweig Schaden an.
