#!/usr/bin/env python3
"""heilversprechen_wache.py — findet und entschaerft Heil-/Gesundheitszusagen in Produkttexten.

WARUM (22.09.2026): «Tunmate Rizinusoel» (5 Sitzungen/Woche, eine der meistbesuchten Seiten)
versprach «Foerderung eines gesunden Haarwachstums» — die 13 Haarwachstums-Zusagen waren am
04.09. (Aufgabe 34) entschaerft worden, aber das Skript lag nur in /tmp, und dieses Produkt kam
am 07.09. aus dem Draft ZURUECK (Tag rueckhol-0907) und lief an der Korrektur vorbei. Stichprobe
ueber 2'569 Produkte der Beauty-/Kissen-/Fitness-Tags: 17 echte Zusagen (Schmerzen lindern,
Haarausfall, Heilungsprozess, Schnarchen verhindern, Gewichtsverlust). Ein Fix ohne Waechter
ist ein Fix fuer eine Woche (Lehre 21.09.: die alte Fassung seit Wochen).

RECHT: Kosmetika duerfen keine Heilwirkung versprechen (VKos/HMG-Abgrenzung), Gegenstaende
keine medizinische Zweckbestimmung (MepV) — sonst sind sie Heilmittel/Medizinprodukte ohne
Zulassung. Zudem UWG: unbelegte Wirkaussagen.

VERFAHREN: Alle AKTIVEN Produkte, beim ersten Lauf vollstaendig (250 je Seite), danach nur
`updated_at:>` seit dem letzten Lauf (Zustand `dropship/_heilversprechen_seit.txt`).
  · Ersatztabelle ERSATZ: exakte Phrasen -> unbedenkliche Fassung. Wird angewendet (FIX=1 ist
    Standard, FIX=0 nur melden). Jede Phrase ist von Hand gelesen; nichts wird geraten.
  · MUSTER: was nicht in der Tabelle steht, wird in dropship/HEILVERSPRECHEN.md gemeldet.
  · Fehlalarm-Wachen: «Bezug abnehmen», «lässt sich abnehmen», «Aromatherapie», «Lichttherapie».
Schreiben nur unter /tmp/lock_produkttext.lock (der Aufseher setzt ihn per TXTLOCK), Ruecklesen
nach jedem Schreiben, Ledger dropship/_heilversprechen.txt (id\tsha\tdatum\taktion).
ENV: FIX=0|1 (Standard 1) · VOLL=1 (alles statt seit letztem Lauf) · CAP=Seiten (Standard 400)
"""
import hashlib, json, os, re, subprocess, sys, time, datetime

TOK = open('/tmp/cj_shop_token.txt').read().strip()
URL = 'https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json'
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, 'dropship/HEILVERSPRECHEN.md')
LEDGER = os.path.join(REPO, 'dropship/_heilversprechen.txt')
SEIT_DATEI = os.path.join(REPO, 'dropship/_heilversprechen_seit.txt')
FIX = os.environ.get('FIX', '1') == '1'
VOLL = os.environ.get('VOLL') == '1'
CAP = int(os.environ.get('CAP', '400'))

# Exakte Phrasen (Text wie er im HTML steht) -> Ersatz. Reihenfolge: laengere zuerst.
ERSATZ = [
    ("Das Kissen unterstützt den Heilungsprozess und trägt zu einem allgemeinen Wohlbefinden bei.", "Das Kissen trägt zu einem angenehmen Liegegefühl bei."),
    ("um Nacken- und Schulterschmerzen zu lindern und die Entspannung zu fördern", "um Nacken und Schultern bequem zu stützen und die Entspannung zu fördern"),
    ("um Nacken-, Taillen- und Beinschmerzen zu lindern", "um Nacken, Taille und Beine bequem zu stützen"),
    ("Lindert Schmerzen in Nacken, Taille und Beinen", "Stützt Nacken, Taille und Beine"),
    ("lindert Schmerzen im Rücken- und Körperbereich", "wärmt Rücken und Körper angenehm"),
    ("um Schmerzen zu lindern und die Durchblutung in den Armen zu fördern", "um die Arme mit Wärme und Massage zu entspannen"),
    ("Lindert Schmerzen und fördert die Durchblutung", "Wärme und Massage für entspannte Arme"),
    ("um Schmerzen zu lindern und Muskeln zu entspannen", "um Muskeln nach dem Sport zu entspannen"),
    ("Lindert Schmerzen und Beschwerden", "Angenehm kühlendes Gefühl auf der Haut"),
    ("Es bietet milden Schutz vor Muskelkater und Unbehagen.", "Es zieht schnell ein und hinterlässt ein frisches Gefühl."),
    ("und kann Muskelschmerzen lindern", "und lockert beanspruchte Muskeln"),
    ("Verhindert Schnarchen und Schulterschmerzen", "Stützt Kopf und Schultern in der Seitenlage"),
    ("und kann so potenziell Schnarchen reduzieren", "und sorgt für eine ruhige Kopfposition"),
    ("kann die Maske auch unterstützend gegen Schnarchen wirken", "sitzt die Maske auch nachts bequem"),
    ("und gleichzeitig Haarausfall entgegenzuwirken", "und das Haar geschmeidig zu halten"),
    ("und hilft, Haarausfall entgegenzuwirken", "und macht das Haar geschmeidig"),
    ("die Durchblutung zu fördern, was wiederum das Haarwachstum unterstützen kann", "die Kopfhaut sanft zu massieren"),
    ("Es kann auch zur Stärkung der Haarwurzeln und zur Förderung eines gesunden Haarwachstums beitragen.", "Viele nutzen es als Pflegeöl für Haarspitzen und Kopfhaut."),
    ("hilft es, Spucken zu reduzieren und die Verdauung zu fördern", "liegt das Baby leicht erhöht"),
    ("das für seine entzündungshemmenden Eigenschaften bekannt ist", "das die Haut beruhigt"),
    ("die für ihre entzündungshemmenden Eigenschaften bekannt sind", "die die Haut beruhigen"),
    ("<li>Entzündungshemmend</li>", "<li>Beruhigt die Haut</li>"),
    ("Fördert Gewichtsverlust und Körperformung", "Für Fitness und Körperformung"),
    ("Ideal für Gewichtsverlust und Körperformung", "Ideal für Ausdauer und Körperformung"),
    ("und das Abnehmen zu unterstützen", "und das Training zu unterstützen"),
    ("und ist eine effektive Unterstützung beim Abnehmen", "und bringt Abwechslung ins Training"),
    ("Für Fitness und Abnehmen geeignet", "Für Fitness und Krafttraining geeignet"),
    ("Hilft, Schmerzen während der Schwangerschaft zu lindern", "Entlastet Rücken und Hüfte in der Seitenlage"),
    # Runde 2 (22.09., aus den 114 Offenen des ersten Volllaufs gelesen)
    ("Der Gurt bietet eine zuverlässige Unterstützung und trägt dazu bei, Beschwerden zu lindern und die Haltung zu verbessern.", "Der Gurt stützt den unteren Rücken und unterstützt eine aufrechte Haltung."),
    ("Sie ist ideal zur Linderung von Beschwerden oder zur Unterstützung bei der Regeneration, da sie sowohl für Wärme- als auch für Kältetherapieanwendungen geeignet ist.", "Sie lässt sich warm oder kalt anwenden und fühlt sich angenehm am Handgelenk an."),
    ("Durch die gezielte Temperaturbehandlung kann sie Schwellungen reduzieren und die Durchblutung fördern.", "Warm oder kalt: die Gel-Einlage hält die Temperatur mehrere Minuten."),
    ("Fördert Linderung und Regeneration.", "Warm- und Kaltanwendung möglich."),
    ("Dies hilft, die natürliche therapeutische Reaktion zu aktivieren und die Blutzirkulation zu verbessern, um Rücken-, Wirbelsäulen- und Muskelsschmerzen zu lindern.", "So dehnst du Rücken und Muskulatur in deinem Tempo."),
    ("und kann Rückenbeschwerden lindern", "und entlastet den unteren Rücken beim Sitzen"),
    ("um Nackenbeschwerden zu lindern und die Halswirbelsäule zu stützen", "um den Nacken beim Sitzen und Reisen zu stützen"),
    ("Ideal zur Linderung von Nacken- und Kopfschmerzen", "Stützt den Nacken unterwegs"),
    ("stützen die Halswirbelsäule und lindern Ermüdung", "stützen den Nacken bequem"),
    ("um Beschwerden zu lindern und die Erholung zu fördern", "und angenehm kühlt oder wärmt"),
    ("um den Steissbereich zu entlasten und Beschwerden zu lindern", "um den Steissbereich beim Sitzen zu entlasten"),
    ("lindert Schmerzen im Nacken, an den Schultern und am Rücken durch", "massiert Nacken, Schultern und Rücken durch"),
    ("Die negativen Ionen können den Stoffwechsel fördern, Zellen aktivieren und Reisekrankheit lindern.", "Der kleine Ionisator arbeitet lautlos und ohne Filter."),
    ("<li>Kann Stoffwechsel fördern und Zellen aktivieren</li>", "<li>Lautlos, ohne Filterwechsel</li>"),
    ("<li>Linderung von Reisekrankheit</li>", "<li>Leicht und tragbar</li>"),
    ("um Beschwerden zu lindern und eine gesunde Sitzhaltung zu fördern", "um den Sitz zu entlasten und eine gesunde Sitzhaltung zu fördern"),
    ("Es ist ideal, um Nacken- und Schulterschmerzen zu lindern, den Schädel zu fixieren und die Wahrscheinlichkeit eines steifen Nackens zu reduzieren.", "Es bettet den Kopf weich und stützt den Nacken in Rückenlage."),
    ("lindert Nackenschmerzen effektiv", "massiert den Nacken mit sanften Impulsen"),
    ("Linderung von Nackenschmerzen durch Niederfrequenz-Pulstechnologie", "Nackenmassage durch Niederfrequenz-Pulstechnologie"),
    ("<li>Hilft, Schulter- und Rückenschmerzen zu lindern</li>", "<li>Entlastet Schultern und Rücken beim Laufen</li>"),
    ("und Nackenbeschwerden lindern möchten", "und den Nacken beim Schlafen stützen möchten"),
    ("um die Durchblutung zu fördern und Müdigkeit zu lindern, während", "um die Muskulatur zu stimulieren, während"),
    ("Fördert die Durchblutung und lindert Müdigkeit", "Stimuliert die Muskulatur mit sanften Impulsen"),
    ("lindert Stress, Schmerzen und Muskelverspannungen", "hilft beim Entspannen nach einem langen Tag"),
    ("Linderung von Stress, Schmerzen und Muskelverspannungen", "Zum Entspannen nach einem langen Tag"),
    ("Sie hilft, Zahnfleischschwund vorzubeugen, fördert die Durchblutung des Zahnfleischs und reduziert das Risiko von Parodontalerkrankungen.", "Sie reinigt Zähne und Zahnfleischrand in einem Durchgang."),
    ("Fördert die Durchblutung und beugt Zahnfleischschwund vor", "Reinigt Zähne und Zahnfleischrand in einem Durchgang"),
    ("kann es die Gelenkschmerzen lindern, die Entzündung reduzieren, das Knorpelgewebe wiederherstellen und die Beweglichkeit verbessern", "unterstützt es die Beweglichkeit des Hundes"),
    ("und Verspannungen sowie Steifheit effektiv zu lindern", "und die Kopfhaut angenehm zu massieren"),
    ("Reduziert schnell Muskelkater und Steifheit", "Angenehme Kopfhautmassage"),
    ("um Schwellungen zu reduzieren oder die Durchblutung zu fördern und sorgt", "zum Kühlen oder Wärmen und sorgt"),
    ("ihre Zahnungsbeschwerden zu lindern", "beim Zahnen darauf herumzukauen"),
    ("Diese Inhaltsstoffe lindern Beschwerden, die durch empfindliche oder fettige Kopfhaut verursacht werden können, und fördern die allgemeine Gesundheit der Kopfhaut.", "Diese Inhaltsstoffe sind auf empfindliche und fettige Kopfhaut abgestimmt."),
    ("Extrakt aus Basilikumblättern hat entzündungshemmende Eigenschaften.", "Extrakt aus Basilikumblättern beruhigt die Haut."),
    ("<li>Kann gegen Schnarchen wirken</li>", "<li>Sitzt auch nachts bequem</li>"),
    ("was das Haarwachstum unterstützen kann", "was sich angenehm anfühlt"),
    ("Zudem hilft sie, Haarausfall zu mindern.", "Zudem schont sie das Haar im Schlaf."),
    ("hilft die doppellagige Konstruktion, Haarausfall zu reduzieren und die Vitalität Ihres Haares zu bewahren", "schont die doppellagige Konstruktion dein Haar im Schlaf"),
    ("Doppellagiges Design reduziert Haarausfall", "Doppellagiges Design schont das Haar"),
    ("Fördert die Haargesundheit und beugt Haarausfall vor", "Pflegt Haar und Kopfhaut"),
    ("und reduziert Haarausfall. ", "und schont das Haar. "),
    ("Reduziert Haarausfall und sorgt für langanhaltende Form", "Schont das Haar und sorgt für langanhaltende Form"),
    ("Wirkt Haarausfall entgegen", "Macht das Haar geschmeidig"),
    ("und spiritueller Heilung", "und innerer Ruhe"),
    ("Fördert Zen und meditative Heilung", "Für Meditation und Entspannung"),
    ("Ideal für Meditation, Heilung und musikalische Erkundung", "Ideal für Meditation, Entspannung und musikalische Erkundung"),
    ("sind auf Gewichtsverlust und Schlankheit ausgelegt", "sind auf eine schlanke Silhouette ausgelegt"),
    ("Die Kompressionsunterstützung fördert die Durchblutung und stabilisiert die Muskulatur.", "Die Kompression stützt die Muskulatur beim Training."),
    ("Die Formulierung zielt darauf ab, Beschwerden zu lindern und das Wohlbefinden der Gelenke zu unterstützen.", "Die Formulierung pflegt die Haut rund um die Gelenke."),
    ("und somit die Verdauung zu fördern", "und das Fressen zu entschleunigen"),
    ("und so die Verdauung zu fördern", "und das Fressen zu entschleunigen"),
    ("Fördert Durchblutung, lockert Verspannungen und unterstützt Fettverbrennung", "Massiert die Haut und lockert die Muskulatur"),
    ("Fördert die Durchblutung und bietet eine massageähnliche Wirkung", "Bietet eine massageähnliche Wirkung"),
    ("Es dient als Fettverbrennungsgerät.", "Es dient als Massagegerät."),
    # Runde 3 (22.09., die letzten Offenen)
    ("Lindert Beschwerden bei empfindlicher und fettiger Kopfhaut.", "Für empfindliche und fettige Kopfhaut geeignet."),
    ("<li>Lindert Beschwerden wie Verspannungen und Schmerzen</li>", "<li>Stützt den Nacken in geneigter Haltung</li>"),
    ("Die sanfte Massagestimulation fördert die Durchblutung, was zur Straffung und Geschmeidigkeit der Haut beitragen kann.", "Die sanfte Massage fühlt sich auf der Kopfhaut angenehm an."),
    ("<li>Fördert die Durchblutung für straffere und weichere Haut</li>", "<li>Sanfte Massage für die Kopfhaut</li>"),
    ("und fördert die Durchblutung sowie die Entspannung der Gesichtsmuskulatur", "und entspannt die Gesichtsmuskulatur"),
    ("nährt es die Kopfhaut und fördert die Durchblutung.", "pflegt es die Kopfhaut beim Einmassieren."),
    ("und reduziert Haarausfall.", "und schont das Haar."),
    ("und verhindern Haarausfall, was", "und verlieren keine Härchen, was"),
    ("was die Verdauung fördern kann", "was das Fressen entschleunigt"),
    ("fördert eine gesunde Darmflora und staerkt das Immunsystem", "ergänzt das tägliche Futter"),
    ("<li>Unterstützt die Verdauungsgesundheit und das Immunsystem</li>", "<li>Ergänzung zum täglichen Futter</li>"),
    ("wird das Immunsystem unterstützt und die Herzgesundheit gefördert", "ergänzen sie das tägliche Futter"),
    ("<li>Fördert das Immunsystem und die Herzgesundheit</li>", "<li>Ergänzung zum täglichen Futter</li>"),
    ("die den Heilungsprozess fördert, ohne", "die das Lecken verhindert, ohne"),
]

# Regex-Ersatz fuer wiederkehrende Formen (nur wo jede Lesart des Satzes sauber bleibt; 22.09.).
ERSATZ_RE = [
    (re.compile(r"Fettverbrennung"), "Ausdauer"),                       # «Ganzkörpertraining und Ausdauer», «deine Ausdauer zu steigern»
    (re.compile(r"Gewichtsabnahme"), "Beweglichkeit"),
    (re.compile(r"Gewichtsverlust"), "Körperformung"),
    (re.compile(r"[Ff]ördert die Durchblutung(?: der Haut| der Kopfhaut)?(?= und)"), "Massiert sanft"),
    (re.compile(r"<li>Fördert die Durchblutung(?: der Haut| der Kopfhaut)?</li>"), "<li>Sanfte Massagewirkung</li>"),
    (re.compile(r"(?:kann |könnte )?die Durchblutung (?:zu )?fördern"), "die Haut sanft massieren"),
    (re.compile(r"die Haut sanft massieren und (?=die Feuchtigkeitsversorgung)"), "die Haut sanft massieren und "),
]
ERSATZ += [
    # 25.09.2026 Krankheitsbezug (Akne/Narben/Chloasma/Krampfadern), 28 aktive Produkte, jede Phrase am ganzen Satz gelesen
    # (dropship/KRANKHEITSBEZUG-2026-09-25.md). Abdecken bleibt Kosmetik (Wort ersetzt); behandeln/bekämpfen → Pflege/Reinigung.
    ('kaschiert zuverlässig dunkle Augenringe, Akne und andere Hautunreinheiten', 'kaschiert zuverlässig dunkle Augenringe, Pickel und andere Hautunreinheiten'),
    ('Sie hilft, das Erscheinungsbild von Schwangerschaftsstreifen und alten Narben zu mindern und verbessert raue, fahle Haut.', 'Sie pflegt die Haut an Stellen mit Dehnungsstreifen und macht raue, fahle Haut geschmeidiger.'),
    ('Effektive Reparatur von Schwangerschaftsstreifen und alten Narben', 'Pflege für Haut mit Dehnungsstreifen'),
    ("Das Men's Special Oil Control Blackhead Removing Acne Facial Cleanser ist ein universeller Gesichtsreiniger für Männer, der für die Entfernung von Kopfhaut und Akne geeignet ist.", 'Dieser universelle Gesichtsreiniger für Männer ist für fettige Haut mit Mitessern und Pickeln gedacht.'),
    ('<li>Keine speziellen Kosmetikzwecke</li>\n', ''),
    ('speziell für zu Akne neigende Haut entwickelt', 'speziell für zu Unreinheiten neigende Haut entwickelt'),
    ('Diese Akne-Patches wurden speziell für die Anwendung über Nacht entwickelt, um gezielt Hautunreinheiten zu behandeln', 'Diese Pickelpatches wurden speziell für die Anwendung über Nacht entwickelt und decken einzelne Hautunreinheiten ab'),
    ('unterstützt sie die Regeneration der Haut und hilft, das Erscheinungsbild von Narben zu verbessern', 'pflegt sie die Haut und spendet Feuchtigkeit'),
    ('Unterstützt die Hautregeneration und hilft, Narben zu verblassen', 'Zieht gut ein und hinterlässt ein gepflegtes Hautgefühl'),
    ('Poren zu reinigen, Akne und Mitesser zu entfernen', 'Poren zu reinigen und Mitesser zu entfernen'),
    ('Es entfernt effektiv Mitesser, Akne und andere Unreinheiten', 'Es entfernt effektiv Mitesser und andere Unreinheiten'),
    ('Entfernt Mitesser und Akne', 'Entfernt Mitesser'),
    ('hilft es, Mitesser, Akne und überschüssiges Hautfett effektiv zu entfernen', 'hilft es, Mitesser und überschüssiges Hautfett zu entfernen'),
    ('Dieses Gerät zur Entfernung von Mitessern und Akne nutzt', 'Dieses Gerät zur Entfernung von Mitessern nutzt'),
    ('Es entfernt effektiv Fett, Mitesser und Akne und sorgt', 'Es entfernt Fett und Mitesser und sorgt'),
    ('Entfernt Fett, Mitesser, Akne und Weissköpfchen', 'Entfernt Fett, Mitesser und Weissköpfchen'),
    ('Die Creme ist speziell für die Pflege von Haut mit Chloasma und Sommersprossen entwickelt.', 'Die Creme ist für die Pflege von Haut mit Sommersprossen und ungleichmässigem Teint entwickelt.'),
    ('reduziert Hautunreinheiten wie Mitesser und Akne', 'reduziert Hautunreinheiten wie Mitesser und Pickel'),
    ('Akne-Male ab', 'Pickelmale ab'),
    ('Sommersprossen und Akne-Malen', 'Sommersprossen und Pickelmalen'),
    ('speziell für die Pflege von zu Akne neigender Haut entwickelt und bietet eine gezielte Behandlung für verschiedene Körperbereiche', 'speziell für die Pflege von zu Unreinheiten neigender Haut entwickelt und bietet Pflege für verschiedene Körperbereiche'),
    ('Taillen-Akne-Gel', 'Taillen-Pflegegel'),
    ('Hüft-Akne-Creme', 'Hüft-Pflegecreme'),
    ('Rücken-Akne-Patch', 'Rücken-Pflegepatch'),
    ('Dieses umfassende Anti-Akne Pflegeset wurde speziell entwickelt', 'Dieses umfassende Pflegeset wurde speziell entwickelt'),
    ('wirken synergetisch, um Akne zu bekämpfen und die Hautbarriere zu stärken', 'sind aufeinander abgestimmt und pflegen die Hautbarriere'),
    ('Falten zu reduzieren, Akne zu bekämpfen und Pigmentflecken aufzuhellen', 'das Hautbild zu verfeinern und den Teint aufzuhellen'),
    ('Reduziert Falten und bekämpft Akne', 'Verfeinert das Hautbild'),
    ('Hilft bei der Minderung von Akne und Aknemalen', 'Pflegt Haut mit Unreinheiten und Pickelmalen'),
    (' und gleichzeitig Bakterienwachstum um über 99% hemmen', ''),
    ('Er ist besonders geeignet für Personen mit trockener Haut, Akne, empfindlicher Haut sowie nach medizinischen Behandlungen oder bei Milbenallergien.', 'Er fühlt sich besonders auf trockener und empfindlicher Haut angenehm an.'),
    ('<li>Hemmt Bakterienwachstum um über 99%</li>\n', ''),
    ('Ideal für trockene Haut, Akne, empfindliche Haut, nach medizinischen Behandlungen und bei Milbenallergie', 'Angenehm für trockene und empfindliche Haut'),
    ('Hilft, Falten zu reduzieren und Akne zu klären', 'Pflegt die Haut und verfeinert das Hautbild'),
    ('Verbessert das Hautbild und mildert Narben', 'Für ein ebenmässigeres Hautbild'),
    ('Drei Intensitätsstufen für individuelle Behandlungen', 'Drei Intensitätsstufen für individuelle Anwendungen'),
    ('Mitesser, Komedonen und Akne effektiv zu entfernen', 'Mitesser und Komedonen zu entfernen'),
    ('Zur Entfernung von Mitessern, Pickeln und Akne', 'Zur Entfernung von Mitessern und Pickeln'),
    ('das Erscheinungsbild von Akne und Hautunreinheiten zu verbessern', 'das Erscheinungsbild von Hautunreinheiten zu verbessern'),
    ('Mischhaut oder zu Akne neigend', 'Mischhaut oder zu Unreinheiten neigend'),
    ('Unterstützt die Entfernung von Akne und Hautunreinheiten', 'Unterstützt die Reinigung bei Hautunreinheiten'),
    ('Zusätzlich kann es zur Linderung von Müdigkeit und zur Reduzierung von Falten eingesetzt werden.', 'Die Vibrationsmassage wirkt dabei angenehm belebend.'),
    ('Hilft bei der Reduzierung von Falten und lindert Müdigkeit', 'Belebende Vibrationsmassage'),
    ('Mitesser und Akne effektiv zu entfernen', 'Mitesser zu entfernen'),
    ('Diese Creme wurde entwickelt, um das Erscheinungsbild von Besenreisern und Krampfadern zu mindern.', 'Diese Creme pflegt müde, beanspruchte Beine.'),
    ('Reduziert das Erscheinungsbild von Krampfadern', 'Erfrischendes Pflegegefühl für die Beine'),
    ('Verbessert das Erscheinungsbild von Hautunreinheiten und Narben', 'Pflegt Haut mit Unreinheiten'),
]
# 22.09.2026 (Verbesserungsrunde): TITEL wurden bisher nur GEMELDET, nie geschrieben — drei «Fettverbrennung»-Titel standen
# seit dem Morgen offen. Titel brauchen eigene Ersätze (ERSATZ_RE «Fettverbrennung→Ausdauer» ergibt im Titel Unsinn:
# «Massage mit Ausdauer»). Feste Paare zuerst, danach vorsichtige Muster; passt nichts, bleibt der Titel offen im Bericht.
TITEL_ERSATZ = [
    # 25.09.2026: Krankheitsbegriffe im Titel (Akne/Narben/Chloasma/Hallux) — Kosmetik darf keine Krankheit behandeln (VKos);
    # Titel stehen auf Google, in der Suche und auf jeder Karte. Ersatz beschreibt Hauttyp/Passform, keine Wirkung.
    ("Grüner Tee-Klebepflege mit Akne- und Fettkontrolle", "Grüner Tee-Klebepflege für unreine, glänzende Haut"),
    ("Elektrischer Mitesser- und Akne-Sauger", "Elektrischer Mitesser-Sauger"),
    ("Teebaum Akne Gesichtstonic", "Teebaum Gesichtstonic für unreine Haut"),
    ("Nacht-Akne-Patches mit Teebaumöl", "Nacht-Pickelpatches mit Teebaumöl"),
    ("Akne Hautpflege-Set", "Hautpflege-Set für unreine Haut"),
    ("Anti-Akne Pflegeset für strahlende Haut", "Pflegeset für unreine Haut"),
    ("Hautregenerationscreme 50g gegen Narben", "Pflegende Hautcreme · 50 g"),
    ("Creme für Chloasma und Sommersprossen", "Gesichtscreme für einen ebenmässigen Teint"),
    ("Weite Damen-Schuhe für Hallux-Valgus", "Weite Damen-Schuhe mit breitem Vorfussbereich"),
    ("Schwarzer Kopfhaut-Entferner für Männer", "Mitesser-Gesichtsreiniger für Männer"),
    ("Vakuum-Cupping-Massage mit Fettverbrennung & Anti-Cellulite", "Vakuum-Cupping-Massagegerät für Körper & Haut"),
    ("Körperformungsgerät zur Fettverbrennung", "Körperformungsgerät für das Training zuhause"),
    ("Smartes Springseil für Fitness & Fettverbrennung", "Smartes Springseil für Fitness & Ausdauer"),
]
TITEL_ERSATZ_RE = [
    (re.compile(r" für Fitness & Fettverbrennung$"), " für Fitness & Ausdauer"),
    (re.compile(r" zur Fettverbrennung$"), " für das Training"),
    (re.compile(r" (?:mit|&|und) Fettverbrennung$"), ""),
    (re.compile(r" (?:gegen|bei) Haarausfall$"), " für die Kopfhaut"),
    (re.compile(r" (?:für|zur) Gewichtsabnahme$"), " für das Training"),
]
ERSATZ += [
    # Anti-Schnarch-Gerät (22.09.): «gestört werden» beschreibt die Nutzerinnen, keine Wirkung → FEHLALARM;
    # «Physische Wirkweise zur Reduzierung von Schnarchen» ist eine Wirkzusage → Bauweise ohne Wirkung
    ("Physische Wirkweise zur Reduzierung von Schnarchen", "Mechanische Bauweise, die die Kiefer- und Kopfposition in der Nacht unterstützt"),
]
# 23.09.2026 Vollscan (50'007 aktive): Substantiv-Formen «Linderung von …», «Schmerzlinderung», Schlaf/Angst — jede Zeile
# von Hand am ganzen Satz gelesen (dropship/HEILVERSPRECHEN-NEUE-KLASSEN.md); Ersatz beschreibt Bauweise/Anwendung, keine Wirkung.
ERSATZ += [
    ("wurde speziell zur Linderung von Schmerzen im Bereich der Taille und des Uterus entwickelt", "wurde speziell für wohlige Wärme im Bereich von Taille und Unterleib entwickelt"),
    ("Gezielte Schmerzlinderung durch Infrarot- und Rotlichttherapie", "Gezielte Wärme durch Infrarot- und Rotlicht"),
    ("wurde speziell für die Linderung von Beschwerden im unteren Rückenbereich sowie zur Erwärmung des Unterleibs entwickelt", "wurde speziell zur Erwärmung des unteren Rückens und des Unterleibs entwickelt"),
    ("das speziell für die Linderung von Beschwerden im Nacken- und Schulterbereich entwickelt wurde", "das speziell für die Massage im Nacken- und Schulterbereich entwickelt wurde"),
    ("bietet portable Schmerzlinderung und Wärme", "bietet portable Wärme"),
    ("Es ist ideal zur Entspannung und Linderung von Verspannungen im Nacken- und Rückenbereich", "Es ist ideal zur Entspannung im Nacken- und Rückenbereich"),
    ("Es fördert eine bessere Haltung und kann präventiv sowie zur Linderung bestehender Beschwerden eingesetzt werden.", "Es unterstützt eine aufrechte Haltung im Alltag."),
    ("Es ist ideal zur Verbesserung und Linderung von Schmerzen und Ermüdung in Schultern und Nacken sowie bei einem sogenannten Witwenbuckel.", "Es eignet sich für entspannende Massagen an Schultern und Nacken."),
    ("zur Linderung von Beschwerden oder zur Steigerung des Wohlbefindens", "für kühlende oder wärmende Anwendungen und mehr Wohlbefinden"),
    ("Niederfrequenz-Pulstechnologie zur Schmerzlinderung", "Niederfrequenz-Pulstechnologie für die Massage"),
    ("Integrierte Wärmekompresse zur Linderung von Verspannungen", "Integrierte Wärmekompresse für mehr Entspannung"),
    ("Ideal zur Linderung von Beschwerden oder einfach für zusätzlichen Komfort an kühleren Tagen.", "Ideal für zusätzlichen Komfort und Wärme an kühleren Tagen."),
    ("Diese Smartwatch wurde speziell zur Verbesserung der Schlafqualität entwickelt und hilft dir, Schlaflosigkeit zu überwinden.", "Diese Smartwatch zeichnet deinen Schlaf auf und hilft dir, deine Schlafgewohnheiten im Blick zu behalten."),
    ("Lindert Nacken- und Schulterschmerzen", "Stützt Nacken und Schultern"),
    ("Ideal zur Linderung von Beschwerden nach dem Sport oder bei alltäglichen Belastungen.", "Ideal zum Kühlen oder Wärmen nach dem Sport oder bei alltäglichen Belastungen."),
    ("Vibrationsmassage zur Linderung von Schmerzen und Muskelentspannung", "Vibrationsmassage für entspannte Muskeln"),
    (", zur Förderung der Regeneration oder einfach zur Linderung von Verspannungen im Alltag.", " oder einfach für eine entspannte Pause im Alltag."),
    ("Es ist ideal für den Einsatz nach dem Sport oder zur Linderung von Verspannungen im Alltag.", "Es ist ideal für den Einsatz nach dem Sport oder für eine entspannte Pause im Alltag."),
    ("Lindert Angstzustände", "Sorgt für Abwechslung"),
    ("Ideal zur Förderung der Durchblutung, Lymphdrainage und zur Linderung von Verspannungen.", "Ideal für eine wohltuende Massage von Körper und Haut."),
    ("Ob zur Linderung kleinerer Beschwerden, zur Stärkung des Geistes oder zur Unterstützung der Raumluftreinigung – diese Öle sind eine Bereicherung für jede Hausapotheke.", "Ob im Diffusor, im Bad oder für ein angenehmes Raumklima – diese Duftöle sind eine schöne Ergänzung für dein Zuhause."),
    ("Es ist ideal für entspannende Momente zu Hause oder zur Linderung von Verspannungen.", "Es ist ideal für entspannende Momente zu Hause."),
    ("kann er zur Linderung von Beschwerden im Lendenbereich beitragen und unterstützt gleichzeitig", "sorgt er für wohlige Wärme im Lendenbereich und unterstützt gleichzeitig"),
]
ERSATZ.sort(key=lambda p: -len(p[0]))

MUSTER = re.compile(
    r"Schmerz\w* (?:zu )?lindern|lindert \w*[Ss]chmerz|schmerzlindernd|Heilungsprozess|\bheilt\b|\bHeilung\b"
    r"|Haarausfall|Haarwachstum|Schnarchen|entzündungshemmend|Gewichtsverlust|Fettverbrennung|Fett verbrenn"
    r"|Cellulite (?:reduz|bekämpf|entfern)|(?:beim|das) Abnehmen|Blutdruck|Migräne|Arthr(?:ose|itis)|Rheuma"
    r"|Diabetes|Immunsystem|Entgift|\bDetox\b|Beschwerden (?:zu )?lindern|lindert Beschwerden"
    r"|Verdauung (?:zu )?fördern|Durchblutung (?:zu )?fördern|fördert die Durchblutung|Schmerztherapie"
    r"|medizinisch(?:e|er|es)? (?:Wirkung|Behandlung|Zweck)|gegen \w*schmerzen"
    # 23.09.2026 (Herbst-Pruefung + Vollscan 50'007): Substantiv-Formen und Atemwege/Schlaf fehlten — ein Diffusor
    # «erleichtert das Atmen bei Erkältungen … lindert Husten und Nebenhöhlenverstopfung» lief am Waechter vorbei.
    r"|Schmerzlinderung|Linderung (?:von |der )?(?:\w+ )?(?:Schmerz|Beschwerd|Verspannung)|lindert (?:Nacken|Rücken|Kopf|Muskel|Gelenk)\w*"
    r"|erleichtert (?:das|die) Atm|Nebenhöhle|Nasennebenhöhle|lindert \w*[Hh]usten|\bbei (?:Erkältung|Grippe|Husten|Asthma)"
    r"|Schlaflosigkeit (?:zu )?(?:überwinden|bekämpfen|lindern)|bei Schlafstörungen (?:zu )?helfen|gegen Schlafstörungen"
    r"|beugt Kopfverformung|Depression|Angstzuständ"
    # 25.09.2026: Hautkrankheiten/Krankheitsbilder mit WORTGRENZE — ohne sie trafen «S-chwarze» (warze) und «Voll-narbe-nleder»
    # 138 von 150 Titeln (Kanarienvögel im Trockenlauf).
    r"|\b(?:Akne|Narben|Chloasma|Melasma|Neurodermitis|Psoriasis|Schuppenflechte|Ekzem\w*|Nagelpilz|Fu(?:ss|ß)pilz|Krampfadern)\b|Anti-Akne|Akne-", re.I)
FEHLALARM = re.compile(
    r"Bezug abnehmen|l[äa]sst sich \w* ?abnehmen|anbringen und \w* ?abnehmen|Anbringen und Abnehmen"
    r"|Ratgeber:|nicht für medizinische|selbst heilt|Spezialeffekt|Kunstblut|Halloween|Wundschminke|Beschaffenheit des Holzes|Digital Detox|Geräusche wie|schnarchende|durch Schnarchen gestört"
    # Tiere: Wundkragen (Heilung nach OP ist der Zweck), Fellbuersten/Plueschtiere/Pinsel (Haarausfall = Haare im Haus/Borsten),
    # Naepfe (Tiere mit Arthritis), Ergaenzungsfutter (Verdauung/Immunsystem beim Tier)
    r"|leck|Wunde|Operation|Halskrause|Kragen|Halsring|Genesung|Borsten|Pinsel|Plüsch|haarausfallfrei|Fell|Katze|Hund|Haustier|Tier|Vierbeiner|Zuhause|Wohnung|im Haus"
    # Smartwatch-Funktion, keine Heilzusage
    r"|Messung|misst|Überwachung|erfassen|Monitoring|Blutsauerstoff"
    r"|Erste-Hilfe|Insekten", re.I)


def gql(q, v=None):
    a = ["curl", "-s", "--max-time", "90", "-X", "POST", URL, "-H", "X-Shopify-Access-Token: " + TOK,
         "-H", "Content-Type: application/json", "-d", json.dumps({"query": q, "variables": v or {}})]
    grund = "unbekannt"   # 22.09.: der Grund gehoert in die Fehlermeldung (Lehre 17.09., Regel «grund-verschluckt»)
    for versuch in range(5):
        out = subprocess.run(a, capture_output=True, text=True).stdout
        try:
            d = json.loads(out)
        except Exception as e:
            grund = f"kein JSON ({type(e).__name__}): {out[:80]!r}"; time.sleep(3 * (versuch + 1)); continue
        if d.get("errors") and any("THROTTLED" in str(e) for e in d["errors"]):
            grund = "THROTTLED"; time.sleep(6); continue
        return d
    raise RuntimeError(f"Shopify antwortet nicht (5 Versuche) — letzter Grund: {grund}")


def sha(t):
    return hashlib.sha1((t or "").encode()).hexdigest()[:12]


def main():
    heute = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    seit = ""
    if not VOLL and os.path.exists(SEIT_DATEI):
        seit = open(SEIT_DATEI).read().strip()
    ledger = {}
    if os.path.exists(LEDGER):
        for l in open(LEDGER):
            t = l.rstrip("\n").split("\t")
            if len(t) >= 2: ledger[t[0]] = t[1] if (len(t) < 4 or "offen" not in t[3]) else "offen"  # offene erneut pruefen
    q = "status:active" + (f" updated_at:>{seit}" if seit else "")
    cur = None; seiten = 0; geprueft = 0; fixe = 0; meld = []; fehler = 0
    NUR_OFFEN = os.environ.get("NUR_OFFEN") == "1"
    offene = [i for i, v in ledger.items() if v == "offen"] if NUR_OFFEN else []
    if NUR_OFFEN: q = f"NUR_OFFEN ({len(offene)})"
    while seiten < CAP:
        if NUR_OFFEN:
            if seiten: break
            ids = offene[:250 * 4]
            d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id handle title descriptionHtml status}}}', {"ids": ids})
            pg = {"nodes": [n for n in (d.get("data") or {}).get("nodes") or [] if n and n.get("status") == "ACTIVE"], "pageInfo": {"hasNextPage": False}}
        else:
            d = gql('query($q:String!,$c:String){products(first:250,query:$q,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle title descriptionHtml}}}', {"q": q, "c": cur})
            if "data" not in d:
                raise RuntimeError(f"Antwort ohne data: {str(d)[:300]}")
            pg = d["data"]["products"]
        seiten += 1
        for p in pg["nodes"]:
            html = p["descriptionHtml"] or ""
            geprueft += 1
            if ledger.get(p["id"]) == sha(html):
                continue
            neu = html
            for a, b in ERSATZ:
                if a in neu: neu = neu.replace(a, b)
            for rx, b in ERSATZ_RE:
                neu = rx.sub(b, neu)
            neu = neu.replace("massieren zu ", "zu massieren ")
            aktion = "sauber"
            if neu != html and FIX:
                r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}', {"i": {"id": p["id"], "descriptionHtml": neu}})
                pu = (r.get("data") or {}).get("productUpdate") or {}
                if pu.get("userErrors") or (pu.get("product") or {}).get("descriptionHtml") != neu:
                    fehler += 1; print("⛔ nicht geschrieben", p["handle"], pu.get("userErrors")); continue
                html = neu; fixe += 1; aktion = "entschaerft"
                print("✔", p["handle"])
            txt = re.sub(r"<[^>]+>", " ", html)
            rest = []
            for m in MUSTER.finditer(txt):
                umfeld = txt[max(0, m.start() - 60):m.end() + 60]
                if FEHLALARM.search(umfeld): continue
                if re.search(r"(?i)(aroma|licht|photon|farb|rotlicht|ems|wärme|kälte|puls)-?therap", m.group(0)): continue
                rest.append(re.sub(r"\s+", " ", umfeld).strip())
            tm = MUSTER.search(p["title"] or "")
            if tm and not FEHLALARM.search(p["title"]):
                titel_neu = p["title"]
                for a, b in TITEL_ERSATZ:
                    if a == titel_neu: titel_neu = b
                if titel_neu == p["title"]:
                    for rx, b in TITEL_ERSATZ_RE:
                        titel_neu = rx.sub(b, titel_neu)
                if titel_neu != p["title"] and not MUSTER.search(titel_neu) and FIX:
                    r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{title} userErrors{message}}}', {"i": {"id": p["id"], "title": titel_neu}})
                    pu = (r.get("data") or {}).get("productUpdate") or {}
                    if pu.get("userErrors") or (pu.get("product") or {}).get("title") != titel_neu:
                        fehler += 1; print("⛔ Titel nicht geschrieben", p["handle"], pu.get("userErrors")); rest.append("TITEL: " + p["title"])
                    else:
                        fixe += 1; aktion = "entschaerft"; print("✔ Titel", p["handle"], "→", titel_neu)
                else:
                    rest.append("TITEL: " + p["title"])
            if rest:
                meld.append((p["handle"], p["title"], rest[:3])); aktion += "+offen"
            with open(LEDGER, "a") as f:
                f.write(f'{p["id"]}\t{sha(html)}\t{heute[:10]}\t{aktion}\n')
        if not pg["pageInfo"]["hasNextPage"]: break
        cur = pg["pageInfo"]["endCursor"]
    if geprueft == 0 and not seit:
        raise RuntimeError("0 Produkte geprueft ohne Zeitfilter — Abfrage/Berechtigung kaputt, KEIN Urteil")
    with open(BERICHT, "w") as f:
        f.write(f"# Heilversprechen in Produkttexten — Stand {heute}\n\n")
        f.write(f"Geprüft: {geprueft} (Filter: `{q}`) · entschärft: {fixe} · offen: {len(meld)} · Schreibfehler: {fehler}\n\n")
        f.write("Offen = Muster getroffen, aber keine geprüfte Ersatzphrase. Satz lesen, Ersatz in `ERSATZ` eintragen, nächster Lauf schreibt.\n\n")
        for h, t, r in meld:
            f.write(f"- **{t}** (`{h}`)\n")
            for s in r: f.write(f"  - …{s}…\n")
    if seiten < CAP:
        open(SEIT_DATEI, "w").write(heute)
    print(f"FERTIG: {geprueft} geprüft ({seiten} Seiten, seit={seit or 'ALLE'}), {fixe} entschärft, {len(meld)} offen, {fehler} Fehler")
    if fehler: sys.exit(1)


if __name__ == "__main__":
    main()
