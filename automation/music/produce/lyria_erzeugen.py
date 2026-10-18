#!/usr/bin/env python3
"""lyria_erzeugen.py — epische Instrumentalstücke über Google Lyria 3.5 (Gemini-API, ~900 Tokens je Stück) erzeugen und blind bewerten.

18.10.2026 (Betreiber «verbessere musik videos»): Der Pool hatte 9 Stücke, alle «episch», aber für ALLE Warengruppen gleich; ein
Küchen-Gadget bekam Schlittenglocken, ein Hundespielzeug einen Trailer. Dieses Skript erzeugt Stimmungs-Stücke je Warengruppe.

  python3 lyria_erzeugen.py erzeugen [name ...]    # nach /tmp/lyria/<name>.mp3 (vorhandene werden übersprungen)
  python3 lyria_erzeugen.py bewerten [name ...]    # blinde Bewertung mit Gemini → /tmp/lyria/bewertung_neu.json
  python3 lyria_erzeugen.py aufnehmen name ...     # musik_aufnehmen.py: mastern, messen, CREDITS-Zeile, Einstiege

Der Schlüssel kommt aus GEMINI_API_KEY (Umgebung), wird nie ausgegeben. Stücke tragen das SynthID-Wasserzeichen von Google.
"""
import base64, json, os, subprocess, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
AUS = "/tmp/lyria"
N = ("No vocals, no choir, no singing. Strong hook from the very first second, no quiet intro. About 60 seconds. "
     "Background music for short product videos of a Swiss lifestyle shop.")
STUECKE = {
    "luxe-epic-spielerisch": "Playful cinematic orchestral adventure instrumental: bright pizzicato strings, glockenspiel, warm woodwinds and light brass, "
        "bouncy and charming, joyful family-friendly energy, 128 BPM, G major. " + N,
    "luxe-epic-warm": "Warm cozy cinematic instrumental: soft grand piano motif with expressive solo cello and gentle string section, light brushed percussion, "
        "comforting and homely, slowly swelling to a heartfelt full-orchestra moment, 92 BPM, D major. " + N,
    "luxe-epic-tech": "Modern cinematic orchestral instrumental for technology gadgets: a real string ensemble playing a fast driving ostinato, powerful low brass, "
        "pounding orchestral percussion and a subtle electronic pulse far in the background, futuristic and confident, builds to a big full-orchestra climax, 124 BPM, A minor. " + N,
    "luxe-epic-sport": "Driving epic sports orchestral instrumental: pounding taiko and snare drum ostinato, aggressive staccato strings, powerful brass fanfares, "
        "determined and energetic, relentless forward momentum, 150 BPM, E minor. " + N,
    "luxe-epic-glamour": "Glamorous cinematic fashion instrumental: sweeping romantic strings, harp glissandi, soft heartbeat bass pulse and sparkling celesta, "
        "confident, sophisticated and sensual without being slow, 108 BPM, B minor. " + N,
    "luxe-epic-herbst": "Epic autumn forest orchestral instrumental: lyrical oboe and clarinet melody, plucked harp, warm cellos and french horns, golden-hour nostalgia "
        "growing into a grand uplifting finale, 100 BPM, F major. " + N,
}


def schluessel():
    k = os.environ.get("GEMINI_API_KEY", "")
    if not k:
        sys.exit("GEMINI_API_KEY fehlt")
    return k


def erzeugen(namen):
    k = schluessel(); os.makedirs(AUS, exist_ok=True)
    for n in namen:
        ziel = f"{AUS}/{n}.mp3"
        if os.path.exists(ziel) and os.path.getsize(ziel) > 500_000:
            print(n, "vorhanden"); continue
        body = {"contents": [{"parts": [{"text": STUECKE[n]}]}]}
        d = None
        for v in range(3):
            try:
                r = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/lyria-3.5:generateContent", data=json.dumps(body).encode(),
                                           headers={"Content-Type": "application/json", "x-goog-api-key": k, "User-Agent": "luxe"})
                d = json.load(urllib.request.urlopen(r, timeout=300)); break
            except Exception as e:
                print(n, "Versuch", v, str(e)[:120]); time.sleep(10)
        if not d:
            continue
        for p in d["candidates"][0]["content"]["parts"]:
            if "inlineData" in p:
                open(ziel, "wb").write(base64.b64decode(p["inlineData"]["data"]))
                print(n, "ok", d.get("usageMetadata", {}).get("totalTokenCount"), "Tokens")


SCHEMA = {"type": "OBJECT", "properties": {"orchester": {"type": "INTEGER"}, "episch": {"type": "INTEGER"}, "klang_echt": {"type": "INTEGER"},
          "hook_erste_3s": {"type": "INTEGER"}, "gesang": {"type": "INTEGER"}, "passt_zur_stimmung": {"type": "INTEGER"}, "schwaeche": {"type": "STRING"}},
          "required": ["orchester", "episch", "klang_echt", "hook_erste_3s", "gesang", "passt_zur_stimmung", "schwaeche"]}


def bewerten(namen):
    k = schluessel(); aus = {}
    for n in namen:
        pfad = f"{AUS}/{n}.mp3"
        if not os.path.exists(pfad):
            continue
        a = base64.b64encode(open(pfad, "rb").read()).decode()
        frage = ("Bewerte dieses Musikstück blind als Hintergrundmusik für kurze Produktvideos. Skala 0-10: orchester (klingt wie ein echtes Orchester/echte Instrumente), "
                 "episch (filmische Grösse), klang_echt (Aufnahmequalität, nicht künstlich), hook_erste_3s (packt es in den ersten 3 Sekunden), gesang (0 = kein Gesang, 10 = viel Gesang), "
                 f"passt_zur_stimmung (passt es zu dieser Absicht: «{STUECKE.get(n, '')[:160]}»). schwaeche: ein deutscher Satz, die grösste Schwäche.")
        body = {"contents": [{"parts": [{"text": frage}, {"inlineData": {"mimeType": "audio/mpeg", "data": a}}]}],
                "generationConfig": {"responseMimeType": "application/json", "responseSchema": SCHEMA, "temperature": 0}}
        try:
            r = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", data=json.dumps(body).encode(),
                                       headers={"Content-Type": "application/json", "x-goog-api-key": k, "User-Agent": "luxe"})
            d = json.load(urllib.request.urlopen(r, timeout=180))
            aus[n] = json.loads(d["candidates"][0]["content"]["parts"][0]["text"])
        except Exception as e:
            aus[n] = {"fehler": str(e)[:150]}
        print(n, json.dumps(aus[n], ensure_ascii=False)[:300])
    json.dump(aus, open(f"{AUS}/bewertung_neu.json", "w"), ensure_ascii=False, indent=1)


def aufnehmen(namen):
    for n in namen:
        bes = STUECKE[n].split(". No vocals")[0]
        subprocess.run([sys.executable, f"{HIER}/musik_aufnehmen.py", f"{AUS}/{n}.mp3", n,
                        f"{bes} (Google Lyria 3.5 über Gemini-API, {time.strftime('%d.%m.%Y')}, SynthID-Wasserzeichen; blind episch/Klang bewertet)"], check=False)


if __name__ == "__main__":
    modus = sys.argv[1] if len(sys.argv) > 1 else ""
    namen = sys.argv[2:] or list(STUECKE)
    {"erzeugen": erzeugen, "bewerten": bewerten, "aufnehmen": aufnehmen}.get(modus, lambda _: sys.exit(__doc__))(namen)
