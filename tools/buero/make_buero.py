#!/usr/bin/env python3
"""Baut buero.json (die Zeilen des KI-Büros) aus den Messungen vom 05.11.2026, Fassung 2 (mit Szene).

Zeiten stehen im Datensatz als ISO (UTC) und als fertiger Text in Schweizer Zeit,
damit die Seite sie unverändert anzeigen kann. Aufruf: python3 -I make_buero.py <Ausgabedatei>

Spalten (alle Zeilen haben alle Spalten):
  id, bereich, name, kurz, status, befund, ereignis, ereignis_iso, gemessen, gemessen_text, frisch_h, quelle
  figur   : arbeiter (Figur am Schreibtisch), paket (Fliessband), tafel (Wandtafel), papier (Blatt auf dem Chefpult)
  menge   : Zahl für paket (Pakete) und tafel (grosse Zahl), sonst 0
  aktiv_h : so viele Stunden nach dem Ereignis zählt die Figur als «arbeitet gerade» (0 = nie)
"""
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
         "Der tägliche Abgleich in GitHub ist noch nie gelaufen: Die Freigabedatei fehlt, und ob die Zugangsdaten "
         "hinterlegt sind, kann ich nicht prüfen. Heute hat die Shop-Sitzung den Bestand von Hand abgeglichen; "
         "diese Zahlen gelten bis morgen etwa 14:57. Für morgen 08:30 steht eine Erinnerung an die Shop-Sitzung.",
         "Von Hand", "2026-11-05T11:57:00Z",
         "GitHub Actions: fortura-bestand.yml, 0 Läufe; Freigabedatei in main: fehlt; CLAUDE.md 05.11.", 24),
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
          "Einmal über den alten Ordner entpacken. Danach holt sich dein PC jedes Programm-Update selbst. "
          "Ob das schon passiert ist, sehe ich von hier nicht.",
          "Gesendet 04.11.", "04.11.", "CLAUDE.md, Stand 04.11. (Krypto)"),
    frage("cockpitstart", "Cockpit unsichtbar beim Start", "Cockpit-Autostart",
          "Würde das Cockpit beim Windows-Anmelden still im Hintergrund starten. Das ändert Windows-Aufgaben, "
          "darum nur mit deinem Ja.",
          "Gefragt 04.11.", "04.11.", "CLAUDE.md, Stand 04.11. (Krypto)"),
    frage("geld", "Etsy oder Anzeigen", "Etsy oder Anzeigen",
          "Zwei Wege, Geld zu verdienen, warten auf deinen Entscheid: Etsy oder Anzeigen (Rest bei Google CHF 58). "
          "Ausgeben kann ich nichts ohne dein Ja.",
          "Offen seit 04.11.", "04.11.", "CLAUDE.md, Stand 04.11."),
    frage("themes", "Alte Shop-Themes löschen", "Themes löschen",
          "«Horizon» und «Horizon-Polish-Grid» belegen Platz; der Shop steht bei 20 von 20 Themes. "
          "Löschen kann nur du.",
          "Offen seit 03.11.", "03.11.", "CLAUDE.md, Stand 03.11. (Shop-Sitzung)"),
    frage("fortura_zugang", "Fortura-Zugang für den Tagesabgleich", "Fortura-Zugang",
          "Zwei Zugangsdaten bei GitHub eintragen (FORTURA_FTP_USER und FORTURA_FTP_PW) und die Freigabedatei legen. "
          "Dann gleicht GitHub den Fortura-Bestand jeden Tag selbst ab. Anleitung: dropship/lagerbestand-0511/README.md.",
          "Offen seit 05.11.", "05.11.", "CLAUDE.md, Stand 05.11. (Shop-Sitzung)"),
]


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


if __name__ == "__main__":
    pruefen(ROWS)
    out = sys.argv[1]
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
