#!/usr/bin/env python3
"""knowledge_base_fakten.py — füllt die «Knowledge Base Facts» für KI-Assistenten (ChatGPT, Copilot, Shop) (07.10.2026).

ANLASS (Betreiber 07.10. 20:00 «knowledge installiert»): Die Shopify-App «Knowledge Base» legte 10 Fakten als Metaobjekte
`shopify--knowledge-base-fact` an — alle unveröffentlicht, nur mit KI-Vorschlägen. GEMESSEN: mehrere Vorschläge sind FALSCH
und hätten über ChatGPT/Copilot an Kundinnen gehen können: «verzichtet auf Zwischenhändler» (wir sind Direktversand ab
Lieferant), «Preise 50–70 % unter Boutiquen» (nicht belegt), «Schweizer Qualität», «Geschwindigkeit», Geschenkbelege /
Geschenkverpackung / Gutscheine = ja (alle drei gemessen 0; Quelle laut App /pages/ueber-uns — dort steht nichts davon).
Jeder Wert hier ist belegt: Richtlinien (Versand/Rückgabe/AGB/Impressum), Seite «Über uns», Admin-API-Zählungen.
Ledger dropship/_knowledge_base_fakten.tsv (handle, alter Wert, neuer Wert). Rückweg: published=false.
  python3 automation/knowledge_base_fakten.py          # Trockenlauf
  SCHARF=1 python3 automation/knowledge_base_fakten.py
  python3 automation/knowledge_base_fakten.py --wache   # eine Zeile «KNOWLEDGE-BASE: …» für den Aufseher (täglich)
Wache: meldet Fakten, die die App NEU angelegt hat (Handle nicht in FAKTEN — Vorschläge ungeprüft) und belegte Fakten,
deren Wert jemand/etwas geändert hat. Schreibt nichts.
"""
import json, os, sys, time
HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER); sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402

SCHARF = os.environ.get("SCHARF") == "1"
LEDGER = os.path.join(REPO, "dropship", "_knowledge_base_fakten.tsv")

FAKTEN = {   # handle → (feld, wert, beleg)
    "business_dna_business_overview": ("value_string",
        "LuxeStyle CH ist ein Einzelunternehmen von Alleng Chour aus Belp, gegründet 2026. Der Shop bietet eine Auswahl von über "
        "40'000 Artikeln aus Mode, Schmuck & Uhren, Beauty, Technik und Wohnen und liefert ausschliesslich in die Schweiz. "
        "Der grösste Teil wird direkt ab Lieferantenlager verschickt (10–20 Werktage); Artikel ab Schweizer Lager kommen in "
        "1–2 Werktagen, ab EU-Lager in 2–7 Werktagen — die Angabe steht auf jeder Produktseite. Bezahlung mit TWINT, Klarna, "
        "Karte, PayPal, Apple Pay oder Google Pay; 30 Tage Rückgabe.",
        "Versand-/Rückgabe-Richtlinie, AGB (Zahlungsmittel), Impressum, /pages/ueber-uns"),
    "target_audience": ("value_string",
        "Erwachsene in der Schweiz, die online Mode, Schmuck & Uhren, Beauty, Technik und Wohnideen zu fairen Preisen kaufen "
        "und Lieferzeit, Rückgabe und Endpreis vor dem Kauf klar sehen wollen.",
        "Markt nur Schweiz (Shopify Markets), Sortiment 20 Welten"),
    "brand_info_main_brands": ("value_string_list", ["LuxeStyle"],
        "productVendors: 51'475 von 51'476 aktiven Produkten tragen den Hersteller «LuxeStyle» (07.10.)"),
    "business_dna_brand_values": ("value_string_list",
        ["Ehrliche Lieferzeit je Artikel", "Faire Preise ohne Boutique-Aufschlag", "30 Tage Rückgabe",
         "Persönlicher Service aus Belp", "Keine erfundenen Bewertungen", "Keine versteckten Kosten"],
        "/pages/ueber-uns («Mein Versprechen», «Was du bei uns NICHT findest»)"),
    "business_dna_brand_aesthetic": ("value_string_list", ["Modern", "Minimalistisch", "Schwarz und Gold", "Klar und übersichtlich"],
        "Marken-Schriftzug LUXESTYLE in Gold auf Schwarz (Reels, Startseite)"),
    "business_info_start_year": ("value_string", "2026", "/pages/ueber-uns «seit 2026»"),
    "gift_services_info_gift_cards_available": ("value_boolean", False, "productsCount gift_card:true = 0, giftCards = 0 (07.10.)"),
    "gift_services_info_gift_receipts_available": ("value_boolean", False, "kein Geschenkbeleg-Angebot im Shop oder in den Richtlinien"),
    "gift_services_info_gift_wrapping_available": ("value_boolean", False, "0 Produkte «Geschenkverpackung»/«Geschenkservice» (07.10.)"),
    "second_hand_info_is_second_hand": ("value_boolean", False, "0 aktive mit generalüberholt/Refurbished/gebraucht/B-Ware (07.10.)"),
}


def main():
    r = gql('{metaobjects(type:"shopify--knowledge-base-fact",first:100){nodes{id handle fields{key value}}}}')
    alle = {n["handle"]: n for n in r["metaobjects"]["nodes"]}
    ok = fehl = 0
    for h, (feld, wert, beleg) in FAKTEN.items():
        n = alle.get(h)
        if not n:
            print(f"   fehlt in der App: {h}"); continue
        alt = {f["key"]: f["value"] for f in n["fields"]}
        neu = json.dumps(wert, ensure_ascii=False) if isinstance(wert, list) else ("true" if wert is True else "false" if wert is False else wert)
        gleich = lambda a, b: (json.loads(a) == json.loads(b)) if (a or "").startswith("[") and (b or "").startswith("[") else a == b
        if gleich(alt.get(feld), neu) and alt.get("published") == "true":
            print(f"{h:45s} schon gesetzt"); continue
        print(f"{h:45s} {feld:18s} → {str(neu)[:90]}")
        if not SCHARF:
            continue
        r = gql('mutation($id:ID!,$m:MetaobjectUpdateInput!){metaobjectUpdate(id:$id,metaobject:$m){metaobject{fields{key value}} userErrors{field message}}}',
                {"id": n["id"], "m": {"fields": [{"key": feld, "value": neu}, {"key": "published", "value": "true"}]}})
        u = r["metaobjectUpdate"]
        ist = {f["key"]: f["value"] for f in ((u.get("metaobject") or {}).get("fields") or [])}
        if not u["userErrors"] and gleich(ist.get(feld), neu) and ist.get("published") == "true":
            ok += 1
            with open(LEDGER, "a", encoding="utf-8") as f:
                f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{h}\t{alt.get(feld) or ''}\t{neu}\t{beleg}\n")
        else:
            fehl += 1; print("   ⚠️", u["userErrors"] or ist)
    print(f"FERTIG: {ok} gesetzt + veröffentlicht, {fehl} Fehler" if SCHARF else "FERTIG (trocken)")


def wache():
    try:
        r = gql('{metaobjects(type:"shopify--knowledge-base-fact",first:100){nodes{handle fields{key value}}}}')
    except Exception as e:
        print(f"KNOWLEDGE-BASE: unklar ({type(e).__name__})"); return
    neu, weg = [], []
    for n in r["metaobjects"]["nodes"]:
        f = {x["key"]: x["value"] for x in n["fields"]}
        if n["handle"] not in FAKTEN:
            neu.append(n["handle"]); continue
        feld, wert, _ = FAKTEN[n["handle"]]
        soll = json.dumps(wert, ensure_ascii=False) if isinstance(wert, list) else ("true" if wert is True else "false" if wert is False else wert)
        ist = f.get(feld) or ""
        gleich = (json.loads(ist) == json.loads(soll)) if ist.startswith("[") and soll.startswith("[") else ist == soll
        if not gleich or f.get("published") != "true":
            weg.append(n["handle"])
    if neu or weg:
        print(f"⚠️ KNOWLEDGE-BASE: {len(neu)} neue Fakten ungeprüft ({', '.join(neu[:4])}) · {len(weg)} abweichend ({', '.join(weg[:4])})"
              f" → automation/knowledge_base_fakten.py prüfen")
    else:
        print(f"KNOWLEDGE-BASE: {len(FAKTEN)}/{len(FAKTEN)} Fakten belegt + veröffentlicht")


if __name__ == "__main__":
    wache() if "--wache" in sys.argv else main()
