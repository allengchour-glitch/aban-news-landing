#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
produkt-imperium/generate_notfallordner.py — baut „Der Notfall-Ordner“.

Ein ausfüllbares Vorsorge-Dossier als PDF (A4, echte AcroForm-Felder — am
Bildschirm ausfüllbar UND druckbar). Das ist ein VERKAUFS-Produkt:

    python3 generate_notfallordner.py            # Vollversion  -> ausgabe/notfall-ordner.pdf
    python3 generate_notfallordner.py --probe    # Leseprobe    -> ausgabe/notfall-ordner-leseprobe.pdf

⚠️ Das Repo ist ÖFFENTLICH. Die Vollversion liegt deshalb git-ignoriert in
ausgabe/ und wird von Hand zu Lemon Squeezy hochgeladen (Checkout-Link in
js/checkout-config.js -> NOTFALL_BUY_URL). NUR die Leseprobe (Titel + Anleitung
+ Notfall-Seite) darf nach /downloads/ kopiert und committet werden.

Kein Rechtsrat: Der Ordner organisiert Informationen; für Vollmachten,
Patientenverfügung und Testament verweist er auf offizielle Stellen.
Sicherheits-Grundsatz im ganzen Produkt: NIEMALS PINs/Passwörter eintragen —
nur WO der Zugang liegt.
"""
import sys
from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "ausgabe"
VERSION = "1.0 · Stand August 2026"

W, H = A4
INK = HexColor("#15202b")
MUTED = HexColor("#5c6773")
LINE = HexColor("#ece6db")
AMBER = HexColor("#d97706")
AMBER_DK = HexColor("#b45309")
AMBER_LT = HexColor("#fde9c8")
CREAM = HexColor("#fef3c7")
BG = HexColor("#fffaf2")
FIELD_BG = HexColor("#fffdf7")

ML, MR, MT, MB = 20 * mm, 20 * mm, 18 * mm, 16 * mm
CW = W - ML - MR  # nutzbare Breite


class Ordner:
    """Zeichnet Seiten und verwaltet eindeutige Feldnamen + Fusszeilen."""

    def __init__(self, pfad, probe=False, fuss_titel="Der Notfall-Ordner",
                 seite_wort="Seite", probe_wort="LESEPROBE",
                 dok_titel="Der Notfall-Ordner — Vorsorge-Dossier zum Ausfüllen",
                 version=None):
        self.c = canvas.Canvas(str(pfad), pagesize=A4)
        self.c.setTitle(dok_titel)
        self.c.setAuthor("aban news · abannews.com")
        self.probe = probe
        self.fuss_titel, self.seite_wort, self.probe_wort = fuss_titel, seite_wort, probe_wort
        self.version = version or VERSION
        self.seite = 0
        self._feld = 0
        self.y = H - MT

    # ── Grundbausteine ────────────────────────────────────────────────────
    def fname(self):
        self._feld += 1
        return "f%03d" % self._feld

    def neue_seite(self, titel, unter=""):
        if self.seite:
            self._fuss()
            self.c.showPage()
        self.seite += 1
        self.c.setFillColor(BG)
        self.c.rect(0, 0, W, H, stroke=0, fill=1)
        # Kopfband
        self.c.setFillColor(AMBER)
        self.c.rect(0, H - 6 * mm, W, 6 * mm, stroke=0, fill=1)
        self.c.setFillColor(INK)
        self.c.setFont("Helvetica-Bold", 19)
        self.c.drawString(ML, H - MT - 2 * mm, titel)
        y = H - MT - 8 * mm
        if unter:
            self.c.setFillColor(MUTED)
            self.c.setFont("Helvetica", 10.2)
            for zeile in unter.split("\n"):
                self.c.drawString(ML, y, zeile)
                y -= 5 * mm
        self.c.setStrokeColor(LINE)
        self.c.setLineWidth(1)
        self.c.line(ML, y - 1 * mm, W - MR, y - 1 * mm)
        self.y = y - 8 * mm

    def _fuss(self):
        self.c.setFillColor(MUTED)
        self.c.setFont("Helvetica", 8.2)
        self.c.drawString(ML, 9 * mm, self.fuss_titel + " · " + self.version)
        self.c.drawRightString(W - MR, 9 * mm, "%s %d · abannews.com" % (self.seite_wort, self.seite))
        if self.probe:
            self.c.setFillColor(AMBER_DK)
            self.c.setFont("Helvetica-Bold", 8.2)
            self.c.drawCentredString(W / 2, 9 * mm, self.probe_wort)

    def abstand(self, h_mm):
        self.y -= h_mm * mm

    def text(self, s, fett=False, gr=10.2, farbe=None, einzug=0):
        self.c.setFillColor(farbe or INK)
        self.c.setFont("Helvetica-Bold" if fett else "Helvetica", gr)
        self.c.drawString(ML + einzug * mm, self.y, s)
        self.y -= (gr * 0.5 + 5.5) * 0.35 * mm + 2.6 * mm

    def hinweis(self, s):
        """Amber-Kasten mit Merksatz (automatischer Zeilenumbruch)."""
        from reportlab.pdfbase.pdfmetrics import stringWidth
        worte, zeilen, akt = s.split(), [], ""
        while worte:
            probe = (akt + " " + worte[0]).strip()
            if stringWidth(probe, "Helvetica", 9.6) < CW - 14 * mm:
                akt = probe
                worte.pop(0)
            else:
                zeilen.append(akt)
                akt = ""
        if akt:
            zeilen.append(akt)
        hoehe = (len(zeilen) * 4.6 + 6) * mm
        self.c.setFillColor(CREAM)
        self.c.setStrokeColor(AMBER)
        self.c.roundRect(ML, self.y - hoehe + 4 * mm, CW, hoehe, 2 * mm, stroke=1, fill=1)
        self.c.setFillColor(AMBER_DK)
        self.c.setFont("Helvetica", 9.6)
        ty = self.y - 1.4 * mm
        for z in zeilen:
            self.c.drawString(ML + 7 * mm, ty, z)
            ty -= 4.6 * mm
        self.y -= hoehe + 3 * mm

    def feld(self, label, breite=None, hoehe=7.4, x=None, mehrzeilig=False):
        """Beschriftetes AcroForm-Textfeld. breite/x in mm relativ zum Satzspiegel."""
        bx = ML + (x or 0) * mm
        bw = (breite * mm) if breite else (CW - (x or 0) * mm)
        self.c.setFillColor(MUTED)
        self.c.setFont("Helvetica", 8.4)
        self.c.drawString(bx, self.y, label)
        fh = hoehe * mm
        self.c.acroForm.textfield(
            name=self.fname(), tooltip=label,
            x=bx, y=self.y - fh - 1.6 * mm, width=bw, height=fh,
            borderColor=LINE, fillColor=FIELD_BG, textColor=INK,
            borderWidth=0.75, fontSize=10 if not mehrzeilig else 9,
            fieldFlags="multiline" if mehrzeilig else "")
        return fh

    def zeile(self, *spalten, hoehe=7.4):
        """Mehrere Felder nebeneinander: (label, breite_mm) …; None-Breite = Rest."""
        x = 0.0
        fest = sum(b for _, b in spalten if b)
        # Restbreite auf ALLE flexiblen Spalten verteilen — mit nur einer Division
        # ragte bei zwei None-Spalten die zweite ueber den rechten Rand hinaus.
        flexN = sum(1 for _, b in spalten if not b)
        rest = ((CW / mm) - fest - 4 * (len(spalten) - 1)) / max(1, flexN)
        fh = 0
        for label, b in spalten:
            bb = b if b else rest
            fh = self.feld(label, breite=bb, x=x, hoehe=hoehe)
            x += bb + 4
        self.y -= fh + 8.4 * mm

    def block(self, label, zeilen=3):
        h = zeilen * 6.2
        self.feld(label, hoehe=h, mehrzeilig=True)
        self.y -= h * mm + 8.4 * mm

    def check(self, s, x=0):
        self.c.acroForm.checkbox(
            name=self.fname(), tooltip=s, x=ML + x * mm, y=self.y - 1.2 * mm,
            size=4.2 * mm, borderColor=MUTED, fillColor=white, textColor=AMBER_DK,
            borderWidth=0.9, fieldFlags="")
        self.c.setFillColor(INK)
        self.c.setFont("Helvetica", 9.8)
        self.c.drawString(ML + x * mm + 6.4 * mm, self.y, s)
        self.y -= 7.2 * mm

    def tabelle(self, kopf, reihen, breiten):
        """Statische Tabelle (Fakten, keine Formularfelder)."""
        xw = [b * mm for b in breiten]
        self.c.setFont("Helvetica-Bold", 9.2)
        self.c.setFillColor(INK)
        x = ML
        for k, w_ in zip(kopf, xw):
            self.c.drawString(x + 1.5 * mm, self.y, k)
            x += w_
        self.y -= 2.6 * mm
        self.c.setStrokeColor(AMBER)
        self.c.line(ML, self.y, ML + sum(xw), self.y)
        self.y -= 4.6 * mm
        self.c.setFont("Helvetica", 9.2)
        for reihe in reihen:
            x = ML
            for z, w_ in zip(reihe, xw):
                self.c.setFillColor(INK if z == reihe[0] else MUTED)
                self.c.drawString(x + 1.5 * mm, self.y, z)
                x += w_
            self.y -= 2.2 * mm
            self.c.setStrokeColor(LINE)
            self.c.line(ML, self.y, ML + sum(xw), self.y)
            self.y -= 4.4 * mm

    def fertig(self):
        self._fuss()
        self.c.save()


# ── Seiten ────────────────────────────────────────────────────────────────
def s_titel(o):
    o.seite += 1
    o.c.setFillColor(BG)
    o.c.rect(0, 0, W, H, stroke=0, fill=1)
    o.c.setFillColor(AMBER)
    o.c.rect(0, H - 60 * mm, W, 60 * mm, stroke=0, fill=1)
    o.c.setFillColor(white)
    o.c.setFont("Helvetica-Bold", 34)
    o.c.drawString(ML, H - 34 * mm, "Der Notfall-Ordner")
    o.c.setFont("Helvetica", 14)
    o.c.drawString(ML, H - 44 * mm, "Das Vorsorge-Dossier zum Ausfüllen — damit deine Liebsten")
    o.c.drawString(ML, H - 51 * mm, "im Ernstfall alles finden.")
    y = H - 84 * mm
    o.c.setFillColor(INK)
    o.c.setFont("Helvetica", 11.5)
    for z in ["Alle wichtigen Informationen an einem Ort: Kontakte, Konten, Verträge,",
              "Versicherungen, Vollmachten, digitaler Nachlass.",
              "",
              "Am Bildschirm ausfüllen oder ausdrucken. Einmal anlegen,",
              "einmal im Jahr aktualisieren — fertig."]:
        o.c.drawString(ML, y, z)
        y -= 6.5 * mm
    y -= 6 * mm
    o.c.setFillColor(CREAM)
    o.c.setStrokeColor(AMBER)
    o.c.roundRect(ML, y - 24 * mm, CW, 26 * mm, 2.5 * mm, stroke=1, fill=1)
    o.c.setFillColor(AMBER_DK)
    o.c.setFont("Helvetica-Bold", 10.5)
    o.c.drawString(ML + 7 * mm, y - 6 * mm, "Der wichtigste Grundsatz dieses Ordners:")
    o.c.setFont("Helvetica", 10.5)
    o.c.drawString(ML + 7 * mm, y - 12.5 * mm, "Hier stehen NIEMALS Passwörter oder PINs — nur WO sie liegen.")
    o.c.drawString(ML + 7 * mm, y - 19 * mm, "So bleibt der Ordner nützlich, ohne selbst ein Risiko zu sein.")
    o.c.setFillColor(MUTED)
    o.c.setFont("Helvetica", 9)
    o.c.drawString(ML, 22 * mm, "aban news · abannews.com · " + VERSION)
    o.c.drawString(ML, 16 * mm, "Kein Rechtsrat — für Vollmachten, Patientenverfügung und Testament gelten die Hinweise auf Seite 15.")


def s_anleitung(o):
    o.neue_seite("So nutzt du diesen Ordner",
                 "Fünf Minuten Anleitung — dann bist du schneller fertig, als du denkst.")
    o.text("1.  Fülle zuerst die Notfall-Seite aus (nächste Seite).", fett=True)
    o.text("Sie allein ist schon die halbe Miete: Wer im Ernstfall anzurufen ist, steht dann fest.", farbe=MUTED, einzug=6)
    o.abstand(2)
    o.text("2.  Arbeite dann Kapitel für Kapitel — nicht alles auf einmal.", fett=True)
    o.text("15 Minuten pro Kapitel reichen. Was du nicht weisst, lässt du offen und trägst es später nach.", farbe=MUTED, einzug=6)
    o.abstand(2)
    o.text("3.  Speichere die ausgefüllte Datei sicher — oder drucke sie aus.", fett=True)
    o.text("Digital: verschlüsselter Ordner/Passwort-Manager. Gedruckt: ein Ort, den 1–2 Vertrauenspersonen kennen.", farbe=MUTED, einzug=6)
    o.abstand(2)
    o.text("4.  Sag deinen Vertrauenspersonen, DASS es den Ordner gibt und WO er liegt.", fett=True)
    o.text("Der beste Ordner nützt nichts, wenn ihn niemand findet.", farbe=MUTED, einzug=6)
    o.abstand(2)
    o.text("5.  Einmal im Jahr: 20 Minuten Jahres-Check (letzte Seite).", fett=True)
    o.text("Neue Konten, gekündigte Verträge, neue Versicherung? Kurz nachtragen, Datum notieren, fertig.", farbe=MUTED, einzug=6)
    o.abstand(4)
    o.hinweis("Sicherheit: Trage nirgends Passwörter, PINs oder TANs ein. Schreibe stattdessen, WO der Zugang liegt — z. B. „Passwort-Manager, Notfallzettel im Bankschliessfach“. Behandle den ausgefüllten Ordner wie ein Dokument: nicht per Mail verschicken, nicht in offene Cloud-Ordner legen.")
    o.abstand(2)
    o.text("Was dieser Ordner NICHT ist:", fett=True)
    o.text("Kein Rechtsdokument und kein Ersatz für Testament, Patientenverfügung oder Vollmacht —", farbe=MUTED)
    o.text("er hält nur fest, ob es sie gibt und wo sie liegen. Offizielle Stellen: Seite 15.", farbe=MUTED)


def s_notfall(o):
    o.neue_seite("Im Notfall zuerst",
                 "Diese Seite gehört ausgedruckt an einen festen Ort — z. B. innen an die Schranktür.")
    o.text("Offizielle Notrufnummern", fett=True, gr=11.5)
    o.abstand(1)
    o.tabelle(
        ["", "Deutschland", "Österreich", "Schweiz"],
        [["Notruf allgemein", "112", "112", "112"],
         ["Polizei", "110", "133", "117"],
         ["Feuerwehr", "112", "122", "118"],
         ["Rettung / Sanität", "112", "144", "144"],
         ["Ärztl. Bereitschaft", "116 117", "141", "regional (Ärztefon)"],
         ["Vergiftung", "je Region*", "+43 1 406 43 43", "145 (Tox Info)"],
         ["Rega (Luftrettung)", "—", "—", "1414"],
         ["Karten sperren", "116 116", "Bank-Hotline", "Bank-Hotline"]],
        [40, 43, 43, 44])
    o.text("* Giftnotruf DE ist je Bundesland verschieden — trage deine regionale Nummer unten ein.", farbe=MUTED, gr=8.6)
    o.abstand(4)
    o.text("Meine Notfall-Kontakte", fett=True, gr=11.5)
    o.abstand(2)
    o.zeile(("1. Name", 52), ("Beziehung", 38), ("Telefon", None))
    o.zeile(("2. Name", 52), ("Beziehung", 38), ("Telefon", None))
    o.zeile(("Hausarzt / Hausärztin", 52), ("Praxis", 38), ("Telefon", None))
    o.zeile(("Giftnotruf meiner Region", 62), ("Weitere wichtige Nummer", None))
    o.abstand(1)
    o.zeile(("Dieser Ordner liegt (gedruckt/digital) …", None), ("Schlüssel/Zweitschlüssel liegt …", None))


def s_person(o):
    o.neue_seite("Persönliche Daten",
                 "Die Basis: Wer bist du, welche Dokumente gibt es, und wo liegen sie?")
    o.zeile(("Vorname, Nachname", 80), ("Geburtsdatum", None))
    o.zeile(("Geburtsort", 80), ("Staatsangehörigkeit(en)", None))
    o.zeile(("Adresse (Strasse, PLZ, Ort)", None))
    o.zeile(("Telefon", 52), ("E-Mail", None))
    o.zeile(("Zivilstand", 52), ("AHV-/SV-/Steuer-Nr. (nur Nummer-ART + Ablageort)", None))
    o.abstand(2)
    o.text("Ausweise & Urkunden — was existiert, und wo liegt es?", fett=True)
    o.abstand(2)
    o.zeile(("Pass / ID — Ablageort", None), ("Führerschein — Ablageort", None))
    o.zeile(("Geburtsurkunde — Ablageort", None), ("Heirats-/Partnerschaftsurkunde — Ablageort", None))
    o.zeile(("Aufenthaltstitel / weitere Dokumente — Ablageort", None))
    o.hinweis("Ablageort heisst: konkret genug, dass jemand anderes es findet. „Ordner Versicherungen, Regal Büro, 2. Fach“ schlägt „irgendwo im Büro“.")


def s_familie(o):
    o.neue_seite("Familie & wichtige Kontakte",
                 "Wen sollen deine Angehörigen informieren — privat und offiziell?")
    for rolle in ["Partner:in", "Kind", "Kind", "Eltern", "Geschwister"]:
        o.zeile((rolle + " — Name", 62), ("Telefon", 42), ("Anmerkung", None))
    o.abstand(2)
    o.text("Offizielle & professionelle Kontakte", fett=True)
    o.abstand(2)
    o.zeile(("Arbeitgeber (Personalabteilung)", 62), ("Telefon", None))
    o.zeile(("Steuerberater:in / Treuhand", 62), ("Telefon", None))
    o.zeile(("Anwält:in / Notariat", 62), ("Telefon", None))
    o.zeile(("Vermieter:in / Verwaltung", 62), ("Telefon", None))


def s_medizin(o):
    o.neue_seite("Gesundheit",
                 "Was Ärzte und Angehörige im Ernstfall sofort wissen müssen.")
    o.zeile(("Blutgruppe", 34), ("Allergien / Unverträglichkeiten", None))
    o.block("Aktuelle Medikamente (Name, Dosis, wofür)", 3)
    o.block("Diagnosen / chronische Erkrankungen, die man kennen sollte", 2)
    o.zeile(("Krankenkasse & Versichertennummer-Ablageort", None), ("Impfausweis — Ablageort", None))
    o.zeile(("Organspende-Ausweis vorhanden? Wo?", None), ("Brille/Hörgerät/Implantate — Hinweise", None))
    o.abstand(1)
    o.text("Patientenverfügung & Co. hältst du auf Seite 15 fest (mit offiziellen Quellen).", farbe=MUTED, gr=9.4)


def s_konten(o):
    o.neue_seite("Konten & Karten",
                 "Welche Konten existieren — OHNE Zugangsdaten. Nur: Bank, Zweck, wo der Zugang liegt.")
    o.hinweis("Niemals PIN, Passwort oder TAN hier eintragen. „Zugang liegt …“ heisst z. B.: Passwort-Manager, Bankschliessfach, versiegelter Umschlag bei Notariat.")
    for i in range(1, 5):
        o.zeile(("Konto %d — Bank" % i, 48), ("Zweck (Gehalt, Miete, Sparen …)", 52), ("Zugang liegt …", None))
    o.zeile(("Karten (Debit/Kredit) — welche gibt es?", None), ("Sperr-Hotline(s) meiner Bank(en)", None))
    o.zeile(("Depot / Wertpapiere — Anbieter", 62), ("Zugang liegt …", None))
    o.zeile(("Krypto (falls vorhanden) — Verwahrort-ART", 62), ("Zugangs-Hinweis (kein Seed hier!)", None))


def s_zahlungen(o):
    o.neue_seite("Laufende Zahlungen & Abos",
                 "Was bucht regelmässig ab? Das erspart deinen Angehörigen monatelange Detektivarbeit.")
    for bez in ["Miete / Hypothek", "Strom / Gas / Wasser", "Handy / Internet / TV",
                "Streaming & Zeitungen", "Mitgliedschaften (Verein, Fitness …)",
                "Spenden / Patenschaften", "Sonstiges"]:
        o.zeile((bez + " — Anbieter", 62), ("Konto/Karte", 40), ("Kündigungs-Hinweis", None))


def s_versicherungen(o):
    o.neue_seite("Versicherungen",
                 "Police für Police: Gesellschaft, Nummer-Ablageort, wofür sie zahlt.")
    for art in ["Krankenkasse / Zusatz", "Haftpflicht", "Hausrat", "Gebäude (falls Eigentum)",
                "Auto / Motorrad", "Leben / Todesfallrisiko", "Unfall", "Berufsunfähigkeit / Erwerbsausfall",
                "Rechtsschutz", "Reise / Weitere"]:
        o.zeile((art + " — Gesellschaft", 62), ("Police liegt …", 52), ("Anmerkung", None), hoehe=6.6)


def s_vertraege(o):
    o.neue_seite("Verträge & Immobilien",
                 "Miete oder Eigentum, Fahrzeuge, grosse Verträge — und wo die Unterlagen liegen.")
    o.zeile(("Wohnung: Mietvertrag / Kaufvertrag liegt …", None), ("Vermieter / Verwaltung — Kontakt", None))
    o.zeile(("Eigentum: Grundbuch-Unterlagen liegen …", None), ("Hypothek bei — Bank & Ansprechperson", None))
    o.zeile(("Fahrzeug(e) — Papiere liegen …", None), ("Leasing/Kredit — Anbieter", None))
    o.block("Weitere grosse Verträge (Arbeitsvertrag, Ausbildung, Kredite, Bürgschaften …)", 3)
    o.abstand(2)
    o.text("Haustiere", fett=True)
    o.abstand(2)
    o.zeile(("Tier & Name", 48), ("Tierarzt — Kontakt", 52), ("Wer übernimmt es im Notfall?", None))
    o.zeile(("Futter/Medikamente — das Wichtigste", None))


def s_digital(o):
    o.neue_seite("Digitaler Nachlass",
                 "E-Mail, Cloud, Social Media, Abos — was soll damit passieren, und wer kommt ran?")
    o.hinweis("Empfehlung: Führe EINEN Passwort-Manager mit Notfall-Zugriff (viele bieten „Notfallkontakt“ an) — dann reicht hier: welcher Manager, wer der Notfallkontakt ist. Keine Passwörter in diesen Ordner.")
    o.zeile(("Passwort-Manager (welcher?)", 62), ("Notfall-Zugriff eingerichtet für …", None))
    o.zeile(("Haupt-E-Mail-Adresse(n)", 80), ("Zugang liegt …", None))
    o.zeile(("Handy-Entsperrung — Hinweis liegt …", 80), ("Zweitgerät / Backup-Codes liegen …", None))
    o.abstand(2)
    o.text("Wichtige Online-Konten — was soll passieren? (löschen / Gedenkzustand / übertragen)", fett=True)
    o.abstand(2)
    for i in range(1, 6):
        o.zeile(("Dienst %d" % i, 48), ("Benutzername (KEIN Passwort)", 58), ("Wunsch", None), hoehe=6.6)
    o.zeile(("Eigene Website / Domain(s) — Registrar", 62), ("Verlängerung/Zahlung läuft über …", None))


def s_vollmachten(o):
    o.neue_seite("Vollmachten & Verfügungen",
                 "Hier hältst du fest, WAS existiert und WO es liegt. Erstellen: über die offiziellen Stellen unten.")
    for doc in ["Vorsorgevollmacht (DE/AT) / Vorsorgeauftrag (CH)",
                "Patientenverfügung", "Betreuungsverfügung (DE)",
                "Testament / Erbvertrag", "Bankvollmacht(en)", "Sorgerechtsverfügung (minderj. Kinder)"]:
        o.check(doc + " — vorhanden")
        o.feld("Liegt bei / hinterlegt bei", breite=None, x=8, hoehe=6.6)
        o.y -= 6.6 * mm + 7.6 * mm
    o.abstand(1)
    o.hinweis("Kein Rechtsrat. Verbindliche Vorlagen & Beratung: DE Bundesjustizministerium/Betreuungsbehörden & Notariat · AT oesterreich.gv.at & Notariat · CH KESB, Pro Senectute & Notariat. Wichtige Dokumente beim Notariat oder amtlich hinterlegen — nicht nur zu Hause.")


def s_todesfall(o):
    o.neue_seite("Für den Todesfall",
                 "Schwer aufzuschreiben — aber das grösste Geschenk an die, die bleiben.")
    o.block("Meine Wünsche (Bestattungsart, Ort, Trauerfeier, Musik …)", 3)
    o.zeile(("Bestattungsvorsorge-Vertrag? Bei wem?", None), ("Grab / Familiengrab — Infos", None))
    o.block("Wer soll persönlich informiert werden? (Namen, wie erreichbar)", 3)
    o.abstand(1)
    o.text("Diese Dokumente brauchen Angehörige typischerweise zuerst:", fett=True)
    o.abstand(1)
    for s in ["Personalausweis/Pass & Geburtsurkunde", "Heiratsurkunde (falls verheiratet)",
              "Versicherungspolicen (Leben/Sterbegeld)", "Testament bzw. Hinweis auf Hinterlegungsort"]:
        o.check(s)
    o.abstand(2)
    o.zeile(("Alles davon findet sich … (Ablageort)", None))


def s_ablage(o):
    o.neue_seite("Dokumente-Index",
                 "Das Master-Verzeichnis: ein Blick — und jedes Papier ist gefunden.")
    for i in range(1, 13):
        o.zeile(("Dokument %d" % i, 74), ("Ablageort", 62), ("Anmerkung", None), hoehe=6.4)


def s_jahrescheck(o):
    o.neue_seite("Der Jahres-Check",
                 "Einmal im Jahr, 20 Minuten — z. B. immer am ersten Advent oder am Geburtstag.")
    for s in ["Notfall-Seite noch aktuell (Kontakte, Nummern)?",
              "Neue/gekündigte Konten, Karten, Abos nachgetragen?",
              "Versicherungen: neue Policen, gekündigte raus?",
              "Digitaler Nachlass: Passwort-Manager-Notfallzugriff funktioniert?",
              "Vollmachten/Verfügungen: noch aktuell, Ablageorte stimmen?",
              "Vertrauenspersonen wissen weiterhin, wo der Ordner liegt?",
              "Neue Version gespeichert / neuer Ausdruck an seinem Platz?"]:
        o.check(s)
    o.abstand(3)
    o.text("Erledigt am:", fett=True)
    o.abstand(2)
    for jahr in range(4):
        o.zeile(("Datum", 34), ("Geändert habe ich …", None), hoehe=6.4)
    o.abstand(2)
    o.hinweis("Fertig ist besser als perfekt: Ein zu 70 % ausgefüllter Ordner, den deine Liebsten finden, schlägt jeden perfekten Plan, der nie entstanden ist.")


def bauen(probe):
    OUT.mkdir(exist_ok=True)
    ziel = OUT / ("notfall-ordner-leseprobe.pdf" if probe else "notfall-ordner.pdf")
    o = Ordner(ziel, probe=probe)
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
        o.neue_seite("Das steckt in der Vollversion",
                     "Die Leseprobe endet hier — der komplette Ordner führt dich durch alle Lebensbereiche.")
        for s in ["Persönliche Daten, Ausweise & Urkunden mit Ablageorten",
                  "Familie & wichtige Kontakte (privat und offiziell)",
                  "Gesundheit: Medikamente, Allergien, Krankenkasse",
                  "Konten & Karten — sicher, ohne ein einziges Passwort",
                  "Laufende Zahlungen & Abos (die versteckten Kostenfresser)",
                  "10 Versicherungs-Kategorien zum Durchgehen",
                  "Verträge, Immobilien, Fahrzeuge, Haustiere",
                  "Digitaler Nachlass inkl. Passwort-Manager-Notfallzugriff",
                  "Vollmachten & Verfügungen mit offiziellen Anlaufstellen",
                  "Todesfall-Seite, Dokumente-Index & jährlicher 20-Minuten-Check"]:
            o.check(s)
        o.abstand(4)
        o.text("Vollversion: abannews.com/notfall-ordner.html", fett=True, farbe=AMBER_DK, gr=12)
    o.fertig()
    print("OK %s (%d Seiten, %d Felder)" % (ziel, o.seite, o._feld))


if __name__ == "__main__":
    bauen(probe="--probe" in sys.argv)
