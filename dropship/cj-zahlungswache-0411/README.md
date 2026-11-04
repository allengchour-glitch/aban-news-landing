# CJ-Bestellungen anlegen und Zahlungswache (04.11.2026)

Auslöser: Besitzer «1034 bestellung push sofort», «bezahlt. muss es invalid order haben?», «sag wen ich zahlen muss».

## Bestellung #1034 (bei CJ angelegt, vom Besitzer bezahlt)
`LX1034` = CJ `SD2611041605470652000`, Ware $22.97 + CJPacket Ordinary VIP $42.65 = $65.62, Verkaufspreis CHF 158.44 (Marge CHF 104.93). CJ-Status nach der Zahlung: `UNSHIPPED`. Weg: die **unveränderte** Engine `automation/cj_order_engine.py` aus dem Branch `claude/luxestyle-status-tztnn1` (sie liegt nur dort, mit `cj_takt.py`, `cj_sku.py`, `betreiber_push.py`).

## Engine holen und aufrufen
```bash
S=<Arbeitsordner>; mkdir -p $S/repo/dropship
git fetch origin claude/luxestyle-status-tztnn1
git archive origin/claude/luxestyle-status-tztnn1 automation/cj_order_engine.py automation/cj_takt.py automation/cj_sku.py automation/betreiber_push.py | tar -x -C $S/repo
git show origin/claude/luxestyle-status-tztnn1:dropship/_cj_orders_done.txt > $S/repo/dropship/_cj_orders_done.txt   # Ledger, im Branch seit 24.10. nicht gepflegt
cp dropship/cj-zahlungswache-0411/{lauf_alle.py,lauf_einzeln_1034.py,zahlung_offen.mjs} $S/
cd $S/repo && REPO=$S/repo python3 automation/cj_order_engine.py --selbsttest        # offline, muss «SELBSTTEST OK» melden
cd $S && DRY=1 CLOUD_WARTE_MIN=15 python3 lauf_alle.py                                # rechnet nur
cd $S && CLOUD_WARTE_MIN=15 python3 lauf_alle.py                                      # legt bezahlbereit an (bezahlt nichts)
```
Zugang: CJ-Token in `/tmp/_cjtok` (galt am 04.11. noch bis ca. 14.11., sonst per `CJ_EMAIL`/`CJ_API_KEY` erneuern, höchstens alle 5 Minuten), Shopify-Token per Client-Credentials in `/tmp/cj_shop_token.txt` (24 h).

## Zeitliche Trennung Server/Cloud
Die Engine legt auf dem Hetzner-Server sofort an, in der Cloud erst nach `CLOUD_WARTE_MIN` (Vorgabe 45) Minuten. **Der Server legt seit dem 24.10. nichts mehr an** (letztes Server-Ledger 24.10., Takt-Bericht 16.10.; #1029, #1030, #1032 kamen aus Cloud-Sitzungen). Darum ist `CLOUD_WARTE_MIN=0` bzw. 15 gefahrlos, solange das so bleibt; die Engine liest die CJ-Liste direkt vor `createOrderV2` noch einmal und prüft nach der Anlage auf Doppel. Läuft der Server wieder, wieder 45 min lassen.

## Leere «Invalid Orders»-Hüllen sind normal
CJs Shopify-Verbindung legt zu jeder Shopify-Bestellung einen leeren Auftrag `#10xx` an (Status `CREATED`, Betrag «---», nicht bezahlbar, in der CJ-App unter «Invalid Orders»). Unser Dauerzustand seit August (12 Stück am 04.11.). Nichts bezahlen, nichts löschen. Die echten Aufträge heissen `LX10xx`.

## Zahlungswache
`zahlung_offen.mjs` (nur Lesen) meldet «NICHTS OFFEN» oder je angelegtem, unbezahltem `LX…`-Auftrag Nummer, CJ-Nummer, Betrag. Stündlicher Lauf als geplante Aufgabe der laufenden Sitzung (`CJ-Zahlungswache (stündlich)`): neue bezahlte Bestellung mit CJ-Artikeln → Trockenlauf, bei plausibler Marge und ohne Warnung anlegen → melden (Push + Chat). **Bezahlt wird nie automatisch** (CJs `payBalance` nimmt die Auftrags-IDs nicht an, und Guthaben lädt nur der Besitzer). Grenze: läuft nur, solange die Sitzung offen ist; unabhängig davon wäre ein ntfy-Thema (`NTFY_TOPIC` für `betreiber_push.py`) oder der wieder angeschaltete Server nötig.

`lauf_einzeln_1034.py` ist der Wrapper, der nur #1034 anlegte (überschreibt `offene_bestellungen` der Engine; die Engine selbst bleibt unverändert).
