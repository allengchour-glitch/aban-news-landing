"""
aban news — Brand-Voice-Validator als HTTP-Service.

Make.com ruft diesen Service via Webhook vor jedem Publish auf.
Pure Python stdlib + Flask. Eine einzige Abhaengigkeit: flask.

POST /validate
Body: {"text": "...", "channel": "linkedin|newsletter|reddit|generic"}
Response: {
  "score": 0-10,
  "passed": bool,
  "violations": [{"type": "...", ...}, ...],
  "suggestions": ["..."],
  "stats": {"word_count": int, "char_count": int, "personal_ratio": float}
}

GET /health -> {"ok": true}

Start:
    pip install flask
    python brand-voice-validator-api.py
    # listens on 0.0.0.0:8080

Local test:
    curl -X POST http://localhost:8080/validate \\
         -H "Content-Type: application/json" \\
         -d '{"text":"Das ist revolutionaer!","channel":"linkedin"}'
"""

import re
import json
import os
from flask import Flask, request, jsonify

app = Flask(__name__)


# ---------------------------------------------------------------------------
# Voice-Rules
# ---------------------------------------------------------------------------

# Forbidden phrases: (regex, label, severity-penalty)
FORBIDDEN = [
    (r"\brevolution(?:aer|aere|ar|ary)?\w*", "revolutionaer", 1.5),
    (r"\bdisrupt(?:iv|ive|s|ed|ion)?\w*", "disruptiv", 1.5),
    (r"\bgame[- ]?changer\w*", "game-changer", 1.5),
    (r"\bnext[- ]?level\w*", "next-level", 1.0),
    (r"\bcutting[- ]?edge\w*", "cutting-edge", 1.0),
    (r"\bstate[- ]?of[- ]?the[- ]?art\w*", "state-of-the-art", 1.0),
    (r"\bworld[- ]?class\w*", "world-class", 1.0),
    (r"\bbest[- ]?in[- ]?class\w*", "best-in-class", 1.0),
    (r"\bsynerg(?:y|ies|ize|etic)\w*", "synergie", 1.2),
    (r"\bleverag(?:e|ing|ed)\w*", "leverage", 1.0),
    (r"\bbahnbrech(?:end|ende|ender)\w*", "bahnbrechend", 1.5),
    (r"\beinzigartig\w*", "einzigartig", 1.0),
    (r"\bunglaublich\w*", "unglaublich", 1.0),
    (r"\bwahnsinnig\w*", "wahnsinnig", 1.0),
    (r"\bperfekt(?:e|er|es)?\b", "perfekt (Hype)", 0.8),
    (r"\bganz[- ]?neu\w*", "ganz neu", 0.8),
    (r"\bzukunft(?:s|sweisend)\w*", "zukunftsweisend", 1.0),
    (r"\bmehrwert\b", "Mehrwert (Buzzword)", 0.8),
    (r"\bAI[- ]?powered\b", "AI-powered (Hype)", 1.0),
    (r"\bnext[- ]?gen\w*", "next-gen", 1.0),
    (r"\bskyrocket\w*", "skyrocket", 1.5),
    (r"\b10x\b", "10x (Hype)", 1.0),
    (r"\bunlock\w+\s+(?:potential|growth)", "unlock potential/growth", 1.2),
    (r"\bturbo\b", "Turbo", 0.5),
    (r"\bkrass\b", "krass (uebertrieben)", 0.5),
    (r"!{2,}", "Mehrfach-Ausrufezeichen", 1.0),
    (r"\bnie[- ]?dagewes\w*", "nie dagewesen", 1.2),
]

# Channel-specific limits
CHANNEL_RULES = {
    "linkedin":   {"max_length": 3000,  "max_hashtags": 5, "min_personal": 0.005, "max_emojis": 5},
    "newsletter": {"max_length": 10000, "max_hashtags": 0, "min_personal": 0.003, "max_emojis": 3},
    "reddit":     {"max_length": 1500,  "max_hashtags": 0, "min_personal": 0.001, "max_emojis": 1},
    "generic":    {"max_length": 5000,  "max_hashtags": 3, "min_personal": 0.0,   "max_emojis": 10},
}

EMOJI_RX = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F900-\U0001F9FF]"
)

PASS_THRESHOLD = 7.0


def validate(text, channel):
    """Run all voice checks on text. Returns dict (see module docstring)."""
    text = text or ""
    channel = (channel or "generic").lower()
    rules = CHANNEL_RULES.get(channel, CHANNEL_RULES["generic"])

    violations = []
    score = 10.0

    # 1) Forbidden hype-words
    for pattern, label, penalty in FORBIDDEN:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            violations.append({
                "type": "forbidden",
                "phrase": label,
                "match": m.group(0),
                "severity": penalty,
            })
            score -= penalty

    # 2) Sie-Drift (we use "du")
    sie_drift = re.findall(r"(?<![A-Za-zaeoeueAEOEUE])(?:Sie|Ihnen|Ihre[smnr]?|Ihr)(?![a-zaeoeueAEOEUE])", text)
    # Filter out common false positives: "ihre" at sentence start with no capital, etc.
    sie_count = len([s for s in sie_drift if s and s[0].isupper()])
    if sie_count > 0:
        violations.append({"type": "sie_drift", "count": sie_count})
        score -= min(2.0, 0.5 * sie_count)

    # 3) Channel length
    char_count = len(text)
    word_count = len(text.split())
    if char_count > rules["max_length"]:
        violations.append({
            "type": "too_long",
            "actual": char_count,
            "max": rules["max_length"],
        })
        score -= 1.0

    # 4) Hashtag count
    hashtags = re.findall(r"#\w+", text)
    if len(hashtags) > rules["max_hashtags"]:
        violations.append({
            "type": "too_many_hashtags",
            "actual": len(hashtags),
            "max": rules["max_hashtags"],
        })
        score -= 0.5

    # 5) Emoji count
    emojis = EMOJI_RX.findall(text)
    if len(emojis) > rules["max_emojis"]:
        violations.append({
            "type": "too_many_emojis",
            "actual": len(emojis),
            "max": rules["max_emojis"],
        })
        score -= 0.5

    # 6) Personal-pronoun frequency ("ich/mein/mir/mich" — Aban schreibt persoenlich)
    personal_count = len(re.findall(r"\b(ich|mein(?:e|en|er|es|em)?|mir|mich)\b", text, re.IGNORECASE))
    personal_ratio = personal_count / max(word_count, 1)
    if personal_ratio < rules["min_personal"] and word_count >= 50:
        violations.append({
            "type": "not_personal_enough",
            "ratio": round(personal_ratio, 4),
            "min": rules["min_personal"],
        })
        score -= 0.5

    # 7) ALL CAPS shouting (3+ uppercase words in a row, len>=3)
    if re.search(r"\b[A-Z]{3,}\s+[A-Z]{3,}", text):
        violations.append({"type": "all_caps"})
        score -= 0.5

    # 8) Empty / too-short
    if word_count < 5:
        violations.append({"type": "too_short", "words": word_count})
        score -= 2.0

    score = max(0.0, round(score, 2))

    has_forbidden = any(v["type"] == "forbidden" for v in violations)
    passed = score >= PASS_THRESHOLD and not has_forbidden

    return {
        "score": score,
        "passed": passed,
        "violations": violations,
        "suggestions": generate_suggestions(violations),
        "stats": {
            "word_count": word_count,
            "char_count": char_count,
            "personal_ratio": round(personal_ratio, 4),
            "hashtag_count": len(hashtags),
            "emoji_count": len(emojis),
        },
        "channel": channel,
        "threshold": PASS_THRESHOLD,
    }


def generate_suggestions(violations):
    sugg = []
    for v in violations:
        t = v["type"]
        if t == "forbidden":
            sugg.append(
                "Ersetze '{}' durch ein konkretes Wort. Beispiele: "
                "statt 'revolutionaer' -> 'neu', 'anders', 'erste die'.".format(v["phrase"])
            )
        elif t == "sie_drift":
            sugg.append(
                "Wechsle auf 'du'-Form ({} Sie-Vorkommen gefunden).".format(v["count"])
            )
        elif t == "too_long":
            sugg.append(
                "Kuerze auf max {} Zeichen ({} aktuell).".format(v["max"], v["actual"])
            )
        elif t == "too_many_hashtags":
            sugg.append("Reduziere auf max {} Hashtags.".format(v["max"]))
        elif t == "too_many_emojis":
            sugg.append("Reduziere Emojis auf max {}.".format(v["max"]))
        elif t == "not_personal_enough":
            sugg.append(
                "Mehr 'ich/mein' verwenden — Aban schreibt persoenlich. "
                "Aktuell {:.1%}, Ziel >= {:.1%}.".format(v["ratio"], v["min"])
            )
        elif t == "all_caps":
            sugg.append("Kein SCHREIEN — normale Gross-Klein-Schreibung.")
        elif t == "too_short":
            sugg.append("Text zu kurz — mehr Kontext.")
    return sugg


# ---------------------------------------------------------------------------
# Flask routes
# ---------------------------------------------------------------------------

@app.route("/validate", methods=["POST"])
def endpoint_validate():
    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        return jsonify({"error": "invalid JSON"}), 400
    text = data.get("text", "")
    channel = data.get("channel", "generic")
    if not isinstance(text, str):
        return jsonify({"error": "text must be string"}), 400
    return jsonify(validate(text, channel))


@app.route("/health", methods=["GET"])
def endpoint_health():
    return jsonify({"ok": True, "service": "aban-brand-voice-validator", "threshold": PASS_THRESHOLD})


@app.route("/", methods=["GET"])
def endpoint_root():
    return jsonify({
        "service": "aban-brand-voice-validator",
        "version": "1.0",
        "endpoints": ["/validate (POST)", "/health (GET)"],
        "docs": "https://abannews.com/brand.html",
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
