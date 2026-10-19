#!/usr/bin/env python3
"""umschrift_heilen.py — «fuer/ueber/verfuegbar/Groessen» in Produkttexten zurück zu ü/ö/ä (19.10.2026, Spähtrupp katalog K7).

BEFUND (GEMESSEN, Export 19.10. 05:37): 771 aktive Produkte tragen ≥ 2 verschiedene ASCII-Umschrift-Stämme im Text (fuer 339, ueber 111, verfuegbar 128, verfuegt 90,
groessen 88, erhaeltlich 58 …), reiner Altbestand (Jul/Aug) — die Neugenerierung ist durch das UMSCHRIFT-Tor in produkttext_duenn.py geschützt, der Bestand nicht.

REGEL (Whitelist, nie blind ue→ü: «Quelle», «Steuer», «Neue» haben ue): nur die Stämme in STAEMME, nur in TEXTKNOTEN (nie in Tags/Attributen/URLs: «/collections/geschenke-fuer-ihn»
bleibt), Wortanfang-Grenze (`\\b`) ausser bei den eindeutigen Stämmen stueck/qualitaet/oberflaech/verfuegbar/verfuegt, Gross-/Kleinschreibung bleibt. Ein Produkt wird nur
angefasst, wenn ≥ 2 VERSCHIEDENE Stämme im Text stehen (ein einzelnes «fuer» in einem englischen Satz bleibt unberührt). «Groesse» wird zu «Grösse» (Hausorthografie, Schweiz).
Werbetest-Produkte (dropship/_werbetest_sperre.txt) ausgelassen; Schreiben nur mit SCHARF=1 unter /tmp/lock_produkttext.lock, live frisch lesen, Rücklesen;
Rückweg: alter descriptionHtml in dropship/_umschrift_vorher.jsonl, Ledger dropship/_umschrift_heilen.tsv.
    python3 automation/umschrift_heilen.py --selbsttest
    CAP=40 python3 automation/umschrift_heilen.py            # DRY: Vorher/Nachher
    SCHARF=1 CAP=200 python3 automation/umschrift_heilen.py
"""
import fcntl
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

EXPORT = os.environ.get("EXPORT", "/tmp/versprechen_export.jsonl")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_umschrift_heilen.tsv")
VORHER = os.path.join(REPO, "dropship", "_umschrift_vorher.jsonl")
CAP = int(os.environ.get("CAP", "200"))
SCHARF = os.environ.get("SCHARF") == "1"

# (Muster, Ersatz klein) — Muster gegen den Text in Kleinbuchstaben; Gross-/Kleinschreibung wird vom Treffer übernommen
STAEMME = [
    (r"\bfuer\b", "für"), (r"\bueber", "über"), (r"\bdafuer\b", "dafür"),
    (r"verfuegbar", "verfügbar"), (r"verfuegt", "verfügt"), (r"\bverfuegen", "verfügen"),
    (r"groess", "gröss"), (r"\berhaelt", "erhält"), (r"\bhaelt\b", "hält"),
    (r"oberflaech", "oberfläch"), (r"gruen", "grün"), (r"laeng", "läng"), (r"waerm", "wärm"),
    (r"\bwaehl", "wähl"), (r"\bwaehrend\b", "während"), (r"qualitaet", "qualität"), (r"\bkoenn", "könn"), (r"kueche", "küche"),
    (r"stueck", "stück"), (r"moeglich", "möglich"), (r"natuerlich", "natürlich"), (r"geraet", "gerät"),
    (r"zubehoer", "zubehör"), (r"hoeh", "höh"), (r"\bschoen", "schön"), (r"fuehl", "fühl"), (r"fuell", "füll"),
    (r"duenn", "dünn"), (r"\bbuero", "büro"), (r"\btuer\b", "tür"),
    (r"\bzurueck", "zurück"), (r"\bnaechst", "nächst"), (r"praezis", "präzis"), (r"geschuetzt", "geschützt"),
    (r"\bmuess", "müss"), (r"\bmoecht", "möcht"), (r"\bfuenf", "fünf"),
]
STAMM_RX = [(re.compile(m, re.I), e) for m, e in STAEMME]
TAG = re.compile(r"(<[^>]+>)")


def _fall(treffer, ers):
    t = treffer.group(0)
    if t.isupper() and len(t) > 1:
        return ers.upper()
    if t[:1].isupper():
        return ers[:1].upper() + ers[1:]
    return ers


def text_heilen(text):
    """→ (neuer Text, Menge verschiedener Stämme). Reine Funktion auf EINEM Textknoten."""
    stämme = set()
    for i, (rx, ers) in enumerate(STAMM_RX):
        def sub(m, ers=ers, i=i):
            stämme.add(i)
            return _fall(m, ers)
        text = rx.sub(sub, text)
    return text, stämme


def zaehle(html):
    s = set()
    for seg in TAG.split(html or ""):
        if seg.startswith("<"):
            continue
        for i, (rx, _e) in enumerate(STAMM_RX):
            if rx.search(seg):
                s.add(i)
    return s


def html_heilen(html):
    """→ (neues html, Menge Stämme) — nur Textknoten; bei < 2 verschiedenen Stämmen unverändert."""
    if len(zaehle(html)) < 2:
        return html, set()
    teile, alle = [], set()
    for seg in TAG.split(html):
        if seg.startswith("<"):
            teile.append(seg)
            continue
        neu, st = text_heilen(seg)
        alle |= st
        teile.append(neu)
    return "".join(teile), alle


def selbsttest():
    f = []
    fall = [
        ("<p>Ideal fuer jeden Tag, ueber 5 Jahre verfuegbar.</p>", "<p>Ideal für jeden Tag, über 5 Jahre verfügbar.</p>"),
        ('<a href="/collections/geschenke-fuer-ihn">Fuer Ihn: ueberzeugend</a>', '<a href="/collections/geschenke-fuer-ihn">Für Ihn: überzeugend</a>'),
        ("<p>Die Quelle der Steuer und die Neue Fuesse.</p>", "<p>Die Quelle der Steuer und die Neue Fuesse.</p>"),          # ue ohne Stamm bleibt
        ("<p>For you fuer</p>", "<p>For you fuer</p>"),                                                                       # nur 1 Stamm → unberührt
        ("<p>Groessen S-XL, erhaeltlich in gruen. Hohe Qualitaet.</p>", "<p>Grössen S-XL, erhältlich in grün. Hohe Qualität.</p>"),
        ("<p>FUER ALLE UEBERALL</p>", "<p>FÜR ALLE ÜBERALL</p>"),
        ('<img alt="fuer" src="x.png"><p>Stueck fuer Stueck</p>', '<img alt="fuer" src="x.png"><p>Stück für Stück</p>'),     # Attribut bleibt
        ("<p>Bauer, Fuerth, Buerger</p>", "<p>Bauer, Fuerth, Buerger</p>"),                                                   # Namen/andere Wörter
        ("<p>Die Tuer schliesst, Buero offen, fuer dich.</p>", "<p>Die Tür schliesst, Büro offen, für dich.</p>"),
        ("<p>Packungsgroesse, Handwaermer, Aufbewahrungsmoeglichkeiten, waehrend fuer Dunkelgruen.</p>",
         "<p>Packungsgrösse, Handwärmer, Aufbewahrungsmöglichkeiten, während für Dunkelgrün.</p>"),
        ("<p>Congress progress Gruenau Quelle Steuer</p>", "<p>Congress progress Gruenau Quelle Steuer</p>"),                   # nur 1 Stamm (gruen in Gruenau) → unberührt
    ]
    for roh, soll in fall:
        neu, _ = html_heilen(roh)
        if neu != soll:
            f.append(f"{roh!r} → {neu!r}, soll {soll!r}")
    print(f"umschrift_heilen Selbsttest: {len(fall) - len(f)}/{len(fall)}")
    for x in f:
        print("  FAIL", x)
    return not f


def kandidaten():
    out = []
    if not os.path.exists(EXPORT):
        return out
    for l in open(EXPORT, encoding="utf-8"):
        if "fuer" not in l.lower() and "ueber" not in l.lower() and "verfueg" not in l.lower() and "groess" not in l.lower():
            continue
        try:
            p = json.loads(l)
        except ValueError:
            continue
        if not p.get("title") or len(zaehle(p.get("descriptionHtml") or "")) < 2:
            continue
        out.append(p["id"])
    return out


def main():
    import kollektion_leer as kl
    from werbetest_sperre import gesperrt
    if not os.path.exists(EXPORT):
        print(f"PAUSE: Export {EXPORT} fehlt — nächster Lauf (versprechen_wache baut ihn täglich)", flush=True)
        return 0
    ids = [i for i in kandidaten() if not gesperrt(i)]
    print(f"{len(ids)} Kandidaten im Export · CAP {CAP} · {'SCHARF' if SCHARF else 'DRY'}", flush=True)
    geaendert = geprueft = fehler = 0
    stempel = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    lock = None
    if SCHARF:
        lock = open("/tmp/lock_produkttext.lock", "w")
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            print("PAUSE: Text-Sperre belegt — nächster Lauf", flush=True)
            return 0
    for k in range(0, len(ids[:CAP]), 40):
        d = kl.gql('query($i:[ID!]!){nodes(ids:$i){... on Product{id title status descriptionHtml}}}', {"i": ids[:CAP][k:k + 40]})
        for p in d.get("nodes") or []:
            if not p or p.get("status") != "ACTIVE":
                continue
            geprueft += 1
            html = p.get("descriptionHtml") or ""
            neu, st = html_heilen(html)
            if neu == html:
                continue
            vor = sorted({m.group(0).lower() for seg in TAG.split(html) if not seg.startswith("<") for rx, _ in STAMM_RX for m in rx.finditer(seg)})[:5]
            print(f"  {p['id'].split('/')[-1]} {p['title'][:48]} · {len(st)} Stämme · {vor}", flush=True)
            if not SCHARF:
                continue
            with open(VORHER, "a", encoding="utf-8") as vf:
                vf.write(json.dumps({"id": p["id"], "html": html}, ensure_ascii=False) + "\n")
            r = kl.gql('mutation($i:ProductUpdateInput!){productUpdate(product:$i){product{descriptionHtml} userErrors{message}}}',
                       {"i": {"id": p["id"], "descriptionHtml": neu}})
            pu = r.get("productUpdate") or {}
            zur = (pu.get("product") or {}).get("descriptionHtml") or ""
            if pu.get("userErrors") or len(zaehle(zur)) > 0 and len(zaehle(zur)) >= len(zaehle(html)):
                fehler += 1
                print(f"  ⚠️ {p['id']}: {pu.get('userErrors')} Rücklesen unverändert", flush=True)
                continue
            geaendert += 1
            with open(LEDGER, "a", encoding="utf-8") as led:
                led.write(f"{stempel}\t{p['id'].split('/')[-1]}\t{len(st)}\t{p['title']}\n")
            time.sleep(0.3)
    if lock:
        lock.close()
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {geaendert} geändert, {geprueft} geprüft, {fehler} Fehler" + ("" if SCHARF else " (DRY)"), flush=True)
    return 1 if fehler else 0


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--selbsttest":
            sys.exit(0 if selbsttest() else 1)
        print(f"unbekannter Schalter {sys.argv[1]!r} — Abbruch (kein Lauf)")
        sys.exit(2)
    sys.exit(main())
