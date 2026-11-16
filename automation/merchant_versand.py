#!/usr/bin/env python3
"""Versanddienst für Liechtenstein im Google Merchant Center (Merchant API, Dienstkonto GCP_SA_KEY).

Anlass (11.11.2026): Merchant Center meldet «Für einige Länder fehlen Versandinformationen» bei 256 228 Artikeln
(79,6 %). Der Shop verkauft nach Liechtenstein (Shopify-Versandprofil «Allgemeines Profil», Zone «Liechtenstein»,
Tarif «Standard Liechtenstein» CHF 14.90, ohne Bedingung, gemessen 11.11.), im Merchant Center fehlt dafür ein Dienst.
Entscheid des Besitzers 10.11.: Variante A (Dienst anlegen, CHF 14.90, kein Gratisversand). Auftrag 11.11.: «das dannach mal fix».

15.11.2026: Der am 11.11. angelegte Dienst war wieder weg (gemessen 23:18 und 23:22 UTC, nur noch die drei Schweizer
Dienste der Google-App). Google sperrte darauf rund 160 000 Artikel in Liechtenstein. Hypothese: die Google-App in
Shopify schreibt die Versanddienste neu und löscht den von Hand angelegten. Entscheid des Besitzers 15.11.: «a» =
tägliche Prüfung, die den Dienst nur dann anlegt, wenn er fehlt (Modus waechter).

MODUS (Umgebung):
  pruefen   (Vorgabe) lesen und Trockenlauf; mit ZEITPLAN=1 Exit 10, wenn Liechtenstein fehlt (Lauf wird rot)
  schreiben Dienst anlegen, wenn er fehlt, dann frisch zurücklesen (mit Wartezeit); steht unser Dienst schon,
            aber mit anderer Lieferzeit, wird nur diese an LIEFERZEIT_LI angeglichen
  waechter  wie schreiben, für den täglichen Zeitplan: meldet per Telegram, wenn er eingreifen musste oder scheitert;
            gleicht nie eine Lieferzeit an (nennt die Abweichung nur im Protokoll)
  zurueck   nur den hier angelegten Dienst (Name, nur LI, CHF 14.90) wieder entfernen
Gibt keine Merchant-Nummer aus: Fehlertexte werden geschwärzt, unerwartete Fehler nur mit ihrem Typ gemeldet.

Lehre (11.11. und 15.11.): Direkt nach shippingSettings:insert liefert das Lesen noch den alten Stand, obwohl die
insert-Antwort den neuen Dienst enthält. Darum wird mehrmals mit Pause zurückgelesen.
"""
import copy, json, os, re, sys, time
try:
    import requests
except ImportError:  # Offline-Test ohne requests: HTTP wird dort ersetzt
    requests = None

SCOPE = "https://www.googleapis.com/auth/content"
NAME = "Standard Liechtenstein"
TARIF_MICROS = "14900000"  # CHF 14.90 wie im Shopify-Versandprofil
# Lieferzeit für Liechtenstein (16.11.2026): Versandseite und PostNL nennen 15 bis 45 Tage. In Werktagen (Merchant-Vorgabe
# Montag bis Freitag): Bearbeitung 1 bis 3 plus Transit 10 bis 29 = 11 bis 32 Werktage, rund 15 bis 45 Kalendertage.
# Bis 15.11. kopierte das Werkzeug die Schweizer Zeiten (1 Tag plus 9 bis 19 Tage), das versprach Google zu wenig.
LIEFERZEIT_LI = {"minHandlingDays": 1, "maxHandlingDays": 3, "minTransitDays": 10, "maxTransitDays": 29}
# Die Rechnung oben gilt nur für Montag bis Freitag. Die Vorgabe ohne Werktag-Einstellung beschreibt Google
# widersprüchlich (API-Referenz: Montag bis Freitag; Merchant-Center-Hilfe: Montag bis Samstag, Prüfung 16.11.).
# Darum setzt das Werkzeug beide Werktag-Felder ausdrücklich auf Montag bis Freitag und übernimmt sie nie aus der
# Schweizer Vorlage. Aus der Vorlage kommt nur die Annahmezeit (cutoffTime).
WERKTAGE = ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY")
WERKTAG_FELDER = ("handlingBusinessDayConfig", "transitBusinessDayConfig")
# Andere Formen der Transitzeit: laut API nicht zusammen mit min/maxTransitDays erlaubt; nie übernehmen oder überschreiben.
ANDERE_TRANSIT = ("transitTimeTable", "warehouseBasedDeliveryTimes")
MODI = ("pruefen", "schreiben", "waechter", "zurueck")
API = "https://merchantapi.googleapis.com/accounts/v1"
HTTP = requests          # in Tests ersetzbar
SCHLAF = time.sleep      # in Tests ersetzbar
RUECKLESEN_VERSUCHE = int(os.environ.get("RUECKLESEN_VERSUCHE", "8"))
RUECKLESEN_PAUSE_S = float(os.environ.get("RUECKLESEN_PAUSE_S", "15"))


def anmelden():
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
    info = json.loads(os.environ["GCP_SA_KEY"])
    cred = service_account.Credentials.from_service_account_info(info, scopes=[SCOPE])
    cred.refresh(Request())
    return {"Authorization": "Bearer " + cred.token, "Content-Type": "application/json"}


def schwaerzen(text):
    """Entfernt Kontonummern und lange Ziffernfolgen aus Texten, die ins öffentliche Log oder Telegram gehen."""
    t = re.sub(r"accounts/\d+", "accounts/…", str(text))
    return re.sub(r"\d{7,}", "…", t)


class Abbruch(Exception):
    def __init__(self, code, text):
        super().__init__(text)
        self.code = code


def konto(h):
    r = HTTP.get(f"{API}/accounts?pageSize=50", headers=h, timeout=30)
    if r.status_code != 200:
        raise Abbruch(3, f"Kontoliste HTTP {r.status_code}")
    k = r.json().get("accounts") or []
    if len(k) != 1:
        raise Abbruch(3, f"{len(k)} Konten sichtbar, erwartet genau 1")
    return k[0]["name"]  # «accounts/<nummer>», wird nie ausgegeben


def lesen(h, name):
    r = HTTP.get(f"{API}/{name}/shippingSettings", headers=h, timeout=30)
    if r.status_code == 404:
        return {"services": []}
    if r.status_code != 200:
        raise Abbruch(4, f"shippingSettings lesen HTTP {r.status_code}: {schwaerzen(r.text)[:300]}")
    try:
        daten = r.json()
    except Exception:
        raise Abbruch(4, "shippingSettings lesen: Antwort ohne JSON")
    if not isinstance(daten, dict):
        raise Abbruch(4, "shippingSettings lesen: Antwort ist kein Objekt")
    return daten


def zeigen(titel, s):
    """Reine Anzeige: darf nie den Lauf abbrechen, gibt nur geschwärzt aus."""
    try:
        _zeigen(titel, s)
    except Exception as e:
        print(f"{titel} (Anzeige nicht möglich: {type(e).__name__})")


def _zeigen(titel, s):
    print(titel)
    for d in s.get("services") or []:
        tarife = []
        for g in d.get("rateGroups") or []:
            sv = g.get("singleValue") or {}
            fr = sv.get("flatRate")
            tarife.append(f"{int(fr.get('amountMicros') or 0)/1e6:.2f} {fr.get('currencyCode','')}" if fr else
                          ("kein Versand" if sv.get("noShipping") else "Tabelle/anders"))
        dt = d.get("deliveryTime") or {}
        mov = d.get("minimumOrderValue") or {}
        mindest = f"{int(mov.get('amountMicros') or 0)/1e6:.2f} {mov.get('currencyCode','')}" if mov else "keiner"
        print(schwaerzen(f"  - {d.get('serviceName')!r} aktiv={d.get('active')} Länder={d.get('deliveryCountries')} "
              f"Währung={d.get('currencyCode')} Tarife={tarife} Mindestbestellwert={mindest} "
              f"Bearbeitung={dt.get('minHandlingDays')}-{dt.get('maxHandlingDays')} "
              f"Transit={dt.get('minTransitDays')}-{dt.get('maxTransitDays')} Werktage={werktage_text(dt)} "
              f"Typ={d.get('shipmentType')}"))
    print(f"  Lager: {len(s.get('warehouses') or [])}, etag vorhanden: {bool(s.get('etag'))}")


def _name(d):
    return str(d.get("serviceName") or "").strip().casefold()


VERSANDARTEN = (None, "", "DELIVERY", "SHIPMENT_TYPE_UNSPECIFIED")  # Zustellung nach Hause (nicht Abholung, nicht lokal)


def _gruppe_versendet(g):
    """Eine Tarifgruppe gilt für alle Artikel (kein Versandlabel) und hat mindestens einen Tarif, der nicht «kein Versand» ist."""
    if g.get("applicableShippingLabels"):
        return False
    sv = g.get("singleValue")
    if sv is not None:
        return not sv.get("noShipping")
    tabellen = [g["mainTable"]] if g.get("mainTable") else []
    tabellen += g.get("subtables") or []
    if tabellen:
        zellen = [z for t in tabellen for zeile in t.get("rows") or [] for z in zeile.get("cells") or []]
        return any(not z.get("noShipping") for z in zellen)
    return True  # andere Formen (z. B. Spediteurtarife) gelten als Versand


def versendet(d):
    """Ein Dienst versendet, wenn er keine Tarifgruppen trägt oder mindestens eine Gruppe für alle Artikel versendet."""
    gruppen = d.get("rateGroups") or []
    return not gruppen or any(_gruppe_versendet(g) for g in gruppen)


def li_vorhanden(s):
    """Aktive Dienste (beliebiger Name), die nach LI liefern."""
    return [d for d in s.get("services") or []
            if "LI" in (d.get("deliveryCountries") or []) and d.get("active")
            and d.get("shipmentType") in VERSANDARTEN and versendet(d)]


def li_unklar(s):
    """Dienste für LI, die nicht aktiv versenden, oder unser Name ohne passenden Zustand: nicht blind ergänzen."""
    return [d for d in s.get("services") or []
            if ("LI" in (d.get("deliveryCountries") or []) or _name(d) == NAME.casefold()) and d not in li_vorhanden(s)]


def angleichbar(d):
    """Unser aktiver Dienst mit Zustellung nach Hause: nur dessen Lieferzeit wird angeglichen."""
    return ist_unser_dienst(d) and bool(d.get("active")) and d.get("shipmentType") in VERSANDARTEN


def ist_unser_dienst(d):
    gruppen = d.get("rateGroups") or []
    return (_name(d) == NAME.casefold() and d.get("deliveryCountries") == ["LI"] and len(gruppen) == 1
            and ((gruppen[0].get("singleValue") or {}).get("flatRate") or {}).get("amountMicros") == TARIF_MICROS)


def vorlage(s):
    ch = [d for d in s.get("services") or [] if "CH" in (d.get("deliveryCountries") or []) and d.get("active")
          and d.get("shipmentType") in VERSANDARTEN and (d.get("deliveryTime") or {}).get("maxTransitDays") is not None]
    if not ch:
        raise Abbruch(5, "kein aktiver Schweizer Dienst (Zustellung, mit Lieferzeit) als Vorlage für Lieferzeiten")
    mit_annahmezeit = [d for d in ch if (d.get("deliveryTime") or {}).get("cutoffTime")]
    return (mit_annahmezeit or ch)[0]


def neuer_dienst(s):
    vorlage_d = vorlage(s)
    dienst = {
        "serviceName": NAME,
        "active": True,
        "deliveryCountries": ["LI"],
        "currencyCode": "CHF",
        "deliveryTime": li_lieferzeit(vorlage_d.get("deliveryTime")),
        "rateGroups": [{"name": NAME, "applicableShippingLabels": [],
                        "singleValue": {"flatRate": {"amountMicros": TARIF_MICROS, "currencyCode": "CHF"}}}],
    }
    if vorlage_d.get("shipmentType"):  # nur DELIVERY oder unbestimmt (siehe Vorlagenwahl)
        dienst["shipmentType"] = vorlage_d["shipmentType"]
    return dienst


def li_lieferzeit(basis):
    """Lieferzeit für LI: nur die Annahmezeit aus basis, die Tage aus LIEFERZEIT_LI, Werktage ausdrücklich Montag bis Freitag."""
    dt = {}
    if isinstance(basis, dict) and isinstance(basis.get("cutoffTime"), dict):
        dt["cutoffTime"] = copy.deepcopy(basis["cutoffTime"])
    dt.update(LIEFERZEIT_LI)
    for f in WERKTAG_FELDER:
        dt[f] = {"businessDays": list(WERKTAGE)}
    return dt


def _zahl(x):
    try:
        return int(x)
    except (TypeError, ValueError):
        return None


def _werktage_ok(cfg):
    """Genau Montag bis Freitag. Fehlt die Einstellung, gilt das als gleich (so kein Fehlalarm, falls Google den
    ausdrücklich gesendeten Vorgabewert beim Speichern weglässt; gesendet wird er immer ausdrücklich)."""
    if not cfg:
        return True
    tage = cfg.get("businessDays") if isinstance(cfg, dict) else None
    return isinstance(tage, list) and len(tage) == len(WERKTAGE) and set(tage) == set(WERKTAGE)


def lieferzeit_ok(d):
    dt = d.get("deliveryTime")
    if not isinstance(dt, dict):
        return False
    return (all(_zahl(dt.get(k)) == v for k, v in LIEFERZEIT_LI.items())
            and all(_werktage_ok(dt.get(f)) for f in WERKTAG_FELDER)
            and not any(dt.get(f) for f in ANDERE_TRANSIT))


def werktage_text(dt):
    if not any(dt.get(f) for f in WERKTAG_FELDER):
        return "Vorgabe"
    if all(_werktage_ok(dt.get(f)) for f in WERKTAG_FELDER):
        return "Mo-Fr"
    return "abweichend"


def lieferzeit_text(d):
    dt = d.get("deliveryTime") if isinstance(d.get("deliveryTime"), dict) else {}
    text = (f"Bearbeitung {dt.get('minHandlingDays')}-{dt.get('maxHandlingDays')}, "
            f"Transit {dt.get('minTransitDays')}-{dt.get('maxTransitDays')} Werktage")
    if werktage_text(dt) == "abweichend":
        text += " (Werktage nicht Montag bis Freitag)"
    if any(dt.get(f) for f in ANDERE_TRANSIT):
        text += " (mit Transit-Tabelle oder Lager-Lieferzeiten)"
    return text


def einfuegen(h, name, s):
    if not s.get("etag"):
        raise Abbruch(4, "kein etag gelesen: schreibe nicht (Schutz gegen das Überschreiben neuerer Dienste)")
    body = {k: v for k, v in s.items() if k != "name"}  # insert ersetzt alles: jedes gelesene Feld mitschicken
    try:
        r = HTTP.post(f"{API}/{name}/shippingSettings:insert", headers=h, json=body, timeout=60)
    except Exception as e:  # Zeitlimit oder Netz: die Anfrage kann bei Google angekommen sein
        raise Abbruch(9, f"shippingSettings:insert möglicherweise gesendet ({type(e).__name__}): "
                         "nicht sofort wiederholen, der nächste Lauf prüft")
    if r.status_code != 200:
        raise Abbruch(6, f"shippingSettings:insert HTTP {r.status_code}: {schwaerzen(r.text)[:300]}")
    try:
        antwort = r.json()
    except Exception:
        antwort = None
    if not isinstance(antwort, dict):
        print("insert-Antwort ohne lesbares JSON-Objekt")
        return None
    namen = [d.get("serviceName") if isinstance(d, dict) else type(d).__name__ for d in antwort.get("services") or []]
    print(schwaerzen(f"insert-Antwort, Dienste: {namen}"))
    return antwort


def gleich(a, b):
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def unveraendert(alte, nach, lager=None):
    """Alle übernommenen Dienste (und, falls angegeben, die Lager) sind im neuen Stand unverändert enthalten."""
    dienste_ok = all(any(gleich(a, b) for b in nach.get("services") or []) for a in alte)
    if lager is None:
        return dienste_ok
    sortiert = lambda xs: sorted(json.dumps(x, sort_keys=True) for x in xs or [])
    return dienste_ok and sortiert(lager) == sortiert(nach.get("warehouses"))


def zuruecklesen(h, name, pruef):
    """Liest so lange zurück, bis pruef(stand) nicht mehr «warten» meldet (höchstens RUECKLESEN_VERSUCHE Mal).
    pruef gibt (fertig, ok) zurück: fertig=True beendet das Warten."""
    nach, ok, fehler = None, False, 0
    versuche = max(1, RUECKLESEN_VERSUCHE)
    for versuch in range(1, versuche + 1):
        try:
            stand = lesen(h, name)
        except Exception as e:  # ein Lesefehler heisst «noch nicht sichtbar», nicht «gescheitert»
            print(f"Rücklesen {versuch}/{versuche}: Lesefehler {type(e).__name__}")
            fertig, ok = False, False
            fehler += 1
        else:
            nach = stand
            fertig, ok = pruef(nach)
            print(f"Rücklesen {versuch}/{versuche}: fertig={fertig}, ok={ok}")
        if fertig:
            break
        if versuch < versuche:
            SCHLAF(RUECKLESEN_PAUSE_S)
    return nach, ok, fehler


def einmal_zeigen(h, name):
    """Nach einer abweichenden insert-Antwort den gespeicherten Stand einmal zeigen (nur Anzeige, nie Abbruch)."""
    try:
        zeigen("Nach dem Senden gelesen:", lesen(h, name))
    except Exception as e:
        print(f"Nach dem Senden gelesen: nicht möglich ({type(e).__name__})")


def telegram(text):
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat:
        print("Telegram: keine Zugangsdaten, nichts gesendet")
        return False
    try:
        r = HTTP.post(f"https://api.telegram.org/bot{token}/sendMessage",
                      json={"chat_id": chat, "text": schwaerzen(text), "disable_web_page_preview": True}, timeout=20)
        print("Telegram:", "gesendet" if r.status_code == 200 else f"HTTP {r.status_code}")
        return r.status_code == 200
    except Exception as e:
        print("Telegram: Fehler", type(e).__name__)
        return False


def zusammenfassung(text):
    pfad = os.environ.get("GITHUB_STEP_SUMMARY")
    if pfad:
        with open(pfad, "a") as f:
            f.write(schwaerzen(text) + "\n")


def lauf(modus, h):
    """Führt einen Lauf aus. Gibt (Exitcode, Ergebnistext, eingegriffen) zurück."""
    name = konto(h)
    vorher = lesen(h, name)
    zeigen("Merchant-Versanddienste jetzt:", vorher)
    with open("versand_vorher.json", "w") as f:  # nur die Dienste (Artefakt ist für angemeldete Nutzer lesbar)
        json.dump({"services": vorher.get("services") or []}, f, ensure_ascii=False, indent=1)
    dienste = vorher.get("services") or []
    if modus == "zurueck":
        unsere = [d for d in dienste if ist_unser_dienst(d)]
        andere_gleichnamig = [d for d in dienste if _name(d) == NAME.casefold() and not ist_unser_dienst(d)]
        if andere_gleichnamig:
            return 8, "Dienst mit unserem Namen, aber anderen Ländern oder Tarifen: von Hand prüfen", False
        if not unsere:
            return 0, "kein Dienst «Standard Liechtenstein» vorhanden, nichts zu tun", False
        rest = [d for d in dienste if not ist_unser_dienst(d)]
        lager_z = vorher.get("warehouses") or []
        neu = copy.deepcopy(vorher); neu["services"] = rest
        einfuegen(h, name, neu)
        nach, ok, _ = zuruecklesen(h, name, lambda s: (
            not any(ist_unser_dienst(d) for d in s.get("services") or []) or not unveraendert(rest, s, lager_z),
            not any(ist_unser_dienst(d) for d in s.get("services") or []) and unveraendert(rest, s, lager_z)))
        if nach is not None:
            zeigen("Nach der Rücknahme:", nach)
        return (0, "Rücknahme ausgeführt, übrige Dienste und Lager unverändert", True) if ok else \
               (7, "Rücknahme gesendet, aber Zurücklesen bestätigt sie nicht (oder übrige Dienste/Lager verändert)", True)
    if li_vorhanden(vorher):
        unsere = [d for d in dienste if angleichbar(d)]
        falsch = [d for d in unsere if not lieferzeit_ok(d)]
        if not falsch:
            return 0, "Liechtenstein hat einen aktiven Dienst, nichts zu tun", False
        soll = lieferzeit_text({"deliveryTime": LIEFERZEIT_LI})
        if modus != "schreiben":  # Wächter und Prüfung überschreiben nie eine Lieferzeit, die jemand anders gesetzt hat
            return 0, (f"Liechtenstein hat einen aktiven Dienst; Lieferzeit {lieferzeit_text(falsch[0])} weicht von der "
                       f"Vorgabe {soll} ab (angleichen mit MODUS schreiben)"), False
        if any(isinstance(d.get("deliveryTime"), dict) and any(d["deliveryTime"].get(f) for f in ANDERE_TRANSIT)
               for d in falsch):
            return 8, "Lieferzeit unseres Dienstes trägt eine Transit-Tabelle oder Lager-Lieferzeiten: von Hand prüfen", False
        neu = copy.deepcopy(vorher)
        for d in neu["services"]:
            if angleichbar(d) and not lieferzeit_ok(d):
                basis = d.get("deliveryTime")
                if not isinstance(basis, dict) or not basis:  # ohne Lieferzeit: Annahmezeit wie beim Anlegen aus der Vorlage
                    try:
                        basis = vorlage(vorher).get("deliveryTime")
                    except Abbruch:
                        basis = {}
                d["deliveryTime"] = li_lieferzeit(basis)
        print("Lieferzeit angleichen auf:", soll)
        antwort = einfuegen(h, name, neu)
        try:
            return lieferzeit_nach_dem_senden(h, name, vorher, antwort)
        except Abbruch as e:
            raise Abbruch(e.code, f"nach dem Senden (Lieferzeit wurde gesendet, nicht sofort wiederholen): {e}")
        except Exception as e:
            raise Abbruch(9, f"nach dem Senden (Lieferzeit wurde gesendet, nicht sofort wiederholen): unerwarteter Fehler {type(e).__name__}")
    if li_unklar(vorher):
        return 8, "Dienst für Liechtenstein vorhanden, aber nicht aktiv oder ohne Versand: von Hand prüfen", False
    dienst = neuer_dienst(vorher)
    print("Geplanter neuer Dienst:", json.dumps(dienst, ensure_ascii=False))
    if modus == "pruefen":
        if os.environ.get("ZEITPLAN") == "1":
            return 10, "Liechtenstein fehlt, Wächter ist ausgeschaltet (Datei WAECHTER): nichts geschrieben", False
        return 0, "Trockenlauf, nichts geschrieben (Liechtenstein fehlt)", False
    neu = copy.deepcopy(vorher)
    neu["services"] = dienste + [dienst]
    antwort = einfuegen(h, name, neu)
    try:
        return nach_dem_senden(h, name, vorher, dienste, antwort)
    except Abbruch as e:
        raise Abbruch(e.code, f"nach dem Senden (Dienst wurde gesendet, nicht sofort wiederholen): {e}")
    except Exception as e:
        raise Abbruch(9, f"nach dem Senden (Dienst wurde gesendet, nicht sofort wiederholen): unerwarteter Fehler {type(e).__name__}")


def neuer_stand(s, vorher):
    """Neues etag: Google hat gespeichert, ein Verzug beim Zurücklesen ist es dann nicht mehr (Annahme: ein veralteter
    Lesestand trägt auch das alte etag; Doku: das etag ändert sich bei jeder Änderung der Versandeinstellungen)."""
    return bool(s.get("etag")) and s.get("etag") != vorher.get("etag")


def nach_dem_senden(h, name, vorher, dienste, antwort):
    """Nach dem Anlegen: übrige Dienste und Lager unverändert, unser Dienst aktiv mit der Lieferzeit für LI."""
    def li_ok(s):
        return any(ist_unser_dienst(d) and d.get("active") and lieferzeit_ok(d) for d in s.get("services") or [])
    if antwort is not None and not li_ok(antwort):
        einmal_zeigen(h, name)
        return 7, "Liechtenstein gesendet, aber die insert-Antwort enthält den Dienst nicht wie gesendet: nicht sofort wiederholen", True

    lager = vorher.get("warehouses") or []

    def falsch_sichtbar(s):  # unser Name ist da, aber nicht als aktiver Dienst LI CHF 14.90 mit der Lieferzeit für LI
        return any(_name(d) == NAME.casefold() and not (ist_unser_dienst(d) and d.get("active") and lieferzeit_ok(d))
                   for d in s.get("services") or [])

    def pruef(s):
        alt_ok = unveraendert(dienste, s, lager)
        return (li_ok(s) or not alt_ok or falsch_sichtbar(s) or neuer_stand(s, vorher)), (li_ok(s) and alt_ok)
    nach, ok, fehler = zuruecklesen(h, name, pruef)
    if nach is None:
        return 7, "Liechtenstein gesendet, Zurücklesen scheiterte bei jedem Versuch: nächster Lauf prüft, nicht sofort wiederholen", True
    zeigen("Frisch zurückgelesen:", nach)
    if ok:
        return 0, "Liechtenstein angelegt, alte Dienste unverändert (GLEICH)", True
    if not unveraendert(dienste, nach, lager):
        return 7, "WEICHT AB nach dem Senden: übrige Dienste oder Lager haben sich verändert, von Hand prüfen", True
    if falsch_sichtbar(nach):
        return 7, "WEICHT AB nach dem Senden: Dienst «Standard Liechtenstein» gespeichert, aber nicht aktiv, mit anderem Tarif/Land oder anderer Lieferzeit", True
    if neuer_stand(nach, vorher):
        return 7, ("WEICHT AB nach dem Senden: neuer Stand ohne unseren Dienst (vermutlich von der Google-App neu "
                   "geschrieben); der Wächter legt ihn beim nächsten Lauf neu an"), True
    if fehler:
        return 7, "Liechtenstein gesendet, Zurücklesen teilweise gescheitert und nicht bestätigt: nächster Lauf prüft, nicht sofort wiederholen", True
    if antwort is not None:
        return 0, "Liechtenstein laut Antwort von Google angelegt, beim Zurücklesen noch nicht sichtbar: der nächste Lauf prüft", True
    return 7, "WEICHT AB nach dem Senden: Liechtenstein beim Zurücklesen nicht sichtbar", True


def lieferzeit_nach_dem_senden(h, name, vorher, antwort):
    """Nach dem Angleichen: alle übrigen Dienste (auch inaktive eigene) und Lager unverändert, jeder aktive eigene
    Dienst ausser der Lieferzeit gleich und mit der Vorgabe. Jeder Text nennt, dass gesendet wurde."""
    alte = vorher.get("services") or []
    andere = [d for d in alte if not angleichbar(d)]
    lager = vorher.get("warehouses") or []

    def ohne_lz(d):
        return json.dumps({k: v for k, v in d.items() if k != "deliveryTime"}, sort_keys=True)

    def eigene(s):
        return [d for d in s.get("services") or [] if angleichbar(d)]
    soll_eigene = sorted(ohne_lz(d) for d in eigene(vorher))

    def neu_ok(s):
        e = eigene(s)
        return sorted(ohne_lz(d) for d in e) == soll_eigene and all(lieferzeit_ok(d) for d in e)  # soll_eigene ist nie leer

    def falsch_sichtbar(s):  # unser Name in einem Zustand, den es vorher nicht gab (z. B. inaktiv gespeichert)
        return any(_name(d) == NAME.casefold() and not (ist_unser_dienst(d) and d.get("active"))
                   and not any(gleich(d, a) for a in alte) for d in s.get("services") or [])

    if antwort is not None and not neu_ok(antwort):
        einmal_zeigen(h, name)
        return 7, "Lieferzeit gesendet, aber die insert-Antwort enthält sie nicht wie gesendet: nicht sofort wiederholen", True

    def pruef(s):
        alt_ok = unveraendert(andere, s, lager)
        return (neu_ok(s) or not alt_ok or falsch_sichtbar(s) or neuer_stand(s, vorher)), (neu_ok(s) and alt_ok)
    nach, ok, fehler = zuruecklesen(h, name, pruef)
    if nach is None:
        return 7, "Lieferzeit gesendet, Zurücklesen scheiterte bei jedem Versuch: nächster Lauf prüft, nicht sofort wiederholen", True
    zeigen("Frisch zurückgelesen:", nach)
    if ok:
        return 0, "Lieferzeit Liechtenstein angeglichen, übrige Dienste unverändert (GLEICH)", True
    if not unveraendert(andere, nach, lager):
        return 7, "WEICHT AB nach dem Senden der Lieferzeit: übrige Dienste oder Lager haben sich verändert, von Hand prüfen", True
    if falsch_sichtbar(nach):
        return 7, "WEICHT AB nach dem Senden der Lieferzeit: unser Dienst ist nicht aktiv oder anders gespeichert", True
    if neuer_stand(nach, vorher) and not eigene(nach):
        return 7, ("WEICHT AB nach dem Senden der Lieferzeit: unser Dienst fehlt im neuen Stand (vermutlich von der "
                   "Google-App neu geschrieben); der Wächter legt ihn beim nächsten Lauf neu an"), True
    if neuer_stand(nach, vorher):
        return 7, "WEICHT AB nach dem Senden der Lieferzeit: Google hat gespeichert, aber nicht wie gesendet (Lieferzeit oder unser Dienst anders)", True
    if fehler:
        return 7, "Lieferzeit gesendet, Zurücklesen teilweise gescheitert und nicht bestätigt: mit MODUS pruefen nachprüfen, nicht sofort wiederholen", True
    if antwort is not None:
        return 0, ("Lieferzeit laut Antwort von Google angeglichen, beim Zurücklesen noch nicht sichtbar: in 2 Minuten mit "
                   "MODUS pruefen nachprüfen (der Wächter meldet eine abweichende Lieferzeit nicht)"), True
    return 7, "WEICHT AB nach dem Senden der Lieferzeit: neue Lieferzeit beim Zurücklesen nicht sichtbar", True


def main():
    modus = (os.environ.get("MODUS", "pruefen").strip() or "pruefen").lower()
    if modus not in MODI:
        print(f"ABBRUCH: unbekannter MODUS {schwaerzen(modus)!r}, erlaubt: {', '.join(MODI)}")
        return 2
    print("MODUS:", modus)
    try:
        code, text, eingegriffen = lauf(modus, anmelden())
    except Abbruch as e:
        code, text, eingegriffen = e.code, "ABBRUCH: " + schwaerzen(str(e)), False  # Abbruch meldet ohnehin (Code ungleich 0)
    except Exception as e:  # Netz, Zeitlimit, Anmeldung, kaputtes JSON: nur den Typ nennen (Meldungen tragen die Kontonummer)
        code, text, eingegriffen = 9, f"ABBRUCH: unerwarteter Fehler {type(e).__name__}", False
    print("ERGEBNIS:", text)
    zusammenfassung(f"Merchant-Versand Liechtenstein ({modus}): {text}")
    if modus == "waechter" and (eingegriffen or code != 0):
        telegram(("✅" if code == 0 else "⚠️") + f" Merchant-Versand Liechtenstein: {text}")
    return code


if __name__ == "__main__":
    sys.exit(main())
