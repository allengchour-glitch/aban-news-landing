#!/usr/bin/env python3
"""hoerprobe.py — KI-Hörschleife für eigene Musik (27.09.2026).

Lehre vom 27.09.: Wer dem KI-Hörer sagt, was geändert wurde, bekommt Bestätigung statt Urteil («genau wie beschrieben»).
Deshalb hier BLIND: zwei Fassungen in zufälliger Reihenfolge, keine Angabe, welche neu ist oder was sich änderte.
Das Urteil wird auf die echten Dateinamen zurückgerechnet.

  python3 hoerprobe.py kritik <datei> [genre-beschreibung]      → Noten + 5 Verbesserungen mit Zeitstempeln
  python3 hoerprobe.py ab <alt> <neu> [genre-beschreibung]       → blinder Vergleich, letzte Zeile JSON {"besser": pfad|null, ...}

Braucht GEMINI_API_KEY (Umgebung oder /tmp/dienste.env). Dateien werden als 128-kbit-MP3 gesendet.
"""
import base64, json, os, random, re, subprocess, sys, tempfile, urllib.request

MODELL = os.environ.get("HOER_MODELL", "gemini-2.5-flash")


def schluessel():
    k = os.environ.get("GEMINI_API_KEY", "")
    if not k and os.path.exists("/tmp/dienste.env"):
        m = re.search(r"GEMINI_API_KEY=['\"]?([^\s'\"]+)", open("/tmp/dienste.env").read())
        k = m.group(1) if m else ""
    if not k:
        sys.exit("GEMINI_API_KEY fehlt")
    return k


def mp3(pfad):
    f = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False).name
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", pfad, "-b:a", "128k", f], check=True)
    d = base64.b64encode(open(f, "rb").read()).decode()
    os.unlink(f)
    return {"inline_data": {"mime_type": "audio/mp3", "data": d}}


def frage(teile):
    body = {"contents": [{"parts": teile}], "generationConfig": {"temperature": 0.2}}
    r = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODELL}:generateContent?key={schluessel()}",
                               data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(r, timeout=300))["candidates"][0]["content"]["parts"][0]["text"]


def kritik(pfad, genre):
    return frage([mp3(pfad), {"text": (
        f"Du bist ein strenger Musikproduzent ({genre}). Das Instrumental ist Hintergrund für 10-Sekunden-Produkt-Reels. "
        "Bewerte ehrlich 1–10: erste Sekunde packend, Mix-Balance, professionell vs MIDI-haft, Energie/Groove. "
        "Dann die 5 wichtigsten konkreten Verbesserungen mit Zeitstempeln und Frequenzen/Pegeln. Deutsch, knapp.")}])


def ab(alt, neu, genre):
    paar = [alt, neu]
    random.shuffle(paar)
    text = frage([mp3(paar[0]), mp3(paar[1]), {"text": (
        f"Zwei Fassungen eines Instrumentals ({genre}) als Hintergrund für 10-Sekunden-Produkt-Reels. Datei 1 und Datei 2 — "
        "du weisst nicht, welche neuer ist. Bewerte BEIDE streng 1–10: erste Sekunde, Mix-Balance, professionell vs MIDI-haft, "
        "Energie/Groove, dazu eine Gesamtnote. Nenne echte Fehler (Übersteuerung, Matsch, schiefe Töne, Timing). "
        "Letzte Zeile GENAU so: BESSER: 1  oder  BESSER: 2  oder  BESSER: gleich. Deutsch, knapp.")}])
    m = re.search(r"BESSER:\s*(1|2|gleich)", text)
    wahl = m.group(1) if m else "gleich"
    besser = paar[int(wahl) - 1] if wahl in ("1", "2") else None
    return text, {"besser": besser, "neu_gewinnt": besser == neu, "reihenfolge": paar}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    if sys.argv[1] == "kritik":
        print(kritik(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "Instrumental"))
    elif sys.argv[1] == "ab":
        t, erg = ab(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else "Instrumental")
        print(t)
        print(json.dumps(erg, ensure_ascii=False))
    else:
        sys.exit(__doc__)
