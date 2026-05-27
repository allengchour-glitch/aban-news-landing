#!/usr/bin/env python3
"""
aban news — Voice-Linter CLI.

Standalone-Tool fuer lokale Tests. Nutzt dieselbe Logik wie der HTTP-Service
(brand-voice-validator-api.py), aber als Kommandozeilen-Werkzeug ohne Flask.

Usage:
    python voice-linter-cli.py issue.md
    python voice-linter-cli.py --channel linkedin posts/*.md
    python voice-linter-cli.py --json --strict issue.md
    cat issue.md | python voice-linter-cli.py --channel newsletter -

Exit codes:
    0  = all files passed
    1  = at least one file failed (score < threshold or forbidden phrase)
    2  = CLI / IO error
"""

import argparse
import glob
import json
import os
import sys

# Import validate() from the API module without starting Flask.
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# Lazy import: only load symbol we need, don't trigger Flask startup
try:
    import importlib.util
    _spec = importlib.util.spec_from_file_location(
        "validator_api",
        os.path.join(HERE, "brand-voice-validator-api.py"),
    )
    _mod = importlib.util.module_from_spec(_spec)
    # Stub flask so import doesn't fail if not installed for CLI use
    if "flask" not in sys.modules:
        class _FakeFlask:
            def __init__(self, *a, **k): pass
            def route(self, *a, **k):
                def deco(fn): return fn
                return deco
            def run(self, *a, **k): pass
        class _FakeReq:
            def get_json(self, *a, **k): return {}
        _fake = type("flask", (), {
            "Flask": _FakeFlask,
            "request": _FakeReq(),
            "jsonify": lambda x: x,
        })
        sys.modules["flask"] = _fake
    _spec.loader.exec_module(_mod)
    validate = _mod.validate
    PASS_THRESHOLD = _mod.PASS_THRESHOLD
except Exception as e:
    sys.stderr.write("error: cannot import validator: {}\n".format(e))
    sys.exit(2)


# ANSI colors (skip on Windows cmd without ANSI support)
def _supports_color():
    if os.environ.get("NO_COLOR"):
        return False
    if not sys.stdout.isatty():
        return False
    if sys.platform == "win32":
        return os.environ.get("ANSICON") or os.environ.get("WT_SESSION")
    return True


USE_COLOR = _supports_color()
def c(code, s):
    if not USE_COLOR: return s
    return "\033[" + code + "m" + s + "\033[0m"


def print_report(path, result, channel):
    score = result["score"]
    passed = result["passed"]
    head_color = "32" if passed else "31"
    status = "PASS" if passed else "FAIL"
    print(c(head_color, "[{}]".format(status)) + " " + path
          + c("90", "  ({})".format(channel))
          + "  score=" + c("1", "{:.1f}/10".format(score)))

    s = result["stats"]
    print(c("90", "       words={}  chars={}  personal={:.1%}  hashtags={}  emojis={}".format(
        s["word_count"], s["char_count"], s["personal_ratio"], s["hashtag_count"], s["emoji_count"]
    )))

    for v in result["violations"]:
        t = v["type"]
        if t == "forbidden":
            line = "       - forbidden: {} (matched: {!r})".format(v["phrase"], v["match"])
        elif t == "sie_drift":
            line = "       - Sie-Drift: {} occurrences".format(v["count"])
        elif t == "too_long":
            line = "       - too_long: {} > {}".format(v["actual"], v["max"])
        elif t == "too_many_hashtags":
            line = "       - too_many_hashtags: {} > {}".format(v["actual"], v["max"])
        elif t == "too_many_emojis":
            line = "       - too_many_emojis: {} > {}".format(v["actual"], v["max"])
        elif t == "not_personal_enough":
            line = "       - not_personal_enough: {:.1%} < {:.1%}".format(v["ratio"], v["min"])
        elif t == "all_caps":
            line = "       - all_caps shouting"
        elif t == "too_short":
            line = "       - too_short: {} words".format(v["words"])
        else:
            line = "       - " + t
        print(c("33", line))

    for sug in result["suggestions"]:
        print(c("36", "       > " + sug))


def read_input(path):
    if path == "-":
        return sys.stdin.read()
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def expand_paths(patterns):
    out = []
    for p in patterns:
        if p == "-":
            out.append(p); continue
        matched = glob.glob(p)
        if matched:
            out.extend(matched)
        else:
            out.append(p)  # let open() raise if missing
    return out


def main():
    ap = argparse.ArgumentParser(
        prog="voice-linter",
        description="aban news brand-voice linter — checks text against voice rules.",
    )
    ap.add_argument("files", nargs="+", help="files to check (or '-' for stdin)")
    ap.add_argument("--channel", default="generic",
                    choices=["linkedin", "newsletter", "reddit", "generic"],
                    help="channel-specific rule set (default: generic)")
    ap.add_argument("--json", action="store_true", help="machine-readable JSON output")
    ap.add_argument("--strict", action="store_true",
                    help="fail on ANY violation, not just below threshold")
    ap.add_argument("--threshold", type=float, default=None,
                    help="override pass-threshold (default: {})".format(PASS_THRESHOLD))
    args = ap.parse_args()

    threshold = args.threshold if args.threshold is not None else PASS_THRESHOLD

    paths = expand_paths(args.files)
    any_fail = False
    results = []

    for p in paths:
        try:
            text = read_input(p)
        except IOError as e:
            sys.stderr.write("cannot read {}: {}\n".format(p, e))
            any_fail = True
            continue

        r = validate(text, args.channel)
        # Re-evaluate pass with overridden threshold / strict mode
        has_forbidden = any(v["type"] == "forbidden" for v in r["violations"])
        r["passed"] = r["score"] >= threshold and not has_forbidden
        if args.strict and r["violations"]:
            r["passed"] = False

        results.append({"file": p, "result": r})
        if not r["passed"]:
            any_fail = True

    if args.json:
        print(json.dumps({"threshold": threshold, "results": results}, indent=2, ensure_ascii=False))
    else:
        for item in results:
            print_report(item["file"], item["result"], args.channel)
            print("")
        # Summary
        passed = sum(1 for i in results if i["result"]["passed"])
        total = len(results)
        msg = "Summary: {}/{} passed".format(passed, total)
        print(c("1", msg))

    sys.exit(1 if any_fail else 0)


if __name__ == "__main__":
    main()
