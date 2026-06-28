#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""YouTube-Transkripte LOKAL ziehen (Wohn-IP) — fürs Game-Dev-Lernen.

Die Cloud-Session kann YouTube nicht scrapen (Rechenzentrums-IP wird geblockt).
Dein Laptop hat eine normale IP → hier klappt's. Dieses Skript zieht die
Transkripte der angegebenen Videos und speichert sie als .txt neben sich.
Der lokale Claude liest sie dann und baut die Ideen ins Spiel ein.

Einmalig:  pip install youtube-transcript-api
Lauf:      python game/learn/fetch_transcripts.py
           python game/learn/fetch_transcripts.py <videoId> <videoId> ...

Die .txt bleiben lokal (per .gitignore nicht eingecheckt — Urheberrecht/Größe).
"""
import sys, os

# Standard: die 10 vom User geschickten Videos
IDS = ["-uhbipf1bn0","tKEIlZUISaY","KKniWb9RKq4","iRcrZjOt5H8","QPZCMd5REP8",
       "aEdRB2yVK-I","Kv3ajOok7_I","0DVUjpClqgI","xZaSPw14Cfo","Ww-cpujcBRM"]

def main():
    ids = sys.argv[1:] or IDS
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        print("Bitte zuerst: pip install youtube-transcript-api"); return 1
    api = YouTubeTranscriptApi()
    here = os.path.dirname(os.path.abspath(__file__))
    ok = 0
    for vid in ids:
        try:
            data = api.fetch(vid, languages=['de','en','en-US','en-GB'])
            txt = " ".join(getattr(s, 'text', str(s)) for s in data)
            with open(os.path.join(here, f"{vid}.txt"), "w", encoding="utf-8") as f:
                f.write(txt)
            print(f"OK  {vid}  ({len(txt)} Zeichen) -> game/learn/{vid}.txt"); ok += 1
        except Exception as e:
            print(f"FEHLER {vid}: {type(e).__name__}: {str(e)[:120]}")
    print(f"\n{ok}/{len(ids)} Transkripte geholt. Jetzt: lokaler Claude liest game/learn/*.txt "
          f"und baut die Ideen ein — ODER schick aban den Kern der Videos.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
