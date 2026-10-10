#!/usr/bin/env python3
"""Liest deine Telegram-Call-Gruppen mit DEINEM Telegram-Konto mit (nur lesen — er schreibt nie in die Gruppen).

Ein Bot kann fremde Gruppen nicht lesen; darum meldet sich dieses Skript einmal als du an (wie Telegram Desktop).
Einmalig einrichten (Windows):
  1. https://my.telegram.org → «API development tools» → App anlegen → api_id und api_hash notieren.
  2. setx TELEGRAM_API_ID "1234567"   und   setx TELEGRAM_API_HASH "abc…"   → neues Fenster öffnen.
  3. py -m pip install telethon
  4. py tools\\trading\\krypto_bot\\calls_leser.py --login          (Telefonnummer, Code aus Telegram, ggf. 2FA-Passwort)
  5. py tools\\trading\\krypto_bot\\calls_leser.py --gruppen        (zeigt deine Gruppen mit Nummer)
  6. setx TELEGRAM_CALL_GRUPPEN "-1001234567890,-1009876543210"   (die zwei Nummern; @name oder Link geht auch)

Dann:
  py tools\\trading\\krypto_bot\\calls_leser.py --verlauf --tage 365   # alte Nachrichten holen (für den Prüfstand)
  py tools\\trading\\krypto_bot\\calls_pruefung.py                      # ehrlich prüfen: hätte Kopieren etwas gebracht?
  py tools\\trading\\krypto_bot\\calls_leser.py --live                  # ab jetzt mitlesen: Schattenkonto / Kopierer

⚠️ Die Datei data/telegram-calls.session ist ein voller Zugang zu deinem Telegram-Konto. Sie bleibt nur auf deinem PC
(nie hochladen, nie weitergeben; .gitignore schliesst sie aus). Abmelden: Telegram → Einstellungen → Geräte → beenden.
Gespeichert wird nur der Text der Nachrichten (data/calls/<gruppe>.jsonl), keine Namen oder Telefonnummern.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
ROOT = HIER.parents[2]
DATA = ROOT / "data"
SITZUNG = DATA / "telegram-calls"           # Telethon hängt «.session» an
ORDNER = DATA / "calls"


def einstellungen(env=None):
    env = os.environ if env is None else env
    gruppen = [g.strip() for g in (env.get("TELEGRAM_CALL_GRUPPEN") or "").split(",") if g.strip()]
    return {"api_id": env.get("TELEGRAM_API_ID", "").strip(), "api_hash": env.get("TELEGRAM_API_HASH", "").strip(), "gruppen": gruppen}


def gruppen_kennung(g):
    """«-100123» → int, «https://t.me/name» / «@name» → «name», sonst Text (Titel)."""
    g = g.strip()
    if g.lstrip("-").isdigit():
        return int(g)
    for vor in ("https://t.me/", "http://t.me/", "t.me/", "@"):
        if g.startswith(vor):
            return g[len(vor):].split("/")[0]
    return g


def eintrag(nachricht, art="neu"):
    """Telethon-Nachricht → speicherbares dict (nur Text, Zeit, IDs — keine Absender-Daten)."""
    zeit = nachricht.date if nachricht.date.tzinfo else nachricht.date.replace(tzinfo=timezone.utc)
    e = {"id": nachricht.id, "zeit": zeit.astimezone(timezone.utc).isoformat(timespec="seconds"), "text": nachricht.message or "",
         "art": art}
    if getattr(nachricht, "edit_date", None):
        e["bearbeitet"] = nachricht.edit_date.astimezone(timezone.utc).isoformat(timespec="seconds")
    antwort = getattr(nachricht, "reply_to", None)
    if antwort is not None and getattr(antwort, "reply_to_msg_id", None):
        e["antwort_auf"] = antwort.reply_to_msg_id
    return e


def anhaengen(gruppe_id, eintraege, ordner=None):
    """An data/calls/<gruppe>.jsonl anhängen. Bearbeitungen kommen als eigene Zeile dazu (der Prüfstand nimmt den Ursprungstext)."""
    ordner = Path(ordner) if ordner else ORDNER
    ordner.mkdir(parents=True, exist_ok=True)
    datei = ordner / f"{gruppe_id}.jsonl"
    with datei.open("a", encoding="utf-8") as f:
        for e in eintraege:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    return datei


def bekannt(gruppe_id, ordner=None):
    """Höchste gespeicherte Nachrichten-ID (für das Nachladen ohne Doppelte) und die Ursprungstexte."""
    datei = (Path(ordner) if ordner else ORDNER) / f"{gruppe_id}.jsonl"
    hoechste, texte = 0, {}
    if datei.exists():
        for zeile in datei.read_text(encoding="utf-8").splitlines():
            try:
                e = json.loads(zeile)
            except ValueError:
                continue
            hoechste = max(hoechste, int(e.get("id", 0)))
            if e.get("art") == "neu":
                texte.setdefault(e["id"], e.get("text", ""))
    return hoechste, texte


def lebenszeichen(namen, ordner=None):
    """Für die Cockpit-Ampel: Der Leser läuft noch (alle paar Minuten neu geschrieben)."""
    ordner = Path(ordner) if ordner else ORDNER
    ordner.mkdir(parents=True, exist_ok=True)
    (ordner / "leser-lebt.json").write_text(json.dumps({"zeit": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                                                        "gruppen": sorted(namen.values())}, ensure_ascii=False), encoding="utf-8")


def _client(cfg):
    try:
        from telethon import TelegramClient
    except ImportError:
        raise SystemExit("Paket fehlt: py -m pip install telethon")
    if not cfg["api_id"] or not cfg["api_hash"]:
        raise SystemExit("TELEGRAM_API_ID / TELEGRAM_API_HASH fehlen — auf https://my.telegram.org anlegen (siehe Hilfe: --help).")
    DATA.mkdir(exist_ok=True)
    return TelegramClient(str(SITZUNG), int(cfg["api_id"]), cfg["api_hash"])


async def _gruppen_aufloesen(client, cfg):
    """Konfigurierte Gruppen → [(id, Titel, entity)]. Titel werden gegen deine Chats gesucht."""
    out, titel = [], {}
    async for d in client.iter_dialogs():
        if d.is_group or d.is_channel:
            titel[d.name] = d
            titel[d.id] = d
            if getattr(d.entity, "username", None):
                titel[d.entity.username.lower()] = d
    for g in cfg["gruppen"]:
        k = gruppen_kennung(g)
        d = titel.get(k) or titel.get(k.lower() if isinstance(k, str) else k)
        if d is None:
            print(f"⚠️ Gruppe «{g}» nicht unter deinen Chats gefunden (erst beitreten, dann --gruppen ansehen).")
            continue
        out.append((d.id, d.name, d.entity))
    namen_datei = ORDNER / "gruppen.json"
    ORDNER.mkdir(parents=True, exist_ok=True)
    alt = json.loads(namen_datei.read_text(encoding="utf-8")) if namen_datei.exists() else {}
    alt.update({str(i): n for i, n, _ in out})
    namen_datei.write_text(json.dumps(alt, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return out


async def login(cfg):
    client = _client(cfg)
    await client.start()
    ich = await client.get_me()
    print(f"✅ Angemeldet als {ich.first_name or ''} (die Sitzung liegt in data/telegram-calls.session — geheim halten!).")
    await client.disconnect()


async def gruppen_zeigen(cfg):
    client = _client(cfg)
    await client.start()
    print("Deine Gruppen und Kanäle (Nummer für TELEGRAM_CALL_GRUPPEN):")
    async for d in client.iter_dialogs():
        if d.is_group or d.is_channel:
            name = f"@{d.entity.username}" if getattr(d.entity, "username", None) else ""
            print(f"  {d.id:>16}  {d.name}  {name}")
    await client.disconnect()


async def verlauf(cfg, tage):
    client = _client(cfg)
    await client.start()
    ab = datetime.now(timezone.utc) - timedelta(days=tage)
    for gid, name, entity in await _gruppen_aufloesen(client, cfg):
        hoechste, _ = bekannt(gid)
        neu = []
        # Ältere zuerst; beim ersten Mal ab «tage», danach nur neuere als die höchste gespeicherte ID
        kw = {"min_id": hoechste} if hoechste else {"offset_date": ab}
        async for m in client.iter_messages(entity, reverse=True, wait_time=1, **kw):
            if m.message:
                neu.append(eintrag(m))
        anhaengen(gid, neu)
        print(f"{name}: {len(neu)} neue Nachrichten gespeichert.")
    await client.disconnect()


async def live(cfg, verarbeiten=None):
    """Mitlesen bis Strg+C. Neue Nachrichten → Datei + Schattenkonto/Kopierer; Bearbeitungen und Löschungen werden notiert."""
    from telethon import events
    client = _client(cfg)
    await client.start()
    gruppen = await _gruppen_aufloesen(client, cfg)
    if not gruppen:
        raise SystemExit("Keine Gruppe gefunden — TELEGRAM_CALL_GRUPPEN prüfen (--gruppen zeigt die Nummern).")
    ids = [g[0] for g in gruppen]
    namen = {g[0]: g[1] for g in gruppen}
    if verarbeiten is None:
        import calls_kopierer as CK
        verarbeiten = CK.neue_nachricht

    @client.on(events.NewMessage(chats=ids))
    async def neu(ev):
        e = eintrag(ev.message)
        anhaengen(ev.chat_id, [e])
        if e["text"]:
            try:
                await asyncio.get_running_loop().run_in_executor(None, verarbeiten, str(ev.chat_id), namen.get(ev.chat_id, ""), e)
            except Exception as ex:  # noqa: BLE001 — eine kaputte Nachricht darf das Mitlesen nie beenden
                print(f"Fehler beim Verarbeiten: {type(ex).__name__}: {ex}")

    @client.on(events.MessageEdited(chats=ids))
    async def bearbeitet(ev):
        anhaengen(ev.chat_id, [eintrag(ev.message, art="bearbeitet")])

    @client.on(events.MessageDeleted())
    async def geloescht(ev):
        if ev.chat_id in ids:  # Telegram nennt die Gruppe nur bei Kanälen/Supergruppen
            anhaengen(ev.chat_id, [{"id": i, "art": "geloescht", "zeit": datetime.now(timezone.utc).isoformat(timespec="seconds")}
                                   for i in ev.deleted_ids])

    async def pflege_schleife():
        """Offene Calls nachführen: jede Minute, solange kopierte Calls laufen, sonst alle 5 Minuten."""
        import calls_kopierer as CK
        while True:
            try:
                await asyncio.get_running_loop().run_in_executor(None, CK.pflegen)
            except Exception as ex:  # noqa: BLE001 — nie das Mitlesen beenden
                print(f"Pflege-Fehler: {type(ex).__name__}: {ex}")
            lebenszeichen(namen)
            await asyncio.sleep(60 if CK.offene_symbole() else 300)

    asyncio.get_running_loop().create_task(pflege_schleife())
    print(f"👂 Lese mit: {', '.join(namen.values())}. Fenster offen lassen; Strg+C beendet.")
    await client.run_until_disconnected()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--login", action="store_true")
    ap.add_argument("--gruppen", action="store_true")
    ap.add_argument("--verlauf", action="store_true")
    ap.add_argument("--tage", type=int, default=365)
    ap.add_argument("--live", action="store_true")
    a = ap.parse_args()
    cfg = einstellungen()
    if a.login:
        asyncio.run(login(cfg))
    elif a.gruppen:
        asyncio.run(gruppen_zeigen(cfg))
    elif a.verlauf or a.live:
        if not cfg["gruppen"]:
            raise SystemExit("TELEGRAM_CALL_GRUPPEN fehlt — erst --gruppen ansehen, dann setx TELEGRAM_CALL_GRUPPEN \"nummer1,nummer2\".")
        if a.verlauf:
            asyncio.run(verlauf(cfg, a.tage))
        if a.live:
            asyncio.run(live(cfg))
    else:
        ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
