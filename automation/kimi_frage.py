#!/usr/bin/env python3
"""kimi_frage.py — zweite Meinung von Kimi (Moonshot) einholen.

    python3 automation/kimi_frage.py "Frage" [datei ...]
    echo "Frage" | python3 automation/kimi_frage.py -

⚠️ HAUSREGEL: Eine KI-Antwort ist ein HINWEIS, kein Beleg (Lehre 05.09.2026 — von 31 Befunden
   zweier Modelle waren mehrere frei erfunden, inkl. Zitaten, die in keinem Text standen).
   Jeder Befund gehoert einzeln am Objekt geprueft, BEVOR danach gehandelt wird.

⚠️ Kimi k3 faellt bei strukturierten Prompts in den Reasoning-Modus: `content` bleibt leer und die
   Antwort steht in `reasoning_content` (Lehre 26.07.2026). Das ist hier kein Fehler — fuer eine
   Analyse ist Denktext brauchbar —, wird aber ausdruecklich als solcher GEKENNZEICHNET, damit
   niemand Denktext fuer ein Ergebnis haelt.

Schluessel: /tmp/kimi.env, sonst Tresor-Fach `dienste`. NIE im Repo (es ist oeffentlich).
"""
import json, os, re, subprocess, sys, urllib.request

MODELL = os.environ.get("KIMI_MODELL", "kimi-k3")


def schluessel():
    for zeile in open("/tmp/kimi.env", encoding="utf-8") if os.path.exists("/tmp/kimi.env") else []:
        m = re.match(r"export\s+KIMI_API_KEY=(\S+)", zeile.strip())
        if m:
            return m.group(1), "/tmp/kimi.env"
    r = subprocess.run([sys.executable, "automation/tresor.py", "lesen", "dienste"],
                       capture_output=True, text=True, timeout=120)
    for zeile in r.stdout.splitlines():
        if zeile.strip().startswith("KIMI_API_KEY="):
            return zeile.split("=", 1)[1].strip(), "Tresor"
    raise SystemExit("KIMI_API_KEY nicht gefunden (weder /tmp/kimi.env noch Tresor-Fach dienste)")


def fragen(prompt, key, modell=MODELL, timeout=180):
    daten = json.dumps({
        "model": modell,
        "messages": [
            {"role": "system", "content": "Du antwortest auf Deutsch, knapp und konkret. "
                                          "Nenne nur Befunde, die du im gezeigten Text BELEGEN kannst, "
                                          "mit Datei und Zeile. Wenn du etwas nicht belegen kannst, "
                                          "sage das ausdruecklich statt zu raten."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }).encode()
    req = urllib.request.Request("https://api.moonshot.ai/v1/chat/completions", data=daten,
                                 headers={"Authorization": "Bearer " + key,
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as f:
            d = json.load(f)
    except urllib.error.HTTPError as e:
        # ⚠️ Der Fehlertext steht im KOERPER, nicht im Statuscode: 429 heisst bei Moonshot sowohl
        #    «zu schnell» (aussitzen) als auch «Konto leer» (aussitzen hilft nie). Lehre 08.09.2026.
        koerper = e.read().decode("utf-8", "replace")
        art = ""
        try:
            art = (json.loads(koerper).get("error") or {}).get("type", "")
        except Exception:
            pass
        if "quota" in art or "balance" in koerper.lower():
            raise SystemExit("⛔ Kimi-Konto ohne Guthaben — der Schluessel ist gueltig, aber jede "
                             "Anfrage wird abgewiesen. Aufladen: platform.moonshot.ai → Billing.\n"
                             "   Antwort: " + koerper[:200])
        raise SystemExit("⛔ Kimi HTTP %s: %s" % (e.code, koerper[:300]))
    m = d["choices"][0]["message"]
    inhalt = (m.get("content") or "").strip()
    if inhalt:
        return inhalt, False
    return (m.get("reasoning_content") or "").strip(), True


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    frage = sys.stdin.read() if sys.argv[1] == "-" else sys.argv[1]
    teile = [frage]
    for pfad in sys.argv[2:]:
        teile.append("\n\n--- %s ---\n%s" % (pfad, open(pfad, encoding="utf-8").read()))
    text, denktext = fragen("".join(teile), schluessel()[0])
    if denktext:
        print("⚠️ leeres `content` — das Folgende ist REASONING_CONTENT (Denktext), kein Ergebnis:\n")
    print(text)
    print("\n⚠️ Hinweis, kein Beleg: jeden Punkt am Objekt gegenpruefen, bevor danach gehandelt wird.")


if __name__ == "__main__":
    main()
