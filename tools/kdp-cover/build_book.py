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
    """Detailed runbook for a browser agent driving the KDP web UI step by step.
    Human supervises (login/2FA/captcha are NOT automatable, KDP ToS). Each step
    has a verify-checkpoint; on mismatch the agent stops and reports verbatim."""
    import datetime
    ext = book["interior"]["type"] == "external"
    paper_de = {"white": "weißes", "cream": "cremefarbenes", "color": "farbiges"}.get(
        book.get("paper", "white"), book.get("paper", "white"))
    L = book["listing"]
    offset = book.get("release_offset_days", 2)
    release = (datetime.date.today() + datetime.timedelta(days=offset)).isoformat()
    interior_step = (
        f'Manuskript-PDF "{interior_name}" hochladen. WARTEN bis verarbeitet.\n'
        f'        ✓ CHECK: KDP meldet **{pages} Seiten**. Andere Zahl → STOP & melden\n'
        f'          (Cover-Rücken ist auf genau {pages} S. gerechnet).'
        if not ext else
        f'DEIN vorhandener Innenteil ist schon im Entwurf ({pages} Seiten). '
        f'{book["interior"].get("note","")}\n'
        f'        ✓ CHECK: Seitenzahl im Entwurf = **{pages}**. Sonst STOP & melden.'
    )
    return "\n".join([
        f"# Browser-Agent Upload-Runbook — {book['title']}", "",
        f"**Buch:** {book['title']} · **Pen-Name:** {book['author']} · "
        f"**Format:** Taschenbuch {book['trim'][0]}×{book['trim'][1]}\", {paper_de} Papier, s/w, matt",
        f"**Dateien:** `{interior_name or '(eigener Innenteil im Entwurf)'}`, "
        f"`{cover_name}`, Felder aus `metadata.md`", "",
        "## Regeln für den Agenten (wichtig)",
        "- **Login / 2FA / Captcha macht der Mensch** — dort anhalten und übergeben.",
        "- **Niemals endgültig „Veröffentlichen\" klicken** ohne Allens OK. Stattdessen "
        f"unten Terminveröffentlichung auf **{release}** (heute +{offset} Tage) setzen.",
        "- Nach **jedem** Schritt den CHECK prüfen. Stimmt er nicht → **STOP**, exakten "
        "Fehlertext + Screenshot melden, **nicht raten/weiterklicken**.",
        "- Reihenfolge ist Pflicht: **Innenteil zuerst** (setzt Seitenzahl → Cover-Maß), dann Cover.",
        "", "## Schritte", "```",
        "0. Voraussetzung: in KDP eingeloggt, auf der Bookshelf.",
        "   ✓ CHECK: 'Bookshelf' sichtbar. Sonst → Login an Mensch übergeben.",
        "",
        "1. Buch öffnen → 'Taschenbuch' → 'Einrichtung fortsetzen/bearbeiten'.",
        "   ✓ CHECK: Tab 'Taschenbuch-Details' ist aktiv.",
        "",
        "2. TASCHENBUCH-DETAILS aus metadata.md eintragen:",
        "   Sprache, Titel, Untertitel, Autor (Pen-Name), Beschreibung (HTML-Block),",
        "   Verlag leer/optional, Keywords (7), Kategorien (3), KEIN 'für Erwachsene'.",
        "   → 'Speichern und fortfahren'.",
        "   ✓ CHECK: keine roten Pflichtfeld-Fehler; Tab wechselt zu 'Inhalte'.",
        "",
        "3. TASCHENBUCH-INHALTE:",
        "   a) ISBN: 'Kostenlose KDP-ISBN zuweisen' (falls noch keine).",
        f"   b) Druckoptionen: Tinte/Papier = Schwarzweiß, "
        f"{paper_de} Papier; Trim {book['trim'][0]}×{book['trim'][1]} Zoll; Bleed nur falls randabfallend.",
        f"   c) Manuskript: {interior_step}",
        f"   d) Buchcover: 'Eigenes hochladen (PDF)' → `{cover_name}`.",
        "      NICHT den Cover Creator nutzen. KEIN eigener Barcode (KDP setzt ihn selbst).",
        "      ✓ CHECK: Cover-Thumbnail erscheint, keine Maß-Fehlermeldung.",
        "",
        "4. DRUCKVORSCHAU (Previewer) starten → komplett durchklicken.",
        "   ✓ CHECK ERWARTET: KEINE 'Objekt außerhalb der Ränder'- und KEINE Barcode-Fehler.",
        "   - Hinweis 'Schriftarten wurden eingebettet' = nur Info, KEIN Blocker → ok.",
        "   - Echter Fehler (rot, blockiert) → STOP, Wortlaut + Screenshot melden.",
        "   → 'Genehmigen' / 'Speichern und fortfahren'.",
        "",
        "5. PREISE & RECHTE:",
        "   - Rechte/Veröffentlichung: 'Ich besitze die Rechte' / gemeinfrei NICHT.",
        f"   - KDP-Druckkosten anzeigen lassen; Listenpreis USD ${L.get('price_usd','?')}, "
        f"EUR €{L.get('price_eur','?')} (aus metadata.md), übrige Marktplätze automatisch umrechnen.",
        "   ✓ CHECK: Tantieme/Royalty wird positiv angezeigt (Preis > Druckkosten).",
        "",
        "6. TERMINVERÖFFENTLICHUNG statt sofort:",
        f"   - Falls KDP ein Veröffentlichungsdatum anbietet: auf **{release}** setzen.",
        "   - Sonst Entwurf gespeichert lassen und an Allen übergeben (er klickt am Tag X).",
        "   ✓ CHECK: Datum gesetzt ODER sauberer Entwurf. NICHT endgültig publizieren.",
        "",
        "7. ABSCHLUSS: Status + alle CHECK-Ergebnisse zusammenfassen melden.",
        "```", "",
        "## Wenn etwas klemmt",
        "- **Login/2FA/Captcha** → an Mensch übergeben, nicht umgehen.",
        f"- **Seitenzahl ≠ {pages}** → Cover passt nicht; STOP, Allen baut Cover mit echter Zahl neu.",
        "- **'Objekt außerhalb der Ränder'** → Cover-PDF prüfen lassen (Vektor-Tool), nicht im UI fummeln.",
        "- **Unklare Stelle / mehrdeutige Option** → fragen statt raten.",
    ])


def _playbook_md_en(book, pages, cover_name, interior_name):
    """English mirror of the runbook (KDP UI is often English)."""
    import datetime
    ext = book["interior"]["type"] == "external"
    paper_en = {"white": "white", "cream": "cream", "color": "color"}.get(
        book.get("paper", "white"), book.get("paper", "white"))
    L = book["listing"]
    offset = book.get("release_offset_days", 2)
    release = (datetime.date.today() + datetime.timedelta(days=offset)).isoformat()
    interior_step = (
        f'Upload manuscript PDF "{interior_name}". WAIT until processed.\n'
        f'        ✓ CHECK: KDP reports **{pages} pages**. Any other number → STOP & report\n'
        f'          (the cover spine is computed for exactly {pages} pp.).'
        if not ext else
        f'Your existing interior is already in the draft ({pages} pages). '
        f'{book["interior"].get("note","")}\n'
        f'        ✓ CHECK: page count in draft = **{pages}**. Otherwise STOP & report.'
    )
    return "\n".join([
        f"# Browser-Agent Upload Runbook (EN) — {book['title']}", "",
        f"**Book:** {book['title']} · **Pen name:** {book['author']} · "
        f"**Format:** Paperback {book['trim'][0]}×{book['trim'][1]}\", {paper_en} paper, B&W, matte",
        f"**Files:** `{interior_name or '(existing interior in draft)'}`, "
        f"`{cover_name}`, fields from `metadata.md`", "",
        "## Rules for the agent (important)",
        "- **Login / 2FA / Captcha are done by the human** — pause and hand over there.",
        "- **Never click final 'Publish'** without Allen's OK. Instead set scheduled "
        f"release to **{release}** (today +{offset} days) below.",
        "- After **every** step verify the CHECK. On mismatch → **STOP**, report the exact "
        "error text + screenshot, **do not guess / keep clicking**.",
        "- Order is mandatory: **interior first** (sets page count → cover size), then cover.",
        "", "## Steps", "```",
        "0. Precondition: signed in to KDP, on the Bookshelf.",
        "   ✓ CHECK: 'Bookshelf' visible. Else → hand login to human.",
        "",
        "1. Open the book → 'Paperback' → 'Continue/Edit setup'.",
        "   ✓ CHECK: 'Paperback Details' tab is active.",
        "",
        "2. PAPERBACK DETAILS from metadata.md:",
        "   Language, Title, Subtitle, Author (pen name), Description (HTML block),",
        "   Publisher blank/optional, Keywords (7), Categories (3), NOT 'adult content'.",
        "   → 'Save and Continue'.",
        "   ✓ CHECK: no red required-field errors; tab moves to 'Content'.",
        "",
        "3. PAPERBACK CONTENT:",
        "   a) ISBN: 'Get a free KDP ISBN' (if none yet).",
        f"   b) Print options: Ink/Paper = Black & white, {paper_en} paper; "
        f"Trim {book['trim'][0]}×{book['trim'][1]} in; Bleed only if full-bleed.",
        f"   c) Manuscript: {interior_step}",
        f"   d) Book cover: 'Upload a cover you already have (PDF)' → `{cover_name}`.",
        "      Do NOT use Cover Creator. Do NOT add your own barcode (KDP adds it).",
        "      ✓ CHECK: cover thumbnail appears, no size error.",
        "",
        "4. PREVIEWER: launch → click through every page.",
        "   ✓ CHECK EXPECTED: NO 'object outside margins' and NO barcode errors.",
        "   - 'Fonts have been embedded' = info only, NOT a blocker → ok.",
        "   - Real (red, blocking) error → STOP, report wording + screenshot.",
        "   → 'Approve' / 'Save and Continue'.",
        "",
        "5. PRICING & RIGHTS:",
        "   - Rights: 'I own the rights' / NOT public domain.",
        f"   - Show KDP printing cost; list price USD ${L.get('price_usd','?')}, "
        f"EUR €{L.get('price_eur','?')} (from metadata.md), let other marketplaces auto-convert.",
        "   ✓ CHECK: royalty shows positive (price > printing cost).",
        "",
        "6. SCHEDULED RELEASE instead of immediate:",
        f"   - If KDP offers a release date: set it to **{release}**.",
        "   - Otherwise leave a saved draft and hand to Allen (he clicks on day X).",
        "   ✓ CHECK: date set OR clean draft. Do NOT finalize publish.",
        "",
        "7. WRAP-UP: summarize status + all CHECK results.",
        "```", "",
        "## If something is stuck",
        "- **Login/2FA/Captcha** → hand to human, do not bypass.",
        f"- **Page count ≠ {pages}** → cover won't fit; STOP, Allen rebuilds cover with real count.",
        "- **'Object outside margins'** → have the cover PDF checked (vector tool), don't fix in UI.",
        "- **Ambiguous step/option** → ask instead of guessing.",
    ])


def build_book(book, outroot="out"):
    outdir = os.path.join(outroot, book["slug"])
    os.makedirs(outdir, exist_ok=True)
    interior_path, pages = _interior(book, outdir)
    cover_path, cinfo = _cover(book, pages, outdir)
    interior_name = os.path.basename(interior_path) if interior_path else None
    with open(os.path.join(outdir, "metadata.md"), "w") as f:
        f.write(_metadata_md(book, pages))
    cover_name = os.path.basename(cover_path)
    with open(os.path.join(outdir, "upload-playbook.md"), "w") as f:
        f.write(_playbook_md(book, pages, cover_name, interior_name))
    with open(os.path.join(outdir, "upload-playbook.en.md"), "w") as f:
        f.write(_playbook_md_en(book, pages, cover_name, interior_name))
    print(f"✓ {book['slug']}: {pages} S., spine {cinfo['spine']}in → {outdir}/")
    return outdir


# ---------------- book configs ----------------
BOOKS = {
    "adhd": {
        "slug": "adhd-daily-planner",
        "uploaded": True,           # eingereicht 2026-06-03, KDP-Prüfung; ASIN folgt
        "title": "ADHD Daily Planner for Adults",
        "subtitle": "A 90-Day Undated Journal with Time-Blocks, Body Doubling, and a Top-3 Each Day",
        "author": "Marcus Reilly", "trim": (6, 9), "paper": "white",
        "closing": "Undated. Start today. Miss a day guilt-free.",
        "interior": {"type": "planner", "days": 90, "accent": "#138086",
                     "intro": ("Your brain is not broken — it just runs a different operating system. "
                               "This planner uses four simple tools, one page a day, to work with it."),
                     "how_to": planner_interior.ADHD["how_to"]},
        # auto: ai (skipped, no key) -> no supplied image -> drawn brand art (halftone)
        "cover": {**kdp_cover.EXAMPLES["adhd"], "art": {"mode": "auto", "motif": "dots"}},
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
        "uploaded": True,           # eingereicht 2026-06-03, KDP-Prüfung; ASIN folgt
        "title": "Mileage Log Book for Small Business",
        "subtitle": "IRS Publication 463 Contemporaneous Trip Log for Self-Employed, 1099 Contractors, Rideshare Drivers, Realtors & Etsy Sellers — Built to Substantiate Schedule C Line 9 at the 2025 Rate of $0.67/Mile",
        "author": "Marcus Reilly", "trim": (6, 9), "paper": "white",
        "closing": "Keep every mile. Claim every dollar.",
        "interior": {"type": "external", "pages": 119,
                     "note": "Innenteil liegt bereits im KDP-Entwurf (119 S.)."},
        # drawn rings — concentric circles read like an odometer/gauge (businesslike)
        "cover": {**kdp_cover.EXAMPLES["mileage"], "art": {"mode": "draw", "motif": "rings"}},
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
    args = sys.argv[1:]
    if "--pending" in args:
        # code word "BUCHDRUCK": rebuild only books not yet uploaded to KDP
        keys = [k for k, b in BOOKS.items() if not b.get("uploaded")]
        print(f"pending (nicht hochgeladen): {keys or '— alle hochgeladen —'}")
    else:
        keys = [a for a in args if not a.startswith("-")] or list(BOOKS)
    for k in keys:
        build_book(BOOKS[k])
