#!/usr/bin/env python3
"""google_bild_tausch.py — «Inappropriate image» bei Google: ein unverfängliches VORHANDENES Bild nach vorne (30.09.2026).

Betreiber 30.09.: «google sachen mit chatgpt und gemini».
GEMESSEN 29.09.: 429 aktive Produkte mit dem Free-Listings-Blocker «Inappropriate image» (grösste Klasse). Bei Mode ist das
Hauptbild oft eine knappe Pose, weiter hinten liegt ein neutrales Bild desselben Artikels.

VERFAHREN je Produkt (≥ 2 Bilder):
  1. bis 8 vorhandene Bilder laden (512 px), nummeriert.
  2. Gemini (gemini-2.5-flash) UND ChatGPT (gpt-5.5) urteilen UNABHÄNGIG: welches Bild zeigt den Artikel klar und ist
     für Google unverfänglich? Antwort JSON {wahl, motiv_selbst_problem, grund}.
  3. Nur wenn BEIDE dieselbe Wahl ≠ 1 treffen und keiner das Motiv selbst für das Problem hält → dieses Bild an Stelle 1
     (productReorderMedia — kein Upload, kein Speicher; Dateispeicher ist voll). Nichts wird gelöscht.
  4. Ledger dropship/_google_bild_tausch.tsv (handle, Stand, altes/neues erstes Bild, beide Urteile) — Rückweg = alte
     media-id wieder nach vorne.
Kontrollgruppe: KONTROLLE=N Produkte werden nur ins Ledger geschrieben (Zeile «kontrolle»), NICHT angefasst — gestern (29.09.)
hat schon ein Tag-Update 27 % der «Product page unavailable» gelöst; ohne unberührte Gruppe misst man das Update, nicht den Tausch.
Modell-Urteile sind Hinweise: nur Übereinstimmung zweier Modelle führt zu einer Änderung, jede Änderung ist umkehrbar.

  python3 automation/google_bild_tausch.py            Trockenlauf (Standard): zeigt Urteile, ändert nichts
  SCHARF=1 N=40 KONTROLLE=40 python3 automation/google_bild_tausch.py

05.10.2026 (Prüfer «Ledger ≠ Live»): gemessen 83 von 301 Tauschen live zurückgedreht — Verursacher textbild_fix.py (jetzt
mit Sperre, siehe bildtausch_sperre.py). Neu:
  --ruecklesen            alle Handles mit letzter Zeile tausch*/nachgesetzt: Ledger-neu == live media[0]? Sonst (ACTIVE,
                          im Google-Kanal, Bild noch vorhanden) mit SCHARF=1 productReorderMedia nachsetzen, Ledger-Art
                          «nachgesetzt». Ausgabe «RUECKLESE: n geprüft · k abweichend · m nachgesetzt».
  --rueckweg h1 h2 …      die ALTE erste Media-ID (Spalte 4) wieder nach vorne, Ledger-Art «rueckweg» (gibt die Sperre frei)
  Produkte ohne Google-Publikation werden übersprungen (kein Vision-Kontingent für Ware, die Google nicht sieht).
  dropship/_google_bild_tausch_ids.tsv (handle → Produkt-ID) pflegt dieser Lauf für die Sperre der anderen Umsortierer.
"""
import base64, io, json, os, re, subprocess, sys, time, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heilversprechen_wache as hw          # gql() mit Grund bei Fehlern
import gemini_jury as gj                     # schluessel()
from PIL import Image

import bildtausch_sperre as bs

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship/_google_bild_tausch.tsv")
GOOGLE = "gid://shopify/Publication/302872297857"
STAND = os.path.join(REPO, "dropship/_google_feedback_stand.json")
SCHARF = os.environ.get("SCHARF") == "1"
N = int(os.environ.get("N", "40"))
KONTROLLE = int(os.environ.get("KONTROLLE", "0"))
KLASSE = os.environ.get("KLASSE", "Inappropriate image")
MODELL_GPT = os.environ.get("MODELL_GPT", "gpt-5.5")

PROMPT = """Du prüfst Produktbilder für Google Merchant (Gratis-Einträge, Schweiz). Google hat das HAUPTBILD (Bild 1) dieses
Artikels als «Inappropriate image» abgelehnt. Google lehnt u. a. ab: sexuell anzügliche Posen, viel nackte Haut, Unterwäsche
am Körper, Gewalt/Schock, Waffen. Artikel: «{titel}» (Typ: {typ}).
Du siehst {k} Bilder, nummeriert 1 bis {k} in dieser Reihenfolge. Wähle das Bild, das den ARTIKEL klar zeigt (nicht nur ein
Detail, keine Grössentabelle, kein Text-/Werbebild) UND am wenigsten Anlass für eine Ablehnung gibt. Wenn Bild 1 bereits die
beste Wahl ist oder kein Bild besser ist, antworte wahl=1. Wenn der Artikel selbst das Problem ist (z. B. Dessous, Totenkopf-
Motiv, Waffe) und kein Bild das lösen kann, setze motiv_selbst_problem=true.
Antworte NUR mit JSON: {{"wahl": n, "motiv_selbst_problem": true|false, "grund": "max. 1 Satz"}}"""

# 03.10.2026: zweite Klasse «Promotional overlay on image» (8 Produkte) — gleiches Verfahren, anderer Ablehnungsgrund.
PROMPT_UEBERLAGERUNG = """Du prüfst Produktbilder für Google Merchant (Gratis-Einträge, Schweiz). Google hat das HAUPTBILD (Bild 1)
dieses Artikels als «Promotional overlay on image» abgelehnt: eingeblendeter Werbetext, Preise, Rabatt-Sticker, Logos,
Wasserzeichen, Rahmen oder Grafik-Collagen über dem Produktfoto. Artikel: «{titel}» (Typ: {typ}).
Du siehst {k} Bilder, nummeriert 1 bis {k} in dieser Reihenfolge. Wähle das Bild, das den ARTIKEL klar zeigt und KEINEN
eingeblendeten Text, kein Logo, kein Wasserzeichen und keine Grafik-Einblendung trägt (Schrift AUF dem Produkt selbst ist erlaubt).
Wenn kein Bild ohne Einblendung existiert, antworte wahl=1. motiv_selbst_problem bleibt false.
Antworte NUR mit JSON: {{"wahl": n, "motiv_selbst_problem": true|false, "grund": "max. 1 Satz"}}"""


def openai_key():
    k = os.environ.get("OPENAI_API_KEY") or (open("/tmp/openai_key").read().strip() if os.path.exists("/tmp/openai_key") else "")
    if not k:
        raise SystemExit("OPENAI_API_KEY fehlt (Umgebung oder /tmp/openai_key)")
    return k


def jpgs(urls):
    out = []
    for u in urls:
        r = subprocess.run(["curl", "-s", "-L", "--max-time", "30", u], capture_output=True)
        try:
            im = Image.open(io.BytesIO(r.stdout)).convert("RGB")
            im.thumbnail((512, 512))
            b = io.BytesIO(); im.save(b, "JPEG", quality=80); out.append(b.getvalue())
        except Exception:
            out.append(None)
    return out


def json_aus(txt):
    return json.loads(re.search(r"\{.*\}", txt, re.S).group(0))


class GeminiLeer(RuntimeError):
    """04.10.2026: Gemini antwortet HTTP 402 Payment Required (Guthaben leer). Das ist kein Netzfehler — ohne diese
    Unterscheidung lief der Aufseher-Bildtausch seit dem Abend als «fehler 6 · tausch 0» ins Leere."""


def gemini(bilder, text):
    import zweitmodell
    if zweitmodell.gemini_leer():
        raise GeminiLeer("Marke /tmp/gemini_leer (< 6 h)")
    teile = [{"text": text}] + [{"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(b).decode()}} for b in bilder]
    body = {"contents": [{"parts": teile}], "generationConfig": {"temperature": 0.1, "response_mime_type": "application/json"}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gj.schluessel()}"
    grund = ""
    for a in range(3):
        try:
            r = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=120))
            # 03.10.2026: ohne «candidates» hat Gemini die BILDER selbst gesperrt (promptFeedback.blockReason, z. B. Horror-
            # Maske mit Blut). Das ist kein Netzfehler, sondern die Antwort: das Motiv ist das Problem.
            if not j.get("candidates") and (j.get("promptFeedback") or {}).get("blockReason"):
                return {"wahl": 1, "motiv_selbst_problem": True, "grund": "Gemini sperrt die Bilder: " + j["promptFeedback"]["blockReason"]}
            return json_aus(j["candidates"][0]["content"]["parts"][0]["text"])
        except urllib.error.HTTPError as e:
            koerper = e.read()[:300].decode("utf-8", "replace")
            if e.code == 402:
                zweitmodell.handle_gemini_402(koerper)
                raise GeminiLeer("HTTP 402: " + koerper[:120])
            grund = f"HTTP {e.code}: {koerper[:150]}"; time.sleep(4 * (a + 1))
        except Exception as e:
            grund = f"{type(e).__name__}: {str(e)[:150]}"; time.sleep(4 * (a + 1))
    raise RuntimeError("Gemini ohne Antwort — " + grund)


def chatgpt(bilder, text):
    """Zweitprüfer (ChatGPT, bei leerem Guthaben Groq-Vision) — 02.10.2026, siehe zweitmodell.py."""
    import zweitmodell
    return zweitmodell.chat_json(text, bilder)


def main():
    stand = json.load(open(STAND))
    handles = stand["handles"].get(KLASSE) or []
    zeilen = [l.rstrip("\n").split("\t") for l in open(LEDGER)] if os.path.exists(LEDGER) else []
    # NOCHMAL_UNEINIG=1 (03.10.): «uneinig»/«fehler» zählen nicht als erledigt — sie bekommen eine neue Runde.
    erledigt = {f[0] for f in zeilen if len(f) > 2 and not (os.environ.get("NOCHMAL_UNEINIG") == "1" and f[2] in ("uneinig", "fehler"))}
    # 06.10.2026: «uneinig» mit BEIDEN Wahlen ≠ 1 (beide Prüfer gegen das aktuelle Bild, nur verschiedene Ersatzbilder) bekommt
    # EINE neue Runde mit der Regel «tausch-u» (unten) — höchstens einmal je Handle (zweites «uneinig» = fertig).
    _un = {}
    for f in zeilen:
        if len(f) > 5 and f[2] == "uneinig":
            m = re.match(r"G(\d+):.*\| C(\d+):", f[5])
            _un.setdefault(f[0], []).append(bool(m and int(m.group(1)) > 1 and int(m.group(2)) > 1))
    _letzte = {f[0]: f[2] for f in zeilen if len(f) > 2}
    erledigt -= {h for h, v in _un.items() if _letzte.get(h) == "uneinig" and len(v) == 1 and v[0]}
    offen = [h for h in handles if h not in erledigt]
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {KLASSE} · {len(handles)} gemeldet (Stand {stand['stand']}) · "
          f"{len(offen)} offen · N={N} KONTROLLE={KONTROLLE} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    zaehl = {"tausch": 0, "behalten": 0, "motiv": 0, "uneinig": 0, "zu_wenig_bilder": 0, "fehler": 0, "nicht_in_google": 0}
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for h in offen[:KONTROLLE]:
        if led: led.write(f"{h}\t{time.strftime('%Y-%m-%d')}\tkontrolle\t\t\t\n")
    for h in offen[KONTROLLE:KONTROLLE + N]:
        p = (hw.gql('query($h:String!){productByIdentifier(identifier:{handle:$h}){id title productType status '
                    'publishedOnPublication(publicationId:"%s") '
                    'media(first:8){nodes{id ... on MediaImage{image{url}}}}}}' % GOOGLE, {"h": h}).get("data") or {}).get("productByIdentifier")
        if not p or p["status"] != "ACTIVE":
            continue
        if not p.get("publishedOnPublication"):
            # 05.10.2026: aus dem Google-Kanal genommene Ware (Sperr-Tags) kostet kein Vision-Kontingent mehr.
            zaehl["nicht_in_google"] += 1; continue
        med = [m for m in p["media"]["nodes"] if (m.get("image") or {}).get("url")]
        if len(med) < 2:
            zaehl["zu_wenig_bilder"] += 1; continue
        bilder = jpgs([m["image"]["url"] for m in med])
        paare = [(m, b) for m, b in zip(med, bilder) if b]
        med, bilder = [m for m, _ in paare], [b for _, b in paare]
        if len(med) < 2:
            zaehl["zu_wenig_bilder"] += 1; continue
        text = (PROMPT_UEBERLAGERUNG if KLASSE == "Promotional overlay on image" else PROMPT).format(
            titel=p["title"], typ=p.get("productType") or "-", k=len(bilder))
        allein = False
        nur_zweit = False
        try:
            g = gemini(bilder, text)
        except GeminiLeer as e:
            # 04.10.2026: Gemini-Guthaben leer → mit EIN_MODELL=1 urteilt der Zweitprüfer (ChatGPT, sonst Groq-Vision
            # qwen) ALLEIN; Ledger-Art «tausch-q», damit die Trefferquote getrennt nachgemessen wird (wie «tausch-g»).
            if os.environ.get("EIN_MODELL") != "1":
                zaehl["fehler"] += 1; print(f"  ⚠️ {h}: Gemini leer ({e}) — EIN_MODELL=1 nötig", file=sys.stderr, flush=True); continue
            nur_zweit = True
            try:
                g = chatgpt(bilder, text)
            except Exception as e2:
                zaehl["fehler"] += 1; print(f"  ⚠️ {h}: Gemini leer UND Zweitprüfer {e2}", file=sys.stderr, flush=True)
                if "Tageskontingent" in str(e2):
                    print("ABBRUCH: beide Prüfer leer", flush=True); break
                continue
            c, allein = dict(g), True
        except RuntimeError as e:
            zaehl["fehler"] += 1; print(f"  ⚠️ {h}: {e}", file=sys.stderr, flush=True); continue
        try:
            if nur_zweit:
                raise StopIteration
            c = chatgpt(bilder, text)
        except StopIteration:
            pass
        except Exception as e:
            # 03.10.2026: GEMESSEN — von 46 getauschten Produkten (30.09.–01.10.) sind 35 (76 %) nicht mehr blockiert,
            # von 19 «uneinig» (unberührt) nur 4 (21 %). Ist der Zweitprüfer leer (ChatGPT ohne Guthaben, Groq-Tages-
            # kontingent je Modell), entscheidet mit EIN_MODELL=1 Gemini allein — jeder Tausch ist umkehrbar und wird als
            # «tausch-g» protokolliert (Nachmessung getrennt).
            if os.environ.get("EIN_MODELL") == "1" and ("Kontingent" in str(e) or "429" in str(e) or "Guthaben" in str(e)):
                c, allein = dict(g), True
            else:
                zaehl["fehler"] += 1; print(f"  ⚠️ {h}: {e}", file=sys.stderr, flush=True); continue
        gw, cw = int(g.get("wahl") or 1), int(c.get("wahl") or 1)
        motiv = bool(g.get("motiv_selbst_problem")) or bool(c.get("motiv_selbst_problem"))
        if motiv:
            art = "motiv"
        elif gw == cw == 1:
            art = "behalten"
        elif gw == cw and 1 < gw <= len(med):
            art = ("tausch-q" if nur_zweit else "tausch-g") if allein else "tausch"
        elif 1 < gw <= len(med) and 1 < cw <= len(med):
            # 06.10.2026: beide Prüfer gegen Bild 1, nur das Ersatzbild verschieden. GEMESSEN (Bilanz 05.10.): unberührte
            # «uneinig» 8/22 frei (36 %), ein Prüfer allein («tausch-g» 76 %, «tausch-q» 78 %) → Geminis Wahl, Art «tausch-u»
            # (getrennt nachgemessen, umkehrbar wie jeder Tausch).
            art = "tausch-u"
        else:
            art = "uneinig"
        zaehl[art] = zaehl.get(art, 0) + 1
        print(f"  {art:9} {h[:55]:55} G={gw} C={cw} · G: {str(g.get('grund'))[:70]} · C: {str(c.get('grund'))[:70]}", flush=True)
        neu = med[gw - 1]["id"] if art.startswith("tausch") else ""
        if SCHARF and art.startswith("tausch"):
            r = hw.gql('mutation($p:ID!,$m:[MoveInput!]!){productReorderMedia(id:$p,moves:$m){mediaUserErrors{message}}}',
                       {"p": p["id"], "m": [{"id": neu, "newPosition": "0"}]})
            err = ((r.get("data") or {}).get("productReorderMedia") or {}).get("mediaUserErrors")
            if err:
                zaehl["fehler"] += 1; print(f"  ⚠️ {h}: Umsortieren gescheitert {err}", file=sys.stderr, flush=True); art = "fehler"
            else:
                for _ in range(10):
                    time.sleep(2)
                    erst = hw.gql('{product(id:"%s"){media(first:1){nodes{id}}}}' % p["id"])["data"]["product"]["media"]["nodes"][0]["id"]
                    if erst == neu:
                        break
                if erst != neu:
                    zaehl["fehler"] += 1; art = "fehler"; print(f"  ⚠️ {h}: Rücklesen zeigt {erst}", file=sys.stderr, flush=True)
        if led:
            led.write(f"{h}\t{time.strftime('%Y-%m-%d')}\t{art}\t{med[0]['id']}\t{neu}\t"
                      f"G{gw}:{str(g.get('grund'))[:80]} | C{cw}:{str(c.get('grund'))[:80]}\n"); led.flush()
            if art.startswith("tausch"):
                bs.ids_merken([(h, p["id"])])
    print("FERTIG: " + " · ".join(f"{k} {v}" for k, v in zaehl.items()), flush=True)


def _produkte(handles):
    """handle → Produkt (id, status, Google-Publikation, Media-IDs) in Bündeln à 20."""
    out = {}
    hs = list(handles)
    for i in range(0, len(hs), 20):
        teil = hs[i:i + 20]
        q = "query{" + " ".join(
            'p%d: productByIdentifier(identifier:{handle:"%s"}){id handle status publishedOnPublication(publicationId:"%s") '
            'media(first:12){nodes{id}}}' % (j, h, GOOGLE) for j, h in enumerate(teil)) + "}"
        d = hw.gql(q).get("data") or {}
        for j, h in enumerate(teil):
            out[h] = d.get(f"p{j}")
    return out


def _nach_vorn(pid, mid):
    r = hw.gql('mutation($p:ID!,$m:[MoveInput!]!){productReorderMedia(id:$p,moves:$m){mediaUserErrors{message}}}',
               {"p": pid, "m": [{"id": mid, "newPosition": "0"}]})
    err = ((r.get("data") or {}).get("productReorderMedia") or {}).get("mediaUserErrors")
    if err:
        return f"Umsortieren gescheitert {err}"
    erst = ""
    for _ in range(10):
        time.sleep(2)
        erst = hw.gql('{product(id:"%s"){media(first:1){nodes{id}}}}' % pid)["data"]["product"]["media"]["nodes"][0]["id"]
        if erst == mid:
            return ""
    return f"Rücklesen zeigt {erst}"


def ruecklesen():
    """Ledger-neu == live media[0]? Sonst nachsetzen (SCHARF=1). Nur ACTIVE und im Google-Kanal."""
    letzte = bs.letzte_zeilen()
    alle = bs.alle_zeilen()
    getauscht = {h: f for h, f in letzte.items() if f[2] in bs.GETAUSCHT and len(f) >= 5 and f[4]}
    prod = _produkte(getauscht)
    bs.ids_merken([(h, p["id"]) for h, p in prod.items() if p])
    z = {"geprueft": 0, "ok": 0, "abweichend": 0, "nachgesetzt": 0, "nicht_aktiv": 0, "nicht_in_google": 0, "bild_fehlt": 0, "fehler": 0}
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for h, f in sorted(getauscht.items()):
        p = prod.get(h); z["geprueft"] += 1
        if not p or p["status"] != "ACTIVE":
            z["nicht_aktiv"] += 1; continue
        ids = [m["id"] for m in p["media"]["nodes"]]
        if ids and ids[0] == f[4]:
            z["ok"] += 1; continue
        z["abweichend"] += 1
        if not p.get("publishedOnPublication"):
            z["nicht_in_google"] += 1; print(f"  abweichend, nicht in Google: {h}"); continue
        if f[4] not in ids:
            z["bild_fehlt"] += 1; print(f"  ⚠️ {h}: Ledger-Bild {f[4].split('/')[-1]} nicht mehr am Produkt", flush=True); continue
        print(f"  abweichend {h[:60]:60} live0={ids[0].split('/')[-1]} soll={f[4].split('/')[-1]}" + ("" if SCHARF else " (TROCKEN)"), flush=True)
        if not SCHARF:
            continue
        grund = _nach_vorn(p["id"], f[4])
        if grund:
            z["fehler"] += 1; print(f"  ⚠️ {h}: {grund}", file=sys.stderr, flush=True); continue
        z["nachgesetzt"] += 1
        # Notiz trägt IMMER die Ursprungs-Tauschzeile (Art + Datum), auch nach mehrfachem Nachsetzen (05.10.: 81 Zeilen
        # sagten «nachgesetzt vom 2026-10-05», die Bilanz verlor damit Art und Datum).
        u = bs.urspruenglicher_tausch(alle.get(h, [])) or f
        led.write(f"{h}\t{time.strftime('%Y-%m-%d')}\tnachgesetzt\t{f[3]}\t{f[4]}\tlive war {ids[0].split('/')[-1]} ({u[2]} vom {u[1]})\n"); led.flush()
    print("RUECKLESE " + time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()) + ": " + " · ".join(f"{k} {v}" for k, v in z.items()) +
          ("" if SCHARF else " (TROCKEN)"), flush=True)
    return z


def rueckweg(handles):
    """Die alte erste Media-ID (Spalte 4 der letzten Tausch-Zeile) wieder nach vorne; gibt die Sperre frei."""
    letzte = bs.letzte_zeilen()
    prod = _produkte(handles)
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    ok = fehler = 0
    for h in handles:
        f, p = letzte.get(h), prod.get(h)
        if not f or f[2] not in bs.GETAUSCHT or not f[3]:
            print(f"  ⚠️ {h}: keine Tausch-Zeile im Ledger"); fehler += 1; continue
        if not p:
            print(f"  ⚠️ {h}: Produkt fehlt"); fehler += 1; continue
        ids = [m["id"] for m in p["media"]["nodes"]]
        if f[3] not in ids:
            print(f"  ⚠️ {h}: altes Bild {f[3].split('/')[-1]} nicht mehr am Produkt"); fehler += 1; continue
        print(f"  rueckweg {h[:60]:60} {ids[0].split('/')[-1]} → {f[3].split('/')[-1]}" + ("" if SCHARF else " (TROCKEN)"), flush=True)
        if not SCHARF:
            continue
        if ids[0] != f[3]:
            grund = _nach_vorn(p["id"], f[3])
            if grund:
                print(f"  ⚠️ {h}: {grund}", file=sys.stderr, flush=True); fehler += 1; continue
        ok += 1
        led.write(f"{h}\t{time.strftime('%Y-%m-%d')}\trueckweg\t{ids[0]}\t{f[3]}\tHand-Sichtung 05.10.: neues Bild nicht neutraler ({f[2]} vom {f[1]})\n"); led.flush()
    print(f"RUECKWEG: {ok} zurückgedreht · {fehler} Fehler" + ("" if SCHARF else " (TROCKEN)"), flush=True)


if __name__ == "__main__":
    if "--ruecklesen" in sys.argv:
        ruecklesen()
    elif "--rueckweg" in sys.argv:
        hs = [a for a in sys.argv[sys.argv.index("--rueckweg") + 1:] if not a.startswith("-")]
        if os.environ.get("RUECKWEG_FILE"):
            hs += [l.strip() for l in open(os.environ["RUECKWEG_FILE"]) if l.strip()]
        rueckweg(hs)
    else:
        main()
