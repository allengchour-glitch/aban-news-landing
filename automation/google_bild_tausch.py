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
"""
import base64, io, json, os, re, subprocess, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heilversprechen_wache as hw          # gql() mit Grund bei Fehlern
import gemini_jury as gj                     # schluessel()
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship/_google_bild_tausch.tsv")
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


def gemini(bilder, text):
    teile = [{"text": text}] + [{"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(b).decode()}} for b in bilder]
    body = {"contents": [{"parts": teile}], "generationConfig": {"temperature": 0.1, "response_mime_type": "application/json"}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gj.schluessel()}"
    grund = ""
    for a in range(3):
        try:
            r = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
            return json_aus(json.load(urllib.request.urlopen(r, timeout=120))["candidates"][0]["content"]["parts"][0]["text"])
        except Exception as e:
            grund = f"{type(e).__name__}: {str(e)[:150]}"; time.sleep(4 * (a + 1))
    raise RuntimeError("Gemini ohne Antwort — " + grund)


def chatgpt(bilder, text):
    inhalt = [{"type": "text", "text": text}] + [
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(b).decode()}} for b in bilder]
    body = {"model": MODELL_GPT, "messages": [{"role": "user", "content": inhalt}]}
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + openai_key(), "Content-Type": "application/json"})
    grund = ""
    for a in range(3):
        try:
            return json_aus(json.load(urllib.request.urlopen(req, timeout=240))["choices"][0]["message"]["content"])
        except urllib.error.HTTPError as e:
            grund = f"HTTP {e.code}: {e.read()[:200].decode(errors='replace')}"
            if e.code in (400, 401, 403, 404):
                break
        except Exception as e:
            grund = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(5 * (a + 1))
    raise RuntimeError("ChatGPT ohne Antwort — " + grund)


def main():
    stand = json.load(open(STAND))
    handles = stand["handles"].get(KLASSE) or []
    erledigt = {l.split("\t")[0] for l in open(LEDGER)} if os.path.exists(LEDGER) else set()
    offen = [h for h in handles if h not in erledigt]
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {KLASSE} · {len(handles)} gemeldet (Stand {stand['stand']}) · "
          f"{len(offen)} offen · N={N} KONTROLLE={KONTROLLE} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    zaehl = {"tausch": 0, "behalten": 0, "motiv": 0, "uneinig": 0, "zu_wenig_bilder": 0, "fehler": 0}
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for h in offen[:KONTROLLE]:
        if led: led.write(f"{h}\t{time.strftime('%Y-%m-%d')}\tkontrolle\t\t\t\n")
    for h in offen[KONTROLLE:KONTROLLE + N]:
        p = (hw.gql('query($h:String!){productByIdentifier(identifier:{handle:$h}){id title productType status '
                    'media(first:8){nodes{id ... on MediaImage{image{url}}}}}}', {"h": h}).get("data") or {}).get("productByIdentifier")
        if not p or p["status"] != "ACTIVE":
            continue
        med = [m for m in p["media"]["nodes"] if (m.get("image") or {}).get("url")]
        if len(med) < 2:
            zaehl["zu_wenig_bilder"] += 1; continue
        bilder = jpgs([m["image"]["url"] for m in med])
        paare = [(m, b) for m, b in zip(med, bilder) if b]
        med, bilder = [m for m, _ in paare], [b for _, b in paare]
        if len(med) < 2:
            zaehl["zu_wenig_bilder"] += 1; continue
        text = PROMPT.format(titel=p["title"], typ=p.get("productType") or "-", k=len(bilder))
        try:
            g, c = gemini(bilder, text), chatgpt(bilder, text)
        except RuntimeError as e:
            zaehl["fehler"] += 1; print(f"  ⚠️ {h}: {e}", file=sys.stderr, flush=True); continue
        gw, cw = int(g.get("wahl") or 1), int(c.get("wahl") or 1)
        motiv = bool(g.get("motiv_selbst_problem")) or bool(c.get("motiv_selbst_problem"))
        if motiv:
            art = "motiv"
        elif gw == cw == 1:
            art = "behalten"
        elif gw == cw and 1 < gw <= len(med):
            art = "tausch"
        else:
            art = "uneinig"
        zaehl[art] += 1
        print(f"  {art:9} {h[:55]:55} G={gw} C={cw} · G: {str(g.get('grund'))[:70]} · C: {str(c.get('grund'))[:70]}", flush=True)
        neu = med[gw - 1]["id"] if art == "tausch" else ""
        if SCHARF and art == "tausch":
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
    print("FERTIG: " + " · ".join(f"{k} {v}" for k, v in zaehl.items()), flush=True)


if __name__ == "__main__":
    main()
