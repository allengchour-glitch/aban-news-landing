"""
ebook_diagrams.py — Marken-Diagramme für das Anti-Hype-eBook (Pillow).

Erzeugt schlichte, selbst gezeichnete Grafiken in der Aban-Amber-Palette —
keine Stock-/Web-Bilder (DSGVO + Copyright), alles lokal generiert.

Genutzt von generate_ebook.py (PDF + ePub). Sprach-spezifisch, weil die
Beschriftungen übersetzt sind. Dateinamen: fig-<key>-<lang>.png in OUT_DIR.

Abhängigkeit: pillow.  Kein Netzwerkzugriff.
"""
import os

from PIL import Image, ImageDraw, ImageFont

AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9)
CREAM = (254, 243, 199)
INK = (31, 41, 55)
MUTED = (107, 114, 128)
WHITE = (255, 255, 255)
LINE = (229, 231, 235)
OK = (15, 157, 107)

SS = 2  # Supersampling-Faktor für glatte Kanten


def _font(size, bold=False):
    """Versuche eine TrueType-Schrift, sonst PIL-Default (skaliert über SS)."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else ""),
        "/usr/share/fonts/truetype/liberation/LiberationSans%s.ttf" % ("-Bold" if bold else "-Regular"),
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size * SS)
            except Exception:
                pass
    return ImageFont.load_default()


def _text_wh(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def _wrap(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if _text_wh(draw, trial, font)[0] <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _rrect(draw, xy, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def _canvas(w, h):
    img = Image.new("RGB", (w * SS, h * SS), WHITE)
    return img, ImageDraw.Draw(img)


def _finish(img, path, w, h):
    img = img.resize((w, h), Image.LANCZOS)
    img.save(path, "PNG")
    return path


def _centered(draw, cx, y, text, font, fill):
    tw, th = _text_wh(draw, text, font)
    draw.text((cx - tw / 2, y), text, font=font, fill=fill)
    return th


# ── Figur 1: 3-Fragen-Filter (drei Boxen + Pfeile + Ergebnis) ────────────────
def _fig_filter(path, lab):
    W, H = 900, 560
    img, d = _canvas(W, H)
    s = SS
    title_f = _font(20, bold=True)
    box_f = _font(15, bold=True)
    small_f = _font(12)
    _centered(d, W / 2 * s, 20 * s, lab["title"], title_f, INK)
    y = 70
    for i, q in enumerate(lab["steps"], 1):
        bx0, bx1 = 90 * s, (W - 90) * s
        by0, by1 = y * s, (y + 95) * s
        _rrect(d, [bx0, by0, bx1, by1], 16 * s, fill=CREAM, outline=AMBER, width=2 * s)
        # Nummernkreis
        cr = 22 * s
        ccx, ccy = (130) * s, (y + 47) * s
        d.ellipse([ccx - cr, ccy - cr, ccx + cr, ccy + cr], fill=AMBER)
        nf = _font(18, bold=True)
        nw, nh = _text_wh(d, str(i), nf)
        d.text((ccx - nw / 2, ccy - nh / 2 - 3 * s), str(i), font=nf, fill=WHITE)
        # Frage (umbrochen)
        tx = 175 * s
        lines = _wrap(d, q, box_f, bx1 - tx - 30 * s)
        ty = by0 + (95 * s - len(lines) * 22 * s) / 2
        for ln in lines:
            d.text((tx, ty), ln, font=box_f, fill=INK)
            ty += 22 * s
        # Pfeil nach unten
        if i < len(lab["steps"]):
            ax = W / 2 * s
            ay0, ay1 = (y + 95) * s, (y + 118) * s
            d.line([ax, ay0, ax, ay1], fill=AMBER_DK, width=3 * s)
            d.polygon([(ax - 7 * s, ay1 - 8 * s), (ax + 7 * s, ay1 - 8 * s), (ax, ay1)], fill=AMBER_DK)
        y += 118
    # Ergebnis-Band
    ry0, ry1 = (y + 4) * s, (y + 52) * s
    _rrect(d, [90 * s, ry0, (W - 90) * s, ry1], 14 * s, fill=AMBER, outline=None)
    rw, rh = _text_wh(d, lab["result"], box_f)
    d.text((W / 2 * s - rw / 2, (ry0 + ry1) / 2 - rh / 2 - 3 * s), lab["result"], font=box_f, fill=WHITE)
    return _finish(img, path, W, H)


# ── Figur 2: Minimaler KI-Stack (4 gestapelte Schichten) ─────────────────────
def _fig_stack(path, lab):
    W, H = 900, 540
    img, d = _canvas(W, H)
    s = SS
    title_f = _font(20, bold=True)
    layer_f = _font(15, bold=True)
    note_f = _font(12)
    _centered(d, W / 2 * s, 20 * s, lab["title"], title_f, INK)
    fills = [AMBER, AMBER_DK, (146, 64, 14), (87, 38, 8)]
    y = 80
    lh = 92
    for i, (name, note) in enumerate(lab["layers"]):
        by0, by1 = y * s, (y + lh - 14) * s
        _rrect(d, [120 * s, by0, (W - 120) * s, by1], 12 * s, fill=fills[i], outline=None)
        d.text((150 * s, (by0 + 16 * s)), name, font=layer_f, fill=WHITE)
        nlines = _wrap(d, note, note_f, (W - 120) * s - 150 * s - 30 * s)
        ny = by0 + 42 * s
        for ln in nlines[:2]:
            d.text((150 * s, ny), ln, font=note_f, fill=CREAM)
            ny += 18 * s
        y += lh
    return _finish(img, path, W, H)


# ── Figur 3: Arbeitstag vorher/nachher (zwei Balken) ─────────────────────────
def _fig_day(path, lab):
    W, H = 900, 460
    img, d = _canvas(W, H)
    s = SS
    title_f = _font(20, bold=True)
    bar_f = _font(14, bold=True)
    cap_f = _font(13)
    _centered(d, W / 2 * s, 20 * s, lab["title"], title_f, INK)
    base_y = 360
    # Balken: vorher 3.0h, nachher 1.5h (ehrliche Halbierung, kein 10x)
    bars = [(lab["before"], 3.0, MUTED), (lab["after"], 1.5, AMBER)]
    max_h = 230
    bw = 150
    xs = [250, 520]
    for (label, hours, col), x in zip(bars, xs):
        bh = int(max_h * (hours / 3.0))
        by0 = (base_y - bh) * s
        by1 = base_y * s
        _rrect(d, [x * s, by0, (x + bw) * s, by1], 10 * s, fill=col, outline=None)
        # Stundenwert
        hv = lab["hours_fmt"].format(hours).replace(".", lab.get("dec", "."))
        hw, hh = _text_wh(d, hv, bar_f)
        d.text(((x + bw / 2) * s - hw / 2, by0 - 26 * s), hv, font=bar_f, fill=INK)
        # Label
        lw, _ = _text_wh(d, label, cap_f)
        d.text(((x + bw / 2) * s - lw / 2, (base_y + 14) * s), label, font=cap_f, fill=INK)
    # Grundlinie
    d.line([200 * s, base_y * s, 720 * s, base_y * s], fill=LINE, width=2 * s)
    # Fazit
    cap = lab["caption"]
    cl = _wrap(d, cap, cap_f, 760 * s)
    cy = 400 * s
    for ln in cl:
        cw, _ = _text_wh(d, ln, cap_f)
        d.text((W / 2 * s - cw / 2, cy), ln, font=cap_f, fill=MUTED)
        cy += 18 * s
    return _finish(img, path, W, H)


# ── Beschriftungen pro Sprache ───────────────────────────────────────────────
LABELS = {
    "de": {
        "filter": {"title": "Der 3-Fragen-Bullshit-Filter",
                   "steps": ["Was genau wird hier ersetzt?",
                             "Was kostet es mich, wenn es falsch liegt?",
                             "Funktioniert es ohne mich — oder mit mir?"],
                   "result": "Übersteht alle drei? Zweiter Blick lohnt sich."},
        "stack": {"title": "Dein minimaler KI-Stack",
                  "layers": [("1 · Sprachmodell", "Pflicht. Claude oder ChatGPT, bezahlt."),
                             ("2 · Automations-Hub", "Optional. Make.com oder n8n."),
                             ("3 · Wissens-Ort", "Notion, Obsidian — durchsuchbar."),
                             ("4 · DSGVO-Klarheit", "Nicht verhandelbar.")]},
        "day": {"title": "Ein Arbeitstag — vorher / nachher",
                "before": "ohne KI", "after": "mit KI",
                "hours_fmt": "~{:.1f} h", "dec": ",",
                "caption": "Realistisch etwa die Hälfte — nicht das „10x“ aus den Anzeigen."},
    },
    "en": {
        "filter": {"title": "The 3-question bullshit filter",
                   "steps": ["What exactly does it replace?",
                             "What does it cost me when it's wrong?",
                             "Does it work without me — or with me?"],
                   "result": "Survives all three? Worth a second look."},
        "stack": {"title": "Your minimal AI stack",
                  "layers": [("1 · Language model", "Required. Claude or ChatGPT, paid."),
                             ("2 · Automation hub", "Optional. Make.com or n8n."),
                             ("3 · Place for knowledge", "Notion, Obsidian — searchable."),
                             ("4 · GDPR clarity", "Non-negotiable.")]},
        "day": {"title": "One workday — before / after",
                "before": "without AI", "after": "with AI",
                "hours_fmt": "~{:.1f} h", "dec": ".",
                "caption": "Roughly half the time — not the “10x” from the ads."},
    },
    "fr": {
        "filter": {"title": "Le filtre anti-bullshit en 3 questions",
                   "steps": ["Qu'est-ce qui est remplacé, exactement ?",
                             "Combien ça me coûte quand il se trompe ?",
                             "Ça marche sans moi — ou avec moi ?"],
                   "result": "Survit aux trois ? Un second regard en vaut la peine."},
        "stack": {"title": "Ton stack IA minimal",
                  "layers": [("1 · Modèle de langage", "Obligatoire. Claude ou ChatGPT, payant."),
                             ("2 · Hub d'automatisation", "Optionnel. Make.com ou n8n."),
                             ("3 · Lieu pour le savoir", "Notion, Obsidian — cherchable."),
                             ("4 · Clarté RGPD", "Non négociable.")]},
        "day": {"title": "Une journée — avant / après",
                "before": "sans IA", "after": "avec IA",
                "hours_fmt": "~{:.1f} h", "dec": ",",
                "caption": "À peu près la moitié — pas le « 10x » des publicités."},
    },
    "it": {
        "filter": {"title": "Il filtro anti-bullshit in 3 domande",
                   "steps": ["Cosa viene sostituito, esattamente?",
                             "Quanto mi costa quando sbaglia?",
                             "Funziona senza di me — o con me?"],
                   "result": "Sopravvive a tutte e tre? Merita un secondo sguardo."},
        "stack": {"title": "Il tuo stack IA minimo",
                  "layers": [("1 · Modello linguistico", "Obbligatorio. Claude o ChatGPT, a pagamento."),
                             ("2 · Hub di automazione", "Opzionale. Make.com o n8n."),
                             ("3 · Posto per la conoscenza", "Notion, Obsidian — ricercabile."),
                             ("4 · Chiarezza GDPR", "Non negoziabile.")]},
        "day": {"title": "Una giornata — prima / dopo",
                "before": "senza IA", "after": "con IA",
                "hours_fmt": "~{:.1f} h", "dec": ",",
                "caption": "Più o meno la metà — non il “10x” delle pubblicità."},
    },
}


def ensure_diagrams(out_dir, lang):
    """Erzeugt die 3 Diagramme für eine Sprache; gibt {key: dateiname} zurück."""
    lab = LABELS.get(lang, LABELS["en"])
    names = {
        "filter": "fig-filter-%s.png" % lang,
        "stack": "fig-stack-%s.png" % lang,
        "day": "fig-day-%s.png" % lang,
    }
    _fig_filter(os.path.join(out_dir, names["filter"]), lab["filter"])
    _fig_stack(os.path.join(out_dir, names["stack"]), lab["stack"])
    _fig_day(os.path.join(out_dir, names["day"]), lab["day"])
    return names


if __name__ == "__main__":
    here = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
    os.makedirs(here, exist_ok=True)
    for lg in ("de", "en", "fr", "it"):
        print(lg, ensure_diagrams(here, lg))
