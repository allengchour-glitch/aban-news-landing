#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tiktok_biolink.py — steht im TikTok-Profil wirklich ein Link?

DER FUND (29.08.2026): Alle sechs vorbereiteten Beiträge tragen die Zeile
«Link in Bio», und auf dem Abschluss-Slide steht sie sogar eingebrannt im BILD.
Live nachgesehen hat das Profil @luxestyle.ch aber **keinen Bio-Link**:
`bioLink` fehlt, `commerceUser: false` (kein Business-Konto — auf einem
Privatkonto gibt TikTok das Website-Feld erst ab 1'000 Followern frei, und das
Konto hat 560). Jeder Beitrag verwies also auf etwas, das es nicht gibt —
dieselbe Klasse wie das Popup, das auf eine Liste schrieb, die kein Flow las.

**Die Formel wird deshalb nicht mehr behauptet, sondern geprüft.** Ist ein Link
da, heisst es «Link in Bio»; ist keiner da, nennt die Caption nur die Domain —
die kann man abtippen, und sie ist wahr.

⚠️ **Ein Netzfehler darf die Formel NICHT einschalten.** Fällt die Abfrage aus,
gilt die vorsichtige Fassung: eine Zusage, die vielleicht stimmt, ist schlimmer
als eine Zeile, die sicher stimmt.

⚠️ Der Datenblock steht serverseitig im HTML (`__UNIVERSAL_DATA_FOR_REHYDRATION__`),
NICHT in der gerenderten App. Der Gedächtnis-Eintrag vom 28.08. («TikTok ist von
hier nicht lesbar») galt der Oberfläche — die Profildaten sind sehr wohl lesbar.
"""
import json
import os
import re
import subprocess
import time

PROFIL = os.environ.get("TT_PROFIL", "luxestyle.ch")
CACHE = "/tmp/_tt_profil_cache.json"
CACHE_SEK = 900          # 15 Minuten: ein Massenlauf fragt sonst je Beitrag neu
CA = "/root/.ccr/ca-bundle.crt"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")


def _laden():
    r = subprocess.run(
        ["curl", "-sS", "--cacert", CA, "-m", "30", "-H", f"User-Agent: {UA}",
         f"https://www.tiktok.com/@{PROFIL}"],
        capture_output=True, text=True, errors="replace")
    if r.returncode != 0 or not r.stdout:
        return None
    m = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>',
                  r.stdout, re.S)
    if not m:
        return None
    try:
        d = json.loads(m.group(1))
        return d["__DEFAULT_SCOPE__"]["webapp.user-detail"]["userInfo"]
    except Exception:
        return None


def profil(erzwingen=False):
    """{'user':…, 'stats':…} oder None. Antwort wird 15 Minuten zwischengespeichert."""
    if not erzwingen and os.path.exists(CACHE):
        try:
            if time.time() - os.path.getmtime(CACHE) < CACHE_SEK:
                return json.load(open(CACHE))
        except Exception:
            pass
    u = _laden()
    if u:
        try:
            json.dump(u, open(CACHE, "w"))
        except Exception:
            pass
    return u


def bio_link():
    """Die Adresse aus dem Profil — oder '' wenn keine da ist / nicht lesbar."""
    u = profil() or {}
    return ((u.get("user") or {}).get("bioLink") or {}).get("link", "") \
        if isinstance((u.get("user") or {}).get("bioLink"), dict) \
        else ((u.get("user") or {}).get("bioLink") or "")


def domain_im_bio():
    """Steht die Adresse wenigstens als TEXT im Bio?

    ⚠️ Drei Zustände, nicht zwei — das ist der Punkt (29.08.2026):
      1. echter Bio-Link  -> «Link in Bio» stimmt woertlich
      2. nur Text im Bio  -> nicht klickbar, aber die Zuschauerin FINDET den Shop.
                             Der Slide sagt «Link», das ist ungenau; ins Leere
                             laeuft aber niemand mehr.
      3. weder noch       -> der Verweis geht ins Nichts. Nur DAS ist ein Grund,
                             das Posten zu sperren.
    Ein Zwischenzustand, den man nicht kennt, wird sonst wie der schlimmste Fall
    behandelt — und dann sperrt eine Wache Arbeit, die in Ordnung ist.
    """
    u = profil() or {}
    bio = ((u.get("user") or {}).get("signature") or "").lower()
    return "luxestyle.ch" in bio


def cta_zeile(vorspann="Jetzt im Shop 🇨🇭 "):
    """Die CTA-Zeile, die zum tatsächlichen Profil passt."""
    return f"{vorspann}luxestyle.ch" + (" — Link in Bio" if bio_link() else "")


def cta_slide():
    """Die zweite Zeile auf dem Abschluss-Slide. Leer, wenn kein Link existiert."""
    return "Link in Bio" if bio_link() else ""


if __name__ == "__main__":
    u = profil(erzwingen=True)
    if not u:
        print("Profil nicht lesbar — vorsichtige Fassung greift.")
        raise SystemExit(1)
    usr, st = u.get("user", {}), u.get("stats", {})
    print(f"@{usr.get('uniqueId')} · {st.get('followerCount')} Follower · "
          f"{st.get('videoCount')} Videos · {st.get('heartCount')} Likes")
    print(f"Bio        : {usr.get('signature')}")
    print(f"Bio-Link   : {bio_link() or '(KEINER)'}")
    print(f"Business   : {(usr.get('commerceUserInfo') or {}).get('commerceUser')}")
    print(f"CTA-Zeile  : {cta_zeile()}")
    print(f"CTA-Slide  : {cta_slide() or '(leer)'}")
    print(f"Domain im Bio-Text: {domain_im_bio()}")
    zustand = ("klickbarer Link" if bio_link() else
               "Adresse als Text (nicht klickbar)" if domain_im_bio() else
               "WEDER Link NOCH Adresse — Verweise gehen ins Leere")
    print(f"Zustand    : {zustand}")
