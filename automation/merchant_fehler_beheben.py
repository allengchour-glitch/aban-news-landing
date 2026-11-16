#!/usr/bin/env python3
"""Merchant Center: Einspruch bei Fehlurteilen und verwaiste Angebote löschen (16.11.2026).

Freigabe: Besitzer 16.11.2026 auf eine gezielte Rückfrage: «Ja, Einspruch» (11 Produkte) und «Löschen»
(17 Angebote, deren Shopify-Variante es nicht mehr gibt). Ziele stehen fest in
dropship/merchant-fehler-1611/plan.json; das Werkzeug fasst nichts anderes an.

MODUS=trocken (Vorgabe): liest alles, zeigt je Ziel die gewählte Aktion, die Eingabefelder und die geplanten Werte,
schreibt nichts. MODUS=schreiben: löst die Einsprüche aus und löscht die verwaisten Angebote, liest danach frisch zurück.

Schutz:
- Einspruch nur auf das Problem mit dem geplanten Code (Titel passt), nur die Aktion je Produkt (nie «bei keinem Produkt»).
- Löschen nur, wenn die Shopify-Variante nachweislich fehlt (Admin API, direkt vor dem Löschen gelesen), höchstens 20.
- Gibt nie die Kontonummer, keinen actionContext und keinen Link aus (öffentliche Actions-Protokolle).
"""
import base64, json, os, sys, time
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPE = "https://www.googleapis.com/auth/content"
PLAN = "dropship/merchant-fehler-1611/plan.json"
MAX_LOESCHEN = 20
MAX_EINSPRUCH = 40
# Deutscher Problemtitel je Code (gemessen 16.11. mit renderproductissues, de-CH)
TITEL = {"tobacco_policy_violation": "Tabak", "live_animals_policy_violation": "lebender Tiere",
         "guns_parts_policy_violation": "Schusswaffen"}
EINSPRUCH_KNOPF = "Meiner Meinung nach liegt kein Problem vor"


def sauber(t, n=120):
    return " ".join(str(t or "").replace("|", "/").split())[:n]


def text(v):
    """TextWithTooltip oder Zeichenkette → Klartext."""
    if isinstance(v, dict):
        return sauber(v.get("simpleValue") or v.get("htmlValue") or v.get("tooltipText") or "", 200)
    return sauber(v, 200)


def segment(view_id):
    """Produkt-Segment (Base64url ohne Auffüllung) aus product_view.id; None bei unbekanntem Format."""
    teile = str(view_id or "").split("~")
    if len(teile) == 4 and teile[0] == "online":
        teile = teile[1:]
    if len(teile) != 3 or not all(teile):
        return None
    return base64.urlsafe_b64encode("~".join(teile).encode()).decode().rstrip("=")


def waehle_aktion(gerendert, code):
    """Aus renderedIssues die Einspruch-Aktion je Produkt für das Problem mit diesem Code.

    Gibt (aktion, ablauf) zurück oder (None, Grund)."""
    stichwort = TITEL.get(code)
    if not stichwort:
        return None, f"Code {code} nicht vorgesehen"
    passend = [ri for ri in gerendert if stichwort.lower() in str(ri.get("title", "")).lower()]
    if len(passend) != 1:
        return None, f"{len(passend)} Probleme mit «{stichwort}» im Titel"
    for a in passend[0].get("actions") or []:
        knopf = str(a.get("buttonLabel", ""))
        if "builtinUserInputAction" in a and knopf.strip() == EINSPRUCH_KNOPF:
            if not a.get("isAvailable"):
                gruende = "; ".join(sauber(r.get("message")) for r in a.get("reasons") or [])
                return None, f"Einspruch nicht verfügbar: {gruende or 'ohne Grund'}"
            ablaeufe = [f for f in a["builtinUserInputAction"].get("flows") or [] if f.get("id") == "disagree"]
            if len(ablaeufe) != 1:
                return None, f"{len(ablaeufe)} Abläufe «disagree»"
            return a, ablaeufe[0]
    return None, "keine Einspruch-Aktion je Produkt"


def werte(ablauf, begruendung):
    """Eingabewerte für den Ablauf. Gibt (liste, beschreibung) zurück oder (None, Grund) bei unklarer Auswahl."""
    liste, beschr = [], []
    for f in ablauf.get("inputs") or []:
        fid = f.get("id")
        if "textInput" in f:
            liste.append({"inputFieldId": fid, "textInputValue": {"value": begruendung[:500]}})
            beschr.append(f"Text «{text(f.get('label'))}» = Begründung")
        elif "checkboxInput" in f:
            liste.append({"inputFieldId": fid, "checkboxInputValue": {"value": True}})
            beschr.append(f"Haken «{text(f.get('label'))}» = ja")
        elif "choiceInput" in f:
            opts = (f.get("choiceInput") or {}).get("options") or []
            if len(opts) == 1:
                wahl = opts[0]
            else:
                treffer = [o for o in opts if any(w in text(o.get("label")).lower()
                                                  for w in ("kein problem", "irrtüm", "fälschlich", "falsch", "nicht zutreffend", "fehler von google"))]
                if len(treffer) != 1:
                    return None, f"Auswahl «{text(f.get('label'))}» unklar: " + " / ".join(text(o.get("label")) for o in opts)
                wahl = treffer[0]
            liste.append({"inputFieldId": fid, "choiceInputValue": {"choiceInputOptionId": wahl.get("id")}})
            beschr.append(f"Auswahl «{text(f.get('label'))}» = «{text(wahl.get('label'))}»")
        elif f.get("required"):
            return None, f"Pflichtfeld unbekannter Art: {sorted(f)}"
    return liste, "; ".join(beschr) or "keine Eingabefelder"


def anmelden():
    roh = os.environ.get("GCP_SA_KEY", "")
    if not roh.strip():
        print("ABBRUCH: GCP_SA_KEY fehlt"); sys.exit(2)
    cred = service_account.Credentials.from_service_account_info(json.loads(roh), scopes=[SCOPE])
    cred.refresh(Request())
    return {"Authorization": "Bearer " + cred.token, "Content-Type": "application/json"}


def konto(h):
    r = requests.get("https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50", headers=h, timeout=30)
    r.raise_for_status()
    k = r.json().get("accounts") or []
    if len(k) != 1:
        print(f"ABBRUCH: {len(k)} Konten sichtbar"); sys.exit(3)
    return k[0]["name"]


def ruf(methode, url, h, **kw):
    """HTTP mit Wiederholung bei 429/5xx/Netzfehler. Schreibende Aufrufe (POST/DELETE) werden nicht wiederholt."""
    lesen = methode == "GET" or url.endswith(":renderproductissues") or "reports:search" in url
    for versuch in range(5 if lesen else 1):
        try:
            r = requests.request(methode, url, headers=h, timeout=90, **kw)
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            if not lesen:
                raise
            print(f"... {type(e).__name__}, Versuch {versuch + 1}"); time.sleep(3 * 2 ** versuch); continue
        if lesen and r.status_code in (429, 500, 502, 503, 504):
            time.sleep(3 * 2 ** versuch); continue
        return r
    return r


def produkt_namen(h, name, angebote):
    """Alle product_view-IDs (de und fr) für die Angebots-IDs."""
    ziel, gefunden, token = set(angebote), {}, None
    url = f"https://merchantapi.googleapis.com/reports/v1/{name}/reports:search"
    while True:
        body = {"query": "SELECT id, offer_id FROM product_view", "pageSize": 1000}
        if token:
            body["pageToken"] = token
        r = ruf("POST", url, h, json=body)
        if r.status_code != 200:
            print(f"ABBRUCH: reports HTTP {r.status_code}"); sys.exit(4)
        j = r.json()
        for z in j.get("results") or []:
            pv = z.get("productView") or {}
            if pv.get("offerId") in ziel:
                gefunden.setdefault(pv["offerId"], []).append(pv.get("id"))
        token = j.get("nextPageToken")
        if not token:
            return gefunden


def variante_fehlt(variante):
    """True nur, wenn die Shopify-Admin-API die Variante sicher nicht kennt; None bei Lesefehler."""
    shop = os.environ.get("SHOPIFY_SHOP", "")
    if not shop:
        return None
    tk = requests.post(f"https://{shop}/admin/oauth/access_token", timeout=30, json={
        "client_id": os.environ.get("SHOPIFY_CLIENT_ID"), "client_secret": os.environ.get("SHOPIFY_CLIENT_SECRET"),
        "grant_type": "client_credentials"}).json().get("access_token")
    if not tk:
        return None
    r = requests.post(f"https://{shop}/admin/api/2025-01/graphql.json", timeout=30,
                      headers={"X-Shopify-Access-Token": tk, "Content-Type": "application/json"},
                      json={"query": "query($id:ID!){node(id:$id){id}}", "variables": {"id": f"gid://shopify/ProductVariant/{variante}"}})
    j = r.json() if r.status_code == 200 else {}
    if "data" not in j or j.get("errors"):
        return None
    return j["data"]["node"] is None


def main():
    modus = os.environ.get("MODUS", "trocken")
    if modus not in ("trocken", "schreiben"):
        print(f"ABBRUCH: unbekannter Modus {modus}"); return 2
    plan = json.load(open(PLAN))
    if len(plan["verwaist"]) > MAX_LOESCHEN or len(plan["einspruch"]) > MAX_EINSPRUCH:
        print("ABBRUCH: Plan grösser als die Grenzen"); return 2
    schreiben = modus == "schreiben"
    print(f"MODUS {modus}: {len(plan['einspruch'])} Einspruch-Angebote, {len(plan['verwaist'])} verwaiste Angebote")
    h = anmelden()
    name = konto(h)
    namen = produkt_namen(h, name, [e["angebot"] for e in plan["einspruch"]] + [v["angebot"] for v in plan["verwaist"]])
    fehler = 0
    ergebnis = {"einspruch": [], "verwaist": []}

    # 1. Einsprüche
    for e in plan["einspruch"]:
        for pid_view in namen.get(e["angebot"], []) or [None]:
            zeile = {"angebot": e["angebot"], "titel": e["titel"], "sprache": str(pid_view or "").split("~")[-3:-2] or ["?"]}
            seg = segment(pid_view)
            if not seg:
                print(f"EINSPRUCH|{e['angebot']}|bei Google nicht gefunden"); zeile["stand"] = "nicht gefunden"
                ergebnis["einspruch"].append(zeile); continue
            url = f"https://merchantapi.googleapis.com/issueresolution/v1/{name}/products/{seg}:renderproductissues"
            r = ruf("POST", url, h, params={"languageCode": "de-CH", "timeZone": "Europe/Zurich"},
                    json={"contentOption": "PRE_RENDERED_HTML", "userInputActionOption": "BUILT_IN_USER_INPUT_ACTIONS"})
            if r.status_code != 200:
                print(f"EINSPRUCH|{e['angebot']}|render HTTP {r.status_code}"); fehler += 1; continue
            aktion, ablauf = waehle_aktion(r.json().get("renderedIssues") or [], e["code"])
            if aktion is None:
                print(f"EINSPRUCH|{e['angebot']}|{zeile['sprache'][0]}|übersprungen: {ablauf}")
                zeile["stand"] = f"übersprungen: {ablauf}"; ergebnis["einspruch"].append(zeile); continue
            liste, beschr = werte(ablauf, e["begruendung"])
            if liste is None:
                print(f"EINSPRUCH|{e['angebot']}|{zeile['sprache'][0]}|übersprungen: {beschr}")
                zeile["stand"] = f"übersprungen: {beschr}"; ergebnis["einspruch"].append(zeile); continue
            print(f"EINSPRUCH|{e['angebot']}|{zeile['sprache'][0]}|{sauber(e['titel'], 50)}|Dialog «{text(ablauf.get('dialogTitle'))}»|{beschr}")
            if not schreiben:
                zeile["stand"] = "geplant"; ergebnis["einspruch"].append(zeile); continue
            body = {"actionContext": aktion["builtinUserInputAction"]["actionContext"],
                    "actionInput": {"actionFlowId": "disagree", "inputValues": liste}}
            t = ruf("POST", f"https://merchantapi.googleapis.com/issueresolution/v1/{name}:triggeraction", h,
                    params={"languageCode": "de-CH"}, json=body)
            if t.status_code != 200:
                print(f"   AUSGELÖST: nein, HTTP {t.status_code} {sauber(t.text, 200)}"); fehler += 1
                zeile["stand"] = f"Fehler HTTP {t.status_code}"
            else:
                print(f"   AUSGELÖST: ja, Antwort «{sauber(t.json().get('message'), 160)}»")
                zeile["stand"] = "ausgelöst"
            ergebnis["einspruch"].append(zeile)
            time.sleep(1)

    # 2. Verwaiste Angebote löschen
    geloescht = 0
    for v in plan["verwaist"]:
        fehlt = variante_fehlt(v["variante"])
        if fehlt is not True:
            print(f"VERWAIST|{v['angebot']}|nicht gelöscht: Variante {'existiert' if fehlt is False else 'nicht prüfbar'}")
            ergebnis["verwaist"].append({"angebot": v["angebot"], "stand": "nicht gelöscht"}); continue
        for pid_view in namen.get(v["angebot"], []):
            seg = segment(pid_view)
            sprache = str(pid_view).split("~")[-3]
            g = ruf("GET", f"https://merchantapi.googleapis.com/products/v1/{name}/products/{seg}", h)
            if g.status_code == 404:
                print(f"VERWAIST|{v['angebot']}|{sprache}|schon weg"); continue
            if g.status_code != 200:
                print(f"VERWAIST|{v['angebot']}|{sprache}|lesen HTTP {g.status_code}"); fehler += 1; continue
            quelle = g.json().get("dataSource") or ""
            if "/dataSources/" not in quelle:
                print(f"VERWAIST|{v['angebot']}|{sprache}|keine Datenquelle"); fehler += 1; continue
            print(f"VERWAIST|{v['angebot']}|{sprache}|{sauber(v['titel'], 50)}|Quelle …{quelle[-4:]}|"
                  + ("wird gelöscht" if schreiben else "würde gelöscht"))
            if not schreiben:
                continue
            if geloescht >= MAX_LOESCHEN * 2:
                print("ABBRUCH: Löschgrenze erreicht"); fehler += 1; break
            d = ruf("DELETE", f"https://merchantapi.googleapis.com/products/v1/{name}/productInputs/{seg}", h,
                    params={"dataSource": quelle})
            if d.status_code not in (200, 204):
                print(f"   GELÖSCHT: nein, HTTP {d.status_code} {sauber(d.text, 200)}"); fehler += 1
            else:
                geloescht += 1; print("   GELÖSCHT: ja")
            time.sleep(0.5)
        ergebnis["verwaist"].append({"angebot": v["angebot"], "stand": "bearbeitet"})

    # 3. Frisch zurücklesen (nur nach dem Schreiben)
    if schreiben and geloescht:
        print("Warte 90 s, dann frisch lesen ...")
        time.sleep(90)
        noch = 0
        for v in plan["verwaist"]:
            for pid_view in namen.get(v["angebot"], []):
                g = ruf("GET", f"https://merchantapi.googleapis.com/products/v1/{name}/products/{segment(pid_view)}", h)
                if g.status_code != 404:
                    noch += 1; print(f"NACHLESEN|{v['angebot']}|noch da (HTTP {g.status_code})")
        print(f"NACHLESEN: {noch} verwaiste Angebote noch sichtbar (Google löscht teils verzögert)")
    print(f"ERGEBNIS {modus}: {sum(1 for z in ergebnis['einspruch'] if z.get('stand') in ('geplant', 'ausgelöst'))} Einsprüche "
          f"{'ausgelöst' if schreiben else 'geplant'}, {geloescht} Angebote gelöscht, {fehler} Fehler")
    with open("merchant_fehler.json", "w") as f:
        json.dump({"gelesen": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "modus": modus, **ergebnis}, f,
                  ensure_ascii=False, indent=1)
    return 3 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
