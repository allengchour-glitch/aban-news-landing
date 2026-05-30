#!/usr/bin/env python3
"""
aban news — LinkedIn-Post-Generator (Content-Repurposing).

Liest die Archiv-Ausgaben (archive/0??-*.html) und baut aus jeder Ausgabe
einen fertigen LinkedIn-Post-Entwurf. Ziel: LinkedIn-Follower gewinnen, die
dann in den Newsletter laufen. Kein Auto-Posting — nur Drafts zum Kopieren.

Pro Ausgabe wird extrahiert:
  - kanonische URL (link rel="canonical")
  - Titel (h1.issue-title, führendes "☕ " entfernt)
  - Hook: die ersten 1-2 Body-Absätze nach der "Einstieg"-Überschrift

Daraus entsteht ein Post mit:
  - 1-Zeilen-Hook (kondensierter Winkel der Ausgabe, anti-hype)
  - 2-4 kurze Zeilen mit EINEM konkreten Insight
  - weiche CTA auf Ausgaben-URL + Newsletter-Signup
  - bis zu 3 Hashtags

Output: automation/linkedin_posts_generated.md (newest first), idempotent.

Nur Python-3-Stdlib.
"""
import os
import re
import glob
import html
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
ARCHIVE_DIR = os.path.join(REPO, "archive")
OUT_PATH = os.path.join(HERE, "linkedin_posts_generated.md")

NEWSLETTER_CTA = "Ganze Ausgabe + Mo–Fr per Mail: https://abannews.com/"
HASHTAGS = "#KI #DACH #Newsletter"

# Wörter, die die Anti-Hype-Stimme verbieten. Wir bauen sie nie ein und
# prüfen am Ende defensiv, falls Quelltext sie ins Hook schleppt.
FORBIDDEN = [
    "revolutionär", "disruptiv", "game-changer", "game changer", "bahnbrechend",
    "einzigartig", "unglaublich", "perfekt", "mehrwert", "10x", "turbo", "krass",
]

MAX_CHARS = 1300


# --------------------------------------------------------------------------
# HTML-Parsing-Helfer
# --------------------------------------------------------------------------
class _TextExtractor(HTMLParser):
    """Sammelt sichtbaren Text und ignoriert Tags (für Absatz-Strip)."""

    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)

    def text(self):
        return "".join(self.parts)


def strip_tags(fragment):
    p = _TextExtractor()
    p.feed(fragment)
    text = p.text()
    text = html.unescape(text)
    # Whitespace normalisieren
    text = re.sub(r"\s+", " ", text).strip()
    return text


def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def extract_canonical(doc):
    m = re.search(
        r'<link[^>]+rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']',
        doc, re.IGNORECASE)
    if not m:
        m = re.search(
            r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\']canonical["\']',
            doc, re.IGNORECASE)
    return m.group(1).strip() if m else None


def extract_title(doc):
    m = re.search(
        r'<h1[^>]*class=["\'][^"\']*issue-title[^"\']*["\'][^>]*>(.*?)</h1>',
        doc, re.IGNORECASE | re.DOTALL)
    if not m:
        return None
    title = strip_tags(m.group(1))
    # führendes Kaffee-Emoji entfernen
    title = re.sub(r"^☕\s*", "", title).strip()
    return title


def extract_issue_number(path):
    base = os.path.basename(path)
    m = re.match(r"(\d+)", base)
    return m.group(1) if m else "000"


def extract_hook_paragraphs(doc):
    """Die ersten 1-2 <p> nach der 'Einstieg'-Überschrift, als reiner Text."""
    # Block ab "Einstieg"-h2 bis zur nächsten h2 isolieren.
    m = re.search(
        r"<h2[^>]*>\s*Einstieg\s*</h2>(.*?)(?:<h2|</div>)",
        doc, re.IGNORECASE | re.DOTALL)
    if not m:
        return []
    block = m.group(1)
    paras = re.findall(r"<p[^>]*>(.*?)</p>", block, re.IGNORECASE | re.DOTALL)
    out = []
    for raw in paras:
        txt = strip_tags(raw)
        if txt:
            out.append(txt)
        if len(out) >= 2:
            break
    return out


# --------------------------------------------------------------------------
# Post-Komposition
# --------------------------------------------------------------------------
def split_sentences(text):
    # An Satzende-Marken trennen, dabei die Marke behalten.
    parts = re.split(r"(?<=[.!?—])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def clean_line(line):
    # Doppel-Ausrufezeichen sind verboten -> auf eines reduzieren, dann
    # bleibt es ein normaler Satz (Quelltext nutzt sie ohnehin selten).
    line = re.sub(r"!{2,}", ".", line)
    return line.strip()


def build_hook_line(title, sentences):
    """Eine knackige 1-Zeile. Bevorzugt den ersten Satz, sonst den Titel."""
    candidate = ""
    if sentences:
        candidate = sentences[0]
    # Wenn der erste Satz sehr lang ist, lieber den Titel als Hook nehmen.
    if not candidate or len(candidate) > 160:
        candidate = title
    candidate = clean_line(candidate)
    return candidate


def build_insight_lines(sentences, hook_line):
    """2-4 kurze Zeilen mit konkretem Inhalt aus dem Einstieg."""
    lines = []
    for s in sentences:
        s = clean_line(s)
        if not s:
            continue
        # Den bereits als Hook genutzten Satz nicht doppeln.
        if s == hook_line:
            continue
        lines.append(s)
        if len(lines) >= 4:
            break
    # Mindestens 2 Zeilen anstreben; wenn der Einstieg sehr kurz war,
    # einen langen Satz an Kommas in zwei Zeilen brechen.
    if len(lines) < 2 and lines:
        long = lines[0]
        if len(long) > 90 and "," in long:
            head, _, tail = long.partition(",")
            lines = [head.strip() + ".", tail.strip().capitalize()]
    return lines[:4]


def contains_forbidden(text):
    low = text.lower()
    hits = []
    for w in FORBIDDEN:
        if w in low:
            hits.append(w)
    if "!!" in text:
        hits.append("!!")
    return hits


def compose_post(title, url, hook_paras):
    sentences = []
    for p in hook_paras:
        sentences.extend(split_sentences(p))

    hook_line = build_hook_line(title, sentences)
    insight_lines = build_insight_lines(sentences, hook_line)

    blocks = [hook_line, ""]
    if insight_lines:
        blocks.append("\n".join(insight_lines))
        blocks.append("")
    blocks.append(f"Mehr dazu in der Ausgabe: {url}")
    blocks.append(NEWSLETTER_CTA)
    blocks.append("")
    blocks.append(HASHTAGS)

    post = "\n".join(blocks)

    # Längen-Guard: bei Überlänge Insight-Zeilen kürzen.
    while len(post) > MAX_CHARS and insight_lines:
        insight_lines = insight_lines[:-1]
        blocks = [hook_line, ""]
        if insight_lines:
            blocks.append("\n".join(insight_lines))
            blocks.append("")
        blocks.append(f"Mehr dazu in der Ausgabe: {url}")
        blocks.append(NEWSLETTER_CTA)
        blocks.append("")
        blocks.append(HASHTAGS)
        post = "\n".join(blocks)

    return post.strip()


# --------------------------------------------------------------------------
# Haupt-Ablauf
# --------------------------------------------------------------------------
def gather_issues():
    paths = sorted(glob.glob(os.path.join(ARCHIVE_DIR, "0??-*.html")))
    issues = []
    for path in paths:
        doc = read_file(path)
        num = extract_issue_number(path)
        title = extract_title(doc)
        url = extract_canonical(doc)
        hook = extract_hook_paragraphs(doc)
        if not title or not url:
            # Ohne Titel oder URL kein verwertbarer Draft.
            continue
        issues.append({
            "num": num,
            "title": title,
            "url": url,
            "hook": hook,
            "path": path,
        })
    return issues


def main():
    issues = gather_issues()
    # Newest first.
    issues.sort(key=lambda i: i["num"], reverse=True)

    sections = []
    warnings = []
    for issue in issues:
        post = compose_post(issue["title"], issue["url"], issue["hook"])
        hits = contains_forbidden(post)
        if hits:
            warnings.append((issue["num"], hits))
        sections.append(
            "## Ausgabe {num} — {title}\n\n```\n{post}\n```\n".format(
                num=issue["num"], title=issue["title"], post=post))

    header = (
        "# aban news — LinkedIn-Post-Entwürfe\n\n"
        "> Auto-generiert aus den Archiv-Ausgaben via "
        "`automation/generate_linkedin_posts.py`.\n"
        "> Pro Ausgabe ein fertiger LinkedIn-Draft (newest first). "
        "Kein Auto-Posting — kopieren, kurz prüfen, posten.\n\n"
        "---\n\n"
    )

    body = "\n".join(sections)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(header + body)

    print("Generated {} LinkedIn post drafts -> {}".format(
        len(sections), OUT_PATH))
    if warnings:
        for num, hits in warnings:
            print("  WARN Ausgabe {}: forbidden tokens in source hook: {}".format(
                num, ", ".join(hits)))
    else:
        print("  No forbidden voice tokens detected in generated posts.")


if __name__ == "__main__":
    main()
