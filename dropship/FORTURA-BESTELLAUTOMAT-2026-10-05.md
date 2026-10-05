# Fortura-Bestellautomat (05.10.2026, Betreiber «jeder kauf muss auch automatisch auslösen bei fortuna»)

## Gemessen
- Fortura-Verkauf = Handbestellung im Fortura-Portal; die Bestell-Ampel zeigte eine reine Fortura-Bestellung als «KEIN CJ-Auftrag ⚠️».
- Fortura-Server (webtransfer.fortura.ch, SYNO-FileStation über 443, Feed-Zugang): `/home/ORDERS` (leer, 2019), `/home/DESADV` (leer, 2024).
- Musterdateien Opacc.ORDERS/DELVRY am 22.07. erbeten (Gmail), nie erhalten → Format unbekannt.
- SKU `fortura-<ArtNr>` = Fortura-ArtNr (am Feed geprüft: `90654-2` = «Kostüm Hippie Frau Grösse M», EAN 8003558065424).

## Getan (Stufe 1)
- `automation/fortura_bestell_engine.py`: bezahlte, offene Bestellungen seit 01.10. mit `fortura-*`-Positionen → Paket (ArtNr, EAN, Menge,
  Lieferadresse; Adresse nur /tmp 600) + Ledger `dropship/_fortura_bestellungen.tsv` (ohne Personendaten) + Zeile
  «⚠️ FORTURA: #nr bereit — im Fortura-Portal bestellen: ArtNr×Menge» bis `--bestellt <nr> [Fortura-Auftragsnr]`.
- Wächter: stündlich in `engine_keepalive.sh` direkt nach der Bestell-Ampel (Zeile nur bei Arbeit).
- `bestell_ampel.py`: reine Fortura-Bestellung → «Fortura: bereit/bestellt» statt «KEIN CJ-Auftrag».
- Kanarienvogel: #9999 (Fortura 90654-2×2 + CJ) erkannt, nur Fortura-Position im Paket; #9998 (nur CJ) ignoriert; `--bestellt` quittiert.
- Gmail-Entwurf an rpapini@fortura.ch (cc info@): Muster ORDERS + DESADV, neutraler Versand, Annahmeschluss, Testbestellung.

## Offen
- Betreiber: Entwurf senden (am besten von info@luxestyle.ch).
- Stufe 2 nach Muster: XML bauen → `SYNO.FileStation.Upload` nach /home/ORDERS; DESADV lesen → Fulfillment + Tracking in Shopify.
