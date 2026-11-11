#!/usr/bin/env python3
"""Baut die Seite des privaten Dashboards «KI-Büro»: drei Seiten in EINEM Artefakt.

Der Besitzer wollte am 11.11.2026 statt dreier Artefakte eines. Das Dashboard «KI-Büro» trägt darum drei Seiten als
Abschnitte seiner `index.html` (so sieht es der Dashboard-Typ vor: Abschnitte, alle bis auf den offenen unter `hidden`):

    KI-Büro         tools/buero/seite.html                    unverändert, nur in einen Abschnitt gestellt
    Offene Punkte   tools/buero/dashboard/offen.html           Zeichnungen umbenannt (op-zahl, op-balken, op-tabelle)
    Suchanfragen    dropship/keywordliste-1011/seite.html     unverändert

Stil und Skript der zwei neuen Seiten liegen in eigenen Dateien (lx-offen.css/.js, lx-suche.css/.js), weil ein Dokument des
Dashboards höchstens 256 KB fassen darf und die Büro-Seite allein rund 204 KB hat.

    python3 -I tools/buero/dashboard/bauen.py <Ausgabeordner>               # index.html und die vier lx-Dateien
    python3 -I tools/buero/dashboard/bauen.py <Ausgabeordner> --dokumente   # dazu dok/<Name>.json = {text, edit} zum Hochladen

Die drei Quellen bleiben einzeln prüfbar (ihre eigenen Tests laufen weiter). Wer `seite.html` roh als `index.html` ins
Dashboard schreibt, löscht die zwei anderen Seiten: immer über dieses Skript bauen. Anleitung: README.md daneben.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[2]
QUELLE_BUERO = ROOT / "tools" / "buero" / "seite.html"
QUELLE_OFFEN = HIER / "offen.html"
QUELLE_SUCHE = ROOT / "dropship" / "keywordliste-1011" / "seite.html"
META = '<meta name="dash-one-writer">'
MAX_DOKUMENT = 250_000          # Byte je gespeichertem Dokument (die Grenze des Typs ist 256 KB; etwas Luft)
OFFEN_ZEICHNUNGEN = {"zahl": "op-zahl", "balken": "op-balken", "tabelle": "op-tabelle"}
SEITEN = (("buero", "KI-Büro"), ("offen", "Offene Punkte"), ("suche", "Suchanfragen"))
SUCHE_REITER = ("uebersicht", "anfragen", "stichwoerter", "chancen", "ideen")   # Unter-Reiter der Suchanfragen-Seite (ihre Links)

HUELLE_STIL = """<style>
/* Hülle der drei Seiten: eine Zeile mit drei Knöpfen, darunter je Seite ein Abschnitt. Selektoren nur auf Klassen mit Präfix lx-. */
.lx-nav { display: flex; gap: var(--cds-gap-sm); overflow-x: auto; padding: 0 0 var(--cds-pad-md); }
.lx-tab { appearance: none; flex: 0 0 auto; min-height: 40px; padding: 8px 16px; border: 1px solid var(--color-border-line); border-radius: 999px; background: transparent; color: var(--color-fg-muted); font: inherit; font-size: var(--cds-font-size-body); cursor: pointer; }
.lx-tab:hover { color: var(--color-fg); }
.lx-tab:focus-visible { outline: 2px solid var(--color-fg); outline-offset: 2px; }
.lx-tab[aria-current="page"] { color: var(--color-bg); background: var(--color-fg); border-color: var(--color-fg); font-weight: var(--cds-font-weight-medium); }
.lx-seite[hidden] { display: none; }
</style>"""

HUELLE_SKRIPT = """<script>
  // Hülle: zeigt eine der drei Seiten. Ein Skript setzt hier nur `hidden` und `aria-current` (Regel «ein Schreiber»).
  // Unter `hidden` lädt das Dashboard keine Daten und zeichnet nichts; fällt `hidden` weg, zeichnet es die Seite.
  const LX_SEITEN = %(seiten)s;
  const LX_SUCHE_REITER = %(reiter)s;
  const lxZeige = (ziel, ohneLink) => {
    if (LX_SEITEN.indexOf(ziel) === -1) ziel = LX_SEITEN[0];
    document.querySelectorAll('.lx-seite').forEach((s) => { s.hidden = s.dataset.lxSeite !== ziel; });
    document.querySelectorAll('.lx-tab').forEach((t) => { t.setAttribute('aria-current', t.dataset.lxZiel === ziel ? 'page' : 'false'); });
    if (!ohneLink) dash.setLink(ziel);
  };
  document.querySelectorAll('.lx-tab').forEach((t) => t.addEventListener('click', () => lxZeige(t.dataset.lxZiel)));
  // Der Link des Dashboards endet auf #<Ort>: eine Seite oder ein Unter-Reiter der Suchanfragen (den öffnet deren eigenes Skript).
  const lxOrt = (location.hash || '').replace('#', '');
  if (LX_SEITEN.indexOf(lxOrt) > 0) lxZeige(lxOrt, true);
  else if (LX_SUCHE_REITER.indexOf(lxOrt) !== -1) lxZeige('suche', true);
</script>"""


class Baufehler(Exception):
    pass


def teile(html, name):
    """Eine eigenständige Seite in (Stil, Gerüst, Skript) zerlegen. Sie beginnt mit der Meta-Zeile und hat genau einen Stil- und einen Skriptblock."""
    if not html.startswith(META):
        raise Baufehler(f"{name}: die Seite beginnt nicht mit {META}")
    stile = re.findall(r"(?s)<style>(.*?)</style>", html)
    skripte = re.findall(r"(?s)<script>(.*?)</script>", html)
    if len(stile) != 1 or len(skripte) != 1 or len(re.findall(r"<script\b", html)) != 1 or len(re.findall(r"<style\b", html)) != 1:
        raise Baufehler(f"{name}: erwartet genau einen <style>- und einen <script>-Block ohne Attribute")
    geruest = html[len(META):]
    geruest = re.sub(r"(?s)<style>.*?</style>", "", geruest, count=1)
    geruest = re.sub(r"(?s)<script>.*?</script>", "", geruest, count=1)
    return stile[0].strip("\n") + "\n", geruest.strip() + "\n", skripte[0].strip("\n") + "\n"


def zeichnungen_umbenennen(geruest, skript, plan, name):
    """Namen von Zeichnungen in Gerüst (data-draw) und Skript (dash.draw) ersetzen; jeder Name muss an beiden Stellen vorkommen."""
    for alt, neu in plan.items():
        n_html = len(re.findall(r'data-draw="%s"' % re.escape(alt), geruest))
        n_js = len(re.findall(r"dash\.draw\(\s*'%s'" % re.escape(alt), skript))
        if not n_html or not n_js:
            raise Baufehler(f"{name}: Zeichnung «{alt}» fehlt im Gerüst ({n_html}) oder im Skript ({n_js})")
        geruest = re.sub(r'data-draw="%s"' % re.escape(alt), f'data-draw="{neu}"', geruest)
        skript = re.sub(r"(dash\.draw\(\s*')%s'" % re.escape(alt), r"\g<1>%s'" % neu, skript)
    return geruest, skript


def namen(text):
    """Was eine Seite an gemeinsamen Namen belegt: Zeichnungen, Berechnungen, ids."""
    return {
        "zeichnung": set(re.findall(r'data-draw="([^"]+)"', text)) | set(re.findall(r"dash\.draw\(\s*'([^']+)'", text)),
        "berechnung": set(re.findall(r"dash\.calc\(\s*'([^']+)'", text)),
        "id": set(re.findall(r'\bid="([^"]+)"', text)),
    }


def klassen_pruefen(geruest, stil, praefix, name):
    """Die neue Seite darf nur eigene Klassen tragen und ihr Stil nur eigene Klassen treffen (sonst färbt sie auf die anderen Seiten ab)."""
    fremd = sorted({k for wert in re.findall(r'class="([^"]+)"', geruest) for k in wert.split() if k != praefix and not k.startswith(praefix + "-")})
    if fremd:
        raise Baufehler(f"{name}: Klassen ohne Präfix «{praefix}-»: {fremd[:6]}")
    ohne_kommentar = re.sub(r"(?s)/\*.*?\*/", "", stil)
    for kopf in re.findall(r"(?s)([^{}]+)\{", ohne_kommentar):
        kopf = kopf.strip()
        if not kopf or kopf.startswith("@") or re.fullmatch(r"(from|to|\d+%)(\s*,\s*(from|to|\d+%))*", kopf):
            continue
        for teil in kopf.split(","):
            if "." + praefix not in teil:
                raise Baufehler(f"{name}: Stil-Selektor ohne eigene Klasse: «{teil.strip()[:60]}»")


def huelle_namen_pruefen(belegt):
    """Keine Seite darf Namen der Hülle belegen: alles mit «lx-» und die Namen der Seiten selbst.

    Die Abschnitte tragen den Namen ihres Links als id (id="offen" zu dash.setLink('offen')): der Dashboard-Typ nennt Claude den
    Ort, an dem jemand gerade ist, nur, wenn dieser Name als id in den Dateien der Seite steht. Trüge eine Seite dieselbe id,
    gäbe es sie doppelt."""
    eigene = {kurz for kurz, _ in SEITEN}
    for seite, arten in belegt.items():
        lx = sorted(x for art in arten.values() for x in art if x.startswith("lx-") or x in eigene)
        if lx:
            raise Baufehler(f"«{seite}» belegt Namen der Hülle: {lx[:6]}")


def bauen():
    """→ {Dateiname: Text} für das Dashboard (index.html und die vier lx-Dateien)."""
    buero = QUELLE_BUERO.read_text(encoding="utf-8")
    if not buero.startswith(META):
        raise Baufehler(f"Büro: die Seite beginnt nicht mit {META}")
    o_stil, o_geruest, o_skript = teile(QUELLE_OFFEN.read_text(encoding="utf-8"), "Offene Punkte")
    s_stil, s_geruest, s_skript = teile(QUELLE_SUCHE.read_text(encoding="utf-8"), "Suchanfragen")
    o_geruest, o_skript = zeichnungen_umbenennen(o_geruest, o_skript, OFFEN_ZEICHNUNGEN, "Offene Punkte")
    klassen_pruefen(o_geruest, o_stil, "op", "Offene Punkte")
    klassen_pruefen(s_geruest, s_stil, "ks", "Suchanfragen")
    for reiter in SUCHE_REITER:
        if f'id="ks-tab-{reiter}"' not in s_geruest:
            raise Baufehler(f"Suchanfragen: Reiter «{reiter}» fehlt (die Hülle leitet seinen Link auf die Seite)")

    belegt = {"Büro": namen(buero), "Offene Punkte": namen(o_geruest + o_skript), "Suchanfragen": namen(s_geruest + s_skript)}
    seiten = list(belegt)
    for i, a in enumerate(seiten):
        for b in seiten[i + 1:]:
            for art in ("zeichnung", "berechnung", "id"):
                doppelt = belegt[a][art] & belegt[b][art]
                if doppelt:
                    raise Baufehler(f"{art} doppelt in «{a}» und «{b}»: {sorted(doppelt)[:6]}")
    huelle_namen_pruefen(belegt)

    knoepfe = "\n".join(
        f'  <button type="button" class="lx-tab" id="lx-tab-{kurz}" data-lx-ziel="{kurz}" aria-current="{"page" if i == 0 else "false"}">{titel}</button>'
        for i, (kurz, titel) in enumerate(SEITEN))
    huelle_skript = HUELLE_SKRIPT % {"seiten": json.dumps([k for k, _ in SEITEN]), "reiter": json.dumps(list(SUCHE_REITER))}
    index = "\n".join([
        META,
        '<link rel="stylesheet" href="lx-offen.css">',
        '<link rel="stylesheet" href="lx-suche.css">',
        HUELLE_STIL,
        "",
        '<nav class="lx-nav" id="lx-nav" aria-label="Seiten">',
        knoepfe,
        "</nav>",
        "",
        '<section class="lx-seite" id="buero" data-lx-seite="buero">',
        buero[len(META):].strip("\n"),
        "</section>",
        "",
        '<section class="lx-seite" id="offen" data-lx-seite="offen" hidden>',
        o_geruest.rstrip("\n"),
        "</section>",
        "",
        '<section class="lx-seite" id="suche" data-lx-seite="suche" hidden>',
        s_geruest.rstrip("\n"),
        "</section>",
        "",
        '<script src="lx-offen.js"></script>',
        '<script src="lx-suche.js"></script>',
        huelle_skript,
        "",
    ])
    dateien = {"index.html": index, "lx-offen.css": o_stil, "lx-offen.js": o_skript, "lx-suche.css": s_stil, "lx-suche.js": s_skript}
    for name, text in dateien.items():
        groesse = len(json.dumps({"text": text, "edit": {"via": "claude", "at": "2026-01-01T00:00:00Z"}}, ensure_ascii=False).encode("utf-8"))
        if groesse > MAX_DOKUMENT:
            raise Baufehler(f"{name}: {groesse} Byte als Dokument, erlaubt sind {MAX_DOKUMENT} (Grenze des Dashboards: 256 KB)")
    return dateien


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if not argv or argv[0].startswith("-"):
        print(__doc__)
        return 2
    aus = Path(argv[0])
    try:
        dateien = bauen()
    except Baufehler as ex:
        print(f"ABBRUCH: {ex}")
        return 1
    aus.mkdir(parents=True, exist_ok=True)
    for name, text in dateien.items():
        (aus / name).write_text(text, encoding="utf-8")
    if "--dokumente" in argv[1:]:
        jetzt = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        (aus / "dok").mkdir(exist_ok=True)
        for name, text in dateien.items():
            (aus / "dok" / (name + ".json")).write_text(json.dumps({"text": text, "edit": {"via": "claude", "at": jetzt}}, ensure_ascii=False), encoding="utf-8")
    for name, text in dateien.items():
        print(f"{name:14} {len(text.encode('utf-8')):>7} Byte")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
