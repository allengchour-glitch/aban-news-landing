#!/usr/bin/env python3
# English counterpart of add_was_macht_das.py — inserts a beginner "What does
# this do?" line right after the first <p class="lead">…</p> on each EN tool
# page. Idempotent (marker data-aban-was).
import os

SENT = {
 "angebot-schreiben.html": "Helps you write a clean quote — with or without VAT, ready to copy.",
 "mahnung-schreiben.html": "Creates a polite payment reminder or dunning letter as ready-to-copy text.",
 "auftragsbestaetigung-schreiben.html": "Confirms an order in writing — ready-to-copy text to send.",
 "text-anonymisieren.html": "Masks names, IBANs and the like in your text before it goes into the AI.",
 "ki-token-rechner.html": "Estimates how many tokens your AI text needs — and what a request roughly costs.",
 "kleinunternehmerregelung-einfach-erklaert.html": "Explains the small-business VAT exemption (DACH) and quickly checks if it applies to you.",
 "wie-nutze-ich-ki-richtig.html": "Beginner's guide: what AI is good at, where it isn't, and 5 simple rules.",
 "steuer-basics-selbststaendige.html": "Explains simply which taxes affect you and how much to set aside.",
 "maerkte.html": "Shows current crypto and stock prices with a converter and 30-day charts.",
 "geld-und-ki.html": "Starting point: all the honest money guides, calculators and checks in one place.",
}

MARK = "data-aban-was"

def block(sentence):
    return ('\n<p ' + MARK + ' style="max-width:760px;margin:14px auto 0;padding:10px 14px;'
            'background:#fef3c7;border:1px solid #fde9c8;border-radius:10px;color:#374151;'
            'font-size:.92rem;line-height:1.5;text-align:left">'
            '\U0001F4A1 <strong style="color:#1f2937">What does this do?</strong> ' + sentence + '</p>')

def main():
    root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "en")
    added, skip, miss = [], [], []
    for fn, sentence in SENT.items():
        path = os.path.join(root, fn)
        if not os.path.exists(path):
            miss.append(fn); continue
        with open(path, encoding="utf-8") as f:
            html = f.read()
        if MARK in html:
            skip.append(fn); continue
        lead = html.find('<p class="lead"')
        if lead == -1:
            miss.append(fn + " (no lead)"); continue
        end = html.find("</p>", lead)
        if end == -1:
            miss.append(fn + " (no </p>)"); continue
        ins = end + len("</p>")
        html = html[:ins] + block(sentence) + html[ins:]
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        added.append(fn)
    print("INSERTED (%d): %s" % (len(added), ", ".join(sorted(added))))
    print("SKIPPED/already (%d): %s" % (len(skip), ", ".join(sorted(skip))))
    print("MISSING/no anchor (%d): %s" % (len(miss), ", ".join(sorted(miss))))

if __name__ == "__main__":
    main()
