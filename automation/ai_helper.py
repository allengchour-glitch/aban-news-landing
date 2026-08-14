#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban — Multi-Brain-Helfer: Gemini + ChatGPT (OpenAI) + Groq über eine Schnittstelle.

Mehrere KI-„Gehirne" für verschiedene Aufgaben:
- **Gemini** kann YouTube-VIDEOS direkt analysieren → endlich Kontext aus den Tutorial-Links holen.
- **OpenAI (ChatGPT)** + **Groq** (schnell, Llama) → Text-Hilfe, Zweitmeinung, Code-Review.

Keys per Env (NIE im Code/Chat): GEMINI_API_KEY · OPENAI_API_KEY · GROQ_API_KEY.
Reine Stdlib. No-op, wenn der jeweilige Key fehlt.

  python3 automation/ai_helper.py ask "Wie macht man Game-Feel juicy?"      # nimmt 1. verfügbares Gehirn
  python3 automation/ai_helper.py gemini-youtube https://youtu.be/ID "Kernpunkte für Game-Dev?"
  python3 automation/ai_helper.py learn-games            # analysiert die 10 Tutorial-Videos -> game/learn/
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

YT_VIDEOS = ["-uhbipf1bn0","tKEIlZUISaY","KKniWb9RKq4","iRcrZjOt5H8","QPZCMd5REP8",
             "aEdRB2yVK-I","Kv3ajOok7_I","0DVUjpClqgI","xZaSPw14Cfo","Ww-cpujcBRM"]


def _post(url, payload, headers):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST",
                                 headers={**headers, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


def ask_gemini(prompt, youtube_url=None):
    key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    if not key:
        return None
    parts = []
    if youtube_url:
        parts.append({"file_data": {"file_uri": youtube_url}})
    parts.append({"text": prompt})
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           "gemini-2.0-flash:generateContent?key=" + key)
    d = _post(url, {"contents": [{"parts": parts}]}, {})
    return d["candidates"][0]["content"]["parts"][0]["text"]


def _openai_style(base, key, model, prompt):
    d = _post(base, {"model": model, "messages": [{"role": "user", "content": prompt}]},
              {"Authorization": "Bearer " + key})
    return d["choices"][0]["message"]["content"]


def ask_openai(prompt):
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not key:
        return None
    return _openai_style("https://api.openai.com/v1/chat/completions", key, "gpt-4o-mini", prompt)


def ask_groq(prompt):
    key = (os.environ.get("GROQ_API_KEY") or "").strip()
    if not key:
        return None
    return _openai_style("https://api.groq.com/openai/v1/chat/completions", key,
                         "openai/gpt-oss-120b", prompt)


def ask_any(prompt):
    for fn, name in ((ask_gemini, "Gemini"), (ask_openai, "ChatGPT"), (ask_groq, "Groq")):
        try:
            out = fn(prompt)
            if out:
                return name, out
        except Exception as e:  # noqa: BLE001
            print(f"  ({name} Fehler: {str(e)[:80]})")
    return None, None


def learn_games():
    if not (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")):
        print("GEMINI_API_KEY fehlt → kann YouTube-Videos nicht analysieren.")
        return
    out = ROOT / "game" / "learn" / "youtube-gemini.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = ["# 🎓 Game-Dev-Learnings aus YouTube (via Gemini-Videoanalyse)", ""]
    q = ("Analysiere dieses Game-Dev-Video. Gib 5 konkrete, umsetzbare Erkenntnisse für ein "
         "eigenes Spiel (Mechanik, Game-Feel, Technik, Monetarisierung). Kurz, auf Deutsch.")
    for vid in YT_VIDEOS:
        url = "https://www.youtube.com/watch?v=" + vid
        print(f"▶ Gemini analysiert {vid} …")
        try:
            txt = ask_gemini(q, url)
            lines += [f"## {url}", txt or "(keine Antwort)", ""]
        except Exception as e:  # noqa: BLE001
            lines += [f"## {url}", f"_Fehler: {str(e)[:120]}_", ""]
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"✓ {out.relative_to(ROOT)} geschrieben.")


def main() -> int:
    a = sys.argv[1:]
    if not a:
        print(__doc__); return 0
    cmd = a[0]
    if cmd == "ask" and len(a) > 1:
        name, out = ask_any(" ".join(a[1:]))
        print(f"[{name}]\n{out}" if out else "Kein KI-Key gesetzt (GEMINI/OPENAI/GROQ).")
    elif cmd == "gemini-youtube" and len(a) > 1:
        url = a[1]; prompt = " ".join(a[2:]) or "Fasse die Kernpunkte zusammen."
        print(ask_gemini(prompt, url) or "GEMINI_API_KEY fehlt.")
    elif cmd == "learn-games":
        learn_games()
    else:
        print(__doc__)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
