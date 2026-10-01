#!/usr/bin/env python3
"""Budget-Plan Schweiz als Excel-Vorlage (für Etsy/Gumroad). Alle Zahlen sind Formeln, nichts fest.

    pip install openpyxl && python3 tools/etsy/budget_xlsx.py
    → content/etsy/budget-plan/Budget-Plan-Schweiz.xlsx

Aufbau: Budget (Planung + Auswertung) · Jahres-Tracker (Ist je Monat) · Anleitung · Listen (versteckt).
Rechenlogik identisch mit tools/budget/engine.js (Takt → Faktor/12, Rückstellung = nicht-monatliche Posten).
"""
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[2]
ZIEL = ROOT / "content" / "etsy" / "budget-plan" / "dateien" / "Budget-Plan-Schweiz.xlsx"

AKZ, CREME, LINIE, TINTE, GRAU = "B45309", "FEF3C7", "E7DFD2", "1F2937", "6B7280"
fett = Font(name="Calibri", bold=True, color=TINTE)
titel = Font(name="Calibri", bold=True, size=18, color=TINTE)
kopf = Font(name="Calibri", bold=True, color="FFFFFF")
kopf_fill = PatternFill("solid", fgColor=AKZ)
eingabe = PatternFill("solid", fgColor="FFF2B8")
summe_fill = PatternFill("solid", fgColor=CREME)
rand = Border(bottom=Side(style="thin", color=LINIE))
CHF = '"CHF" #,##0;[Red]"CHF" -#,##0'
PZ = "0%"

EIN = [("Nettolohn", 5800, "monatlich"), ("13. Monatslohn", 5800, "jährlich"), ("", None, "monatlich"), ("", None, "monatlich")]
AUS = [("Miete inkl. Nebenkosten", 1850, "monatlich", "Muss", "ja"),
       ("Krankenkasse Prämien", 420, "monatlich", "Muss", ""),
       ("Franchise und Selbstbehalt", 1000, "jährlich", "Muss", ""),
       ("Steuern (letzte Rechnung)", 8400, "jährlich", "Muss", ""),
       ("Hausrat und Haftpflicht", 380, "jährlich", "Muss", ""),
       ("Radio- und TV-Gebühr", 335, "jährlich", "Muss", ""),
       ("Handy und Internet", 90, "monatlich", "Muss", ""),
       ("ÖV und Mobilität", 150, "monatlich", "Muss", ""),
       ("Lebensmittel und Haushalt", 700, "monatlich", "Muss", ""),
       ("Kleider", 1200, "jährlich", "Kann", ""),
       ("Freizeit und Ausgang", 300, "monatlich", "Kann", ""),
       ("Ferien", 3000, "jährlich", "Kann", ""),
       ("Geschenke", 600, "jährlich", "Kann", ""),
       ("Säule 3a", 300, "monatlich", "Sparen", "")]
AUS_ZEILEN = 30  # Platz für eigene Posten


def main():
    wb = Workbook()
    ls = wb.active
    ls.title = "Listen"
    for i, (t, f) in enumerate([("monatlich", 12), ("pro Quartal", 4), ("halbjährlich", 2), ("jährlich", 1)], 1):
        ls.cell(i, 1, t)
        ls.cell(i, 2, f)
    for i, a in enumerate(["Muss", "Kann", "Sparen"], 1):
        ls.cell(i, 4, a)
    ls.sheet_state = "hidden"

    b = wb.create_sheet("Budget", 0)
    wb.active = 0
    b.sheet_view.showGridLines = False
    for col, w in zip("ABCDEFGH", [34, 14, 15, 11, 10, 14, 16, 3]):
        b.column_dimensions[col].width = w
    b["A1"] = "Budget-Plan Schweiz"
    b["A1"].font = titel
    b["A2"] = "Gelbe Felder ausfüllen, alles andere rechnet sich selbst. Takt = wie oft der Betrag anfällt."
    b["A2"].font = Font(color=GRAU, italic=True)

    takt_dv = DataValidation(type="list", formula1="=Listen!$A$1:$A$4", allow_blank=False)
    art_dv = DataValidation(type="list", formula1="=Listen!$D$1:$D$3", allow_blank=False)
    ja_dv = DataValidation(type="list", formula1='"ja,"', allow_blank=True)
    for dv in (takt_dv, art_dv, ja_dv):
        b.add_data_validation(dv)

    def kopfzeile(r, werte):
        for c, v in enumerate(werte, 1):
            z = b.cell(r, c, v)
            z.font, z.fill = kopf, kopf_fill
            z.alignment = Alignment(horizontal="left" if c == 1 else "right")

    faktor = lambda r: f'IFERROR(VLOOKUP(C{r},Listen!$A$1:$B$4,2,FALSE),12)'

    # Einnahmen
    b["A4"] = "Einnahmen"
    b["A4"].font = Font(bold=True, size=13, color=AKZ)
    kopfzeile(5, ["Bezeichnung", "Betrag", "Takt", "", "", "pro Monat"])
    e0 = 6
    for i, (n, bet, t) in enumerate(EIN):
        r = e0 + i
        b.cell(r, 1, n).fill = eingabe
        b.cell(r, 2, bet).fill = eingabe
        b.cell(r, 3, t).fill = eingabe
        b.cell(r, 2).number_format = CHF
        takt_dv.add(f"C{r}")
        b.cell(r, 6, f"=IF(B{r}=\"\",0,B{r}*{faktor(r)}/12)").number_format = CHF
        for c in range(1, 7):
            b.cell(r, c).border = rand
    e1 = e0 + len(EIN) - 1

    # Ausgaben
    a_titel = e1 + 2
    b.cell(a_titel, 1, "Ausgaben").font = Font(bold=True, size=13, color=AKZ)
    kopfzeile(a_titel + 1, ["Bezeichnung", "Betrag", "Takt", "Art", "Wohnen", "pro Monat", "davon zurücklegen"])
    a0 = a_titel + 2
    for i in range(AUS_ZEILEN):
        r = a0 + i
        n, bet, t, art, wo = AUS[i] if i < len(AUS) else ("", None, "monatlich", "Muss", "")
        for c, v in enumerate([n, bet, t, art, wo], 1):
            b.cell(r, c, v).fill = eingabe
        b.cell(r, 2).number_format = CHF
        takt_dv.add(f"C{r}")
        art_dv.add(f"D{r}")
        ja_dv.add(f"E{r}")
        b.cell(r, 6, f"=IF(B{r}=\"\",0,B{r}*{faktor(r)}/12)").number_format = CHF
        b.cell(r, 7, f'=IF(C{r}="monatlich",0,F{r})').number_format = CHF
        for c in range(1, 8):
            b.cell(r, c).border = rand
    a1 = a0 + AUS_ZEILEN - 1

    # Auswertung rechts daneben wäre auf dem Handy unleserlich → darunter
    s = a1 + 2
    b.cell(s, 1, "Auswertung pro Monat").font = Font(bold=True, size=13, color=AKZ)
    F, G, D, E = f"F{a0}:F{a1}", f"G{a0}:G{a1}", f"D{a0}:D{a1}", f"E{a0}:E{a1}"
    zeilen = [
        ("Einnahmen", f"=SUM(F{e0}:F{e1})", CHF),
        ("Ausgaben (inkl. Sparen)", f"=SUM({F})", CHF),
        ("Übrig (+) / fehlt (−)", f"=B{s+1}-B{s+2}", CHF),
        ("Dauerauftrag aufs Rückstellungskonto", f"=SUM({G})", CHF),
        ("Muss", f'=SUMIF({D},"Muss",{F})', CHF),
        ("Kann", f'=SUMIF({D},"Kann",{F})', CHF),
        ("Sparen (inkl. Überschuss)", f'=SUMIF({D},"Sparen",{F})+MAX(B{s+3},0)', CHF),
        ("Wohnkosten in % des Einkommens", f'=IF(B{s+1}=0,0,SUMIF({E},"ja",{F})/B{s+1})', PZ),
        ("Notreserve heute (auf dem Sparkonto)", 2000, CHF),
        ("Notreserve-Ziel (3 × Muss)", f"=3*B{s+5}", CHF),
        ("Monate bis zum Ziel", f'=IF(B{s+9}>=B{s+10},0,IF(B{s+7}<=0,"nicht erreichbar",ROUNDUP((B{s+10}-B{s+9})/B{s+7},0)))', "0"),
    ]
    for i, (lab, form, fmt) in enumerate(zeilen, 1):
        r = s + i
        b.cell(r, 1, lab).border = rand
        z = b.cell(r, 2, form)
        z.number_format, z.border, z.font = fmt, rand, fett
        if lab.startswith("Notreserve heute"):
            z.fill, z.font = eingabe, Font(color=TINTE)
        else:
            z.fill = summe_fill
        if lab in ("Muss", "Kann", "Sparen (inkl. Überschuss)"):
            b.cell(r, 3, f"=IF($B${s+1}=0,0,B{r}/$B${s+1})").number_format = PZ
    b.cell(s + 5, 4, "Faustregel 50 / 30 / 20").font = Font(color=GRAU, italic=True)
    # Warnfarben
    b.conditional_formatting.add(f"B{s+3}", CellIsRule(operator="lessThan", formula=["0"], font=Font(color="B91C1C", bold=True)))
    b.conditional_formatting.add(f"B{s+8}", CellIsRule(operator="greaterThan", formula=["1/3"], font=Font(color="B91C1C", bold=True)))
    hinweis = s + len(zeilen) + 2
    b.cell(hinweis, 1, "Tipp: Den Betrag „Dauerauftrag aufs Rückstellungskonto“ jeden Monat direkt nach dem Lohn auf ein "
                       "separates Konto überweisen. Steuern, Franchise und Jahresrechnungen von dort bezahlen.").font = Font(color=GRAU, italic=True)
    b.freeze_panes = "A4"

    # Jahres-Tracker: Ist-Ausgaben je Monat gegen den Plan
    t = wb.create_sheet("Jahres-Tracker", 1)
    t.sheet_view.showGridLines = False
    t["A1"] = "Jahres-Tracker: was wirklich rausging"
    t["A1"].font = titel
    t["A2"] = "Trag am Monatsende die tatsächlichen Beträge ein. Rot = mehr als geplant."
    t["A2"].font = Font(color=GRAU, italic=True)
    monate = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
    t.column_dimensions["A"].width = 30
    t.column_dimensions["B"].width = 12
    for j in range(len(monate) + 2):
        t.column_dimensions[chr(ord("C") + j)].width = 10
    for c, v in enumerate(["Posten", "Plan / Monat"] + monate + ["Ø Ist"], 1):
        z = t.cell(4, c, v)
        z.font, z.fill = kopf, kopf_fill
    for i in range(AUS_ZEILEN):
        r, q = 5 + i, a0 + i
        t.cell(r, 1, f'=IF(Budget!A{q}="","",Budget!A{q})')
        t.cell(r, 2, f'=IF(Budget!A{q}="","",Budget!F{q})').number_format = CHF
        for j in range(12):
            z = t.cell(r, 3 + j)
            z.fill, z.number_format = eingabe, CHF
        t.cell(r, 15, f'=IF(COUNT(C{r}:N{r})=0,"",AVERAGE(C{r}:N{r}))').number_format = CHF
        for c in range(1, 16):
            t.cell(r, c).border = rand
    last = 5 + AUS_ZEILEN - 1
    t.conditional_formatting.add(f"C5:N{last}", FormulaRule(formula=[f'AND(C5<>"",$B5<>"",C5>$B5*1.1)'], font=Font(color="B91C1C", bold=True)))
    r = last + 1
    t.cell(r, 1, "Summe").font = fett
    t.cell(r, 2, f"=SUM(B5:B{last})").number_format = CHF
    for j in range(12):
        col = chr(ord("C") + j)
        z = t.cell(r, 3 + j, f'=IF(COUNT({col}5:{col}{last})=0,"",SUM({col}5:{col}{last}))')
        z.number_format, z.font, z.fill = CHF, fett, summe_fill
    t.freeze_panes = "C5"

    # Anleitung
    h = wb.create_sheet("Anleitung", 2)
    h.sheet_view.showGridLines = False
    h.column_dimensions["A"].width = 110
    text = [
        ("Budget-Plan Schweiz — so geht's", titel),
        ("", None),
        ("1. Blatt „Budget“: Einnahmen eintragen. Den 13. Monatslohn als eigene Zeile mit Takt „jährlich“.", None),
        ("2. Alle Ausgaben eintragen, so wie sie kommen: Miete monatlich, Steuern jährlich (letzte Steuerrechnung),", None),
        ("   Hausrat jährlich. Die Spalte „pro Monat“ rechnet alles auf den Monat um.", None),
        ("3. Art wählen: Muss (kurzfristig nicht änderbar), Kann (änderbar), Sparen (Säule 3a, Sparkonto, Tilgung).", None),
        ("4. Auswertung lesen: Übrig/fehlt, Dauerauftrag fürs Rückstellungskonto, Muss/Kann/Sparen, Notreserve.", None),
        ("5. Blatt „Jahres-Tracker“: am Monatsende die tatsächlichen Beträge eintragen. Rot = mehr als 10 % über Plan.", None),
        ("", None),
        ("Das Rückstellungskonto: In der Schweiz kommen die Steuern bei den meisten als Rechnung, nicht als Lohnabzug.", fett),
        ("Den Betrag aus der Auswertung per Dauerauftrag auf ein zweites Konto überweisen und alle Jahresrechnungen", None),
        ("von dort bezahlen. So bringt keine Rechnung das Budget aus dem Gleichgewicht.", None),
        ("", None),
        ("Warnzeichen: Übrig negativ (rot) oder Wohnkosten über einem Drittel des Einkommens (rot).", None),
        ("Hilfe, wenn es nicht aufgeht: kantonale Budget- und Schuldenberatungen, kostenlos (Übersicht: schulden.ch).", None),
        ("", None),
        ("Planungshilfe, keine Finanzberatung. Private Nutzung. Weitergabe und Weiterverkauf nicht gestattet.", Font(color=GRAU)),
        ("© aban news · abannews.com", Font(color=GRAU)),
    ]
    for i, (z, f) in enumerate(text, 1):
        c = h.cell(i, 1, z)
        if f:
            c.font = f
    wb.move_sheet("Listen", offset=10)
    ZIEL.parent.mkdir(parents=True, exist_ok=True)
    wb.save(ZIEL)
    print(f"→ {ZIEL.relative_to(ROOT)}  (Auswertung ab Zeile {s}, Ausgaben {a0}–{a1})")
    return s, a0


if __name__ == "__main__":
    main()
