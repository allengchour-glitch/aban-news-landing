#!/usr/bin/env python3
"""warenkorb_einig.py — EIN Rechenweg für alles, was der Warenkorb über Versand und Lieferzeit sagt (09.10.2026).

ANLASS (Betreiber «verbessere mehr», gemessen 09.10. 11:30 UTC, eigener Testkorb im Handy-Browser):
  14 Tage Landeseiten (ShopifyQL): Sirène 227 / Provence 178 / Aurora 158 Sitzungen → 8 Warenkorb → 6 Kasse → 0 Kauf.
  Abbruch-Körbe: 3× Leinen-Set 39.90 (→ 46.90 mit Versand), 1× Sirène 49.90.
  Derselbe Warenkorb (1× Leinen-Set 39.90) sagte GLEICHZEITIG:
    oben  (layout/theme.liquid, Versandbalken):   «🚚 Noch CHF 5.10 bis zum Gratis-Versand»
    unten (snippets/cart-summary.liquid, 06.10.): «noch CHF 10.10 bis zum Gratisversand (ab CHF 50)»
    Liste (templates/cart.json, lux_cart_trust):  «Lieferzeit … (CH-Lager 1–2 Werktage)» — das Set kommt aus Asien,
                                                    die Produktseite sagt «Lieferung voraussichtlich 23. Okt. – 6. Nov.»
  Die 5.10 waren FALSCH: jeder weitere Artikel löst den Automatik-Rabatt «Bundle: 2+ Artikel -10%» aus (gemessen
  /cart.js: 2× Leinen → items_subtotal_price 7980, total_price 7182). Wer für 5.90 dazulegt, hat 45.80 Ware → 41.22
  nach Rabatt → die Kasse verlangt weiter CHF 7. Die 10.10 stimmen für den Einzelkorb, rechneten aber im 2er-Korb
  zu hoch (50 − Betrag NACH Rabatt).

REGEL (eine, hier definiert, Liquid + JS + Kanarien daraus):
  gratis  ⇔  total_price (NACH Rabatt) ≥ TARIF (45.00 — die aktive Nullrate im General profile, Lehre 14.08.)
  noch X  =  max(VERSPRECHEN − items_subtotal_price (VOR Rabatt),  ⌈(TARIF − total_price) · 10/9⌉)
             (erster Term: jeder Zusatzartikel bringt −10 %, 50 × 0,9 = 45; zweiter: weitere Rabatte, z. B. ein Code)
  Lieferzeit im Warenkorb = die LANGSAMSTE Ware im Korb, mit denselben Tags und Tagen wie der Produktseiten-Block
  `lux_delivery` (templates/product.json): fortura/ch-lager/blitzversand wie Kasse: Bearbeitung (P1D) + 1–2 Werktage, Schluss 12 Uhr
  — nur mit Tag profil-ch-lager, sonst wie Asien
  (LUX-KASSENDATUM, seit 13.10.2026) · eu-lager +3..+10 · Druck auf Bestellung +9..+19 Kalendertage, Sa/So → Montag ·
  sonst Direktversand Asien wie Kasse: Bearbeitung (P1D) + 9–19 Werktage, Schluss 12 Uhr (LUX-KASSENDATUM).
  Die Zahlen (1 / 1–2 / 9–19) prüft automation/kassen_lieferdatum_wache.py gegen Bearbeitungszeit und Transitregel.
  JS_NEU = der Live-Balken vom 13.10.2026 23:03 (LUX-CHLAGER-KORB: alle_chlager aus /cart?view=lux-chlager, Rückfall auf das
  Merkmal data-lux-alle-chlager der Zusammenfassung). TARIF folgt ch_lager_profil.GRATIS_AB_CH (Entscheid D: 40.50 live seit 13.10.2026).
  (Bis 26.11.2026 stand hier LI_NEU = Kopie des Lieferzeilen-Blocks lux_cart_trust; sie war älter als live und ist entfernt, s. Nachtrag.)

  python3 automation/warenkorb_einig.py --kanarien   # Rechenregel gegen Fälle (auch: X dazulegen ⇒ wirklich gratis)
  python3 automation/warenkorb_einig.py              # Trockenlauf: zeigt, was ersetzt würde (Balken, Hinweis-Block; cart.json nie)
  SCHARF=1 python3 automation/warenkorb_einig.py     # Live-Dateien holen, sichern (/tmp), ersetzen, zurücklesen
  python3 automation/warenkorb_einig.py --pruefen    # Wächter (Aufseher, täglich): Marken live, Tarif, Kanarien,
                                                     # + --live: echter Testkorb im Handy-Browser, alle «noch»-Zahlen gleich
  python3 automation/warenkorb_einig.py --selbsttest # ohne Netz: Soll-Texte, Reparaturpfad an Proben, Import ohne Abfrage

NACHTRAG 26.11.2026 (Theme-Wechsel 21.11., dropship/theme-id-2611/URTEILE.md): KEINE feste Theme-ID mehr (bis 26.11. fest 187533001089,
seit 21.11. unveröffentlicht). Jeder Lauf holt die Live-ID erst zur Laufzeit EINMAL (live_theme() → main_theme.gid(), fail-closed) und
liest/schreibt nur dort; der Import fragt nichts ab. Weil der Reparaturpfad damit das Live-Theme erreicht, setzt er nur noch den HEUTIGEN
Soll-Stand ein (Entscheid 22.10.: Tarif 50 NACH Rabatt, «noch X» mit 55.56, Text «(ab CHF 50 nach Rabatt)»):
  * theme.liquid: JS_NEU = Live-Balken vom 26.11.2026 (Theme 214565814663), Code Zeile für Zeile gleich; Text aus TEXT_SCHWELLE.
    Balkenbreite BREITE = TARIF (5000) — bewusst wie live seit 22.10.: 100 % = die «CHF 50» im Text daneben; 5556 wäre eine neue
    Anzeige, die niemand freigegeben hat (offener Punkt im Bericht der Umstellung).
  * cart-summary: kein eigener Teil-Ersatz mehr (LQ_ALT/LQ_NEU hätten in einem alten Block «>= 4500» stehen lassen) — fehlt die Marke,
    wird der ganze Hinweis-Block durch warenkorb_gratisversand.BLOCK ersetzt (EINE Vorlage, aus TARIF/VERSPRECHEN/TEXT_SCHWELLE).
  * templates/cart.json ist AUS dem Reparaturpfad: den Lieferzeilen-Block pflegen inzwischen mehrere Skripte (Druck-Profil, Rang 2,
    TWINT-Zeile, LUX-EDITOR-RUECKGABE); eine Kopie hier veraltet nur. --pruefen meldet eine fehlende Marke dort, schreibt nie.
  --pruefen vergleicht den Live-Balken (ohne Kommentare) mit JS_NEU und meldet jede Abweichung (nur melden); dazu «VERSAND=700,» vor dem
  Balken (sonst nennt er einen anderen Versandpreis als die Kasse). --selbsttest lässt pruefen()/schreiben() ohne Netz gegen ein
  Attrappen-Theme laufen (theme_attrappe.py): nur «Marke fehlt» in Balken/Hinweis löst im Aufseher die Reparatur aus, alles andere
  (cart.json, ≠ Soll, nicht MAIN, nicht ermittelbar) wird nur gemeldet; ohne role MAIN plant schreiben() nichts.
"""
import json, math, os, re, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402

from ch_lager_profil import GRATIS_AB_CH  # noqa: E402  (eine Quelle für die Tarif-Schwelle)
TARIF, VERSAND = int(round(GRATIS_AB_CH * 100)), 700                                 # Rappen
# Versprechen = Warenwert VOR Rabatt, ab dem auch der Mengenrabatt (-10 % auf alles ab 2 Artikeln) den Betrag nicht unter den Tarif drückt: TARIF / 0,9 aufgerundet
# (Tarif 45 -> 50.00, früher fest 5000; Tarif 50 seit 22.10.2026 -> 55.56).
VERSPRECHEN = -(-TARIF * 10 // 9)
# Balkenbreite im Versandbalken: 100 % bei Warenwert = TARIF (live seit 22.10.2026 «sub/5000»). Bewusst NICHT VERSPRECHEN: der Balken
# zeigt den Weg zu den «CHF 50» im Text daneben; ein Wechsel auf 5556 ändert, was die Kundschaft sieht, und ist ein eigener Entscheid.
BREITE = TARIF
MARKE = "LUX-WARENKORB-EINIG"
DREI = ["layout/theme.liquid", "snippets/cart-summary.liquid", "templates/cart.json"]


def chf(rp):
    """5000 → «50», 4050 → «40.50» (so, wie die Schwelle im Text steht)."""
    return str(rp // 100) if rp % 100 == 0 else f"{rp / 100:.2f}"


# Betreiber 22.10.2026 «50 behalten, Text anpassen»: das Versprechen heisst «ab CHF 50 nach Rabatt» (Balken, Drawer, Seiten)
TEXT_SCHWELLE = f"ab CHF {chf(TARIF)} nach Rabatt"


def live_theme():
    """GID des Live-Themes (role MAIN): erst zur Laufzeit, EINMAL je Lauf, an alle Lese-/Schreibschritte weitergereicht.
    main_theme.gid(): 10-Min-Cache, wirft RuntimeError (fail-closed)."""
    from main_theme import gid
    return gid()


def noch(sub, tot):
    """Rappen, die an Ware noch fehlen (0 = gratis). sub = vor Rabatt, tot = nach Rabatt."""
    if tot >= TARIF:
        return 0
    return max(VERSPRECHEN - sub, ((TARIF - tot) * 10 + 8) // 9)


KANARIEN = [  # (Name, Warenwert vor Rabatt, nach Rabatt, erwartet «noch») — 22.10.2026 für Tarif 50 / Versprechen 55.56 neu gerechnet
    ("1× Leinen 39.90", 3990, 3990, 1566),
    ("1× Sirène 49.90 (knapp unter Tarif)", 4990, 4990, 566),
    ("1× 45.90", 4590, 4590, 966),
    ("2× 24.90 → 44.82", 4980, 4482, 576),
    ("39.90 + 5.90 → 41.22", 4580, 4122, 976),
    ("2× Leinen → 71.82", 7980, 7182, 0),
    ("Code zusätzlich: 52.00 → 42.12", 5200, 4212, 876),
    ("2× 19.90 → 35.82 (unter 50)", 3980, 3582, 1576),
    ("1× 35.00", 3500, 3500, 2056),
    ("1× 50.00 (Tarif gratis)", 5000, 5000, 0),
]


def kanarien(still=False):
    f = 0
    for name, sub, tot, soll in KANARIEN:
        ist = noch(sub, tot)
        # Gegenprobe der Zusage: wer genau «noch» dazulegt (ein Zusatzartikel ⇒ −10 % auf alles), hat Gratisversand.
        nach = (sub + ist) * 9 // 10 if ist and (tot == sub) else (tot + ist * 9 // 10 if ist else tot)
        ok = ist == soll and (ist == 0 or nach >= TARIF)
        f += not ok
        if not ok or not still:
            print(f"  {'✓' if ok else '✗'} {name}: noch {ist/100:.2f} (soll {soll/100:.2f}) · nach Dazulegen {nach/100:.2f}")
    if not still:
        print(f"WARENKORB-KANARIEN {len(KANARIEN) - f}/{len(KANARIEN)}")
    return f == 0


# ── Ersetzung 1: Versandbalken in layout/theme.liquid (JS) ─────────────────────────────────────────────────────────
JS_ANFANG = "    var el=document.createElement('div');el.className='luxe-ship-bar';\n"
JS_ENDE = "    anchors[0].parentNode.insertBefore(el,anchors[0]);\n"
JS_NEU = JS_ANFANG + """    // LUX-WARENKORB-EINIG (09.10.2026, automation/warenkorb_einig.py) — derselbe Rechenweg wie cart-summary:
    // gratis, sobald der Betrag NACH Rabatt >= @TARIF_CHF@ (Tarif seit 22.10.2026; vorher 40.50/45); «noch X» = @VERSPRECHEN_CHF@ - Warenwert
    // VOR Rabatt, weil jeder weitere Artikel «2+ Artikel -10%» ausloest (Text «@TEXT@»). Gemessen 09.10.: 1x 39.90 zeigte hier «noch 5.10», darunter
    // «noch 10.10»; wer 5.90 dazulegt, hat 45.80 Ware -> 41.22 -> die Kasse verlangte (bei Tarif 45) CHF 7.
    // Balkenbreite = Warenwert / @BREITE@ (bewusst = Tarif, wie live seit 22.10.2026).
    // LUX-CHLAGER-KORB (13.10.2026, Entscheid C): traegt JEDE Position das Zeichen profil-ch-lager, rechnet die Kasse in der Schweiz
    // 0.00 (Profil «CH-Lager»). Das Zeichen kennt nur Liquid -> eigene Ansicht /cart?view=lux-chlager (templates/cart.lux-chlager.liquid)
    // liefert alle_chlager; faellt sie aus, gilt /cart.js (ohne Zeichen = Regel oben, nie zu frueh gratis).
    // Faellt die Ansicht aus (gemessen 13.10.: Cloudflare-Pruefseite statt JSON fuer unsere IP), gilt das vom Server gerenderte
    // Merkmal der Warenkorb-Zusammenfassung (cart-summary, data-lux-alle-chlager) — sonst sagte der Balken «+ CHF 7», darunter «Gratis».
    var chlDom=document.querySelector('.lux-gratisversand[data-lux-alle-chlager="1"]');
    var sub=cart.items_subtotal_price, tot=(cart.total_price!=null?cart.total_price:sub),
        chl=(cart.alle_chlager===true)||(cart.alle_chlager===undefined&&!!chlDom);
    var gratis=chl||tot>=@TARIF@, rest=gratis?0:Math.max(@VERSPRECHEN@-sub, Math.floor(((@TARIF@-tot)*10+8)/9));
    var end=((tot+(gratis?0:VERSAND))/100).toFixed(2);
    if(chl){el.innerHTML='🎉 <strong>Gratis-Versand in der Schweiz</strong> · Ware ab Schweizer Lager · Du zahlst <strong>CHF '+end+'</strong>';}
    else if(gratis){el.innerHTML='🎉 <strong>Gratis-Versand gesichert</strong> · Du zahlst <strong>CHF '+end+'</strong>';}
    else{
      el.innerHTML='🚚 Noch <strong>CHF '+(rest/100).toFixed(2)+'</strong> bis zum Gratis-Versand (@TEXT@)'+
      '<div class="track"><div class="fill" style="width:'+Math.min(100,Math.round(sub/@BREITE@*100))+'%"></div></div>'+
      '<div style="margin-top:6px;color:#5b5346">Aktuell CHF '+(tot/100).toFixed(2)+' + CHF '+(VERSAND/100).toFixed(2)+
      ' Versand = <strong style="color:#2b2b2b">CHF '+end+'</strong></div>';}
""".replace("@TARIF@", str(TARIF)).replace("@VERSPRECHEN@", str(VERSPRECHEN)).replace("@BREITE@", str(BREITE)) \
    .replace("@TARIF_CHF@", f"{TARIF / 100:.2f}").replace("@VERSPRECHEN_CHF@", f"{VERSPRECHEN / 100:.2f}").replace("@TEXT@", TEXT_SCHWELLE) + JS_ENDE


def kern_js(text):
    """JS ohne ganze Kommentarzeilen, Zeile für Zeile (rechts gestutzt, Leerzeilen weg) — der Teil, der im Browser läuft."""
    return [z.rstrip() for z in text.splitlines() if z.strip() and not z.strip().startswith("//")]


def balken_bereich(t):
    """(Anfang, Ende) des Balken-Bereichs JS_ANFANG … JS_ENDE in layout/theme.liquid, None wenn nicht genau je 1× in dieser Reihenfolge."""
    a, e = t.find(JS_ANFANG), t.find(JS_ENDE)
    if t.count(JS_ANFANG) != 1 or t.count(JS_ENDE) != 1 or not (0 <= a < e):
        return None
    return a, e + len(JS_ENDE)


def js_soll_befunde(js):
    """Rein: was am Balken-Code NICHT dem Entscheid 22.10. entspricht (leer = in Ordnung)."""
    b = []
    if "@" in js:
        b.append("Platzhalter @…@ übrig")
    if f"tot>={TARIF}," not in js or f"(({TARIF}-tot)*10+8)/9" not in js:
        b.append(f"Gratis-Schwelle ≠ {TARIF} nach Rabatt")
    if f"Math.max({VERSPRECHEN}-sub," not in js:
        b.append(f"«noch X» nicht mit {VERSPRECHEN} vor Rabatt")
    if f"bis zum Gratis-Versand ({TEXT_SCHWELLE})'" not in js or "nach Rabatt" not in TEXT_SCHWELLE:
        b.append(f"Text nicht «({TEXT_SCHWELLE})»")
    if f"Math.round(sub/{BREITE}*100)" not in js:
        b.append(f"Balkenbreite ≠ sub/{BREITE}")
    if MARKE not in js or not js.startswith(JS_ANFANG) or not js.endswith(JS_ENDE):
        b.append("Marke/Anker fehlen")
    return b


# ── Lieferzeit-Zeile in templates/cart.json (lux_cart_trust): seit 26.11.2026 NICHT mehr im Reparaturpfad, nur geprüft ───────────
LI_ALT = "<li>📦&nbsp;Lieferzeit steht auf jeder Produktseite (CH-Lager 1–2 Werktage)</li>"


def lese(dateien, theme):
    r = gql('query($id:ID!,$f:[String!]){theme(id:$id){role files(filenames:$f,first:10){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}',
            {"id": theme, "f": dateien})["theme"]
    return r["role"], {n["filename"]: n["body"]["content"] for n in r["files"]["nodes"]}


def plane_aus(f):
    """Rein: (neue Texte, Bericht) aus den drei gelesenen Dateien. Setzt nur den HEUTIGEN Soll-Stand ein, nur wo die Marke fehlt:
    Balken → JS_NEU, Hinweis-Block → warenkorb_gratisversand.BLOCK; templates/cart.json wird nie geschrieben."""
    import warenkorb_gratisversand as wg
    neu, bericht = {}, []
    t = f["layout/theme.liquid"]
    if MARKE in t:
        bericht.append("theme.liquid: schon drin")
    else:
        pos = balken_bereich(t)
        if pos is None:
            raise SystemExit(f"theme.liquid: Anker {t.count(JS_ANFANG)}/{t.count(JS_ENDE)} — Balken hat sich geändert, nicht blind ersetzen")
        neu["layout/theme.liquid"] = t[:pos[0]] + JS_NEU + t[pos[1]:]
        bericht.append(f"theme.liquid: Balken-Rechnung {pos[1] - pos[0]} → {len(JS_NEU)} Zeichen (Soll 22.10.: {TEXT_SCHWELLE})")
    s = f["snippets/cart-summary.liquid"]
    if MARKE in s:
        bericht.append("cart-summary: schon drin")
    else:
        s2, st = wg.block_ersetzen(s)
        if s2 is not None:
            neu["snippets/cart-summary.liquid"] = s2
            bericht.append(f"cart-summary: Hinweis-Block → Soll (warenkorb_gratisversand.BLOCK, «noch» ab {VERSPRECHEN / 100:.2f})")
        else:   # kein (eindeutiger) Hinweis-Block: den fügt warenkorb_gratisversand.py ein — samt dieser Marke
            bericht.append(f"cart-summary: {st} — hier nicht geschrieben (warenkorb_gratisversand.py fügt den Hinweis samt Marke ein)")
    c = f["templates/cart.json"]
    bericht.append("cart.json: schon drin" if MARKE in c else "cart.json: Marke weg — nicht im Reparaturpfad (Lieferzeilen-Block pflegen mehrere Skripte), von Hand prüfen")
    return neu, bericht


def plane(theme):
    role, f = lese(DREI, theme)
    if role != "MAIN":
        raise SystemExit(f"Theme nicht MAIN ({role})")
    neu, bericht = plane_aus(f)
    return f, neu, bericht


def schreiben():
    if not kanarien():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    import warenkorb_gratisversand as wg
    sb = js_soll_befunde(JS_NEU) + [f"Hinweis-Block: {b}" for b in wg.soll_befunde(wg.BLOCK)]
    if sb:   # nie einen Balken/Block schreiben, der nicht dem heutigen Soll entspricht
        raise SystemExit("Soll-Balken: " + " · ".join(sb) + " — nichts geschrieben")
    try:
        theme = live_theme()
    except RuntimeError as e:
        print(f"FEHLER: Live-Theme nicht ermittelbar ({str(e)[:120]}) — nichts geschrieben"); return 1
    alt, neu, bericht = plane(theme)
    print("\n".join("  " + b for b in bericht))
    if not neu:
        print("nichts zu tun"); return 0
    if os.environ.get("SCHARF") != "1":
        print(f"TROCKEN — SCHARF=1 schreibt (Theme {theme})"); return 0
    stempel = int(time.time())
    for name in neu:
        pfad = f"/tmp/{name.replace('/', '__')}.vor-einig.{stempel}"
        open(pfad, "w", encoding="utf-8").write(alt[name])
        print("  Sicherung", pfad)
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){"
            "upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": theme, "files": [{"filename": n, "body": {"type": "TEXT", "value": v}} for n, v in neu.items()]})["themeFilesUpsert"]
    if r["userErrors"]:
        print("FEHLER", r["userErrors"]); return 1
    for _ in range(10):
        time.sleep(4)
        _, f = lese(list(neu), theme)
        if all(MARKE in f[n] for n in neu):
            print(f"GESCHRIEBEN + ZURÜCKGELESEN: {', '.join(neu)}"); return 0
    print("RÜCKLESEN FEHLT"); return 1


LIVE_JS = r"""
import { starte } from '%s/tools/browser.mjs';
const b = await starte();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, locale: 'de-CH' });
const p = await ctx.newPage();
await p.goto('https://luxestyle.ch/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
const erg = {};
for (const [name, items] of Object.entries(JSON.parse(process.argv[2]))) {
  const c = await p.evaluate(async (items) => {
    const warte = (ms) => new Promise(r => setTimeout(r, ms));   // Shopify-Bot-Schutz (429) bei schnellen Folgeabrufen
    await fetch('/cart/clear.js', { method: 'POST' }); await warte(2500);
    for (const [id, q] of items) { await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, quantity: q }) }); await warte(2500); }
    const r = await fetch('/cart.js'); if (r.status !== 200) throw new Error('cart.js HTTP ' + r.status);
    return await r.json();
  }, items);
  await p.waitForTimeout(4000);
  await p.goto('https://luxestyle.ch/cart?einig=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(3500);
  erg[name] = { sub: c.items_subtotal_price, tot: c.total_price, text: await p.evaluate(() => document.body.innerText) };
}
await p.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
console.log(JSON.stringify(erg));
await b.close();
"""


def live_test():
    """Echter Testkorb (Handy-Browser, Storefront), danach geleert. → Liste Befunde, None = Browser nicht verfügbar."""
    # Leinen-Set (Asien, 39.90) einzeln und doppelt — die Landeseite mit den meisten Kassengängen.
    faelle = {"1x": [[55747875733889, 1]], "2x": [[55747875733889, 2]]}
    pfad = "/tmp/warenkorb_einig_live.mjs"
    open(pfad, "w").write(LIVE_JS % REPO)
    try:
        pr = subprocess.run(["/opt/node22/bin/node", pfad, json.dumps(faelle)], capture_output=True, text=True, timeout=180)
        zeilen = [z for z in pr.stdout.strip().splitlines() if z.startswith("{")]
        if not zeilen:
            raise RuntimeError("keine Ausgabe · " + " ".join(z for z in pr.stderr.splitlines() if "Error" in z)[:200])
        erg = json.loads(zeilen[-1])
    except Exception as e:  # noqa: BLE001
        print(f"  Live-Test nicht möglich: {type(e).__name__}: {str(e)[:240]}")
        return None
    befunde = []
    for name, e in erg.items():
        zahlen = sorted(set(re.findall(r"[Nn]och\s*CHF\s*([\d'.]+)", e["text"])))
        soll = noch(e["sub"], e["tot"])
        if soll:
            if zahlen != [f"{soll/100:.2f}"]:
                befunde.append(f"{name}: «noch»-Zahlen {zahlen} ≠ Regel {soll/100:.2f}")
        elif zahlen:
            befunde.append(f"{name}: gratis laut Tarif, Seite sagt noch {zahlen}")
        if "CH-Lager 1–2 Werktage" in e["text"]:
            befunde.append(f"{name}: «CH-Lager 1–2 Werktage» bei Asien-Ware")
        if "Lieferung voraussichtlich" not in e["text"]:
            befunde.append(f"{name}: kein Lieferdatum im Warenkorb")
        print(f"  live {name}: Ware {e['sub']/100:.2f} → {e['tot']/100:.2f} · noch {zahlen or ['gratis']} · Regel {soll/100:.2f}")
    return befunde


def pruefen():
    from warenkorb_gratisversand import erste_abweichung, tarif
    befunde = []
    if not kanarien(still=True):
        befunde.append("Kanarien rot")
    befunde += [f"Soll-Balken: {b}" for b in js_soll_befunde(JS_NEU)]
    try:
        theme = live_theme()
    except RuntimeError as e:   # fail-closed; Wortlaut löst im Aufseher KEINE Reparatur aus
        print(f"⚠️ WARENKORB-EINIG: Live-Theme nicht ermittelbar ({str(e)[:120]}) — nicht geprüft"); return 1
    role, f = lese(DREI, theme)
    if role != "MAIN":
        befunde.append(f"Theme nicht MAIN ({role})")
    for n in DREI:
        c = f.get(n)
        if c is None:
            befunde.append(f"{n}: Datei fehlt im Live-Theme")
        elif MARKE not in c and n == "templates/cart.json":   # nicht im Reparaturpfad → Wortlaut ohne «Marke fehlt»
            befunde.append("templates/cart.json: LUX-WARENKORB-EINIG weg (Lieferzeilen-Block, kein Reparaturpfad) — von Hand prüfen")
        elif MARKE not in c:
            befunde.append(f"{n}: Marke fehlt (Theme-Update überschrieben?) → SCHARF=1 erneut")
    t = f.get("layout/theme.liquid", "")
    if t and f"VERSAND={VERSAND}," not in t:   # der Balken nennt «+ CHF x Versand» aus dieser Variable (ausserhalb JS_NEU)
        befunde.append(f"theme.liquid: «VERSAND={VERSAND},» vor dem Balken nicht gefunden (Versandpreis im Balken ≠ Kasse?)")
    if MARKE in t:   # Texte stimmen? Live-Balken ohne Kommentare = JS_NEU ohne Kommentare (nur melden)
        pos = balken_bereich(t)
        abw = "Anker nicht eindeutig" if pos is None else erste_abweichung(kern_js(t[pos[0]:pos[1]]), kern_js(JS_NEU))
        if abw:
            befunde.append(f"theme.liquid: Balken-Code ≠ Soll ({abw})")
    s = f.get("snippets/cart-summary.liquid", "")
    if MARKE in s:
        for stueck in (f"lux_gv_rest = {VERSPRECHEN} | minus: cart.items_subtotal_price", f"lux_gv_rest2 = {TARIF} | minus: cart.total_price",
                       f"cart.total_price >= {TARIF} -%}}", f"bis zum Gratisversand ({TEXT_SCHWELLE})</span>"):
            if stueck not in s:
                befunde.append(f"cart-summary: «{stueck}» fehlt")
    if LI_ALT in f.get("templates/cart.json", ""):   # die alte Zeile, nicht das Wort (der neue Kommentar nennt es)
        befunde.append("cart.json: alte Zeile «CH-Lager 1–2 Werktage» wieder da")
    std, gratis = tarif()
    if std != VERSAND / 100 or gratis != TARIF / 100:
        befunde.append(f"Tarif geändert: Versand {std} / gratis ab {gratis} ≠ {VERSAND/100:.2f} / {TARIF/100:.2f} → Regel anpassen")
    live = ""
    if "--live" in sys.argv:
        lb = live_test()
        if lb is None:
            live = " · Testkorb NICHT gelaufen (Shop/Browser) — nur statisch geprüft"   # nie «ok» ohne Messung
        else:
            befunde += lb
            live = " · Testkorb live ok"
    if befunde:
        print("⚠️ WARENKORB-EINIG: " + " · ".join(befunde)); return 1
    print(f"WARENKORB-EINIG ✓: 3 Stellen ein Rechenweg (Theme {theme.rsplit('/', 1)[1]}; Balken = Soll «{TEXT_SCHWELLE}», "
          f"noch X ab {VERSPRECHEN / 100:.2f}, Breite /{BREITE}) · Tarif {std:.2f}/gratis ab {gratis:.0f} · Kanarien {len(KANARIEN)}/{len(KANARIEN)}" + live)
    return 0


# Hinweis-Block vom 06.10.2026 (erste Fassung, Commit 66de78fef) — die älteste, die ein Theme-Wechsel zurückbringen könnte (ohne diese Marke)
BLOCK_0610 = """    {%- comment -%} LUX-GRATISVERSAND-HINWEIS (06.10.2026, automation/warenkorb_gratisversand.py) — Tarif gratis ab 45,
        Versprechen ab 50 (Puffer für den 10-%-Mengenrabatt); dieselbe Regel wie lux_trust auf der Produktseite. {%- endcomment -%}
    {%- unless cart == empty -%}
      <div class="cart-totals__item lux-gratisversand cart-primary-typography" role="status" style="font-size:0.92em;justify-content:center;text-align:center;">
        {%- if cart.total_price >= 4500 -%}
          <span>🚚 <strong>Gratisversand inklusive</strong> · Lieferung in der Schweiz</span>
        {%- else -%}
          {%- assign lux_gv_rest = 5000 | minus: cart.total_price -%}
          <span>🚚 Versand CHF 7 · noch <strong>{{ lux_gv_rest | money }}</strong> bis zum Gratisversand (ab CHF 50)</span>
        {%- endif -%}
      </div>
    {%- endunless -%}
"""


def selbsttest():
    """Ohne Netz. Soll-Texte (unabhängig nachgerechnet), Mutanten, Reparaturpfad an Proben (nur Soll, cart.json nie),
    Import ohne Abfrage, ein gid()-Aufruf je Lauf und dasselbe Theme für Lesen und Schreiben."""
    import contextlib
    import io
    import main_theme
    import warenkorb_gratisversand as wg
    f, n = [], 0

    def pruefe(ok, was):
        nonlocal n
        n += 1
        if not ok:
            f.append(was)

    pruefe(kanarien(still=True), "Kanarien rot")
    pruefe(GRATIS_AB_CH == 50.0 and TARIF == 5000 and VERSPRECHEN == math.ceil(5000 * 10 / 9) == 5556,
           f"Zahlen {GRATIS_AB_CH}/{TARIF}/{VERSPRECHEN} ≠ 50/5000/5556 (Entscheid 22.10.; bei bewusster Änderung nachziehen)")
    pruefe(BREITE == 5000, f"Balkenbreite {BREITE} ≠ 5000 (bewusst = Tarif, wie live seit 22.10.)")
    pruefe(TEXT_SCHWELLE == "ab CHF 50 nach Rabatt", f"TEXT_SCHWELLE «{TEXT_SCHWELLE}»")
    pruefe(js_soll_befunde(JS_NEU) == [], f"Soll-Balken: {js_soll_befunde(JS_NEU)}")
    for stueck in ("bis zum Gratis-Versand (ab CHF 50 nach Rabatt)'", "tot>=5000,", "Math.max(5556-sub,", "((5000-tot)*10+8)/9",
                   "Math.round(sub/5000*100)"):
        pruefe(stueck in JS_NEU, f"JS_NEU ohne «{stueck}»")
    pruefe("Warenwert)" not in JS_NEU, "JS_NEU trägt den alten Text «(ab CHF 50 Warenwert)»")
    for name, mutant in (("Text «Warenwert»", JS_NEU.replace("(ab CHF 50 nach Rabatt)", "(ab CHF 50 Warenwert)")),
                         ("Schwelle 4500", JS_NEU.replace("tot>=5000,", "tot>=4500,")),
                         ("Breite 5556", JS_NEU.replace("sub/5000*100", "sub/5556*100"))):
        pruefe(bool(js_soll_befunde(mutant)), f"Mutant «{name}» nicht erkannt")
    # Reparaturpfad (rein): Theme-Update ohne Marken → nur Soll; cart.json nie; Rest der Dateien bleibt
    alt_balken = JS_ANFANG + "    var gratis=tot>=4500; el.innerHTML='(ab CHF 50 Warenwert)'+Math.round(sub/5556*100);\n" + JS_ENDE
    probe = {"layout/theme.liquid": "<VOR>\n" + alt_balken + "<NACH>\n",
             "snippets/cart-summary.liquid": "<A>\n" + wg.ANKER + BLOCK_0610 + "<B>\n",
             "templates/cart.json": '{"sections":{"lux_cart_trust":{"settings":{"custom_liquid":"' + LI_ALT + '"}}}}'}
    neu, _ = plane_aus(probe)
    tl, cs = neu.get("layout/theme.liquid", ""), neu.get("snippets/cart-summary.liquid", "")
    pruefe(tl == "<VOR>\n" + JS_NEU + "<NACH>\n", "theme.liquid: nicht genau JS_NEU an Stelle des alten Balkens")
    pruefe(cs == "<A>\n" + wg.ANKER + wg.BLOCK + "<B>\n" and "4500" not in cs and MARKE in cs, "cart-summary: nicht genau der Soll-Block")
    pruefe("templates/cart.json" not in neu, "cart.json im Reparaturpfad")
    neu2, _ = plane_aus({**probe, **neu})
    pruefe(neu2 == {}, f"Reparatur nicht idempotent: {list(neu2)}")
    neu3, b3 = plane_aus({**probe, "snippets/cart-summary.liquid": "<A>\n" + wg.ANKER + "<B>\n"})
    pruefe("snippets/cart-summary.liquid" not in neu3 and any("warenkorb_gratisversand.py" in x for x in b3),
           "cart-summary ohne Hinweis-Block: hier geschrieben statt warenkorb_gratisversand.py")
    try:
        plane_aus({**probe, "layout/theme.liquid": "kein Balken"})
        pruefe(False, "theme.liquid ohne Anker nicht abgelehnt")
    except SystemExit:
        pruefe(True, "")
    # Import fragt nichts ab; ein Lauf = EIN gid()-Aufruf, und gelesen wird im Theme aus diesem Aufruf
    ok, m = main_theme.import_ohne_netz("warenkorb_einig", "warenkorb_gratisversand", pfad=HIER + os.pathsep + main_theme.HIER)
    pruefe(ok, f"Import fragt ab: {m}")
    g = globals()
    alt_gid, alt_lese, alt_gql, gelesen, zaehler = main_theme.gid, g["lese"], g["gql"], [], []
    main_theme.gid = lambda *a, **k: zaehler.append(1) or "gid://shopify/OnlineStoreTheme/42"
    g["lese"] = lambda dateien, theme: gelesen.append(theme) or ("MAIN", {d: probe[d] for d in dateien})

    def kein_gql(*a, **k):
        raise AssertionError("Schreibversuch im Selbsttest")
    g["gql"] = kein_gql
    alt_scharf = os.environ.pop("SCHARF", None)
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            rc = schreiben()   # TROCKEN (SCHARF entfernt, gql gesperrt): liest, plant, schreibt nichts
    except (SystemExit, AssertionError) as e:
        rc = f"{type(e).__name__}: {e}"
    finally:
        main_theme.gid, g["lese"], g["gql"] = alt_gid, alt_lese, alt_gql
        if alt_scharf is not None:
            os.environ["SCHARF"] = alt_scharf
    pruefe(rc == 0 and len(zaehler) == 1 and gelesen == ["gid://shopify/OnlineStoreTheme/42"],
           f"ein Lauf: rc {rc}, gid() {len(zaehler)}×, gelesen in {gelesen}")
    # pruefen()/schreiben() OHNE Netz gegen ein Attrappen-Theme. Vertrag mit dem Aufseher (fixer_keepalive.sh, letzte Zeile): nur
    # «Marke fehlt» (Balken oder Hinweis) löst den SCHARF-Lauf aus; cart.json, ≠ Soll, nicht MAIN, nicht ermittelbar = nur melden.
    # Ohne role MAIN plant schreiben() nichts. SCHARF ist hier immer aus.
    import theme_attrappe as ta
    reiz = ta.reiz("warenkorb_einig.py")
    pruefe(reiz == "Marke fehlt", f"Aufseher-Reizwort {reiz!r} ≠ «Marke fehlt» (fixer_keepalive.sh)")
    T, SOLL = "gid://shopify/OnlineStoreTheme/0", wg.soll_theme()
    TL, CS, CJ = DREI

    def ers(datei, a, b):
        def aend(d):
            if a not in d[datei]:
                raise AssertionError(f"Selbsttest-Fall: «{a[:40]}» nicht in {datei}")
            d[datei] = d[datei].replace(a, b)
        return aend

    def fall(fn, aend=None, role="MAIN", tarif_=(VERSAND / 100, TARIF / 100), ohne_theme=False, js=None):
        dat = dict(SOLL)
        if aend:
            aend(dat)
        att = ta.Attrappe(dat, role)

        def lt():
            if ohne_theme:
                raise RuntimeError("Attrappe: kein eindeutiges MAIN-Theme")
            return T
        scharf = os.environ.pop("SCHARF", None)
        try:
            with ta.ohne_netz(), ta.ersetzt((g, "gql", att.gql), (g, "live_theme", lt), (wg, "tarif", lambda: tarif_),
                                            (g, "JS_NEU", js or JS_NEU), (sys, "argv", [sys.argv[0]])):
                rc, letzte, aus = ta.lauf(fn)
        finally:
            if scharf is not None:
                os.environ["SCHARF"] = scharf
        return rc, letzte, aus, att

    js_4500 = JS_NEU.replace("tot>=5000,", "tot>=4500,")
    for name, kw, soll, stueck in (
            ("Soll-Stand", {}, "STILL", "WARENKORB-EINIG ✓"),
            ("Balken: Marke weg", {"aend": ers(TL, MARKE, "LUX-ZZ")}, "REPARATUR", "Marke fehlt"),
            ("Hinweis: Marke weg", {"aend": ers(CS, MARKE, "LUX-YY")}, "REPARATUR", "Marke fehlt"),
            ("cart.json: Marke weg", {"aend": ers(CJ, MARKE, "LUX-QQ")}, "MELDEN", "templates/cart.json"),
            ("cart.json fehlt", {"aend": lambda d: d.pop(CJ)}, "MELDEN", "Datei fehlt"),
            ("Balken-Text «Warenwert»", {"aend": ers(TL, "(ab CHF 50 nach Rabatt)", "(ab CHF 50 Warenwert)")}, "MELDEN", "Balken-Code ≠ Soll"),
            ("Balken-Breite 5556", {"aend": ers(TL, "sub/5000*100", "sub/5556*100")}, "MELDEN", "Balken-Code ≠ Soll"),
            ("Balken tot>=4500", {"aend": ers(TL, "tot>=5000", "tot>=4500")}, "MELDEN", "Balken-Code ≠ Soll"),
            ("Balken VERSAND=900", {"aend": ers(TL, "VERSAND=700,", "VERSAND=900,")}, "MELDEN", "VERSAND=700"),
            ("Hinweis «noch X» mit 5000", {"aend": ers(CS, "lux_gv_rest = 5556", "lux_gv_rest = 5000")}, "MELDEN", "cart-summary: «"),
            ("Hinweis ohne «nach Rabatt»", {"aend": ers(CS, "(ab CHF 50 nach Rabatt)</span>", "(ab CHF 50)</span>")}, "MELDEN", "cart-summary: «"),
            ("alte Lieferzeile", {"aend": ers(CJ, "<li>📦 Lieferung voraussichtlich …</li>", LI_ALT)}, "MELDEN", "alte Zeile"),
            ("Theme nicht MAIN", {"role": "UNPUBLISHED"}, "MELDEN", "nicht MAIN"),
            ("Live-Theme nicht ermittelbar", {"ohne_theme": True}, "MELDEN", "nicht ermittelbar"),
            ("Tarif geändert", {"tarif_": (9.0, TARIF / 100)}, "MELDEN", "Tarif geändert"),
            ("Soll-Balken 4500", {"js": js_4500}, "MELDEN", "Soll-Balken"),
            ("Soll-Balken ohne Marke", {"js": JS_NEU.replace(MARKE, "LUX-ZZ")}, "MELDEN", "Soll-Balken")):
        try:   # ein Fall, dessen Textstelle im (mutierten) Soll fehlt, ist selbst ein Befund — nicht abstürzen
            rc, letzte, _, att = fall(pruefen, **kw)
        except AssertionError as e:
            pruefe(False, f"pruefen «{name}»: {e}")
            continue
        ist = ta.aufseher(letzte, reiz)
        ok = (ist == soll and stueck in letzte and (rc == 0) == (soll == "STILL") and not att.schreibversuche and set(att.themes) <= {T}
              and (att.abfragen == 0 if kw.get("ohne_theme") else att.themes))
        pruefe(ok, f"pruefen «{name}»: {ist} (soll {soll}), rc {rc}, «{letzte[:150]}»")
    for name, kw, soll_rc, stueck, trocken in (
            ("nicht MAIN, Balken-Marke weg", {"role": "UNPUBLISHED", "aend": ers(TL, MARKE, "LUX-ZZ")}, 1, "Theme nicht MAIN", False),
            ("Live-Theme nicht ermittelbar", {"ohne_theme": True, "aend": ers(TL, MARKE, "LUX-ZZ")}, 1, "nichts geschrieben", False),
            ("Soll-Balken 4500", {"js": js_4500, "aend": ers(TL, MARKE, "LUX-ZZ")}, 1, "nichts geschrieben", False),
            ("Soll-Stand", {}, 0, "nichts zu tun", False),
            ("nur cart.json ohne Marke", {"aend": ers(CJ, MARKE, "LUX-QQ")}, 0, "nichts zu tun", False),
            ("MAIN, Balken-Marke weg (Trockenlauf)", {"aend": ers(TL, MARKE, "LUX-ZZ")}, 0, "TROCKEN", True)):
        try:   # ein Fall, dessen Textstelle im (mutierten) Soll fehlt, ist selbst ein Befund — nicht abstürzen
            rc, letzte, aus, att = fall(schreiben, **kw)
        except AssertionError as e:
            pruefe(False, f"schreiben «{name}»: {e}")
            continue
        ok = (rc == soll_rc and stueck in letzte and ("TROCKEN" in aus) == trocken and not att.schreibversuche and set(att.themes) <= {T}
              and (att.abfragen == 0 if kw.get("ohne_theme") or kw.get("js") else att.themes == [T]))
        pruefe(ok, f"schreiben «{name}»: rc {rc} (soll {soll_rc}), «{letzte[:150]}», Abfragen {att.abfragen}")
    print(f"SELBSTTEST warenkorb_einig: {'OK' if not f else 'FEHLER'} ({n - len(f)}/{n})" + ("" if not f else " — " + " · ".join(f)))
    return 1 if f else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    sys.exit(pruefen() if "--pruefen" in sys.argv else schreiben())
