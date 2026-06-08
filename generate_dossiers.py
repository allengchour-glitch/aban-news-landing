#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_dossiers.py — Themen-Dossiers aus echten Newsletter-Ausgaben.

Bündelt die realen Ausgaben aus archive/index.html (kuratierte Quelle der Wahrheit:
data-topics/kind/preview) zu vertieften Dauer-Seiten je Thema. ERFINDET KEINE FAKTEN —
nutzt nur, was in den Ausgaben steht; die Dossier-Intros sind ehrliche Theme-Rahmen.

Erzeugt:
  dossiers.html                      — Übersicht aller Dossiers
  dossier/<slug>.html                — je Thema eine In-Depth-Leseroute
  archive/topics.json                — Themen-Map für den Reader (verwandte Ausgaben)
  og-dossiers.png, og-dossier-<slug>.png

Run:  python3 generate_dossiers.py
"""
import glob
import html as _html
import json
import os
import re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
A, AD, CR, INK, MU, BG = (217,119,6),(180,83,9),(254,243,199),(31,41,55),(107,114,128),(255,251,245)

# --- Dossier-Definitionen (Cluster über vorhandene data-topics) --------------
DOSSIERS = [
    {"slug": "ki-werkzeugkasten", "emoji": "🧰",
     "title": "Der KI-Werkzeugkasten",
     "sub": "Jeden Freitag ein ehrlicher Tool-Test — hier gebündelt zur Leseroute.",
     "blurb": "Welche KI-Tools sich wirklich lohnen — und welche nur gut klingen. Diese Ausgaben "
              "nehmen Werkzeuge in der Praxis auseinander: was bleibt, was fliegt, was du dir sparen kannst. "
              "Ehrlich getestet, mit Datenschutz-Blick für den DACH-Raum.",
     "topics": {"werkzeugkasten", "tool-test"}},
    {"slug": "ki-datenschutz-dach", "emoji": "🔒",
     "title": "KI & Datenschutz im DACH-Raum",
     "sub": "DSGVO, EU AI Act und was das praktisch für deine Arbeit heißt.",
     "blurb": "KI nutzen, ohne sich rechtlich zu verheddern: Diese Ausgaben ordnen Datenschutz, EU-Regulierung "
              "und DACH-spezifische Fragen ein — praxisnah, ohne Panik und ohne Hype. Keine Rechtsberatung, "
              "aber die richtige Sortierung, bevor du Tools im Betrieb einsetzt.",
     "topics": {"datenschutz", "dach"}},
    {"slug": "ki-prompts-die-funktionieren", "emoji": "💡",
     "title": "Prompts, die wirklich funktionieren",
     "sub": "Erprobte Prompts und Arbeitsweisen — zum Kopieren und Anpassen.",
     "blurb": "Kein Prompt-Voodoo, sondern was im Alltag echte Zeit spart. Diese Ausgaben sammeln erprobte "
              "Prompts und Arbeitsweisen für Texte, Recherche und Routine — direkt übernehmbar.",
     "topics": {"prompts"}},
    {"slug": "anti-hype-reality-checks", "emoji": "🔍",
     "title": "Anti-Hype & Reality-Checks",
     "sub": "Was die Schlagzeile verspricht — und was davon stimmt.",
     "blurb": "Die Signatur von aban news: KI-Behauptungen gegen die Realität halten. Diese Ausgaben trennen "
              "Substanz von Marketing — damit du Entscheidungen auf Fakten triffst, nicht auf LinkedIn-Lärm.",
     "topics": {"anti-hype", "news-recap"}},
    {"slug": "ki-modelle-vergleich", "emoji": "🤖",
     "title": "KI-Modelle & Anbieter im Vergleich",
     "sub": "Claude, Mistral, Aleph Alpha & Co. — wer was wirklich kann.",
     "blurb": "Der Modell-Markt sortiert sich ständig neu: China drückt die Preise, Mistral und Aleph Alpha "
              "bringen das EU-Argument, die US-Anbieter ziehen nach. Diese Ausgaben ordnen ein, wer wofür taugt — "
              "damit du nach Eignung wählst, nicht nach Schlagzeile.",
     "topics": set(),
     "keywords": ["china", "mistral", "sonnet", "claude", "aleph", "openai", "gpt-"]},
    {"slug": "ki-fuer-selbststaendige", "emoji": "🚀",
     "title": "KI für Selbstständige",
     "sub": "Als Ein-Personen-Team mehr schaffen — ohne dich zu ersetzen.",
     "blurb": "KI ist für Solo-Selbstständige und kleine Teams ein Hebel — bei Akquise, Mail, Admin und Routine. "
              "Diese Ausgaben zeigen konkrete Workflows aus der Praxis (mit DACH-Datenschutz-Blick), wo KI dir "
              "Arbeit abnimmt und wo sie es eben nicht tut.",
     "topics": set(),
     "keywords": ["selbstständ", "selbstst-nd", "solopreneur", "mail-stack", "leadgen", "mitarbeiter"]},
    {"slug": "tool-duelle-vergleiche", "emoji": "🥊",
     "title": "Tool-Duelle — A gegen B",
     "sub": "Direkte Vergleiche über Tage und Wochen — welches Tool wirklich gewinnt.",
     "blurb": "Nicht ein Tool vorgestellt, sondern zwei im echten Einsatz gegeneinander. Diese Ausgaben "
              "tauschen Werkzeuge tagelang, vergleichen ehrlich und sagen, welches bleibt — damit du nicht "
              "selbst beide abonnieren musst, um es herauszufinden.",
     "topics": set(),
     "keywords": [" vs. ", "selbsttest", "getauscht", "notes-app", "deepl write", "loops.so"]},
]

# --- Deep-Dives (von aban selbst verfasst: immergültige Analyse/Frameworks, ----
#     KEINE erfundenen News/Zahlen/Zitate — ehrlich & anti-hype) -----------------
DEEPDIVES = {
"ki-werkzeugkasten": """
<h2>In der Tiefe: Wie du KI-Tools ehrlich bewertest</h2>
<p>Es erscheinen mehr KI-Tools, als ein Mensch je testen kann — und täglich kommen welche dazu. Das Ziel ist deshalb nicht, alle zu kennen, sondern die zwei, drei zu finden, die deine Arbeit <em>messbar</em> besser machen. Alles andere ist gut gemachte Ablenkung. Genau dafür gibt es den Werkzeugkasten: nicht „schau, was es Neues gibt", sondern „lohnt sich das für dich".</p>
<h3>Die fünf Fragen vor jedem Abo</h3>
<ul>
<li><strong>Löst es ein echtes Problem von mir?</strong> Nicht „ist es beeindruckend", sondern „nervt mich diese Aufgabe regelmäßig genug, dass eine Lösung sich lohnt".</li>
<li><strong>Spart es mehr Zeit, als es kostet?</strong> Einrichtung, Einarbeitung und das tägliche Hin-und-Her zählen mit. Ein Tool, das fünf Minuten spart, aber zehn Minuten Verwaltung braucht, ist ein Minusgeschäft.</li>
<li><strong>Wo liegen meine Daten?</strong> Hosting-Standort, Auftragsverarbeitung, was mit deinen Eingaben passiert. Für den DACH-Raum ist das kein Detail, sondern oft die K.-o.-Frage.</li>
<li><strong>Wie groß ist der Lock-in?</strong> Was passiert, wenn der Anbieter zumacht, den Preis verdoppelt oder die Funktion streicht, von der du abhängst? Je leichter du wieder raus kommst, desto sicherer das Abo.</li>
<li><strong>Kann ein Tool, das ich schon habe, das „gut genug"?</strong> Die ehrlichste Ersparnis ist das Abo, das du gar nicht erst abschließt.</li>
</ul>
<h3>Der ehrliche 14-Tage-Test</h3>
<p>Teste nie an der Hochglanz-Demo, sondern an einem echten, langweiligen Projekt aus deinem Alltag. Führe es zwei Wochen <em>parallel</em> zu deiner bisherigen Methode und notiere zwei Dinge: Wo hat es wirklich Zeit gespart? Und wo musstest du nacharbeiten, weil das Ergebnis nicht getaugt hat? Nach 14 Tagen entscheidet diese Notiz — nicht das Bauchgefühl direkt nach dem ersten „Wow".</p>
<h3>Der teuerste Fehler: der Abo-Friedhof</h3>
<p>Die meisten zahlen nicht zu wenig für Tools, sondern zu viel für Tools, die sie nicht benutzen. Ein Werkzeug, das du täglich anfasst, schlägt zehn, die du „mal ausprobiert" hast. Räum einmal im Quartal auf: Was hast du in den letzten vier Wochen wirklich geöffnet? Der Rest fliegt.</p>
<div class="dd-note"><strong>Faustregel:</strong> Erst der Arbeitsablauf, dann das Tool. Wer mit dem Tool anfängt und danach den Ablauf sucht, baut sich Arbeit, die er vorher nicht hatte.</div>
""",
"ki-datenschutz-dach": """
<h2>In der Tiefe: KI nutzen, ohne dich rechtlich zu verheddern</h2>
<p>Im DACH-Raum scheitert der KI-Einsatz selten an der Technik und oft an der Unsicherheit: „Darf ich das überhaupt?" Die gute Nachricht — die wichtigsten Leitplanken passen auf eine Seite. Die ehrliche Nachricht — sie ersetzen keine Rechtsberatung, aber sie verhindern die teuren Anfängerfehler.</p>
<h3>Was nie in ein öffentliches KI-Tool gehört</h3>
<ul>
<li>Klar- und Personennamen von Kund:innen, Patient:innen oder Mandant:innen</li>
<li>Vertrags- und Angebotsinhalte, Beträge, interne Kalkulationen</li>
<li>Gesundheits-, Finanz- und andere besonders geschützte Daten</li>
<li>Zugangsdaten, Schlüssel, alles aus Passwort-Managern</li>
</ul>
<p>Die einfache Regel: Würdest du es einer fremden Dienstleistungsfirma im Ausland ungefragt zumailen? Wenn nein, gehört es auch nicht ungeprüft in ein KI-Tool.</p>
<h3>Drei Begriffe, die du kennen solltest</h3>
<ul>
<li><strong>Auftragsverarbeitung (AVV):</strong> Wenn ein Tool für dich personenbezogene Daten verarbeitet, brauchst du in der Regel einen Vertrag dazu. Seriöse Anbieter stellen ihn bereit — fehlt er, ist das ein Warnsignal.</li>
<li><strong>Drittlandtransfer:</strong> Wo stehen die Server? Verlassen deine Daten die EU/den EWR, gelten zusätzliche Anforderungen. Der Hosting-Standort steht oft kleingedruckt — lies ihn.</li>
<li><strong>EU AI Act, in einfacher Sprache:</strong> Anwendungen werden nach Risiko sortiert. Das meiste, was Solo-Selbstständige tun (Texte entwerfen, zusammenfassen), ist gering reguliert — aber Transparenz („das hat KI erstellt", wo nötig) und der Datenschutz darunter bleiben deine Pflicht.</li>
</ul>
<h3>Pre-Flight-Checkliste vor dem Einsatz</h3>
<ul>
<li>☐ Welche Daten gebe ich konkret ein — und sind sensible dabei?</li>
<li>☐ Gibt es eine AVV, und habe ich sie?</li>
<li>☐ Wo wird verarbeitet (EU oder Drittland)?</li>
<li>☐ Kann ich die Eingaben anonymisieren/pseudonymisieren, ohne dass das Ergebnis leidet?</li>
<li>☐ Weiß mein Team, was rein darf und was nicht (eine Seite Richtlinie reicht)?</li>
</ul>
<div class="dd-note"><strong>Kein Ersatz für Rechtsberatung.</strong> Bei sensiblen Branchen (Heilberufe, Recht, Steuer) im Zweifel fachkundig prüfen lassen — die Compliance-Pakete von aban news geben dir einen sauberen Startpunkt, aber die Verantwortung bleibt bei dir.</div>
""",
"ki-prompts-die-funktionieren": """
<h2>In der Tiefe: Warum die meisten Prompt-Tipps nichts bringen</h2>
<p>„Du bist ein erfahrener Experte für …" — solche Zauberformeln machen selten den Unterschied. Was ein Ergebnis wirklich besser macht, ist nicht das Magie-Wort am Anfang, sondern <em>Struktur</em> und <em>Iteration</em>. Ein guter Prompt ist kein Spruch, sondern ein klarer Auftrag.</p>
<h3>Die Anatomie eines Prompts, der funktioniert</h3>
<ul>
<li><strong>Rolle &amp; Ziel:</strong> Aus welcher Perspektive, mit welchem Zweck? Kurz, nicht theatralisch.</li>
<li><strong>Kontext:</strong> Wer liest das, was ist die Situation, was ist tabu? Das meiste schlechte Ergebnis kommt von fehlendem Kontext, nicht von schwacher KI.</li>
<li><strong>Aufgabe, präzise:</strong> Eine Aufgabe pro Prompt, klar formuliert. „Schreib mir was zu X" ist Glücksspiel.</li>
<li><strong>Format:</strong> Länge, Ton, Struktur, Sprache. Sag es, sonst rät das Modell.</li>
<li><strong>Beispiel:</strong> Das am meisten unterschätzte Element. Ein einziges Beispiel deines gewünschten Stils bringt oft mehr als drei Absätze Anweisung.</li>
</ul>
<h3>Iteration schlägt Perfektion</h3>
<p>Niemand schreibt den perfekten Prompt im ersten Versuch — und das ist auch nicht das Ziel. Schick einen brauchbaren Prompt ab, sieh dir an, was fehlt, und sag dem Modell konkret, was es ändern soll. Drei schnelle Runden schlagen eine halbe Stunde Feilen am „perfekten" ersten Prompt.</p>
<h3>Wann du KI <em>nicht</em> nutzen solltest</h3>
<p>Die ehrliche Grenze: Wenn du das Ergebnis nicht selbst beurteilen kannst, solltest du es nicht ungeprüft verwenden. KI entwirft, du entscheidest. Bei Fakten, Recht und Zahlen heißt das: gegenprüfen, immer.</p>
<div class="dd-note"><strong>Bau dir eine eigene Prompt-Bibliothek.</strong> Jeder Prompt, der einmal gut funktioniert hat, gehört gespeichert. Nach ein paar Wochen hast du ein Dutzend erprobte Vorlagen — das spart mehr Zeit als jede Sammlung fremder „1000 beste Prompts".</div>
""",
"anti-hype-reality-checks": """
<h2>In der Tiefe: Der Anti-Hype-Filter in 60 Sekunden</h2>
<p>Jede Woche ist irgendetwas „das Ende von" oder „die Revolution für". Das meiste davon ist weder das eine noch das andere. Du musst kein Experte sein, um Substanz von Marketing zu trennen — du brauchst nur fünf Fragen und eine Minute.</p>
<h3>Fünf Fragen an jede KI-Schlagzeile</h3>
<ul>
<li><strong>Wer profitiert von der Behauptung?</strong> Wer eine Runde Kapital sucht oder ein Produkt verkauft, redet anders über „Durchbrüche" als jemand, der damit arbeiten muss.</li>
<li><strong>Demo oder Produktion?</strong> Eine kuratierte Demo zeigt den besten Fall. Interessant ist, wie sich etwas am dritten Dienstag mit echten, hässlichen Daten schlägt.</li>
<li><strong>Cherry-picked?</strong> Ein beeindruckendes Beispiel ist ein Beispiel, kein Beweis. Frag nach dem Durchschnitt, nicht nach dem Highlight.</li>
<li><strong>Reproduzierbar?</strong> Können andere das Ergebnis unabhängig nachstellen — oder gibt es nur den einen viralen Screenshot?</li>
<li><strong>Was kostet es wirklich?</strong> Inklusive Einrichtung, Lernkurve, Nacharbeit und deiner Zeit. „Spart 10 Stunden" ist wertlos, wenn die Einführung 40 kostet.</li>
</ul>
<h3>Investoren-Deck vs. Dienstagmorgen</h3>
<p>Die größte Lücke im KI-Diskurs verläuft zwischen dem, was in Ankündigungen versprochen wird, und dem, was am normalen Arbeitstag tatsächlich funktioniert. Wer diese Lücke im Kopf behält, trifft bessere Entscheidungen — und spart sich teure Fehlkäufe, die andere erst Monate später bereuen.</p>
<h3>Benchmarks lesen, ohne sich täuschen zu lassen</h3>
<p>Zahlen wirken objektiv, sind aber oft auf den Test optimiert. Frag immer: Wer hat gemessen, gegen was, unter welchen Bedingungen — und entspricht das deinem Anwendungsfall? Ein Spitzenwert in einem Labortest sagt wenig über deinen Posteingang aus.</p>
<div class="dd-note"><strong>Skepsis ist kein Pessimismus.</strong> Es geht nicht darum, alles schlechtzureden, sondern darum, deine Aufmerksamkeit (und dein Geld) für das aufzuheben, was sich wirklich bewährt. Genau das ist die Idee hinter aban news.</div>
""",
"ki-modelle-vergleich": """
<h2>In der Tiefe: Ein Modell wählen, ohne dem Benchmark-Zirkus zu verfallen</h2>
<p>Welches KI-Modell „das beste" ist, ändert sich gefühlt im Wochentakt — und genau das ist die Falle. Leaderboards messen Laborbedingungen, nicht deinen Posteingang. Die bessere Frage ist nicht „welches ist top", sondern „welches passt zu meiner Aufgabe, meinem Budget und meinen Daten".</p>
<h3>Worauf es bei der Wahl wirklich ankommt</h3>
<ul>
<li><strong>Eignung für deine Aufgabe:</strong> Teste mit deinen echten Texten/Daten. Ein Modell, das im Benchmark vorn liegt, kann bei deinem Anwendungsfall trotzdem schlechter sein.</li>
<li><strong>Wo die Daten liegen:</strong> EU-Anbieter wie Mistral oder Aleph Alpha sind im DACH-Raum oft das stärkere Argument — nicht wegen des Hypes, sondern wegen Verarbeitungsort und Compliance.</li>
<li><strong>Kosten &amp; Commoditisierung:</strong> Der Preiskampf (auch aus China) macht Sprachmodelle zunehmend zur Massenware. Zahl nicht für einen Namen, sondern für messbaren Nutzen.</li>
<li><strong>Lock-in:</strong> Je leichter du den Anbieter wechseln kannst, desto entspannter überstehst du die nächste Markt-Verschiebung.</li>
</ul>
<h3>Warum „der Marktführer" selten die richtige Antwort ist</h3>
<p>Der Abstand zwischen den Top-Modellen schrumpft, während sich Spezialisierung und Preis stärker unterscheiden. Für die meisten Aufgaben reicht „gut genug" — und „gut genug, EU-gehostet, halber Preis" schlägt „Spitzenreiter mit offenen Datenschutz-Fragen".</p>
<div class="dd-note"><strong>Faustregel:</strong> Wähle zwei Kandidaten, teste sie eine Woche an echter Arbeit, entscheide nach Ergebnis und Datenschutz — nicht nach Ranking.</div>
""",
"ki-fuer-selbststaendige": """
<h2>In der Tiefe: KI als dein Ein-Personen-Team</h2>
<p>Als Selbstständige:r bist du Marketing, Vertrieb, Buchhaltung und Umsetzung in einer Person. Genau da ist KI ein echter Hebel — nicht als Ersatz für dich, sondern als Assistent, der dir die Routine abnimmt, damit du Zeit für das hast, wofür Kund:innen dich bezahlen.</p>
<h3>Wo KI dir am meisten Zeit spart</h3>
<ul>
<li><strong>Akquise &amp; Leadgen:</strong> Recherche, Erstansprache-Entwürfe, Nachfass-Texte — vorbereitet in Minuten statt Stunden.</li>
<li><strong>Mail &amp; Kommunikation:</strong> Entwürfe, Zusammenfassungen langer Threads, höfliche Absagen. Du gibst die Richtung vor, KI tippt die erste Version.</li>
<li><strong>Admin &amp; Routine:</strong> Angebote strukturieren, Texte umformulieren, Checklisten erstellen.</li>
</ul>
<h3>Wo sie dich (noch) nicht ersetzt</h3>
<p>Beziehung, Urteil und Verantwortung bleiben bei dir. KI kennt deine Kund:innen nicht, haftet nicht und trifft keine Entscheidungen. Sie liefert Entwürfe — freigeben musst du. Wer das verwechselt, verschickt irgendwann etwas Peinliches.</p>
<h3>Datenschutz: der Solo-Stolperstein</h3>
<p>Gerade allein arbeitet man schnell unsauber. Kundendaten gehören nicht ungeprüft in öffentliche Tools — pseudonymisieren oder vorher Verarbeitungsort und Auftragsverarbeitung klären. Mehr dazu im Datenschutz-Dossier.</p>
<div class="dd-note"><strong>Starte klein:</strong> Such dir einen einzigen nervigen, wiederkehrenden Vorgang und automatisiere genau den. Ein laufender Workflow bringt mehr als zehn Tools, die du „mal testen" wolltest.</div>
""",
    "tool-duelle-vergleiche": """
    <h2>In der Tiefe: Wie man zwei Tools fair vergleicht</h2>
    <p>Ein Tool allein lässt sich schönreden — zwei gegeneinander nicht. Das direkte Duell ist die ehrlichste Form des Tests: gleiche Aufgabe, gleicher Zeitraum, und am Ende bleibt eins. Aber nur, wenn man es richtig aufzieht.</p>
    <h3>Gleiche Aufgabe, gleicher Zeitraum</h3>
    <p>Beide Tools an <em>demselben</em> echten Projekt, ein paar Tage parallel — nicht an der Hochglanz-Demo. Erst im Alltag zeigt sich, welches sich wegklickt und welches im Weg steht.</p>
    <h3>Wechselkosten zählen mit</h3>
    <p>Export, Lernkurve, Team-Umgewöhnung, neue Tastenkürzel im Muskelgedächtnis — all das gehört auf die Rechnung. Ein <strong>minimal</strong> besseres Tool ist den Umzug selten wert; ein spürbar besserer Workflow schon.</p>
    <h3>„Gut genug" gewinnt</h3>
    <p>Selten ist ein Tool in allem besser. Entscheide nach dem, was du <em>täglich</em> brauchst, nicht nach der längsten Feature-Liste. Mehr Funktionen sind nicht mehr Nutzen — oft nur mehr Menüpunkte.</p>
    <div class="dd-note"><strong>Faustregel:</strong> Lass das Duell von der täglichen Nutzung entscheiden, nicht vom ersten Wow. Das Tool, das du nach einer Woche reflexartig öffnest, hat gewonnen.</div>
    """,
}

# --- FAQ je Dossier (ehrlich, immergültig → FAQPage-Schema + sichtbarer Block) -
FAQS = {
"ki-werkzeugkasten": [
    ("Welche KI-Tools lohnen sich wirklich?",
     "Die wenigen, die ein echtes, wiederkehrendes Problem von dir lösen und mehr Zeit sparen, als sie kosten. Faustregel: ein Tool, das du täglich nutzt, schlägt zehn ausprobierte. Teste 14 Tage an echter Arbeit, nicht an der Demo."),
    ("Wie teste ich ein KI-Tool seriös?",
     "Parallel zu deiner bisherigen Methode, an einem echten Projekt, zwei Wochen lang. Notiere, wo es Zeit gespart hat und wo du nacharbeiten musstest. Danach entscheidet die Notiz, nicht das erste Wow."),
    ("Worauf muss ich bei Tools im DACH-Raum besonders achten?",
     "Wo die Daten verarbeitet werden (EU oder Drittland), ob es eine Auftragsverarbeitung gibt und wie groß der Lock-in ist. Mehr dazu im Datenschutz-Dossier."),
],
"ki-datenschutz-dach": [
    ("Darf ich Kundendaten in ein KI-Tool eingeben?",
     "In der Regel nicht ungeprüft. Klar- und Personennamen, Vertragsinhalte und besonders geschützte Daten gehören nicht ungefiltert in öffentliche Tools. Pseudonymisiere oder kläre vorher Auftragsverarbeitung und Verarbeitungsort. Das ist keine Rechtsberatung."),
    ("Was ist eine Auftragsverarbeitung (AVV)?",
     "Ein Vertrag, der regelt, wie ein Dienstleister personenbezogene Daten in deinem Auftrag verarbeitet. Seriöse Anbieter stellen ihn bereit; fehlt er, ist das ein Warnsignal."),
    ("Betrifft mich der EU AI Act als Solo-Selbstständige:r?",
     "Meist nur leicht: Texte entwerfen oder zusammenfassen ist gering reguliert. Transparenz, wo nötig, und der Datenschutz darunter bleiben aber deine Pflicht."),
],
"ki-prompts-die-funktionieren": [
    ("Warum funktionieren meine Prompts nicht?",
     "Meist fehlt Kontext oder ein klares Format, nicht das richtige Zauberwort. Gib Rolle, Kontext, eine präzise Aufgabe, das gewünschte Format und idealerweise ein Beispiel."),
    ("Bringen „Du bist ein Experte\"-Prompts etwas?",
     "Selten den entscheidenden Unterschied. Struktur und Iteration schlagen Magie-Formeln. Ein einziges Beispiel deines Wunschstils hilft oft mehr als drei Absätze Anweisung."),
    ("Soll ich fertige Prompt-Sammlungen kaufen?",
     "Selten nötig. Eine eigene Bibliothek aus Prompts, die bei dir nachweislich funktioniert haben, ist nach wenigen Wochen wertvoller als jede fremde „1000 Prompts\"-Liste."),
],
"anti-hype-reality-checks": [
    ("Wie erkenne ich KI-Hype?",
     "Fünf Fragen: Wer profitiert von der Behauptung? Demo oder Produktion? Cherry-picked? Reproduzierbar? Was kostet es wirklich, inklusive deiner Zeit? So trennst du in 60 Sekunden Substanz von Marketing."),
    ("Kann ich KI-Benchmarks trauen?",
     "Mit Vorsicht. Zahlen sind oft auf den Test optimiert. Frag: Wer hat gemessen, gegen was, unter welchen Bedingungen — und passt das zu deinem Anwendungsfall?"),
    ("Ist Skepsis nicht einfach Pessimismus?",
     "Nein. Es geht darum, Aufmerksamkeit und Geld für das aufzuheben, was sich wirklich bewährt — statt jeder Schlagzeile hinterherzulaufen."),
],
"ki-modelle-vergleich": [
    ("Welches KI-Modell ist das beste?",
     "Es gibt kein \"bestes\" für alle. Für deine konkrete Aufgabe entscheidet ein kurzer Praxistest mit echten Daten — plus Datenschutz und Kosten. Der Abstand zwischen den Top-Modellen ist kleiner, als die Schlagzeilen suggerieren."),
    ("Sind EU-Anbieter wie Mistral oder Aleph Alpha eine echte Alternative?",
     "Für viele DACH-Anwendungen ja — vor allem wegen Verarbeitungsort und Compliance. Bei der reinen Leistung kommt es auf den Anwendungsfall an; deshalb selbst testen statt Ranking glauben."),
    ("Lohnt es sich, das Modell ständig zu wechseln?",
     "Nein. Wähle nach Eignung und halte den Wechsel-Aufwand (Lock-in) klein. Erst wenn ein Wechsel spürbar Nutzen oder Datenschutz verbessert, lohnt er sich."),
],
"ki-fuer-selbststaendige": [
    ("Wofür lohnt sich KI als Selbstständige:r am meisten?",
     "Für wiederkehrende Routine: Akquise-Entwürfe, Mail, Zusammenfassungen, Admin. Starte mit einem einzigen nervigen Vorgang und automatisiere genau den."),
    ("Ersetzt KI meine Arbeit?",
     "Nein. Sie liefert Entwürfe und nimmt Routine ab — Urteil, Beziehung und Verantwortung bleiben bei dir. Freigeben musst du immer selbst."),
    ("Darf ich Kundendaten verwenden?",
     "Nicht ungeprüft in öffentlichen Tools. Pseudonymisiere oder kläre vorher Verarbeitungsort und Auftragsverarbeitung. Details im Datenschutz-Dossier — keine Rechtsberatung."),
],
    "tool-duelle-vergleiche": [
        ("Wie vergleiche ich zwei Tools fair?",
         "Beide gleichzeitig am selben echten Projekt, ein paar Tage lang — nicht an der Demo. Notiere, wo du nacharbeiten musstest und was dich täglich nervt; danach entscheidet die Notiz."),
        ("Lohnt sich der Wechsel überhaupt?",
         "Oft nicht. Rechne Export, Lernkurve und Team-Umgewöhnung mit. Ein minimal besseres Tool ist den Umzug selten wert; ein spürbar besserer Workflow schon."),
        ("Mehr Funktionen = besser?",
         "Nein. Die längste Feature-Liste gewinnt selten. Das Tool, das du wirklich täglich benutzt, schlägt das mit den meisten Häkchen."),
    ],
}

# --- Englische Inhalte (gleiche Ausgaben, übersetzte Rahmen — keine erfundenen Fakten) ---
EN_META = {
"ki-werkzeugkasten": {"title": "The AI Toolbox",
    "sub": "Every Friday an honest tool test — bundled into one reading path.",
    "blurb": "Which AI tools are actually worth it — and which just sound good. These issues take tools "
             "apart in practice: what stays, what goes, what you can skip. Honestly tested, with a "
             "data-protection eye for the German-speaking (DACH) region."},
"ki-datenschutz-dach": {"title": "AI & Data Protection in the DACH Region",
    "sub": "GDPR, the EU AI Act and what they mean in practice.",
    "blurb": "Use AI without getting legally tangled up: these issues sort out data protection, EU "
             "regulation and DACH-specific questions — practical, no panic, no hype. Not legal advice, but "
             "the right framing before you put tools into production."},
"ki-prompts-die-funktionieren": {"title": "Prompts That Actually Work",
    "sub": "Proven prompts and workflows — to copy and adapt.",
    "blurb": "No prompt voodoo, just what really saves time day to day. These issues collect proven prompts "
             "and workflows for writing, research and routine — ready to use."},
"anti-hype-reality-checks": {"title": "Anti-Hype & Reality Checks",
    "sub": "What the headline promises — and what actually holds up.",
    "blurb": "The signature of aban news: holding AI claims against reality. These issues separate substance "
             "from marketing — so you decide on facts, not on LinkedIn noise."},
"ki-modelle-vergleich": {"title": "AI Models & Providers Compared",
    "sub": "Claude, Mistral, Aleph Alpha & co. — who really does what.",
    "blurb": "The model market keeps reshuffling: China pushes prices down, Mistral and Aleph Alpha bring the "
             "EU argument, the US providers catch up. These issues sort out who is good for what — so you "
             "choose by fit, not by headline."},
"ki-fuer-selbststaendige": {"title": "AI for the Self-Employed",
    "sub": "Get more done as a one-person team — without replacing yourself.",
    "blurb": "For solo founders and small teams, AI is a real lever — for acquisition, email, admin and "
             "routine. These issues show concrete workflows from practice (with a DACH data-protection eye): "
             "where AI takes work off your plate and where it doesn't."},
    "tool-duelle-vergleiche": {"title": "Tool Showdowns — A vs. B",
        "sub": "Direct comparisons over days and weeks — which tool actually wins.",
        "blurb": "Not one tool introduced, but two head-to-head in real use. These issues swap tools for days, compare honestly and tell you which one stays — so you don't have to subscribe to both to find out."},
}

DEEPDIVES_EN = {
"ki-werkzeugkasten": """
<h2>In depth: how to judge AI tools honestly</h2>
<p>More AI tools launch than any human could ever test — and new ones arrive daily. So the goal isn't to know them all, but to find the two or three that make your work <em>measurably</em> better. Everything else is well-made distraction. That's what the toolbox is for: not \"look what's new\", but \"is this worth it for you\".</p>
<h3>Five questions before any subscription</h3>
<ul>
<li><strong>Does it solve a real problem of mine?</strong> Not \"is it impressive\", but \"does this task annoy me often enough that a fix pays off\".</li>
<li><strong>Does it save more time than it costs?</strong> Setup, learning and the daily back-and-forth all count. A tool that saves five minutes but needs ten to manage is a net loss.</li>
<li><strong>Where does my data live?</strong> Hosting location, data processing, what happens to your inputs. In the DACH region that's not a detail — it's often the deciding question.</li>
<li><strong>How big is the lock-in?</strong> What happens if the provider shuts down, doubles the price, or drops the feature you depend on? The easier it is to leave, the safer the subscription.</li>
<li><strong>Can a tool I already have do this \"well enough\"?</strong> The most honest saving is the subscription you never start.</li>
</ul>
<h3>The honest 14-day test</h3>
<p>Never test on the glossy demo, but on a real, boring project from your everyday work. Run it for two weeks <em>in parallel</em> with your current method and note two things: where did it actually save time? And where did you have to redo the work because the output wasn't good enough? After 14 days that note decides — not the gut feeling right after the first \"wow\".</p>
<h3>The costliest mistake: the subscription graveyard</h3>
<p>Most people don't pay too little for tools — they pay too much for tools they don't use. A tool you touch every day beats ten you \"tried once\". Clean up once a quarter: what did you actually open in the last four weeks? The rest goes.</p>
<div class="dd-note"><strong>Rule of thumb:</strong> workflow first, tool second. Start with the tool and look for the workflow afterwards, and you've built yourself work you didn't have before.</div>
""",
"ki-datenschutz-dach": """
<h2>In depth: use AI without getting legally tangled up</h2>
<p>In the DACH region, adopting AI rarely fails on the tech and often on the uncertainty: \"am I even allowed to?\" Good news — the key guardrails fit on one page. Honest news — they don't replace legal advice, but they prevent the expensive beginner mistakes.</p>
<h3>What never belongs in a public AI tool</h3>
<ul>
<li>Real and personal names of customers, patients or clients</li>
<li>Contract and offer contents, amounts, internal calculations</li>
<li>Health, financial and other specially protected data</li>
<li>Credentials, keys, anything from a password manager</li>
</ul>
<p>The simple rule: would you email it unasked to an unknown service provider abroad? If not, it doesn't belong unchecked in an AI tool either.</p>
<h3>Three terms worth knowing</h3>
<ul>
<li><strong>Data processing agreement (DPA):</strong> if a tool processes personal data on your behalf, you usually need a contract for it. Reputable providers offer one; if it's missing, that's a warning sign.</li>
<li><strong>Third-country transfer:</strong> where are the servers? If your data leaves the EU/EEA, extra requirements apply. The hosting location is often in the fine print — read it.</li>
<li><strong>EU AI Act, in plain terms:</strong> applications are sorted by risk. Most of what solo self-employed people do (drafting, summarising) is lightly regulated — but transparency where required, and the data protection underneath, remain your duty.</li>
</ul>
<h3>Pre-flight checklist before using a tool</h3>
<ul>
<li>☐ Which data exactly am I entering — and is anything sensitive among it?</li>
<li>☐ Is there a DPA, and do I have it?</li>
<li>☐ Where is it processed (EU or third country)?</li>
<li>☐ Can I anonymise/pseudonymise the input without hurting the result?</li>
<li>☐ Does my team know what may go in and what may not (one page of policy is enough)?</li>
</ul>
<div class="dd-note"><strong>Not a substitute for legal advice.</strong> In sensitive fields (health, law, tax) get expert review when in doubt — the aban news compliance packs give you a clean starting point, but the responsibility stays with you.</div>
""",
"ki-prompts-die-funktionieren": """
<h2>In depth: why most prompt tips don't help</h2>
<p>\"You are an experienced expert in …\" — such magic formulas rarely make the difference. What actually improves a result isn't the magic word at the start, but <em>structure</em> and <em>iteration</em>. A good prompt isn't a phrase, it's a clear brief.</p>
<h3>Anatomy of a prompt that works</h3>
<ul>
<li><strong>Role &amp; goal:</strong> from which perspective, to what end? Short, not theatrical.</li>
<li><strong>Context:</strong> who reads this, what's the situation, what's off-limits? Most bad output comes from missing context, not from a weak model.</li>
<li><strong>Task, precisely:</strong> one task per prompt, clearly stated. \"Write me something about X\" is gambling.</li>
<li><strong>Format:</strong> length, tone, structure, language. Say it, or the model guesses.</li>
<li><strong>Example:</strong> the most underrated element. One example of your desired style often beats three paragraphs of instruction.</li>
</ul>
<h3>Iteration beats perfection</h3>
<p>Nobody writes the perfect prompt on the first try — and that's not the goal. Send a usable prompt, look at what's missing, and tell the model specifically what to change. Three quick rounds beat half an hour polishing the \"perfect\" first prompt.</p>
<h3>When <em>not</em> to use AI</h3>
<p>The honest line: if you can't judge the result yourself, don't use it unchecked. AI drafts, you decide. For facts, law and figures that means: verify, always.</p>
<div class="dd-note"><strong>Build your own prompt library.</strong> Every prompt that worked well once belongs saved. After a few weeks you'll have a dozen proven templates — that saves more time than any collection of someone else's \"1000 best prompts\".</div>
""",
"anti-hype-reality-checks": """
<h2>In depth: the anti-hype filter in 60 seconds</h2>
<p>Every week something is \"the end of\" or \"the revolution for\". Most of it is neither. You don't need to be an expert to separate substance from marketing — you just need five questions and a minute.</p>
<h3>Five questions for any AI headline</h3>
<ul>
<li><strong>Who benefits from the claim?</strong> Someone raising a round or selling a product talks about \"breakthroughs\" differently than someone who has to work with them.</li>
<li><strong>Demo or production?</strong> A curated demo shows the best case. What's interesting is how something holds up on the third Tuesday with real, ugly data.</li>
<li><strong>Cherry-picked?</strong> An impressive example is one example, not proof. Ask for the average, not the highlight.</li>
<li><strong>Reproducible?</strong> Can others reproduce the result independently — or is there just the one viral screenshot?</li>
<li><strong>What does it really cost?</strong> Including setup, learning curve, rework and your time. \"Saves 10 hours\" is worthless if onboarding costs 40.</li>
</ul>
<h3>Investor deck vs. Tuesday morning</h3>
<p>The biggest gap in the AI discourse runs between what announcements promise and what actually works on a normal workday. Keep that gap in mind and you make better decisions — and save yourself expensive mis-purchases others only regret months later.</p>
<h3>Reading benchmarks without fooling yourself</h3>
<p>Numbers look objective but are often optimised for the test. Always ask: who measured, against what, under which conditions — and does that match your use case? A top score in a lab test says little about your inbox.</p>
<div class="dd-note"><strong>Scepticism isn't pessimism.</strong> It's about saving your attention (and money) for what truly proves itself. That's the idea behind aban news.</div>
""",
"ki-modelle-vergleich": """
<h2>In depth: choosing a model without falling for the benchmark circus</h2>
<p>Which AI model is \"the best\" seems to change weekly — and that's the trap. Leaderboards measure lab conditions, not your inbox. The better question isn't \"which is on top\", but \"which fits my task, my budget and my data\".</p>
<h3>What actually matters when choosing</h3>
<ul>
<li><strong>Fit for your task:</strong> test with your real texts/data. A model that tops the benchmark can still be worse for your use case.</li>
<li><strong>Where the data sits:</strong> EU providers like Mistral or Aleph Alpha are often the stronger argument in the DACH region — not because of hype, but because of processing location and compliance.</li>
<li><strong>Cost &amp; commoditisation:</strong> the price war (also from China) increasingly turns language models into a commodity. Don't pay for a name, pay for measurable value.</li>
<li><strong>Lock-in:</strong> the easier you can switch provider, the more calmly you'll ride out the next market shift.</li>
</ul>
<h3>Why \"the market leader\" is rarely the right answer</h3>
<p>The gap between the top models is shrinking, while specialisation and price differ more. For most tasks \"good enough\" is plenty — and \"good enough, EU-hosted, half the price\" beats \"top of the chart with open data-protection questions\".</p>
<div class="dd-note"><strong>Rule of thumb:</strong> pick two candidates, test them for a week on real work, decide by result and data protection — not by ranking.</div>
""",
"ki-fuer-selbststaendige": """
<h2>In depth: AI as your one-person team</h2>
<p>As a self-employed person you're marketing, sales, accounting and delivery in one. That's exactly where AI is a real lever — not as a replacement for you, but as an assistant that takes the routine off your hands so you have time for what clients actually pay you for.</p>
<h3>Where AI saves you the most time</h3>
<ul>
<li><strong>Acquisition &amp; lead gen:</strong> research, first-contact drafts, follow-up texts — prepared in minutes instead of hours.</li>
<li><strong>Email &amp; communication:</strong> drafts, summaries of long threads, polite declines. You set the direction, AI types the first version.</li>
<li><strong>Admin &amp; routine:</strong> structuring offers, rephrasing texts, building checklists.</li>
</ul>
<h3>Where it doesn't (yet) replace you</h3>
<p>Relationship, judgement and responsibility stay with you. AI doesn't know your clients, isn't liable and makes no decisions. It delivers drafts — you approve. Confuse the two and sooner or later you send something embarrassing.</p>
<h3>Data protection: the solo stumbling block</h3>
<p>Working alone, it's easy to get sloppy. Customer data doesn't belong unchecked in public tools — pseudonymise, or clarify processing location and data-processing agreement first. More on that in the data-protection dossier.</p>
<div class="dd-note"><strong>Start small:</strong> pick a single annoying, recurring task and automate exactly that. One running workflow beats ten tools you meant to \"try out\".</div>
""",
    "tool-duelle-vergleiche": """
    <h2>In depth: how to compare two tools fairly</h2>
    <p>A single tool is easy to talk up — two against each other are not. The direct duel is the most honest kind of test: same task, same timeframe, and one is left standing at the end. But only if you set it up right.</p>
    <h3>Same task, same timeframe</h3>
    <p>Both tools on <em>the same</em> real project, a few days in parallel — not on the glossy demo. Only in daily use does it show which one disappears under your hands and which one gets in the way.</p>
    <h3>Switching costs count</h3>
    <p>Export, learning curve, getting the team used to it, new shortcuts in muscle memory — all of that goes on the bill. A <strong>marginally</strong> better tool is rarely worth the move; a noticeably better workflow is.</p>
    <h3>\"Good enough\" wins</h3>
    <p>One tool is rarely better at everything. Decide by what you need <em>daily</em>, not by the longest feature list. More features aren't more value — often just more menu items.</p>
    <div class="dd-note"><strong>Rule of thumb:</strong> let the duel be decided by daily use, not by the first wow. The tool you reflexively open after a week has won.</div>
    """,
}

FAQS_EN = {
"ki-werkzeugkasten": [
    ("Which AI tools are actually worth it?",
     "The few that solve a real, recurring problem of yours and save more time than they cost. Rule of thumb: a tool you use daily beats ten you tried once. Test for 14 days on real work, not on the demo."),
    ("How do I test an AI tool seriously?",
     "In parallel with your current method, on a real project, for two weeks. Note where it saved time and where you had to redo the work. Then the note decides, not the first wow."),
    ("What should I watch for with tools in the DACH region?",
     "Where the data is processed (EU or third country), whether there's a data-processing agreement, and how big the lock-in is. More in the data-protection dossier."),
],
"ki-datenschutz-dach": [
    ("Can I enter customer data into an AI tool?",
     "Usually not unchecked. Real and personal names, contract contents and specially protected data don't belong unfiltered in public tools. Pseudonymise, or clarify processing location and a data-processing agreement first. This is not legal advice."),
    ("What is a data-processing agreement (DPA)?",
     "A contract governing how a provider processes personal data on your behalf. Reputable providers offer one; if it's missing, that's a warning sign."),
    ("Does the EU AI Act affect me as a solo self-employed person?",
     "Mostly only lightly: drafting or summarising text is lightly regulated. But transparency where required, and the data protection underneath, remain your duty."),
],
"ki-prompts-die-funktionieren": [
    ("Why don't my prompts work?",
     "Usually context or a clear format is missing, not the right magic word. Give a role, context, a precise task, the desired format and ideally an example."),
    ("Do \"you are an expert\" prompts help?",
     "Rarely the decisive difference. Structure and iteration beat magic formulas. One example of your desired style often helps more than three paragraphs of instruction."),
    ("Should I buy ready-made prompt collections?",
     "Rarely necessary. Your own library of prompts that have demonstrably worked for you is worth more after a few weeks than any external \"1000 prompts\" list."),
],
"anti-hype-reality-checks": [
    ("How do I spot AI hype?",
     "Five questions: who benefits from the claim? Demo or production? Cherry-picked? Reproducible? What does it really cost, including your time? That separates substance from marketing in 60 seconds."),
    ("Can I trust AI benchmarks?",
     "With caution. Numbers are often optimised for the test. Ask: who measured, against what, under which conditions — and does it match your use case?"),
    ("Isn't scepticism just pessimism?",
     "No. It's about saving your attention and money for what truly proves itself — instead of chasing every headline."),
],
"ki-modelle-vergleich": [
    ("Which AI model is the best?",
     "There's no single \"best\" for everyone. For your specific task a short practical test with real data decides — plus data protection and cost. The gap between the top models is smaller than the headlines suggest."),
    ("Are EU providers like Mistral or Aleph Alpha a real alternative?",
     "For many DACH applications, yes — mainly because of processing location and compliance. On raw performance it depends on the use case, so test yourself rather than trusting the ranking."),
    ("Is it worth switching models all the time?",
     "No. Choose by fit and keep the switching effort (lock-in) small. Only switch when it noticeably improves value or data protection."),
],
"ki-fuer-selbststaendige": [
    ("What does AI help most with as a self-employed person?",
     "Recurring routine: acquisition drafts, email, summaries, admin. Start with a single annoying task and automate exactly that."),
    ("Will AI replace my work?",
     "No. It delivers drafts and takes routine off your hands — judgement, relationship and responsibility stay with you. You always approve yourself."),
    ("May I use customer data?",
     "Not unchecked in public tools. Pseudonymise, or clarify processing location and a data-processing agreement first. Details in the data-protection dossier — not legal advice."),
],
    "tool-duelle-vergleiche": [
        ("How do I compare two tools fairly?",
         "Both at once on the same real project, for a few days — not on the demo. Note where you had to redo work and what annoys you daily; then the note decides."),
        ("Is switching even worth it?",
         "Often not. Factor in export, learning curve and getting the team used to it. A marginally better tool is rarely worth the move; a noticeably better workflow is."),
        ("More features = better?",
         "No. The longest feature list rarely wins. The tool you actually use every day beats the one with the most checkboxes."),
    ],
}

# UI-Strings je Sprache
STR = {
"de": {"locale": "de_DE", "skip": "Zum Inhalt", "navcta": "Newsletter gratis", "home": "/",
    "footer": ('© 2026 aban news · Allen Chour · Belp (CH) · <a href="/dossiers.html">Themen-Dossiers</a> · '
               '<a href="/archive/">Archiv</a> · <a href="/impressum.html">Impressum</a> · '
               '<a href="/datenschutz.html">Datenschutz</a>'),
    "crumb_start": "Start", "crumb_doss": "Dossiers", "ausgabe": "Ausgabe", "min": "Min",
    "meta": "{n} Ausgaben · ca. {m} Min Lesen · laufend ergänzt", "start_here": "Start hier",
    "route_h": "Die Leseroute — {n} Ausgaben zum Thema",
    "route_note": "Die Analyse oben an konkreten Beispielen aus dem Archiv, chronologisch:",
    "faq_h": "Häufige Fragen", "more_h": "Weitere Dossiers",
    "all_archive": "→ Alle {n} Ausgaben im Archiv durchsuchen",
    "cta_h": "Neue Ausgaben zu diesem Thema — automatisch im Postfach",
    "cta_sub": "Der tägliche KI-Newsletter, der dir die Arbeit abnimmt:",
    "sell": ["Mo–Fr in <strong>5 Minuten</strong> auf dem Laufenden",
             "<strong>3 Updates · 1 Tool · 1 Prompt</strong> — sofort nutzbar",
             "Ehrlich, <strong>kein Hype</strong>, mit DACH-Blick"],
    "cta_btn": "Kostenlos abonnieren →", "cta_note": "Gratis · jederzeit kündbar · kein Tracking, kein Spam.",
    "track": "Bereits {n} Ausgaben erschienen · täglich Mo–Fr · von Allen Chour, Belp (CH)",
    "share": "Teilen:", "share_aria": "Dieses Dossier teilen", "copy": "Link",
    "hub_title": "Themen-Dossiers — der KI-Newsletter vertieft · aban news",
    "hub_ogt": "Themen-Dossiers — der KI-Newsletter vertieft",
    "hub_desc": "Echte aban-news-Ausgaben, zu vertieften Themen-Leserouten gebündelt: Werkzeugkasten, Datenschutz im DACH-Raum, Prompts, Anti-Hype, KI-Modelle, KI für Selbstständige.",
    "hub_h1": "Themen-Dossiers — der Newsletter, vertieft",
    "hub_lead": "Aus {n} echten Ausgaben zu In-Depth-Leserouten gebündelt. Ein Thema, von Anfang bis aktuell — zum Einsteigen, Nachholen und Tieferbohren.",
    "hub_cta_h": "Lieber täglich frisch statt nachlesen?",
    "hub_cta_sub": "Bekomm den Newsletter, aus dem diese Dossiers entstehen:",
    "hub_sell": ["Mo–Fr in <strong>5 Minuten</strong>", "<strong>3 Updates · 1 Tool · 1 Prompt</strong>",
                 "Ehrlich, <strong>kein Hype</strong>"],
    "hub_note": "Gratis · jederzeit kündbar · kein Tracking · {n} Ausgaben bereits erschienen.",
    "hub_archive": "→ Oder alle Ausgaben im Archiv durchsuchen", "count_word": "Ausgaben →",
    "issues_word": "Ausgaben", "deepdive_badge": "THEMEN-DOSSIER"},
"en": {"locale": "en_US", "skip": "Skip to content", "navcta": "Free newsletter", "home": "/en/",
    "footer": ('© 2026 aban news · Allen Chour · Belp (CH) · <a href="/en/dossiers.html">Topic dossiers</a> · '
               '<a href="/en/archive.html">Archive</a> · <a href="/impressum.html">Imprint</a> · '
               '<a href="/datenschutz.html">Privacy</a>'),
    "crumb_start": "Home", "crumb_doss": "Dossiers", "ausgabe": "Issue", "min": "min",
    "meta": "{n} issues · approx. {m} min read · updated regularly", "start_here": "Start here",
    "route_h": "The reading path — {n} issues on this topic",
    "route_note": "The analysis above, illustrated by concrete issues from the archive (in German), chronologically:",
    "faq_h": "Frequently asked questions", "more_h": "More dossiers",
    "all_archive": "→ Browse all {n} issues in the archive (German)",
    "cta_h": "Get new issues on this topic — automatically in your inbox",
    "cta_sub": "The daily AI newsletter that does the work for you:",
    "sell": ["Mon–Fri, up to speed in <strong>5 minutes</strong>",
             "<strong>3 updates · 1 tool · 1 prompt</strong> — ready to use",
             "Honest, <strong>no hype</strong>, with a DACH lens"],
    "cta_btn": "Subscribe for free →", "cta_note": "Free · cancel anytime · no tracking, no spam.",
    "track": "Already {n} issues published · daily Mon–Fri · by Allen Chour, Belp (CH)",
    "share": "Share:", "share_aria": "Share this dossier", "copy": "Link",
    "hub_title": "Topic dossiers — the AI newsletter in depth · aban news",
    "hub_ogt": "Topic dossiers — the AI newsletter in depth",
    "hub_desc": "Real aban news issues bundled into in-depth reading paths: toolbox, data protection in the DACH region, prompts, anti-hype, AI models, AI for the self-employed.",
    "hub_h1": "Topic dossiers — the newsletter, in depth",
    "hub_lead": "Bundled from {n} real issues into in-depth reading paths. One topic, from the start to today — to get in, catch up and dig deeper.",
    "hub_cta_h": "Prefer it fresh every day instead of catching up?",
    "hub_cta_sub": "Get the newsletter these dossiers are built from:",
    "hub_sell": ["Mon–Fri in <strong>5 minutes</strong>", "<strong>3 updates · 1 tool · 1 prompt</strong>",
                 "Honest, <strong>no hype</strong>"],
    "hub_note": "Free · cancel anytime · no tracking · {n} issues already published.",
    "hub_archive": "→ Or browse all issues in the archive (German)", "count_word": "issues →",
    "issues_word": "issues", "deepdive_badge": "TOPIC DOSSIER"},
}

CSS = """*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--amber:#d97706;--amber-dk:#b45309;--amber-lt:#fde9c8;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#ece3d4;--bg:#fffbf5;--card:#fff}
@media(prefers-color-scheme:dark){:root{--amber:#f0a93a;--amber-dk:#fbbf24;--amber-lt:#5a4422;--cream:#3a2f1c;--ink:#f3ede2;--ink2:#d6cdbd;--muted:#9c9384;--line:#3a352d;--bg:#1a1712;--card:#231f19}}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:var(--ink);background:var(--bg)}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
a{color:var(--amber-dk)}
:focus-visible{outline:3px solid var(--amber-dk);outline-offset:2px;border-radius:4px}
.skip{position:absolute;left:-9999px}.skip:focus{left:8px;top:8px;background:var(--amber-dk);color:#fff;padding:10px;border-radius:8px}
header.site{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;padding:14px 20px}
.brand{font-weight:800;color:var(--amber);text-decoration:none}
.btn{display:inline-block;background:var(--amber-dk);color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:9px;border:0;cursor:pointer;font-size:1rem}
.btn:hover{filter:brightness(1.05)}.btn.ghost{background:transparent;color:var(--amber-dk);border:1px solid var(--amber-lt)}
.crumbs{font-size:.85rem;color:var(--muted);padding:16px 0 0}.crumbs a{color:var(--amber-dk)}
.hero{padding:26px 0 10px}
.hero .em{font-size:2.4rem;line-height:1}
.hero h1{font-size:clamp(24px,4.2vw,34px);font-weight:800;letter-spacing:-.02em;line-height:1.14;margin:.4rem 0 .5rem}
.hero p.lead{font-size:clamp(16px,2.2vw,18px);color:var(--ink2)}
.meta{color:var(--muted);font-size:.9rem;margin-top:.5rem}
section{padding:14px 0}h2{font-size:1.25rem;margin:18px 0 10px}
.intro{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:14px 0}
.deepdive{margin:6px 0 4px}
.deepdive h2{font-size:1.35rem;margin:22px 0 10px}
.deepdive h3{font-size:1.08rem;margin:18px 0 6px;color:var(--ink)}
.deepdive p{margin:.5rem 0;color:var(--ink2)}
.deepdive ul{margin:.4rem 0 .8rem 1.2rem}.deepdive li{margin:.3rem 0;color:var(--ink2)}
.deepdive strong{color:var(--ink)}
.dd-note{background:color-mix(in srgb,var(--cream) 60%,var(--card));border:1px solid var(--amber-lt);border-left:4px solid var(--amber);border-radius:10px;padding:12px 16px;margin:14px 0;font-size:.95rem;color:var(--ink2)}
.route{list-style:none;counter-reset:r;margin:10px 0}
.route li{position:relative;background:var(--card);border:1px solid var(--line);border-radius:13px;padding:14px 16px 14px 56px;margin:10px 0}
.route li::before{counter-increment:r;content:counter(r);position:absolute;left:14px;top:14px;width:30px;height:30px;border-radius:50%;background:var(--cream);color:var(--amber-dk);font-weight:800;display:flex;align-items:center;justify-content:center;border:1px solid var(--amber-lt)}
.route .d{font-size:.8rem;color:var(--muted)}
.route .t{font-weight:700;font-size:1.04rem;margin:.1rem 0}.route .t a{color:var(--ink);text-decoration:none}.route .t a:hover{color:var(--amber-dk)}
.route .p{color:var(--ink2);font-size:.93rem;margin-top:.2rem}
.route .start{display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--amber-dk);background:var(--cream);border:1px solid var(--amber-lt);border-radius:99px;padding:.05rem .5rem;margin-left:.4rem;vertical-align:middle}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}
@media(max-width:600px){.grid{grid-template-columns:1fr}}
.dcard{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;text-decoration:none;color:inherit;transition:transform .12s,border-color .12s,box-shadow .12s}
.dcard:hover{transform:translateY(-2px);border-color:var(--amber);box-shadow:0 6px 18px rgba(0,0,0,.07)}
.dcard .em{font-size:1.7rem}.dcard h3{margin:.3rem 0 .2rem;font-size:1.1rem}
.dcard p{color:var(--muted);font-size:.9rem}.dcard .n{color:var(--amber-dk);font-weight:700;font-size:.82rem;margin-top:.5rem}
.buybox{background:linear-gradient(135deg,var(--cream),var(--card));border:1px solid var(--amber-lt);border-radius:16px;padding:24px;text-align:center;margin:20px 0}
.btn--xl{font-size:1.08rem;padding:14px 28px}
.sell{list-style:none;display:inline-block;text-align:left;margin:0 auto .9rem;padding:0}
.sell li{position:relative;padding-left:1.6rem;margin:.32rem 0;color:var(--ink2)}
.sell li::before{content:"✓";position:absolute;left:0;color:var(--amber-dk);font-weight:800}
.note{font-size:.85rem;color:var(--muted);margin-top:10px}
.faq{margin:8px 0}
.faq details{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:2px 16px;margin:10px 0}
.faq details[open]{border-color:var(--amber-lt)}
.faq summary{cursor:pointer;font-weight:700;padding:13px 0;list-style:none;color:var(--ink);display:flex;justify-content:space-between;gap:12px;align-items:center}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";color:var(--amber-dk);font-weight:800;font-size:1.2rem}
.faq details[open] summary::after{content:"–"}
.faq details p{color:var(--ink2);padding:0 0 14px;margin:0}
.reading-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:60;background:var(--amber-dk);transform:scaleX(0);transform-origin:0 50%;transition:transform .08s linear;will-change:transform}
.dform{display:flex;gap:10px;max-width:440px;margin:0 auto .5rem;flex-wrap:wrap;justify-content:center}
.dform input{flex:1 1 200px;min-width:0;padding:13px 15px;font-size:1rem;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}
.dform input:focus{outline:3px solid var(--amber-dk);outline-offset:1px;border-color:var(--amber)}
.dform .btn{flex:0 0 auto}
@media(max-width:460px){.dform input,.dform .btn{flex:1 1 100%}}
.to-top{position:fixed;right:18px;bottom:18px;z-index:55;width:44px;height:44px;border-radius:50%;border:1px solid var(--amber-lt);background:var(--card);color:var(--amber-dk);font-size:1.3rem;line-height:1;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .2s;box-shadow:0 4px 14px rgba(0,0,0,.12)}
.to-top.show{opacity:1;pointer-events:auto}
.route li.read{opacity:.62}
.route .mark{display:inline-flex;align-items:center;gap:.3rem;margin-top:.5rem;font-size:.8rem;color:var(--muted);cursor:pointer;user-select:none;background:none;border:0;padding:0}
.route .mark:hover{color:var(--amber-dk)}
.route li.read .mark{color:var(--amber-dk);font-weight:700}
.read-counter{font-size:.82rem;color:var(--muted);margin:.2rem 0 0}
.share{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0 2px}
.share-l{font-size:.85rem;color:var(--muted);font-weight:600}
.share-b{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:9px;border:1px solid var(--line);background:var(--card);color:var(--amber-dk);font-weight:700;font-size:.85rem;text-decoration:none;cursor:pointer}
.share-b:hover{border-color:var(--amber);transform:translateY(-1px)}
.share-copy.copied{background:var(--cream);border-color:var(--amber)}
footer{border-top:1px solid var(--line);margin-top:30px;padding:24px 0;font-size:.82rem;color:var(--muted)}
footer a{color:var(--muted)}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}.dcard:hover,.related-card:hover,.share-b:hover,.route li:hover{transform:none!important}}"""

SHELL = """<!DOCTYPE html>
<html lang="__LANG__">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__</title>
<meta name="description" content="__DESC__">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://abannews.com/__CANON__">
__HREFLANG__
<meta property="og:title" content="__OGT__">
<meta property="og:description" content="__DESC__">
<meta property="og:type" content="website">
<meta property="og:url" content="https://abannews.com/__CANON__">
<meta property="og:image" content="https://abannews.com/__OGIMG__">
<meta property="og:locale" content="__LOCALE__"><meta property="og:site_name" content="aban news">
<meta name="theme-color" content="#d97706">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="aban news" href="/archive.rss">
__LD__
<style>__CSS__</style>
</head>
<body>
<a class="skip" href="#main">__SKIP__</a>
<header class="site"><div class="wrap">
  <a href="__HOME__" class="brand">☕ aban news</a>
  <a href="https://abannews.beehiiv.com/subscribe" class="btn ghost">__NAVCTA__</a>
</div></header>
<main id="main"><div class="wrap">
__BODY__
</div></main>
<footer><div class="wrap">__FOOTER__</div></footer>
<script defer src="/js/dossier.js"></script>
<script defer src="/js/assistant.js"></script>
</body>
</html>
"""


def e(s):
    return _html.escape(str(s or ""), quote=True)


def share_row(canon, title, s):
    import urllib.parse as up
    url = "https://abannews.com/" + canon
    u, t = up.quote(url, safe=""), up.quote(title + " · aban news", safe="")
    x = f"https://twitter.com/intent/tweet?url={u}&text={t}"
    li = f"https://www.linkedin.com/sharing/share-offsite/?url={u}"
    wa = f"https://wa.me/?text={t}%20{u}"
    return (
        f'<div class="share" aria-label="{e(s["share_aria"])}">'
        f'<span class="share-l">{e(s["share"])}</span>'
        f'<a class="share-b" href="{x}" target="_blank" rel="noopener" aria-label="X">𝕏</a>'
        f'<a class="share-b" href="{li}" target="_blank" rel="noopener" aria-label="LinkedIn">in</a>'
        f'<a class="share-b" href="{wa}" target="_blank" rel="noopener" aria-label="WhatsApp">WA</a>'
        f'<button type="button" class="share-b share-copy" data-url="{e(url)}" aria-label="Copy link">{e(s["copy"])}</button>'
        '</div>')


def signup_form(label):
    # Gleicher Mechanismus wie auf der Startseite: GET an Beehiiv (CSP erlaubt das).
    return (
        '<form class="dform" action="https://abannews.beehiiv.com/subscribe" method="get" novalidate>'
        '<input type="email" name="email" placeholder="deine@mail.de" required '
        'autocomplete="email" inputmode="email" aria-label="E-Mail-Adresse">'
        f'<button type="submit" class="btn btn--xl">{e(label)}</button></form>')


# --- archive/index.html parsen (kuratierte Quelle) ---------------------------
def parse_issues():
    src = open(os.path.join(ROOT, "archive", "index.html"), encoding="utf-8").read()
    issues = []
    for m in re.finditer(r'<article class="arc-card"([^>]*)>(.*?)</article>', src, re.S):
        attrs, inner = m.group(1), m.group(2)

        def at(name):
            mm = re.search(rf'{name}="([^"]*)"', attrs)
            return mm.group(1) if mm else ""
        kind = at("data-kind")
        topics = [t for t in at("data-topics").split() if t]
        date = at("data-date")
        tm = re.search(r'<h2 class="arc-card-title"><a href="([^"]+)">(.*?)</a>', inner, re.S)
        if not tm:
            continue
        url, title = tm.group(1), _html.unescape(re.sub(r"<[^>]+>", "", tm.group(2))).strip()
        pm = re.search(r'<p class="arc-card-preview">(.*?)</p>', inner, re.S)
        preview = _html.unescape(re.sub(r"<[^>]+>", "", pm.group(1))).strip() if pm else ""
        mins = 0
        mn = re.search(r'·\s*(\d+)\s*Min', inner)
        if mn:
            mins = int(mn.group(1))
        num = (re.search(r'/(\d{3})-', url) or [None, ""])[1]
        nice = ""
        dm = re.search(r'<time datetime="[^"]*">(.*?)</time>', inner, re.S)
        if dm:
            nice = _html.unescape(dm.group(1)).strip()
        issues.append({"url": url, "title": title, "preview": preview, "date": date,
                       "nice": nice, "mins": mins, "topics": topics, "kind": kind, "num": num})
    return issues


def font(size, bold=True):
    cands = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"] + glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def _wrap(d, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textbbox((0, 0), t, font=fnt)[2] <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def og(path, badge, title, tagline="abannews.com/dossiers  ·  ehrlich, kein Hype"):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(img)
    d.ellipse([W-520,-260,W+260,360], fill=CR); d.rectangle([0,0,16,H], fill=A)
    d.text((70,70), "☕  aban news", font=font(34), fill=AD)
    bf = font(24); bb = d.textbbox((0,0), badge, font=bf)
    d.rounded_rectangle([70,140,70+(bb[2]-bb[0])+44,140+(bb[3]-bb[1])+26], radius=18, fill=CR)
    d.text((92,152), badge, font=bf, fill=AD)
    y = 220
    for ln in _wrap(d, title, font(74), W-140)[:3]:
        d.text((70, y), ln, font=font(74), fill=INK); y += 88
    d.text((70, H-78), tagline, font=font(26, bold=False), fill=MU)
    img.save(path, "PNG")


def ld(obj):
    return '<script type="application/ld+json">\n' + json.dumps(obj, ensure_ascii=False) + '\n</script>'


def select_members(dos, issues):
    """Mitglied = echte Ausgabe, deren data-topics ODER Titel/URL/Teaser passen."""
    kws = [k.lower() for k in dos.get("keywords", [])]
    out = []
    for it in issues:
        if it["kind"] != "ausgabe":
            continue
        hit = bool(set(it["topics"]) & dos.get("topics", set()))
        if not hit and kws:
            hay = (it["title"] + " " + it["url"] + " " + it["preview"]).lower()
            hit = any(k in hay for k in kws)
        if hit:
            out.append(it)
    out.sort(key=lambda x: x["date"])  # chronologisch = Leseroute
    return out


def breadcrumb(trail):
    return ld({"@context": "https://schema.org", "@type": "BreadcrumbList",
               "itemListElement": [
                   {"@type": "ListItem", "position": i + 1, "name": name,
                    **({"item": "https://abannews.com/" + url} if url else {})}
                   for i, (name, url) in enumerate(trail)]})


def dloc(dos, key, lang):
    return EN_META[dos["slug"]][key] if lang == "en" else dos[key]


def hreflang_pair(de_canon, en_canon):
    return ("\n".join([
        f'<link rel="alternate" hreflang="de" href="https://abannews.com/{de_canon}">',
        f'<link rel="alternate" hreflang="en" href="https://abannews.com/{en_canon}">',
        f'<link rel="alternate" hreflang="x-default" href="https://abannews.com/{de_canon}">']))


def fill_shell(s, lang, *, title, ogt, desc, canon, ogimg, ld_blocks, hreflang, body):
    return (SHELL.replace("__LANG__", lang).replace("__LOCALE__", s["locale"])
            .replace("__SKIP__", e(s["skip"])).replace("__HOME__", s["home"])
            .replace("__NAVCTA__", e(s["navcta"])).replace("__FOOTER__", s["footer"])
            .replace("__HREFLANG__", hreflang)
            .replace("__TITLE__", e(title)).replace("__OGT__", e(ogt))
            .replace("__DESC__", e(desc)).replace("__CANON__", canon)
            .replace("__OGIMG__", ogimg).replace("__LD__", ld_blocks)
            .replace("__CSS__", CSS).replace("__BODY__", body))


def render_dossier(dos, issues, lang):
    s = STR[lang]
    en = lang == "en"
    slug = dos["slug"]
    title, sub, blurb = dloc(dos, "title", lang), dloc(dos, "sub", lang), dloc(dos, "blurb", lang)
    members = select_members(dos, issues)
    n_aus = sum(1 for it in issues if it["kind"] == "ausgabe")
    total_min = sum(it["mins"] for it in members) or len(members) * 4
    de_canon, en_canon = f"dossier/{slug}.html", f"en/dossier/{slug}.html"
    canon = en_canon if en else de_canon
    ogimg = f"og-dossier-{slug}-en.png" if en else f"og-dossier-{slug}.png"
    dprefix = "/en/dossier/" if en else "/dossier/"
    hub = "/en/dossiers.html" if en else "/dossiers.html"
    if en:
        desc = f"{sub} With an honest deep-dive analysis + {len(members)} real issues from the aban news archive as a reading path."
    else:
        desc = f"{sub} Mit ehrlicher Deep-Dive-Analyse + {len(members)} echten Ausgaben aus dem aban-news-Archiv als Leseroute."

    route = []
    for i, it in enumerate(members):
        start = f'<span class="start">{e(s["start_here"])}</span>' if i == 0 else ""
        mins = f' · {it["mins"]} {s["min"]}' if it["mins"] else ""
        marktxt = "○ mark as read" if en else "○ als gelesen markieren"
        route.append(
            f'<li data-url="{e(it["url"])}"><div class="d">{e(s["ausgabe"])} {e(it["num"])} · {e(it["nice"] or it["date"])}'
            f'{e(mins)}</div>'
            f'<div class="t"><a href="{e(it["url"])}">{e(it["title"])}</a>{start}</div>'
            f'<div class="p">{e(it["preview"])}</div>'
            f'<button type="button" class="mark" aria-pressed="false">{e(marktxt)}</button></li>')

    others = "".join(
        f'<a class="dcard" href="{dprefix}{e(o["slug"])}.html"><span class="em">{o["emoji"]}</span>'
        f'<h3>{e(dloc(o, "title", lang))}</h3><p>{e(dloc(o, "sub", lang))}</p></a>'
        for o in DOSSIERS if o["slug"] != slug)

    item_list = ld({"@context": "https://schema.org", "@type": "ItemList",
                    "name": title, "description": sub,
                    "itemListElement": [
                        {"@type": "ListItem", "position": i + 1,
                         "url": "https://abannews.com" + it["url"], "name": it["title"]}
                        for i, it in enumerate(members)]})
    fq = (FAQS_EN if en else FAQS).get(slug, [])
    faq_html = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in fq)
    faq_section = (f'<section><h2>{e(s["faq_h"])}</h2><div class="faq">{faq_html}</div></section>'
                   if fq else "")
    faq_ld = ld({"@context": "https://schema.org", "@type": "FAQPage",
                 "mainEntity": [{"@type": "Question", "name": q,
                                 "acceptedAnswer": {"@type": "Answer", "text": a}}
                                for q, a in fq]}) if fq else ""
    crumb_ld = breadcrumb([(s["crumb_start"], ""), (s["crumb_doss"], hub.lstrip("/")), (title, canon)])
    deepdive = (DEEPDIVES_EN if en else DEEPDIVES).get(slug, "")
    sell = "".join(f"<li>{x}</li>" for x in s["sell"])

    body = f"""<nav class="crumbs"><a href="{s['home']}">{e(s['crumb_start'])}</a> › <a href="{hub}">{e(s['crumb_doss'])}</a> › {e(title)}</nav>
  <section class="hero">
    <div class="em">{dos['emoji']}</div>
    <h1>{e(title)}</h1>
    <p class="lead">{e(sub)}</p>
    <p class="meta">{s['meta'].format(n=len(members), m=total_min)}</p>
  </section>
  <div class="intro"><p>{e(blurb)}</p></div>
  {share_row(canon, title, s)}
  <section class="deepdive">{deepdive}</section>
  <section>
    <h2>{s['route_h'].format(n=len(members))}</h2>
    <p class="note" style="margin:0 0 .4rem">{e(s['route_note'])}</p>
    <ol class="route">{''.join(route)}</ol>
  </section>
  <section>
    <div class="buybox">
      <p style="font-weight:800;font-size:1.18rem;margin-bottom:.4rem">{e(s['cta_h'])}</p>
      <p style="color:var(--ink2);margin-bottom:.7rem">{e(s['cta_sub'])}</p>
      <ul class="sell">{sell}</ul>
      {signup_form(s['cta_btn'])}
      <p class="note">{e(s['cta_note'])}</p>
      <p class="note">{e(s['track'].format(n=n_aus))}</p>
    </div>
  </section>
  {faq_section}
  <section>
    <h2>{e(s['more_h'])}</h2>
    <div class="grid">{others}</div>
    <p class="note" style="margin-top:.8rem"><a href="{'/en/archive.html' if en else '/archive/'}">{e(s['all_archive'].format(n=n_aus))}</a></p>
  </section>"""

    tagline = "abannews.com/en/dossiers  ·  honest, no hype" if en else "abannews.com/dossiers  ·  ehrlich, kein Hype"
    page = fill_shell(s, lang, title=f"{title} — {'Topic Dossier' if en else 'Themen-Dossier'} · aban news",
                      ogt=f"{title} — {'Topic Dossier' if en else 'Themen-Dossier'}", desc=desc,
                      canon=canon, ogimg=ogimg, ld_blocks=item_list + faq_ld + crumb_ld,
                      hreflang=hreflang_pair(de_canon, en_canon), body=body)
    outdir = os.path.join(ROOT, "en", "dossier") if en else os.path.join(ROOT, "dossier")
    os.makedirs(outdir, exist_ok=True)
    open(os.path.join(outdir, f"{slug}.html"), "w", encoding="utf-8").write(page)
    og(os.path.join(ROOT, ogimg), s["deepdive_badge"], title, tagline)


def render_index(issues, counts, lang):
    s = STR[lang]
    en = lang == "en"
    dprefix = "/en/dossier/" if en else "/dossier/"
    n_aus = sum(1 for it in issues if it["kind"] == "ausgabe")
    cards = "".join(
        f'<a class="dcard" href="{dprefix}{e(d["slug"])}.html"><span class="em">{d["emoji"]}</span>'
        f'<h3>{e(dloc(d, "title", lang))}</h3><p>{e(dloc(d, "sub", lang))}</p>'
        f'<div class="n">{counts[d["slug"]]} {s["count_word"]}</div></a>'
        for d in DOSSIERS)
    sell = "".join(f"<li>{x}</li>" for x in s["hub_sell"])
    de_canon, en_canon = "dossiers.html", "en/dossiers.html"
    canon = en_canon if en else de_canon
    body = f"""<nav class="crumbs"><a href="{s['home']}">{e(s['crumb_start'])}</a> › {e(s['crumb_doss'])}</nav>
  <section class="hero">
    <div class="em">📚</div>
    <h1>{e(s['hub_h1'])}</h1>
    <p class="lead">{e(s['hub_lead'].format(n=n_aus))}</p>
  </section>
  <section><div class="grid">{cards}</div></section>
  <section>
    <div class="buybox">
      <p style="font-weight:800;font-size:1.2rem;margin-bottom:.4rem">{e(s['hub_cta_h'])}</p>
      <p style="color:var(--ink2);margin-bottom:.7rem">{e(s['hub_cta_sub'])}</p>
      <ul class="sell">{sell}</ul>
      {signup_form(s['cta_btn'])}
      <p class="note">{e(s['hub_note'].format(n=n_aus))}</p>
    </div>
    <p class="note"><a href="{'/en/archive.html' if en else '/archive/'}">{e(s['hub_archive'])}</a></p>
  </section>"""
    page = fill_shell(s, lang, title=s["hub_title"], ogt=s["hub_ogt"], desc=s["hub_desc"],
                      canon=canon, ogimg=("og-dossiers-en.png" if en else "og-dossiers.png"),
                      ld_blocks=breadcrumb([(s["crumb_start"], ""), (s["crumb_doss"], canon)]),
                      hreflang=hreflang_pair(de_canon, en_canon), body=body)
    outdir = os.path.join(ROOT, "en") if en else ROOT
    os.makedirs(outdir, exist_ok=True)
    open(os.path.join(outdir, "dossiers.html"), "w", encoding="utf-8").write(page)
    badge = s["deepdive_badge"].replace("DOSSIER", "DOSSIERS")
    tagline = "abannews.com/en/dossiers  ·  honest, no hype" if en else "abannews.com/dossiers  ·  ehrlich, kein Hype"
    og(os.path.join(ROOT, "og-dossiers-en.png" if en else "og-dossiers.png"),
       badge, s["hub_h1"], tagline)


def write_topics_json(issues, dossier_map):
    freq = {}
    for it in issues:
        for t in it["topics"]:
            freq[t] = freq.get(t, 0) + 1
    data = {"updated": "2026-06-08", "freq": freq, "issues": {}}
    for it in issues:
        data["issues"][it["url"]] = {
            "title": it["title"], "date": it["date"], "preview": it["preview"],
            "t": it["topics"], "kind": it["kind"], "num": it["num"],
            "dossiers": dossier_map.get(it["url"], [])}
    open(os.path.join(ROOT, "archive", "topics.json"), "w", encoding="utf-8").write(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")))


def main():
    issues = parse_issues()
    counts, dossier_map = {}, {}
    for dos in DOSSIERS:
        members = select_members(dos, issues)
        counts[dos["slug"]] = len(members)
        for it in members:
            dossier_map.setdefault(it["url"], []).append(dos["slug"])
    for lang in ("de", "en"):
        for dos in DOSSIERS:
            render_dossier(dos, issues, lang)
        render_index(issues, counts, lang)
    write_topics_json(issues, dossier_map)
    # OG-Karte fürs Archiv (Growth-Audit: archive.html ohne OG-Bild)
    og(os.path.join(ROOT, "og-archive.png"), "ARCHIV",
       f"Alle {sum(1 for it in issues if it['kind']=='ausgabe')} Ausgaben zum Nachlesen")
    print(f"✓ Dossiers DE+EN: {len(DOSSIERS)} Themen aus {len(issues)} Ausgaben "
          f"({', '.join(f'{k}={v}' for k, v in counts.items())}) + topics.json + OGs")


if __name__ == "__main__":
    main()
