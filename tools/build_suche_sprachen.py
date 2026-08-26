#!/usr/bin/env python3
# =============================================================================
#  build_suche_sprachen.py — erzeugt die Suchseiten für en/ fr/ it/
# -----------------------------------------------------------------------------
#  Bis 2026-08-26 hatten die 1233 übersetzten Seiten GAR KEINE Suche: es gab nur
#  suchmaschine.html (deutsch). Wer auf /fr/ landete, konnte nichts finden.
#
#  Statt drei Kopien von Hand: diese Datei nimmt suchmaschine.html als Vorlage und
#  ersetzt gezielt die Oberflächen-Texte. Jede Ersetzung ist eine EXAKTE Zeichenkette
#  und wird geprüft (assert) — ändert jemand die deutsche Seite, bricht dieser Build
#  laut ab, statt drei stille Kopien veralten zu lassen. Genau das ist der Grund für
#  den Generator: drei handgepflegte Kopien driften garantiert auseinander.
#
#  Aufruf:  python3 tools/build_suche_sprachen.py
# =============================================================================

import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VORLAGE = os.path.join(ROOT, "suchmaschine.html")

SPRACHEN = {
    "en": {
        "datei": "en/search.html",
        "lang": "en",
        "titel": "Search — find anything on abannews.com | aban",
        "beschreibung": "Search all AI guides, tools and explainers on abannews.com. Fast full-text search, instant results.",
        "ogtitel": "aban search — find anything",
        "ogbeschreibung": "Fast full-text search across every AI guide and tool on abannews.com.",
        "logo": "-Search",
        "tagline": "Search every AI guide, tool and explainer on abannews.com.",
        "platzhalter": "What are you looking for? e.g. GDPR, laptop, prompt …",
        "knopf": "Search",
        "ariasuche": "Search term",
        "nav": [("/en/", "Home"), ("/en/branchen.html", "AI by industry"), ("/en/dossiers.html", "Dossiers")],
        "fussnote": "aban news · searching <span id=\"total\">…</span> pages · <a href=\"/en/\">Home</a> · <a href=\"/impressum.html\">Imprint</a>",
        "laden": "Loading index …",
        "treffer": "results for",
        "in": "in",
        "besten": "top",
        "nichts": "Nothing found for",
        "alle": "All",
        "syn": '{"artificial":["ai"],"intelligence":["ai"],"ki":["ai"]}',
        "zitat": ("\u201c", "\u201d"),
        "kat": {"ki": "AI guide", "kauf": "Buying guide", "vgl": "Comparison", "markt": "Market",
                "rechner": "Calculator", "tool": "Tool", "thema": "Topic", "spiel": "Game",
                "dossier": "Dossier", "hype": "Hype watch"},
    },
    "fr": {
        "datei": "fr/recherche.html",
        "lang": "fr",
        "titel": "Recherche — trouvez tout sur abannews.com | aban",
        "beschreibung": "Cherchez dans tous les guides IA, outils et explications d'abannews.com. Recherche plein texte rapide, résultats immédiats.",
        "ogtitel": "Recherche aban — trouvez tout",
        "ogbeschreibung": "Recherche plein texte rapide dans tous les guides IA et outils d'abannews.com.",
        "logo": "-Recherche",
        "tagline": "Cherchez dans tous les guides IA, outils et explications d'abannews.com.",
        "platzhalter": "Que cherchez-vous ? p. ex. RGPD, ordinateur, prompt …",
        "knopf": "Chercher",
        "ariasuche": "Terme de recherche",
        "nav": [("/fr/", "Accueil"), ("/fr/branchen.html", "L'IA par secteur")],
        "fussnote": "aban news · recherche dans <span id=\"total\">…</span> pages · <a href=\"/fr/\">Accueil</a> · <a href=\"/impressum.html\">Mentions légales</a>",
        "laden": "Chargement de l'index …",
        "treffer": "résultats pour",
        "in": "dans",
        "besten": "les meilleurs",
        "nichts": "Aucun résultat pour",
        "alle": "Tout",
        "syn": '{"intelligence":["ia"],"artificielle":["ia"],"ki":["ia"],"ai":["ia"]}',
        "zitat": ("\u00ab\u202f", "\u202f\u00bb"),
        "kat": {"ki": "Guide IA", "kauf": "Guide d'achat", "vgl": "Comparatif", "markt": "Marché",
                "rechner": "Calculateur", "tool": "Outil", "thema": "Thème", "spiel": "Jeu",
                "dossier": "Dossier", "hype": "Hype watch"},
    },
    "it": {
        "datei": "it/ricerca.html",
        "lang": "it",
        "titel": "Ricerca — trova tutto su abannews.com | aban",
        "beschreibung": "Cerca in tutte le guide IA, gli strumenti e le spiegazioni di abannews.com. Ricerca full-text veloce, risultati immediati.",
        "ogtitel": "Ricerca aban — trova tutto",
        "ogbeschreibung": "Ricerca full-text veloce in tutte le guide IA e gli strumenti di abannews.com.",
        "logo": "-Ricerca",
        "tagline": "Cerca in tutte le guide IA, gli strumenti e le spiegazioni di abannews.com.",
        "platzhalter": "Cosa cerchi? p. es. GDPR, computer, prompt …",
        "knopf": "Cerca",
        "ariasuche": "Termine di ricerca",
        "nav": [("/it/", "Home"), ("/it/branchen.html", "L'IA per settore")],
        "fussnote": "aban news · cerca in <span id=\"total\">…</span> pagine · <a href=\"/it/\">Home</a> · <a href=\"/impressum.html\">Note legali</a>",
        "laden": "Caricamento indice …",
        "treffer": "risultati per",
        "in": "in",
        "besten": "i migliori",
        "nichts": "Nessun risultato per",
        "alle": "Tutto",
        "syn": '{"intelligenza":["ia"],"artificiale":["ia"],"ki":["ia"],"ai":["ia"]}',
        "zitat": ("\u00ab", "\u00bb"),
        "kat": {"ki": "Guida IA", "kauf": "Guida all'acquisto", "vgl": "Confronto", "markt": "Mercato",
                "rechner": "Calcolatore", "tool": "Strumento", "thema": "Tema", "spiel": "Gioco",
                "dossier": "Dossier", "hype": "Hype watch"},
    },
}

# Sprachumschalter oben rechts — jede Seite zeigt die jeweils anderen drei.
ALLE = [("de", "/suchmaschine.html", "DE"), ("en", "/en/search.html", "EN"),
        ("fr", "/fr/recherche.html", "FR"), ("it", "/it/ricerca.html", "IT")]


def ersetze(html, alt, neu, wo):
    """Exakte Ersetzung mit Kontrolle — schlägt laut fehl, wenn die Vorlage sich ändert."""
    if html.count(alt) != 1:
        raise SystemExit(f"✖ Vorlage geändert: „{wo}“ kommt {html.count(alt)}× vor "
                         f"(erwartet 1×). suchmaschine.html und dieses Skript abgleichen.")
    return html.replace(alt, neu, 1)


def baue(code, cfg, vorlage):
    h = vorlage
    h = ersetze(h, '<html lang="de">', f'<html lang="{cfg["lang"]}">', "html lang")
    h = ersetze(h, "<title>Suche — alle Inhalte von abannews.com durchsuchen | aban</title>",
                f"<title>{cfg['titel']}</title>", "title")
    h = ersetze(h, '<meta name="description" content="Durchsuche alle Inhalte von abannews.com: '
                   'KI-Ratgeber, Tools, Kaufberater und mehr. Schnelle Volltextsuche, sofort Ergebnisse '
                   '— plus Marktplatz-Suche für Jobs, Angebote &amp; Inserate.">',
                f'<meta name="description" content="{cfg["beschreibung"]}">', "meta description")
    # hreflang wie auf den übrigen Seiten des Hauses — sonst hält Google die vier
    # Suchseiten für Dubletten statt für Sprachfassungen derselben Seite.
    # Die hreflang-Zeilen der Vorlage nennen bereits alle vier Sprachfassungen und
    # gelten unveraendert — nur das canonical zeigt je Sprache auf die eigene Seite.
    h = ersetze(h, '<link rel="canonical" href="https://abannews.com/suchmaschine.html">',
                f'<link rel="canonical" href="https://abannews.com/{cfg["datei"]}">', "canonical")
    h = ersetze(h, '<meta property="og:title" content="aban-Suche — alle Inhalte durchsuchen">',
                f'<meta property="og:title" content="{cfg["ogtitel"]}">', "og:title")
    h = ersetze(h, '<meta property="og:description" content="Schnelle Volltextsuche über alle Ratgeber, '
                   'Tools und Kaufberater von abannews.com.">',
                f'<meta property="og:description" content="{cfg["ogbeschreibung"]}">', "og:description")
    # Kopfzeile: Navigation der Sprache + Sprachumschalter
    nav = "".join(f'<a href="{u}">{t}</a>' for u, t in cfg["nav"])
    nav += "".join(f'<a href="{u}">{t}</a>' for c, u, t in ALLE if c != code)
    h = ersetze(h, '<span class="lnk"><a href="/marktplatz.html">Marktplatz</a>'
                   '<a href="/suche.html">Angebote &amp; Jobs</a><a href="/">Newsletter</a>'
                   '<a href="/en/search.html">EN</a><a href="/fr/recherche.html">FR</a>'
                   '<a href="/it/ricerca.html">IT</a></span>',
                f'<span class="lnk">{nav}</span>', "Navigation")
    h = ersetze(h, '<a class="brand" href="/">aban</a>', f'<a class="brand" href="/{code}/">aban</a>', "Marke")
    h = ersetze(h, '<span class="n">-Suche</span>', f'<span class="n">{cfg["logo"]}</span>', "Logo")
    h = ersetze(h, "Durchsuche alle Ratgeber, KI-Tools und Kaufberater von abannews.com.",
                cfg["tagline"], "Tagline")
    h = ersetze(h, 'placeholder="Wonach suchst du? z. B. DSGVO, Laptop, Prompt, Velo …" aria-label="Suchbegriff"',
                f'placeholder="{cfg["platzhalter"]}" aria-label="{cfg["ariasuche"]}"', "Eingabefeld")
    h = ersetze(h, '<button id="go" type="submit">Suchen</button>',
                f'<button id="go" type="submit">{cfg["knopf"]}</button>', "Knopf")
    # Marktplatz gibt es nur auf Deutsch -> Hinweiszeile entfällt in den Sprachen.
    h = ersetze(h, '  <p class="hint">Produkte, Jobs &amp; Inserate? → <a href="/suche.html">Marktplatz-Suche</a></p>\n',
                "", "Marktplatz-Hinweis")
    h = ersetze(h, '<footer>aban news · durchsucht <span id="total">…</span> eigene Seiten · '
                   '<a href="/">Start</a> · <a href="/impressum.html">Impressum</a></footer>',
                f'<footer>{cfg["fussnote"]}</footer>', "Fusszeile")
    # --- Oberflächentexte im Skript ---
    kat = ",".join(f'{k}:"{v}"' for k, v in cfg["kat"].items())
    h = ersetze(h, 'var KAT={ki:"KI-Guide",kauf:"Kaufberater",vgl:"Vergleich",markt:"Markt",rechner:"Rechner",\n'
                   '           tool:"Werkzeug",thema:"Thema",spiel:"Spiel",dossier:"Dossier",hype:"Hype-Watch"};',
                f"var KAT={{{kat}}};", "Kategorien")
    h = ersetze(h, 'var SYN={"künstliche":["ki"],"kuenstliche":["ki"],"intelligenz":["ki"],"artificial":["ai"],\n'
                   '           "intelligence":["ai"]};',
                f'var SYN={cfg["syn"]};', "Synonyme")
    h = ersetze(h, 'cnt.textContent="Lade Index …"', f'cnt.textContent="{cfg["laden"]}"', "Ladehinweis")
    h = ersetze(h, '\'">Alle <span class="n">\'', f'\'">{cfg["alle"]} <span class="n">\'', "Chip Alle")
    h = ersetze(h, 'cnt.textContent=ges?(ges+" Treffer für „"+q+"“"+(filter?" in "+KAT[filter]:"")\n'
                   '      +(ges>hits.length?" · die besten "+hits.length:"")):"";',
                f'cnt.textContent=ges?(ges+" {cfg["treffer"]} {cfg["zitat"][0]}"+q+"{cfg["zitat"][1]}"+(filter?" {cfg["in"]} "+KAT[filter]:"")\n'
                f'      +(ges>hits.length?" · {cfg["besten"]} "+hits.length:"")):"";', "Trefferzeile")
    h = ersetze(h, '\'<div class="empty">Nichts gefunden für „\'+esc(q)+\'“.<br>Vielleicht im '
                   '<a href="/suche.html?q=\'+encodeURIComponent(q)+\'">Marktplatz</a> suchen?</div>\'',
                f'\'<div class="empty">{cfg["nichts"]} {cfg["zitat"][0]}\'+esc(q)+\'{cfg["zitat"][1]}.</div>\'', "Leermeldung")
    h = ersetze(h, 'fetch("/data/site-index.json")', f'fetch("/data/site-index-{code}.json")', "Index-Quelle")
    return h


def main():
    vorlage = open(VORLAGE, encoding="utf-8").read()
    for code, cfg in SPRACHEN.items():
        html = baue(code, cfg, vorlage)
        ziel = os.path.join(ROOT, cfg["datei"])
        os.makedirs(os.path.dirname(ziel), exist_ok=True)
        open(ziel, "w", encoding="utf-8").write(html)
        print(f"✔ {cfg['datei']}  ({len(html)/1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
