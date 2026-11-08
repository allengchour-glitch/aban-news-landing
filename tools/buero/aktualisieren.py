#!/usr/bin/env python3
"""Macht aus den Messungen den Datensatz-Zusatz «werte.json» für make_buero.py (tägliche Auffrischung des KI-Büros).

Aufruf: python3 -I tools/buero/aktualisieren.py <messung.json> <mcp.json> <werte.json>
  messung.json : Ausgabe von messen.py (GitHub-Läufe, Release, Bücher, Freigabedateien); erzeugt Statuslampe, Zeit und den Satz «Letzte Läufe …» von selbst
  mcp.json     : was nur Plattform-Werkzeuge messen (Bestellungen, geplante Aufgaben, Sitzungen, Metricool, Trockenläufe), kleine Datei, die die Sitzung schreibt:
                 {"_gem": "2026-11-07T06:30:00Z", "<zeilen-id>": {"status": "gruen|gelb|rot|du", "befund": "...", "wort": "Lauf", "ereignis_iso": "…Z",
                                                                    "ereignis_text": "(optional, ersetzt «wort Zeit»)", "menge": 0, "aktiv_h": 3, "frisch_h": 6}}
  werte.json   : je Zeilen-id die zu überschreibenden Felder; make_buero.py <Ausgabe.json> <werte.json> wendet sie an
Regeln für die Lampe der GitHub-Zeilen: letzter Lauf erfolgreich = grün, fehlgeschlagen = rot, abgebrochen oder ohne Ergebnis = gelb. Zeilen, die aus einem Grund gelb sein MÜSSEN
(Fortura ohne Freigabedatei), setzt die Regel unten. Was hier nicht steht, bleibt, wie es in make_buero.py steht.
"""
import json
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

CH = ZoneInfo("Europe/Zurich")
WORT = {"success": "grün", "failure": "rot", "cancelled": "abgebrochen", "in_progress": "läuft", "queued": "wartet", "skipped": "übersprungen"}

# Zeile -> (Workflow-Datei, fester Satz davor, frisch_h). Die Sätze sind zeitlos; Datiertes erzeugt dieses Skript aus den Läufen.
GITHUB = {
    "auswahl": ("auswahl-lauf.yml", "Zieht nachts Farben und Grössen der CJ-Produkte nach. Wie viele Produkte er geändert hat, steht nicht in diesen Daten.", 36),
    "schaufenster": ("gmc-schaufenster.yml", "Hält die Zahl der Varianten bei Google unter der Quote. Ob Google die Quote als eingehalten zeigt, ist ungemessen.", 36),
    "waechter": ("lager-waechter.yml", "Stellt ausverkaufte Produkte in den Kategorien nach hinten. Was er umsortiert hat, steht nicht in diesen Daten.", 36),
    "autopilot": ("shop-autopilot.yml", "Tägliche Shop-Wartung: SEO für neue Produkte, Bild-Kontrolle und Gesundheitsbericht. Ob das etwas verkauft, ist nicht gemessen.", 36),
    "fortura": ("fortura-bestand.yml", "Gleicht den Fortura-Bestand mit dem Shop ab.", 24),
    "printful": ("printful-tracking.yml", "Meldet versendete Printful-Pakete an Shopify.", 36),
    "tagesupdate": ("tages-update.yml", "Täglicher Sammel-Lauf: KI-News, Märkte und die Krypto-Papierbücher.", 36),
    "bewertungen": ("cj-reviews.yml", "Vorhandener CJ→Judge.me-Importer (alle sechs Stunden). Echte Quellbewertungen müssen zum selben Produkt gehören.", 12),
    "seitenpflege": ("buero-tagespflege.yml", "Prüft täglich die Seiten und die Suchmaschinen-Meldungen und baut die Daten dieses Büros neu. Ob Google eine Seite aufgenommen hat, ist damit nicht gemessen.", 36),
}
# Ein Lauf-Erfolg sagt hier nichts über Testlauf, No-op oder veröffentlichte Bewertungen (Vorgabe aus der Codex-Übergabe vom 08.11.): bleibt gelb.
NUR_GELB = {"bewertungen"}
NUR_DU = {"seitenpflege"}


def z(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(CH).strftime("%d.%m. %H:%M")


def laeufe_satz(laeufe):
    teile = []
    for x in laeufe:
        art = " von Hand" if x["event"] == "workflow_dispatch" else ""
        teile.append(f"{z(x['start_iso'])}{art} {WORT.get(x['ergebnis'], x['ergebnis'])}")
    return "Letzte Läufe: " + ", ".join(teile) + "."


def lampe(laeufe):
    if not laeufe:
        return "gelb"
    e = laeufe[0]["ergebnis"]
    return "gruen" if e in ("success", "in_progress", "queued") else "rot" if e == "failure" else "gelb"


def main():
    messung = json.load(open(sys.argv[1], encoding="utf-8"))
    mcp = json.load(open(sys.argv[2], encoding="utf-8"))
    werte = {}
    gem = mcp.get("_gem") or messung["gemessen_iso"]
    werte["_gem"] = gem
    wf = messung["workflows"]
    frei = messung.get("freigaben", {})
    for zid, (datei, satz, frisch) in GITHUB.items():
        info = wf.get(datei, {})
        laeufe = info.get("laeufe") or []
        if "fehler" in info or not laeufe:
            werte[zid] = {"status": "gelb", "befund": satz + " Diesmal nicht gemessen (GitHub antwortete nicht oder es gibt keinen Lauf).", "frisch_h": frisch}
            continue
        st = lampe(laeufe)
        if zid in NUR_GELB and st == "gruen":
            st = "gelb"
        if zid in NUR_DU and st in ("gruen", "gelb"):
            st = "du"  # ein Blatt für dich bleibt ein Blatt; nur ein Fehlschlag macht daraus Rot
        w = {"status": st, "befund": satz + " " + laeufe_satz(laeufe), "wort": "Lauf", "ereignis_iso": laeufe[0]["start_iso"], "frisch_h": frisch,
             "quelle": f"GitHub Actions: {datei}, {info['gesamt']} Läufe insgesamt, letzte {len(laeufe)} gelesen"}
        if zid == "fortura":
            f = frei.get("dropship/FORTURA-BESTAND-FREI.txt")
            if f == "fehlt":
                w["status"] = "gelb" if w["status"] == "gruen" else w["status"]
                w["befund"] = ("Gleicht den Fortura-Bestand mit dem Shop ab. Ohne Freigabedatei in main läuft er nur lesend (Probelauf), das ist dein Ja. "
                               + laeufe_satz(laeufe))
                w["wort"] = "Lauf" if laeufe[0]["event"] == "schedule" else "Probelauf"
            elif f == "da":
                w["befund"] = "Gleicht den Fortura-Bestand täglich mit dem Shop ab und schreibt (Freigabedatei liegt in main). " + laeufe_satz(laeufe)
        werte[zid] = w
    rel = messung.get("release")
    paket = wf.get("krypto-paket.yml", {}).get("laeufe") or []
    if rel and paket:
        version = rel["text_anfang"].split(" · ")[0].replace("Version ", "")
        werte["paket"] = {"status": lampe(paket), "wort": "Gebaut", "ereignis_iso": paket[0]["start_iso"], "frisch_h": 48,
                          "befund": f"Programmpaket für dein Krypto-Cockpit, aktuell Version {version}; alle Selbsttests laufen vor dem Bau. "
                                    "Auf deinen PC kommt es erst, wenn das Starter-ZIP einmal eingespielt ist (Blatt unten). " + laeufe_satz(paket),
                          "quelle": "GitHub Actions: krypto-paket.yml; Release krypto-latest"}
    lab = messung["dateien"].get("data/krypto-scalping-labor.json", {}).get("letzter_lauf")
    if lab:
        werte["labor"] = {"status": "gruen" if not lab.get("hinweise") else "gelb", "wort": "Lauf", "ereignis_iso": lab["zeit"].replace("+00:00", "Z"), "frisch_h": 36,
                          "befund": f"Rechnet kurzfristigen Handel mit echten Kursen, nur auf Papier und ohne Geld. Letzter Lauf: {lab.get('kerzen', '?')} Kerzen, {lab.get('trades', '?')} Handel, "
                                    f"{len(lab.get('hinweise') or [])} Hinweise. Ein Urteil gibt es erst nach 14 Tagen Daten."}
    sat = messung["dateien"].get("data/krypto-satellit-schatten.json", {}).get("letzter_stand")
    if sat:
        werte["satellit"] = {"status": "gruen", "wort": "Stand", "ereignis_iso": sat + "T12:00:00Z", "ereignis_text": f"Stand {z(sat + 'T12:00:00Z')[:5]}. (letzter abgeschlossener Tag)", "frisch_h": 36, "aktiv_h": 0,
                             "befund": "Spielgeld-Vorwärtstest der Top-10-Regel auf anderen Coins. Die Regel bestand ihren Test nicht, darum wird nur beobachtet. "
                                       f"Stand vom {z(sat + 'T12:00:00Z')[:5]}. Unter 8 Wochen Daten ist das Rauschen und kein Urteil."}
    # was nur Plattform-Werkzeuge messen, kommt fertig aus mcp.json (hat Vorrang)
    for zid, w in mcp.items():
        if zid.startswith("_"):
            continue
        werte[zid] = {**werte.get(zid, {}), **w}
    json.dump(werte, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    rot = [k for k, v in werte.items() if not k.startswith("_") and v.get("status") == "rot"]
    print("werte:", len([k for k in werte if not k.startswith("_")]), "Zeilen; rot:", rot or "keine")


if __name__ == "__main__":
    main()
