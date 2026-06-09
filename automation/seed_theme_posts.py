#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — kuratierte Themen-Posts in die LinkedIn-Queue einspeisen.

Hängt evergreen Posts in aban-Stimme (anti-hype, ehrlich, du-Form) an
social/linkedin_queue.json an — idempotent über id-Präfix 'aban-theme-'.
Branchen-Posts werden nur aufgenommen, wenn die verlinkte Seite lokal existiert.
KEINE erfundenen Zahlen/Studien. Reine stdlib. Aufruf: python3 automation/seed_theme_posts.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(ROOT, "social", "linkedin_queue.json")
HASH = "#KI #DACH #Newsletter #abannews"
PREFIX = "aban-theme-"

# (slug, text_ohne_hash, optional lokale Datei die existieren muss)
POSTS = [
    ("mythos-job",
     "„KI nimmt dir den Job weg.“ — Der ehrlichste Satz dazu, den ich kenne:\n\n"
     "Nicht die KI nimmt dir den Job. Sondern jemand, der KI sinnvoll einsetzt — und du nicht.\n\n"
     "Die gute Nachricht: „sinnvoll einsetzen“ heißt nicht Informatik studieren. Es heißt: zwei, "
     "drei Aufgaben finden, die KI dir wirklich abnimmt. Den Rest lässt du.\n\n"
     "Wo du anfängst, zeigen wir ohne Hype → https://abannews.com", None),

    ("mythos-teuer",
     "Mythos: „Für KI brauchst du teure Tools.“\n\n"
     "Stimmt selten. Die meisten kleinen Betriebe holen den Großteil des Nutzens aus den "
     "Gratis-Versionen — E-Mails, Texte, Zusammenfassungen, Ideen.\n\n"
     "Bevor du ein Abo abschließt: probier's kostenlos. Wir haben über 175 Tools ehrlich verglichen, "
     "inklusive „lohnt sich der Aufpreis?“ → https://abannews.com/welche-ki-fuer-was.html", "welche-ki-fuer-was.html"),

    ("halluzination",
     "ChatGPT klingt immer überzeugt — auch wenn es Unsinn erzählt.\n\n"
     "Das nennt man „halluzinieren“: Die KI erfindet Fakten, Quellen und Zahlen und verkauft sie "
     "selbstbewusst.\n\n"
     "Deshalb gilt: KI ist ein super Entwurfs-Helfer, aber ein schlechter Faktenchecker. "
     "Wichtiges immer gegenprüfen.\n\n"
     "Mehr KI-Begriffe in Klartext → https://abannews.com/ki-glossar.html", "ki-glossar.html"),

    ("bias",
     "„Die KI ist doch objektiv.“ — Leider nein.\n\n"
     "KI lernt aus Texten von Menschen. Und übernimmt deren Vorurteile gleich mit. Bei Bewerbungen, "
     "Bewertungen oder Empfehlungen kann das richtig schiefgehen.\n\n"
     "Heißt nicht: Finger weg. Heißt: bei heiklen Entscheidungen nie blind übernehmen.\n\n"
     "KI ohne Hype, jeden Werktag → https://abannews.com", None),

    ("hype-tool",
     "Jede Woche ein neues „revolutionäres“ KI-Tool. Jede Woche FOMO.\n\n"
     "Ehrliche Wahrheit: Die wenigsten davon brauchst du. Ein, zwei solide Werkzeuge, die du "
     "wirklich benutzt, schlagen zehn, die du nur abonniert hast.\n\n"
     "Wir testen, du sparst dir das Hinterherrennen → https://abannews.com/welche-ki-fuer-was.html", "welche-ki-fuer-was.html"),

    ("strategie",
     "Du brauchst keine 40-seitige „KI-Strategie“.\n\n"
     "Du brauchst eine Antwort auf: Welche eine nervige Aufgabe diese Woche nimmt mir KI ab?\n\n"
     "Fang da an. Nächste Woche die nächste. Das ist die ganze Strategie.\n\n"
     "Konkrete Starthilfe (gratis, ohne Login) → https://abannews.com/ki-werkzeug.html", "ki-werkzeug.html"),

    ("email-quickwin",
     "Der schnellste KI-Zeitgewinn für die meisten: E-Mails.\n\n"
     "Stichpunkte rein, höflicher Entwurf raus, du feilst nur noch nach. Aus 10 Minuten werden 2.\n\n"
     "Kein Tool-Studium nötig — einfach mal ausprobieren. So geht's → https://abannews.com/ki-werkzeug.html", "ki-werkzeug.html"),

    ("prompt-beispiel",
     "Der unterschätzteste Prompt-Trick: Beispiele statt Anweisungen.\n\n"
     "Statt „schreib professionell“ gib der KI EINEN Beispieltext, der dir gefällt. Sie ahmt Ton "
     "und Stil nach — viel besser als jede Beschreibung.\n\n"
     "Mehr erprobte Prompts → https://abannews.com/prompt-baukasten.html", "prompt-baukasten.html"),

    ("dsgvo",
     "Bevor du Kundendaten in ChatGPT kippst: kurz innehalten.\n\n"
     "Namen, Adressen, Gesundheits- oder Vertragsdaten gehören nicht ungefiltert in ein KI-Tool — "
     "die DSGVO lässt grüßen. Anonymisieren oder ein Tool mit EU-Serverstandort nutzen.\n\n"
     "Schneller Selbstcheck → https://abannews.com/ki-dsgvo-check.html", "ki-dsgvo-check.html"),

    ("affiliate",
     "Eine Sache, die uns von vielen KI-Seiten unterscheidet: Wir verlinken keine Affiliate-Deals.\n\n"
     "Heißt: Wenn wir sagen „das Gratis-Tool reicht“, verdienen wir nichts daran. Genau so soll's "
     "sein. Ehrliche Empfehlung schlägt Provision.\n\n"
     "Über 175 Tools so bewertet → https://abannews.com/welche-ki-fuer-was.html", "welche-ki-fuer-was.html"),

    ("warum-newsletter",
     "„Noch ein KI-Newsletter? Echt jetzt?“\n\n"
     "Verständlich. Unser Unterschied: 5 Minuten, Klartext, kein Hype, kein Verkaufen um jeden "
     "Preis. Wenn ein Hype-Thema heiße Luft ist, schreiben wir das auch.\n\n"
     "Wenn das dein Ding ist → gratis abonnieren: https://abannews.com", None),

    ("frage-engagement",
     "Ehrliche Frage in die Runde: Was nervt dich am meisten am ganzen KI-Hype?\n\n"
     "Die Buzzwords? Die Heilsversprechen? Das Gefühl, etwas zu verpassen?\n\n"
     "Schreib's in die Kommentare — ich lese mit. Die besten Punkte greifen wir im Newsletter auf.\n\n"
     "https://abannews.com", None),

    ("aerzte",
     "KI in der Arztpraxis — ohne Datenschutz-Albtraum.\n\n"
     "Arztbriefe vordiktieren, Befunde zusammenfassen, Termin-Mails formulieren: Da spart KI echt "
     "Zeit. Aber Patientendaten brauchen Sorgfalt.\n\n"
     "Was konkret geht (und was nicht) → https://abannews.com/ki-fuer-aerzte.html", "ki-fuer-aerzte.html"),

    ("anwaelte",
     "KI für Kanzleien: nützlicher Entwurfs-Helfer, gefährlicher Faktenchecker.\n\n"
     "Schriftsätze vorstrukturieren, Mandanten-Mails entwerfen — top. Rechtsprechung „mal eben“ von "
     "der KI zitieren lassen — riskant (sie erfindet Urteile).\n\n"
     "Ehrlicher Leitfaden → https://abannews.com/ki-fuer-anwaelte.html", "ki-fuer-anwaelte.html"),

    ("baeckereien",
     "KI fürs Handwerk und kleine Betriebe — ja, auch für die Bäckerei.\n\n"
     "Social-Posts, Angebotstexte, Antworten auf Bewertungen: Genau das nimmt KI dir ab, ohne dass "
     "du Technik-Nerd sein musst.\n\n"
     "Konkrete Beispiele → https://abannews.com/ki-fuer-baeckereien.html", "ki-fuer-baeckereien.html"),

    # --- Welle 2: neue Inhalte bewerben (Vergleiche, Glossar, Tools) ---
    ("chatgpt-vs-perplexity",
     "ChatGPT oder Perplexity? Kommt drauf an, was du brauchst.\n\n"
     "Für Recherche mit Quellen: Perplexity (zeigt, woher die Antwort kommt). Fürs Schreiben und "
     "Brainstormen: ChatGPT. Kein Tool ist „besser“ — sie sind für Verschiedenes gebaut.\n\n"
     "Ehrlicher Vergleich (Score, Preis, DSGVO, Urteil) → "
     "https://abannews.com/vergleich/chatgpt-vs-perplexity.html", "vergleich/chatgpt-vs-perplexity.html"),

    ("gemini-vs-perplexity",
     "Gemini oder Perplexity für die Suche?\n\n"
     "Perplexity ist auf Recherche-mit-Quellen spezialisiert. Gemini kann mehr drumherum "
     "(Google-Integration, Multimodales), ist aber breiter. Für reine Quellen-Recherche meist Perplexity.\n\n"
     "Voller Vergleich → https://abannews.com/vergleich/gemini-vs-perplexity.html",
     "vergleich/gemini-vs-perplexity.html"),

    ("vibe-coding",
     "„Vibe Coding“ — das neue Hype-Wort. Kurz und ehrlich:\n\n"
     "Du sagst der KI in normaler Sprache, was du willst, und liest den Code kaum noch selbst. "
     "Super für schnelle Prototypen.\n\n"
     "Für Produktives riskant: Fehler und Sicherheitslücken merkst du oft erst spät. "
     "„Jeder kann jetzt programmieren“ stimmt nur halb.\n\n"
     "Mehr Begriffe ohne Hype → https://abannews.com/ki-glossar.html", "ki-glossar.html"),

    ("deepfake-chef",
     "Der gefährlichste KI-Betrug gerade: der falsche „Chef-Anruf“.\n\n"
     "Stimmen lassen sich heute überzeugend nachbauen (Deepfake). Jemand ruft an, klingt wie dein Chef, "
     "will eine dringende Überweisung.\n\n"
     "Eine simple Regel schützt: bei Geld-Themen IMMER zurückrufen — über die echte Nummer, nicht die "
     "im Anruf.\n\nKI-Begriffe in Klartext → https://abannews.com/ki-glossar.html", "ki-glossar.html"),

    ("chain-of-thought",
     "Warum „Reasoning“-Modelle bei Mathe besser sind — in einem Satz:\n\n"
     "Sie schreiben den Rechenweg mit (Chain-of-Thought), statt sofort zu raten. Mehr Zwischenschritte "
     "= höhere Trefferquote.\n\n"
     "Aber: „die KI denkt nach“ ist ein Bild, keine Tatsache. Sie erzeugt nur mehr Zwischen-Text.\n\n"
     "KI ehrlich erklärt → https://abannews.com/ki-glossar.html", "ki-glossar.html"),

    ("hype-score-challenge",
     "Kleines Experiment: Nimm die letzte „KI-Lösung“, die dir jemand verkaufen wollte, und jag den "
     "Werbetext durch den Hype-Detektor.\n\n"
     "Über 60/100? Dann steckt meist wenig dahinter.\n\n"
     "Probier's (kein Login, dein Text bleibt bei dir) → https://abannews.com/ki-hype-detektor.html",
     "ki-hype-detektor.html"),

    ("prompt-rolle",
     "Ein Prompt-Trick, der sofort bessere Texte bringt:\n\n"
     "Gib der KI eine Rolle UND ein Ziel UND die Zielgruppe. Statt „schreib eine Mail“ → "
     "„Du bist Kundenservice. Schreib eine freundliche Entschuldigungs-Mail an einen verärgerten "
     "Stammkunden.“\n\nMehr erprobte Prompts → https://abannews.com/prompt-baukasten.html",
     "prompt-baukasten.html"),

    ("kosten-realitaet",
     "„KI spart sofort Geld“ — die ehrliche Version:\n\n"
     "Erst kostet sie dich Zeit (Lernen, Ausprobieren, Prüfen). Der Spareffekt kommt nach ein paar "
     "Wochen, wenn die Routinen sitzen.\n\n"
     "Wer das weiß, gibt nicht nach Tag 2 frustriert auf.\n\n"
     "Was KI realistisch spart → https://abannews.com/ki-spar-rechner.html", "ki-spar-rechner.html"),

    ("readiness",
     "Bevor du in KI investierst: 7 ehrliche Fragen.\n\n"
     "Nicht „welches Tool“, sondern „bin ich überhaupt bereit?“ — Datenordnung, klare Aufgaben, "
     "Team-Buy-in. Da scheitert's öfter als an der Technik.\n\n"
     "Kostenloser Readiness-Check → https://abannews.com/ki-readiness-check.html", "ki-readiness-check.html"),

    ("tool-zuviel",
     "Du brauchst nicht 12 KI-Tools. Du brauchst 2, die du wirklich benutzt.\n\n"
     "Die meisten Abos liegen brach. Lieber eins richtig lernen als zehn halb.\n\n"
     "Welches für welche Aufgabe? Ehrlich sortiert, kein Affiliate → "
     "https://abannews.com/welche-ki-fuer-was.html", "welche-ki-fuer-was.html"),
]


def main():
    q = json.load(open(QUEUE, encoding="utf-8"))
    have = {str(it.get("id", "")) for it in q}
    added = skipped = missing = 0
    for slug, text, need in POSTS:
        if need and not os.path.exists(os.path.join(ROOT, need)):
            print(f"  ⚠ überspringe {slug}: Zielseite {need} fehlt")
            missing += 1
            continue
        pid = PREFIX + slug
        if pid in have:
            skipped += 1
            continue
        q.append({"id": pid, "status": "ready", "text": f"{text}\n\n{HASH}"})
        added += 1
    json.dump(q, open(QUEUE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(QUEUE, "a", encoding="utf-8").write("\n")
    print(f"✓ {added} neu, {skipped} schon vorhanden, {missing} ohne Zielseite → {len(q)} gesamt in der Queue")


if __name__ == "__main__":
    main()
