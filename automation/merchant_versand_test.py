#!/usr/bin/env python3
"""Offline-Test für merchant_versand.py (kein Netz: gefälschte Merchant API und Telegram)."""
import copy, json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import merchant_versand as mv

KONTO = "4815162342"  # Kontonummer der Attrappe: darf nie in Ausgabe, Zusammenfassung oder Telegram stehen
CH1 = {"serviceName": "flat_7.00_CHF_standard", "active": True, "deliveryCountries": ["CH"], "currencyCode": "CHF",
       "deliveryTime": {"minTransitDays": 9, "maxTransitDays": 19, "minHandlingDays": 1, "maxHandlingDays": 1},
       "rateGroups": [{"singleValue": {"flatRate": {"amountMicros": "7000000", "currencyCode": "CHF"}}}], "shipmentType": "DELIVERY"}
CH2 = {"serviceName": "price_based_CHF_gratis", "active": True, "deliveryCountries": ["CH"], "currencyCode": "CHF",
       "deliveryTime": {"minTransitDays": 9, "maxTransitDays": 19, "minHandlingDays": 1, "maxHandlingDays": 1},
       "minimumOrderValue": {"amountMicros": "45000000", "currencyCode": "CHF"},
       "rateGroups": [{"mainTable": {"rows": [{"cells": [{"noShipping": True}]}]}}]}
LAGER = [{"name": "Lager Zürich", "shippingAddress": {"regionCode": "CH", "postalCode": "8000"}}]


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
pruef("Lieferzeit vom Schweizer Dienst", len(s) == 3 and s[2]["deliveryTime"] == CH1["deliveryTime"])
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
pruef("Vorlage: lokal und inaktiv übersprungen", c == 0 and s3.get("deliveryTime") == CH1["deliveryTime"])
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

print(f"ok {ok}, fehler {fehler}")
sys.exit(1 if fehler else 0)
