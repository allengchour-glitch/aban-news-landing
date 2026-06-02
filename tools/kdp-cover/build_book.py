#!/usr/bin/env python3
"""KDP book pipeline — one call builds everything for a paperback:

    cover (vector PDF)  +  interior PDF  +  metadata.md  +  upload-playbook.md

Key win: the cover spine is computed from the ACTUAL interior page count, so the
two always match (no more "assume 119 pages").

    python3 build_book.py            # builds all BOOKS below into ./out/<slug>/
    python3 build_book.py adhd       # build a single book by key

Config schema (one dict per book) — see BOOKS at the bottom for full examples:
    slug, title, subtitle, author, trim=(w,h), paper="white",
    interior = {"type":"planner", ...}  |  {"type":"external", "pages":N, "note":...}
    cover    = {...kdp_cover cfg without trim/pages/paper...}
    listing  = {description?, keywords[7], categories[2], price_usd, price_eur,
                language, ai_text:bool, ai_images:bool, low_content:bool}
"""
import os, sys
import kdp_cover
import planner_interior
import cover_art


def _interior(book, outdir):
    """Returns (interior_path_or_None, page_count)."""
    it = book["interior"]
    if it["type"] == "planner":
        cfg = dict(it); cfg.pop("type")
        cfg.setdefault("title", book["title"])
        cfg.setdefault("subtitle", book["subtitle"])
        cfg.setdefault("author", book["author"])
        cfg.setdefault("title_lines", _auto_title_lines(book["title"]))
        path = os.path.join(outdir, f"{book['slug']}-interior.pdf")
        info = planner_interior.build_interior(cfg, path)
        return path, info["pages"]
    if it["type"] == "external":
        # interior supplied by the user; we only need its page count for the spine
        return None, it["pages"]
    raise ValueError(f"unknown interior type {it['type']}")


def _auto_title_lines(title):
    main = title.split(":")[0].split("—")[0].strip()
    words = main.split()
    if len(words) <= 3:
        return [main]
    mid = (len(words) + 1) // 2
    return [" ".join(words[:mid]), " ".join(words[mid:])]


def _cover(book, pages, outdir):
    cfg = dict(book["cover"])
    cfg["trim"] = book["trim"]; cfg["paper"] = book.get("paper", "white"); cfg["pages"] = pages
    cfg.setdefault("author", book["author"].upper())
    # resolve front-cover art (image / drawn / ai) with self-diagnosis + fallback
    art = cover_art.resolve(cfg, book["trim"], bleed=cfg.get("bleed", 0.125),
                            dpi=cfg.get("art_dpi", 300), workdir=outdir)
    for ln in art["diag"]:
        print(ln)
    if art["path"]:
        cfg["front_image"] = art["path"]; cfg["front_scrim"] = art["scrim"]
    path = os.path.join(outdir, f"{book['slug']}-cover.pdf")
    info = kdp_cover.build_cover(cfg, path)
    return path, info


def _description_html(book):
    L = book["listing"]
    if L.get("description"):
        return L["description"]
    cov = book["cover"]
    head = " ".join(cov.get("back_head", [book["title"]]))
    bullets = "".join(f"<li>{b}</li>" for b in cov.get("bullets", []))
    return (f"<h4>{head}</h4>\n<p>{cov.get('back_para','')}</p>\n"
            f"<ul>{bullets}</ul>\n<p>{book.get('closing','')}</p>")


def _metadata_md(book, pages):
    L = book["listing"]
    kw = L.get("keywords", [])
    cats = L.get("categories", [])
    ai = []
    if L.get("ai_text"): ai.append("Text")
    if L.get("ai_images"): ai.append("Images")
    ai_str = ", ".join(ai) if ai else "None (declare per KDP's AI policy)"
    lines = [
        f"# KDP listing — {book['title']}", "",
        "## Book details",
        f"- **Title:** {book['title']}",
        f"- **Subtitle:** {book['subtitle']}",
        f"- **Author (pen name):** {book['author']}",
        f"- **Language:** {L.get('language','English')}",
        f"- **Adult content:** No",
        "",
        "## Description (paste into KDP — limited HTML allowed)",
        "```html", _description_html(book), "```", "",
        "## Keywords (7 slots)",
        *[f"{i+1}. {k}" for i, k in enumerate(kw)],
        "" if kw else "_(fill 7 keywords)_", "",
        "## Categories (choose 3 in KDP)",
        *[f"- {c}" for c in cats],
        "" if cats else "_(pick 3 browse categories)_", "",
        "## Print options",
        f"- **Trim:** {book['trim'][0]} x {book['trim'][1]} in",
        f"- **Interior:** Black & white, {book.get('paper','white')} paper",
        f"- **Page count:** {pages}",
        f"- **Cover finish:** Matte",
        f"- **Bleed:** No (interior) / cover includes 0.125\" bleed",
        f"- **Barcode:** let Amazon place it (do NOT add your own)",
        "",
        "## Pricing",
        f"- **USD:** ${L.get('price_usd','?')}",
        f"- **EUR:** €{L.get('price_eur','?')}",
        "",
        "## AI content disclosure (KDP asks this)",
        f"- AI-generated: {ai_str}",
        "- Note: blank planner/log forms are typically NOT 'content'; disclose AI"
        " only for AI-written text, AI images, or AI translation per KDP's policy.",
    ]
    return "\n".join(lines)


def _playbook_md(book, pages, cover_name, interior_name):
    ext = book["interior"]["type"] == "external"
    paper_de = {"white": "weißes", "cream": "cremefarbenes", "color": "farbiges"}.get(
        book.get("paper", "white"), book.get("paper", "white"))
    interior_step = (
        f'   - Manuskript: "{interior_name}" hochladen, auf {pages} Seiten warten.'
        if not ext else
        f'   - Manuskript: DEIN vorhandener Innenteil ({pages} Seiten). '
        f'{book["interior"].get("note","")}'
    )
    return "\n".join([
        f"# Browser-Claude Upload-Playbook — {book['title']}", "",
        "WICHTIG: Innenteil ZUERST (setzt Seitenzahl → Cover-Maß), dann Cover.", "",
        "```",
        f"AUFGABE — KDP Taschenbuch fertigstellen: {book['title']} ({book['author']}).",
        "1. Bookshelf → dieses Buch → Taschenbuch → 'Einrichtung fortsetzen'.",
        "2. Taschenbuch-Details: Titel/Untertitel/Autor/Beschreibung/Keywords/",
        "   Kategorien/Sprache aus metadata.md eintragen.",
        "3. Taschenbuch-Inhalte:",
        f"   - Trim {book['trim'][0]} x {book['trim'][1]} Zoll, {paper_de} Papier, s/w, matt.",
        interior_step,
        f"   - Cover (PDF): {cover_name}  (NICHT Cover Creator; KEIN eigener Barcode).",
        "4. Druckvorschau starten → durchklicken. Erwartung: keine Margen-/Barcode-Fehler.",
        "   (Font-Hinweis 'wir haben eingebettet' = nur Hinweis, kein Blocker.)",
        "5. Preise aus metadata.md setzen.",
        "6. NICHT veröffentlichen, bis Allen bestätigt. Bei Fehler: Wortlaut+Screenshot melden.",
        "```", "",
        f"Dateien: `{interior_name or '(eigener Innenteil)'}`, `{cover_name}`, `metadata.md`.",
    ])


def build_book(book, outroot="out"):
    outdir = os.path.join(outroot, book["slug"])
    os.makedirs(outdir, exist_ok=True)
    interior_path, pages = _interior(book, outdir)
    cover_path, cinfo = _cover(book, pages, outdir)
    interior_name = os.path.basename(interior_path) if interior_path else None
    with open(os.path.join(outdir, "metadata.md"), "w") as f:
        f.write(_metadata_md(book, pages))
    with open(os.path.join(outdir, "upload-playbook.md"), "w") as f:
        f.write(_playbook_md(book, pages, os.path.basename(cover_path), interior_name))
    print(f"✓ {book['slug']}: {pages} S., spine {cinfo['spine']}in → {outdir}/")
    return outdir


# ---------------- book configs ----------------
BOOKS = {
    "adhd": {
        "slug": "adhd-daily-planner",
        "title": "ADHD Daily Planner for Adults",
        "subtitle": "A 90-Day Planner Built for an ADHD Brain — Time-Blocks, Body Doubling, Dopamine Tracking, and the Three Most Important Tasks of the Day",
        "author": "Marcus Reilly", "trim": (6, 9), "paper": "white",
        "closing": "Undated. Start today. Miss a day guilt-free.",
        "interior": {"type": "planner", "days": 90, "accent": "#138086",
                     "intro": ("Your brain is not broken — it just runs a different operating system. "
                               "This planner uses four simple tools, one page a day, to work with it."),
                     "how_to": planner_interior.ADHD["how_to"]},
        # auto: ai (skipped, no key) -> no supplied image -> drawn brand art
        "cover": {**kdp_cover.EXAMPLES["adhd"], "art": {"mode": "auto"}},
        "listing": {
            "language": "English", "price_usd": 8.99, "price_eur": 8.99,
            "ai_text": False, "ai_images": False, "low_content": True,
            "keywords": ["adhd planner for adults", "adhd daily planner", "time blocking planner",
                         "dopamine menu journal", "executive function planner",
                         "undated daily planner adhd", "body doubling planner"],
            "categories": ["Self-Help > Personal Health > ADHD",
                           "Health, Fitness & Dieting > Mental Health",
                           "Office & School Supplies > Calendars & Planners"],
        },
    },
    "mileage": {
        "slug": "mileage-log-book",
        "title": "Mileage Log Book for Small Business",
        "subtitle": "IRS Publication 463 Contemporaneous Trip Log for Self-Employed, 1099 Contractors, Rideshare Drivers, Realtors & Etsy Sellers — Built to Substantiate Schedule C Line 9 at the 2025 Rate of $0.67/Mile",
        "author": "Marcus Reilly", "trim": (6, 9), "paper": "white",
        "closing": "Keep every mile. Claim every dollar.",
        "interior": {"type": "external", "pages": 119,
                     "note": "Innenteil liegt bereits im KDP-Entwurf (119 S.)."},
        # typographic cover (no image) — set art.src or mode "auto" to add one
        "cover": {**kdp_cover.EXAMPLES["mileage"], "art": {"mode": "none"}},
        "listing": {
            "language": "English", "price_usd": 6.99, "price_eur": 6.99,
            "ai_text": False, "ai_images": False, "low_content": True,
            "keywords": ["mileage log book", "mileage log book for taxes", "auto mileage log",
                         "vehicle mileage tracker", "rideshare mileage log",
                         "small business mileage log", "1099 tax deduction log"],
            "categories": ["Business & Money > Accounting",
                           "Business & Money > Taxation > Small Business",
                           "Office & School Supplies > Forms, Recordkeeping & Money Handling"],
        },
    },
}

if __name__ == "__main__":
    keys = sys.argv[1:] or list(BOOKS)
    for k in keys:
        build_book(BOOKS[k])
