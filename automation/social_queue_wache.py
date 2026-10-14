#!/usr/bin/env python3
"""Wache über die fremde Social-Warteschlange (Shop-Metafeld luxestyle.social_queue, 05.09.2026).

Eine andere Session («Cloud-Redaktion», 06:00) füllt das Feld sieben Tage voraus, ein PC-Skript
(luxestyle-social/social-post.mjs) postet daraus täglich auf Instagram und legt den Eintrag in die
TikTok-Queue. Dieses Skript kennt KEINE der hiesigen Wachen (post_guard: Produkt-Ledger, Live-IG,
_SOCIAL_STOPP) und prüft die Ware beim Posten nicht. Es respektiert aber `status: "pausiert"`.

Genau dort setzt diese Wache an — sie MELDET (Standard) und PAUSIERT mit FIX=1 Einträge, die
  1. ein Produkt bewerben, das nicht ACTIVE / nicht im Onlineshop / im Preis abweichend ist,
  2. ein Risiko-Tag tragen (abgekündigt, nicht CH-versendbar, Heilaussage, Waffe, Lizenz, …),
  3. topische Kosmetik sind (Betreiber 30.08.: Cremes/Seren aus China nicht bewerben),
  4. laut Produkt-Ledger schon gepostet wurden (Doppelpost-Regel, 7 Schichten seit 12.07.),
  5. eine Aussage tragen, die für DIESES Produkt falsch ist (CH-Lager, 1–2 Tage, «Link in Bio», #fyp),
  6. ein Bild verlinken, das nicht antwortet.
Pausieren ist umkehrbar (status zurück auf «bereit»); der Grund steht im Eintrag (`grund`).
13.10.2026 — Zusage «1–2 Werktage ab Schweizer Lager» ist überholt: die Kasse rechnet ab CH-Lager meist 2–3 Werktage,
und das NUR für Ware mit Tag «profil-ch-lager» (Versandprofil CH-Lager); CH-Lager-Ware ohne Zeichen zeigt das lange
Fenster. Regel 7 (`zusage_pass`): «1–2 Wärchtäg/Werktage/Tage» in einem bereit-/pausiert-Eintrag mit chLager wird mit
FIX=1 auf den Kanon umgeschrieben (Zeichen live gelesen), ohne FIX gemeldet. Status bleibt, «gepostet» ist Protokoll.
Alttext je Feld: dropship/_social_queue_zusage.tsv. Geschrieben wird mit compareDigest (Routine 04:00 schreibt mit).
Selbsttest: python3 automation/social_queue_wache.py --selbsttest
Bericht: dropship/SOCIAL-QUEUE-WACHE.md (nur bei Befund, sonst gelöscht).
Regel dahinter: Ein zweiter Poster mit eigenem Ledger ist die Doppelpost-Klasse vom 26.07. —
wer ihn nicht abschalten kann, prüft wenigstens seine Eingabe.
"""
import json, os, re, ssl, sys, urllib.request, datetime, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from gfeed_restore import lieferantenref          # EINE Regel für die SKU-Form (Lehre 11.08.)
except Exception:                                      # Import darf die Wache nie verhindern
    def lieferantenref(sku):
        s = (sku or "").strip(); kern = re.sub(r"^cj-", "", s, flags=re.I)
        return bool(s) and bool(re.match(r"^(CJ[A-Z]{2}[0-9A-Z]{6,}|\d{9,}|[0-9a-f]{8}-)", kern, re.I) or re.match(r"^(bb[-_]?[SV0-9]|fortura|LX[-_]|LXSCH[-_]|\d+_\d+)", s, re.I))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_TOK = None
CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
FIX = os.environ.get("FIX") == "1"
BERICHT = os.path.join(ROOT, "dropship", "SOCIAL-QUEUE-WACHE.md")
HEUTE = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

RISIKO = {"cj-abgekuendigt", "cj-nicht-versendbar-ch", "medizinprodukt-pruefen", "heilaussage-pruefen",
          "waffengesetz-verboten", "waffe-pruefen", "verdeckte-ueberwachung", "abhoergeraet-pruefen", "lizenz-risiko",
          "nicht-bewerben", "nur-onlineshop", "niedrig-bewertet-nicht-bewerben", "marge-verlust-draft",
          "duplikat-auto-draft", "preis-pruefen-cj-spanne", "keine-lieferanten-ref", "ausverkauft-lieferant",
          "regulatorisch-pruefen", "klinge-ch-unverifiziert", "lizenz-nicht-bewerben", "ghost-sale-schutz-bb-draft",
          "18plus", "raucher", "outdoor-messer"}
# topische Kosmetik (Betreiber 30.08.): Creme/Serum/Lotion/Maske — Geräte (Bürste, Roller, LED) nicht
KOSMETIK = re.compile(r"\b(creme|crème|serum|lotion|gesichtsmaske|tuchmaske|peeling|toner|essenz)\b", re.I)
# Aussagen, die nur für CH-Lager-Ware wahr sind, plus Scam-Signale
FALSCH_OHNE_CHLAGER = re.compile(r"(ch-lager|schweizer lager|schwiizer lager|ab lager|1\s*[–-]\s*2\s*(tag|täg|werktag)|aus der schweiz|us de schwiiz|us dr schwiiz)", re.I)
IMMER_FALSCH = re.compile(r"(link in (der )?bio|#fyp\b|#foryou\b|#viral\b)", re.I)

# ── Regel 7 (13.10.2026): überholte Zusage «1–2 Tage ab Schweizer Lager» ────────────────────────────────────────
ZUSAGE_LEDGER = os.path.join(ROOT, "dropship", "_social_queue_zusage.tsv")
MARKE_PROFIL = "profil-ch-lager"     # Versandprofil «CH-Lager» (ch_lager_profil.py) — nur dann rechnet die Kasse kurz
KANON = {
    True:  {"captionTiktok": "Ab Schwiizer Lager – meist i 2–3 Wärchtäg bi dir.",
            "captionInstagram": "📦 Ab Schwiizer Lager · meist 2–3 Wärchtäg",
            "lieferzeit": "meist 2–3 Werktage ab Schweizer Lager (Fortura)"},
    False: {"captionTiktok": "Ab Schwiizer Lager – s genaue Lieferdatum gsehsch bim Artikel.",
            "captionInstagram": "📦 Ab Schwiizer Lager · Lieferdatum bim Artikel",
            "lieferzeit": "ab Schweizer Lager, Lieferdatum steht beim Artikel und in der Kasse"},
}
# «1–2», «1-2», «1 – 2», «1—2», «ein/eis/eins bis zwei» + Tag-Einheit (Tag/Tage/Tagen/Täg, Werk-/Wärch-/Arbeits-)
_ZAHL12 = r"(?:(?<![\d.,])1\s*[–—-]\s*2(?![\d.,])|\b(?:ein|eis|eins|einem)\s+bis\s+zwei)"
_EINHEIT = r"(?:wärch|werk|arbeits)?t[aä]g(?:e|en)?\b"
ZUSAGE_12 = re.compile(_ZAHL12 + r"\s*" + _EINHEIT, re.I)
# In Captions zählt die Zahl nur als Lieferzusage, wenn die ZEILE von Lager/Lieferung spricht («Antwort in 1–2 Tagen» nicht)
LIEFER_KONTEXT = re.compile(r"(lager|liefer|versand|verschick|zuestell|zugestellt|bi dir|bei dir|📦)", re.I)
# Die ganze Lager-Aussage («Ab Schwiizer Lager – i 1–2 Wärchtäg bi dir.») — Zusatz dahinter («· Original HARIBO») bleibt
ZUSAGE_SPANNE = re.compile(r"(?:📦\s*)?ab\s+(?:schwiizer|schweizer)\s+lager\b[^\n]*?" + _ZAHL12 + r"\s*" + _EINHEIT
                           + r"(?:\s+(?:bi|bei)\s+dir\b\.?)?", re.I)
ZUSAGE_FELDER = ("captionTiktok", "captionInstagram", "lieferzeit")


def zusage_treffer(text, feld):
    """Zeilen mit überholter 1–2-Tage-Zusage. Im Feld «lieferzeit» braucht es keinen Kontext (es IST die Lieferzeit)."""
    out = []
    for zeile in str(text or "").split("\n"):
        if ZUSAGE_12.search(zeile) and (feld == "lieferzeit" or LIEFER_KONTEXT.search(zeile)):
            out.append(zeile)
    return out


def zusage_kandidat(e):
    """Nur bereit/pausiert mit chLager — «gepostet» (und alles Unbekannte) ist Protokoll und bleibt unberührt."""
    return e.get("status") in ("bereit", "pausiert") and e.get("chLager") is True and \
        any(zusage_treffer(e.get(f), f) for f in ZUSAGE_FELDER)


def zusage_umschreiben(e, profil):
    """Liefert {feld: (alt, neu)} für alle umschreibbaren Felder und die Liste der Zeilen, die die Regel nicht sicher
    umschreiben kann (→ nur melden). Verändert e NICHT."""
    kanon = KANON[bool(profil)]
    aend, manuell = {}, []
    for f in ZUSAGE_FELDER:
        alt = e.get(f)
        if not isinstance(alt, str) or not zusage_treffer(alt, f):
            continue
        if f == "lieferzeit":
            aend[f] = (alt, kanon[f]); continue
        zeilen = alt.split("\n"); ok = True
        for i, z in enumerate(zeilen):
            if not zusage_treffer(z, f):
                continue
            m = ZUSAGE_SPANNE.search(z)
            if not m:
                ok = False; manuell.append(f"{f}: «{z.strip()}»"); continue
            neu = z[:m.start()] + kanon[f] + z[m.end():]
            if kanon[f].endswith(".") and z[m.end():m.end() + 1] == ".":
                neu = z[:m.start()] + kanon[f] + z[m.end() + 1:]
            zeilen[i] = neu
        neu_text = "\n".join(zeilen)
        if neu_text != alt and ok:
            aend[f] = (alt, neu_text)
        elif neu_text != alt:                       # teilweise umschreibbar → lieber ganz melden als halb ändern
            manuell.append(f"{f}: nur teilweise umschreibbar — unverändert gelassen")
    return aend, manuell


def zusage_pass(q):
    """Regel 7. Gibt (geaendert:list[(e, profil, aend)], meldungen:list[(e, text)]) zurück; ändert q nur mit FIX=1."""
    geaendert, meldungen = [], []
    for e in q.get("eintraege", []):
        if not zusage_kandidat(e):
            continue
        p = gql('query($h:String!){ productByIdentifier(identifier:{handle:$h}){ handle tags } }',
                {"h": e.get("handle", "")})["data"]["productByIdentifier"]
        if not p:
            meldungen.append((e, "1–2-Tage-Zusage, Produkt existiert nicht — nicht umgeschrieben (Regel 1 pausiert)")); continue
        tags = {t.lower() for t in p.get("tags") or []}
        if "ch-lager" not in tags:
            meldungen.append((e, "1–2-Tage-Zusage, Produkt trägt KEIN ch-lager — nicht umgeschrieben (Regel 5 pausiert)")); continue
        profil = MARKE_PROFIL in tags
        aend, manuell = zusage_umschreiben(e, profil)
        for x in manuell:
            meldungen.append((e, "1–2-Tage-Zusage nicht automatisch umschreibbar — " + x))
        if not aend:
            continue
        geaendert.append((e, profil, aend))
        if FIX:
            for f, (_, neu) in aend.items():
                e[f] = neu
    return geaendert, meldungen


def zusage_ledger(geaendert):
    neu = not os.path.exists(ZUSAGE_LEDGER)
    zeit = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    with open(ZUSAGE_LEDGER, "a") as fh:
        if neu:
            fh.write("zeit\tdatum\thandle\tstatus\tfeld\tprofil_ch_lager\talt_json\tneu_json\n")
        for e, profil, aend in geaendert:
            for f, (alt, nv) in aend.items():
                fh.write("\t".join([zeit, str(e.get("datum")), str(e.get("handle")), str(e.get("status")), f,
                                    "ja" if profil else "nein", json.dumps(alt, ensure_ascii=False),
                                    json.dumps(nv, ensure_ascii=False)]) + "\n")


def _tok():
    global _TOK
    if _TOK is None:
        _TOK = open("/tmp/cj_shop_token.txt").read().strip()
    return _TOK


def gql(q, v=None):
    req = urllib.request.Request("https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                                 data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 headers={"X-Shopify-Access-Token": _tok(), "Content-Type": "application/json"})
    for i in range(6):
        try:
            d = json.loads(urllib.request.urlopen(req, context=CTX, timeout=60).read())
        except Exception as e:
            if i == 5:
                raise
            import time; time.sleep(3 * (i + 1)); continue
        if d.get("errors") and "Throttled" in json.dumps(d["errors"]):
            import time; time.sleep(4); continue
        return d
    return d


def produkt_keys(handle, titel, pid):
    """Dieselbe Ableitung wie post_guard.produktKey — name aus « », sonst pid, sonst Slug ohne Ziffernende."""
    keys = set()
    m = re.search(r"[«\"„]([^»\"“]{2,40})[»\"“]", titel or "")
    if m:
        keys.add("name:" + re.sub(r"[^a-zäöüß0-9]", "", m.group(1).lower()))
    if pid:
        keys.add("pid:" + str(pid))
    slug = re.sub(r"-\d{6,}$", "", (handle or "").lower())
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    if len(slug) >= 6:
        keys.add("slug:" + slug)
    return keys


def ledger():
    p = os.path.join(ROOT, "dropship", "_posted_produkte.txt")
    try:
        return {l.strip() for l in open(p) if l.strip()}
    except FileNotFoundError:
        return set()


def bild_antwortet(url):
    try:
        r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--cacert",
                            "/root/.ccr/ca-bundle.crt", "-I", "--max-time", "20", url], capture_output=True, text=True)
        return r.stdout.strip() == "200"
    except Exception:
        return True   # Netzfehler ist kein Befund


def main():
    d = gql('{ shop { id metafield(namespace:"luxestyle", key:"social_queue") { value updatedAt compareDigest } } }')["data"]["shop"]
    mf = d.get("metafield")
    if not mf:
        print("KEIN Metafeld luxestyle.social_queue — nichts zu prüfen"); return
    q = json.loads(mf["value"])
    # Regel 7 ZUERST: die Wahrheits-Prüfung unten soll schon den korrigierten Text sehen
    z_geaendert, z_meldungen = zusage_pass(q)
    for e, profil, aend in z_geaendert:
        for f, (alt, nv) in aend.items():
            kurz = lambda t: next((z for z in t.split("\n") if "ager" in z or f == "lieferzeit"), t)[:90]
            print(f"{'✏️' if FIX else '⚠️'} Zusage {e.get('datum')} {e.get('handle')} [{e.get('status')}, "
                  f"profil-ch-lager={'ja' if profil else 'nein'}] {f}: «{kurz(alt)}» → «{kurz(nv)}»")
    for e, t in z_meldungen:
        print(f"⚠️ Zusage {e.get('datum')} {e.get('handle')}: {t}")
    gepostet = ledger()
    befunde, geprueft = [], 0
    for e in q.get("eintraege", []):
        if e.get("status") == "gepostet":
            continue
        if e.get("status") == "pausiert" and e.get("wache"):
            continue   # von uns pausiert — bleibt, bis ein Mensch es zurücksetzt
        geprueft += 1
        h = e.get("handle", ""); gruende = []
        p = gql('query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status tags '
                'priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}} '
                'resourcePublicationsV2(first:8){nodes{publication{name} isPublished}} variants(first:10){nodes{sku}} } }', {"h": h})["data"]["productByIdentifier"]
        if not p:
            gruende.append(f"Produkt «{h}» existiert nicht (exakter Handle)")
        else:
            if p["status"] != "ACTIVE":
                gruende.append(f"Produkt ist {p['status']}")
            kan = {n["publication"]["name"] for n in p["resourcePublicationsV2"]["nodes"] if n["isPublished"]}
            if not ({"Online Store", "Onlineshop"} & kan):
                gruende.append("nicht im Onlineshop veröffentlicht")
            try:
                pr = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
                if abs(pr - float(str(e.get("preis", "0")).replace("'", ""))) > 0.01:
                    gruende.append(f"Preis in der Queue {e.get('preis')} ≠ live {pr:.2f}")
            except ValueError:
                gruende.append(f"Preis unlesbar: {e.get('preis')!r}")
            tags = {t.lower() for t in p.get("tags") or []}
            r = sorted(tags & RISIKO)
            if r:
                gruende.append("Risiko-Tag: " + ", ".join(r))
            if KOSMETIK.search(p["title"] or ""):
                gruende.append("topische Kosmetik — wird nicht beworben (Betreiber 30.08.)")
            # Ohne prüfbare Lieferanten-Referenz ist die Ware nicht bestellbar (#1008-Klasse) — die
            # handkuratierte Ur-Ware (JADE-SET-001, WALLET-BLK …) trägt bild-ok und erfundenen Bestand.
            skus = [v["sku"] for v in p["variants"]["nodes"]]
            if not any(lieferantenref(x) for x in skus):
                gruende.append("keine prüfbare Lieferanten-Referenz (SKU " + ", ".join(str(x) for x in skus[:3]) + ") — nicht bestellbar, nicht bewerben")
            keys = produkt_keys(p["handle"], p["title"], p["id"].rsplit("/", 1)[-1])
            if keys & gepostet:
                gruende.append("laut Produkt-Ledger schon gepostet: " + ", ".join(sorted(keys & gepostet)))
            texte = " ".join(str(e.get(k, "")) for k in ("captionTiktok", "captionInstagram"))
            if "ch-lager" not in tags and FALSCH_OHNE_CHLAGER.search(texte):
                gruende.append("Caption behauptet Schweizer Lager/1–2 Tage — Produkt ist Direktversand (10–20 Werktage)")
            m = IMMER_FALSCH.search(texte)
            if m:
                gruende.append(f"Caption trägt «{m.group(0)}» (kein Bio-Link / Massen-Tag)")
        if e.get("bild") and not bild_antwortet(e["bild"]):
            gruende.append("Bild-URL antwortet nicht mit 200")
        if gruende:
            befunde.append((e, gruende))
            if FIX:
                e["status"] = "pausiert"
                e["grund"] = " · ".join(gruende)
                e["wache"] = f"cloud-tztnn1 {HEUTE}"
    print(f"geprüft: {geprueft} · Befunde: {len(befunde)} · Zusage 1–2 Tage: {len(z_geaendert)} "
          f"{'umgeschrieben' if FIX else 'gemeldet'}, {len(z_meldungen)} offen · FIX={'1' if FIX else '0'}")
    for e, g in befunde:
        print(f"⛔ {e.get('datum')} {e.get('handle')}: " + " · ".join(g))
    if (befunde or z_geaendert) and FIX:
        # Die Routine «Social-Redaktion» schreibt dasselbe Feld (04:00) — nur schreiben, wenn es seit dem Lesen
        # unverändert ist: updatedAt direkt davor prüfen UND compareDigest mitsenden (Shopify lehnt bei Abweichung ab).
        jetzt = gql('{ shop { metafield(namespace:"luxestyle", key:"social_queue") { updatedAt compareDigest } } }')["data"]["shop"]["metafield"] or {}
        if jetzt.get("updatedAt") != mf["updatedAt"] or jetzt.get("compareDigest") != mf.get("compareDigest"):
            print(f"KONFLIKT: Metafeld seit dem Lesen geändert ({mf['updatedAt']} → {jetzt.get('updatedAt')}) — nichts "
                  "geschrieben, nächster Lauf prüft neu")
            z_geaendert = []
        else:
            r = gql('mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{key updatedAt} userErrors{field message code} } }',
                    {"m": [{"ownerId": d["id"], "namespace": "luxestyle", "key": "social_queue", "type": "json",
                            "value": json.dumps(q, ensure_ascii=False), "compareDigest": mf.get("compareDigest")}]})
            ue = r["data"]["metafieldsSet"]["userErrors"]
            print("Metafeld geschrieben" if not ue else f"FEHLER beim Schreiben: {ue}")
            if ue:
                z_geaendert = []
            elif z_geaendert:
                zusage_ledger(z_geaendert)
                print(f"Alttext im Ledger: {os.path.relpath(ZUSAGE_LEDGER, ROOT)}")
    if not FIX:
        for e, profil, aend in z_geaendert:
            befunde.append((e, [f"Zusage «1–2 Tage» in {', '.join(aend)} — Kanon "
                                f"{'mit' if profil else 'ohne'} profil-ch-lager (FIX=1 schreibt um)"]))
    for e, t in z_meldungen:
        befunde.append((e, [t]))
    if befunde:
        with open(BERICHT, "w") as fh:
            fh.write(f"# Social-Queue-Wache — Stand {HEUTE} (UTC)\n\n"
                     "Einträge der fremden Warteschlange `luxestyle.social_queue`, die so nicht rausgehen dürfen. "
                     f"{'Pausiert (status: pausiert, Grund im Eintrag).' if FIX else 'NUR gemeldet (FIX=1 pausiert).'}\n\n")
            for e, g in befunde:
                fh.write(f"- **{e.get('datum')}** `{e.get('handle')}` — {e.get('titel')}\n")
                for x in g:
                    fh.write(f"  - {x}\n")
    elif os.path.exists(BERICHT):
        os.remove(BERICHT)
    print("FERTIG")


def selbsttest():
    """Kanarien für Regel 7 — ohne Netz, ohne Token."""
    fehler = 0
    def ok(bed, name):
        nonlocal fehler
        print(("  ok   " if bed else "  FEHL ") + name)
        fehler += 0 if bed else 1
    pos = [("captionTiktok", "Ab Schwiizer Lager – i 1–2 Wärchtäg bi dir."),
           ("captionInstagram", "📦 Ab Schwiizer Lager · 1–2 Wärchtäg"),
           ("captionInstagram", "📦 Ab Schwiizer Lager · 1-2 Wärchtäg · Original HARIBO"),
           ("captionTiktok", "Ab Schwiizer Lager – i 1 – 2 Werktage bi dir. Original BRUDER."),
           ("captionTiktok", "Ab Schweizer Lager in 1—2 Tagen bei dir"),
           ("captionTiktok", "Lieferig ab Lager in ein bis zwei Tagen"),
           ("captionInstagram", "Versand in 1–2 Täg"),
           ("captionTiktok", "Ab Schwiizer Lager – eis bis zwei Wärchtäg bi dir."),
           ("lieferzeit", "1-2 Werktage ab Schweizer Lager (Fortura)"),
           ("lieferzeit", "ein bis zwei Werktage"),
           ("captionInstagram", "📦 Ab Schwiizer Lager · 1-2 Arbeitstage")]
    neg = [("captionTiktok", "Antwort in 1–2 Tagen"),
           ("captionTiktok", "Hund 1-2 Jahre alt · ab Lager"),
           ("captionInstagram", "📦 Ab Schwiizer Lager · 2–3 Wärchtäg"),
           ("captionTiktok", "Ab Schwiizer Lager – i 2–3 Wärchtäg bi dir."),
           ("captionTiktok", "Ab Lager · 11–2 Tage? nein: 12 Tage"),
           ("captionInstagram", "Grösse 1-2 Jahre (Kinder) · Versand ab Lager"),
           ("lieferzeit", "meist 2–3 Werktage ab Schweizer Lager (Fortura)")]
    for f, t in pos:
        ok(bool(zusage_treffer(t, f)), f"erkennt   [{f}] {t}")
    for f, t in neg:
        ok(not zusage_treffer(t, f), f"lässt     [{f}] {t}")
    for profil in (True, False):
        for f, t in KANON[profil].items():
            ok(not zusage_treffer(t, f), f"Kanon idempotent ({'mit' if profil else 'ohne'} Profil) [{f}]")
    # Umschreiben: Zusatz bleibt, kein Doppelpunkt, Status bleibt
    e = {"status": "bereit", "chLager": True,
         "captionTiktok": "Hook\nAb Schwiizer Lager – i 1–2 Wärchtäg bi dir. Original BRUDER.\n#x",
         "captionInstagram": "Hook\n📦 Ab Schwiizer Lager · 1–2 Wärchtäg · Original HARIBO\n#x",
         "lieferzeit": "1-2 Werktage ab Schweizer Lager (Fortura)"}
    a, m = zusage_umschreiben(e, True)
    ok(a["captionTiktok"][1] == "Hook\nAb Schwiizer Lager – meist i 2–3 Wärchtäg bi dir. Original BRUDER.\n#x", "TikTok mit Profil, Zusatz bleibt")
    ok(a["captionInstagram"][1] == "Hook\n📦 Ab Schwiizer Lager · meist 2–3 Wärchtäg · Original HARIBO\n#x", "Instagram mit Profil, Zusatz bleibt")
    ok(a["lieferzeit"][1] == KANON[True]["lieferzeit"] and not m, "lieferzeit mit Profil")
    a, m = zusage_umschreiben(e, False)
    ok(a["captionTiktok"][1] == "Hook\nAb Schwiizer Lager – s genaue Lieferdatum gsehsch bim Artikel. Original BRUDER.\n#x", "TikTok ohne Profil")
    ok(a["captionInstagram"][1] == "Hook\n📦 Ab Schwiizer Lager · Lieferdatum bim Artikel · Original HARIBO\n#x", "Instagram ohne Profil")
    ok(a["lieferzeit"][1] == KANON[False]["lieferzeit"], "lieferzeit ohne Profil")
    ok(e["status"] == "bereit" and e["lieferzeit"].startswith("1-2"), "umschreiben verändert den Eintrag nicht selbst")
    a, m = zusage_umschreiben({"captionTiktok": "Lieferig ab Lager in ein bis zwei Tagen"}, True)
    ok(not a and m, "unbekannte Form → nur melden, nicht halb umschreiben")
    ok(zusage_kandidat(dict(e)), "bereit + chLager = Kandidat")
    ok(zusage_kandidat(dict(e, status="pausiert")), "pausiert + chLager = Kandidat (nur Text)")
    ok(not zusage_kandidat(dict(e, status="gepostet")), "gepostet = Protokoll, kein Kandidat")
    ok(not zusage_kandidat(dict(e, chLager=False)), "ohne chLager kein Kandidat (Regel 5 zuständig)")
    print(f"Selbsttest: {'GRÜN' if not fehler else f'{fehler} FEHLER'}")
    return fehler


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(1 if selbsttest() else 0)
    main()
