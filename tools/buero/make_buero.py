#!/usr/bin/env python3
"""Baut buero.json (die Zeilen des KI-Büros) aus den Messungen vom 05.11.2026, Fassung 2 (mit Szene).

Zeiten stehen im Datensatz als ISO (UTC) und als fertiger Text in Schweizer Zeit,
damit die Seite sie unverändert anzeigen kann. Aufruf: python3 -I make_buero.py <Ausgabedatei> [werte.json]
(werte.json schreibt aktualisieren.py aus den Messungen; ohne sie gelten die Texte und Zeiten dieser Datei)

Spalten (alle Zeilen haben alle Spalten):
  id, bereich, name, kurz, status, befund, ereignis, ereignis_iso, gemessen, gemessen_text, frisch_h, quelle
  figur   : arbeiter (Figur am Schreibtisch), paket (Fliessband), tafel (Wandtafel), papier (Blatt auf dem Chefpult)
  menge   : Zahl für paket (Pakete) und tafel (grosse Zahl), sonst 0
  aktiv_h : so viele Stunden nach dem Ereignis zählt die Figur als «arbeitet gerade» (0 = nie)
  ort_art : cloud (GitHub), claude (Claude-Sitzung oder geplante Aufgabe), pc (dein Windows-PC), shop (Shopify), du (bei dir)
  ort     : der echte Arbeitsort als kurzer Satzteil;  ort_kurz: höchstens 11 Zeichen für Beschriftung und Schild
  ort_text: wo und wann es wirklich läuft (belegt in .github/workflows, geplanten Aufgaben, CLAUDE.md);  link: https-Adresse des echten Ortes oder leer
"""
import json
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

CH = ZoneInfo("Europe/Zurich")
GEM = "2026-11-06T06:30:00Z"  # Messung dieses Durchgangs (GitHub, Shopify, geplante Aufgaben, Sitzungen)


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
         "Zieht nachts Farben und Grössen der CJ-Produkte nach. Die letzten drei Läufe waren grün (04., 05. und 06.11.), "
         "am 02. und 03.11. war er rot. Wie viele Produkte er heute geändert hat, habe ich nicht gelesen.",
         "Lauf", "2026-11-06T01:50:04Z", "GitHub Actions: auswahl-lauf.yml, letzte 3 Läufe", 36),
    mess("schaufenster", "Shop", "Google-Schaufenster", "Google-Schaufenster", "gruen",
         "Hält die Zahl der Varianten bei Google unter der Quote. Vier Läufe in Folge grün (02. bis 05.11.). "
         "Gestern kamen 616 neue Zeilen ins Manifest, der heutige Lauf steht noch aus. Ob Google die Quote jetzt als eingehalten zeigt, ist ungemessen.",
         "Lauf", "2026-11-05T12:42:55Z", "GitHub Actions: gmc-schaufenster.yml, letzte 3 Läufe", 36),
    mess("waechter", "Shop", "Lager-Wächter", "Lager-Wächter", "gruen",
         "Stellt ausverkaufte Produkte in den Kategorien nach hinten. Der erste Lauf nach Zeitplan war gestern grün, "
         "er kam 8 Stunden nach der Plan-Zeit, der heutige steht noch aus. Was er umsortiert hat, habe ich nicht gelesen.",
         "Lauf", "2026-11-05T13:18:29Z", "GitHub Actions: lager-waechter.yml, bisher 2 Läufe", 36),
    mess("autopilot", "Shop", "Shop-Autopilot", "Shop-Autopilot", "gruen",
         "Tägliche Shop-Wartung: SEO für neue Produkte, Bild-Kontrolle und Gesundheitsbericht. "
         "Drei Läufe in Folge grün. Ob das etwas verkauft, ist nicht gemessen.",
         "Lauf", "2026-11-05T14:56:26Z", "GitHub Actions: shop-autopilot.yml, letzte 3 Läufe", 36),
    mess("fortura", "Shop", "Fortura-Bestand", "Fortura-Bestand", "gelb",
         "Der Zugang kommt in GitHub an: der Probelauf von heute 07:06 holte den Feed und lief ohne Fehler (nur lesend, weil die Freigabedatei fehlt). "
         "Damit der Abgleich jeden Tag selbst schreibt, muss die Freigabedatei in main liegen, das ist dein Ja (Blatt unten). "
         "Der letzte Abgleich mit Schreiben war von Hand am 05.11. um 12:57; diese Zahlen im Shop gelten bis heute etwa 14:57.",
         "Probelauf", "2026-11-06T06:06:45Z",
         "GitHub Actions: fortura-bestand.yml, 1 Lauf (Probelauf 06.11.); Freigabedatei in main: fehlt; letzter Schreib-Abgleich von Hand 05.11.", 24),
    mess("shop_sitzung", "Shop", "Shop-Sitzung (Claude)", "Shop-Sitzung", "gruen",
         "Die Claude-Sitzung, die den Shop betreut, ist offen und arbeitet gerade. Laut Plattform zuletzt: "
         "«reviewer 1 back; reviewer 3 running; next check 06:18 UTC». Sie legt CJ-Bestellungen an, "
         "wenn die Zahlungswache sie weckt.",
         "Aktiv", "2026-11-06T06:02:50Z", "Plattformangabe (get_session), Fremdtext nur zitiert", 3, aktiv_h=1),
    mess("social_redaktion", "Shop", "Social-Redaktion", "Social-Redaktion", "gruen",
         "Schreibt jeden Morgen die Beitragstexte für die nächsten Tage und legt sie in eine Warteschlange im Shop. Sie postet nie selbst. "
         "Der letzte Lauf war heute 06:01 und erfolgreich (9 Minuten). Ob aus dieser Warteschlange noch gepostet wird, habe ich nicht gemessen: "
         "die geplanten Beiträge laufen über Metricool.",
         "Lauf", "2026-11-06T05:01:48Z", "Geplante Aufgabe «Social-Redaktion» (Angaben der Plattform)", 30),
    mess("social_planer", "Shop", "Social-Planer (Metricool)", "Social-Planer", "gruen",
         "In Metricool stehen für den 05. bis 13.11. 43 Beiträge: 8 Veröffentlichungen sind draussen, 57 warten (Facebook, Instagram, TikTok, YouTube, "
         "Pinterest), keine mit Fehler. Der nächste kommt heute um 10:00. Der erste YouTube-Short ist gestern 20:00 erschienen.",
         "Zuletzt gepostet", "2026-11-05T19:00:00Z", "Metricool: geplante Beiträge 05. bis 13.11. (Planer)", 30),
    mess("kommentare", "Shop", "Kommentar-Wächter", "Kommentar-Wächter", "gelb",
         "Zwei fertige Skripte für Instagram und Facebook: Spam ausblenden (lässt sich zurückholen) und auf Fragen und Komplimente antworten. "
         "Beide waren seit dem 13.06. abgeschaltet. Heute 07:06 als Trockenlauf gestartet: die Meta-Schlüssel gelten, 0 Spam, 0 offene Kommentare. "
         "Der Spam-Zeitplan ist ab heute wieder an, das Antworten bleibt aus, bis du entscheidest.",
         "Probelauf", "2026-11-06T06:06:38Z", "GitHub Actions: social-comment-moderate.yml und social-comment-reply.yml, Handlauf 06.11.", 30),
    # ---- Versand
    mess("bestellwaechter", "Versand", "Bestellwächter", "Bestellwächter", "gruen",
         "Prüft alle 2 Stunden neue Bestellungen auf Lieferbarkeit. Letzter Lauf 05:20 (31 Sekunden, erfolgreich), "
         "nächster 07:20. Was der letzte Lauf gemeldet hat, habe ich nicht gelesen.",
         "Lauf", "2026-11-06T04:20:17Z", "Geplante Aufgabe «Bestellwächter» (Angaben der Plattform)", 6),
    mess("printful", "Versand", "Printful-Rückmeldung", "Printful-Meldung", "gruen",
         "Meldet versendete Printful-Pakete an Shopify. Der letzte Lauf war gestern um 22:29 und grün. Der heutige steht noch aus; "
         "gestern kam er 6 Stunden nach der Plan-Zeit.",
         "Lauf", "2026-11-05T21:29:27Z", "GitHub Actions: printful-tracking.yml, bisher 3 Läufe", 36),
    mess("cj_anlegen", "Versand", "CJ-Bestellungen anlegen", "CJ-Bestellungen", "gelb",
         "Das macht kein Automat ohne Sitzung. Die stündliche «Zahlungswache» (jeweils um :42) weckt die Shop-Sitzung, "
         "zuletzt um 06:42, das nächste Mal um 07:42. Solange diese Sitzung offen ist, legt sie neue Bestellungen "
         "bei CJ an, und du bezahlst danach bei CJ. Sie ist offen und arbeitet gerade. Schliesst sie, bleibt alles liegen.",
         "Wecker", "2026-11-06T05:42:43Z",
         "Geplante Aufgabe «CJ-Zahlungswache»; Zustand der Shop-Sitzung (laufend, Plattformangabe)", 6),
    mess("offene", "Versand", "Bestellungen unterwegs", "Pakete unterwegs", "gelb",
         "Drei bezahlte Bestellungen sind noch nicht versendet: #1036 (CHF 47.61), #1035 (CHF 23.90) und #1034 (CHF 158.44). "
         "Seit gestern 18:42 ist keine neue dazugekommen. Den CJ-Stand habe ich nicht gelesen: #1034 war am 04.11. abends bei CJ "
         "angelegt und von dir bezahlt, bei #1036 meldete die Shop-Sitzung gestern «queued for CJ at 18:00 UTC», und #1035 lege ich "
         "nicht an, das hast du so gesagt.",
         "Neueste #1036", "2026-11-05T17:42:47Z",
         "Shopify: Bestellungen (nur Nummer, Betrag, Status); Statuszeile der Shop-Sitzung", 6,
         figur="paket", menge=3, aktiv_h=0),
    # ---- Krypto
    mess("tagesupdate", "Krypto", "Tages-Update", "Tages-Update", "gruen",
         "Täglicher Sammel-Lauf: KI-News, Märkte und die Krypto-Papierbücher. Drei Läufe in Folge grün; "
         "der vom 02.11. war rot (Google-Feed, inzwischen behoben). Gestern kam er 8 Stunden nach der Plan-Zeit, der heutige steht noch aus.",
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
         "Programmpaket für dein Krypto-Cockpit, gebaut als Version 2026-11-06.9257012 (mit dem Cockpit-Autostart); alle Selbsttests grün. "
         "Auf deinen PC kommt es erst, wenn das Starter-ZIP einmal eingespielt ist (siehe unten).",
         "Gebaut", "2026-11-06T06:11:34Z", "GitHub Actions: krypto-paket.yml; Release krypto-latest", 48),
    mess("krypto_sitzung", "Krypto", "Krypto-Sitzung (Claude)", "Krypto-Sitzung", "gruen",
         "Diese Sitzung ist offen und arbeitet gerade an der Social-Reihe im Büro. Sie betreut den Krypto-Teil und fasst "
         "Shop und CJ nicht an.",
         "Aktiv", "2026-11-06T06:30:00Z", "Plattformangabe (get_session)", 3, aktiv_h=1),
    # ---- Chefbüro (für dich)
    mess("bestellungen7", "Chefbüro", "Bestellungen, 7 Tage", "Bestellungen 7 Tage", "du",
         "5 Bestellungen, zusammen CHF 285.58 inklusive Versand: #1032, #1033, #1034, #1035 und #1036. "
         "Die jüngste ist von gestern 18:42.",
         "Jüngste", "2026-11-05T17:42:47Z", "Shopify: Bestellungen (nur Nummer, Betrag, Datum)", 12,
         figur="tafel", menge=5, aktiv_h=0),
    frage("zip", "Starter-ZIP einspielen", "ZIP einspielen",
          "Einmal über den alten Ordner entpacken (Schritt für Schritt im Chat, 05.11.). Danach holt sich dein PC jedes Programm-Update selbst, "
          "auch das neue mit dem Cockpit-Autostart (gebaut 06.11. 07:11). Ob das schon passiert ist, sehe ich von hier nicht.",
          "Anleitung 05.11.", "05.11.", "CLAUDE.md, Stand 05.11. (Krypto)"),
    frage("cockpitstart", "Cockpit unsichtbar beim Start", "Cockpit-Autostart",
          "Du hast Ja gesagt (05.11.). Gebaut und in main (06.11. 07:05): das Cockpit startet beim Windows-Anmelden still im Hintergrund. "
          "Es kommt mit dem Paket 2026-11-06.9257012 auf deinen PC, sobald das ZIP einmal eingespielt ist.",
          "Gemergt 06.11.", "06.11.", "PR #2906, CLAUDE.md, Stand 06.11. (Krypto)"),
    frage("geld", "Etsy oder Anzeigen", "Etsy oder Anzeigen",
          "Zwei Wege, Geld zu verdienen, warten auf deinen Entscheid: Etsy oder Anzeigen (Rest bei Google CHF 58). "
          "Ausgeben kann ich nichts ohne dein Ja.",
          "Offen seit 04.11.", "04.11.", "CLAUDE.md, Stand 04.11."),
    frage("fortura_frei", "Fortura-Abgleich täglich live", "Fortura live?",
          "Der Probelauf in GitHub war sauber (06.11. 07:06, nur lesend, der Zugang kommt an). Mit deinem Ja lege ich die Freigabedatei in main, "
          "dann schreibt der Abgleich jeden Tag von selbst den Bestand in den Shop. Ohne Ja bleibt es beim Handbetrieb.",
          "Frage 06.11.", "06.11.", "Probelauf fortura-bestand.yml 06.11., CLAUDE.md, Stand 05.11."),
    frage("kommentare_frage", "Kommentare: selbst antworten?", "Kommentare antworten",
          "Bisher antwortet nichts von selbst. Mein Vorschlag: Spam wird automatisch ausgeblendet (lässt sich zurückholen), auf Fragen und "
          "Komplimente bekommst du nur Antwort-Vorschläge. Sag «automatisch antworten», wenn die Antworten ohne dich rausgehen sollen.",
          "Frage 06.11.", "06.11.", "Trockenlauf social-comment-reply.yml 06.11."),
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
                "GitHub Actions, Datei fortura-bestand.yml. Plan: täglich 03:51 UTC, bisher nur der Probelauf vom 06.11. (Zugang ok, ohne Freigabedatei nur lesend). Den letzten Abgleich mit Schreiben hat die Shop-Sitzung am 05.11. von Hand gemacht.",
                WF + "fortura-bestand.yml"),
    "shop_sitzung": ("claude", "Claude-Sitzung (Cloud)", "Claude",
                     "Eine offene Claude-Sitzung in der Cloud (claude.ai/code) mit Zugriff auf Shopify und CJ. Sie arbeitet nur, solange sie offen ist.", S_SHOP),
    "social_redaktion": ("claude", "Geplante Claude-Aufgabe", "Claude",
                         "Geplante Aufgabe auf claude.ai, täglich 06:00 Schweizer Zeit. Sie legt die Texte im Shop ab (Metafeld luxestyle.social_queue) und postet nichts.", ""),
    "social_planer": ("claude", "Metricool, geplant von der Shop-Sitzung", "Metricool",
                      "Metricool veröffentlicht die geplanten Beiträge selbst. Geplant und eingestellt hat sie die Shop-Sitzung. In GitHub läuft dafür nichts.", ""),
    "kommentare": ("cloud", "GitHub-Cloud", "GitHub",
                   "GitHub Actions: social-comment-moderate.yml (Plan: täglich 12:23 UTC, wieder an seit 06.11.) und social-comment-reply.yml (kein Zeitplan, nur auf Zuruf).",
                   WF + "social-comment-moderate.yml"),
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
    "fortura_frei": ("du", "Bei dir (Entscheid)", "Bei dir", "Das entscheidest du. Mit deinem Ja lege ich die Freigabedatei in main; sie zu löschen stoppt den Abgleich wieder.", ""),
    "kommentare_frage": ("du", "Bei dir (Entscheid)", "Bei dir", "Das entscheidest du. Bis dahin antwortet nichts von selbst; Spam wird nur ausgeblendet und lässt sich zurückholen.", ""),
    "geld": ("du", "Bei dir (Entscheid)", "Bei dir", "Das entscheidest du. Danach läuft es in deinem Etsy-Konto oder in Google Ads.", ""),
}
for _r in ROWS:
    _art, _ort, _kurz, _text, _link = ORTE[_r["id"]]
    _r.update({"ort_art": _art, "ort": _ort, "ort_kurz": _kurz, "ort_text": _text, "link": _link})


def pruefen(rows):
    ids = [r["id"] for r in rows]
    assert len(ids) == len(set(ids)), "doppelte id"
    for r in rows:
        assert r["status"] in ("gruen", "gelb", "rot", "du"), r["id"]
        assert r["bereich"] in ("Shop", "Versand", "Krypto", "Chefbüro"), r["id"]
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


def anwenden(rows, werte):
    """Überschreibt je Zeile Felder aus werte.json (tägliche Auffrischung, siehe aktualisieren.py); «_gem» ist die Messzeit der Zeilen, die in werte.json stehen (also dieses Mal gemessen wurden)."""
    gem = werte.get("_gem")
    for r in rows:
        w = werte.get(r["id"])
        if not w:
            continue  # nicht gemessen: Text und Messzeit bleiben, die Seite setzt die Zeile von selbst auf «Alt»
        if gem and r["gemessen"]:
            r["gemessen"], r["gemessen_text"] = gem, zeit(gem)
        for k in ("status", "befund", "menge", "aktiv_h", "frisch_h", "quelle"):
            if k in w:
                r[k] = w[k]
        if "ereignis_iso" in w:
            r["ereignis_iso"] = w["ereignis_iso"]
            r["ereignis"] = w.get("ereignis_text") or f"{w.get('wort', 'Lauf')} {zeit(w['ereignis_iso'])}"
        elif "ereignis_text" in w:
            r["ereignis"] = w["ereignis_text"]


if __name__ == "__main__":
    out = sys.argv[1]
    if len(sys.argv) > 2:
        anwenden(ROWS, json.load(open(sys.argv[2], encoding="utf-8")))
    pruefen(ROWS)
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
