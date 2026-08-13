#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
produkt-imperium/generate_emergency_binder.py — builds "The Emergency Binder".

English edition of the Notfall-Ordner, aimed at EXPATS and English speakers in
Germany, Austria and Switzerland (the emergency-number tables stay valid — that
is the point of this niche). Layout engine is imported from
generate_notfallordner.py; only the content lives here.

    python3 generate_emergency_binder.py            # full     -> ausgabe/emergency-binder.pdf
    python3 generate_emergency_binder.py --probe    # preview  -> ausgabe/emergency-binder-preview.pdf

⚠️ The repo is PUBLIC: the full PDF stays git-ignored in ausgabe/ and is
uploaded to Lemon Squeezy by hand (checkout switch NOTFALL_EN_BUY_URL in
js/checkout-config.js). Only the preview may be copied to /downloads/.

Not legal advice. Security principle everywhere: NO passwords or PINs in the
binder — only WHERE access lives.
"""
import sys

from reportlab.lib.units import mm
from reportlab.lib.colors import white

from generate_notfallordner import (Ordner, OUT, VERSION, W, H, ML, MR, MT, CW,
                                    INK, MUTED, LINE, AMBER, AMBER_DK, AMBER_LT,
                                    CREAM, BG, FIELD_BG)


def s_titel(o):
    o.seite += 1
    o.c.setFillColor(BG)
    o.c.rect(0, 0, W, H, stroke=0, fill=1)
    o.c.setFillColor(AMBER)
    o.c.rect(0, H - 60 * mm, W, 60 * mm, stroke=0, fill=1)
    o.c.setFillColor(white)
    o.c.setFont("Helvetica-Bold", 34)
    o.c.drawString(ML, H - 34 * mm, "The Emergency Binder")
    o.c.setFont("Helvetica", 14)
    o.c.drawString(ML, H - 44 * mm, "The fill-in life dossier for expats in Germany, Austria")
    o.c.drawString(ML, H - 51 * mm, "& Switzerland — so your loved ones can find everything.")
    y = H - 84 * mm
    o.c.setFillColor(INK)
    o.c.setFont("Helvetica", 11.5)
    for z in ["Everything important in one place: contacts, accounts, contracts,",
              "insurance, powers of attorney, your digital estate.",
              "",
              "Fill it in on screen or print it out. Set it up once,",
              "update it once a year — done."]:
        o.c.drawString(ML, y, z)
        y -= 6.5 * mm
    y -= 6 * mm
    o.c.setFillColor(CREAM)
    o.c.setStrokeColor(AMBER)
    o.c.roundRect(ML, y - 24 * mm, CW, 26 * mm, 2.5 * mm, stroke=1, fill=1)
    o.c.setFillColor(AMBER_DK)
    o.c.setFont("Helvetica-Bold", 10.5)
    o.c.drawString(ML + 7 * mm, y - 6 * mm, "The most important rule in this binder:")
    o.c.setFont("Helvetica", 10.5)
    o.c.drawString(ML + 7 * mm, y - 12.5 * mm, "It NEVER contains passwords or PINs — only WHERE they live.")
    o.c.drawString(ML + 7 * mm, y - 19 * mm, "That keeps it useful without becoming a risk itself.")
    o.c.setFillColor(MUTED)
    o.c.setFont("Helvetica", 9)
    o.c.drawString(ML, 22 * mm, "aban news · abannews.com · " + o.version)
    o.c.drawString(ML, 16 * mm, "Not legal advice — for powers of attorney, living wills and testaments see the official bodies on page 12.")


def s_anleitung(o):
    o.neue_seite("How to use this binder",
                 "Five minutes of instructions — then you'll be done faster than you think.")
    o.text("1.  Fill in the emergency page first (next page).", fett=True)
    o.text("That page alone does half the job: who to call in an emergency is settled.", farbe=MUTED, einzug=6)
    o.abstand(2)
    o.text("2.  Then work chapter by chapter — not everything at once.", fett=True)
    o.text("15 minutes per chapter is enough. Leave blanks for what you don't know and add it later.", farbe=MUTED, einzug=6)
    o.abstand(2)
    o.text("3.  Store the filled-in file safely — or print it.", fett=True)
    o.text("Digital: an encrypted folder / your password manager. Printed: one place that 1–2 trusted people know about.", farbe=MUTED, einzug=6)
    o.abstand(2)
    o.text("4.  Tell your trusted people THAT the binder exists and WHERE it is.", fett=True)
    o.text("The best binder is useless if nobody can find it.", farbe=MUTED, einzug=6)
    o.abstand(2)
    o.text("5.  Once a year: the 20-minute annual check (last page).", fett=True)
    o.text("New accounts, cancelled contracts, new insurance? Update briefly, note the date, done.", farbe=MUTED, einzug=6)
    o.abstand(4)
    o.hinweis("Security: never write passwords, PINs or TANs anywhere in here. Write WHERE access lives instead — e.g. “password manager, emergency sheet in the bank safe deposit box”. Treat the filled binder like a passport: don't e-mail it, don't put it in open cloud folders.")
    o.abstand(2)
    o.text("What this binder is NOT:", fett=True)
    o.text("Not a legal document and no substitute for a will, living will or power of attorney —", farbe=MUTED)
    o.text("it only records whether they exist and where they are. Official bodies: page 12.", farbe=MUTED)


def s_notfall(o):
    o.neue_seite("In an emergency — first",
                 "Print this page and keep it in a fixed spot — e.g. inside a cupboard door.")
    o.text("Official emergency numbers", fett=True, gr=11.5)
    o.abstand(1)
    o.tabelle(
        ["", "Germany", "Austria", "Switzerland"],
        [["General emergency", "112", "112", "112"],
         ["Police", "110", "133", "117"],
         ["Fire brigade", "112", "122", "118"],
         ["Ambulance", "112", "144", "144"],
         ["On-call doctor", "116 117", "141", "regional (Ärztefon)"],
         ["Poison control", "by region*", "+43 1 406 43 43", "145 (Tox Info)"],
         ["Rega (air rescue)", "—", "—", "1414"],
         ["Block bank cards", "116 116", "bank hotline", "bank hotline"]],
        [40, 43, 43, 44])
    o.text("* German poison control differs by state — write your regional number below.", farbe=MUTED, gr=8.6)
    o.abstand(4)
    o.text("My emergency contacts", fett=True, gr=11.5)
    o.abstand(2)
    o.zeile(("1. Name", 52), ("Relationship", 38), ("Phone", None))
    o.zeile(("2. Name", 52), ("Relationship", 38), ("Phone", None))
    o.zeile(("Family doctor (Hausarzt)", 52), ("Practice", 38), ("Phone", None))
    o.zeile(("Regional poison control", 62), ("Contact back home (family abroad)", None))
    o.abstand(1)
    o.zeile(("This binder lives (printed/digital) …", None), ("Spare key lives …", None))


def s_person(o):
    o.neue_seite("Personal details",
                 "The basics: who you are, which documents exist, and where they live.")
    o.zeile(("First name, last name", 80), ("Date of birth", None))
    o.zeile(("Place of birth", 80), ("Nationality/-ies", None))
    o.zeile(("Address (street, postcode, city)", None))
    o.zeile(("Phone", 52), ("E-mail", None))
    o.zeile(("Marital status", 52), ("Social security / AHV / tax no. — TYPE + where it lives", None))
    o.abstand(2)
    o.text("IDs, permits & certificates — what exists, and where is it?", fett=True)
    o.abstand(2)
    o.zeile(("Passport / ID — location", None), ("Driving licence — location", None))
    o.zeile(("Residence permit / visa — location", None), ("Work permit — location", None))
    o.zeile(("Birth certificate — location", None), ("Marriage certificate — location", None))
    o.hinweis("As an expat, your residence/work permit matters as much as your passport. “Location” means: precise enough that someone else finds it. “Insurance folder, office shelf, 2nd compartment” beats “somewhere in the office”.")


def s_familie(o):
    o.neue_seite("Family & key contacts",
                 "Who should your relatives inform — personally and officially?")
    for rolle in ["Partner", "Child", "Child", "Parents", "Siblings"]:
        o.zeile((rolle + " — name", 62), ("Phone", 42), ("Note", None))
    o.abstand(2)
    o.text("Official & professional contacts", fett=True)
    o.abstand(2)
    o.zeile(("Employer (HR department)", 62), ("Phone", None))
    o.zeile(("Tax adviser (Steuerberater/Treuhand)", 62), ("Phone", None))
    o.zeile(("Lawyer / notary", 62), ("Phone", None))
    o.zeile(("Landlord / property manager", 62), ("Phone", None))
    o.zeile(("Embassy/consulate of your home country", 62), ("Phone", None))


def s_medizin(o):
    o.neue_seite("Health",
                 "What doctors and relatives must know immediately in an emergency.")
    o.zeile(("Blood type", 34), ("Allergies / intolerances", None))
    o.block("Current medication (name, dose, what for)", 3)
    o.block("Diagnoses / chronic conditions someone should know about", 2)
    o.zeile(("Health insurer & where the card/number lives", None), ("Vaccination record — location", None))
    o.zeile(("Organ donor card? Where?", None), ("Glasses/hearing aid/implants — notes", None))
    o.abstand(1)
    o.text("Living will & co. are recorded on page 12 (with official sources).", farbe=MUTED, gr=9.4)


def s_konten(o):
    o.neue_seite("Accounts & cards",
                 "Which accounts exist — WITHOUT credentials. Only: bank, purpose, where access lives.")
    o.hinweis("Never write a PIN, password or TAN here. “Access lives …” means e.g.: password manager, bank safe deposit box, sealed envelope at the notary.")
    for i in range(1, 5):
        o.zeile(("Account %d — bank" % i, 48), ("Purpose (salary, rent, savings …)", 52), ("Access lives …", None))
    o.zeile(("Cards (debit/credit) — which exist?", None), ("Blocking hotline(s) of my bank(s)", None))
    o.zeile(("Brokerage / securities — provider", 62), ("Access lives …", None))
    o.zeile(("Accounts back home (country, bank)", 62), ("Access lives …", None))
    o.zeile(("Crypto (if any) — custody TYPE", 62), ("Access hint (no seed phrase here!)", None))


def s_zahlungen(o):
    o.neue_seite("Recurring payments & subscriptions",
                 "What gets charged regularly? This saves your relatives months of detective work.")
    for bez in ["Rent / mortgage", "Electricity / gas / water", "Phone / internet / TV",
                "Streaming & news subscriptions", "Memberships (club, gym …)",
                "Charity / sponsorships", "Payments back home", "Other"]:
        o.zeile((bez + " — provider", 62), ("Account/card", 40), ("How to cancel", None), hoehe=6.6)


def s_versicherungen(o):
    o.neue_seite("Insurance",
                 "Policy by policy: company, where the policy lives, what it pays for.")
    for art in ["Health (incl. supplemental)", "Personal liability (Haftpflicht)", "Household contents (Hausrat)",
                "Building (if owned)", "Car / motorbike", "Life / term life",
                "Accident", "Disability / loss of income", "Legal expenses (Rechtsschutz)", "Travel / other"]:
        o.zeile((art + " — company", 62), ("Policy lives …", 52), ("Note", None), hoehe=6.6)


def s_vertraege(o):
    o.neue_seite("Contracts, home & vehicles",
                 "Renting or owning, vehicles, big contracts — and where the paperwork lives.")
    o.zeile(("Home: rental / purchase contract lives …", None), ("Landlord / manager — contact", None))
    o.zeile(("Property: land-register papers live …", None), ("Mortgage at — bank & contact person", None))
    o.zeile(("Vehicle(s) — papers live …", None), ("Leasing/loan — provider", None))
    o.block("Other big contracts (employment, education, loans, guarantees …)", 3)
    o.abstand(2)
    o.text("Pets", fett=True)
    o.abstand(2)
    o.zeile(("Pet & name", 48), ("Vet — contact", 52), ("Who takes it in an emergency?", None))
    o.zeile(("Food/medication — the essentials", None))


def s_digital(o):
    o.neue_seite("Digital estate",
                 "E-mail, cloud, social media, subscriptions — what should happen, and who gets access?")
    o.hinweis("Recommendation: use ONE password manager with emergency access (many offer an “emergency contact”) — then all you need here is: which manager, who the emergency contact is. No passwords in this binder.")
    o.zeile(("Password manager (which one?)", 62), ("Emergency access set up for …", None))
    o.zeile(("Main e-mail address(es)", 80), ("Access lives …", None))
    o.zeile(("Phone unlock — hint lives …", 80), ("Second device / backup codes live …", None))
    o.abstand(2)
    o.text("Important online accounts — what should happen? (delete / memorialise / transfer)", fett=True)
    o.abstand(2)
    for i in range(1, 6):
        o.zeile(("Service %d" % i, 48), ("Username (NO password)", 58), ("Wish", None), hoehe=6.6)
    o.zeile(("Own website / domain(s) — registrar", 62), ("Renewal/payment runs via …", None))


def s_vollmachten(o):
    o.neue_seite("Powers of attorney & directives",
                 "Record WHAT exists and WHERE it lives. To create them: see the official bodies below.")
    for doc in ["Power of attorney (Vorsorgevollmacht DE/AT / Vorsorgeauftrag CH)",
                "Living will / advance directive (Patientenverfügung)",
                "Care directive (Betreuungsverfügung, DE)",
                "Will / inheritance contract — possibly also in your home country",
                "Bank power(s) of attorney", "Guardianship directive (minor children)"]:
        o.check(doc + " — exists")
        o.feld("Lives at / deposited with", breite=None, x=8, hoehe=6.6)
        o.y -= 6.6 * mm + 7.6 * mm
    o.abstand(1)
    o.hinweis("Not legal advice. Official starting points: DE Federal Ministry of Justice & notaries · AT oesterreich.gv.at & notaries · CH KESB, Pro Senectute & notaries. As an expat, check which country's inheritance law applies to you (EU Succession Regulation!) — a notary can tell you quickly. Deposit important documents officially — not just at home.")


def s_todesfall(o):
    o.neue_seite("In case of death",
                 "Hard to write down — but the greatest gift to those who stay behind.")
    o.block("My wishes (type of funeral, place — here or in my home country —, ceremony, music …)", 3)
    o.zeile(("Funeral pre-arrangement? With whom?", None), ("Grave / family grave — details", None))
    o.block("Who should be told personally? (names, how to reach them, time zones)", 3)
    o.abstand(1)
    o.text("Documents relatives typically need first:", fett=True)
    o.abstand(1)
    for s in ["Passport/ID & birth certificate", "Marriage certificate (if married)",
              "Insurance policies (life / death benefit)", "Will, or a note where it is deposited",
              "Residence permit (for authorities' paperwork)"]:
        o.check(s)
    o.abstand(2)
    o.zeile(("All of this can be found … (location)", None))


def s_ablage(o):
    o.neue_seite("Document index",
                 "The master list: one look — and any paper is found.")
    for i in range(1, 13):
        o.zeile(("Document %d" % i, 74), ("Location", 62), ("Note", None), hoehe=6.4)


def s_jahrescheck(o):
    o.neue_seite("The annual check",
                 "Once a year, 20 minutes — e.g. every first Sunday of December, or on your birthday.")
    for s in ["Emergency page still correct (contacts, numbers)?",
              "New/cancelled accounts, cards, subscriptions updated?",
              "Insurance: new policies in, cancelled ones out?",
              "Residence/work permit renewal dates noted?",
              "Digital estate: password-manager emergency access still works?",
              "Powers of attorney/directives: still current, locations correct?",
              "Trusted people still know where the binder lives?",
              "New version saved / fresh printout in its place?"]:
        o.check(s)
    o.abstand(3)
    o.text("Done on:", fett=True)
    o.abstand(2)
    for jahr in range(4):
        o.zeile(("Date", 34), ("What I changed …", None), hoehe=6.4)
    o.abstand(2)
    o.hinweis("Done beats perfect: a binder that is 70 % complete and findable beats every perfect plan that never got made.")


def bauen(probe):
    OUT.mkdir(exist_ok=True)
    ziel = OUT / ("emergency-binder-preview.pdf" if probe else "emergency-binder.pdf")
    o = Ordner(ziel, probe=probe, fuss_titel="The Emergency Binder", seite_wort="Page",
               probe_wort="FREE PREVIEW", version="1.0 · August 2026",
               dok_titel="The Emergency Binder — the fill-in life dossier for expats in Germany, Austria & Switzerland")
    s_titel(o)
    s_anleitung(o)
    s_notfall(o)
    if not probe:
        s_person(o)
        s_familie(o)
        s_medizin(o)
        s_konten(o)
        s_zahlungen(o)
        s_versicherungen(o)
        s_vertraege(o)
        s_digital(o)
        s_vollmachten(o)
        s_todesfall(o)
        s_ablage(o)
        s_jahrescheck(o)
    else:
        o.neue_seite("What's in the full version",
                     "The preview ends here — the complete binder walks you through every area of life.")
        for s in ["Personal details, IDs, permits & certificates with locations",
                  "Family & key contacts — incl. embassy and contacts back home",
                  "Health: medication, allergies, health insurer",
                  "Accounts & cards (incl. accounts back home) — without a single password",
                  "Recurring payments & subscriptions (the hidden money drains)",
                  "10 insurance categories to walk through",
                  "Contracts, home, vehicles, pets",
                  "Digital estate incl. password-manager emergency access",
                  "Powers of attorney & directives with official DE/AT/CH starting points",
                  "In-case-of-death page, document index & the 20-minute annual check"]:
            o.check(s)
        o.abstand(4)
        o.text("Full version: abannews.com/emergency-binder.html", fett=True, farbe=AMBER_DK, gr=12)
    o.fertig()
    print("OK %s (%d pages, %d fields)" % (ziel, o.seite, o._feld))


if __name__ == "__main__":
    bauen(probe="--probe" in sys.argv)
