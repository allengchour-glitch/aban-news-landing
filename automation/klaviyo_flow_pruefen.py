#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prüft die Warenkorb-Erinnerung in Klaviyo gegen automation/data/klaviyo_flow_regel.json (10.10.2026).

Anlass (dropship/WARENKORB-MAIL-2026-10-10.md): Der Flow «Abandoned Checkout» Vse76a hatte die Mail «Dein Einkauf
wartet auf dich» als ERSTE Aktion, die 1-h-Wartezeit kam erst danach. Gemessen ging Mail 1 im Median 25 s nach
Kassenstart raus; 2 von 6 Empfängerinnen bezahlten in dem Moment. Klaviyo zählte eine davon als «zurückgeholt».

Die Shell hat keinen Klaviyo-Schlüssel. Deshalb liest der Prüfer einen STAND, den eine Session über den
Klaviyo-Konnektor misst und in dropship/_klaviyo_flow_stand.json schreibt (ohne Personendaten). Geprüft wird:
  1. Für jeden Abbruch-Auslöser (Checkout Started) gibt es GENAU EINEN Flow mit Status live.
  2. Seine erste Aktion ist eine Wartezeit ≥ min_wartezeit_minuten — keine Mail beim Kassenstart.
  3. Kein Mail-Text enthält einen verbotenen Satz (falsche Verknappung, «reserviert», ß, «Hey ,»).
  4. Der Stand ist höchstens max_alter_tage alt — sonst «Messung fällig» (Session misst neu).

    python3 automation/klaviyo_flow_pruefen.py               # Ampel-Zeile, Exit 0/1
    python3 automation/klaviyo_flow_pruefen.py --selbsttest  # Kanarien (der alte Aufbau MUSS durchfallen)
"""
import datetime as dt
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGEL = json.load(open(os.path.join(REPO, "automation", "data", "klaviyo_flow_regel.json"), encoding="utf-8"))


def pruefen(stand, jetzt=None):
    """Liefert (fehler: list[str], hinweise: list[str], zeile: str)."""
    jetzt = jetzt or dt.datetime.now(dt.timezone.utc)
    fehler, hinweise = [], []
    flows = stand.get("flows") or []
    teile = []
    for metrik, name in REGEL["abbruch_trigger_metriken"].items():
        live = [f for f in flows if f.get("trigger_metric") == metrik and f.get("status") == "live"]
        if not live:
            fehler.append(f"kein live-Flow für «{name}» — abgebrochene Kassen bekommen keine Erinnerung")
            continue
        if REGEL.get("genau_ein_live_flow_je_trigger") and len(live) > 1:
            fehler.append(f"{len(live)} live-Flows für «{name}» ({', '.join(f['id'] for f in live)}) — Doppel-Mails")
        for f in live:
            e = f.get("entry") or {}
            if e.get("type") != "time-delay":
                fehler.append(f"{f['id']}: erste Aktion ist «{e.get('type')}» statt Wartezeit — Mail beim Kassenstart")
            elif int(e.get("minuten") or 0) < REGEL["min_wartezeit_minuten"]:
                fehler.append(f"{f['id']}: erste Wartezeit {e.get('minuten')} min < {REGEL['min_wartezeit_minuten']} min")
            for m in f.get("mails") or []:
                text = m.get("text") or ""
                if not text:
                    hinweise.append(f"{f['id']}/{m.get('template_id')}: Text nicht mitgemessen")
                for v in REGEL["verbotene_saetze"]:
                    if re.search(v["muster"], text, re.I):
                        fehler.append(f"{f['id']}/{m.get('template_id')}: «{v['muster']}» — {v['grund']}")
            erste = min((int(m.get("nach_minuten") or 0) for m in f.get("mails") or []), default=None)
            teile.append(f"{f['id']} live, erste Mail nach {erste} min, {len(f.get('mails') or [])} Mails")
    try:
        alter = max(0, (jetzt - dt.datetime.fromisoformat(stand["gemessen"].replace("Z", "+00:00"))).days)
    except (KeyError, ValueError):
        alter = None
        fehler.append("Stand ohne gültiges Datum «gemessen»")
    if alter is not None and alter > REGEL["max_alter_tage"]:
        hinweise.append(f"Messung fällig (Stand {alter} T alt) — Session: Klaviyo get_flow → {REGEL['stand_datei']}")
    kopf = "⚠️ KLAVIYO-WARENKORB" if fehler else "KLAVIYO-WARENKORB"
    zeile = f"{kopf}: {'; '.join(teile) or '—'} · Stand {alter if alter is not None else '?'} T"
    if fehler:
        zeile += " · " + " | ".join(fehler)
    elif hinweise:
        zeile += " · " + " | ".join(hinweise)
    return fehler, hinweise, zeile


def selbsttest():
    jetzt = dt.datetime(2026, 10, 10, 9, 0, tzinfo=dt.timezone.utc)
    gut_mail = [{"template_id": "A", "nach_minuten": 60, "text": "{% if first_name %}Hey {{ first_name }},{% endif %} gespeichert"},
                {"template_id": "B", "nach_minuten": 1440, "text": "10 % – ohne Mindestbestellwert"}]
    neu = {"id": "NEU", "status": "live", "trigger_metric": "XhnJPv", "entry": {"type": "time-delay", "minuten": 60}, "mails": gut_mail}
    alt = {"id": "ALT", "status": "live", "trigger_metric": "XhnJPv", "entry": {"type": "send-email"},
           "mails": [{"template_id": "C", "nach_minuten": 0, "text": "reserviert – aber nicht ewig"}]}
    faelle = [
        ("neuer Aufbau besteht", {"gemessen": "2026-10-10T08:15:00Z", "flows": [neu, dict(alt, status="draft")]}, 0),
        ("alter Aufbau (Mail zuerst) fällt durch", {"gemessen": "2026-10-10T08:15:00Z", "flows": [alt]}, 2),
        ("zwei live-Flows = Doppel-Mails", {"gemessen": "2026-10-10T08:15:00Z", "flows": [neu, dict(neu, id="NEU2")]}, 1),
        ("kein live-Flow", {"gemessen": "2026-10-10T08:15:00Z", "flows": [dict(neu, status="draft")]}, 1),
        ("Wartezeit 10 min zu kurz", {"gemessen": "2026-10-10T08:15:00Z",
                                      "flows": [dict(neu, entry={"type": "time-delay", "minuten": 10})]}, 1),
        ("falsche Verknappung", {"gemessen": "2026-10-10T08:15:00Z", "flows": [dict(neu, mails=[
            {"template_id": "D", "nach_minuten": 60, "text": "10 % Rabatt – nur für kurze Zeit"}])]}, 1),
        ("ß und «Hey ,»", {"gemessen": "2026-10-10T08:15:00Z", "flows": [dict(neu, mails=[
            {"template_id": "E", "nach_minuten": 60, "text": "Hey {{ first_name|default:'' }}, Jetzt abschließen"}])]}, 2),
    ]
    ok = 0
    for name, stand, soll in faelle:
        f, _, _ = pruefen(stand, jetzt)
        gut = len(f) == soll
        ok += gut
        print(f"  {'ok ' if gut else 'FEHLER'} {name}: {len(f)} Befunde (soll {soll}) {f if not gut else ''}")
    _, h, _ = pruefen({"gemessen": "2026-09-30T08:00:00Z", "flows": [neu]}, jetzt)
    alt_ok = any("fällig" in x for x in h)
    ok += alt_ok
    print(f"  {'ok ' if alt_ok else 'FEHLER'} alter Stand meldet «Messung fällig»")
    print(f"Selbsttest {ok}/{len(faelle) + 1}")
    return ok == len(faelle) + 1


def main():
    if "--selbsttest" in sys.argv:
        return 0 if selbsttest() else 1
    pfad = os.path.join(REPO, REGEL["stand_datei"])
    try:
        stand = json.load(open(pfad, encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"⚠️ KLAVIYO-WARENKORB: unklar (Stand nicht lesbar: {type(e).__name__})")
        return 1
    fehler, _, zeile = pruefen(stand)
    print(zeile)
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
