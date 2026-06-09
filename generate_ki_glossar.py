#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_ki_glossar.py — Anti-Hype KI-Glossar (eine Term-Liste → Karten + JSON-LD).

Ehrliche, knappe Erklärungen der wichtigsten KI-Begriffe auf Deutsch. Pro Begriff:
Definition, „Klartext“ (alltagsnah) und — wo nötig — ein „Hype-Check“. Reine stdlib,
schreibt ki-glossar.html. Aban-Voice: anti-hype, du-Form, keine erfundenen Zahlen.

Run:  python3 generate_ki_glossar.py
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

# (Begriff, Definition, Klartext, Hype-Check|"")
TERMS = [
    ("LLM (Large Language Model)",
     "Ein großes Sprachmodell, das aus riesigen Textmengen gelernt hat, das nächste Wort vorherzusagen.",
     "Eine sehr gute Autovervollständigung. Es „versteht“ nicht wie ein Mensch — es rechnet Wahrscheinlichkeiten.",
     "„Die KI denkt“ ist Marketing. Sie sagt plausible Wörter voraus, mehr nicht."),
    ("Prompt",
     "Die Eingabe/Anweisung, die du dem Modell gibst.",
     "Was du in den Chat tippst. Je klarer und konkreter, desto besser das Ergebnis.",
     ""),
    ("Token",
     "Die kleinste Einheit, in die Text fürs Modell zerlegt wird — oft Wortteile.",
     "Abrechnungs- und Längeneinheit. „1000 Tokens“ sind grob 700–750 deutsche Wörter.",
     ""),
    ("Kontextfenster",
     "Wie viel Text (Tokens) ein Modell gleichzeitig „im Blick“ behalten kann.",
     "Das Kurzzeitgedächtnis pro Chat. Ist es voll, vergisst das Modell den Anfang.",
     "Riesige Kontextfenster klingen toll — die Qualität in der Mitte langer Eingaben lässt aber oft nach."),
    ("Halluzination",
     "Wenn das Modell etwas Falsches selbstbewusst als Fakt ausgibt.",
     "Es erfindet Quellen, Zahlen oder Namen, die echt klingen. Immer prüfen.",
     "Kein seltener Bug, sondern Teil der Funktionsweise. Deshalb: nie ungeprüft übernehmen."),
    ("RAG (Retrieval-Augmented Generation)",
     "Das Modell schlägt vor der Antwort in deinen Dokumenten/Daten nach und nutzt die Funde.",
     "KI mit angeschlossenem Aktenschrank — antwortet auf Basis deiner echten Unterlagen.",
     "Reduziert Halluzinationen, beseitigt sie aber nicht. Die Quelle muss stimmen."),
    ("Agent",
     "Ein KI-System, das mehrschrittig handelt: planen, Werkzeuge nutzen, Ergebnis prüfen.",
     "Nicht nur antworten, sondern Aufgaben erledigen (z. B. recherchieren, Mails entwerfen, Tools bedienen).",
     "2026 das Buzzword schlechthin. Vieles „Agentic“ sind in Wahrheit ein paar verkettete Prompts."),
    ("Fine-Tuning",
     "Ein vortrainiertes Modell mit eigenen Beispielen auf einen Stil/eine Aufgabe nachjustieren.",
     "Dem Modell deinen Ton/Spezialfall antrainieren.",
     "Oft unnötig: ein gutes Prompt + RAG bringt für kleine Betriebe meist mehr als teures Fine-Tuning."),
    ("Embedding",
     "Text als Zahlenvektor, der Bedeutung abbildet — Ähnliches liegt nah beieinander.",
     "Die Technik hinter „semantischer“ Suche und RAG.",
     ""),
    ("Vektordatenbank",
     "Eine Datenbank, die Embeddings speichert und blitzschnell ähnliche findet.",
     "Der Aktenschrank hinter RAG.",
     ""),
    ("Temperatur",
     "Ein Regler für Zufall/Kreativität bei der Ausgabe (0 = konservativ, hoch = wilder).",
     "Niedrig für Fakten/Code, höher für Brainstorming.",
     ""),
    ("Multimodal",
     "Ein Modell, das mehrere Eingabe-/Ausgabearten kann: Text, Bild, Audio, teils Video.",
     "Du kannst ein Foto reinschicken und Fragen dazu stellen.",
     ""),
    ("Reasoning-Modell",
     "Ein Modell, das vor der Antwort sichtbar „nachdenkt“ (Zwischenschritte) — gut für Logik/Mathe.",
     "Langsamer und teurer, dafür stärker bei kniffligen Aufgaben.",
     "Für einfache Texte überdimensioniert — ein normales Modell reicht da und kostet weniger."),
    ("Inferenz",
     "Das Ausführen eines fertig trainierten Modells, um eine Antwort zu erzeugen.",
     "Der Moment, in dem du auf „Senden“ drückst und es rechnet — das kostet pro Aufruf.",
     ""),
    ("Parameter",
     "Die gelernten „Stellschrauben“ eines Modells; mehr ≈ mehr Kapazität.",
     "„70B“ heißt 70 Milliarden Parameter.",
     "Mehr Parameter ≠ automatisch besser. Kleinere, gut trainierte Modelle schlagen oft größere."),
    ("Open Weights vs. Open Source",
     "Open Weights: Modellgewichte frei nutzbar. Open Source: zusätzlich Code/Trainingsdaten offen.",
     "Viele „offene“ Modelle sind nur Open Weights — nicht dasselbe wie echte Open Source.",
     "„Open“ wird gern als Marketing benutzt. Lizenz genau lesen, bes. für kommerzielle Nutzung."),
    ("Quantisierung",
     "Modellgewichte mit weniger Präzision speichern, damit sie kleiner/schneller laufen.",
     "Macht Modelle auf normaler Hardware nutzbar, bei minimalem Qualitätsverlust.",
     ""),
    ("Distillation",
     "Ein kleines Modell lernt, ein großes nachzuahmen — kompakter bei ähnlicher Leistung.",
     "Wie ein gutes Kompakt-Modell, das vom „Lehrer“ abgeschaut hat.",
     ""),
    ("System-Prompt",
     "Eine versteckte Grund-Anweisung, die Rolle und Regeln des Modells vorgibt.",
     "Die Bühnenanweisung vor deinem eigentlichen Prompt.",
     ""),
    ("Prompt Injection",
     "Ein Angriff, bei dem manipulierter Text dem Modell heimlich neue Befehle unterschiebt.",
     "Sicherheitsrisiko, sobald KI fremde Inhalte (Webseiten, Mails) verarbeitet.",
     "Real und ungelöst. Gib Agenten keine sensiblen Rechte ohne Kontrolle."),
    ("Guardrails",
     "Regeln/Filter, die unerwünschte oder riskante Ausgaben verhindern sollen.",
     "Die Leitplanken — hilfreich, aber umgehbar.",
     ""),
    ("Benchmark",
     "Standard-Test, um Modelle zu vergleichen (z. B. Mathe-, Code-Aufgaben).",
     "Ranglisten-Punkte.",
     "Benchmarks werden „trainiert“ und gern gecherrypickt. Dein eigener Praxistest zählt mehr."),
    ("MCP (Model Context Protocol)",
     "Ein offener Standard, über den KI-Apps sicher an Tools und Datenquellen andocken.",
     "Eine Art USB-Anschluss zwischen KI und deinen Programmen.",
     ""),
    ("EU AI Act",
     "EU-Verordnung, die KI nach Risiko reguliert — mit Pflichten je nach Einsatz.",
     "Für die meisten kleinen Betriebe v. a.: Transparenz (kennzeichnen, dass KI im Spiel ist).",
     ""),
    ("Datenresidenz / DSGVO",
     "Wo deine Daten verarbeitet/gespeichert werden und nach welchem Datenschutzrecht.",
     "Für DACH wichtig: EU-Verarbeitung und „keine Trainingsnutzung“ möglichst vertraglich sichern.",
     "„DSGVO-konform“ auf der Anbieter-Seite reicht nicht — prüf Auftragsverarbeitung und Serverstandort."),
    ("AGI (Artificial General Intelligence)",
     "Hypothetische KI, die Menschen über praktisch alle Aufgaben hinweg ebenbürtig ist.",
     "Gibt es nicht. Heutige Modelle sind eng, auch wenn sie breit wirken.",
     "Das größte Hype-Wort. Für deinen Betrieb irrelevant — es zählt, was heute zuverlässig funktioniert."),
]


def e(s):
    return html.escape(s, quote=True)


def build():
    cards = []
    for term, defi, klar, hype in TERMS:
        hype_html = f'<p class="hype"><b>Hype-Check:</b> {e(hype)}</p>' if hype else ""
        cards.append(
            f'<article class="term" data-t="{e((term+" "+defi+" "+klar).lower())}">'
            f'<h2>{e(term)}</h2>'
            f'<p class="def">{e(defi)}</p>'
            f'<p class="klar"><b>Klartext:</b> {e(klar)}</p>'
            f'{hype_html}</article>'
        )
    ld = {
        "@context": "https://schema.org",
        "@type": "DefinedTermSet",
        "name": "Anti-Hype KI-Glossar",
        "url": "https://abannews.com/ki-glossar.html",
        "inLanguage": "de",
        "hasDefinedTerm": [
            {"@type": "DefinedTerm", "name": t, "description": d} for (t, d, _k, _h) in TERMS
        ],
    }
    return "\n".join(cards), json.dumps(ld, ensure_ascii=False)


CARDS, LD = build()

HTML = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KI-Glossar — {len(TERMS)} Begriffe ehrlich erklärt (ohne Hype) | aban news</title>
<meta name="description" content="Die wichtigsten KI-Begriffe auf Deutsch, ehrlich und knapp erklärt: LLM, Prompt, Token, Halluzination, RAG, Agent, EU AI Act und mehr. Mit Klartext und Hype-Check.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://abannews.com/ki-glossar.html">
<meta property="og:title" content="KI-Glossar — {len(TERMS)} Begriffe ehrlich erklärt">
<meta property="og:description" content="LLM, Token, Halluzination, RAG, Agent, EU AI Act … mit Klartext und Hype-Check.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://abannews.com/ki-glossar.html">
<meta property="og:image" content="https://abannews.com/og-tools.png">
<meta property="og:locale" content="de_DE"><meta property="og:site_name" content="aban news">
<meta name="theme-color" content="#d97706">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">{LD}</script>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
:root{{--amber:#d97706;--amber-dk:#b45309;--amber-lt:#fde9c8;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#ece3d4;--bg:#fffbf5;--card:#fff;--field:#fffdf9;--ok:#15803d}}
@media(prefers-color-scheme:dark){{:root{{--amber:#f0a93a;--amber-dk:#fbbf24;--amber-lt:#5a4422;--cream:#3a2f1c;--ink:#f3ede2;--ink2:#d6cdbd;--muted:#9c9384;--line:#3a352d;--bg:#1a1712;--card:#231f19;--field:#1f1b15}}}}
html{{scroll-behavior:smooth;-webkit-text-size-adjust:100%}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:var(--ink);background:var(--bg)}}
.wrap{{max-width:880px;margin:0 auto;padding:0 20px}}
a{{color:var(--amber-dk)}}
:focus-visible{{outline:3px solid var(--amber-dk);outline-offset:2px;border-radius:4px}}
header.site{{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}}
header.site .wrap{{display:flex;align-items:center;justify-content:space-between;padding:14px 20px}}
.brand{{font-weight:800;color:var(--amber);text-decoration:none}}
.btn{{display:inline-block;background:var(--amber-dk);color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:9px;font-size:.95rem}}
.btn.ghost{{background:transparent;color:var(--amber-dk);border:1px solid var(--amber-lt)}}
.hero{{padding:40px 0 6px;text-align:center}}
.hero h1{{font-size:clamp(26px,5vw,38px);font-weight:800;letter-spacing:-.02em;line-height:1.12;margin-bottom:12px}}
.hero h1 .a{{color:var(--amber)}}
.hero p{{font-size:clamp(15px,2.2vw,18px);color:var(--ink2);max-width:640px;margin:0 auto}}
.search{{width:100%;font:inherit;color:var(--ink);background:var(--field);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:24px 0 6px}}
.count{{color:var(--muted);font-size:.9rem;margin:0 2px 12px}}
.term{{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:16px 18px;margin-bottom:12px}}
.term h2{{font-size:1.18rem;margin-bottom:6px;color:var(--amber-dk)}}
.term .def{{color:var(--ink);margin-bottom:6px}}
.term .klar{{color:var(--ink2);font-size:.95rem;margin-bottom:6px}}
.term .hype{{color:var(--ink2);font-size:.92rem;background:var(--cream);border:1px solid var(--amber-lt);border-radius:9px;padding:8px 11px;margin-top:8px}}
.empty{{text-align:center;color:var(--muted);padding:24px}}
.band{{margin:30px 0;background:linear-gradient(135deg,var(--cream),var(--card));border:1px solid var(--amber-lt);border-radius:16px;padding:24px;text-align:center}}
.band h2{{font-size:1.25rem;margin-bottom:8px}}.band p{{color:var(--ink2);max-width:560px;margin:0 auto 14px}}
footer{{border-top:1px solid var(--line);margin-top:30px;padding:24px 0;font-size:.82rem;color:var(--muted)}}
footer a{{color:var(--muted)}}
</style>
</head>
<body>
<header class="site"><div class="wrap"><a href="/" class="brand">aban news</a>
<a href="/ki-werkzeug.html" class="btn ghost">Gratis KI-Werkzeug</a></div></header>
<main><div class="wrap">

  <section class="hero">
    <h1><span class="a">KI-Glossar</span> — ehrlich erklärt</h1>
    <p>Die wichtigsten KI-Begriffe auf Deutsch, knapp und ohne Hype. Mit „Klartext“ und — wo nötig — einem ehrlichen Hype-Check.</p>
    <p style="margin-top:14px"><a class="btn" href="/downloads/anti-hype-glossar.pdf" download>📄 Glossar als PDF (gratis)</a></p>
  </section>

  <input class="search" id="q" type="search" placeholder="Begriff suchen … (z. B. Halluzination, RAG, Agent)" aria-label="Begriff suchen">
  <p class="count" id="count"></p>
  <div id="list">
{CARDS}
  </div>
  <p class="empty" id="empty" hidden>Kein Begriff gefunden. Fehlt einer? <a href="https://abannews.beehiiv.com/subscribe">Sag's uns im Newsletter.</a></p>

  <div class="band">
    <h2>Begriffe verstehen ist die halbe Miete</h2>
    <p>Der aban-news-Newsletter erklärt KI Mo–Fr in 5 Minuten — ehrlich, ohne Buzzword-Bingo. Und das <a href="/ki-werkzeug.html">KI-Werkzeug</a> setzt es direkt in fertige Texte um.</p>
    <a class="btn" href="https://abannews.beehiiv.com/subscribe">Newsletter gratis abonnieren</a>
  </div>

</div></main>
<footer><div class="wrap">&copy; 2026 aban news &middot; Allen Chour &middot; Belp (CH) &middot;
  <a href="/ki-werkzeug.html">KI-Werkzeug</a> &middot; <a href="/welche-ki-fuer-was.html">Tool-Finder</a> &middot; <a href="/impressum.html">Impressum</a> &middot; <a href="/datenschutz.html">Datenschutz</a></div></footer>

<script>
(function(){{
  "use strict";
  var q=document.getElementById("q"), list=document.getElementById("list");
  var terms=[].slice.call(list.getElementsByClassName("term"));
  var count=document.getElementById("count"), empty=document.getElementById("empty");
  function run(){{
    var v=(q.value||"").trim().toLowerCase(), n=0;
    terms.forEach(function(t){{
      var hit = !v || t.getAttribute("data-t").indexOf(v)>-1;
      t.style.display = hit ? "" : "none"; if(hit) n++;
    }});
    count.textContent = n+" von "+terms.length+" Begriffen";
    empty.hidden = n>0;
  }}
  q.addEventListener("input", run); run();
}})();
</script>
<script defer src="/js/announce.js"></script>
</body>
</html>
"""

if __name__ == "__main__":
    with open(os.path.join(ROOT, "ki-glossar.html"), "w", encoding="utf-8") as f:
        f.write(HTML)
    print(f"✓ ki-glossar.html erzeugt ({len(TERMS)} Begriffe)")
