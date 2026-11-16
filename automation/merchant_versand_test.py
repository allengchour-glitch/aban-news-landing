#!/usr/bin/env python3
"""Offline-Test für merchant_versand.py (kein Netz: gefälschte Merchant API und Telegram)."""
import copy, json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import merchant_versand as mv

KONTO = "4815162342"  # Kontonummer der Attrappe: darf nie in Ausgabe, Zusammenfassung oder Telegram stehen
CH1 = {"serviceName": "flat_7.00_CHF_standard", "active": True, "deliveryCountries": ["CH"], "currencyCode": "CHF",
       "deliveryTime": {"minTransitDays": 9, "maxTransitDays": 19, "minHandlingDays": 1, "maxHandlingDays": 1,
                        "cutoffTime": {"hour": 14, "minute": 0, "timeZone": "Europe/Zurich"}},
       "rateGroups": [{"singleValue": {"flatRate": {"amountMicros": "7000000", "currencyCode": "CHF"}}}], "shipmentType": "DELIVERY"}
CH2 = {"serviceName": "price_based_CHF_gratis", "active": True, "deliveryCountries": ["CH"], "currencyCode": "CHF",
       "deliveryTime": {"minTransitDays": 9, "maxTransitDays": 19, "minHandlingDays": 1, "maxHandlingDays": 1},
       "minimumOrderValue": {"amountMicros": "45000000", "currencyCode": "CHF"},
       "rateGroups": [{"mainTable": {"rows": [{"cells": [{"noShipping": True}]}]}}]}
LAGER = [{"name": "Lager Zürich", "shippingAddress": {"regionCode": "CH", "postalCode": "8000"}}]
MOFR = {"businessDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]}
# Soll-Lieferzeit für LI: nur die Annahmezeit aus der Vorlage, eigene Tage, Werktage ausdrücklich Montag bis Freitag
SOLL_OHNE_ANNAHME = {"minHandlingDays": 1, "maxHandlingDays": 3, "minTransitDays": 10, "maxTransitDays": 29,
                     "handlingBusinessDayConfig": MOFR, "transitBusinessDayConfig": MOFR}
SOLL_LZ = dict(SOLL_OHNE_ANNAHME, cutoffTime={"hour": 14, "minute": 0, "timeZone": "Europe/Zurich"})


class Antwort:
    def __init__(self, code, daten=None, text=""):
        self.status_code, self._d, self.text = code, daten, text or json.dumps(daten or {})
    def json(self):
        if self._d is None:
            raise ValueError("kein JSON")
        return self._d


class FalscheApi:
    """Merchant API mit Verzögerung: nach insert zeigt GET erst nach `verzug` Lesungen den neuen Stand."""
    def __init__(self, dienste, verzug=0, insert_code=200, konten=1, get_code=200, lager=None, etag="e1"):
        self.stand = {"name": f"accounts/{KONTO}/shippingSettings", "services": copy.deepcopy(dienste)}
        if etag:
            self.stand["etag"] = etag
        if lager is not None:
            self.stand["warehouses"] = copy.deepcopy(lager)
        self.neu, self.verzug, self.insert_code, self.konten, self.get_code = None, verzug, insert_code, konten, get_code
        self.antwort_ohne_li = self.antwort_ohne_json = self.speicher_inaktiv = False
        self.aendere_app_dienst = self.wirf_nach_insert = self.wirf_beim_lesen = False
        self.aendere_lager = self.speicher_ohne_li = False
        self.lesefehler_nach_insert = 0      # so viele Lesungen nach dem insert scheitern mit 503
        self.get_liste = False               # GET liefert eine JSON-Liste statt eines Objekts
        self.antwort_liste = False           # insert-Antwort ist eine JSON-Liste
        self.ignoriere_dienste = False       # Google übernimmt die gesendeten Dienste nicht (alter Stand bleibt)
        self.etag_zaehler = 1
        self.aktuell_etag = etag             # Google kennt immer den neuesten Stand, auch wenn GET noch den alten zeigt
        self.fehlertext = "etag mismatch"
        self.inserts, self.telegram, self.gets = [], [], 0
    def get(self, url, **kw):
        if url.endswith("/accounts?pageSize=50"):
            return Antwort(200, {"accounts": [{"name": f"accounts/{KONTO}{i or ''}"} for i in range(self.konten)]})
        self.gets += 1
        if self.wirf_beim_lesen or (self.wirf_nach_insert and self.inserts):
            raise ConnectionError(f"Max retries exceeded with url: /accounts/v1/accounts/{KONTO}/shippingSettings")
        if self.inserts and self.lesefehler_nach_insert > 0:
            self.lesefehler_nach_insert -= 1
            return Antwort(503, None, f"backend error accounts/{KONTO}")
        if self.get_liste:
            return Antwort(200, [1, 2])
        if self.get_code != 200:
            return Antwort(self.get_code, None, f"fehler bei accounts/{KONTO}")
        if self.neu is not None:
            if self.verzug <= 0:
                self.stand, self.neu = self.neu, None
            else:
                self.verzug -= 1
        return Antwort(200, copy.deepcopy(self.stand))
    def post(self, url, json=None, **kw):
        if "api.telegram.org" in url:
            self.telegram.append(json["text"]); return Antwort(200, {"ok": True})
        self.inserts.append(copy.deepcopy(json))
        namen = [d.get("serviceName") for d in json.get("services") or [] if isinstance(d, dict)]
        if len(namen) != len(set(namen)):  # Referenz: serviceName muss im Konto eindeutig sein
            return Antwort(400, None, f"duplicate serviceName for accounts/{KONTO}")
        for d in json.get("services") or []:
            dt = (d.get("deliveryTime") or {}) if isinstance(d, dict) else {}
            if dt.get("transitTimeTable") and ("minTransitDays" in dt or "maxTransitDays" in dt):
                return Antwort(400, None, "transitTimeTable and min/maxTransitDays both set")
            if dt.get("warehouseBasedDeliveryTimes") and any(k in dt for k in ("minTransitDays", "maxTransitDays", "transitTimeTable")):
                return Antwort(400, None, "warehouseBasedDeliveryTimes with other transit fields")
        if self.insert_code != 200:
            return Antwort(self.insert_code, None, f"{self.fehlertext} for accounts/{KONTO} and {KONTO}")
        if json.get("etag") != self.aktuell_etag:  # veraltetes etag: Google lehnt ab
            return Antwort(409, None, f"etag mismatch for accounts/{KONTO}")
        self.etag_zaehler += 1
        self.aktuell_etag = f"e{self.etag_zaehler}"
        neu = {"services": copy.deepcopy(self.stand["services"] if self.ignoriere_dienste else json["services"]),
               "etag": self.aktuell_etag}
        if "warehouses" in json:
            neu["warehouses"] = copy.deepcopy(json["warehouses"])
        antwort = copy.deepcopy(neu)
        if self.speicher_inaktiv:  # Google antwortet mit aktivem Dienst, speichert ihn aber inaktiv
            for d in neu["services"]:
                if d["serviceName"] == mv.NAME:
                    d["active"] = False
        if self.aendere_app_dienst:  # beim Speichern geht ein Feld eines App-Dienstes verloren
            neu["services"][0] = dict(neu["services"][0], currencyCode="EUR")
        if self.aendere_lager:  # beim Speichern verschwindet ein Lager
            neu["warehouses"] = []
        if self.speicher_ohne_li:  # Google speichert ohne den neuen Dienst
            neu["services"] = [d for d in neu["services"] if d["serviceName"] != mv.NAME]
        self.neu = neu
        if self.antwort_ohne_json:
            return Antwort(200, None, "kein json")
        if self.antwort_liste:
            return Antwort(200, [antwort])
        if self.antwort_ohne_li:
            antwort["services"] = [d for d in antwort["services"] if d["serviceName"] != mv.NAME]
        return Antwort(200, antwort)


ok = fehler = 0
def pruef(name, bed):
    global ok, fehler
    if bed: ok += 1
    else: fehler += 1; print("FEHLER", name)


SCHLAEFE = []
AUSGABE = []


def laufe(api, modus, env=None):
    import io, contextlib
    mv.HTTP = api
    SCHLAEFE.clear()
    mv.SCHLAF = lambda s: SCHLAEFE.append(s)
    mv.anmelden = lambda: {"Authorization": "Bearer x"}
    alt = dict(os.environ)
    d = tempfile.mkdtemp()
    os.environ.update({"MODUS": modus, "TELEGRAM_BOT_TOKEN": "t", "TELEGRAM_CHAT_ID": "c",
                       "GITHUB_STEP_SUMMARY": os.path.join(d, "summary.md")})
    os.environ.pop("ZEITPLAN", None)
    if env: os.environ.update(env)
    cwd = os.getcwd(); os.chdir(d)
    puffer = io.StringIO()
    try:
        with contextlib.redirect_stdout(puffer):
            code = mv.main()
        summary = open(os.path.join(d, "summary.md")).read() if os.path.exists(os.path.join(d, "summary.md")) else ""
        artefakt = open(os.path.join(d, "versand_vorher.json")).read() if os.path.exists(os.path.join(d, "versand_vorher.json")) else ""
        AUSGABE[:] = [puffer.getvalue(), summary, artefakt]
        return code
    finally:
        os.chdir(cwd); os.environ.clear(); os.environ.update(alt)


def ergebnis():
    z = [l for l in AUSGABE[0].splitlines() if l.startswith("ERGEBNIS")]
    return z[-1] if z else ""


def ohne_konto(api):
    texte = AUSGABE[:3] + api.telegram
    return all(KONTO not in t for t in texte)


# 1. pruefen schreibt nie
a = FalscheApi([CH1, CH2]); pruef("pruefen Exit 0", laufe(a, "pruefen") == 0); pruef("pruefen ohne insert", a.inserts == [])
pruef("pruefen ohne Telegram", a.telegram == [])
# 1b. pruefen im Zeitplan (Wächter aus): Exit 10, wenn LI fehlt
a = FalscheApi([CH1, CH2]); pruef("Zeitplan pruefen, LI fehlt: Exit 10", laufe(a, "pruefen", {"ZEITPLAN": "1"}) == 10)
pruef("Zeitplan pruefen: kein insert", a.inserts == [])
pruef("Zeitplan pruefen: kein Telegram", a.telegram == [])
# 2. waechter, Dienst fehlt, sofort sichtbar, mit Lager
a = FalscheApi([CH1, CH2], lager=LAGER); c = laufe(a, "waechter")
pruef("waechter legt an: Exit 0", c == 0); pruef("genau ein insert", len(a.inserts) == 1)
s = a.inserts[0]["services"] if a.inserts else []
pruef("alte Dienste unverändert mitgeschickt", s[:2] == [CH1, CH2])
pruef("neuer Dienst LI 14.90", len(s) == 3 and s[2]["deliveryCountries"] == ["LI"] and s[2]["rateGroups"][0]["singleValue"]["flatRate"]["amountMicros"] == "14900000")
pruef("Lieferzeit: Vorlage vom Schweizer Dienst, Zeiten für Liechtenstein",
      len(s) == 3 and s[2]["deliveryTime"] == SOLL_LZ)
pruef("Lieferzeit LI: 1-3 Bearbeitung, 10-29 Transit", len(s) == 3 and s[2]["deliveryTime"]["minHandlingDays"] == 1
      and s[2]["deliveryTime"]["maxHandlingDays"] == 3 and s[2]["deliveryTime"]["minTransitDays"] == 10
      and s[2]["deliveryTime"]["maxTransitDays"] == 29 and s[2]["deliveryTime"]["cutoffTime"] == CH1["deliveryTime"]["cutoffTime"])
pruef("etag mitgeschickt", a.inserts and a.inserts[0].get("etag") == "e1")
pruef("Lager unverändert mitgeschickt", a.inserts and a.inserts[0].get("warehouses") == LAGER)
pruef("name nicht im insert-Body", a.inserts and "name" not in a.inserts[0])
pruef("waechter meldet Eingriff per Telegram", len(a.telegram) == 1 and "angelegt" in a.telegram[0] and a.telegram[0].startswith("✅"))
pruef("Artefakt nur mit Diensten", json.loads(AUSGABE[2]) == {"services": [CH1, CH2]})
pruef("Kontonummer nirgends (Erfolg)", ohne_konto(a))
# 3. waechter, Dienst vorhanden: nichts tun, keine Meldung
a = FalscheApi([CH1, CH2]); laufe(a, "waechter"); a.stand, a.neu = a.neu or a.stand, None
n_vorher = len(a.inserts); c = laufe(a, "waechter")
pruef("vorhanden: Exit 0", c == 0); pruef("vorhanden: kein zweites insert", len(a.inserts) == n_vorher)
pruef("vorhanden: keine zweite Meldung", len(a.telegram) == 1)
# 4. Verzögerung beim Rücklesen (Lehre 11.11./15.11.): 3 Lesungen alt, dann neu; mit Pausen
a = FalscheApi([CH1, CH2], verzug=3); c = laufe(a, "waechter")
pruef("Verzug: Exit 0 nach Wiederholen", c == 0); pruef("Verzug: mehrfach gelesen", a.gets >= 5)
pruef("Verzug: Pausen je 15 s", SCHLAEFE == [15.0, 15.0, 15.0])
# 5. Verzug länger als alle Versuche: Antwort von Google bestätigt, darum Exit 0 mit Hinweis
a = FalscheApi([CH1, CH2], verzug=99); c = laufe(a, "waechter")
pruef("dauernder Verzug: Exit 0", c == 0); pruef("dauernder Verzug: Hinweis", a.telegram and "noch nicht sichtbar" in a.telegram[0])
pruef("dauernder Verzug: alle Versuche", a.gets == 1 + mv.RUECKLESEN_VERSUCHE and len(SCHLAEFE) == mv.RUECKLESEN_VERSUCHE - 1)
pruef("dauernder Verzug: nur ein insert", len(a.inserts) == 1)
# 5b. dauernder Verzug ohne lesbare insert-Antwort: Exit 7
a = FalscheApi([CH1, CH2], verzug=99); a.antwort_ohne_json = True; c = laufe(a, "waechter")
pruef("Verzug ohne Antwort: Exit 7", c == 7); pruef("Verzug ohne Antwort: Warnung", a.telegram and a.telegram[0].startswith("⚠️"))
# 6. insert abgelehnt: Exit 6, Warnung ohne Kontonummer, kein zweiter Versuch
a = FalscheApi([CH1, CH2], insert_code=409); c = laufe(a, "waechter")
pruef("insert abgelehnt: Exit 6", c == 6); pruef("insert abgelehnt: Warnung", a.telegram and "ABBRUCH" in a.telegram[0])
pruef("insert abgelehnt: ein Versuch", len(a.inserts) == 1)
pruef("insert abgelehnt: Kontonummer geschwärzt", ohne_konto(a))
# 7. kein Schweizer Dienst: nichts anlegen
a = FalscheApi([]); c = laufe(a, "waechter")
pruef("ohne CH: Exit 5", c == 5); pruef("ohne CH: kein insert", a.inserts == [])
# 7b. 404 beim Lesen gilt als «keine Einstellungen»: Exit 5, kein insert
a = FalscheApi([CH1], get_code=404); c = laufe(a, "waechter")
pruef("404: Exit 5", c == 5); pruef("404: kein insert", a.inserts == [])
# 8. eigener Dienst inaktiv: nicht doppelt anlegen
inaktiv = dict(mv.neuer_dienst({"services": [CH1]}), active=False)
a = FalscheApi([CH1, CH2, inaktiv]); c = laufe(a, "waechter")
pruef("inaktiv: Exit 8", c == 8); pruef("inaktiv: kein insert", a.inserts == [])
# 8b. fremder inaktiver LI-Dienst: nicht ergänzen
a = FalscheApi([CH1, {"serviceName": "Alt LI", "active": False, "deliveryCountries": ["LI"]}]); c = laufe(a, "waechter")
pruef("fremd inaktiv LI: Exit 8", c == 8 and a.inserts == [])
# 8c. aktiver LI-Dienst ohne Versand (noShipping) zählt nicht als vorhanden, wird aber auch nicht ergänzt
a = FalscheApi([CH1, {"serviceName": "LI gesperrt", "active": True, "deliveryCountries": ["LI"],
                      "rateGroups": [{"singleValue": {"noShipping": True}}]}]); c = laufe(a, "waechter")
pruef("LI ohne Versand: Exit 8", c == 8 and a.inserts == [])
# 8d. unser Name anders geschrieben, inaktiv: erkannt
a = FalscheApi([CH1, {"serviceName": " standard liechtenstein ", "active": False, "deliveryCountries": ["CH"]}]); c = laufe(a, "waechter")
pruef("Name anders geschrieben: Exit 8", c == 8 and a.inserts == [])
# 9. fremder aktiver LI-Dienst zählt als vorhanden
fremd = {"serviceName": "App LI", "active": True, "deliveryCountries": ["LI", "CH"], "currencyCode": "CHF"}
a = FalscheApi([CH1, fremd]); c = laufe(a, "waechter")
pruef("fremder LI-Dienst: nichts tun", c == 0 and a.inserts == [])
# 10. unbekannter Modus
a = FalscheApi([CH1]); pruef("unbekannter Modus: Exit 2", laufe(a, "SCHREIBEN!") == 2); pruef("unbekannter Modus: nichts gelesen", a.gets == 0)
# 11. mehrere Konten: Abbruch
a = FalscheApi([CH1], konten=2); pruef("2 Konten: Exit 3", laufe(a, "waechter") == 3); pruef("2 Konten: kein insert", a.inserts == [])
# 12. Lesefehler: Exit 4, Kontonummer geschwärzt
a = FalscheApi([CH1], get_code=500); pruef("Lesefehler: Exit 4", laufe(a, "waechter") == 4); pruef("Lesefehler: ohne Kontonummer", ohne_konto(a))
# 13. insert-Antwort ohne LI
a = FalscheApi([CH1, CH2]); a.antwort_ohne_li = True; pruef("Antwort ohne LI: Exit 7", laufe(a, "schreiben") == 7)
# 14. schreiben meldet nicht per Telegram
a = FalscheApi([CH1, CH2]); laufe(a, "schreiben"); pruef("schreiben: kein Telegram", a.telegram == [])
# 15. zurueck entfernt nur den eigenen Dienst
eigen = mv.neuer_dienst({"services": [CH1]})
a = FalscheApi([CH1, CH2, eigen], lager=LAGER); c = laufe(a, "zurueck")
pruef("zurueck: Exit 0", c == 0); pruef("zurueck: nur CH bleiben", a.inserts and a.inserts[0]["services"] == [CH1, CH2])
pruef("zurueck: Lager und etag mitgeschickt", a.inserts and a.inserts[0].get("warehouses") == LAGER and a.inserts[0].get("etag") == "e1")
pruef("zurueck: kein Telegram", a.telegram == [])
# 15b. zurueck rührt fremde LI-Dienste und gleichnamige mit anderen Ländern nicht an
a = FalscheApi([CH1, fremd, eigen]); c = laufe(a, "zurueck")
pruef("zurueck: fremder LI-Dienst bleibt", c == 0 and a.inserts and a.inserts[0]["services"] == [CH1, fremd])
gleichnamig = dict(eigen, deliveryCountries=["LI", "CH"])
a = FalscheApi([CH1, gleichnamig]); c = laufe(a, "zurueck")
pruef("zurueck: gleichnamig anders: Exit 8, kein insert", c == 8 and a.inserts == [])
# 15c. zurueck mit Verzug: wartet, bis der Dienst weg ist
a = FalscheApi([CH1, CH2, eigen], verzug=2); c = laufe(a, "zurueck")
pruef("zurueck mit Verzug: Exit 0 nach Warten", c == 0 and len(SCHLAEFE) == 2)
# 16. Telegram ohne Zugangsdaten: kein Absturz
a = FalscheApi([CH1, CH2]); c = laufe(a, "waechter", {"TELEGRAM_BOT_TOKEN": ""})
pruef("ohne Telegram: Exit 0", c == 0); pruef("ohne Telegram: nichts gesendet", a.telegram == [])
# 17. Google speichert den Dienst inaktiv (Antwort aktiv): Rücklese-Pfad erkennt es
a = FalscheApi([CH1, CH2]); a.speicher_inaktiv = True; a.antwort_ohne_json = True; c = laufe(a, "waechter")
pruef("inaktiv gespeichert: Exit 7", c == 7); pruef("inaktiv gespeichert: nach insert gelesen", a.gets >= 2)
pruef("inaktiv gespeichert: Text WEICHT AB", "WEICHT AB" in AUSGABE[0])
# 18. Google verändert beim Speichern einen App-Dienst: Exit 7, kein weiteres Warten
a = FalscheApi([CH1, CH2]); a.aendere_app_dienst = True; c = laufe(a, "waechter")
pruef("App-Dienst verändert: Exit 7", c == 7); pruef("App-Dienst verändert: Text", "übrige Dienste" in AUSGABE[0])
pruef("App-Dienst verändert: nicht weiter gewartet", SCHLAEFE == [])
# 19. ohne etag: nicht schreiben
a = FalscheApi([CH1, CH2], etag=None); c = laufe(a, "waechter")
pruef("ohne etag: Exit 4", c == 4); pruef("ohne etag: kein insert", a.inserts == [])
a = FalscheApi([CH1, eigen], etag=None); pruef("zurueck ohne etag: Exit 4", laufe(a, "zurueck") == 4 and a.inserts == [])
# 20. Netzfehler (Meldung mit Kontonummer): Exit 9, Warnung ohne Kontonummer
a = FalscheApi([CH1, CH2]); a.wirf_beim_lesen = True; c = laufe(a, "waechter")
pruef("Netzfehler: Exit 9", c == 9); pruef("Netzfehler: Warnung", a.telegram and "ConnectionError" in a.telegram[0])
pruef("Netzfehler: ohne Kontonummer", ohne_konto(a))
a = FalscheApi([CH1, CH2]); a.wirf_nach_insert = True; c = laufe(a, "waechter")
pruef("Netzfehler nach insert: Exit 7 und Warnung", c == 7 and len(a.inserts) == 1 and a.telegram and a.telegram[0].startswith("⚠️"))
pruef("Netzfehler nach insert: nennt das Senden", a.telegram and "gesendet" in a.telegram[0] and "nicht sofort wiederholen" in a.telegram[0])
pruef("Netzfehler nach insert: alle Versuche", len(SCHLAEFE) == mv.RUECKLESEN_VERSUCHE - 1)
pruef("Netzfehler nach insert: ohne Kontonummer", ohne_konto(a))
# 21. schwaerzen
pruef("schwaerzen Konto", mv.schwaerzen(f"x accounts/{KONTO}/y") == "x accounts/…/y")
pruef("schwaerzen lange Zahl", KONTO not in mv.schwaerzen(f"id {KONTO}"))
pruef("schwaerzen lässt kurze Zahlen", mv.schwaerzen("HTTP 409") == "HTTP 409")

# 22. Lager geht beim Speichern verloren: Exit 7
a = FalscheApi([CH1, CH2], lager=LAGER); a.aendere_lager = True; c = laufe(a, "waechter")
pruef("Lager verloren: Exit 7", c == 7); pruef("Lager verloren: Text", "Lager" in AUSGABE[0] and "WEICHT AB" in AUSGABE[0])
# 23. App-Dienst verändert UND LI fehlt: sofort aufhören zu warten
a = FalscheApi([CH1, CH2]); a.aendere_app_dienst = True; a.speicher_ohne_li = True; a.antwort_ohne_json = True; c = laufe(a, "waechter")
pruef("verändert ohne LI: Exit 7", c == 7); pruef("verändert ohne LI: nicht gewartet", SCHLAEFE == [])
# 24. zurueck: gleicher Name, nur LI, aber anderer Tarif ist nicht unser Dienst
anderer_tarif = copy.deepcopy(eigen); anderer_tarif["rateGroups"][0]["singleValue"]["flatRate"]["amountMicros"] = "9900000"
a = FalscheApi([CH1, anderer_tarif]); c = laufe(a, "zurueck")
pruef("zurueck: anderer Tarif: Exit 8, kein insert", c == 8 and a.inserts == [])
pruef("ist_unser_dienst: anderer Tarif nein", not mv.ist_unser_dienst(anderer_tarif) and mv.ist_unser_dienst(eigen))
# 25. Schwärzung je Schicht einzeln (jede Schicht muss für sich schwärzen)
class R:
    def __init__(self, code, text): self.status_code, self.text = code, text
    def json(self): return {}
class Nur:
    def __init__(self, r): self.r = r
    def get(self, *a, **k): return self.r
    def post(self, url, json=None, **k): self.gesendet = json; return self.r
mv.HTTP = Nur(R(500, f"kaputt accounts/{KONTO} id {KONTO}"))
try:
    mv.lesen({}, "x"); pruef("lesen wirft", False)
except mv.Abbruch as e:
    pruef("lesen: Fehlertext geschwärzt", KONTO not in str(e))
try:
    mv.einfuegen({}, "x", {"services": [], "etag": "e"}); pruef("einfuegen wirft", False)
except mv.Abbruch as e:
    pruef("einfuegen: Fehlertext geschwärzt", KONTO not in str(e))
t = Nur(R(200, "")); mv.HTTP = t
os.environ["TELEGRAM_BOT_TOKEN"], os.environ["TELEGRAM_CHAT_ID"] = "t", "c"
mv.telegram(f"Text accounts/{KONTO}")
pruef("telegram: schwärzt selbst", KONTO not in t.gesendet["text"])
del os.environ["TELEGRAM_BOT_TOKEN"], os.environ["TELEGRAM_CHAT_ID"]
d = tempfile.mkdtemp(); os.environ["GITHUB_STEP_SUMMARY"] = os.path.join(d, "s.md")
mv.zusammenfassung(f"Text accounts/{KONTO}")
pruef("zusammenfassung: schwärzt selbst", KONTO not in open(os.path.join(d, "s.md")).read())
del os.environ["GITHUB_STEP_SUMMARY"]
import io, contextlib
alt_lauf = mv.lauf
def wirft(modus, h): raise mv.Abbruch(4, f"roh accounts/{KONTO}")
mv.lauf = wirft; mv.anmelden = lambda: {}
puffer = io.StringIO(); os.environ["MODUS"] = "pruefen"
with contextlib.redirect_stdout(puffer):
    mv.main()
del os.environ["MODUS"]; mv.lauf = alt_lauf
pruef("main: Abbruchtext geschwärzt", KONTO not in puffer.getvalue() and "ABBRUCH" in puffer.getvalue())

# 26. zweiter Wächterlauf im Verzug: liest den alten Stand, Google lehnt das veraltete etag ab, kein Doppel
a = FalscheApi([CH1, CH2], verzug=99); c1 = laufe(a, "waechter"); c2 = laufe(a, "waechter")
pruef("zweiter Lauf im Verzug: erst 0, dann 6", c1 == 0 and c2 == 6)
gespeichert = (a.neu or a.stand)["services"]
pruef("zweiter Lauf im Verzug: genau ein LI-Dienst gespeichert", sum(1 for d in gespeichert if d["serviceName"] == mv.NAME) == 1)
# 27. Lesefehler beim Zurücklesen: wiederholen, dann Erfolg
a = FalscheApi([CH1, CH2]); a.lesefehler_nach_insert = 2; c = laufe(a, "waechter")
pruef("Lesefehler beim Zurücklesen: Exit 0", c == 0); pruef("Lesefehler beim Zurücklesen: zweimal gewartet", SCHLAEFE == [15.0, 15.0])
pruef("Lesefehler beim Zurücklesen: Meldung ✅", a.telegram and a.telegram[0].startswith("✅"))
# 28. GET liefert eine JSON-Liste: Exit 4, kein insert
a = FalscheApi([CH1, CH2]); a.get_liste = True; c = laufe(a, "waechter")
pruef("GET JSON-Liste: Exit 4", c == 4 and a.inserts == [])
# 29. Google speichert inaktiv, Antwort aktiv (mit JSON): sofort Exit 7, nicht ✅
a = FalscheApi([CH1, CH2]); a.speicher_inaktiv = True; c = laufe(a, "waechter")
pruef("inaktiv gespeichert, Antwort aktiv: Exit 7", c == 7); pruef("inaktiv gespeichert, Antwort aktiv: nicht gewartet", SCHLAEFE == [])
pruef("inaktiv gespeichert, Antwort aktiv: Warnung", a.telegram and a.telegram[0].startswith("⚠️"))
# 30. Vorlage: nur aktive Schweizer Dienste mit Zustellung
CH_LOKAL = dict(CH1, serviceName="lokal", shipmentType="LOCAL_DELIVERY", deliveryTime={"minTransitDays": 0, "maxTransitDays": 1})
CH_INAKTIV = dict(CH1, serviceName="alt", active=False, deliveryTime={"minTransitDays": 30, "maxTransitDays": 40})
CH_OHNE_ZEIT = {k: v for k, v in CH1.items() if k != "deliveryTime"}
CH_OHNE_ZEIT["serviceName"] = "ohne Zeit"
a = FalscheApi([CH_LOKAL, CH_INAKTIV, CH_OHNE_ZEIT, CH1, CH2]); c = laufe(a, "waechter")
s3 = a.inserts[0]["services"][-1] if a.inserts else {}
pruef("Vorlage: lokal und inaktiv übersprungen", c == 0 and s3.get("deliveryTime") == SOLL_LZ)
pruef("Vorlage: Versandart übernommen", s3.get("shipmentType") == "DELIVERY")
a = FalscheApi([CH_LOKAL, CH_INAKTIV, CH_OHNE_ZEIT]); pruef("Vorlage: nur lokal/inaktiv/ohne Zeit: Exit 5", laufe(a, "waechter") == 5 and a.inserts == [])
# 31. LI-Dienst mit Abholung/lokal zählt nicht als vorhanden; SHIPMENT_TYPE_UNSPECIFIED zählt
a = FalscheApi([CH1, {"serviceName": "LI lokal", "active": True, "deliveryCountries": ["LI"], "shipmentType": "LOCAL_DELIVERY"}])
pruef("LI lokal: Exit 8, kein insert", laufe(a, "waechter") == 8 and a.inserts == [])
a = FalscheApi([CH1, {"serviceName": "LI", "active": True, "deliveryCountries": ["LI"], "shipmentType": "SHIPMENT_TYPE_UNSPECIFIED"}])
pruef("LI unbestimmte Versandart: vorhanden", laufe(a, "waechter") == 0 and a.inserts == [])
# 32. versendet: eine Gruppe ohne Versand plus eine mit Tarif = versendet; Tabelle nur ohne Versand oder nur Label = nicht
flat = {"singleValue": {"flatRate": {"amountMicros": "9000000", "currencyCode": "CHF"}}}
kein = {"singleValue": {"noShipping": True}}
a = FalscheApi([CH1, {"serviceName": "LI2", "active": True, "deliveryCountries": ["LI"], "rateGroups": [kein, flat]}])
pruef("LI mit einer Versandgruppe: vorhanden", laufe(a, "waechter") == 0 and a.inserts == [])
tabelle_leer = {"mainTable": {"rows": [{"cells": [{"noShipping": True}, {"noShipping": True}]}]}}
a = FalscheApi([CH1, {"serviceName": "LI3", "active": True, "deliveryCountries": ["LI"], "rateGroups": [tabelle_leer]}])
pruef("LI Tabelle nur ohne Versand: Exit 8", laufe(a, "waechter") == 8 and a.inserts == [])
tabelle_ok = {"mainTable": {"rows": [{"cells": [{"noShipping": True}, {"flatRate": {"amountMicros": "1"}}]}]}}
pruef("versendet: Tabelle mit einem Tarif", mv.versendet({"rateGroups": [tabelle_ok]}))
pruef("versendet: nur Label-Gruppe nein", not mv.versendet({"rateGroups": [dict(flat, applicableShippingLabels=["sperrig"])]}))
pruef("versendet: ohne Gruppen ja", mv.versendet({}))
# 33. zurueck: veränderte übrige Dienste oder verlorene Lager werden erkannt
a = FalscheApi([CH1, CH2, eigen]); a.aendere_app_dienst = True; c = laufe(a, "zurueck")
pruef("zurueck, App-Dienst verändert: Exit 7", c == 7)
a = FalscheApi([CH1, CH2, eigen], lager=LAGER); a.aendere_lager = True; c = laufe(a, "zurueck")
pruef("zurueck, Lager verloren: Exit 7", c == 7)
# 34. Fehler nach dem Senden: als Eingriff gemeldet, Code bleibt
alt_nds = mv.nach_dem_senden
def wirft_key(*a_): raise KeyError("x")
mv.nach_dem_senden = wirft_key
a = FalscheApi([CH1, CH2]); c = laufe(a, "waechter"); mv.nach_dem_senden = alt_nds
pruef("Fehler nach Senden: Exit 9", c == 9)
pruef("Fehler nach Senden: Meldung nennt Senden", a.telegram and "nach dem Senden" in a.telegram[0] and "KeyError" in a.telegram[0])
def wirft_abbruch(*a_): raise mv.Abbruch(4, f"lesen kaputt accounts/{KONTO}")
mv.nach_dem_senden = wirft_abbruch
a = FalscheApi([CH1, CH2]); c = laufe(a, "schreiben"); mv.nach_dem_senden = alt_nds
pruef("Abbruch nach Senden: Code bleibt 4", c == 4); pruef("Abbruch nach Senden: Text", "nach dem Senden" in AUSGABE[0])
pruef("Abbruch nach Senden: ohne Kontonummer", ohne_konto(a))
# 35. Anzeige stürzt nicht ab (Pauschaltarif ohne amountMicros), schwärzt
import io, contextlib
puffer = io.StringIO()
with contextlib.redirect_stdout(puffer):
    mv.zeigen("T", {"services": [{"serviceName": f"x {KONTO}", "rateGroups": [{"singleValue": {"flatRate": {"currencyCode": "CHF"}}}]}]})
pruef("zeigen: ohne amountMicros kein Absturz", "0.00 CHF" in puffer.getvalue())
pruef("zeigen: schwärzt", KONTO not in puffer.getvalue())
puffer = io.StringIO()
with contextlib.redirect_stdout(puffer):
    mv.zeigen("T", {"services": [CH2, CH1]})
pruef("zeigen: Mindestbestellwert als Betrag", "Mindestbestellwert=45.00 CHF" in puffer.getvalue() and "Mindestbestellwert=keiner" in puffer.getvalue())
puffer = io.StringIO()
with contextlib.redirect_stdout(puffer):
    mv.zeigen("T", {"services": [{"rateGroups": "kaputt"}]})
pruef("zeigen: kaputte Daten nur Hinweis", "Anzeige nicht möglich" in puffer.getvalue())
# 36. Schwärzen vor dem Kürzen: Kontonummer an der Schnittkante
mv.HTTP = Nur(R(500, "x" * 297 + KONTO))
try:
    mv.lesen({}, "x")
except mv.Abbruch as e:
    pruef("Schnittkante lesen: kein Ziffernrest", KONTO[:3] not in str(e))
mv.HTTP = Nur(R(500, "x" * 297 + KONTO))
try:
    mv.einfuegen({}, "x", {"services": [], "etag": "e"})
except mv.Abbruch as e:
    pruef("Schnittkante insert: kein Ziffernrest", KONTO[:3] not in str(e))

# 37. insert-Antwort ist eine JSON-Liste: wie «ohne Antwort», Zurücklesen entscheidet
a = FalscheApi([CH1, CH2]); a.antwort_liste = True; c = laufe(a, "waechter")
pruef("insert-Antwort Liste: Exit 0 über Zurücklesen", c == 0 and "GLEICH" in AUSGABE[0])
# 38. zurueck: Google behält unseren Dienst und verliert die Lager: sofort Exit 7, nicht warten
a = FalscheApi([CH1, CH2, eigen], lager=LAGER); a.ignoriere_dienste = True; a.aendere_lager = True; c = laufe(a, "zurueck")
pruef("zurueck ignoriert, Lager weg: Exit 7", c == 7); pruef("zurueck ignoriert, Lager weg: nicht gewartet", SCHLAEFE == [])

# 39. RUECKLESEN_VERSUCHE=0: trotzdem einmal zurücklesen
alt_v = mv.RUECKLESEN_VERSUCHE; mv.RUECKLESEN_VERSUCHE = 0
a = FalscheApi([CH1, CH2]); c = laufe(a, "waechter"); mv.RUECKLESEN_VERSUCHE = alt_v
pruef("Versuche 0: einmal gelesen, Exit 0", c == 0 and a.gets == 2 and SCHLAEFE == [])

# 40. Lieferzeit angleichen: unser Dienst mit den alten Schweizer Zeiten
alt_eigen = copy.deepcopy(eigen); alt_eigen["deliveryTime"] = dict(CH1["deliveryTime"])
a = FalscheApi([CH1, CH2, alt_eigen], lager=LAGER); c = laufe(a, "waechter")
pruef("Wächter, Lieferzeit alt: Exit 0, kein insert", c == 0 and a.inserts == [])
pruef("Wächter, Lieferzeit alt: Hinweis im Log", "weicht von der Vorgabe" in AUSGABE[0] and "Transit 9-19" in AUSGABE[0])
pruef("Wächter, Lieferzeit alt: kein Telegram", a.telegram == [])
a = FalscheApi([CH1, CH2, alt_eigen]); c = laufe(a, "pruefen", {"ZEITPLAN": "1"})
pruef("Zeitplan prüfen, Lieferzeit alt: Exit 0 (nicht 10), kein insert", c == 0 and a.inserts == [])
# 41. schreiben gleicht an: ein insert, nur unsere Lieferzeit ändert sich
a = FalscheApi([CH1, CH2, alt_eigen], lager=LAGER); c = laufe(a, "schreiben")
pruef("schreiben, Lieferzeit: Exit 0", c == 0); pruef("schreiben, Lieferzeit: ein insert", len(a.inserts) == 1)
s4 = a.inserts[0]["services"] if a.inserts else []
pruef("schreiben, Lieferzeit: CH-Dienste unverändert", s4[:2] == [CH1, CH2])
pruef("schreiben, Lieferzeit: neue Zeiten, Rest des Dienstes gleich",
      len(s4) == 3 and s4[2]["deliveryTime"] == SOLL_LZ
      and {k: v for k, v in s4[2].items() if k != "deliveryTime"} == {k: v for k, v in alt_eigen.items() if k != "deliveryTime"})
pruef("schreiben, Lieferzeit: Lager und etag", a.inserts and a.inserts[0].get("warehouses") == LAGER and a.inserts[0].get("etag") == "e1")
pruef("schreiben, Lieferzeit: Text", "angeglichen" in AUSGABE[0] and "GLEICH" in AUSGABE[0])
pruef("schreiben, Lieferzeit: kein Telegram", a.telegram == [])
# 42. danach: nichts mehr zu tun
a.stand, a.neu = a.neu or a.stand, None; n = len(a.inserts); c = laufe(a, "schreiben")
pruef("schreiben, Lieferzeit stimmt: nichts zu tun", c == 0 and len(a.inserts) == n and "nichts zu tun" in AUSGABE[0])
# 43. Verzug beim Angleichen: wiederholen, dann Erfolg; dauernd: mit Antwort 0, ohne Antwort 7
a = FalscheApi([CH1, CH2, alt_eigen], verzug=3); c = laufe(a, "schreiben")
pruef("Lieferzeit mit Verzug: Exit 0 nach Warten", c == 0 and SCHLAEFE == [15.0, 15.0, 15.0])
a = FalscheApi([CH1, CH2, alt_eigen], verzug=99); c = laufe(a, "schreiben")
pruef("Lieferzeit dauernder Verzug mit Antwort: Exit 0 mit Hinweis", c == 0 and "noch nicht sichtbar" in AUSGABE[0])
a = FalscheApi([CH1, CH2, alt_eigen], verzug=99); a.antwort_ohne_json = True; c = laufe(a, "schreiben")
pruef("Lieferzeit dauernder Verzug ohne Antwort: Exit 7", c == 7)
# 44. Google verändert dabei einen App-Dienst: Exit 7, nicht gewartet
a = FalscheApi([CH1, CH2, alt_eigen]); a.aendere_app_dienst = True; c = laufe(a, "schreiben")
pruef("Lieferzeit, App-Dienst verändert: Exit 7", c == 7 and SCHLAEFE == [])
# 45. Antwort ohne neue Lieferzeit: Exit 7
class AntwortAlt(FalscheApi):
    def post(self, url, json=None, **kw):
        r = super().post(url, json=json, **kw)
        if "telegram" not in url and isinstance(r._d, dict):
            for d in r._d.get("services", []):
                if d["serviceName"] == mv.NAME: d["deliveryTime"] = dict(CH1["deliveryTime"])
        return r
a = AntwortAlt([CH1, CH2, alt_eigen]); c = laufe(a, "schreiben")
pruef("Lieferzeit, Antwort ohne neue Zeit: Exit 7", c == 7)
# 46. ohne etag: nicht angleichen
a = FalscheApi([CH1, CH2, alt_eigen], etag=None); c = laufe(a, "schreiben")
pruef("Lieferzeit ohne etag: Exit 4, kein insert", c == 4 and a.inserts == [])
# 47. Fehler nach dem Senden der Lieferzeit: Text nennt das Senden, ohne Kontonummer
alt_lnd = mv.lieferzeit_nach_dem_senden
def wirft_l(*a_): raise KeyError("x")
mv.lieferzeit_nach_dem_senden = wirft_l
a = FalscheApi([CH1, CH2, alt_eigen]); c = laufe(a, "schreiben"); mv.lieferzeit_nach_dem_senden = alt_lnd
pruef("Lieferzeit, Fehler nach Senden: Exit 9 und Text", c == 9 and "Lieferzeit wurde gesendet" in AUSGABE[0] and ohne_konto(a))
# 47b. Abbruch nach dem Senden der Lieferzeit: Code bleibt, Text nennt das Senden
def wirft_a(*a_): raise mv.Abbruch(4, "Lesefehler")
mv.lieferzeit_nach_dem_senden = wirft_a
a = FalscheApi([CH1, CH2, alt_eigen]); c = laufe(a, "schreiben"); mv.lieferzeit_nach_dem_senden = alt_lnd
pruef("Lieferzeit, Abbruch nach Senden: Code 4 bleibt", c == 4 and "Lieferzeit wurde gesendet" in AUSGABE[0])
# 47c. Lager verändert beim Angleichen: Exit 7
a = FalscheApi([CH1, CH2, alt_eigen], lager=LAGER); a.aendere_lager = True; c = laufe(a, "schreiben")
pruef("Lieferzeit, Lager verändert: Exit 7 mit Grund", c == 7 and "übrige Dienste oder Lager" in AUSGABE[0])
# 47d. jedes Zurücklesen scheitert: mit Antwort Exit 7 (nie Erfolg)
a = FalscheApi([CH1, CH2, alt_eigen]); a.lesefehler_nach_insert = 99; c = laufe(a, "schreiben")
pruef("Lieferzeit, Zurücklesen scheitert immer: Exit 7", c == 7 and "Zurücklesen scheiterte" in AUSGABE[0])
a = FalscheApi([CH1, CH2, alt_eigen]); a.lesefehler_nach_insert = 2; c = laufe(a, "schreiben")
pruef("Lieferzeit, zwei Lesefehler, dann lesbar: Exit 0", c == 0 and "GLEICH" in AUSGABE[0])
# 48. fremder aktiver LI-Dienst: Lieferzeit wird nie angefasst
fremd_li = {"serviceName": "App LI", "active": True, "deliveryCountries": ["LI"], "currencyCode": "CHF",
            "deliveryTime": {"minTransitDays": 2, "maxTransitDays": 3}}
a = FalscheApi([CH1, fremd_li]); c = laufe(a, "schreiben")
pruef("fremder LI-Dienst, schreiben: nichts zu tun", c == 0 and a.inserts == [])
# 50. Angleichen, Google speichert unseren Dienst inaktiv: Exit 7 ohne langes Warten (Prüfer-Befund 1)
a = FalscheApi([CH1, CH2, alt_eigen]); a.speicher_inaktiv = True; c = laufe(a, "schreiben")
pruef("Lieferzeit, inaktiv gespeichert: Exit 7", c == 7)
pruef("Lieferzeit, inaktiv gespeichert: nicht gewartet", SCHLAEFE == [])
pruef("Lieferzeit, inaktiv gespeichert: Text", "nicht aktiv" in AUSGABE[0] and "Senden" in AUSGABE[0])
# 51. Antwort mit neuer Zeit, gespeichert ist ein neues etag mit der alten Zeit: Exit 7 ohne Warten
class SpeichertAlt(FalscheApi):
    def post(self, url, json=None, **kw):
        r = super().post(url, json=json, **kw)
        if "telegram" not in url and self.neu:
            self.neu["services"] = copy.deepcopy(self.stand["services"])
        return r
a = SpeichertAlt([CH1, CH2, alt_eigen]); c = laufe(a, "schreiben")
pruef("Lieferzeit, neues etag ohne neue Zeit: Exit 7", c == 7 and SCHLAEFE == [])
pruef("Lieferzeit, neues etag ohne neue Zeit: Text", "nicht wie gesendet" in AUSGABE[0])
a = FalscheApi([CH1, CH2, alt_eigen]); a.ignoriere_dienste = True; c = laufe(a, "schreiben")
pruef("Lieferzeit, Antwort mit alter Zeit: Exit 7", c == 7 and "insert-Antwort" in ergebnis())
# 52. Zahlen als Zeichenkette: gilt als gleich, kein Dauersenden (Prüfer-Befund 2)
str_eigen = copy.deepcopy(eigen); str_eigen["deliveryTime"] = {k: str(v) for k, v in eigen["deliveryTime"].items() if k in mv.LIEFERZEIT_LI}
a = FalscheApi([CH1, CH2, str_eigen]); c = laufe(a, "schreiben")
pruef("Lieferzeit als Zeichenkette: nichts zu tun", c == 0 and a.inserts == [] and "nichts zu tun" in AUSGABE[0])
a = FalscheApi([CH1, CH2, str_eigen]); c = laufe(a, "waechter")
pruef("Lieferzeit als Zeichenkette, Wächter: kein Hinweis", c == 0 and "weicht" not in AUSGABE[0] and a.telegram == [])
# 53. Transit-Tabelle am eigenen Dienst: schreiben Exit 8 ohne insert, Wächter nur Hinweis (Prüfer-Befund 3)
tab_eigen = copy.deepcopy(alt_eigen); tab_eigen["deliveryTime"]["transitTimeTable"] = {"rows": []}
a = FalscheApi([CH1, CH2, tab_eigen]); c = laufe(a, "schreiben")
pruef("Transit-Tabelle, schreiben: Exit 8 ohne insert", c == 8 and a.inserts == [])
a = FalscheApi([CH1, CH2, tab_eigen]); c = laufe(a, "waechter")
pruef("Transit-Tabelle, Wächter: Hinweis, Exit 0", c == 0 and a.inserts == [] and "Transit-Tabelle" in AUSGABE[0])
lag_eigen = copy.deepcopy(eigen); lag_eigen["deliveryTime"]["warehouseBasedDeliveryTimes"] = [{"warehouse": "x"}]
a = FalscheApi([CH1, CH2, lag_eigen]); c = laufe(a, "schreiben")
pruef("Lager-Lieferzeiten, sonst richtig: schreiben Exit 8 ohne insert", c == 8 and a.inserts == [])
# 54. Werktage der Vorlage (mit Samstag) werden nicht übernommen (Prüfer-Befund 4)
SAMSTAG = {"businessDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]}
CH1S = copy.deepcopy(CH1); CH1S["deliveryTime"]["handlingBusinessDayConfig"] = SAMSTAG
CH1S["deliveryTime"]["transitBusinessDayConfig"] = SAMSTAG
d54 = mv.neuer_dienst({"services": [CH1S]})["deliveryTime"]
pruef("Vorlage mit Samstag: Werktage ausdrücklich Montag bis Freitag", all(d54.get(k) == MOFR for k in mv.WERKTAG_FELDER))
pruef("Vorlage mit Samstag: Annahmezeit und LI-Zeiten", d54.get("cutoffTime") == CH1["deliveryTime"]["cutoffTime"]
      and all(d54[k] == v for k, v in mv.LIEFERZEIT_LI.items()))
CH1T = copy.deepcopy(CH1); CH1T["deliveryTime"]["warehouseBasedDeliveryTimes"] = [{"w": 1}]
pruef("Vorlage mit Lager-Lieferzeiten: nicht übernommen",
      "warehouseBasedDeliveryTimes" not in mv.neuer_dienst({"services": [CH1T]})["deliveryTime"])
# 55. eigener Dienst mit Samstag: Wächter Hinweis, schreiben entfernt die Werktage, Zahlen bleiben
sa_eigen = copy.deepcopy(eigen); sa_eigen["deliveryTime"]["handlingBusinessDayConfig"] = SAMSTAG
a = FalscheApi([CH1, CH2, sa_eigen]); c = laufe(a, "waechter")
pruef("eigener Dienst mit Samstag, Wächter: Hinweis", c == 0 and a.inserts == [] and "Montag bis Freitag" in AUSGABE[0])
a = FalscheApi([CH1, CH2, sa_eigen]); c = laufe(a, "schreiben")
g55 = [d for d in (a.inserts[0]["services"] if a.inserts else []) if d["serviceName"] == mv.NAME]
pruef("eigener Dienst mit Samstag, schreiben: Werktage Mo-Fr, GLEICH", c == 0 and len(g55) == 1
      and g55[0]["deliveryTime"]["handlingBusinessDayConfig"] == MOFR and "GLEICH" in AUSGABE[0])
mofr = copy.deepcopy(eigen); mofr["deliveryTime"]["transitBusinessDayConfig"] = {"businessDays": list(reversed(mv.WERKTAGE))}
a = FalscheApi([CH1, CH2, mofr]); c = laufe(a, "schreiben")
pruef("Werktage ausdrücklich Mo-Fr: nichts zu tun", c == 0 and a.inserts == [])
# 56. zwei eigene aktive Dienste, Google speichert nur einen neu: Exit 7 (Prüfer-Befund 5)
alt_eigen2 = copy.deepcopy(alt_eigen); alt_eigen2["rateGroups"][0]["name"] = "zweite Gruppe"
alt_eigen2["serviceName"] = "STANDARD LIECHTENSTEIN"  # nur Verteidigung: zweiter eigener Dienst in anderer Schreibweise
class NurEiner(FalscheApi):
    def post(self, url, json=None, **kw):
        r = super().post(url, json=json, **kw)
        if "telegram" not in url and self.neu:
            for d in self.neu["services"]:
                if d.get("rateGroups") and d["rateGroups"][0].get("name") == "zweite Gruppe":
                    d["deliveryTime"] = dict(CH1["deliveryTime"])
        return r
a = NurEiner([CH1, CH2, alt_eigen, alt_eigen2]); c = laufe(a, "schreiben")
pruef("zwei eigene, nur einer gespeichert: Exit 7", c == 7)
a = FalscheApi([CH1, CH2, alt_eigen, alt_eigen2]); c = laufe(a, "schreiben")
pruef("zwei eigene, beide gespeichert: Exit 0", c == 0 and "GLEICH" in AUSGABE[0])
# 57. eigener inaktiver Dienst plus fremder aktiver LI-Dienst: nichts zu tun, kein insert
inakt_alt = copy.deepcopy(alt_eigen); inakt_alt["active"] = False
a = FalscheApi([CH1, CH2, inakt_alt, fremd_li]); c = laufe(a, "schreiben")
pruef("eigener inaktiv + fremder aktiv: nichts zu tun", c == 0 and a.inserts == [] and "nichts zu tun" in AUSGABE[0])
# 58. eigener inaktiver und eigener aktiver Dienst: nur der aktive wird geändert
inakt_alt2 = copy.deepcopy(inakt_alt); inakt_alt2["rateGroups"][0]["name"] = "inaktive Gruppe"
inakt_alt2["serviceName"] = "standard Liechtenstein"
a = FalscheApi([CH1, CH2, inakt_alt2, alt_eigen]); c = laufe(a, "schreiben")
g58 = a.inserts[0]["services"] if a.inserts else []
pruef("inaktiver eigener bleibt unverändert", inakt_alt2 in g58)
pruef("aktiver eigener angeglichen, Exit 0", c == 0 and any(mv.ist_unser_dienst(d) and d.get("active") and mv.lieferzeit_ok(d) for d in g58))
# 59. Google ändert dabei den inaktiven eigenen Dienst: Exit 7
class AendereInaktiv(FalscheApi):
    def post(self, url, json=None, **kw):
        r = super().post(url, json=json, **kw)
        if "telegram" not in url and self.neu:
            for d in self.neu["services"]:
                if d.get("rateGroups") and d["rateGroups"][0].get("name") == "inaktive Gruppe":
                    d["currencyCode"] = "EUR"
        return r
a = AendereInaktiv([CH1, CH2, inakt_alt2, alt_eigen]); c = laufe(a, "schreiben")
pruef("inaktiver eigener verändert: Exit 7 mit Grund", c == 7 and "übrige Dienste oder Lager" in AUSGABE[0])
# 60. gleichnamiger Dienst mit anderem Tarif neben fremdem LI-Dienst: unsere Lieferzeit-Regel fasst ihn nicht an
anders_tarif = copy.deepcopy(alt_eigen); anders_tarif["rateGroups"][0]["singleValue"]["flatRate"]["amountMicros"] = "9900000"
a = FalscheApi([CH1, CH2, fremd_li, anders_tarif]); c = laufe(a, "schreiben")
pruef("gleichnamig, anderer Tarif: kein insert", a.inserts == [] and c == 0)
# 61. Zeitlimit beim POST: Exit 9 «möglicherweise gesendet», ohne Kontonummer
class PostZeitlimit(FalscheApi):
    def post(self, url, json=None, **kw):
        if "telegram" in url:
            return super().post(url, json=json, **kw)
        raise TimeoutError(f"read timeout accounts/{KONTO}")
a = PostZeitlimit([CH1, CH2, alt_eigen]); c = laufe(a, "schreiben")
pruef("POST-Zeitlimit beim Angleichen: Exit 9 möglicherweise gesendet", c == 9 and "möglicherweise gesendet" in AUSGABE[0] and ohne_konto(a))
a = PostZeitlimit([CH1, CH2]); c = laufe(a, "waechter")
pruef("POST-Zeitlimit beim Anlegen: Exit 9, Telegram ohne Konto", c == 9 and "möglicherweise gesendet" in AUSGABE[0]
      and len(a.telegram) == 1 and ohne_konto(a))
# 62. insert-Antwort mit Eintrag, der kein Objekt ist: Exit 9 «nach dem Senden», kein Absturz in der Anzeige
class AntwortKaputt(FalscheApi):
    def post(self, url, json=None, **kw):
        r = super().post(url, json=json, **kw)
        if "telegram" not in url and isinstance(r._d, dict):
            r._d["services"].append(7)
        return r
a = AntwortKaputt([CH1, CH2, alt_eigen]); c = laufe(a, "schreiben")
pruef("Antwort mit Nicht-Objekt: Exit 9 nach dem Senden", c == 9 and "Lieferzeit wurde gesendet" in AUSGABE[0])
# 63. insert-Antwort im Log geschwärzt (lange Ziffern der App-Dienstnamen)
CHZ = copy.deepcopy(CH1); CHZ["serviceName"] = "flat_7.00_CHF_123456789012_1234567890123_standard"
a = FalscheApi([CHZ, CH2, alt_eigen]); c = laufe(a, "schreiben")
pruef("Log ohne lange Ziffern", c == 0 and "123456789012" not in AUSGABE[0] and "insert-Antwort" in AUSGABE[0])
# 64. eigener Dienst ohne Lieferzeit: Annahmezeit aus der Vorlage, LI-Zeiten
ohne_lz = copy.deepcopy(eigen); ohne_lz.pop("deliveryTime")
a = FalscheApi([CH1, CH2, ohne_lz]); c = laufe(a, "schreiben")
g64 = [d for d in (a.inserts[0]["services"] if a.inserts else []) if d["serviceName"] == mv.NAME]
pruef("ohne Lieferzeit: Vorlage und LI-Zeiten", c == 0 and len(g64) == 1
      and g64[0]["deliveryTime"] == SOLL_LZ)
a = FalscheApi([ohne_lz]); c = laufe(a, "schreiben")
g64b = [d for d in (a.inserts[0]["services"] if a.inserts else []) if d["serviceName"] == mv.NAME]
pruef("ohne Lieferzeit und ohne Vorlage: nur LI-Zeiten", c == 0 and len(g64b) == 1 and g64b[0]["deliveryTime"] == SOLL_OHNE_ANNAHME)
pruef("lieferzeit_text ohne Lieferzeit stürzt nicht ab", "None" in mv.lieferzeit_text({"deliveryTime": None}))
# 65. unvollständige Lieferzeit am eigenen Dienst: kein Absturz, Hinweis
teil = copy.deepcopy(eigen); teil["deliveryTime"] = {"minTransitDays": 9}
a = FalscheApi([CH1, CH2, teil]); c = laufe(a, "waechter")
pruef("unvollständige Lieferzeit, Wächter: Exit 0 mit Hinweis", c == 0 and "weicht von der Vorgabe" in AUSGABE[0])
# 66. Google speichert unseren Dienst mit anderer Währung, Lieferzeit stimmt: Exit 7
class AndereWaehrung(FalscheApi):
    def post(self, url, json=None, **kw):
        r = super().post(url, json=json, **kw)
        if "telegram" not in url and self.neu:
            for d in self.neu["services"]:
                if d["serviceName"] == mv.NAME:
                    d["currencyCode"] = "EUR"
        return r
a = AndereWaehrung([CH1, CH2, alt_eigen]); c = laufe(a, "schreiben")
pruef("eigener Dienst anders gespeichert (Währung): Exit 7", c == 7 and "nicht wie gesendet" in AUSGABE[0])
# 67. inaktiv gespeichert und etag unverändert: trotzdem sofort Exit 7 (nicht 8 Versuche warten)
class InaktivGleichesEtag(FalscheApi):
    def post(self, url, json=None, **kw):
        alt_etag = self.stand.get("etag")
        r = super().post(url, json=json, **kw)
        if "telegram" not in url and self.neu:
            self.neu["etag"] = alt_etag
            for d in self.neu["services"]:
                if d["serviceName"] == mv.NAME:
                    d["active"] = False
        return r
a = InaktivGleichesEtag([CH1, CH2, alt_eigen]); c = laufe(a, "schreiben")
pruef("inaktiv gespeichert, gleiches etag: Exit 7 ohne Warten", c == 7 and SCHLAEFE == [])
# 68. inaktiver eigener Dienst schon vorher da, Verzug beim Zurücklesen: kein Fehlalarm
a = FalscheApi([CH1, CH2, inakt_alt2, alt_eigen], verzug=2); c = laufe(a, "schreiben")
pruef("vorher inaktiver eigener + Verzug: Exit 0 GLEICH", c == 0 and "GLEICH" in AUSGABE[0])
# 69. Prüfer Runde 3 (Zusätze Z1 bis Z10, angepasst)
a = FalscheApi([CH1, CH2, fremd_li, alt_eigen]); c = laufe(a, "schreiben")
b = a.inserts[0]["services"] if a.inserts else []
pruef("Z1 fremder LI-Dienst im Body unverändert", c == 0 and fremd_li in b)
klein_anders = copy.deepcopy(alt_eigen); klein_anders["serviceName"] = "standard liechtenstein"
klein_anders["rateGroups"][0]["singleValue"]["flatRate"]["amountMicros"] = "9900000"
a = FalscheApi([CH1, CH2, klein_anders, alt_eigen]); c = laufe(a, "schreiben")
b = a.inserts[0]["services"] if a.inserts else []
pruef("Z2 gleichnamig anderer Tarif unverändert", c == 0 and klein_anders in b)
fuenf = copy.deepcopy(eigen); fuenf["deliveryTime"]["transitBusinessDayConfig"] = {"businessDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "SATURDAY"]}
a = FalscheApi([CH1, CH2, fuenf]); c = laufe(a, "waechter")
pruef("Z3 fünf Tage mit Samstag: Hinweis", c == 0 and "Montag bis Freitag" in AUSGABE[0])
tr_sa = copy.deepcopy(eigen); tr_sa["deliveryTime"]["transitBusinessDayConfig"] = SAMSTAG
a = FalscheApi([CH1, CH2, tr_sa]); c = laufe(a, "schreiben")
g = [d for d in (a.inserts[0]["services"] if a.inserts else []) if d["serviceName"] == mv.NAME]
pruef("Z4 Transit-Werktage mit Samstag: auf Mo-Fr gesetzt", c == 0 and len(g) == 1 and g[0]["deliveryTime"]["transitBusinessDayConfig"] == MOFR)
class ErstAltDannFehler(FalscheApi):
    def get(self, url, **kw):
        if self.inserts and not url.endswith("pageSize=50"):
            self.z = getattr(self, "z", 0) + 1
            if self.z > 1:
                self.gets += 1
                return Antwort(503, None, "backend")
        return super().get(url, **kw)
a = ErstAltDannFehler([CH1, CH2, alt_eigen], verzug=99); c = laufe(a, "schreiben")
pruef("Z9 Lieferzeit, alt dann Fehler: Exit 7 (nicht bestätigt)", c == 7 and "teilweise gescheitert" in ergebnis())
a = ErstAltDannFehler([CH1, CH2], verzug=99); c = laufe(a, "waechter")
pruef("Z9 Anlegen, alt dann Fehler: Exit 7 (nicht bestätigt)", c == 7 and "teilweise gescheitert" in ergebnis())
pruef("Z10 sieben Ziffern geschwärzt", "1234567" not in mv.schwaerzen("id 1234567 x"))
pruef("Z10 sechs Ziffern bleiben", "123456" in mv.schwaerzen("id 123456 x"))
# 70. jede Meldung nach dem Senden nennt das Senden (Anlegen und Angleichen)
class AntwortOhneZeit(FalscheApi):  # Anlegen: Antwort trägt unseren Dienst mit Schweizer Zeit
    def post(self, url, json=None, **kw):
        r = super().post(url, json=json, **kw)
        if "telegram" not in url and isinstance(r._d, dict):
            for d in r._d.get("services") or []:
                if d.get("serviceName") == mv.NAME:
                    d["deliveryTime"] = dict(CH1["deliveryTime"])
        return r
class SpeichertSchweizerZeit(FalscheApi):  # Anlegen: gespeichert mit Schweizer Zeit, Antwort richtig
    def post(self, url, json=None, **kw):
        r = super().post(url, json=json, **kw)
        if "telegram" not in url and self.neu:
            for d in self.neu["services"]:
                if d["serviceName"] == mv.NAME:
                    d["deliveryTime"] = dict(CH1["deliveryTime"])
        return r
def mit(**kw):
    def bau(dienste, cls=FalscheApi, **k2):
        a = cls(dienste, **k2)
        for k, v in kw.items(): setattr(a, k, v)
        return a
    return bau
FAELLE = [
    ("Anlegen, App-Dienst verändert", lambda: mit(aendere_app_dienst=True)([CH1, CH2]), "waechter"),
    ("Anlegen, inaktiv gespeichert", lambda: mit(speicher_inaktiv=True)([CH1, CH2]), "waechter"),
    ("Anlegen, Antwort ohne LI", lambda: mit(antwort_ohne_li=True)([CH1, CH2]), "waechter"),
    ("Anlegen, Antwort ohne Zeit", lambda: AntwortOhneZeit([CH1, CH2]), "waechter"),
    ("Anlegen, gespeichert mit Schweizer Zeit", lambda: SpeichertSchweizerZeit([CH1, CH2]), "waechter"),
    ("Anlegen, ohne LI gespeichert", lambda: mit(speicher_ohne_li=True)([CH1, CH2]), "waechter"),
    ("Anlegen, Verzug ohne Antwort", lambda: mit(antwort_ohne_json=True)([CH1, CH2], verzug=99), "waechter"),
    ("Anlegen, Lesefehler", lambda: mit(lesefehler_nach_insert=99)([CH1, CH2]), "waechter"),
    ("Angleichen, App-Dienst verändert", lambda: mit(aendere_app_dienst=True)([CH1, CH2, alt_eigen]), "schreiben"),
    ("Angleichen, inaktiv gespeichert", lambda: mit(speicher_inaktiv=True)([CH1, CH2, alt_eigen]), "schreiben"),
    ("Angleichen, Antwort ohne neue Zeit", lambda: AntwortAlt([CH1, CH2, alt_eigen]), "schreiben"),
    ("Angleichen, alt gespeichert", lambda: SpeichertAlt([CH1, CH2, alt_eigen]), "schreiben"),
    ("Angleichen, ohne LI gespeichert", lambda: mit(speicher_ohne_li=True)([CH1, CH2, alt_eigen]), "schreiben"),
    ("Angleichen, Verzug ohne Antwort", lambda: mit(antwort_ohne_json=True)([CH1, CH2, alt_eigen], verzug=99), "schreiben"),
    ("Angleichen, Lesefehler", lambda: mit(lesefehler_nach_insert=99)([CH1, CH2, alt_eigen]), "schreiben"),
    ("Angleichen, Lager verändert", lambda: mit(aendere_lager=True)([CH1, CH2, alt_eigen], lager=LAGER), "schreiben"),
]
for titel, bau, modus in FAELLE:
    a = bau(); c = laufe(a, modus); e = ergebnis()
    pruef(f"nach dem Senden: {titel}: Exit 7", c == 7)
    pruef(f"nach dem Senden: {titel}: Text nennt das Senden", "Senden" in e or "gesendet" in e)
    if modus == "waechter":
        pruef(f"nach dem Senden: {titel}: Telegram nennt das Senden", len(a.telegram) == 1 and ("Senden" in a.telegram[0] or "gesendet" in a.telegram[0]))
# 71. Anlegen: gespeichert mit Schweizer Zeit oder ohne unseren Dienst: sofort Exit 7 (nicht warten)
a = SpeichertSchweizerZeit([CH1, CH2]); c = laufe(a, "waechter")
pruef("Anlegen, Schweizer Zeit gespeichert: ohne Warten", c == 7 and SCHLAEFE == [] and "Lieferzeit" in ergebnis())
a = FalscheApi([CH1, CH2]); a.speicher_ohne_li = True; c = laufe(a, "waechter")
pruef("Anlegen, neuer Stand ohne unseren Dienst: ohne Warten, Text", c == 7 and SCHLAEFE == [] and "Google-App" in ergebnis())
a = FalscheApi([CH1, CH2, alt_eigen]); a.speicher_ohne_li = True; c = laufe(a, "schreiben")
pruef("Angleichen, neuer Stand ohne unseren Dienst: Text", c == 7 and "fehlt im neuen Stand" in ergebnis())
a = AntwortOhneZeit([CH1, CH2]); c = laufe(a, "waechter")
pruef("Anlegen, Antwort abweichend: Stand einmal gezeigt", c == 7 and "Nach dem Senden gelesen" in AUSGABE[0])
# 72. Versandart: eigener Dienst mit lokaler Zustellung wird nicht angeglichen
lokal_eigen = copy.deepcopy(alt_eigen); lokal_eigen["shipmentType"] = "LOCAL_DELIVERY"
a = FalscheApi([CH1, CH2, fremd_li, lokal_eigen]); c = laufe(a, "schreiben")
pruef("eigener lokaler Dienst + fremder: nichts zu tun", c == 0 and a.inserts == [])
a = FalscheApi([CH1, CH2, lokal_eigen]); c = laufe(a, "schreiben")
pruef("nur eigener lokaler Dienst: Exit 8", c == 8 and a.inserts == [])
# 73. insert schickt jedes gelesene Feld mit (ausser name)
a = FalscheApi([CH1, CH2, alt_eigen]); a.stand["kuenftiges_feld"] = {"x": 1}; c = laufe(a, "schreiben")
pruef("insert: unbekanntes Feld mitgeschickt, name nicht", a.inserts and a.inserts[0].get("kuenftiges_feld") == {"x": 1}
      and "name" not in a.inserts[0])
# 74. Vorlage mit Annahmezeit wird vorgezogen
a = FalscheApi([CH2, CH1]); c = laufe(a, "waechter")
s74 = [d for d in (a.inserts[0]["services"] if a.inserts else []) if d["serviceName"] == mv.NAME]
pruef("Vorlage mit Annahmezeit vorgezogen", c == 0 and len(s74) == 1 and s74[0]["deliveryTime"] == SOLL_LZ)
# 75. LIEFERZEIT_LI bleibt nach Läufen unverändert; Attrappe lehnt doppelte Namen ab (Gegenprobe)
pruef("LIEFERZEIT_LI unverändert", mv.LIEFERZEIT_LI == {"minHandlingDays": 1, "maxHandlingDays": 3, "minTransitDays": 10, "maxTransitDays": 29})
a = FalscheApi([CH1, CH2]); r75 = a.post("https://x/shippingSettings:insert", json={"services": [CH1, CH1], "etag": "e1"})
pruef("Attrappe: doppelter Name gibt 400", r75.status_code == 400)
# 76. zwei Schweizer Dienste mit Annahmezeit: der erste ist die Vorlage
CH3 = copy.deepcopy(CH1); CH3["serviceName"] = "flat_9.00_CHF_express"
CH3["deliveryTime"]["cutoffTime"] = {"hour": 10, "minute": 0, "timeZone": "Europe/Zurich"}
a = FalscheApi([CH1, CH3, CH2]); c = laufe(a, "waechter")
s76 = [d for d in (a.inserts[0]["services"] if a.inserts else []) if d["serviceName"] == mv.NAME]
pruef("zwei Vorlagen mit Annahmezeit: die erste", c == 0 and len(s76) == 1 and s76[0]["deliveryTime"]["cutoffTime"]["hour"] == 14)
# 77. Lesestand ohne etag gilt nicht als neuer Stand (Verzug, Antwort bestätigt): Exit 0 mit Hinweis
class VerzugOhneEtag(FalscheApi):
    def get(self, url, **kw):
        r = super().get(url, **kw)
        if self.inserts and isinstance(r._d, dict) and self.neu is not None:
            r._d.pop("etag", None)
        return r
a = VerzugOhneEtag([CH1, CH2, alt_eigen], verzug=99); c = laufe(a, "schreiben")
pruef("Verzug, Lesestand ohne etag: Exit 0 mit Hinweis", c == 0 and "noch nicht sichtbar" in ergebnis())
# 78. Anlegen: inaktiv gespeichert bei gleichem etag: sofort Exit 7
a = InaktivGleichesEtag([CH1, CH2]); c = laufe(a, "waechter")
pruef("Anlegen, inaktiv bei gleichem etag: ohne Warten", c == 7 and SCHLAEFE == [])
# 79. Anlegen: App-Dienst verändert und unser Dienst fehlt, gleiches etag: sofort Exit 7
class AppVeraendertGleichesEtag(FalscheApi):
    def post(self, url, json=None, **kw):
        alt_etag = self.stand.get("etag")
        r = super().post(url, json=json, **kw)
        if "telegram" not in url and self.neu:
            self.neu["etag"] = alt_etag
            self.neu["services"] = [dict(d, currencyCode="EUR") if i == 0 else d
                                    for i, d in enumerate(self.neu["services"]) if d["serviceName"] != mv.NAME]
        return r
a = AppVeraendertGleichesEtag([CH1, CH2]); c = laufe(a, "waechter")
pruef("Anlegen, App-Dienst verändert, gleiches etag: ohne Warten", c == 7 and SCHLAEFE == [] and "übrige Dienste" in ergebnis())
# 80. Angleichen: abweichende Antwort zeigt den Stand einmal; Lesefehler dabei bricht nicht ab
a = AntwortAlt([CH1, CH2, alt_eigen]); c = laufe(a, "schreiben")
pruef("Angleichen, Antwort abweichend: Stand einmal gezeigt", c == 7 and "Nach dem Senden gelesen" in AUSGABE[0])
a = AntwortAlt([CH1, CH2, alt_eigen]); a.wirf_nach_insert = True; c = laufe(a, "schreiben")
pruef("Antwort abweichend, Lesen scheitert: Exit 7, kein Abbruch", c == 7 and "nicht möglich" in AUSGABE[0] and ohne_konto(a))
# 81. ein Werktag-Feld mit Samstag, das andere fehlt: Hinweis nennt die Werktage
halb = copy.deepcopy(eigen); halb["deliveryTime"]["handlingBusinessDayConfig"] = SAMSTAG; halb["deliveryTime"].pop("transitBusinessDayConfig")
a = FalscheApi([CH1, CH2, halb]); c = laufe(a, "waechter")
pruef("ein Werktag-Feld mit Samstag, anderes fehlt: Hinweis", c == 0 and "(Werktage nicht Montag bis Freitag)" in ergebnis())
# 82. zwei eigene aktive, der erste stimmt: der Hinweis nennt den abweichenden
zweit = copy.deepcopy(alt_eigen2)
a = FalscheApi([CH1, CH2, eigen, zweit]); c = laufe(a, "waechter")
pruef("Hinweis nennt den abweichenden Dienst", c == 0 and "Transit 9-19" in ergebnis())
# 83. leere Lieferzeit {} am eigenen Dienst: Annahmezeit aus der Vorlage
leer = copy.deepcopy(eigen); leer["deliveryTime"] = {}
a = FalscheApi([CH1, CH2, leer]); c = laufe(a, "schreiben")
g83 = [d for d in (a.inserts[0]["services"] if a.inserts else []) if d["serviceName"] == mv.NAME]
pruef("leere Lieferzeit: Vorlage und LI-Zeiten", c == 0 and len(g83) == 1 and g83[0]["deliveryTime"] == SOLL_LZ)
# 49. lieferzeit_ok
pruef("lieferzeit_ok ja", mv.lieferzeit_ok({"deliveryTime": dict(mv.LIEFERZEIT_LI, cutoffTime={})}))
pruef("lieferzeit_ok nein", not mv.lieferzeit_ok({"deliveryTime": dict(mv.LIEFERZEIT_LI, maxTransitDays=19)}))
pruef("lieferzeit_ok ohne Zeit nein", not mv.lieferzeit_ok({}))

print(f"ok {ok}, fehler {fehler}")
sys.exit(1 if fehler else 0)
