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


def _is_doc(path):
    """True for engineering/ops docs that are not newsletter content.

    The brand-voice linter targets newsletter issue markdown (see --batch
    ausgaben/). README and automation/ setup guides legitimately quote the
    forbidden-phrase list and exceed the per-issue length cap, so they are
    never voice-linted — regardless of which CI workflow version invokes us.
    """
    p = path.replace("\\", "/").lstrip("./")
    base = os.path.basename(p)
    if base in ("README.md", "CHANGELOG.md"):
        return True
    if p.startswith("automation/") or "/automation/" in p:
        return True
    return False


def main():
    if not os.path.isfile(DELEGATE):
        sys.stderr.write(
            "error: cannot find delegate at {} — is automation/voice-linter-cli.py present?\n".format(DELEGATE)
        )
        sys.exit(2)

    args = expand_batch(sys.argv[1:])
    # Drop non-newsletter docs from the file list (keep flags and stdin "-").
    kept, skipped = [], []
    for a in args:
        if a == "-" or a.startswith("-") or not a.lower().endswith(".md"):
            kept.append(a)
        elif _is_doc(a):
            skipped.append(a)
        else:
            kept.append(a)
    for s in skipped:
        sys.stderr.write("skip (kein Newsletter-Content, nicht voice-gelintet): {}\n".format(s))

    # If every .md file was a skipped doc, there is nothing to lint -> pass.
    md_inputs = [a for a in args if a.lower().endswith(".md") or a == "-"]
    md_kept = [a for a in kept if a.lower().endswith(".md") or a == "-"]
    if md_inputs and not md_kept:
        sys.exit(0)

    sys.argv = [DELEGATE] + kept
    try:
        runpy.run_path(DELEGATE, run_name="__main__")
    except SystemExit:
        raise
    except Exception as e:
        sys.stderr.write("error: linter delegate failed: {}\n".format(e))
        sys.exit(2)


if __name__ == "__main__":
    main()
