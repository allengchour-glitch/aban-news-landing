#!/usr/bin/env python3
"""lux_assistent.py — Einbau, Rückbau und Wache des kostenlosen Shop-Assistenten (21.10.2026).

Betreiber 21.10.: «smartbot auf shopify ist zu teuer — machst du es gratis und besser». Der Assistent (automation/theme/lux-assistent.liquid)
ist ein Theme-Abschnitt ohne App, ohne KI-Dienst, ohne Server: feste Antworten zu Versand, Lieferzeit, Rückgabe, Zahlung, Sendungsverfolgung
und Kontakt + Produktsuche über /search/suggest.json. Er hängt in sections/footer-group.json.

  --einbauen   Sicherung der Live-Gruppe, Abschnittsdatei hochladen, Gruppe um «lux_assistent» ergänzen, Rücklesen   (DRY=1 zeigt nur)
  --zurueck    Abschnitt aus der Live-Gruppe nehmen und die Datei löschen (die Gruppe wird LIVE gelesen, Zwischenänderungen bleiben)
  --wache      prüft: Datei live, Gruppe verweist darauf, Inhalt = Repo-Fassung, jede feste Antwort ist noch durch die Richtlinien gedeckt
               (Zahlen/Fristen/Zahlarten), jeder verlinkte Abschnitt existiert. Schreibt dropship/_lux_assistent_stand.json
  --zeile      Ampelzeile (leer = in Ordnung; ⚠️ bei Befund oder wenn der Stand älter als 36 h ist)
  --selbsttest ohne Netz
Die festen Antworten sind nur so wahr wie die Richtlinien: ändert sich eine Zahl dort (Gratisschwelle, Frist, Lieferzeit), schlägt die Wache an,
BEVOR eine Kundin eine veraltete Auskunft liest.
"""
import datetime, hashlib, html, json, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
QUELLE = os.path.join(REPO, "automation", "theme", "lux-assistent.liquid")
SICHERUNG = os.path.join(REPO, "dropship", "_lux_assistent_footer-group_vorher.json")
STAND = os.path.join(REPO, "dropship", "_lux_assistent_stand.json")
AKTIV = os.path.join(REPO, "dropship", "_lux_assistent_aktiv.txt")   # Aufseher prüft den Assistenten nur, solange diese Marke steht
SEKTION_DATEI = "sections/lux-assistent.liquid"
GRUPPE_DATEI = "sections/footer-group.json"
SEKTION_ID = "lux_assistent"
SEKTION_TYP = "lux-assistent"
ALT_STUNDEN = 36
DRY = os.environ.get("DRY") == "1"

# (Richtlinie, wörtlich vorkommende Wendung in der Richtlinie, wörtlich vorkommende Wendung in der Assistenten-Antwort)
FAKTEN = [
    ("SHIPPING_POLICY", "CHF 50", "CHF 50"),
    ("SHIPPING_POLICY", "14.90", "14.90"),
    ("SHIPPING_POLICY", "2–3 Werktage", "2–3 Werktage"),
    ("SHIPPING_POLICY", "7–14 Werktage", "7–14 Werktage"),
    ("SHIPPING_POLICY", "10–20 Werktage", "10–20 Werktage"),
    ("SHIPPING_POLICY", "15–45 Tage", "15–45 Tage"),
    ("REFUND_POLICY", "30-tägiges Rückgaberecht", "30 Tage Rückgaberecht"),
    ("REFUND_POLICY", "innerhalb von 7 Tagen nach Erhalt", "innerhalb von 7 Tagen nach Erhalt"),
    ("REFUND_POLICY", "innerhalb von 14 Tagen nach Eingang", "14 Tage nach Eingang"),
    ("TERMS_OF_SERVICE", "TWINT", "TWINT"),
    ("TERMS_OF_SERVICE", "Klarna", "Klarna"),
    ("TERMS_OF_SERVICE", "PayPal", "PayPal"),
    ("TERMS_OF_SERVICE", "Apple Pay", "Apple Pay"),
    ("TERMS_OF_SERVICE", "Google Pay", "Google Pay"),
    ("CONTACT_INFORMATION", "info@luxestyle.ch", "info@luxestyle.ch"),
    ("PAGE:kontakt-support", "Antwort in der Regel innert 24 Stunden an Werktagen", "Antwort in der Regel innert 24 Stunden an Werktagen"),
    ("PAGE:versand-lieferung", "Sendungsnummer folgt in einer zweiten E-Mail", "Sendungsnummer folgt in einer zweiten E-Mail"),
]


def _text(h):
    t = re.sub(r"<[^>]+>", " ", h or "")
    t = html.unescape(t).replace(" ", " ").replace("&ndash;", "–")
    return re.sub(r"\s+", " ", t)


def fakten_pruefen(richtlinien, quelle_text):
    """Liste der Befunde: je Zeile aus FAKTEN, deren Wendung in der Richtlinie ODER in der Antwort fehlt."""
    befunde = []
    for pol, in_pol, in_ant in FAKTEN:
        if in_pol not in richtlinien.get(pol, ""):
            befunde.append(f"Richtlinie {pol} nennt nicht mehr «{in_pol}» — die Antwort des Assistenten ist vermutlich veraltet")
        if in_ant not in quelle_text:
            befunde.append(f"Assistent nennt «{in_ant}» nicht mehr (Antwort geändert?)")
    return befunde


def links_aus_quelle(quelle_text):
    """(Seiten-Handles, Kollektions-Handles), die der Assistent verlinkt (R+'pages/…' / R+'collections/…')."""
    return (sorted(set(re.findall(r"R\+'pages/([a-z0-9-]+)'", quelle_text))),
            sorted(set(re.findall(r"R\+'collections/([a-z0-9-]+)'", quelle_text))))


def gruppe_zerlegen(inhalt):
    """(Kopfkommentar, Objekt). Horizon-Gruppen beginnen oft mit einem /* … */-Kommentar."""
    i = inhalt.index("{")
    return inhalt[:i], json.loads(inhalt[i:])


def gruppe_mit(inhalt):
    kopf, j = gruppe_zerlegen(inhalt)
    j.setdefault("sections", {})[SEKTION_ID] = {"type": SEKTION_TYP, "settings": {}}
    ordnung = [o for o in j.get("order", []) if o != SEKTION_ID]
    ordnung.append(SEKTION_ID)
    j["order"] = ordnung
    return kopf + json.dumps(j, ensure_ascii=False, indent=2) + "\n"


def gruppe_ohne(inhalt):
    kopf, j = gruppe_zerlegen(inhalt)
    j.get("sections", {}).pop(SEKTION_ID, None)
    j["order"] = [o for o in j.get("order", []) if o != SEKTION_ID]
    return kopf + json.dumps(j, ensure_ascii=False, indent=2) + "\n"


def verweist(inhalt):
    try:
        _, j = gruppe_zerlegen(inhalt)
    except Exception:
        return False
    return SEKTION_ID in j.get("sections", {}) and SEKTION_ID in j.get("order", [])


# ------------------------------------------------------------------ Shopify
def _gql():
    from ch_lager_profil import gql
    return gql


def theme_id(gql):
    return gql("{themes(first:1,roles:[MAIN]){nodes{id name}}}")["themes"]["nodes"][0]["id"]


def datei_lesen(gql, tid, name):
    d = gql('query($id:ID!,$n:[String!]!){theme(id:$id){files(filenames:$n,first:5){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}',
            {"id": tid, "n": [name]})["theme"]["files"]["nodes"]
    return d[0]["body"]["content"] if d else None


def datei_schreiben(gql, tid, name, inhalt):
    r = gql('mutation($id:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$f){upsertedThemeFiles{filename} userErrors{message}}}',
            {"id": tid, "f": [{"filename": name, "body": {"type": "TEXT", "value": inhalt}}]})["themeFilesUpsert"]
    if r.get("userErrors"):
        raise RuntimeError(f"{name}: {r['userErrors']}")


def datei_loeschen(gql, tid, name):
    r = gql('mutation($id:ID!,$f:[String!]!){themeFilesDelete(themeId:$id,files:$f){deletedThemeFiles{filename} userErrors{message}}}', {"id": tid, "f": [name]})["themeFilesDelete"]
    if r.get("userErrors"):
        raise RuntimeError(f"{name}: {r['userErrors']}")


def einbauen():
    gql = _gql()
    quelle = open(QUELLE, encoding="utf-8").read()
    tid = theme_id(gql)
    alt = datei_lesen(gql, tid, GRUPPE_DATEI)
    if not alt:
        print("⛔ footer-group.json live nicht lesbar — nichts geändert"); return 2
    neu = gruppe_mit(alt)
    print(f"Theme {tid} · Gruppe {len(alt)} → {len(neu)} Zeichen · Abschnitt {len(quelle)} Zeichen · schon verdrahtet: {verweist(alt)}")
    if DRY:
        print("DRY — nichts geschrieben"); return 0
    if not verweist(alt):                       # die Sicherung zeigt immer den Stand OHNE den Assistenten
        open(SICHERUNG, "w", encoding="utf-8").write(alt)
    datei_schreiben(gql, tid, SEKTION_DATEI, quelle)       # erst die Datei, dann der Verweis — nie ein hängender Verweis
    datei_schreiben(gql, tid, GRUPPE_DATEI, neu)
    # Rücklesen
    ok_s = hashlib.sha256((datei_lesen(gql, tid, SEKTION_DATEI) or "").encode()).hexdigest() == hashlib.sha256(quelle.encode()).hexdigest()
    ok_g = verweist(datei_lesen(gql, tid, GRUPPE_DATEI) or "")
    print(f"Rücklesen: Abschnittsdatei gleich {ok_s} · Gruppe verweist {ok_g}")
    if ok_s and ok_g:
        open(AKTIV, "w", encoding="utf-8").write(datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d") + "\tBetreiber «smartbot zu teuer, gratis und besser» (21.10.2026): Assistent eingebaut; Rückbau: python3 automation/lux_assistent.py --zurueck\n")
    if ok_s and ok_g:
        wache()          # sofort einen ersten Stand schreiben — ohne STAND bliebe der Assistent ungemessen, bis der Aufseher läuft
    return 0 if ok_s and ok_g else 1


def zurueck():
    gql = _gql()
    tid = theme_id(gql)
    alt = datei_lesen(gql, tid, GRUPPE_DATEI)
    if alt and verweist(alt):
        if DRY:
            print("DRY — würde Verweis entfernen und Datei löschen"); return 0
        datei_schreiben(gql, tid, GRUPPE_DATEI, gruppe_ohne(alt))
        print("Verweis aus der Gruppe entfernt")
    if not DRY:
        try:
            datei_loeschen(gql, tid, SEKTION_DATEI); print("Abschnittsdatei gelöscht")
        except RuntimeError as e:
            print(f"⚠️ Abschnittsdatei nicht gelöscht: {e} — Marken bleiben, die Wache meldet es")
            return 1
        for f in (AKTIV, STAND):          # erst jetzt: eine übriggebliebene Datei ohne Wache wäre unbemerkt
            try: os.remove(f)
            except OSError: pass
    return 0


def wache():
    gql = _gql()
    quelle = open(QUELLE, encoding="utf-8").read()
    tid = theme_id(gql)
    befunde = []
    live = datei_lesen(gql, tid, SEKTION_DATEI)
    gruppe = datei_lesen(gql, tid, GRUPPE_DATEI)
    if not live:
        befunde.append("Abschnittsdatei fehlt im Live-Theme")
    elif hashlib.sha256(live.encode()).hexdigest() != hashlib.sha256(quelle.encode()).hexdigest():
        befunde.append("Live-Abschnitt weicht von automation/theme/lux-assistent.liquid ab (von Hand geändert?)")
    if not gruppe or not verweist(gruppe):
        befunde.append("footer-group.json verweist nicht (mehr) auf den Assistenten")
    pol = {p["type"]: _text(p["body"]) for p in gql("{shop{shopPolicies{type body}}}")["shop"]["shopPolicies"]}
    for quelle_id in sorted({f[0] for f in FAKTEN if f[0].startswith("PAGE:")}):
        n = gql('query($q:String!){pages(first:1,query:$q){nodes{handle body}}}', {"q": "handle:" + quelle_id[5:]})["pages"]["nodes"]
        pol[quelle_id] = _text(n[0]["body"]) if n and n[0]["handle"] == quelle_id[5:] else ""
    befunde += fakten_pruefen(pol, quelle)
    seiten, kolls = links_aus_quelle(quelle)
    for h in seiten:
        n = gql('query($q:String!){pages(first:1,query:$q){nodes{handle isPublished}}}', {"q": f"handle:{h}"})["pages"]["nodes"]
        if not n or not n[0]["isPublished"] or n[0]["handle"] != h:
            befunde.append(f"verlinkte Seite /pages/{h} fehlt oder ist unveröffentlicht")
    for h in kolls:
        c = gql('query($h:String!){collectionByHandle(handle:$h){productsCount{count}}}', {"h": h})["collectionByHandle"]
        if not c or not c["productsCount"]["count"]:
            befunde.append(f"verlinkte Kollektion /collections/{h} fehlt oder ist leer")
    stand = {"stand": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "befunde": befunde,
             "seiten": len(seiten), "kollektionen": len(kolls), "fakten": len(FAKTEN)}
    open(STAND, "w", encoding="utf-8").write(json.dumps(stand, ensure_ascii=False, indent=1) + "\n")
    print(f"ASSISTENT: {len(befunde)} Befund(e) · {len(FAKTEN)} Fakten · {len(seiten)} Seiten · {len(kolls)} Kollektionen")
    for b in befunde:
        print("  ⚠️", b)
    return 1 if befunde else 0


def zeile(jetzt=None, stand=None):
    jetzt = jetzt or datetime.datetime.now(datetime.timezone.utc)
    if stand is None:
        try:
            stand = json.load(open(STAND, encoding="utf-8"))
        except Exception:
            if os.path.exists(AKTIV):
                return "⚠️ ASSISTENT: eingebaut, aber nie geprüft (kein Stand) — läuft die Wache im Aufseher?"
            return ""        # nicht eingebaut — kein Alarm
    try:
        t = datetime.datetime.strptime(stand["stand"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
    except Exception:
        return "⚠️ ASSISTENT: Stand unlesbar"
    if (jetzt - t).total_seconds() > ALT_STUNDEN * 3600:
        return f"⚠️ ASSISTENT: Wache hat seit {int((jetzt - t).total_seconds() // 3600)} h nicht geprüft"
    if stand.get("befunde"):
        return "⚠️ ASSISTENT: " + " · ".join(stand["befunde"][:3]) + (f" (+{len(stand['befunde']) - 3})" if len(stand["befunde"]) > 3 else "")
    return ""


def selbsttest():
    fehler = []

    def soll(ist, erwartet, name):
        if ist != erwartet:
            fehler.append(f"{name}: erwartet {erwartet!r}, war {ist!r}")
    quelle = open(QUELLE, encoding="utf-8").read()
    pol_ok = {"SHIPPING_POLICY": "ab CHF 50 gratis. Liechtenstein CHF 14.90. 2–3 Werktage, 7–14 Werktage, 10–20 Werktage, 15–45 Tage",
              "REFUND_POLICY": "30-tägiges Rückgaberecht … innerhalb von 7 Tagen nach Erhalt … spätestens innerhalb von 14 Tagen nach Eingang",
              "TERMS_OF_SERVICE": "TWINT PayPal Klarna Apple Pay Google Pay", "CONTACT_INFORMATION": "info@luxestyle.ch",
              "PAGE:kontakt-support": "Antwort in der Regel innert 24 Stunden an Werktagen", "PAGE:versand-lieferung": "Die Sendungsnummer folgt in einer zweiten E-Mail, sobald"}
    soll(fakten_pruefen(pol_ok, quelle), [], "Quelle stimmt mit Richtlinien überein")
    pol_neu = dict(pol_ok, SHIPPING_POLICY=pol_ok["SHIPPING_POLICY"].replace("CHF 50", "CHF 60"))
    b = fakten_pruefen(pol_neu, quelle)
    soll(len(b) == 1 and "CHF 50" in b[0], True, "Richtlinie ändert die Gratisschwelle → genau ein Befund")
    b = fakten_pruefen(pol_ok, quelle.replace("7–14 Werktage", "5–7 Werktage"))
    soll(len(b) == 1 and "7–14" in b[0], True, "Antwort ändert eine Lieferzeit → Befund")
    soll(len(fakten_pruefen({}, quelle)), len(FAKTEN), "leere Richtlinien → jede Zeile ein Befund")
    s, k = links_aus_quelle(quelle)
    soll(("rueckgabe" in s, "halloween" in k), (True, True), "Links erkannt")
    # Gruppe: Ergänzen/Entfernen, Kommentarkopf bleibt, Reihenfolge, Idempotenz
    g = '/* kopf */\n{"sections":{"a":{"type":"footer","settings":{}}},"order":["a"]}'
    mit = gruppe_mit(g)
    soll((verweist(mit), mit.startswith("/* kopf */")), (True, True), "Gruppe mit Assistent")
    soll(gruppe_mit(mit) == mit, True, "Einbau ist idempotent")
    ohne = gruppe_ohne(mit)
    soll((verweist(ohne), '"a"' in ohne, SEKTION_ID in ohne), (False, True, False), "Gruppe ohne Assistent")
    soll(verweist('{"sections":{"lux_assistent":{}},"order":[]}'), False, "Abschnitt ohne order-Eintrag zählt nicht")
    # zeile
    jetzt = datetime.datetime(2026, 10, 21, 12, 0, 0, tzinfo=datetime.timezone.utc)
    frisch = (jetzt - datetime.timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    alt = (jetzt - datetime.timedelta(hours=50)).strftime("%Y-%m-%dT%H:%M:%SZ")
    soll(zeile(jetzt, {"stand": frisch, "befunde": []}), "", "frisch und sauber → still")
    soll(zeile(jetzt, {"stand": frisch, "befunde": ["x"]}).startswith("⚠️"), True, "Befund → ⚠️")
    soll("50 h" in zeile(jetzt, {"stand": alt, "befunde": []}), True, "Stand 50 h alt → ⚠️")
    soll(zeile(jetzt, {"stand": "kaputt", "befunde": []}).startswith("⚠️"), True, "Stand unlesbar → ⚠️")
    soll("+41 79" in quelle, False, "Telefonnummer steht nicht im Assistenten")
    soll("versenden wir gratis" in quelle, False, "keine unbedingte Gratis-Zusage für CH-Lager")
    if fehler:
        print("\n".join("❌ " + f for f in fehler)); return 1
    print("✅ Selbsttest lux_assistent: alle Fälle richtig"); return 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--selbsttest" in a:
        sys.exit(selbsttest())
    if "--einbauen" in a:
        sys.exit(einbauen())
    if "--zurueck" in a:
        sys.exit(zurueck())
    if "--zeile" in a:
        print(zeile()); sys.exit(0)
    sys.exit(wache())
