#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — das Büro, das nur aus E-Mail besteht.

Erzeugt Offerte und Rechnung als druckfertige Seite plus den passenden Mailtext.
Kein Buchhaltungsprogramm, kein Abo, keine Cloud: eine Datei rein, zwei Dateien raus.

    python3 tools/buero.py offerte  --kunde "Muster GmbH, Bern" --pos "KI-Sichtbarkeits-Audit:490"
    python3 tools/buero.py rechnung --aus 2026-001
    python3 tools/buero.py rechnung --kunde "Muster GmbH" --pos "Beratung 2 h:290" --frist 30
    python3 tools/buero.py liste
    python3 tools/buero.py bezahlt --nr 2026-002

⚠️ SCHWEIZER BESONDERHEITEN, die hier fest eingebaut sind (aus impressum.html belegt):
  · Allen Chour ist NICHT mehrwertsteuerpflichtig (Art. 10 Abs. 2 lit. a MWSTG, Umsatz
    unter CHF 100'000). Eine Rechnung darf deshalb KEINE MWST ausweisen — täte sie es,
    wäre sie falsch ausgestellt und die Steuer geschuldet. Der Hinweis steht stattdessen
    im Fuss jeder Rechnung.
  · Es gibt keine UID-Nummer, also steht auch keine drauf.
  · Rechnungsnummern laufen fortlaufend je Jahr (buero/journal.json). Lücken sind erklärungs-
    bedürftig, darum vergibt das Werkzeug sie und nicht der Mensch.

⚠️ KUNDENDATEN. `buero/` ist in .gitignore — dieses Repo ist öffentlich. Adressen,
   Beträge und die IBAN gehören nicht hinein. Die Zahlungsdaten stehen in
   `buero/konfig.json` (Vorlage: `buero/konfig.example.json`), ebenfalls ungetrackt.
"""
import argparse
import html
import json
import os
import re
import subprocess
import sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUERO = os.path.join(ROOT, "buero")
JOURNAL = os.path.join(BUERO, "journal.json")
KONFIG = os.path.join(BUERO, "konfig.json")

# Absender — aus impressum.html, nicht geraten.
ABSENDER = {
    "name": "aban news · Allen Chour",
    "strasse": "Hühnerhubelstrasse 37",
    "ort": "3123 Belp",
    "land": "Schweiz",
    "mail": "hallo@abannews.com",
    "web": "abannews.com",
}
MWST_HINWEIS = ("Keine Mehrwertsteuer ausgewiesen: nicht MWST-pflichtig nach "
                "Art. 10 Abs. 2 lit. a MWSTG (Jahresumsatz unter CHF 100'000).")


def e(s):
    return html.escape(str(s))


def chf(betrag):
    """1234.5 → 1'234.50 — Schweizer Schreibweise mit Hochkomma."""
    ganz, rest = divmod(round(betrag * 100), 100)
    return f"{ganz:,}".replace(",", "'") + f".{rest:02d}"


def konfig():
    if os.path.exists(KONFIG):
        return json.load(open(KONFIG, encoding="utf-8"))
    return {}


def journal():
    if os.path.exists(JOURNAL):
        return json.load(open(JOURNAL, encoding="utf-8"))
    return {"eintraege": []}


def journal_speichern(j):
    os.makedirs(BUERO, exist_ok=True)
    json.dump(j, open(JOURNAL, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def naechste_nummer(art, jahr):
    """Fortlaufend je Art und Jahr. Offerten und Rechnungen zählen getrennt."""
    j = journal()
    bisher = [x for x in j["eintraege"] if x["art"] == art and x["nr"].startswith(str(jahr))]
    return f"{jahr}-{len(bisher) + 1:03d}"


def posten_lesen(werte):
    """'Bezeichnung:490' oder 'Bezeichnung:2:245' (Menge) → Liste von Posten."""
    posten = []
    for w in werte:
        teile = w.split(":")
        if len(teile) == 2:
            bez, menge, preis = teile[0], 1, teile[1]
        elif len(teile) == 3:
            bez, menge, preis = teile[0], teile[1], teile[2]
        else:
            sys.exit(f"✗ Posten nicht lesbar: {w!r} — erwartet 'Text:Preis' oder 'Text:Menge:Preis'")
        try:
            menge_f, preis_f = float(str(menge).replace(",", ".")), float(str(preis).replace(",", "."))
        except ValueError:
            sys.exit(f"✗ Zahl nicht lesbar in {w!r}")
        posten.append({"bez": bez.strip(), "menge": menge_f, "preis": preis_f,
                       "summe": round(menge_f * preis_f, 2)})
    return posten


CSS = """@page{size:A4;margin:18mm 16mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1f2937;background:#fff;padding:28px}
.blatt{max-width:720px;margin:0 auto}
.kopf{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #d97706;padding-bottom:12px}
.marke{font-weight:800;color:#b45309;font-size:17px}
.klein{font-size:11.5px;color:#6b7280;line-height:1.5}
.an{margin:34px 0 6px;font-size:11.5px;color:#6b7280}
.kunde{font-size:14px;white-space:pre-line}
h1{font-size:19px;margin:26px 0 2px}
.meta{font-size:11.5px;color:#6b7280;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin-top:10px}
th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #ece3d4;vertical-align:top}
th{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
td.z,th.z{text-align:right;white-space:nowrap}
tr.summe td{border-top:2px solid #1f2937;border-bottom:0;font-weight:800;font-size:15px;padding-top:10px}
.zahlung{margin-top:22px;padding:12px 14px;background:#fffbf5;border:1px solid #ece3d4;border-radius:8px;font-size:12.5px}
.zahlung b{color:#b45309}
.fuss{margin-top:26px;padding-top:10px;border-top:1px solid #ece3d4;font-size:10.5px;color:#6b7280}
.notiz{margin-top:14px;font-size:12.5px;white-space:pre-line}
@media print{body{padding:0}}
.zt{width:210mm;height:105mm;font-family:Arial,"Liberation Sans",Helvetica,sans-serif;color:#000;background:#fff;display:flex;border-top:1px dashed #000;margin:26px -28px 0}
.zt .es{width:62mm;padding:5mm;border-right:1px dashed #000;display:flex;flex-direction:column}
.zt .zp{width:148mm;padding:5mm;display:grid;grid-template-columns:51mm 1fr;grid-template-rows:auto 1fr auto;column-gap:5mm}
.zt h2{font-size:11pt;font-weight:bold;margin:0 0 3mm;line-height:1}
.zt .k{font-size:6pt;font-weight:bold;line-height:1.2;margin-top:2.5mm}.zt .v{font-size:8pt;line-height:1.2}
.zt .zp .k{font-size:8pt}.zt .zp .v{font-size:10pt}
.zt .es .betrag{display:flex;gap:6mm;margin-top:auto}.zt .es .annahme{text-align:right;font-size:6pt;font-weight:bold;margin-top:4mm;height:18mm}
.zt .qr{grid-column:1;grid-row:2;align-self:start}.zt .zp .betragz{grid-column:1;grid-row:3;display:flex;gap:8mm;margin-top:3mm}.zt .zp .rechts{grid-column:2;grid-row:1/4}.zt .zp h2{grid-column:1;grid-row:1}
@media print{.zt{position:fixed;left:0;bottom:0;margin:0}}"""


def qr_zahlteil(nr, kunde, total, cfg):
    """Schweizer QR-Rechnung (Zahlteil + Empfangsschein) unter die Rechnung.

    Die Nutzdaten kommen aus js/qr-rechnung.js — derselbe Rechenkern wie das Web-Werkzeug
    (30 Prüfungen gegen den Standard), damit es hier nicht eine zweite, abweichende Wahrheit
    gibt. Der Code selbst entsteht mit segno (pip install segno). Ohne IBAN, ohne Node oder
    ohne segno: kein Zahlteil, die Rechnung bleibt wie bisher (IBAN + Mitteilung im Kasten)."""
    iban = cfg.get("iban")
    if not iban:
        return ""
    zeilen = kunde.splitlines()
    # Zahler nur mitgeben, wenn die Adresse vollständig ist (Name + PLZ/Ort); der Standard
    # verlangt sonst einen Fehler. Ein Kunde mit nur einem Namen bekommt ein leeres
    # „Zahlbar durch"-Feld — das ist eine gültige QR-Rechnung, keine kaputte.
    ganz = len(zeilen) >= 2
    empf = {"iban": iban, "name": cfg.get("kontoinhaber", ABSENDER["name"]), "strasse": ABSENDER["strasse"],
            "plzOrt": ABSENDER["ort"], "betrag": f"{total:.2f}", "waehrung": "CHF",
            "zahlerName": zeilen[0] if ganz else "", "zahlerStrasse": zeilen[-2] if len(zeilen) >= 3 else "",
            "zahlerPlzOrt": zeilen[-1] if ganz else "",
            "refTyp": "SCOR", "referenz": "", "mitteilung": f"Rechnung {nr}"}
    js = ("const Q=require(process.argv[1]);const d=JSON.parse(process.argv[2]);"
          "d.referenz=Q.rfErzeugen(d.referenz||'');if(Q.istQrIban(d.iban)){d.refTyp='QRR';d.referenz=Q.qrrErzeugen(d.referenz);}"
          "const p=Q.payload(d);if(!p.ok){console.error(p.fehler.join(' | '));process.exit(2);}"
          "console.log(JSON.stringify({text:p.text,ref:d.refTyp==='QRR'?Q.qrrFormat(d.referenz):Q.rfFormat(d.referenz),iban:Q.ibanFormat(d.iban)}));")
    empf["referenz"] = nr
    try:
        r = subprocess.run(["node", "-e", js, os.path.join(ROOT, "js", "qr-rechnung.js"), json.dumps(empf, ensure_ascii=False)],
                           capture_output=True, text=True, timeout=20)
        if r.returncode != 0:
            print("  ⚠️  QR-Rechnung nicht möglich: " + (r.stderr.strip() or "Node-Fehler"))
            return ""
        nutz = json.loads(r.stdout)
        import segno
        qr = segno.make(nutz["text"], error="m")
        svg = qr.svg_inline(scale=1, border=0, dark="#000")
        n = qr.symbol_size(scale=1, border=0)[0]
    except Exception as ex:  # segno fehlt, Node fehlt, ...
        print(f"  ⚠️  QR-Rechnung nicht möglich: {ex}")
        return ""
    k = n / 2
    kreuz = (f'<rect x="{k-3.5*n/46:.3f}" y="{k-3.5*n/46:.3f}" width="{7*n/46:.3f}" height="{7*n/46:.3f}" fill="#000"/>'
             f'<rect x="{k-0.6*n/46:.3f}" y="{k-2.2*n/46:.3f}" width="{1.2*n/46:.3f}" height="{4.4*n/46:.3f}" fill="#fff"/>'
             f'<rect x="{k-2.2*n/46:.3f}" y="{k-0.6*n/46:.3f}" width="{4.4*n/46:.3f}" height="{1.2*n/46:.3f}" fill="#fff"/>')
    svg = svg.replace("</svg>", kreuz + "</svg>", 1).replace("<svg ", '<svg style="width:46mm;height:46mm" ', 1)
    zahler = "<br>".join(e(z) for z in zeilen) if ganz else '<span style="display:inline-block;width:52mm;height:20mm;border:.5pt dashed #000"></span>'
    konto = e(nutz["iban"]) + "<br>" + e(empf["name"]) + "<br>" + e(ABSENDER["strasse"]) + "<br>" + e(ABSENDER["ort"])
    return f"""
<div class="zt" aria-label="QR-Rechnung: Zahlteil und Empfangsschein">
  <div class="es"><h2>Empfangsschein</h2>
    <div class="k">Konto / Zahlbar an</div><div class="v">{konto}</div>
    <div class="k">Referenz</div><div class="v">{e(nutz['ref'])}</div>
    <div class="k">Zahlbar durch</div><div class="v">{zahler}</div>
    <div class="betrag"><div><div class="k">Währung</div><div class="v">CHF</div></div><div><div class="k">Betrag</div><div class="v">{chf(total)}</div></div></div>
    <div class="annahme">Annahmestelle</div></div>
  <div class="zp"><h2>Zahlteil</h2>
    <div class="qr">{svg}</div>
    <div class="betragz"><div><div class="k">Währung</div><div class="v">CHF</div></div><div><div class="k">Betrag</div><div class="v">{chf(total)}</div></div></div>
    <div class="rechts"><div class="k" style="margin-top:0">Konto / Zahlbar an</div><div class="v">{konto}</div>
      <div class="k">Referenz</div><div class="v">{e(nutz['ref'])}</div>
      <div class="k">Zusätzliche Informationen</div><div class="v">Rechnung {e(nr)}</div>
      <div class="k">Zahlbar durch</div><div class="v">{zahler}</div></div></div>
</div>"""


def blatt(art, nr, kunde, posten, datum, frist, notiz, cfg):
    titel = "Offerte" if art == "offerte" else "Rechnung"
    total = round(sum(p["summe"] for p in posten), 2)
    faellig = datum + timedelta(days=frist)
    zeilen = ""
    for p in posten:
        menge = f'{p["menge"]:g}'
        zeilen += (f'<tr><td>{e(p["bez"])}</td><td class="z">{menge}</td>'
                   f'<td class="z">{chf(p["preis"])}</td><td class="z">{chf(p["summe"])}</td></tr>')

    if art == "offerte":
        zahlung = (f'<div class="zahlung">Diese Offerte gilt <b>30 Tage</b> ab Datum. '
                   f'Eine kurze Antwort per E-Mail an {e(ABSENDER["mail"])} genügt als Auftrag — '
                   f'die Rechnung folgt nach der Lieferung.</div>')
    else:
        iban = cfg.get("iban")
        kontoname = cfg.get("kontoinhaber", ABSENDER["name"])
        if iban:
            zahlung = (f'<div class="zahlung"><b>Zahlbar bis {faellig.strftime("%d.%m.%Y")}</b> '
                       f'({frist} Tage netto)<br>Konto: {e(kontoname)}<br>IBAN: <b>{e(iban)}</b><br>'
                       f'Mitteilung: <b>{e(nr)}</b></div>')
        else:
            zahlung = ('<div class="zahlung"><b>⚠️ Keine Zahlungsdaten hinterlegt.</b><br>'
                       'IBAN in <code>buero/konfig.json</code> eintragen (Vorlage: konfig.example.json), '
                       'sonst weiss der Kunde nicht, wohin er zahlen soll.</div>')

    return f"""<!DOCTYPE html>
<html lang="de-CH"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(titel)} {e(nr)} — {e(kunde.splitlines()[0])}</title>
<style>{CSS}</style></head><body><div class="blatt">
<div class="kopf">
  <div><div class="marke">☕ {e(ABSENDER["name"])}</div>
    <div class="klein">{e(ABSENDER["strasse"])}<br>{e(ABSENDER["ort"])}, {e(ABSENDER["land"])}</div></div>
  <div class="klein" style="text-align:right">{e(ABSENDER["mail"])}<br>{e(ABSENDER["web"])}</div>
</div>
<div class="an">Rechnungsempfänger</div>
<div class="kunde">{e(kunde)}</div>
<h1>{e(titel)} {e(nr)}</h1>
<div class="meta">Datum: {datum.strftime("%d.%m.%Y")}{"" if art == "offerte" else f" · Zahlbar bis: {faellig.strftime('%d.%m.%Y')}"}</div>
<table>
  <thead><tr><th>Leistung</th><th class="z">Menge</th><th class="z">Preis</th><th class="z">Betrag</th></tr></thead>
  <tbody>{zeilen}
    <tr class="summe"><td colspan="3">Total CHF</td><td class="z">{chf(total)}</td></tr></tbody>
</table>
{zahlung}
{f'<div class="notiz">{e(notiz)}</div>' if notiz else ''}
{qr_zahlteil(nr, kunde, total, cfg) if art == "rechnung" else ""}
<div class="fuss">{e(MWST_HINWEIS)}<br>Fragen zur {e(titel)} {e(nr)}? Eine Mail an {e(ABSENDER["mail"])} genügt.</div>
</div></body></html>
"""


def mailtext(art, nr, kunde, posten, datum, frist, cfg):
    total = round(sum(p["summe"] for p in posten), 2)
    erste = kunde.splitlines()[0]
    liste = "\n".join(f"· {p['bez']} — CHF {chf(p['summe'])}" for p in posten)
    if art == "offerte":
        return f"""Betreff: Offerte {nr} — {erste}

Guten Tag

vielen Dank für Ihr Interesse. Hier die Offerte wie besprochen:

{liste}

Total: CHF {chf(total)} (keine MWST, siehe Hinweis im Anhang)
Gültig: 30 Tage ab {datum.strftime('%d.%m.%Y')}

Passt das so? Eine kurze Antwort auf diese Mail genügt als Auftrag —
dann lege ich los und die Rechnung kommt nach der Lieferung.

Freundliche Grüsse
Allen Chour · aban news
{ABSENDER['mail']} · {ABSENDER['web']}

Anhang: Offerte {nr}
"""
    faellig = datum + timedelta(days=frist)
    zahlzeile = (f"IBAN {cfg['iban']}, Mitteilung {nr}" if cfg.get("iban")
                 else "⚠️ IBAN fehlt in buero/konfig.json — vor dem Senden eintragen!")
    return f"""Betreff: Rechnung {nr} — {erste}

Guten Tag

die Arbeit ist erledigt — hier die Rechnung:

{liste}

Total: CHF {chf(total)}
Zahlbar bis {faellig.strftime('%d.%m.%Y')} ({frist} Tage netto)
{zahlzeile}

Danke für den Auftrag. Wenn etwas unklar ist, einfach auf diese Mail antworten.

Freundliche Grüsse
Allen Chour · aban news
{ABSENDER['mail']} · {ABSENDER['web']}

Anhang: Rechnung {nr}
"""


def anlegen(art, kunde, posten, frist, notiz):
    os.makedirs(BUERO, exist_ok=True)
    heute = date.today()
    nr = naechste_nummer(art, heute.year)
    cfg = konfig()
    seite = os.path.join(BUERO, f"{nr}-{art}.html")
    mail = os.path.join(BUERO, f"{nr}-{art}-mail.txt")
    open(seite, "w", encoding="utf-8").write(blatt(art, nr, kunde, posten, heute, frist, notiz, cfg))
    open(mail, "w", encoding="utf-8").write(mailtext(art, nr, kunde, posten, heute, frist, cfg))

    j = journal()
    j["eintraege"].append({
        "art": art, "nr": nr, "datum": heute.isoformat(), "kunde": kunde.splitlines()[0],
        "kunde_voll": kunde, "posten": posten,
        "total": round(sum(p["summe"] for p in posten), 2),
        "frist": frist, "status": "offen" if art == "rechnung" else "gesendet",
    })
    journal_speichern(j)

    print(f"✓ {art.capitalize()} {nr} — CHF {chf(sum(p['summe'] for p in posten))}")
    print(f"  Seite: {os.path.relpath(seite, ROOT)}   (im Browser öffnen → Drucken → als PDF sichern)")
    print(f"  Mail : {os.path.relpath(mail, ROOT)}    (Text kopieren, PDF anhängen, senden)")
    if art == "rechnung" and not cfg.get("iban"):
        print("  ⚠️  Keine IBAN in buero/konfig.json — die Rechnung nennt kein Konto.")
    return nr


def main():
    p = argparse.ArgumentParser(description="Offerte und Rechnung per Mail — ohne Buchhaltungsprogramm.")
    sub = p.add_subparsers(dest="befehl", required=True)
    for art in ("offerte", "rechnung"):
        s = sub.add_parser(art)
        s.add_argument("--kunde", help='Empfänger, Zeilenumbrüche mit \\n')
        s.add_argument("--pos", action="append", default=[], help='"Bezeichnung:Preis" oder "Bezeichnung:Menge:Preis"')
        s.add_argument("--frist", type=int, default=30, help="Zahlungsfrist in Tagen (Standard 30)")
        s.add_argument("--notiz", default="", help="Freitext unter die Tabelle")
        if art == "rechnung":
            s.add_argument("--aus", help="Nummer einer Offerte — übernimmt Kunde und Posten")
    sub.add_parser("liste")
    b = sub.add_parser("bezahlt"); b.add_argument("--nr", required=True)

    a = p.parse_args()

    if a.befehl == "liste":
        j = journal()
        if not j["eintraege"]:
            print("Noch nichts im Journal. Erste Offerte: python3 tools/buero.py offerte --kunde ... --pos ...")
            return
        offen = 0.0
        for x in j["eintraege"]:
            zeichen = {"offen": "○", "bezahlt": "●", "gesendet": "→"}.get(x["status"], "?")
            print(f'{zeichen} {x["nr"]:9} {x["art"]:8} {x["datum"]}  CHF {chf(x["total"]):>10}  {x["kunde"]}')
            if x["art"] == "rechnung" and x["status"] == "offen":
                offen += x["total"]
        print(f"\nOffen: CHF {chf(offen)}")
        return

    if a.befehl == "bezahlt":
        j = journal()
        treffer = [x for x in j["eintraege"] if x["nr"] == a.nr and x["art"] == "rechnung"]
        if not treffer:
            sys.exit(f"✗ Keine Rechnung {a.nr} im Journal.")
        treffer[0]["status"] = "bezahlt"
        journal_speichern(j)
        print(f"✓ Rechnung {a.nr} als bezahlt vermerkt.")
        return

    kunde, posten = a.kunde, posten_lesen(a.pos)
    if a.befehl == "rechnung" and getattr(a, "aus", None):
        j = journal()
        quelle = [x for x in j["eintraege"] if x["nr"] == a.aus and x["art"] == "offerte"]
        if not quelle:
            sys.exit(f"✗ Keine Offerte {a.aus} im Journal — 'liste' zeigt, was da ist.")
        kunde = kunde or quelle[0]["kunde_voll"]
        posten = posten or quelle[0]["posten"]
    if not kunde or not posten:
        sys.exit("✗ --kunde und mindestens ein --pos nötig (oder --aus <Offerten-Nr>).")
    anlegen(a.befehl, kunde.replace("\\n", "\n"), posten, a.frist, a.notiz)


if __name__ == "__main__":
    main()
