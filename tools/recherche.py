#!/usr/bin/env python3
"""recherche.py — eigenes «Perplexity» (06.10.2026, Betreiber «tool installieren selber programmieren»).

Anlass: das TikTok «5 Konnektoren für Claude» (Perplexity, Composio, HyperFrames, Firecrawl, Playwright).
Browser (tools/browser.mjs) und HyperFrames gibt es schon; Firecrawl und WebSearch nur INNERHALB einer Session —
die Automatik (Aufseher, Routinen ohne Session) konnte bisher nicht im Netz nachsehen. Perplexity kostet Geld.

GEMESSEN 06.10.: Groq führt `openai/gpt-oss-120b` / `-20b` mit dem eingebauten Werkzeug `browser_search` aus
(Suche + Seite öffnen, serverseitig), 8,4 s, ~12k Tokens, echte URLs (tokconnect.com/trends/products/october-2026/).
Gratis-Kontingent je Modell und Organisation; `groq/compound` gibt es auf unseren Schlüsseln NICHT (404).
Direkte Suche von unserer IP aus taugt nicht: Bing antwortet auf «tiktok trend produkte» mit Pizzerien in Genf,
DuckDuckGo mit 202 (Bot-Prüfung).

  python3 tools/recherche.py "frage"                 # Antwort + Quellenliste (stdout)
  python3 tools/recherche.py "frage" --json          # {"antwort","quellen":[…],"modell","sekunden"}
  python3 tools/recherche.py "frage" --ablegen       # zusätzlich dropship/recherche/<datum>-<slug>.md
  python3 tools/recherche.py --selbsttest            # ohne Netz

Jede Antwort ist QUELLE (fremde Angabe), nie GEMESSEN — Gegenprobe am eigenen Bestand bleibt Pflicht
(Skill «recherchieren»). Die Quellen kommen aus den ausgeführten Werkzeugen, nicht aus dem Antworttext:
das Modell kann eine URL im Text erfinden, die Werkzeug-Ausgabe nicht.
"""
import json, os, re, sys, time, urllib.request, urllib.error

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
MODELLE = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]
ABLAGE = os.path.join(REPO, "dropship", "recherche")


def schluessel():
    # Schlüssel 3 zuletzt: dort liegt die Reserve der Social-Jury (zweitmodell.reserviert, 05.10.)
    k = [os.environ.get(n, "").strip() for n in ("GROQ_API_KEY", "GROQ_API_KEY2", "GROQ_API_KEY3", "GROQ_API_KEY_3")]
    return [x for i, x in enumerate(k) if x and x not in k[:i]]


def quellen_aus(executed):
    """Geöffnete Seiten (URL, auch über zwei Zeilen umbrochen: «L1: URL:» / «L2: https://…»), danach die Suchtreffer
    als https://<domain> («【0†Titel†domain】», ebenfalls umbrochen). Suchseite (exa.ai/search) zählt nicht."""
    geoeffnet, treffer = [], []
    for x in executed or []:
        out = re.sub(r"\n?L\d+:[ \t]?", " ", "\n" + str(x.get("output") or ""))   # Zeilennummern weg, Umbrüche zusammen
        for u in re.findall(r"URL:\s*(https?://\S+)", out):
            u = u.rstrip(").,")
            if "exa.ai/search" not in u and "/search?" not in u:
                geoeffnet.append(u)
        for d in re.findall(r"【\d+†[^†】]+†([a-z0-9.-]+\.[a-z]{2,})】", out):
            treffer.append("https://" + d)
    alle = []
    for u in geoeffnet + treffer:
        if u not in alle and not any(a.startswith(u) for a in alle):
            alle.append(u)
    return alle


def fragen(frage, max_tokens=3000, versuche_je=1):
    letzter = ""
    sys_text = ("Du recherchierst für einen Schweizer Onlineshop. Suche im Web, öffne mindestens eine Quelle und antworte "
                "auf Deutsch, knapp. Nenne zu jeder Aussage die Quelle als URL und das Datum der Quelle. Erfinde nichts; "
                "wenn die Quellen etwas nicht hergeben, sag das.")
    for modell in MODELLE:
        for k in schluessel():
            t = time.time()
            body = {"model": modell, "messages": [{"role": "system", "content": sys_text}, {"role": "user", "content": frage}],
                    "tools": [{"type": "browser_search"}], "tool_choice": "required", "reasoning_effort": "low",
                    "max_tokens": max_tokens}
            r = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", json.dumps(body).encode(),
                                       {"Content-Type": "application/json", "Authorization": "Bearer " + k,
                                        "User-Agent": "luxestyle-recherche/1"})   # ohne User-Agent: 403
            try:
                o = json.load(urllib.request.urlopen(r, timeout=180))
            except urllib.error.HTTPError as e:
                letzter = f"{modell}: HTTP {e.code} {e.read()[:160]!r}"; continue
            except Exception as e:
                letzter = f"{modell}: {type(e).__name__} {str(e)[:120]}"; continue
            m = o["choices"][0]["message"]
            antwort = (m.get("content") or "").strip()
            quellen = quellen_aus(m.get("executed_tools"))
            if not antwort or not quellen:
                letzter = f"{modell}: {'leer' if not antwort else 'ohne Quelle'}"; continue
            return {"antwort": bereinigen(antwort), "quellen": quellen, "modell": modell,
                    "sekunden": round(time.time() - t, 1), "tokens": (o.get("usage") or {}).get("total_tokens")}
    raise RuntimeError("keine Antwort mit Quelle — " + letzter)


def bereinigen(t):
    """Zitiermarken des Werkzeugs («【1†L34-L38】») sind für Leser Lärm."""
    return re.sub(r"【\d+†[^】]*】", "", t).replace("‑", "-").strip()


def slug(s):
    s = s.lower().translate(str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60] or "recherche"


def ablegen(frage, e):
    os.makedirs(ABLAGE, exist_ok=True)
    pfad = os.path.join(ABLAGE, f"{time.strftime('%Y-%m-%d')}-{slug(frage)}.md")
    with open(pfad, "w", encoding="utf-8") as f:
        f.write(f"# Recherche: {frage}\n\n_{time.strftime('%Y-%m-%d %H:%M')} UTC · {e['modell']} · {e['sekunden']} s · "
                f"alles hier ist **QUELLE** (fremde Angabe), nicht GEMESSEN_\n\n{e['antwort']}\n\n## Quellen (aus der Werkzeug-Ausgabe)\n\n")
        f.write("".join(f"- {u}\n" for u in e["quellen"]))
    return pfad


def selbsttest():
    ok = 0
    ex = [{"type": "browser_search", "output": "L0: \nL1: URL: https://exa.ai/search?q=x\nL4: 【0†T†a.com】"},
          {"type": "browser.open", "output": "L0: \nL1: URL: https://tokconnect.com/trends/products/october-2026/\nL2: x"},
          {"type": "browser.open", "output": "L1: URL: https://tokconnect.com/trends/products/october-2026/)."},
          {"type": "browser.open", "output": "L0: \nL1: URL:\nL2: https://www.interiordaily.com/article/98/x/\nL3: T"},
          {"type": "browser_search", "output": "L6: \\\\* 【2†The Biggest Home Design Trends on TikTok Right\nL7: Now†www.elledecor.com】\nL8: 【3†A†tokconnect.com】"}]
    tests = [
        (quellen_aus(ex) == ["https://tokconnect.com/trends/products/october-2026/", "https://www.interiordaily.com/article/98/x/", "https://a.com", "https://www.elledecor.com"], "Quellen: geöffnet zuerst, Umbruch, Treffer-Domains, Doppel raus"),
        (quellen_aus([]) == [], "Quellen: leer"),
        (bereinigen("A【1†L34-L38】 b‑c") == "A b-c", "Zitiermarken weg"),
        (slug("Was ist Trend? Oktober 2026 – Köln") == "was-ist-trend-oktober-2026-koeln", "Slug"),
        (slug("???") == "recherche", "Slug leer"),
        (len(schluessel()) == len(set(schluessel())), "Schlüssel ohne Doppel"),
    ]
    for b, n in tests:
        print(("✓ " if b else "✗ ") + n); ok += b
    print(f"{ok}/{len(tests)}"); return 0 if ok == len(tests) else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--selbsttest" in a:
        sys.exit(selbsttest())
    frage = " ".join(x for x in a if not x.startswith("--"))
    if not frage:
        print(__doc__); sys.exit(2)
    try:
        e = fragen(frage)
    except Exception as ex:
        print("RECHERCHE FEHLER:", ex, file=sys.stderr); sys.exit(1)
    if "--ablegen" in a:
        e["datei"] = os.path.relpath(ablegen(frage, e), REPO)
    if "--json" in a:
        print(json.dumps(e, ensure_ascii=False))
    else:
        print(e["antwort"]); print("\nQuellen:"); print("\n".join("- " + u for u in e["quellen"]))
        if e.get("datei"): print("\nabgelegt:", e["datei"])
