#!/usr/bin/env python3
"""Handschrift-Runde Teil 2: die Texte von traumhaus.html.

Was das Skript tut (idempotent — zweimal laufen lassen aendert nichts mehr):
  1. Ortsnamen: generische Marken («Villen Ost») bekommen Namen, die nach einer
     Stadt klingen («Sunnehalde»). Ersetzt wird der EXAKTE String in Anfuehrungs-
     zeichen, weil WORLD_POIS, viertel(), LIEFERZIELE und die Buslinien ueber
     Namensgleichheit verknuepft sind — wer nur die Karte umbenennt, trennt sie.
  2. hint()-Texte: handgeschriebene Fassung fuer ~110 Meldungen (Tabelle unten),
     danach mechanisch: fuehrendes/abschliessendes Emoji weg, «!» wird «.»
     (Ausnahmen: Tor, Alarm, Festhalten — dort ist der Ausruf Inhalt).
  3. Schweizer Schreibung: ß -> ss. «Buergermeister» -> «Stadtpraesident».
  4. Die Sprueche der Passanten: Meinung und Ort statt Smalltalk-Platzhalter.
  5. Der Stick-Hinweis beim Einsteigen kommt nur noch beim ersten Mal.

Aufruf:  python3 spiele-dev/tools/th-texte.py [--check]
  --check  nur zaehlen, nichts schreiben (Exit 1, wenn noch Arbeit offen ist).
"""
import re, sys, pathlib

DATEI = pathlib.Path(__file__).resolve().parents[2] / "traumhaus.html"

# 1 ── Ortsnamen ──────────────────────────────────────────────────────────────
ORTE = {
    '"Villen Ost"':          '"Sunnehalde"',
    '"Villen West"':         '"Rebhalde"',
    '"Gewerbe Ost"':         '"Gewerbe Rietli"',
    '"Stadthaeuser Ost"':    '"Bürgli"',
    '"Vergnuegungsviertel"': '"Chilbiplatz"',
    '"Grosser Park"':        '"Stadtpark"',
    '"Brunnen-Park"':        '"Brunnmatt"',
}

# 2 ── hint()-Texte, von Hand ─────────────────────────────────────────────────
#   Schluessel = das erste String-Literal im hint()-Aufruf, exakt wie in der Datei
#   (inkl. \uD83D-Escapes). Wert = neue Fassung. Angehaengte Teile ("+x+" …")
#   bleiben und werden nur mechanisch bereinigt.
HINTS = {
    r"\uD83D\uDCB8 Zu teuer \u2014 dir fehlen ": "Zu teuer. Dir fehlen ",
    r"\uD83C\uDFE0\u2705 Haus gekauft! Ab morgen: +150 $ Miete pro Tag": "Haus gekauft. Ab morgen 150 $ Miete pro Tag.",
    r"\uD83D\uDE97 Nur der Host kann fahren \u2014 fahrt zusammen mit!": "Nur der Gastgeber fährt. Steig ein.",
    r"\uD83C\uDFE0\uD83D\uDCB0 Mieteinnahmen: +": "Miete: +",
    r"\uD83D\uDE48 Runde abgebrochen": "Runde abgebrochen.",
    r"💸 Zu teuer — dir fehlen ": "Zu teuer. Dir fehlen ",
    r"🏠✅ Haus gekauft! Ab morgen: +150 $ Miete pro Tag": "Haus gekauft. Ab morgen 150 $ Miete pro Tag.",
    "🎆 Stadtfest am See! Lampions, Feuerwerk — kommt vorbei!": "Stadtfest am See. Lampions ab acht, Feuerwerk um zehn.",
    "🎆 Festlaune! +Spaß": "Festlaune. +Spass",
    "⛲ Erfrischung am Brunnen! +Laune": "Kalt und klar, Brunnenwasser. +Laune",
    "🦆👫 Zu zweit gefüttert — der ganze Schwarm kommt! +Laune": "Zu zweit gefüttert. Jetzt kommt der ganze Schwarm. +Laune",
    "🦆 Die Enten kommen angeschwommen!": "Die Enten haben dich gesehen.",
    "💃 Tanzfläche — tippen und tanzen!": "Tanzfläche. Tippen im Takt.",
    "🍦 Eis kostet 3 $ — zu wenig Geld": "Eine Kugel kostet 3 $. So viel hast du nicht.",
    "🍦 Eine Kugel für alle! −3 $": "Eine Kugel für alle. −3 $",
    "🏁 Anpfiff — neues Spiel!": "Anpfiff.",
    "⚽ TOOOR! Stand ": "Tor! Stand ",
    "🏁 Hetze laeuft — ": "Hetze läuft. ",
    "🎯 Mission geschafft: ": "Mission erledigt: ",
    "🏆 Alle Tages-Missionen geschafft! Bonus +": "Alle Tagesmissionen erledigt. Bonus +",
    "↔️ Umgestellt!": "Umgestellt.",
    "⭐⭐ Ist schon Maximal-Stufe!": "Höher geht nicht.",
    "📦 Geschafft! Das Sperrgut steht.": "Das Sperrgut steht.",
    "🙈 VERSTECK DICH! Du hast 20 Sekunden …": "Versteck dich. 20 Sekunden.",
    "🎉 Gefunden! +100 $ — alle haben Spaß!": "Gefunden. +100 $",
    "🙈 Verstecken! Dein Partner hat 20s zum Verstecken …": "Dein Partner hat 20 Sekunden zum Verstecken.",
    "🙈 Mia hat sich versteckt — finde sie! 🔥=nah ❄️=weit": "Mia hat sich versteckt. Warm heisst nah, kalt heisst weit.",
    "🎉 GEFUNDEN! +100 $ und alle haben Spaß!": "Gefunden. +100 $",
    "🔎 Los! Finde deinen Partner — 🔥/❄️ hilft dir": "Finde deinen Partner. Warm heisst nah, kalt heisst weit.",
    "🤝 Sperrgut geht nur zu zweit — lade jemanden in deine Runde ein.": "Sperrgut trägt niemand allein. Lade jemanden in deine Runde ein.",
    "📦 Geschafft! Das Sperrgut steht — +": "Das Sperrgut steht. +",
    "👮 Zwei krumme Dinger an einem Tag reichen — die Stadt ist wachsam!": "Zwei krumme Dinger an einem Tag reichen. Die Stadt schaut jetzt genauer hin.",
    "🥕 Ernte! +": "Geerntet. +",
    r"🚗 Nur der Host kann fahren — fahrt zusammen mit!": "Nur der Gastgeber fährt. Steig ein.",
    "🚗💨 Auto GEKLAUT! Gib Gas — die Polizei kommt! 🚨": "Auto geklaut. Die Polizei ist schon unterwegs.",
    "📦 Feierabend — die Zentrale hat heute keine Auftraege mehr (4/4). Morgen wieder!": "Feierabend. Die Zentrale hat heute nichts mehr (4/4).",
    "📦 Blitz-Lieferung zum ": "Lieferung zum ",
    "📦✅ Geliefert! +": "Geliefert. +",
    "⏱️ Zeit abgelaufen — Lieferung verpasst": "Zeit um. Lieferung verpasst.",
    "🚔 Geschnappt! Busse: −": "Geschnappt. Busse −",
    "🏁 Sauber abgehängt! Fahndung aufgehoben 😎": "Abgehängt. Fahndung aufgehoben.",
    "🏁 Ein Stern weniger — dranbleiben!": "Ein Stern weniger.",
    "💰 Feierabend! +": "Feierabend. +",
    "📜 Auftrag erfüllt! Der Bürgermeister ist unterwegs …": "Auftrag erfüllt. Der Stadtpräsident ist unterwegs.",
    "🤝 Team-Aufgabe geschafft! +": "Zu zweit geschafft. +",
    "📬 Post: eine RECHNUNG … −": "Post. Eine Rechnung, −",
    "📬 Post: ein Geschenk von Oma! +": "Post. Ein Couvert von Oma, +",
    "📬 Post: ein Liebesbrief 💌": "Post. Ein Liebesbrief.",
    "🧓 Frau Krause tratscht über die Nachbarschaft …": "Frau Krause weiss, wer gestern spät heimgekommen ist.",
    "🛒 Überraschungskiste gekauft (100 $) … enthielt ": "Überraschungskiste, 100 $. Drin war: ",
    "🛒 Der fliegende Händler zieht weiter …": "Der fliegende Händler ist weitergezogen.",
    "👮 Die Polizei schaut nochmal vorbei … alle unschuldig pfeifen!": "Die Polizei schaut nochmal vorbei. Alle pfeifen unschuldig.",
    "📋 Der Bauinspektor ist da — er prueft Wert, Bereiche und Komfort …": "Der Bauinspektor ist da. Er prüft Wert, Bereiche und Komfort.",
    "🎖️ Bürgermeister: „Großartig!“ +": "Stadtpräsident: „Sauber gemacht.“ +",
    "🏛️ Der Bürgermeister schaut nur kurz vorbei.": "Der Stadtpräsident bleibt nur kurz.",
    "🧒 Das Nachbarskind kommt zum Spielen!": "Das Nachbarskind kommt zum Spielen.",
    "🧒 Das Nachbarskind klingelt … aber hier wohnen noch keine Kinder.": "Das Nachbarskind klingelt. Hier wohnen noch keine Kinder.",
    "🐈 Eine Streunerkatze schaut vorbei": "Eine Katze schaut vorbei. Sie gehört niemandem, sagt sie.",
    "🎢 Angekommen — gute Fahrt gehabt!": "Angekommen. Die Knie zittern noch.",
    "🎡 Ausgestiegen — hat es Spass gemacht?": "Ausgestiegen.",
    "🏦 Beide an der Bank bleiben — 12 Sekunden!": "Beide bei der Bank bleiben. 12 Sekunden.",
    "👁️ Ego-Modus — nochmal tippen für Übersicht": "Aus den Augen der Figur. Nochmal tippen für die Übersicht.",
    "🧭 Ziel erreicht!": "Ziel erreicht.",
    "🧭 Kein Weg dorthin gefunden": "Dorthin führt kein Weg.",
    "📍 Wegpunkt gesetzt — folge der lila Linie": "Wegpunkt gesetzt. Folge der Linie.",
    "💰 Zu wenig Geld!": "Zu wenig Geld.",
    "Erst eine Wand bauen, dann streichen 🎨": "Erst eine Wand bauen, dann streichen.",
    "💎 Erst verloben — dann heiraten!": "Erst verloben, dann heiraten.",
    "💍 Ihr seid schon verheiratet!": "Ihr seid schon verheiratet.",
    "💒 Kirchliche Traumhochzeit in der Kathedrale! 🔔": "Hochzeit in der Kathedrale. Die Glocken läuten.",
    "🚗 Fahr mit dem Auto in die Werkstatt!": "Fahr mit dem Auto in die Werkstatt.",
    "🎨 Frisch lackiert — die Polizei hat die Spur verloren! 😎": "Frisch lackiert. Die Polizei sucht jetzt die falsche Farbe.",
    "🌱 Erst ernten — dann verkaufen!": "Erst ernten, dann verkaufen.",
    "💰 Zu wenig Geld — 60 $ noetig!": "Zu wenig Geld. 60 $ nötig.",
    "🛍️ Eingekauft! Frische Snacks fuer alle (+Laune)": "Eingekauft. Frische Snacks für alle. +Laune",
    "🐟 Die Fische brauchen eine Pause — komm später wieder!": "Die Fische beissen heute nicht mehr. Komm morgen wieder.",
    "👀 Der passt jetzt auf seine Taschen auf!": "Der passt jetzt auf seine Taschen auf.",
    "👮 Beim POLIZISTEN?! Busse: −": "Beim Polizisten? Busse −",
    "🤏 Zack — Portemonnaie! +": "Portemonnaie. +",
    "💢 Erwischt! ": "Erwischt. ",
    "👑 Hoechste Stufe erreicht — der Palast steht.": "Höchste Stufe. Der Palast steht.",
    "🏅 Naechste Stufe ": "Nächste Stufe ",
    "🚔 Aufgeflogen! Ernte beschlagnahmt, −": "Aufgeflogen. Ernte beschlagnahmt, −",
    "🎸 Für heute ist das Publikum durch — morgen wieder!": "Das Publikum hat für heute genug gehört.",
    "📜 Stadt-Auftrag vom Bürgermeister: ": "Auftrag vom Stadtpräsidenten: ",
    "🔨 Bauen antippen — dann Boden legen, Wände ziehen, Möbel stellen!": "Bauen antippen. Dann Boden legen, Wände ziehen, Möbel stellen.",
    "🎙️ Voice AN — sprich mit deinem Mitspieler!": "Mikrofon an.",
    "💰 Villa kostet 3500 $ — zu wenig Geld!": "Die Villa kostet 3500 $. So viel hast du nicht.",
    "🏰 Kein Platz frei — räume eine 20×14-Fläche frei!": "Kein Platz. Die Villa braucht 20×14 Meter.",
    "🏰 Riesen-Villa gebaut — geh rein! (7 Zimmer, voll möbliert)": "Villa steht. Sieben Zimmer, möbliert. Geh rein.",
    r"🏠💰 Mieteinnahmen: +": "Miete: +",
    "🎯 Neue Tages-Missionen: ": "Heute: ",
    "🏁 SPRINT GEWONNEN — Traumvilla an Tag ": "Sprint gewonnen. Traumvilla an Tag ",
    "🏁 Sprint vorbei — die Villa kam nicht bis Tag 20. Weiter im Klassisch-Modus!": "Sprint vorbei. Die Villa stand nicht bis Tag 20. Weiter im klassischen Modus.",
    "🗺️ Tipp aufs Radar = grosse Weltkarte": "Tipp aufs Radar für die grosse Karte",
    "💰 Verkauft (50% zurück)": "Verkauft. Die Hälfte gibt es zurück.",
    "Abgerissen (50% zurück)": "Abgerissen. Die Hälfte gibt es zurück.",
    "💰 Umlackieren kostet 250 $": "Umlackieren kostet 250 $.",
    "💰 Die Traumhochzeit kostet 800 $": "Die Hochzeit in der Kathedrale kostet 800 $.",
    "🎙️ Voice geht nur im Koop-Spiel": "Das Mikrofon geht nur zu zweit.",
    "🎙️ Verbindung noch nicht bereit — kurz warten": "Verbindung noch nicht bereit. Kurz warten.",
    "🔌 Partner hat das Spiel verlassen — du spielst allein weiter": "Dein Partner ist weg. Du spielst allein weiter.",
    "📦 Lieferung abgebrochen — du bist ausgestiegen": "Lieferung abgebrochen. Du bist ausgestiegen.",
    "🏦 Der grosse Coup geht nur zu zweit — hol dir einen Mitspieler.": "Der grosse Coup geht nur zu zweit.",
    "👌 Alles sauber — keine Fahndung.": "Alles sauber. Keine Fahndung.",
    "🔒 Erst ab Wohnstufe ": "Erst ab Wohnstufe ",
    "🚧 Nur im Baufenster bauen": "Nur im Baufenster bauen.",
    "Hier steht schon etwas": "Hier steht schon etwas.",
    "Da ist kein Platz": "Da ist kein Platz.",
    "Tippe auf den neuen Platz": "Tippe auf den neuen Platz.",
    "💼 Mia ist bei der Arbeit … (bis 17:00)": "Mia ist bei der Arbeit, bis 17 Uhr.",
    "🎙️ Mikrofon vom Browser nicht unterstützt": "Der Browser gibt kein Mikrofon her.",
    "🎙️ Mikrofon-Zugriff verweigert": "Mikrofon-Zugriff verweigert.",
}

# Woerter, in deren Naehe das «!» bleiben darf.
AUSRUF_OK = ("Tor!", "Alarm", "Festhalten")

# 4 ── Passanten ──────────────────────────────────────────────────────────────
NPC_SPRUECHE = [
    "Der Bus kommt seit Jahren drei Minuten zu spät. Ich bin trotzdem jedes Mal überrascht.",
    "Am Seepark haben sie die Bänke neu gestrichen. Grün. Das alte Blau war besser.",
    "Die Baustelle beim Bahnhof? Die war schon da, als ich eingezogen bin.",
    "Kennen Sie das Café hinter der Markthalle? Der Kaffee ist stark, die Wirtin auch.",
    "Mein Hund ist wieder weg. Er geht immer zur Metzgerei, ich hole ihn nachher.",
    "Die Achterbahn hört man bis zu mir nach Hause. Ich habe mich daran gewöhnt. Fast.",
    "Ich suche eine Wohnung. Zwei Zimmer, Balkon, unter tausend. Ja, ich weiss.",
    "Gestern Konzert am Marktplatz. Laut, aber gut. Der Bassist konnte was.",
    "Frau Krause hat schon wieder Kuchen gebracht. Ich glaube, sie will etwas.",
    "Wenn es regnet, riecht die Altstadt nach 1950. Das ist als Kompliment gemeint.",
    "Die Enten am See sind frech geworden. Eine hat mir das Sandwich aus der Hand genommen.",
    "Ich war zwanzig Jahre bei der Bahn. Jetzt schaue ich den Zügen zu. Ist auch Arbeit.",
    "Das Wetter? Wird morgen anders. Mehr weiss der Wetterbericht auch nicht.",
    "Der Stadtpräsident hat wieder ein Band durchgeschnitten. Diesmal für eine Bushaltestelle.",
    "Auf der Sunnehalde kostet ein Haus mehr, als ich in dreissig Jahren verdient habe. Schöne Aussicht, sagen sie.",
    "Beim Brunnen auf der Brunnmatt trinke ich seit der Schulzeit. Schmeckt immer noch gleich.",
]
NPC_AUFTRAEGE = [
    ("Ich habe meinen Schlüssel verloren. Roter Anhänger, falls Sie einen finden.", 120),
    ("Bringen Sie das zur Post? Ich schaffe es vor fünf nicht mehr.", 180),
    ("Meine Oma braucht Hilfe beim Einkauf. Sie redet viel, aber sie zahlt anständig.", 150),
    ("Ich brauche Münz für den Automaten. Der nimmt keine Noten, seit 2009.", 90),
]

# 5 ── Stick-Hinweis nur einmal ───────────────────────────────────────────────
STICK_ALT = 'else hint("🚗 Stick: hoch Gas · runter Bremse · seitlich lenken");'
STICK_NEU = ('else{var _sh=null;try{_sh=localStorage.getItem("th_stickhint");}catch(e){}'
             ' if(!_sh){try{localStorage.setItem("th_stickhint","1");}catch(e){}'
             ' hint("Stick nach oben ist Gas, nach unten Bremse, seitlich lenken.");}}')

# ── Mechanik ─────────────────────────────────────────────────────────────────
EMO_CLS = (r"[\U0001F000-\U0001FFFF\u2600-\u27BF\u2B00-\u2BFF\u2190-\u21FF\u2300-\u23FF"
           r"\uFE0F\u200D\u20E3\u2934\u2935\u3030\u303D\u3297\u3299\u00A9\u00AE\u2122\u2139\u24C2]")
LEAD = re.compile(r"^(?:(?:\\u[0-9A-Fa-f]{4})+\s*|" + EMO_CLS + r"|\s)+")
TAIL = re.compile(r"(?:\s*" + EMO_CLS + r")+\s*$")
LIT = re.compile(r'"((?:[^"\\]|\\.)*)"')
HINT_FIRST = re.compile(r'hint\(\s*"((?:[^"\\]|\\.)*)"')


def ohne_emoji(s):
    """Fuehrendes/abschliessendes Emoji weg. Bleibt nichts uebrig (reines Emoji-
    Praefix wie «🎨 » vor einem Namen), wird das Literal leer."""
    s2 = LEAD.sub("", s)
    if s2 == "" and s.strip():
        return ""
    s2 = TAIL.sub("", s2)
    return s2 if s2 else s


def ohne_ausruf(s):
    if any(w in s for w in AUSRUF_OK):
        return s
    s = s.replace("?!", "?").replace("!!", "!")
    return re.sub(r"!(?=[\s“\"']|$)", ".", s)


def alle_literale_auf_hintzeilen(text):
    text = HINT_FIRST.sub(lambda m: 'hint("' + ohne_emoji(m.group(1)) + '"', text)
    out = []
    for zeile in text.split("\n"):
        if "hint(" in zeile:
            zeile = LIT.sub(lambda m: '"' + ohne_ausruf(m.group(1)) + '"', zeile)
        out.append(zeile)
    return "\n".join(out)


def npc_block(text):
    sp = "var NPC_SPRUECHE=[\n" + ",\n".join('  "' + s + '"' for s in NPC_SPRUECHE) + "];\n"
    au = "var NPC_AUFTRAEGE=[\n" + ",\n".join('  ["' + s + '",' + str(g) + "]" for s, g in NPC_AUFTRAEGE) + "];\n"
    text = re.sub(r"var NPC_SPRUECHE=\[.*?\];\n", sp, text, count=1, flags=re.S)
    text = re.sub(r"var NPC_AUFTRAEGE=\[.*?\];\n", au, text, count=1, flags=re.S)
    return text


def anwenden(text):
    for alt, neu in ORTE.items():
        text = text.replace(alt, neu)
    text = text.replace(STICK_ALT, STICK_NEU)
    for alt, neu in HINTS.items():
        text = text.replace('hint("' + alt + '"', 'hint("' + neu + '"')
    text = alle_literale_auf_hintzeilen(text)
    text = text.replace("ß", "ss")
    text = text.replace("Bürgermeister", "Stadtpräsident").replace("Buergermeister", "Stadtpraesident")
    text = text.replace("vom Stadtpräsident ", "vom Stadtpräsidenten ")
    text = text.replace('hint(""+', "hint(")   # leeres Literal nach Emoji-Entfernung
    text = npc_block(text)
    return text


def zaehlen(text):
    hints = HINT_FIRST.findall(text)
    emo = sum(1 for t in hints if LEAD.match(t) and LEAD.match(t).group(0).strip())
    ausruf = sum(1 for t in hints if "!" in t and not any(w in t for w in AUSRUF_OK))
    return len(hints), emo, ausruf


if __name__ == "__main__":
    text = DATEI.read_text(encoding="utf-8")
    n, e, a = zaehlen(text)
    print(f"vorher : {n} hint()-Texte, {e} beginnen mit Emoji, {a} mit Ausrufezeichen, "
          f"{text.count('ß')} ß, {text.count('Bürgermeister')+text.count('Buergermeister')} Bürgermeister")
    if "--check" in sys.argv:
        sys.exit(1 if (e or a) else 0)
    neu = anwenden(text)
    n2, e2, a2 = zaehlen(neu)
    print(f"nachher: {n2} hint()-Texte, {e2} beginnen mit Emoji, {a2} mit Ausrufezeichen, "
          f"{neu.count('ß')} ß, {neu.count('Bürgermeister')+neu.count('Buergermeister')} Bürgermeister")
    if neu != text:
        DATEI.write_text(neu, encoding="utf-8")
        print("geschrieben:", DATEI)
    else:
        print("nichts zu tun")
