#!/usr/bin/env python3
"""
aban news — Brand-voice-linter (tools/ entrypoint).

Thin wrapper that delegates to automation/voice-linter-cli.py — the canonical
linter. Keeping a tools/-entrypoint lets GitHub Actions workflows use a stable
path (tools/brand-voice-linter.py) without caring about the underlying script.

Usage:
    python tools/brand-voice-linter.py issue.md
    python tools/brand-voice-linter.py issue.md --strict
    python tools/brand-voice-linter.py --batch ausgaben/

Exit codes match the underlying CLI:
    0 = all passed
    1 = at least one file failed
    2 = CLI / IO error
"""
import os
import sys
import glob
import runpy

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
DELEGATE = os.path.join(REPO, "automation", "voice-linter-cli.py")


def expand_batch(args):
    """Expand --batch <dir> into a list of .md files for the delegated CLI."""
    out = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--batch" and i + 1 < len(args):
            target = args[i + 1]
            if os.path.isdir(target):
                for root, _, files in os.walk(target):
                    for f in files:
                        if f.lower().endswith(".md"):
                            out.append(os.path.join(root, f))
            else:
                out.extend(glob.glob(target))
            i += 2
            continue
        out.append(a)
        i += 1
    return out


def main():
    if not os.path.isfile(DELEGATE):
        sys.stderr.write(
            "error: cannot find delegate at {} — is automation/voice-linter-cli.py present?\n".format(DELEGATE)
        )
        sys.exit(2)
    sys.argv = [DELEGATE] + expand_batch(sys.argv[1:])
    try:
        runpy.run_path(DELEGATE, run_name="__main__")
    except SystemExit:
        raise
    except Exception as e:
        sys.stderr.write("error: linter delegate failed: {}\n".format(e))
        sys.exit(2)


if __name__ == "__main__":
    main()
