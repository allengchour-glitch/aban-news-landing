#!/usr/bin/env python3
"""E-Mail-Dateien lokal lesen und ungesendete Antwortentwürfe als EML erstellen."""
import argparse
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from email.utils import formatdate, make_msgid
from html.parser import HTMLParser
import json
from pathlib import Path
import re

from assistent import VERSION, einordnen, entwurf
from pruefseite import erstellen
from kommentar_antworter import wissen_lesen

MAX_BYTES = 2 * 1024 * 1024


class Klartext(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.teile = []
        self.verborgen = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.verborgen += 1
        if not self.verborgen and tag in ("br", "p", "div", "li"):
            self.teile.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.verborgen:
            self.verborgen -= 1
        elif not self.verborgen and tag in ("p", "div", "li"):
            self.teile.append("\n")

    def handle_data(self, data):
        if not self.verborgen:
            self.teile.append(data)


def adresse(wert):
    if not wert or len(str(wert)) > 400:
        raise ValueError("Eine gültige einzelne E-Mail-Adresse ist erforderlich.")
    probe = EmailMessage(policy=policy.default)
    probe["To"] = str(wert)
    header = probe["To"]
    if header.defects or len(header.addresses) != 1:
        raise ValueError("Eine gültige einzelne E-Mail-Adresse ist erforderlich.")
    a = header.addresses[0]
    if not a.username or not a.domain or any(ord(c) < 32 for c in a.addr_spec):
        raise ValueError("Eine gültige einzelne E-Mail-Adresse ist erforderlich.")
    return a


def mail_lesen(datei, absender):
    if datei.stat().st_size > MAX_BYTES:
        raise ValueError("Eine E-Mail überschreitet das Limit von 2 MiB.")
    msg = BytesParser(policy=policy.default).parsebytes(datei.read_bytes())
    if len(msg.get_all("From", [])) != 1 or len(msg.get_all("Reply-To", [])) > 1:
        return None, "Absender unklar; manuell prüfen"
    try:
        original = adresse(msg["From"])
        ziel = adresse(msg["Reply-To"] if "Reply-To" in msg else msg["From"])
    except ValueError:
        return None, "Antwortadresse unklar; manuell prüfen"
    if msg.get("Auto-Submitted", "no").strip().lower() != "no":
        return None, "Automatische Nachricht"
    if "List-Id" in msg or msg.get("Precedence", "").strip().lower() in ("bulk", "list", "junk"):
        return None, "Rundmail oder Newsletter"
    if msg.get("Return-Path", "").strip() == "<>" or msg.get_content_type() == "multipart/report":
        return None, "Zustellbericht"
    for a in (original, ziel):
        if a.addr_spec.casefold() == absender.addr_spec.casefold():
            return None, "Eigene Absenderadresse"
        if re.search(r"^(no[._-]?reply|mailer-daemon|postmaster)(?:[+._-]|$)", a.username, re.I):
            return None, "Keine Antwortadresse"
    part = msg.get_body(preferencelist=("plain", "html"))
    if part is None or part.get_content_maintype() != "text":
        return None, "Kein unterstützter Nachrichtentext"
    try:
        text = part.get_content()
    except (LookupError, UnicodeError):
        return None, "Textkodierung unbekannt; manuell prüfen"
    if part.get_content_subtype() == "html":
        parser = Klartext()
        parser.feed(text)
        text = "".join(parser.teile)
    text = text.strip()
    if not text or len(text) > 20000:
        return None, "Text leer oder zu lang; manuell prüfen"
    betreff = str(msg.get("Subject", "Ohne Betreff"))
    if "\r" in betreff or "\n" in betreff or len(betreff) > 500:
        return None, "Betreff unklar; manuell prüfen"
    ids = re.findall(r"<[^<>\s]{1,200}>", str(msg.get("Message-ID", "")))
    mid = ids[0] if len(ids) == 1 else None
    refs = re.findall(r"<[^<>\s]{1,200}>", str(msg.get("References", "")))
    return {"ziel": ziel, "betreff": betreff, "text": text, "message_id": mid, "references": refs}, None


def firmenantwort(mail, faq):
    """Nur einen eindeutigen Stichworttreffer als prüfbaren Entwurf übernehmen."""
    text = (mail["betreff"] + " " + mail["text"]).casefold()
    kategorie, prioritaet = einordnen(mail["betreff"], mail["text"])
    if kategorie in ("reklamation", "rechnung") or prioritaet != "normal":
        return None, "Beschwerde, Zahlung oder dringendes Anliegen persönlich prüfen."
    treffer = [item for item in faq if any(
        re.search(r"(?<!\w)" + re.escape(k.strip().casefold()) + r"(?!\w)", text)
        for k in item["stichwoerter"])]
    if len(treffer) != 1:
        return None, "Keine eindeutige Firmenantwort hinterlegt; Inhalt persönlich prüfen."
    return treffer[0]["antwort"].strip(), None


def antwort_erstellen(mail, absender, firma, antwort=None):
    kategorie, prioritaet = einordnen(mail["betreff"], mail["text"])
    reply = EmailMessage(policy=policy.SMTP)
    reply["From"] = absender
    reply["To"] = mail["ziel"]
    reply["Subject"] = mail["betreff"] if re.match(r"^re\s*:", mail["betreff"], re.I) else "Re: " + mail["betreff"]
    reply["Date"] = formatdate(localtime=False)
    reply["Message-ID"] = make_msgid(domain=absender.domain)
    reply["Auto-Submitted"] = "auto-generated"
    reply["X-Unsent"] = "1"
    if mail["message_id"]:
        reply["In-Reply-To"] = mail["message_id"]
        refs = list(dict.fromkeys(mail["references"] + [mail["message_id"]]))[-20:]
        reply["References"] = " ".join(refs)
    reply.set_content(entwurf(kategorie, firma) if antwort is None else
                      "Guten Tag\n\n" + antwort + "\n\nFreundliche Grüsse\n" + firma
                      + "\n\n[Entwurf aus Firmenwissen: Inhalt und Kontext vor dem Versand prüfen.]")
    return reply, kategorie, prioritaet


def verarbeiten(eingabe, ausgabe, firma, absender_text, wissen=None):
    absender = adresse(absender_text)
    faq = wissen_lesen(wissen) if wissen is not None else None
    if not firma.strip() or len(firma) > 120 or "\n" in firma or "\r" in firma:
        raise ValueError("Firmenname braucht 1 bis 120 Zeichen in einer Zeile.")
    source, out = Path(eingabe), Path(ausgabe)
    dateien = sorted(p for p in source.iterdir() if p.is_file() and p.suffix.lower() == ".eml") if source.is_dir() else [source]
    if not dateien or len(dateien) > 1000 or any(not p.is_file() or p.suffix.lower() != ".eml" for p in dateien):
        raise ValueError("Eine EML-Datei oder ein Ordner mit 1 bis 1000 EML-Dateien ist erforderlich.")
    if out.exists():
        raise ValueError("Ausgabeordner existiert bereits; neuen Ordner wählen.")
    # Erst einlesen und prüfen; Anhänge bleiben unberührt und werden nicht übernommen.
    gelesen = [mail_lesen(p, absender) for p in dateien]
    out.mkdir(parents=True)
    seen, ergebnisse, ansicht = set(), [], []
    for nummer, (mail, grund) in enumerate(gelesen, 1):
        if mail and mail["message_id"] in seen:
            mail, grund = None, "Message-ID in diesem Stapel bereits verarbeitet"
        if mail and mail["message_id"]:
            seen.add(mail["message_id"])
        antwort = None
        if mail and faq is not None:
            antwort, grund = firmenantwort(mail, faq)
            if antwort is None:
                ansicht.append({"nummer": nummer, "status": "Manuell prüfen", "grund": grund,
                                "betreff": mail["betreff"], "original": mail["text"]})
                ergebnisse.append({"nummer": nummer, "status": "Manuell prüfen", "grund": grund})
                continue
        if mail:
            reply, kategorie, prioritaet = antwort_erstellen(mail, absender, firma, antwort)
            name = f"antwort-{nummer:04d}.eml"
            (out / name).write_bytes(reply.as_bytes())
            ansicht.append({"nummer": nummer, "betreff": mail["betreff"], "empfaenger": str(mail["ziel"]),
                            "original": mail["text"], "entwurf": reply.get_content(),
                            "kategorie": kategorie, "prioritaet": prioritaet})
            ergebnisse.append({"nummer": nummer, "status": "Entwurf prüfen", "datei": name,
                               "kategorie": kategorie, "prioritaet": prioritaet})
        else:
            ansicht.append({"nummer": nummer, "grund": grund})
            ergebnisse.append({"nummer": nummer, "status": "Übersprungen", "grund": grund})
    (out / "index.html").write_text(erstellen(ansicht, firma), encoding="utf-8")
    bericht = {"version": VERSION, "gelesen": len(dateien), "entwuerfe": sum("datei" in r for r in ergebnisse),
               "manuell_pruefen": sum(r["status"] == "Manuell prüfen" for r in ergebnisse),
               "versendet": 0, "verfahren": "Freigegebenes Firmenwissen und Wortregeln, kein Sprachmodell" if faq is not None else "Lokale Regeln und Vorlagen, kein Sprachmodell",
               "ergebnisse": ergebnisse}
    (out / "bericht.json").write_text(json.dumps(bericht, ensure_ascii=False, indent=2), encoding="utf-8")
    return bericht


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("eingabe", type=Path)
    parser.add_argument("ausgabe", type=Path)
    parser.add_argument("--firma", required=True)
    parser.add_argument("--absender", required=True)
    parser.add_argument("--wissen", type=Path, help="Freigegebene Firmen-FAQ; unbekannte oder mehrdeutige Anliegen bleiben manuell.")
    args = parser.parse_args()
    try:
        bericht = verarbeiten(args.eingabe, args.ausgabe, args.firma, args.absender, args.wissen)
    except (ValueError, OSError) as e:
        parser.exit(2, "Abbruch: " + str(e) + "\n")
    print(json.dumps({k: bericht[k] for k in ("gelesen", "entwuerfe", "versendet")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
