# FORTURA AG — CH-Dropship-Lieferant (LIVE seit 2026-07-23)

**Status: FEED ERREICHBAR + IMPORT LÄUFT.** Kuratierter Dauer-Import in eigene Collections (User-Entscheid
2026-07-23 «kuratiert + eigene Kollektionen»).

## 🔓 DURCHBRUCH 2026-07-23: Feed-Zugang über Port 443
Cloud-Umgebung blockt FTP-21 (Timeout) + Synology-:5001 (Connection reset). ABER
`https://webtransfer.fortura.ch/` auf **Standard-443** (nginx vor der RackStation) liefert die
**SYNO.FileStation-API** → Login + Download klappt. Tool: `automation/fortura_fetch_feed.sh`
(lädt `/home/Art_DataFeed.CSV` = 19.8k Zeilen, 10.3k lagernd + Artikelstruktur.xlsx).

## Feed-Schema (verifiziert am echten Feed)
- Delimiter `|`, Encoding **cp1252** (Umlaute!), 66 Spalten, CRLF.
- **Preise BELEGT:** `VP1` = Netto-EK (99% VP1<VP2), `VP2` = `Nettopreis inkl` = **UVP** (84% identisch).
- Titel: `ArtikelTitelDE` (Fallback `Bez1DE`) + `GrösseDE`. Zusatz/Lieferumfang → Beschreibung.
- Bestand: `Lagerbestand Total` → tracked+DENY+Menge (**ghost-sale-sicher**).
- `Internet_VE` >1 = Bündel-Verkauf. `Status`/`Liquidation` sekundär (Sellability = Bestand>0).

## Import-Regeln (automation/fortura_import.mjs)
- Preis-Anker = **UVP (VP2)**, NIE unter EK+DPD(9.50)+Marge(6). Kein 2.2×-Überschuss (würde über UVP preisen).
- **Kleinticket-Filter MIN_VK=14.90**: Einzelartikel unter 14.90 tragen CHF 9.50 DPD nicht → skip (BigBuy-Lektion 15b).
- `FT_FILTER` (Kategorie/Thema-Regex) + `FT_TAGS` (Collection-Tags) für gezielte Batches.
- Dubletten-/Bild-Wache, cat_tags, Umlaut-Norm.

## Dauerbetrieb (automation/fortura_runner.sh — läuft detached)
Zieht Feed täglich frisch, importiert kuratiert nach Marken-Wert in eigene Collections:
1. 🧸 Spielzeug (BRUDER/Qualiplüsch) 2. 🎃 Halloween 3. 🎭 Kostüme & Fasnacht
4. 🎉 Party & Deko (+Schweiz) 5. 🎄 Weihnachten. Idempotent über `dropship/_fortura_done.txt`.
Neustart-Rezept: `setsid bash automation/fortura_runner.sh >/tmp/fortura_runner.log 2>&1 </dev/null &`

## LIVE
- 5 Smart-Collections angelegt+publiziert (Kostüme/Spielzeug/Halloween/Party-Deko/Weihnachten).
- 11 Swiss/1.-August-Artikel live (Edelweisshemd 58.-, Schwingerhose, Fahne Schweiz…) → `erste-august`-Collection.
- BRUDER-Spielzeug-Batch läuft (601 Artikel: Case IH, JCB, John Deere, MAN — Bestand bis 443).

## 🔴 BESTAND WAR EINGEFROREN (2026-08-14) — Abgleich gebaut, Lauf blockiert
Der Bestand von 4'179 aktiven Fortura-Varianten (2'524 Produkte) stand live noch auf dem Wert vom
**23./24.07.** (3'927 + 164 Varianten; nur 88 wurden am 05./06.08. von anderer Hand berührt). Kein
einziger Artikel stand auf 0 — nach drei Wochen bei einem Party-Grosshändler unmöglich. Ursache:
`fortura_import_grouped.mjs` schreibt `inventoryQuantities` nur im `productSet` beim Anlegen und
überspringt danach jedes Produkt im Ledger; ein Aktualisierungspfad existierte nirgends.
**Neu: `automation/fortura_bestand_sync.mjs`** (Feed→Shop über SKU `fortura-<ArtNr>`, tracked+DENY,
`inventorySetQuantities` mit `compareQuantity`, Plausibilitätsbremse, Journal mit Flush je Zeile),
fest eingehängt in `fortura_runner.sh` direkt nach dem Feed-Download.
**⛔ Konnte nicht scharf laufen: `/tmp/fortura_env.sh` ist beim Container-Wipe verloren gegangen**
(FTP-User/Passwort, Kundennr 544341). `webtransfer.fortura.ch` antwortet (HTTP 200), nur der Login
fehlt. Ohne Feed wird NICHTS geschrieben und NICHTS geschätzt — das Skript endet mit Code 2.
**Der Betreiber muss FORTURA_FTP_USER + FORTURA_FTP_PW einmal als Umgebungsvariablen in den
Claude-Einstellungen hinterlegen** (überlebt Neustarts, `/tmp` nicht — das ist bereits der dritte
Verlust dieser Art). Danach genügt: `bash automation/fortura_fetch_feed.sh && /opt/node22/bin/node
automation/fortura_bestand_sync.mjs`.

## OFFEN
- [ ] XML-Bestell-Anbindung (Opacc.ORDERS nach `/home/ORDERS`, DESADV-Rücklauf aus `/home/DESADV`)
      für Auto-Fulfillment. Bis dahin: bei Fortura-Verkauf manuell im Fortura-Portal bestellen.
- Kundennr 544341, Creds in /tmp/fortura_env.sh (600, NICHT im Repo). Setup CHF 200 gutgeschrieben,
  DPD 9.50/Paket, netto 10 Tage, Kreditlimit 2000. ⚠️ Logistikfee ab 2027 (Info Aug 2026).
