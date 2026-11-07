#!/usr/bin/env python3
"""Baut buero.json (die Zeilen des KI-Büros) aus den Messungen vom 05.11.2026, Fassung 2 (mit Szene).

Zeiten stehen im Datensatz als ISO (UTC) und als fertiger Text in Schweizer Zeit,
damit die Seite sie unverändert anzeigen kann. Aufruf: python3 -I make_buero.py <Ausgabedatei>

Spalten (alle Zeilen haben alle Spalten):
  id, bereich, name, kurz, status, befund, ereignis, ereignis_iso, gemessen, gemessen_text, frisch_h, quelle
  figur   : arbeiter (Figur am Schreibtisch), paket (Fliessband), tafel (Wandtafel), papier (Blatt auf dem Chefpult)
  menge   : Zahl für paket (Pakete) und tafel (grosse Zahl), sonst 0
  aktiv_h : so viele Stunden nach dem Ereignis zählt die Figur als «arbeitet gerade» (0 = nie)
  ort_art : cloud (GitHub), claude (Claude-Sitzung oder geplante Aufgabe), pc (dein Windows-PC), shop (Shopify), du (bei dir)
  ort     : der echte Arbeitsort als kurzer Satzteil;  ort_kurz: höchstens 11 Zeichen für Beschriftung und Schild
  ort_text: wo und wann es wirklich läuft (belegt in .github/workflows, geplanten Aufgaben, CLAUDE.md);  link: https-Adresse des echten Ortes oder leer
"""
import argparse
import json
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

CH = ZoneInfo("Europe/Zurich")
GEM = "2026-11-05T20:27:00Z"  # Messung dieses Durchgangs (GitHub, Shopify, geplante Aufgaben, Sitzungen)


def z(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(CH)


def zeit(iso):
    return z(iso).strftime("%d.%m. %H:%M")


def mess(i, bereich, name, kurz, status, befund, wort, ev_iso, quelle, frisch_h,
         ev_text=None, figur="arbeiter", menge=0, aktiv_h=3):
    """Messzeile: Ereignis (Lauf, Bau, Bestellung ...) und Messzeit."""
    return {
        "id": i, "bereich": bereich, "name": name, "kurz": kurz, "status": status, "befund": befund,
        "ereignis": ev_text or f"{wort} {zeit(ev_iso)}", "ereignis_iso": ev_iso,
        "gemessen": GEM, "gemessen_text": zeit(GEM), "frisch_h": frisch_h, "quelle": quelle,
        "figur": figur, "menge": menge, "aktiv_h": aktiv_h,
    }


def frage(i, name, kurz, befund, ereignis, stand_text, quelle):
    """Blatt für dich: kein Messwert, altert nicht (frisch_h 0)."""
    return {
        "id": i, "bereich": "Chefbüro", "name": name, "kurz": kurz, "status": "du", "befund": befund,
        "ereignis": ereignis, "ereignis_iso": "", "gemessen": "", "gemessen_text": stand_text,
        "frisch_h": 0, "quelle": quelle, "figur": "papier", "menge": 0, "aktiv_h": 0,
    }


ROWS = [
    # ---- Shop
    mess("auswahl", "Shop", "Auswahl-Lauf", "Auswahl-Lauf", "gruen",
         "Zieht nachts Farben und Grössen der CJ-Produkte nach. Die letzten zwei Läufe waren grün (04. und 05.11.), "
         "am 02. und 03.11. war er rot. Wie viele Produkte er heute geändert hat, habe ich nicht gelesen.",
         "Lauf", "2026-11-05T01:50:45Z", "GitHub Actions: auswahl-lauf.yml, letzte 3 Läufe", 36),
    mess("schaufenster", "Shop", "Google-Schaufenster", "Google-Schaufenster", "gruen",
         "Hält die Zahl der Varianten bei Google unter der Quote. Vier Läufe in Folge grün (02. bis 05.11.). "
         "Heute kamen 616 neue Zeilen ins Manifest. Ob Google die Quote jetzt als eingehalten zeigt, ist ungemessen.",
         "Lauf", "2026-11-05T12:42:55Z", "GitHub Actions: gmc-schaufenster.yml, letzte 3 Läufe", 36),
    mess("waechter", "Shop", "Lager-Wächter", "Lager-Wächter", "gruen",
         "Stellt ausverkaufte Produkte in den Kategorien nach hinten. Der erste Lauf nach Zeitplan war heute grün, "
         "er kam 8 Stunden nach der Plan-Zeit. Was er umsortiert hat, habe ich nicht gelesen.",
         "Lauf", "2026-11-05T13:18:29Z", "GitHub Actions: lager-waechter.yml, bisher 2 Läufe", 36),
    mess("autopilot", "Shop", "Shop-Autopilot", "Shop-Autopilot", "gruen",
         "Tägliche Shop-Wartung: SEO für neue Produkte, Bild-Kontrolle und Gesundheitsbericht. "
         "Drei Läufe in Folge grün. Ob das etwas verkauft, ist nicht gemessen.",
         "Lauf", "2026-11-05T14:56:26Z", "GitHub Actions: shop-autopilot.yml, letzte 3 Läufe", 36),
    mess("fortura", "Shop", "Fortura-Bestand", "Fortura-Bestand", "gelb",
         "Der tägliche Abgleich in GitHub ist noch nie gelaufen. Du hast den Zugang eingetragen; ob er ankommt, zeigt erst ein Lauf "
         "(ein Probelauf von hier scheiterte an einem GitHub-Serverfehler, der Zeitplan startet um 03:51 UTC). Die Freigabedatei fehlt, "
         "bis dahin läuft er nur lesend. Heute hat die Shop-Sitzung den Bestand von Hand abgeglichen; diese Zahlen gelten bis morgen etwa 14:57.",
         "Von Hand", "2026-11-05T11:57:00Z",
         "GitHub Actions: fortura-bestand.yml, 0 Läufe; Freigabedatei in main: fehlt; Zugang laut Besitzer 05.11. eingetragen; CLAUDE.md 05.11.", 24),
    mess("shop_sitzung", "Shop", "Shop-Sitzung (Claude)", "Shop-Sitzung", "gruen",
         "Die Claude-Sitzung, die den Shop betreut, ist offen und arbeitet gerade. Laut Plattform zuletzt: "
         "«indexing luxestyle.ch pages, excluding glaetteisen-locken-foehn». Sie legt CJ-Bestellungen an, "
         "wenn die Zahlungswache sie weckt.",
         "Aktiv", "2026-11-05T20:24:51Z", "Plattformangabe (get_session), Fremdtext nur zitiert", 3, aktiv_h=1),
    # ---- Versand
    mess("bestellwaechter", "Versand", "Bestellwächter", "Bestellwächter", "gruen",
         "Prüft alle 2 Stunden neue Bestellungen auf Lieferbarkeit. Letzter Lauf 21:20 (40 Sekunden, erfolgreich), "
         "nächster 23:20. Was der letzte Lauf gemeldet hat, habe ich nicht gelesen.",
         "Lauf", "2026-11-05T20:20:21Z", "Geplante Aufgabe «Bestellwächter» (Angaben der Plattform)", 6),
    mess("printful", "Versand", "Printful-Rückmeldung", "Printful-Meldung", "gruen",
         "Meldet versendete Printful-Pakete an Shopify. Der letzte Lauf war gestern und grün. Der heutige steht noch aus; "
         "gestern kam er 6 Stunden nach der Plan-Zeit.",
         "Lauf", "2026-11-04T21:22:44Z", "GitHub Actions: printful-tracking.yml, bisher 2 Läufe", 36),
    mess("cj_anlegen", "Versand", "CJ-Bestellungen anlegen", "CJ-Bestellungen", "gelb",
         "Das macht kein Automat ohne Sitzung. Die stündliche «Zahlungswache» (jeweils um :42) weckt die Shop-Sitzung, "
         "zuletzt um 20:42, das nächste Mal um 21:42. Solange diese Sitzung offen ist, legt sie neue Bestellungen "
         "bei CJ an, und du bezahlst danach bei CJ. Sie ist offen und arbeitet gerade. Schliesst sie, bleibt alles liegen.",
         "Wecker", "2026-11-05T19:42:26Z",
         "Geplante Aufgabe «CJ-Zahlungswache»; Zustand der Shop-Sitzung (laufend, Plattformangabe)", 6),
    mess("offene", "Versand", "Bestellungen unterwegs", "Pakete unterwegs", "gelb",
         "Drei bezahlte Bestellungen sind noch nicht versendet. #1036 (CHF 47.61): Die Shop-Sitzung hatte um 18:44 "
         "gemeldet «order #1036 queued for CJ at 18:00 UTC» (19:00 Schweizer Zeit); ob sie angelegt ist, habe ich nicht "
         "gelesen. #1035 (CHF 23.90) ist seit 12:38 bezahlt: Ihren CJ-Stand habe ich nicht gelesen, und du hast gesagt, "
         "ich lege sie nicht an. #1034 (CHF 158.44) ist bei CJ angelegt und von dir bezahlt (Stand 04.11. abends), "
         "der Versand steht aus.",
         "Neueste #1036", "2026-11-05T17:42:47Z",
         "Shopify: Bestellungen (nur Nummer, Betrag, Status); Statuszeile der Shop-Sitzung", 6,
         figur="paket", menge=3, aktiv_h=0),
    # ---- Krypto
    mess("tagesupdate", "Krypto", "Tages-Update", "Tages-Update", "gruen",
         "Täglicher Sammel-Lauf: KI-News, Märkte und die Krypto-Papierbücher. Drei Läufe in Folge grün; "
         "der vom 02.11. war rot (Google-Feed, inzwischen behoben). Heute kam er 8 Stunden nach der Plan-Zeit.",
         "Lauf", "2026-11-05T12:13:23Z", "GitHub Actions: tages-update.yml, letzte 3 Läufe", 36),
    mess("labor", "Krypto", "Scalping-Labor (Papier)", "Scalping-Labor", "gruen",
         "Rechnet kurzfristigen Handel mit echten Kursen, nur auf Papier und ohne Geld. Letzter Lauf ohne Lücken und "
         "ohne Hinweise. Alle 8 Bücher stehen nach Kosten im Minus, bei BTC wie bei ETH. Ein Urteil gibt es erst "
         "nach 14 Tagen Daten; es sind etwa 2.",
         "Lauf", "2026-11-05T12:23:38Z", "Buch data/krypto-scalping-labor.json auf main", 36),
    mess("satellit", "Krypto", "Satelliten-Buch (Papier)", "Satelliten-Buch", "gruen",
         "Spielgeld-Vorwärtstest der Top-10-Regel auf anderen Coins. Die Regel bestand ihren Test nicht, darum wird nur "
         "beobachtet. Stand vom 04.11., zwei Tage Daten. Unter 8 Wochen ist das Rauschen und kein Urteil.",
         "Stand", "2026-11-04T12:00:00Z", "Buch data/krypto-satellit-schatten.json auf main", 36,
         ev_text="Stand 04.11. (letzter abgeschlossener Tag)", aktiv_h=0),
    mess("paket", "Krypto", "Cockpit-Paket", "Cockpit-Paket", "gruen",
         "Programmpaket für dein Krypto-Cockpit, gebaut als Version 2026-11-05.4451279; alle Selbsttests grün. "
         "Auf deinen PC kommt es erst, wenn das Starter-ZIP einmal eingespielt ist (siehe unten).",
         "Gebaut", "2026-11-05T17:16:12Z", "GitHub Actions: krypto-paket.yml; Release krypto-latest", 48),
    mess("krypto_sitzung", "Krypto", "Krypto-Sitzung (Claude)", "Krypto-Sitzung", "gruen",
         "Diese Sitzung ist offen und arbeitet gerade an der Büro-Szene. Sie betreut den Krypto-Teil und fasst "
         "Shop und CJ nicht an.",
         "Aktiv", "2026-11-05T20:21:46Z", "Plattformangabe (get_session)", 3, aktiv_h=1),
    # ---- Chefbüro (für dich)
    mess("bestellungen7", "Chefbüro", "Bestellungen, 7 Tage", "Bestellungen 7 Tage", "du",
         "5 Bestellungen, zusammen CHF 285.58 inklusive Versand: #1032, #1033, #1034, #1035 und #1036. "
         "Die jüngste ist von heute 18:42.",
         "Jüngste", "2026-11-05T17:42:47Z", "Shopify: Bestellungen (nur Nummer, Betrag, Datum)", 12,
         figur="tafel", menge=5, aktiv_h=0),
    frage("zip", "Starter-ZIP einspielen", "ZIP einspielen",
          "Einmal über den alten Ordner entpacken (Schritt für Schritt im Chat, 05.11.). Danach holt sich dein PC jedes Programm-Update selbst. "
          "Ob das schon passiert ist, sehe ich von hier nicht.",
          "Anleitung 05.11.", "05.11.", "CLAUDE.md, Stand 05.11. (Krypto)"),
    frage("cockpitstart", "Cockpit unsichtbar beim Start", "Cockpit-Autostart",
          "Du hast Ja gesagt (05.11.). Gebaut: das Cockpit startet beim Windows-Anmelden still im Hintergrund. "
          "Es kommt mit dem nächsten Programm-Update auf deinen PC, sobald das ZIP einmal eingespielt ist.",
          "Ja 05.11.", "05.11.", "Besitzer-Antwort 05.11., CLAUDE.md, Stand 05.11. (Krypto)"),
    frage("geld", "Etsy oder Anzeigen", "Etsy oder Anzeigen",
          "Zwei Wege, Geld zu verdienen, warten auf deinen Entscheid: Etsy oder Anzeigen (Rest bei Google CHF 58). "
          "Ausgeben kann ich nichts ohne dein Ja.",
          "Offen seit 04.11.", "04.11.", "CLAUDE.md, Stand 04.11."),
]


# ---- Arbeitsorte (05.11.2026, Besitzer: «echter Arbeitsort»): wo jede Figur wirklich läuft.
# Belege: .github/workflows/*.yml (Zeitpläne in UTC), geplante Aufgaben der Plattform (list_triggers), CLAUDE.md, docs/KRYPTO-AUTONOMIE.md.
GH = "https://github.com/allengchour-glitch/aban-news-landing"
WF = GH + "/actions/workflows/"
SHOP = "https://admin.shopify.com/store/au3j0y-hq"
S_SHOP = "https://claude.ai/code/session_01MCYpvsTg9cwVa1SwQZ39f3"
S_KRYPTO = "https://claude.ai/code/session_01GGjxkpYFvQGRnX9MAzUyAF"
ORTE = {
    "auswahl": ("cloud", "GitHub-Cloud", "GitHub", "GitHub Actions, Datei auswahl-lauf.yml. Plan: jede Nacht 21:50 UTC.", WF + "auswahl-lauf.yml"),
    "schaufenster": ("cloud", "GitHub-Cloud", "GitHub", "GitHub Actions, Datei gmc-schaufenster.yml. Plan: täglich 04:41 UTC.", WF + "gmc-schaufenster.yml"),
    "waechter": ("cloud", "GitHub-Cloud", "GitHub", "GitHub Actions, Datei lager-waechter.yml. Plan: täglich 05:17 UTC.", WF + "lager-waechter.yml"),
    "autopilot": ("cloud", "GitHub-Cloud", "GitHub", "GitHub Actions, Datei shop-autopilot.yml. Plan: täglich 06:45 UTC.", WF + "shop-autopilot.yml"),
    "fortura": ("cloud", "GitHub-Cloud", "GitHub",
                "GitHub Actions, Datei fortura-bestand.yml. Plan: täglich 03:51 UTC, bisher nie gelaufen; Zugang eingetragen, ohne Freigabedatei nur lesend. Den heutigen Abgleich hat die Shop-Sitzung von Hand gemacht.",
                WF + "fortura-bestand.yml"),
    "shop_sitzung": ("claude", "Claude-Sitzung (Cloud)", "Claude",
                     "Eine offene Claude-Sitzung in der Cloud (claude.ai/code) mit Zugriff auf Shopify und CJ. Sie arbeitet nur, solange sie offen ist.", S_SHOP),
    "bestellwaechter": ("claude", "Claude-Cloud (geplante Aufgabe)", "Claude",
                        "Geplante Aufgabe der Claude-Plattform, alle 2 Stunden (Minute 20, UTC). Jeder Lauf startet eine frische Sitzung in der Cloud.", ""),
    "printful": ("cloud", "GitHub-Cloud", "GitHub", "GitHub Actions, Datei printful-tracking.yml. Plan: täglich 15:23 UTC.", WF + "printful-tracking.yml"),
    "cj_anlegen": ("claude", "Claude-Sitzung (Shop)", "Claude",
                   "Die Shop-Sitzung legt die Bestellungen an, geweckt von der stündlichen Zahlungswache (jeweils Minute 42, geplante Aufgabe auf diese Sitzung). Bezahlen tust du bei CJ.", S_SHOP),
    "offene": ("shop", "Shopify und CJ", "Shopify",
               "Die Bestellungen stehen im Shopify-Admin unter Bestellungen. Der Versand der Pakete läuft bei CJ, Zahlung und Sendungsstand siehst du dort.", SHOP + "/orders"),
    "tagesupdate": ("cloud", "GitHub-Cloud", "GitHub", "GitHub Actions, Datei tages-update.yml. Plan: täglich 04:15 UTC.", WF + "tages-update.yml"),
    "labor": ("cloud", "GitHub-Cloud und dein PC", "GitHub + PC",
              "Rechnet in der Cloud (Tages-Update, Job ki-bot-schatten) und täglich auf deinem Windows-PC als letzter Schritt von krypto-auto.bat. Nur Papier.", WF + "tages-update.yml"),
    "satellit": ("cloud", "GitHub-Cloud", "GitHub",
                 "Das Papierbuch rechnet die Cloud (Tages-Update, Job ki-bot-schatten). Der Testnetz-Satellit mit Spielgeld läuft getrennt auf deinem PC.", WF + "tages-update.yml"),
    "paket": ("cloud", "GitHub-Cloud, dann dein PC", "GitHub",
              "GitHub Actions, Datei krypto-paket.yml: baut bei jeder Änderung an tools/trading/ in main. Dein PC holt das Paket als Release krypto-latest, sobald das Starter-ZIP einmal eingespielt ist.",
              WF + "krypto-paket.yml"),
    "krypto_sitzung": ("claude", "Claude-Sitzung (Cloud)", "Claude",
                       "Eine offene Claude-Sitzung in der Cloud (claude.ai/code). Sie betreut den Krypto-Teil und fasst Shop und CJ nicht an.", S_KRYPTO),
    "bestellungen7": ("shop", "Shopify", "Shopify", "Die Zahlen stehen im Shopify-Admin unter Bestellungen.", SHOP + "/orders"),
    "zip": ("pc", "Dein Windows-PC", "Dein PC", "Das ZIP entpackst du einmal über den alten Ordner deines Krypto-Cockpits auf dem Windows-PC.", ""),
    "cockpitstart": ("pc", "Dein Windows-PC", "Dein PC", "Eine Windows-Aufgabe beim Anmelden auf deinem PC (Aufgabe «Krypto-Cockpit-Start»). Du hast Ja gesagt; ausschalten kannst du sie im Cockpit.", ""),
    "geld": ("du", "Bei dir (Entscheid)", "Bei dir", "Das entscheidest du. Danach läuft es in deinem Etsy-Konto oder in Google Ads.", ""),
}
# QUELLE: Workflow-Konfigurationen am 07.11.2026 gelesen, keine Laufmessung.
# Auskommentierte Zeitpläne sind kein laufender Automat; gelb bleibt ausdrücklich unbestätigt.
for _id, _kurz, _file in [
    ("social_meta", "Instagram / Facebook", "social-meta-autopost.yml"),
    ("social_pinterest", "Pinterest", "pinterest-publish.yml"),
    ("social_linkedin", "LinkedIn", "linkedin-autopost.yml"),
]:
    ROWS.append({
        "id": _id, "bereich": "Social Media", "name": _kurz, "kurz": _kurz,
        "status": "gelb", "befund": "Der automatische Zeitplan ist in der Workflow-Datei auskommentiert. Handstart ist vorgesehen. Letzter Lauf, Kontoverbindung und veröffentlichte Beiträge wurden nicht geprüft.",
        "ereignis": "Zeitplan pausiert (Dateistand 07.11.)", "ereignis_iso": "",
        "gemessen": "", "gemessen_text": "Keine Laufmessung", "frisch_h": 0,
        "quelle": ".github/workflows/" + _file + " (Konfiguration gelesen 07.11.2026)",
        "figur": "arbeiter", "menge": 0, "aktiv_h": 0,
    })
    ORTE[_id] = ("cloud", "GitHub-Cloud (Handstart)", "GitHub",
                 "Workflow " + _file + ": Zeitplan auskommentiert. Handstart über GitHub Actions; letzter Lauf und Kontoverbindung nicht geprüft.",
                 "https://github.com/allengchour-glitch/aban-news-landing/actions/workflows/" + _file)

# Die Werkstatt ist ein lokaler Ablauf auf Befehl, kein dauerhaft arbeitender Agent.
for _id, _name in [("dev_bauen", "Produktbau"), ("dev_pruefen", "Prüfstand"), ("dev_angebot", "Verkaufsunterlagen")]:
    ROWS.append({
        "id": _id, "bereich": "Entwicklerbüro", "name": _name, "kurz": _name,
        "status": "gelb", "befund": "Kein Werkstatt-Bericht geladen. Die Station zeigt keinen laufenden Agenten. werkstatt.py prüft und paketiert den Anfragen-Assistenten auf Befehl.",
        "ereignis": "Kein Durchlauf gemessen", "ereignis_iso": "", "gemessen": "", "gemessen_text": "Nicht gemessen",
        "frisch_h": 0, "quelle": "tools/entwicklerbuero/werkstatt.py", "figur": "arbeiter", "menge": 0, "aktiv_h": 0,
    })
    ORTE[_id] = ("pc", "Ausführungsrechner der Werkstatt", "Werkstatt",
                 "werkstatt.py läuft auf dem Rechner, auf dem es gestartet wird. Kein Dauerlauf; keine automatische Veröffentlichung oder Kontaktaufnahme.",
                 "https://github.com/allengchour-glitch/aban-news-landing/tree/main/tools/entwicklerbuero")

ROWS.append(frage("seitenpflege", "Tägliche Seitenpflege", "Seiten & Suchmaschinen",
                  "Kein Tagespflege-Bericht geladen. Den letzten Lauf und seine Berichte öffnen. Suchmaschinen-Meldungen brauchen eingerichtete Zugänge; eine Indexaufnahme ist nicht gemessen.",
                  "Kein Durchlauf geladen", "Nicht gemessen", "tools/buero/tagespflege.py; buero-tagespflege.yml"))
ORTE["seitenpflege"] = ("cloud", "GitHub-Cloud", "GitHub",
                         "Teil von tages-update.yml (04:15 UTC). Kein zusätzlicher Zeitplan. Das Büro braucht die neue buero.json als Datenquelle.",
                         WF + "buero-tagespflege.yml")

for _r in ROWS:
    _art, _ort, _kurz, _text, _link = ORTE[_r["id"]]
    _r.update({"ort_art": _art, "ort": _ort, "ort_kurz": _kurz, "ort_text": _text, "link": _link})


def pruefen(rows):
    ids = [r["id"] for r in rows]
    assert len(ids) == len(set(ids)), "doppelte id"
    for r in rows:
        assert r["status"] in ("gruen", "gelb", "rot", "du"), r["id"]
        assert r["bereich"] in ("Shop", "Versand", "Krypto", "Chefbüro", "Social Media", "Entwicklerbüro"), r["id"]
        assert r["figur"] in ("arbeiter", "paket", "tafel", "papier"), r["id"]
        assert isinstance(r["frisch_h"], int) and isinstance(r["aktiv_h"], int) and isinstance(r["menge"], int)
        assert (r["frisch_h"] == 0) == (r["gemessen"] == ""), r["id"]
        assert len(r["befund"]) <= 560, (r["id"], len(r["befund"]))
        assert len(r["kurz"]) <= 22, (r["id"], r["kurz"])
        if r["figur"] in ("paket", "tafel"):
            assert r["menge"] > 0, r["id"]
        assert r["ort_art"] in ("cloud", "claude", "pc", "shop", "du"), r["id"]
        assert 0 < len(r["ort_kurz"]) <= 11 and r["ort"] and r["ort_text"], r["id"]
        assert len(r["ort_text"]) <= 260, (r["id"], len(r["ort_text"]))
        assert r["link"] == "" or r["link"].startswith("https://"), r["id"]


def aktionen(rows):
    schritte = {
        "auswahl": "Ergebnisliste ansehen und die vorgeschlagenen Produkte prüfen.",
        "schaufenster": "Letzten Feed-Lauf ansehen und abgewiesene Artikel prüfen.",
        "waechter": "Lager- und Lieferbarkeitsbefunde im letzten Lauf ansehen.",
        "autopilot": "Letzten Lauf und dessen konkrete Änderungen prüfen.",
        "fortura": "Bestandsabgleich ansehen; Freigaben bleiben beim Besitzer.",
        "offene": "Offene Bestellungen im Shopify-Admin prüfen und den Versandstatus abgleichen.",
        "bestellungen7": "Die aktuellen Bestellungen im Shopify-Admin ansehen.",
        "dev_bauen": "Werkstatt in GitHub öffnen, bei Bedarf starten und das ZIP im Lauf herunterladen.",
        "dev_pruefen": "Werkstatt-Prüfung öffnen und fehlgeschlagene Tests ansehen.",
        "dev_angebot": "Angebotsentwurf prüfen und Pilotumfang sowie Preis festlegen.",
        "seitenpflege": "Tagespflege öffnen: Seitenbericht und neue buero.json im letzten Lauf herunterladen. Für Google die Sitemap in Search Console prüfen.",
        "zip": "Aktuelles Cockpit-Paket herunterladen und auf deinem PC einspielen.",
        "cockpitstart": "Cockpit-Anleitung öffnen und den Start auf deinem PC prüfen.",
    }
    for r in rows:
        link = r["link"] or GH + "/blob/main/docs/KI-BUERO-SEITE.md"
        if r["id"] in ("dev_bauen", "dev_pruefen"):
            link = WF + "entwicklerbuero-tests.yml"
        if r["id"] == "dev_angebot":
            link = GH + "/blob/main/tools/entwicklerbuero/PROJEKT.md"
        if r["id"] == "zip":
            link = GH + "/releases/tag/krypto-latest"
        r["naechster_schritt"] = schritte.get(r["id"], "Arbeitsort öffnen und den dort belegten Stand prüfen. Alte Messwerte zuerst aktualisieren.")
        r["aktion_url"] = link
        r["aktion_text"] = "Aufgabe öffnen"
        r["aktion_hinweis"] = "Der Link öffnet den Arbeitsort. Er startet oder ändert noch nichts."
        if "/actions/workflows/" in link:
            r["aktion_text"] = "Ablauf öffnen"
            r["aktion_hinweis"] = "Falls GitHub einen Handstart anbietet, zusätzlich auf Run workflow klicken."
        if r["id"].startswith("social_"):
            r["naechster_schritt"] = "Letzten Lauf und vorbereitete Beiträge prüfen. Ein Handstart dieses Ablaufs kann Beiträge veröffentlichen."


def pflege_einlesen(pfad, rows):
    from pathlib import Path
    report = json.loads(Path(pfad).read_text(encoding="utf-8"))
    if not isinstance(report, dict) or report.get("version") != 1 or report.get("seite") != "abannews.com":
        raise ValueError("Unbekannter Tagespflege-Bericht.")
    gem = report["gemessen"]
    now = datetime.fromisoformat(gem.replace("Z", "+00:00"))
    if now.tzinfo is None or not isinstance(report.get("github"), dict):
        raise ValueError("Tagespflege braucht eine Zeitzone und GitHub-Stände.")
    for r in rows:
        if r["id"] == "seitenpflege":
            index = report["indexnow"]
            unklar = sum(f.get("problem") == "Datei oder URL nicht prüfbar" for f in report["seiten"]["befunde"])
            findings = len(report["seiten"]["befunde"]) - unklar
            google = report.get("google", {})
            google_status = google.get("status", "Nicht eingerichtet") if isinstance(google, dict) else "Nicht eingerichtet"
            google_ok = google_status in ("Keine Änderungen", "Sitemap gemeldet; Indexierung nicht bestätigt")
            r.update({"status": "gelb" if findings or unklar or not google_ok or index["status"] not in ("Keine Änderungen", "URLs gemeldet; Indexierung nicht bestätigt") else "gruen",
                      "gemessen": gem, "gemessen_text": zeit(gem), "frisch_h": 30,
                      "ereignis": "Prüfung " + zeit(gem), "ereignis_iso": gem,
                      "befund": f"{report['seiten']['html_geprueft']} HTML-Seiten geprüft, {findings} Inhaltshinweise, {unklar} Sitemap-URLs lokal nicht prüfbar. Google: {google_status}. IndexNow: {index['status']}. Google-Indexierung und Live-HTTP nicht gemessen. Neue Bürodatei liegt im Lauf als Download bereit."})
            continue
        run = report["github"].get(r["id"])
        if not isinstance(run, dict):
            continue  # Andere Quellen werden nicht künstlich frisch gemacht.
        r.update({"gemessen": gem, "gemessen_text": zeit(gem), "frisch_h": 30, "aktiv_h": 0,
                  "quelle": "GitHub Actions API, letzter Workflow-Lauf; tagespflege.py"})
        if run.get("fehler"):
            r.update({"status": "gelb", "befund": "Aktueller GitHub-Stand nicht messbar: " + str(run["fehler"])[:120] + ". Vorherige Aussagen sind damit nicht neu bestätigt.",
                      "ereignis": "Abruf nicht messbar", "ereignis_iso": ""})
            continue
        ev = run["zeit"]
        event = datetime.fromisoformat(ev.replace("Z", "+00:00"))
        if event.tzinfo is None:
            raise ValueError("Workflow-Zeit braucht eine Zeitzone.")
        status, conclusion = run["status"], run.get("conclusion")
        frisch = 0 <= (now - event).total_seconds() <= 48 * 3600
        r["status"] = "rot" if status == "completed" and conclusion in ("failure", "timed_out", "action_required") else "gruen" if status == "completed" and conclusion == "success" and frisch and run["geplant"] else "gelb"
        r["ereignis"], r["ereignis_iso"] = "Lauf " + zeit(ev), ev
        plan = "Zeitplan in der Datei vorhanden" if run["geplant"] else "kein Tages-Cron in der Datei; andere Auslöser im Ablauf prüfen"
        r["befund"] = f"Letzter Workflow-Lauf: {status}, Ergebnis {conclusion or 'noch offen'}. {plan}. Das ist ein Workflow-Ergebnis, keine neue Messung von Bestellungen, Lagerbestand oder Krypto-Büchern."


def werkstatt_einlesen(pfad, rows):
    from pathlib import Path
    p = Path(pfad)
    if p.stat().st_size > 16384:
        raise ValueError("Werkstatt-Bericht ist zu gross.")
    report = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(report, dict):
        raise ValueError("Werkstatt-Bericht muss ein Objekt sein.")
    if report.get("version") != 1 or report.get("projekt") != "anfragen-assistent" or report.get("dauerlauf") is not False:
        raise ValueError("Unbekannter Werkstatt-Bericht.")
    gem = report["gemessen"]
    if datetime.fromisoformat(gem.replace("Z", "+00:00")).tzinfo is None:
        raise ValueError("Werkstatt-Zeit braucht eine Zeitzone.")
    stationen = report["stationen"]
    erlaubt = {"bauen": {"offen", "bestanden"}, "pruefen": {"offen", "bestanden", "fehlgeschlagen"}, "angebot": {"offen", "entwurf"}}
    if not isinstance(stationen, dict) or set(stationen) != set(erlaubt) or any(stationen[k] not in erlaubt[k] for k in erlaubt):
        raise ValueError("Unbekannter Werkstatt-Zustand.")
    if stationen["bauen"] == "bestanden" and stationen["pruefen"] != "bestanden":
        raise ValueError("Ein Paket darf nur nach bestandener Prüfung freigegeben sein.")
    texte = {
        "bauen": "Demo und ZIP-Lieferpaket für E-Mail- und Kommentarentwürfe wurden erstellt. Lokaler Prototyp; Postfach- und CRM-Anbindung sind noch nicht gebaut.",
        "pruefen": "Der lokale Selbsttest des Anfragen-Assistenten hat bestanden. Kein Nachweis für Daten oder Systeme eines echten Kunden.",
        "angebot": "Ein Angebotsentwurf liegt vor. Preis, Verkaufskanal und Kundenpilot sind offen; keine Verkäufe gemessen.",
    }
    for row in rows:
        if not row["id"].startswith("dev_"):
            continue
        key = row["id"][4:]
        wert = stationen[key]
        row.update({"gemessen": gem, "gemessen_text": zeit(gem), "frisch_h": 24,
                    "ereignis_iso": gem, "ereignis": "Werkstatt " + zeit(gem), "quelle": "werkstatt.py: status.json (lokaler Durchlauf)"})
        row["status"] = {"bestanden": "gruen", "fehlgeschlagen": "rot", "entwurf": "du", "offen": "gelb"}[wert]
        row["befund"] = (texte[key] if wert in ("bestanden", "entwurf") else
                         "Die lokale Prüfung ist fehlgeschlagen; kein Lieferpaket freigegeben." if wert == "fehlgeschlagen" else
                         "Station noch offen. Dieser Bericht bestätigt keinen abgeschlossenen Schritt.") + " Kein Dauerlauf."


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ausgabe")
    parser.add_argument("--werkstatt-status")
    parser.add_argument("--pflege-status")
    parser.add_argument("--nur-github", action="store_true")
    args = parser.parse_args()
    if args.werkstatt_status:
        try:
            werkstatt_einlesen(args.werkstatt_status, ROWS)
        except (OSError, ValueError, KeyError, TypeError) as e:
            parser.exit(2, "Werkstatt-Bericht abgelehnt: " + str(e) + "\n")
    if args.pflege_status:
        try:
            pflege_einlesen(args.pflege_status, ROWS)
        except (OSError, ValueError, KeyError, TypeError) as e:
            parser.exit(2, "Tagespflege-Bericht abgelehnt: " + type(e).__name__ + "\n")
    if args.nur_github:
        if not args.pflege_status:
            parser.exit(2, "--nur-github braucht --pflege-status.\n")
        report = json.loads(open(args.pflege_status, encoding="utf-8").read())
        ROWS = [r for r in ROWS if r["id"] in report["github"] or r["id"] == "seitenpflege"]
    aktionen(ROWS)
    pruefen(ROWS)
    out = args.ausgabe
    with open(out, "w", encoding="utf-8") as f:
        json.dump(ROWS, f, ensure_ascii=False, indent=1)
        f.write("\n")
    zaehl = {}
    figuren = {}
    for r in ROWS:
        zaehl[r["status"]] = zaehl.get(r["status"], 0) + 1
        figuren[r["figur"]] = figuren.get(r["figur"], 0) + 1
    print("Zeilen:", len(ROWS), zaehl, figuren)
    for r in ROWS:
        print(f'{r["id"]:<16}{r["status"]:<6}{r["figur"]:<9}{r["ereignis"]:<26}Stand {r["gemessen_text"]:<12} {len(r["befund"])} Zeichen')
