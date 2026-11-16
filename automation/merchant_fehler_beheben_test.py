#!/usr/bin/env python3
"""Tests ohne Netz für merchant_fehler_beheben.py (Aufruf: python3 -I automation/merchant_fehler_beheben_test.py)."""
import base64, json, os, sys, types

for n in ("requests", "requests.exceptions", "google", "google.oauth2", "google.oauth2.service_account",
          "google.auth", "google.auth.transport", "google.auth.transport.requests"):
    sys.modules.setdefault(n, types.ModuleType(n))
sys.modules["google.oauth2"].service_account = sys.modules["google.oauth2.service_account"]
sys.modules["google.auth.transport.requests"].Request = object
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import merchant_fehler_beheben as m  # noqa: E402

fehler = 0


def gleich(ist, soll, was):
    global fehler
    if ist != soll:
        fehler += 1
        print(f"FEHLER {was}: ist {ist!r}, soll {soll!r}")


def dek(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4)).decode()


# Segment
gleich(dek(m.segment("de~CH~shopify_ZZ_1_2")), "de~CH~shopify_ZZ_1_2", "Segment drei Teile")
gleich(dek(m.segment("online~fr~CH~x")), "fr~CH~x", "online entfernt")
gleich(m.segment("local~de~CH~x"), None, "local nicht vorgesehen")
gleich(m.segment(None), None, "leer")

ablauf_ok = {"id": "disagree", "dialogTitle": {"simpleValue": "Überprüfung"}, "inputs": [
    {"id": "t", "label": {"simpleValue": "Begründung"}, "required": True, "textInput": {}},
    {"id": "c", "label": {"simpleValue": "Ich bestätige"}, "required": True, "checkboxInput": {}}]}


def problem(titel, knopf=m.EINSPRUCH_KNOPF, verfuegbar=True, flows=None):
    return {"title": titel, "actions": [
        {"buttonLabel": "Meiner Meinung nach liegt bei keinem Produkt ein Problem vor", "isAvailable": True,
         "builtinUserInputAction": {"actionContext": "ALLE", "flows": [ablauf_ok]}},
        {"buttonLabel": knopf, "isAvailable": verfuegbar, "reasons": [{"message": "zu früh"}],
         "builtinUserInputAction": {"actionContext": "EINS", "flows": flows if flows is not None else [ablauf_ok]}}]}


# Aktion wählen: nur das passende Problem, nur die Aktion je Produkt
a, f = m.waehle_aktion([problem("„Mengeneinheit für Grundpreis“ fehlt"), problem("Tabakprodukte und Zubehör für Tabakkonsum")],
                       "tobacco_policy_violation")
gleich(a["builtinUserInputAction"]["actionContext"], "EINS", "nie die Aktion «bei keinem Produkt»")
gleich(f["id"], "disagree", "Ablauf disagree")
a, f = m.waehle_aktion([problem("Verkauf lebender Tiere")], "tobacco_policy_violation")
gleich(a, None, "falscher Code: kein Problem passt")
a, f = m.waehle_aktion([problem("Tabak A"), problem("Tabak B")], "tobacco_policy_violation")
gleich(a, None, "zwei passende Probleme: abbrechen")
a, f = m.waehle_aktion([problem("Schusswaffen und Schusswaffenteile", verfuegbar=False)], "guns_parts_policy_violation")
gleich((a, "zu früh" in f), (None, True), "nicht verfügbar mit Grund")
a, f = m.waehle_aktion([problem("Verkauf lebender Tiere", flows=[])], "live_animals_policy_violation")
gleich(a, None, "ohne Ablauf disagree")
a, f = m.waehle_aktion([problem("Alkoholische Getränke")], "alcohol_policy_violation")
gleich(a, None, "Alkohol ist nicht vorgesehen")
a, f = m.waehle_aktion([problem("Verkauf lebender Tiere", knopf="Etwas anderes")], "live_animals_policy_violation")
gleich(a, None, "anderer Knopf")

# Werte füllen
liste, b = m.werte(ablauf_ok, "Begründung X" * 100)
gleich([v["inputFieldId"] for v in liste], ["t", "c"], "Felder")
gleich(len(liste[0]["textInputValue"]["value"]), 500, "Text auf 500 gekürzt")
gleich(liste[1]["checkboxInputValue"]["value"], True, "Haken gesetzt")
eine = {"inputs": [{"id": "w", "label": "Grund", "required": True, "choiceInput": {"options": [{"id": "o1", "label": "x"}]}}]}
gleich(m.werte(eine, "b")[0], [{"inputFieldId": "w", "choiceInputValue": {"choiceInputOptionId": "o1"}}], "eine Option")
zwei = {"inputs": [{"id": "w", "label": "Grund", "required": True, "choiceInput": {"options": [
    {"id": "o1", "label": {"simpleValue": "Mein Produkt entspricht den Richtlinienanforderungen"}},
    {"id": "o2", "label": {"simpleValue": m.GRUND["tobacco_policy_violation"]}}]}}]}
gleich(m.werte(zwei, "b", m.GRUND["tobacco_policy_violation"])[0][0]["choiceInputValue"]["choiceInputOptionId"], "o2",
       "fest gewählter Grund, exakter Text")
gleich(m.werte(zwei, "b")[0], None, "ohne festen Grund keine Auswahl")
gleich(m.werte(zwei, "b", "ermöglicht nicht direkt")[0], None, "Teiltext genügt nicht")
doppelt = {"inputs": [{"id": "w", "label": "Grund", "required": True, "choiceInput": {"options": [
    {"id": "o1", "label": "X"}, {"id": "o2", "label": "X"}]}}]}
gleich(m.werte(doppelt, "b", "X")[0], None, "zwei gleiche Optionen brechen ab")
gleich(set(m.GRUND) == set(m.TITEL), True, "für jeden vorgesehenen Code ein Grund")
gleich(m.werte({"inputs": [{"id": "z", "required": True, "neu": {}}]}, "b")[0], None, "unbekanntes Pflichtfeld bricht ab")
gleich(m.werte({"inputs": []}, "b"), ([], "keine Eingabefelder"), "ohne Felder")

# Plan: Grenzen, nur vorgesehene Codes, verwaiste Angebote tragen eine Variante
plan = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dropship/merchant-fehler-1611/plan.json")))
gleich(len(plan["verwaist"]) <= m.MAX_LOESCHEN, True, "Plan unter Löschgrenze")
gleich(all(e["code"] in m.TITEL for e in plan["einspruch"]), True, "nur vorgesehene Codes im Einspruch")
gleich(all(v["variante"].isdigit() and v["angebot"].endswith("_" + v["variante"]) for v in plan["verwaist"]), True,
       "verwaiste Angebote passen zur Variante")
gleich(any("Cigarren" in e["titel"] or "Nachtsicht" in e["titel"] or "Gunstock" in e["titel"] for e in plan["einspruch"]),
       False, "kein Einspruch für echte oder strittige Fälle")

print(f"{'OK' if not fehler else 'FEHLGESCHLAGEN'}: {fehler} Fehler")
sys.exit(1 if fehler else 0)
