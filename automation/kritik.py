#!/usr/bin/env python3
"""kritik.py — Kritik von Kimi UND ChatGPT zur selben Sache einholen (29.09.2026, Betreiber «kimi und chatgpt nutzen für kritik»).

    python3 automation/kritik.py "Was ist an diesem Vorgehen falsch?" datei1 [datei2 …]
    echo "Plan …" | python3 automation/kritik.py - [datei …]
    NUR=chatgpt|kimi   nur ein Modell · MODELL_GPT=gpt-5.5 · KIMI_MODELL=kimi-k3 · MAXZEICHEN=60000 (je Datei gekürzt)
    AUSGABE=dropship/_kritik/<name>.md   Antworten zusätzlich ablegen (NIE Kundendaten/Geheimnisse — Repo ist öffentlich)

Beide Modelle bekommen denselben Text und dieselbe Rolle: ein strenger Prüfer, der Fehler, Lücken und Risiken sucht —
nicht lobt. Sie laufen parallel; fällt eines aus, steht der Grund in der Ausgabe (nie still «keine Kritik»).

⚠️ HAUSREGEL (Lehre 05.09.2026): Eine KI-Antwort ist ein HINWEIS, kein Beleg — von 31 Befunden zweier Modelle waren
   mehrere erfunden, inkl. Zitaten, die in keinem Text standen. Jeder Befund wird am Objekt nachgemessen, BEVOR danach
   gehandelt wird. Wo beide Modelle unabhängig dasselbe sagen, zuerst prüfen; Einzelstimmen danach.
⚠️ Kimi k3 antwortet bei strukturierten Fragen oft nur in `reasoning_content` → als «Denktext» gekennzeichnet.
Schlüssel: Umgebung OPENAI_API_KEY / KIMI_API_KEY, sonst /tmp/openai_key bzw. kimi_frage.schluessel(). NIE ins Repo.
"""
import json, os, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROLLE = ("Du bist ein strenger, erfahrener Prüfer (E-Commerce Schweiz, Shopify, Automatisierung, Datenqualität). "
         "Antworte auf Deutsch. Suche Fehler, Denkfehler, Lücken, Risiken und bessere Alternativen — kein Lob, keine "
         "Zusammenfassung des Textes. Nummeriere die Befunde, je Befund: Behauptung · warum · wie man es NACHPRÜFT. "
         "Sag ausdrücklich, wenn du etwas nicht beurteilen kannst. Erfinde keine Zitate.")
MODELL_GPT = os.environ.get("MODELL_GPT", "gpt-5.5")
MAXZEICHEN = int(os.environ.get("MAXZEICHEN", "60000"))


def text_bauen(frage, dateien):
    teile = [frage.strip()]
    for d in dateien:
        try:
            inhalt = open(d, encoding="utf-8", errors="replace").read()
        except OSError as e:
            raise SystemExit(f"Datei nicht lesbar: {d} ({e})")
        if len(inhalt) > MAXZEICHEN:
            inhalt = inhalt[:MAXZEICHEN] + f"\n… [gekürzt, {len(inhalt)} Zeichen gesamt]"
        teile.append(f"\n===== DATEI: {d} =====\n{inhalt}")
    return "\n".join(teile)


def chatgpt(text):
    k = os.environ.get("OPENAI_API_KEY") or (open("/tmp/openai_key").read().strip() if os.path.exists("/tmp/openai_key") else "")
    if not k:
        return "FEHLT: kein OPENAI_API_KEY (Umgebung oder /tmp/openai_key)"
    daten = json.dumps({"model": MODELL_GPT, "messages": [{"role": "system", "content": ROLLE},
                                                          {"role": "user", "content": text}]}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=daten,
                                 headers={"Authorization": "Bearer " + k, "Content-Type": "application/json"})
    grund = ""
    for versuch in range(3):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=300))
            return (d["choices"][0]["message"].get("content") or "").strip() or f"LEER (Antwort ohne Text: {str(d)[:200]})"
        except urllib.error.HTTPError as e:
            grund = f"HTTP {e.code}: {e.read()[:300].decode(errors='replace')}"
            if e.code in (400, 401, 403, 404):
                break
        except Exception as e:
            grund = f"{type(e).__name__}: {e}"[:300]
        time.sleep(5 * (versuch + 1))
    return "FEHLER: " + grund


def kimi(text):
    """Streaming: kimi-k3 denkt oft > 5 min; ohne Datenfluss schliesst der Proxy die Verbindung (29.09.: RemoteDisconnected
    nach 300 s, Timeout nach 180 s). Mit stream=true fliessen Denk-Stücke laufend → Verbindung bleibt offen."""
    k = os.environ.get("KIMI_API_KEY")
    if not k:
        try:
            import kimi_frage
            k, _ = kimi_frage.schluessel()
        except (SystemExit, Exception) as e:
            return f"FEHLT: {e}"
    modell = os.environ.get("KIMI_MODELL", "kimi-k3")
    daten = json.dumps({"model": modell, "stream": True, "temperature": 1 if "k3" in modell else 0.3,
                        "messages": [{"role": "system", "content": ROLLE}, {"role": "user", "content": text}]}).encode()
    req = urllib.request.Request("https://api.moonshot.ai/v1/chat/completions", data=daten,
                                 headers={"Authorization": "Bearer " + k, "Content-Type": "application/json"})
    inhalt, denk = [], []
    try:
        with urllib.request.urlopen(req, timeout=900) as f:
            for roh in f:
                z = roh.decode("utf-8", "replace").strip()
                if not z.startswith("data:"):
                    continue
                z = z[5:].strip()
                if z == "[DONE]":
                    break
                try:
                    delta = json.loads(z)["choices"][0].get("delta") or {}
                except (ValueError, KeyError, IndexError):
                    continue
                inhalt.append(delta.get("content") or "")
                denk.append(delta.get("reasoning_content") or "")
    except urllib.error.HTTPError as e:
        koerper = e.read().decode("utf-8", "replace")
        if "quota" in koerper or "balance" in koerper.lower():
            return "FEHLER: Kimi-Konto ohne Guthaben (platform.moonshot.ai → Billing) · " + koerper[:200]
        return f"FEHLER: Kimi HTTP {e.code}: {koerper[:300]}"
    except Exception as e:
        teil = "".join(inhalt).strip()
        return (f"⚠️ Verbindung abgebrochen ({type(e).__name__}) — Teilantwort:\n\n{teil}") if teil else f"FEHLER: {type(e).__name__}: {e}"[:300]
    t = "".join(inhalt).strip()
    if t:
        return t
    d = "".join(denk).strip()
    return ("⚠️ nur Denktext (reasoning_content), kein fertiges Ergebnis:\n\n" + d) if d else "LEER (Kimi lieferte weder Inhalt noch Denktext)"


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    frage = sys.stdin.read() if sys.argv[1] == "-" else sys.argv[1]
    text = text_bauen(frage, sys.argv[2:])
    nur = os.environ.get("NUR", "").lower()
    auftraege = {n: f for n, f in (("ChatGPT (" + MODELL_GPT + ")", chatgpt), ("Kimi", kimi))
                 if not nur or nur in n.lower()}
    t0 = time.time()
    with ThreadPoolExecutor(2) as ex:
        ergebnisse = {n: ex.submit(f, text) for n, f in auftraege.items()}
        ergebnisse = {n: fu.result() for n, fu in ergebnisse.items()}
    kopf = (f"# Kritik · {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC · {len(text)} Zeichen · {time.time() - t0:.0f} s\n"
            "> HINWEISE, keine Belege — jeden Befund am Objekt nachmessen, bevor danach gehandelt wird.\n")
    aus = [kopf] + [f"\n## {n}\n\n{a}\n" for n, a in ergebnisse.items()]
    print("".join(aus))
    ziel = os.environ.get("AUSGABE")
    if ziel:
        os.makedirs(os.path.dirname(ziel) or ".", exist_ok=True)
        with open(ziel, "w", encoding="utf-8") as f:
            f.write(f"Frage: {frage.strip()[:500]}\nDateien: {', '.join(sys.argv[2:]) or '—'}\n\n" + "".join(aus))
    if all(a.startswith(("FEHLER", "FEHLT")) for a in ergebnisse.values()):
        sys.exit(2)


if __name__ == "__main__":
    main()
