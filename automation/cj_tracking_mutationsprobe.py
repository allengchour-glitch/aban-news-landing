#!/usr/bin/env python3
"""Mutationsprobe für die CJ-Rückmeldung: jede Änderung an automation/lib/cj_tracking.mjs oder automation/cj_tracking.mjs muss
automation/cj_tracking_test.mjs rot machen. Aufruf (im Repo-Wurzelordner): python3 -I automation/cj_tracking_mutationsprobe.py [.]
Arbeitet nur in einem Temp-Baum (schreibt nichts ins Repo). Vorab: die unveränderte Kopie muss grün sein, sonst gälte jeder Mutant als «erkannt».
Ein Muster, das nicht genau einmal vorkommt, wird als «nicht anwendbar» gemeldet (Exit 1): nach jeder Code-Änderung auf «?» achten."""
import os, shutil, subprocess, sys, tempfile

repo = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
aut = os.path.join(repo, 'automation')
DATEIEN = ['cj_tracking_test.mjs', 'cj_tracking.mjs', 'lib/cj_tracking.mjs', 'lib/shopify_secret.mjs', 'lib/cj_token.mjs', 'lib/cj_fetch.mjs', 'lib/cj_response.mjs', 'lib/printful_tracking.mjs']
quelle = {f: open(os.path.join(aut, f), encoding='utf-8').read() for f in DATEIEN}

LIB, RUN = 'lib/cj_tracking.mjs', 'cj_tracking.mjs'
# (Name, Datei, altes Stück, neues Stück)
M = [
    ('L01 Bestellnummer schon ab einer Ziffer', LIB, r"/^#?(\d{3,})$/", r"/^#?(\d{1,})$/"),
    ('L02 CJ-SKU an beliebiger Stelle', LIB, "/^CJ/i.test(String(sku", "/CJ/i.test(String(sku"),
    ('L03 CJ-SKU nur gross geschrieben', LIB, "/^CJ/i.test(String(sku", "/^CJ/.test(String(sku"),
    ('L04 17track-Link ohne Endanker', LIB, "#nums=[A-Za-z0-9]+$/.test(u)", "#nums=[A-Za-z0-9]+/.test(u)"),
    ('L05 17track-Link bleibt englisch', LIB, "'$1de$2'", "'$1en$2'"),
    ('L06 eigener 17track-Link englisch', LIB, "`https://t.17track.net/de#nums=${n}`", "`https://t.17track.net/en#nums=${n}`"),
    ('L07 Schwelle «CJ-Auftrag fehlt» 48 statt 24 h', LIB, "{ cjFehlt: 24,", "{ cjFehlt: 48,"),
    ('L08 Schwelle «unbezahlt» 12 statt 24 h', LIB, "cjUnbezahlt: 24", "cjUnbezahlt: 12"),
    ('L09 Schwelle «hängt» 8 statt 7 Tage', LIB, "cjHaengt: 7 * 24", "cjHaengt: 8 * 24"),
    ('L10 Schwelle «ohne Nummer» 24 statt 48 h', LIB, "ohneNummer: 48 }", "ohneNummer: 24 }"),
    ('L11 Kundenmail auch nach Zustellung', LIB, "const notify = status !== 'DELIVERED';", "const notify = true;"),
    ('L12 Stückzahl-Vergleich entfällt', LIB, "if (cjE !== shopE)", "if (false)"),
    ('L13 fehlende Stückzahl bei CJ wird übergangen', LIB, "if (cjE == null || !Number.isFinite(cjE))", "if (false)"),
    ('L14 schon bekannte Nummer wird doppelt gemeldet', LIB, "if (bekannt.has(norm(nummer))) { out.wartet", "if (false) { out.wartet"),
    ('L15 bei mehreren leeren Lieferungen wird geraten', LIB, "&& ohneNummer.length === 1) {", "&& ohneNummer.length >= 1) {"),
    ('L16 mehrere leere Lieferungen ohne Befund', LIB, "&& ohneNummer.length > 1) {", "&& ohneNummer.length > 99) {"),
    ('L17 «TRASH» gilt nicht als storniert', LIB, "'CLOSED', 'TRASH']", "'CLOSED']"),
    ('L18 Status nicht gross geschrieben', LIB, ".trim().toUpperCase();\n\n  // 2.", ".trim();\n\n  // 2."),
    ('L19 abgeschlossene Bestellung gilt nie als fertig', LIB, "out.fertig = true; // nichts mehr offen", "out.fertig = false; // nichts mehr offen"),
    ('L20 nicht meldbare Positionen ohne Befund', LIB, "if (pausiert > 0) {\n    out.befund", "if (false) {\n    out.befund"),
    ('L21 «CJ-Auftrag fehlt» erst nach 10-facher Frist', LIB, "alterShop >= SCHWELLEN_STUNDEN.cjFehlt)", "alterShop >= SCHWELLEN_STUNDEN.cjFehlt * 10)"),
    ('L22 Menge der Position immer 1', LIB, "quantity: z.remaining }))", "quantity: 1 }))"),
    ('L23 Standort der Position fehlt', LIB, "ortId: z.ortId || null,", "ortId: null,"),
    ('L24 stornierte Lieferungen zählen mit', LIB, ".filter((l) => l && !['CANCELLED', 'ERROR', 'FAILURE'].includes(l.status))", ".filter((l) => l)"),
    ('L25 Nummern werden nicht normalisiert verglichen', LIB, ".map(norm).filter(Boolean));\n  const ohneNummer", ".filter(Boolean));\n  const ohneNummer"),
    ('L26 Bestellname ohne Nummer wird nicht abgefangen', LIB, "if (!lx) { out.wartet", "if (false) { out.wartet"),
    ('L27 «alles gemeldet» ohne CJ-Auftrag wird nicht erkannt', LIB, "if (!hatOffene && ohneNummer.length === 0) { out.fertig = true; return out; }", "if (false) { out.fertig = true; return out; }"),
    ('L28 storniert ohne offene Positionen gilt als Befund', LIB, "if (hatOffene) return befund('cj-storniert'", "if (true) return befund('cj-storniert'"),
    ('L29 unbekannter Status wird wie «versendet» behandelt', LIB, "if (!CJ_VERSENDET.has(status)) return befund('cj-status-unbekannt'", "if (false) return befund('cj-status-unbekannt'"),
    ('L30 «hängt» erst nach 100-facher Frist', LIB, "h >= SCHWELLEN_STUNDEN.cjHaengt)", "h >= SCHWELLEN_STUNDEN.cjHaengt * 100)"),
    ('L31 «unbezahlt» erst nach 100-facher Frist', LIB, "h >= SCHWELLEN_STUNDEN.cjUnbezahlt)", "h >= SCHWELLEN_STUNDEN.cjUnbezahlt * 100)"),
    ('L32 «ohne Nummer» erst nach 100-facher Frist', LIB, "h >= SCHWELLEN_STUNDEN.ohneNummer)", "h >= SCHWELLEN_STUNDEN.ohneNummer * 100)"),
    ('L33 CJ-Link wird ungeprüft übernommen', LIB, "const url = trackingUrl(cj.trackingUrl, nummer);", "const url = cj.trackingUrl;"),
    ('L34 Firma wird nicht übersetzt', LIB, "const firma = trackingFirma(cj.logisticName);", "const firma = String(cj.logisticName);"),
    ('L35 Nachtragen auch bei schon bekannter Nummer', LIB, "} else if (!bekannt.has(norm(nummer)) && ohneNummer.length === 1) {", "} else if (ohneNummer.length === 1) {"),
    ('R01 Vorgabe scharf statt Trockenlauf', RUN, "const LIVE = AUS.includes(", "const LIVE = !AUS.includes("),
    ('R02 Kundenmail-Schalter auch im Trockenlauf an', RUN, "const MAILEN = LIVE && !AUS.includes(", "const MAILEN = !AUS.includes("),
    ('R03 jede Standort-Gruppe mailt', RUN, "notifyCustomer: i === 0 && notify,", "notifyCustomer: notify,"),
    ('R04 fulfillmentCreate wird wiederholt', RUN, "versandPruefung('fulfillmentCreate'), false);", "versandPruefung('fulfillmentCreate'), true);"),
    ('R05 Nachtragen wird wiederholt', RUN, "versandPruefung('fulfillmentTrackingInfoUpdate'), false);", "versandPruefung('fulfillmentTrackingInfoUpdate'), true);"),
    ('R06 kein Tag cj-shipped', RUN, "await tagsHinzu(tok, o, ['cj-shipped']);", "/* kein Tag */"),
    ('R07 cj-shipped trotz Befund (GLEICHWERTIG: planCj liefert nie fertig UND Befund, die Zusatzabfrage ist eine zweite Sicherung)', RUN, "if (plan.fertig && tagsOk !== false && !plan.befund) {", "if (plan.fertig && tagsOk !== false) {"),
    ('R08 derselbe Befund wird jedes Mal neu gemeldet', RUN, "if (tags.includes(artTag)) return true; // diese Art schon gemeldet", "// kein Schutz"),
    ('R09 nicht zugestellter Alarm bleibt unbemerkt', RUN, "if (ok === false) { fehler.push(", "if (false) { fehler.push("),
    ('R10 NUR wird ignoriert', RUN, "if (NUR.size && !NUR.has(o.name)) return false;", ""),
    ('R11 stornierte Bestellungen werden bearbeitet', RUN, "if (o.cancelledAt) return false;", ""),
    ('R12 Bestellungen ohne CJ-Position werden bearbeitet', RUN, "if (s.cjLinien === 0) { zaehler.uebersprungen++; return false; }", ""),
    ('R13 Positionen an Fulfillment-Services werden gemeldet', RUN, "if (ort && ort.isFulfillmentService) continue;", ""),
    ('R14 geschlossene Fulfillment-Orders zählen', RUN, "if (fo.status === 'CLOSED' || fo.status === 'CANCELLED') continue;", ""),
    ('R15 Berechtigung der Fulfillment-Order wird nicht geprüft', RUN, "const darfMelden = offen && (fo.supportedActions || []).some((a) => a && a.action === 'CREATE_FULFILLMENT');", "const darfMelden = true;"),
    ('R16 falsche API-Version', RUN, "const API = '2026-01';", "const API = '2025-01';"),
    ('R17 offene Bestellungen ohne Ausschluss von cj-shipped', RUN, "(fulfillment_status:unfulfilled OR fulfillment_status:partial) -tag:cj-shipped created_at", "(fulfillment_status:unfulfilled OR fulfillment_status:partial) created_at"),
    ('R18 auch unbezahlte Bestellungen', RUN, "const qOffen = `financial_status:paid (fulfillment_status", "const qOffen = `(fulfillment_status"),
    ('R19 25 Bestellungen je Seite', RUN, "const SEITE = 10;", "const SEITE = 25;"),
    ('R20 nicht lesbares CJ-Detail wird verschwiegen', RUN, "fehler.push(`${o.name}: CJ-Auftrag ${shop.lx} nicht lesbar (${e.message})`); return;", "return;"),
    ('R21 nicht lesbare CJ-Liste: der Lauf geht mit leerer Liste weiter', RUN, "fehler.push('CJ-Aufträge lesen: ' + e.message); await ende('CJ-Rückmeldung abgebrochen: CJ-Aufträge nicht lesbar.'); return; }", "fehler.push('CJ-Aufträge lesen: ' + e.message); }"),
    ('R22 CJ-Aufrufe ohne Zugangsmarke', RUN, "headers: { 'CJ-Access-Token': cjTok }", "headers: {}"),
    ('R23 mehr als 25 Positionen werden nicht erkannt', RUN, "li.pageInfo && li.pageInfo.hasNextPage ? null : cjLinien", "cjLinien"),
    ('R24 Link fehlt in der Versandmeldung', RUN, "...(a.url ? { url: a.url } : {}),", ""),
    ('R25 technischer Fehler ohne Exit 1', RUN, ".join('\\n')}`); process.exit(1); }", ".join('\\n')}`); }"),
    ('R26 Ausgang unbekannt wird als «abgelehnt» gemeldet', RUN, "unbekannt: !(e && e.endgueltig)", "unbekannt: false"),
    ('R27 Trockenlauf-Marke fehlt in der Zusammenfassung', RUN, "${DRY ? '[DRY] ' : ''}${was}, ${a.firma}", "${was}, ${a.firma}"),
    ('R28 hängender Seitencursor wird nicht erkannt', RUN, "if (!next || next === after || neu === 0) break;", "if (!next) break;"),
    ('R29 fehlende CJ-Zugangsdaten werden nicht geprüft', RUN, "if (!CJ_EMAIL || !CJ_KEY || (!ADMIN_TOKEN && !(CID && CSEC))) {", "if ((!ADMIN_TOKEN && !(CID && CSEC))) {"),
    ('R30 vollständig gemeldete Bestellungen werden erneut gelesen', RUN, "if (!offen && !ohneNummer) { zaehler.uebersprungen++; return false; }", ""),
    ('R31 Telegram-Alarm erst nach dem Tag (kein Tag bei Ausfall)', RUN, "const hinzu = await tagsHinzu(tok, o, ['cj-problem', artTag]);", "const hinzu = { ok: true };"),
    ('R32 alte Problem-Tags bleiben stehen', RUN, "if (alt.length) await tagsWeg(tok, o, alt);", ""),
    ('R33 Problem-Tags verschwinden nie', RUN, "if (!befund) { if (vorhanden.length) return (await tagsWeg(tok, o, vorhanden)).ok; return true; }", "if (!befund) return true;"),
    ('R34 Anmeldung des Shop-Zugangs wird nicht geprüft', RUN, "if (!tok) { console.error('❌ Keine funktionierende Shopify-Auth.');", "if (false) { console.error('❌ Keine funktionierende Shopify-Auth.');"),
    ('R35 Zeitlimit wird nicht geprüft', RUN, "if (Date.now() - START > RUN_LIMIT_MS) { fehler.push(`Zeitlimit", "if (false) { fehler.push(`Zeitlimit"),
]


def lauf(ersatz=None):
    d = tempfile.mkdtemp(prefix='mutcj_')
    try:
        for f in DATEIEN:
            ziel = os.path.join(d, 'automation', f)
            os.makedirs(os.path.dirname(ziel), exist_ok=True)
            open(ziel, 'w', encoding='utf-8').write((ersatz or {}).get(f, quelle[f]))
        p = subprocess.run(['node', os.path.join(d, 'automation', 'cj_tracking_test.mjs')], capture_output=True, text=True, timeout=240)
        return p.returncode, p.stdout + p.stderr
    except subprocess.TimeoutExpired:
        return 99, 'Zeitüberschreitung'
    finally:
        shutil.rmtree(d, ignore_errors=True)


rc, out = lauf()
print('Ausgangslage:', 'grün' if rc == 0 else 'ROT (Probe ungültig!)', '|', (out.strip().splitlines() or [''])[-1])
if rc != 0:
    print(out[-1500:]); sys.exit(2)
erkannt = 0; nicht_anwendbar = 0; durchgerutscht = []; gleichwertig = []
for name, datei, alt, neu in M:
    n = quelle[datei].count(alt)
    if n != 1:
        print(f'  ?  {name}: Muster kommt {n}x vor (nicht anwendbar)'); nicht_anwendbar += 1; continue
    rc, out = lauf({datei: quelle[datei].replace(alt, neu, 1)})
    if rc != 0:
        erkannt += 1; print(f'  ok {name}')
    elif 'GLEICHWERTIG' in name:
        gleichwertig.append(name); print(f'  =  {name}: überlebt (erwartet)')
    else:
        durchgerutscht.append(name); print(f'  !! {name}: DURCHGERUTSCHT')
print(f'\n{erkannt} von {len(M)} erkannt, {len(gleichwertig)} gleichwertig, {nicht_anwendbar} nicht anwendbar, {len(durchgerutscht)} durchgerutscht')
sys.exit(1 if durchgerutscht or nicht_anwendbar else 0)
