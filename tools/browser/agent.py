#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
agent.py — eingeloggter Browser-Agent (Playwright) für LuxeStyle.

Erweitert das deterministische browser.py (öffentlich-only) um **eingeloggte
Aktionen** (z. B. Instagram-/TikTok-Posts löschen). Sicherheitsprinzip:

  ▸ NIE Passwörter im Code/Repo. Du loggst dich EINMAL pro Plattform von Hand
    ein (inkl. 2FA) — der Agent speichert nur die **Session (Cookies)** als
    storageState-Datei unter ~/.luxe-browser/<profil>.json. Diese Datei ist
    wie ein Login → **niemals committen** (ist via .gitignore gesperrt).
  ▸ Danach nutzt jede Aktion diese gespeicherte Session. Läuft sie ab, einfach
    `login` neu ausführen.

⚠️ Ehrliche Grenzen:
  - Muss auf EINEM Rechner mit Bildschirm laufen (das Login braucht deine Hand).
    Die Cloud-Session hat keinen Bildschirm → Login geht dort nicht.
  - IG/TikTok mögen Automatisierung nicht (Bot-Schutz, AGB). Selektoren ändern
    sich. Konservativ einsetzen (kein Massen-/Sekundentakt) → sonst Konto-Risiko.
  - Vor jedem Löschen: Screenshot + explizites --confirm nötig (kein Blind-Klick).

Installation (einmalig, auf deinem Rechner):
  pip install playwright
  python3 -m playwright install chromium

Befehle:
  # 1) EINMAL einloggen (öffnet sichtbaren Browser, du meldest dich an):
  python3 agent.py login instagram https://www.instagram.com/accounts/login/
  python3 agent.py login tiktok    https://www.tiktok.com/login

  # 2) Session prüfen (Screenshot der eingeloggten Profilseite):
  python3 agent.py check instagram https://www.instagram.com/luxestyle.ch/ --out ig.png

  # 3) Aktion — einen Post löschen (mit Screenshots + Bestätigung):
  python3 agent.py ig-delete https://www.instagram.com/p/XXXXXXXX/ --confirm
  python3 agent.py tiktok-delete https://www.tiktok.com/@luxestyle.ch/video/123 --confirm
"""
import argparse
import os
import sys
import time

STATE_DIR = os.path.expanduser("~/.luxe-browser")


def _brave_path():
    """Findet Brave (oder BROWSER_EXE). Brave = Chromium → läuft über deine Heim-IP (IG blockt nicht)."""
    if os.environ.get("BROWSER_EXE"):
        return os.environ["BROWSER_EXE"]
    for c in (
        r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
        r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "/usr/bin/brave-browser", "/usr/bin/brave",
    ):
        if os.path.exists(c):
            return c
    return None


def _launch(p, headless=True):
    """Startet Chromium — bevorzugt Brave, falls vorhanden (sonst Playwright-Chromium)."""
    exe = _brave_path()
    kw = {"headless": headless}
    if exe:
        kw["executable_path"] = exe
        print("(nutze Brave: %s)" % exe)
    return p.chromium.launch(**kw)


def _pw():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("! Playwright fehlt:\n    pip install playwright\n"
                 "    python3 -m playwright install chromium")
    return sync_playwright


def _state_path(profile):
    return os.path.join(STATE_DIR, "%s.json" % profile)


def _need_state(profile):
    p = _state_path(profile)
    if not os.path.exists(p):
        sys.exit("! Keine Session für '%s'. Erst einloggen:\n"
                 "    python3 agent.py login %s <login-url>" % (profile, profile))
    return p


# ------------------------------------------------------------------
def cmd_login(args):
    """Sichtbaren Browser öffnen, User loggt sich von Hand ein, Session speichern."""
    os.makedirs(STATE_DIR, exist_ok=True)
    with _pw()() as p:
        b = _launch(p, headless=False)
        ctx = b.new_context()
        page = ctx.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
        print("\n>>> Browser ist offen. Logge dich JETZT von Hand ein (inkl. 2FA).")
        print(">>> Wenn du fertig + auf der Startseite/Profil bist, hier ENTER drücken …")
        try:
            input()
        except EOFError:
            time.sleep(60)
        ctx.storage_state(path=_state_path(args.profile))
        b.close()
    os.chmod(_state_path(args.profile), 0o600)
    print("✓ Session gespeichert: %s (geheim halten, nie committen!)" % _state_path(args.profile))


# ------------------------------------------------------------------
def _ctx(p, profile, headless=True):
    b = _launch(p, headless=headless)
    ctx = b.new_context(storage_state=_need_state(profile),
                        viewport={"width": 1280, "height": 1000},
                        user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                                    "Chrome/124.0 Safari/537.36"))
    return b, ctx


def cmd_check(args):
    """Mit gespeicherter Session eine Seite öffnen + Screenshot (Login-Beweis)."""
    with _pw()() as p:
        b, ctx = _ctx(p, args.profile, headless=not args.sichtbar)
        page = ctx.new_page()
        page.goto(args.url, wait_until="networkidle", timeout=45000)
        time.sleep(2)
        page.screenshot(path=args.out, full_page=False)
        b.close()
    print("✓ Screenshot: %s — prüfe, ob du dort EINGELOGGT bist." % args.out)


# ------------------------------------------------------------------
def _click_first(page, selectors, timeout=4000):
    """Klickt den ersten Selektor, der existiert. Gibt True/False zurück."""
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            loc.wait_for(state="visible", timeout=timeout)
            loc.click()
            return True
        except Exception:
            continue
    return False


def cmd_ig_delete(args):
    """Instagram-Post löschen: … -Menü → Löschen → Bestätigen (best-effort)."""
    with _pw()() as p:
        b, ctx = _ctx(p, "instagram", headless=not args.sichtbar)
        page = ctx.new_page()
        page.goto(args.url, wait_until="networkidle", timeout=45000)
        time.sleep(2)
        page.screenshot(path="ig-before.png")
        if not args.confirm:
            print("DRY-RUN (kein --confirm): ig-before.png gespeichert, NICHT gelöscht.")
            b.close(); return
        # … (Optionen)-Button
        ok = _click_first(page, [
            'svg[aria-label="More options"]', 'svg[aria-label="Mehr Optionen"]',
            'button:has(svg[aria-label="More options"])', '[aria-label="More options"]',
        ])
        if not ok:
            page.screenshot(path="ig-fail.png")
            sys.exit("! Konnte das …-Menü nicht finden (Layout geändert?). ig-fail.png prüfen.")
        time.sleep(1)
        ok = _click_first(page, [
            'button:has-text("Delete")', 'button:has-text("Löschen")',
            'div[role="button"]:has-text("Delete")', 'div[role="button"]:has-text("Löschen")',
        ])
        if not ok:
            page.screenshot(path="ig-fail.png"); sys.exit("! 'Löschen' nicht gefunden. ig-fail.png prüfen.")
        time.sleep(1)
        _click_first(page, ['button:has-text("Delete")', 'button:has-text("Löschen")'])  # Bestätigung
        time.sleep(3)
        page.screenshot(path="ig-after.png")
        b.close()
    print("✓ IG-Löschversuch fertig. Vergleiche ig-before.png / ig-after.png.")


def cmd_tiktok_delete(args):
    """TikTok-Video löschen über die 3-Punkte/Manage-Optionen (best-effort)."""
    with _pw()() as p:
        b, ctx = _ctx(p, "tiktok", headless=not args.sichtbar)
        page = ctx.new_page()
        page.goto(args.url, wait_until="networkidle", timeout=45000)
        time.sleep(2)
        page.screenshot(path="tt-before.png")
        if not args.confirm:
            print("DRY-RUN (kein --confirm): tt-before.png gespeichert, NICHT gelöscht.")
            b.close(); return
        ok = _click_first(page, [
            '[data-e2e="video-more"]', 'button[aria-label="more"]',
            'svg[aria-label="more"]', '[aria-label="More"]',
        ])
        if not ok:
            page.screenshot(path="tt-fail.png")
            sys.exit("! TikTok-Menü nicht gefunden. tt-fail.png prüfen.")
        time.sleep(1)
        ok = _click_first(page, ['*:has-text("Delete")', '*:has-text("Löschen")'])
        if not ok:
            page.screenshot(path="tt-fail.png"); sys.exit("! 'Löschen' nicht gefunden. tt-fail.png prüfen.")
        time.sleep(1)
        _click_first(page, ['button:has-text("Delete")', 'button:has-text("Löschen")'])
        time.sleep(3)
        page.screenshot(path="tt-after.png")
        b.close()
    print("✓ TikTok-Löschversuch fertig. Vergleiche tt-before.png / tt-after.png.")


# ------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(description="Eingeloggter Browser-Agent (Playwright).")
    sub = p.add_subparsers(dest="cmd", required=True)

    lo = sub.add_parser("login", help="Einmal von Hand einloggen + Session speichern")
    lo.add_argument("profile", help="z. B. instagram / tiktok")
    lo.add_argument("url", help="Login-URL der Plattform")
    lo.set_defaults(func=cmd_login)

    ch = sub.add_parser("check", help="Session testen (Screenshot einer Seite)")
    ch.add_argument("profile"); ch.add_argument("url")
    ch.add_argument("--out", default="session-check.png")
    ch.add_argument("--sichtbar", action="store_true", help="Browser sichtbar (Debug)")
    ch.set_defaults(func=cmd_check)

    ig = sub.add_parser("ig-delete", help="Instagram-Post löschen (best-effort)")
    ig.add_argument("url"); ig.add_argument("--confirm", action="store_true")
    ig.add_argument("--sichtbar", action="store_true")
    ig.set_defaults(func=cmd_ig_delete)

    tt = sub.add_parser("tiktok-delete", help="TikTok-Video löschen (best-effort)")
    tt.add_argument("url"); tt.add_argument("--confirm", action="store_true")
    tt.add_argument("--sichtbar", action="store_true")
    tt.set_defaults(func=cmd_tiktok_delete)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
