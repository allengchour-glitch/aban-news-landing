#!/usr/bin/env python3
"""shopify_host_wache.py — trägt jeder laufende Prozess einen brauchbaren SHOPIFY_SHOP, und wie viele Dateien schicken das Secret an einen ungeprüften Host? (19.10.2026). Rein lesend.

ANLASS: Am 19.10. war SHOPIFY_CLIENT_SECRET der Umgebung verdorben (gültiger Schlüssel + «=SHOPIFY_CLIENT_SECRET»); lib/shopify_secret.sh heilt das an den
Startwegen, secret_umgebung_wache.py bewacht die laufenden Prozesse. Derselbe Einfügefehler kann SHOPIFY_SHOP treffen — dann ginge das gültige Secret an
einen Fantasie-Host. lib/shopify_secret.sh (shopify_shop_pruefen) heilt NEUE Prozesse; diese Wache sagt, ob schon LAUFENDE einen falschen Wert tragen, und
zählt im Quelltext, wie viele Dateien den Host noch roh aus der Umgebung nehmen (Idee aus Codex #2673, siehe lib/shopify_host.py).

WIE (kein Doppelbau): Die /proc-Wanderung und die Motor-/Sitzungs-Zuordnung kommen aus secret_umgebung_wache.py (lese_proc mit Hook, einordnen mit
schluessel="shop"); das Urteil über den Wert aus lib/shopify_host.py. Gelesen wird nur das Urteil und Länge/Merkmale — NIE ein Wert. Gezählt werden wie dort nur
Verbraucher (node/python), Motoren und die Sitzung; Shell-Hüllen lesen /tmp/secrets_env.sh danach neu ein. Drei Teile:
  1. Umgebung: /proc/<pid>/environ aller lesbaren Prozesse, SHOPIFY_SHOP → ok | bereinigt (nur anders geschrieben) | falsch | fremd (anderer Shop) |
     leer (gesetzt, aber ohne Inhalt: Skripte, die den Host aus der Umgebung nehmen, brechen damit ab — kein Leck, aber nicht «brauchbar»). «leer» wird
     bei Verbrauchern, Motoren, Sitzung und in der Datei wie ein unbrauchbarer Wert gemeldet (zweite Prüfung 19.10.: ein leerer Wert zählte als «brauchbar»);
     bei Shell-Hüllen steht er nur als Zahl in der ok-Zeile.
     Kanarienvogel gegen eine stille 0: trägt die EIGENE Umgebung SHOPIFY_SHOP, muss der eigene /proc-Eintrag es auch zeigen, sonst «unklar».
  2. Datei /tmp/secrets_env.sh (die Runner lesen sie nach dem Start ein und überschreiben die Umgebung): Zeile SHOPIFY_SHOP geparst, nicht ausgeführt —
     auch die ANSI-C-Form $'…', in der `printf %q` (env_datei im Keepalive) Werte mit Zeilenende/Tab/CR schreibt (vorher als «falsch, Länge 26» gelesen).
     Heilen tut das lib/shopify_secret.sh (shopify_secrets_datei_heilen, im selben Keepalive-Lauf); diese Wache meldet nur, was danach noch steht.
  3. Quelltext (ganzes Repo, .py .mjs .sh .js .cjs; Test-/Hilfsdateien dieser Regel und Kommentarzeilen ausgenommen): Dateien mit «admin/oauth/access_token» im Code
     nach der Herkunft ihres Hosts: roh (Host aus SHOPIFY_SHOP, keine Prüfung) · suffix (nur `myshopify\\.com$`, lässt «evilmyshopify.com» durch) ·
     geprüft (lib/shopify_host.*, shopify_shop_pruefen oder eigene strenge Regex) · fest (Host im Code). KEINE Alarmschwelle: die Zahl steht in der Zeile,
     der Trend (Vergleich mit dem letzten Tag, /tmp/_shopify_host_trend.tsv) auch; «ok» heisst nur, dass die LIVE-Umgebung stimmt.
Fehler (Datei/Prozesse nicht lesbar, Wanderung leer, Quelltext leer, Kanarienvogel) = «unklar», nie «ok».

AUFRUF (eine Zeile für die Stunden-Meldung des Aufsehers, ⚠️ nur bei Befund):
    python3 automation/shopify_host_wache.py            # Zeile(n)
    python3 automation/shopify_host_wache.py --liste    # zusätzlich die Dateien je Klasse (für einen späteren Umbau)
    python3 automation/shopify_host_wache.py --selbsttest
Unbekannter Schalter: Exit 2 ohne Lauf.
"""
import importlib.util
import os
import re
import shlex
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, ".."))
SECRETS_DATEI = "/tmp/secrets_env.sh"
TREND_DATEI = "/tmp/_shopify_host_trend.tsv"
MELDEN = {"bereinigt", "falsch", "fremd", "leer"}   # Urteile, die gemeldet werden (nur ok nicht)
ENDPUNKT = "admin/oauth/access_token"
DATEI_ENDUNGEN = (".py", ".mjs", ".sh", ".js", ".cjs")
DATEI_MAX = 2_000_000
KLASSEN = ("roh", "suffix", "geprueft", "fest")

KOMMENTAR = re.compile(r"\s*(?://|#|\*|/\*)")
HELFER = re.compile(r"shopify_host|shopify_shop_pruefen|normalizeShopifyHost|assertShopifyHost|heileShopifyHost|normalize_shopify_host|assert_shopify_host|heile_shopify_host")
STRENG = re.compile(r"\^\[a-z0-9\][^\n]{0,40}myshopify\\?\.com\$|\bHOST_RE\b|\bhostOk\b")
SUFFIX = re.compile(r"myshopify\\?\.com\$|endsWith\(\s*['\"]\.?myshopify\.com|\.endswith\(\s*['\"]\.?myshopify\.com")
ENV = re.compile(r"\bSHOPIFY_SHOP\b")
# Hilfs-/Testdateien dieser Regel selbst und Test-Infrastruktur: zählen nicht mit
AUSGENOMMEN = re.compile(r"shopify_host|(?:_test|_probe|selbsttest)\.|^test_|^fake_fetch")


def _lade(name, pfad):
    sys.dont_write_bytecode = True            # die Wache legt keine .pyc-Dateien neben die Quellen
    spec = importlib.util.spec_from_file_location(name, pfad)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


SW = _lade("secret_umgebung_wache", os.path.join(HIER, "secret_umgebung_wache.py"))
SH = _lade("shopify_host", os.path.join(HIER, "lib", "shopify_host.py"))


ANSI_C = re.compile(r"\$'((?:[^'\\]|\\.)*)'", re.S)
_ANSI_EINFACH = {"a": 7, "b": 8, "e": 27, "E": 27, "f": 12, "n": 10, "r": 13, "t": 9, "v": 11, "\\": 92, "'": 39, '"': 34, "?": 63}


def _ansi_c(inhalt):
    """Inhalt von $'…' (ohne die Hochkommas) → Text, wie bash ihn liest. None bei einer nicht unterstützten Folge (\\u, \\U, \\c, \\x ohne Ziffern)."""
    out, i = bytearray(), 0
    while i < len(inhalt):
        c = inhalt[i]
        if c != "\\":
            out += c.encode("utf-8")
            i += 1
            continue
        i += 1
        if i >= len(inhalt):
            return None
        c = inhalt[i]
        if c in _ANSI_EINFACH:
            out.append(_ANSI_EINFACH[c])
            i += 1
        elif c in "01234567":
            j = i
            while j < len(inhalt) and j < i + 3 and inhalt[j] in "01234567":
                j += 1
            out.append(int(inhalt[i:j], 8) & 255)
            i = j
        elif c == "x":
            j = i + 1
            while j < len(inhalt) and j < i + 3 and inhalt[j] in "0123456789abcdefABCDEF":
                j += 1
            if j == i + 1:
                return None
            out.append(int(inhalt[i + 1:j], 16))
            i = j
        else:
            return None
    return out.decode("utf-8", "replace")


def loese_ansi_c(text):
    """Jede $'…'-Zeichenfolge → ein einfach gequotetes Wort mit dem entschlüsselten Inhalt (danach liest shlex die Zeile wie bash). None, wenn eine nicht lesbar ist."""
    fehler = []

    def ersatz(m):
        v = _ansi_c(m.group(1))
        if v is None:
            fehler.append(1)
            return m.group(0)
        return shlex.quote(v)

    neu = ANSI_C.sub(ersatz, text)
    return None if fehler else neu


def host_hook(wert):
    """(Urteil, Länge/Merkmale) — der Wert selbst verlässt diese Funktion nie."""
    return SH.host_urteil(wert)[0], SH.host_struktur(wert)


# ── 3. Quelltext ──────────────────────────────────────────────────────────────────────────────────────
def klassifiziere(text):
    """None (sendet nicht) | roh | suffix | geprueft | fest — nach den Codezeilen (Kommentare zählen nicht)."""
    code = "\n".join(z for z in text.splitlines() if not KOMMENTAR.match(z))
    if ENDPUNKT not in code:
        return None
    if HELFER.search(code) or STRENG.search(code):
        return "geprueft"
    if ENV.search(code):
        return "suffix" if SUFFIX.search(code) else "roh"
    return "fest"


def zaehle_quelltext(wurzel=REPO):
    """→ ({klasse: [relativer Pfad]}, Fehler|None). Ein nicht lesbares Verzeichnis ist ein Fehler, keine 0."""
    dateien = {k: [] for k in KLASSEN}
    fehler = []
    for ordner, unter, namen in os.walk(wurzel, onerror=lambda e: fehler.append(e)):
        unter[:] = [u for u in unter if u not in (".git", "node_modules", "__pycache__")]
        for n in namen:
            if not n.endswith(DATEI_ENDUNGEN) or AUSGENOMMEN.search(n):
                continue
            pfad = os.path.join(ordner, n)
            try:
                if os.path.getsize(pfad) > DATEI_MAX:
                    continue
                with open(pfad, encoding="utf-8", errors="replace") as f:
                    k = klassifiziere(f.read())
            except OSError as e:
                fehler.append(e)
                continue
            if k:
                dateien[k].append(os.path.relpath(pfad, wurzel))
    for v in dateien.values():
        v.sort()
    return dateien, (f"{len(fehler)} Pfad(e) nicht lesbar" if fehler else None)


def trend(zahl, pfad=TREND_DATEI, heute=None, schreiben=True):
    """«Trend ±0 seit 2026-10-18» — vergleicht `zahl` (Dateien ohne Prüfung) mit dem letzten Eintrag VOR heute. Schreibt höchstens eine Zeile je Tag."""
    heute = heute or time.strftime("%Y-%m-%d", time.gmtime())
    zeilen = []
    try:
        with open(pfad, encoding="utf-8") as f:
            for z in f:
                t = z.rstrip("\n").split("\t")
                if len(t) >= 2 and re.fullmatch(r"\d{4}-\d{2}-\d{2}", t[0]) and t[1].isdigit():
                    zeilen.append((t[0], int(t[1])))
    except FileNotFoundError:
        pass
    except OSError:
        return "Trend unklar (Datei nicht lesbar)"
    frueher = [(d, n) for d, n in zeilen if d < heute]
    if frueher:
        d, n = frueher[-1]
        diff = zahl - n
        text = f"Trend {'±0' if diff == 0 else ('+' if diff > 0 else '−') + str(abs(diff))} seit {d}"
    else:
        text = "Trend: erste Messung"
    if schreiben:
        neu = [(d, n) for d, n in zeilen if d != heute][-60:] + [(heute, zahl)]
        try:
            with open(pfad, "w", encoding="utf-8") as f:
                f.write("".join(f"{d}\t{n}\n" for d, n in neu))
        except OSError:
            text += " (nicht gespeichert)"
    return text


# ── 2. Datei ──────────────────────────────────────────────────────────────────────────────────────────
def datei_urteil(pfad=SECRETS_DATEI):
    """→ (Urteil, Info): ok/bereinigt/falsch/fremd/leer, «fehlt» (keine Datei), «keine_zeile», «unklar». Die Datei wird gelesen, nicht ausgeführt."""
    try:
        with open(pfad, encoding="utf-8", errors="replace") as f:
            text = f.read()
    except FileNotFoundError:
        return "fehlt", ""
    except OSError:
        return "unklar", "Datei nicht lesbar"
    wert, gefunden = "", False
    for z in text.splitlines():
        m = re.match(r"\s*(?:export\s+)?SHOPIFY_SHOP=(.*)$", z)
        if m:
            rest = loese_ansi_c(m.group(1))
            if rest is None:
                return "unklar", "ANSI-C-Zeichenfolge nicht lesbar"
            try:
                tok = shlex.split(rest, comments=False)
            except ValueError:
                return "unklar", "Zeile nicht lesbar"
            if len(tok) > 1:
                return "unklar", "mehrere Wörter"
            wert, gefunden = (tok[0] if tok else ""), True
    if not gefunden:
        return "keine_zeile", ""
    return host_hook(wert)


# ── 1. Umgebung ───────────────────────────────────────────────────────────────────────────────────────
def umgebung(proc="/proc", eigene_pid=None, eigene_env=None):
    """→ dict(prozesse, mit (SHOPIFY_SHOP mit Inhalt), leer (gesetzt, aber leer), schlecht, sitzung, motoren, fremd, infos, unklar|None)."""
    try:
        procs = SW.lese_proc(proc, host_urteil=host_hook)
    except OSError as e:
        procs = {}
        nicht_lesbar = f"{proc} nicht lesbar ({type(e).__name__})"
    else:
        nicht_lesbar = None
    erg = {"prozesse": len(procs), "mit": sum(1 for p in procs.values() if p["shop"] not in (None, "leer")),
           "leer": sum(1 for p in procs.values() if p["shop"] == "leer"), "schlecht": 0, "sitzung": [], "motoren": {}, "fremd": [], "infos": [], "unklar": None}
    pid = os.getpid() if eigene_pid is None else eigene_pid
    env = os.environ if eigene_env is None else eigene_env
    if nicht_lesbar:
        erg["unklar"] = nicht_lesbar
    elif len(procs) < 3:
        erg["unklar"] = f"nur {len(procs)} Prozess(e) in /proc lesbar"
    elif "SHOPIFY_SHOP" in env and procs.get(pid, {}).get("shop") is None:
        erg["unklar"] = "die eigene Umgebung trägt SHOPIFY_SHOP, /proc zeigt es nicht (Leser kaputt?)"
    motoren, sitzung, fremd = SW.einordnen(procs, MELDEN, schluessel="shop")
    erg.update(motoren=motoren, sitzung=sitzung, fremd=fremd)
    erg["schlecht"] = len(sitzung) + len(fremd) + sum(len(v[2]) for v in motoren.values())
    infos = []
    for pid_ in sitzung + fremd + [x for v in motoren.values() for x in v[2]]:
        i = f"{procs[pid_]['shop']}: {procs[pid_]['shop_info']}"
        if i not in infos:
            infos.append(i)
    erg["infos"] = infos[:3]
    return erg


# ── Zeile ─────────────────────────────────────────────────────────────────────────────────────────────
def lauf(wurzel=REPO, proc="/proc", datei=SECRETS_DATEI, trend_datei=TREND_DATEI, heute=None, schreiben=True, eigene_pid=None, eigene_env=None, liste=False):
    u = umgebung(proc, eigene_pid, eigene_env)
    d_art, d_info = datei_urteil(datei)
    dateien, q_fehler = zaehle_quelltext(wurzel)
    senden = sum(len(v) for v in dateien.values())
    mit_env = len(dateien["roh"]) + len(dateien["suffix"]) + len(dateien["geprueft"])
    quell = (f"Quelltext: {len(dateien['roh'])} von {mit_env} Dateien mit Host aus der Umgebung ohne Prüfung, {len(dateien['suffix'])} nur Suffix-Prüfung, "
             f"{len(dateien['geprueft'])} geprüft; {len(dateien['fest'])} von {senden} haben den Host fest")
    tr = trend(len(dateien["roh"]), trend_datei, heute, schreiben and not q_fehler and senden > 0)
    unklar = u["unklar"] or q_fehler or (None if senden > 0 else "Quelltext-Zählung leer (kein Sender gefunden)") or ("Datei " + d_info if d_art == "unklar" else None)
    teile, schlecht = [], False
    if u["sitzung"]:
        teile.append(f"die Sitzung trägt einen unbrauchbaren Wert ({len(u['sitzung'])} Prozesse)")
    if u["motoren"]:
        teile.append(f"{len(u['motoren'])} Motor(en) ({', '.join(v[0] for v in u['motoren'].values())})")
    if u["fremd"]:
        teile.append(f"{len(u['fremd'])} weitere Verbraucher")
    if d_art in MELDEN:
        teile.append(f"/tmp/secrets_env.sh trägt einen unbrauchbaren Wert ({d_art}) — die Runner lesen sie nach dem Start ein")
    schlecht = bool(teile)
    if schlecht:
        zeilen = ["⚠️ SHOPIFY-HOST: " + " · ".join(teile) + (f" [{'; '.join(u['infos'])}]" if u["infos"] else "") + f" · {quell} · {tr}",
                  "  → neue Prozesse heilt lib/shopify_secret.sh (shopify_shop_pruefen); laufende erst nach Korrektur der Umgebungsvariable SHOPIFY_SHOP "
                  "(Betreiber, Claude-Umgebungseinstellungen) und Neustart"]
    elif unklar:
        zeilen = [f"SHOPIFY-HOST: unklar ({unklar}) · {quell} · {tr}"]
    else:
        datei_text = {"ok": "Datei geprüft", "fehlt": "keine Datei", "keine_zeile": "Datei ohne SHOPIFY_SHOP"}.get(d_art, d_art)
        leer_text = f", {u['leer']} weitere mit leerem Wert (keine Verbraucher)" if u["leer"] else ""
        zeilen = [f"SHOPIFY-HOST: ok (Umgebung geprüft: {u['mit']} von {u['prozesse']} Prozessen tragen SHOPIFY_SHOP, alle Verbraucher davon brauchbar{leer_text} · {datei_text} · {quell} · {tr})"]
    if liste:
        for k in KLASSEN:
            zeilen += [f"  {k}\t{p}" for p in dateien[k]]
    return zeilen


# ── Selbsttest ────────────────────────────────────────────────────────────────────────────────────────
def selbsttest():
    import contextlib
    import io
    import subprocess
    import tempfile
    ok = fehl = 0

    def pruef(name, bed):
        nonlocal ok, fehl
        if bed:
            ok += 1
        else:
            fehl += 1
            print("FEHL:", name)

    ECHT = SH.SHOP_ECHT.encode()
    GEHEIM = b"geheim-marker-4711.example"
    with tempfile.TemporaryDirectory() as d:
        # ── Quelltext: ein Baum mit je einem Fall; roh MUSS > 0 sein (Kanarienvogel gegen eine stille 0) ──
        repo = os.path.join(d, "repo")
        os.makedirs(os.path.join(repo, "automation", "lib"))
        os.makedirs(os.path.join(repo, "node_modules"))

        def schreibe(rel, text):
            with open(os.path.join(repo, rel), "w", encoding="utf-8") as f:
                f.write(text)

        EP = "`https://${SHOP}/admin/oauth/access_token`"
        schreibe("automation/a_roh.mjs", f"const SHOP = process.env.SHOPIFY_SHOP || '';\nawait fetch({EP});\n")
        schreibe("automation/b_suffix.mjs", f"let SHOP = process.env.SHOPIFY_SHOP || '';\nif (!/myshopify\\.com$/.test(SHOP)) SHOP = 'x.myshopify.com';\nawait fetch({EP});\n")
        schreibe("automation/c_helfer.mjs", f"import {{ assertShopifyHost }} from './lib/shopify_host.mjs';\nconst SHOP = assertShopifyHost(process.env.SHOPIFY_SHOP);\nawait fetch({EP});\n")
        schreibe("automation/d_fest.py", "import urllib.request\nurllib.request.urlopen('https://au3j0y-hq.myshopify.com/admin/oauth/access_token')\n")
        schreibe("automation/e_kommentar.mjs", "// POST https://x/admin/oauth/access_token (nur im Kommentar)\n# auch hier admin/oauth/access_token\nconsole.log(1);\n")
        schreibe("automation/f_probe_test.mjs", f"const SHOP = process.env.SHOPIFY_SHOP;\nfetch({EP});\n")
        schreibe("automation/g_env.py", "import os, subprocess\nSHOP = os.environ.get('SHOPIFY_SHOP', '')\nsubprocess.run(['curl', f'https://{SHOP}/admin/oauth/access_token'])\n")
        schreibe("automation/h_default.sh", 'SHOP="${SHOPIFY_SHOP:-au3j0y-hq.myshopify.com}"\ncurl "https://$SHOP/admin/oauth/access_token"\n')
        schreibe("automation/i_streng.mjs", f"export const HOST_RE = /^[a-z0-9][a-z0-9-]*\\.myshopify\\.com$/;\nconst SHOP = process.env.SHOPIFY_SHOP;\nfetch({EP});\n")
        schreibe("automation/lib/shopify_host.py", "# Hilfsmodul nennt den Endpunkt: admin/oauth/access_token\nx = 'admin/oauth/access_token'\n")
        schreibe("automation/j_text.txt", f"const SHOP = process.env.SHOPIFY_SHOP; {EP}\n")
        schreibe("node_modules/k_roh.mjs", f"const SHOP = process.env.SHOPIFY_SHOP;\nfetch({EP});\n")
        # .git und __pycache__ dürfen nie mitzählen (zweite Prüfung: ohne diese Dateien blieb die Ausschlussliste ungeprüft, ein Entfernen von ".git" blieb grün)
        os.makedirs(os.path.join(repo, ".git", "hooks"))
        os.makedirs(os.path.join(repo, "automation", "__pycache__"))
        schreibe(".git/hooks/m_roh.mjs", f"const SHOP = process.env.SHOPIFY_SHOP;\nfetch({EP});\n")
        schreibe("automation/__pycache__/n_roh.py", "import os\nSHOP = os.environ.get('SHOPIFY_SHOP', '')\nx = f'https://{SHOP}/admin/oauth/access_token'\n")
        dateien, qf = zaehle_quelltext(repo)
        namen = {k: sorted(os.path.basename(p) for p in v) for k, v in dateien.items()}
        pruef("A roh = a_roh + g_env + h_default (Kanarienvogel > 0, Python-environ.get und Shell-Default erkannt)", namen["roh"] == ["a_roh.mjs", "g_env.py", "h_default.sh"])
        pruef("B suffix / geprüft / fest", namen["suffix"] == ["b_suffix.mjs"] and namen["geprueft"] == ["c_helfer.mjs", "i_streng.mjs"] and namen["fest"] == ["d_fest.py"])
        pruef("C Kommentar, Testdatei, Hilfsmodul, .txt, node_modules, .git, __pycache__ zählen nicht", sum(len(v) for v in dateien.values()) == 7 and qf is None)
        pruef("D klassifiziere ohne Endpunkt → None", klassifiziere("const SHOP = process.env.SHOPIFY_SHOP;") is None)

        # ── Umgebung: Fake-/proc ──
        proc = os.path.join(d, "proc")
        os.makedirs(proc)
        with open(os.path.join(proc, "uptime"), "w") as f:
            f.write("5000.0 1.0\n")
        hz = os.sysconf("SC_CLK_TCK")

        def mache(pid, ppid, argv, shop, start_s=100, wurzel=None):
            p = os.path.join(wurzel or proc, str(pid))
            os.makedirs(p)
            felder = ["S", str(ppid)] + ["0"] * 17 + [str(int(start_s * hz))]
            with open(os.path.join(p, "stat"), "w") as f:
                f.write(f"{pid} ({os.path.basename(argv[0])}) " + " ".join(felder) + "\n")
            with open(os.path.join(p, "cmdline"), "wb") as f:
                f.write(b"\0".join(a.encode() for a in argv) + b"\0")
            with open(os.path.join(p, "environ"), "wb") as f:
                f.write(b"PATH=/bin\0" + (b"SHOPIFY_SHOP=" + shop + b"\0" if shop is not None else b""))

        mache(2, 1, ["/opt/claude-code/bin/claude", "--x"], ECHT)
        mache(10, 1, ["python3", "automation/ok.py"], ECHT)
        mache(11, 1, ["/opt/node22/bin/node", "automation/ok.mjs"], ECHT)
        mache(12, 1, ["python3", "automation/ohne.py"], None)
        eigene = {"SHOPIFY_SHOP": "x"}
        u = umgebung(proc, eigene_pid=10, eigene_env=eigene)
        pruef("E gesunde Umgebung: nichts schlecht, nichts unklar", u["schlecht"] == 0 and u["unklar"] is None and u["mit"] == 3 and u["prozesse"] == 4)
        sd = os.path.join(d, "secrets_ok.sh")
        with open(sd, "w") as f:
            f.write(f"export SHOPIFY_CLIENT_ID=x\nexport SHOPIFY_SHOP={SH.SHOP_ECHT}\n")
        tr = os.path.join(d, "trend.tsv")
        z = lauf(repo, proc, sd, tr, "2026-10-19", True, 10, eigene)
        pruef("F ok-Zeile: Kopf, Zählung, Trend (erste Messung)", len(z) == 1 and z[0].startswith("SHOPIFY-HOST: ok (Umgebung geprüft: 3 von 4 Prozessen")
              and "3 von 6 Dateien" in z[0] and "1 nur Suffix-Prüfung" in z[0] and "Trend: erste Messung" in z[0], )
        z = lauf(repo, proc, sd, tr, "2026-10-20", True, 10, eigene)
        pruef("G Trend am nächsten Tag: ±0 seit Vortag", "Trend ±0 seit 2026-10-19" in z[0])
        schreibe("automation/l_roh2.mjs", f"const SHOP = process.env.SHOPIFY_SHOP;\nfetch({EP});\n")
        z = lauf(repo, proc, sd, tr, "2026-10-21", True, 10, eigene)
        pruef("H Trend steigt: +1", "Trend +1 seit 2026-10-20" in z[0])
        z = lauf(repo, proc, sd, tr, "2026-10-21", True, 10, eigene)
        pruef("H2 zweimal am selben Tag: gleicher Vergleichstag, eine Zeile", "Trend +1 seit 2026-10-20" in z[0] and open(tr).read().count("2026-10-21") == 1)
        os.remove(os.path.join(repo, "automation", "l_roh2.mjs"))

        # ── Kanarienvogel: Fantasie-Host in der Sitzung und in einem Motor MUSS gemeldet werden, Wert nie ──
        mache(3, 1, ["/opt/claude-code/bin/claude", "--y"], GEHEIM)
        mache(20, 1, ["bash", "/tmp/cj_queue_runner.sh"], ECHT)
        mache(21, 20, ["/opt/node22/bin/node", "automation/cj_category_fill.mjs"], b"https://AU3J0Y-HQ.myshopify.com/")     # nur anders geschrieben
        mache(22, 1, ["python3", "automation/anderer_shop.py"], b"other-store.myshopify.com")
        u = umgebung(proc, eigene_pid=10, eigene_env=eigene)
        pruef("I Sitzung (falsch), Motor-Kind (bereinigt), anderer Shop (fremd) erkannt", u["sitzung"] == [3] and 20 in u["motoren"] and u["motoren"][20][2] == [21]
              and u["fremd"] == [22] and u["schlecht"] == 3)
        z = lauf(repo, proc, sd, tr, "2026-10-22", False, 10, eigene)
        text = "\n".join(z)
        pruef("J Zeile mit ⚠️, Sitzung/Motor/weitere genannt, Länge statt Wert", z[0].startswith("⚠️ SHOPIFY-HOST:") and "Sitzung" in z[0] and "cj_queue_runner" in z[0]
              and "Länge" in z[0] and len(z) == 2)
        pruef("K kein Wert in der Ausgabe", "marker" not in text and "4711" not in text and "geheim" not in text and "other-store" not in text and "AU3J0Y" not in text)
        # ── Datei ──
        for name, inhalt, soll in (("ok", f"export SHOPIFY_SHOP={SH.SHOP_ECHT}\n", "ok"), ("falsch", "export SHOPIFY_SHOP=evil.example.com\n", "falsch"),
                                   ("anf", "export SHOPIFY_SHOP='AU3J0Y-HQ.myshopify.com'\n", "bereinigt"), ("keine", "export OPENAI=1\n", "keine_zeile"),
                                   ("leer", "SHOPIFY_SHOP=\n", "leer"), ("wörter", "SHOPIFY_SHOP=a b\n", "unklar")):
            pf = os.path.join(d, f"s_{name}.sh")
            with open(pf, "w") as f:
                f.write(inhalt)
            pruef(f"L Datei {name} → {soll}", datei_urteil(pf)[0] == soll)
        pruef("L2 fehlende Datei → fehlt", datei_urteil(os.path.join(d, "gibt_es_nicht"))[0] == "fehlt")
        pf = os.path.join(d, "s_falsch.sh")
        proc_leer = os.path.join(d, "proc_leer")
        os.makedirs(proc_leer)
        z = lauf(repo, proc_leer, sd, tr, "2026-10-22", False, 10, eigene)
        z2 = lauf(repo, os.path.join(d, "proc_gibt_es_nicht"), sd, tr, "2026-10-22", False, 10, eigene)
        pruef("M leerer / fehlender /proc-Baum → unklar, nicht ok", z[0].startswith("SHOPIFY-HOST: unklar") and "nur 0 Prozess" in z[0]
              and z2[0].startswith("SHOPIFY-HOST: unklar") and "nicht lesbar" in z2[0])
        proc_g = os.path.join(d, "proc_g")
        os.makedirs(proc_g)
        for pid_, shop in ((2, ECHT), (3, ECHT), (4, ECHT)):
            os.makedirs(os.path.join(proc_g, str(pid_)))
            for n_, inh in (("stat", f"{pid_} (python3) S 1 " + " ".join(["0"] * 17) + " 1\n"), ("cmdline", "python3\0x.py\0"), ("environ", "SHOPIFY_SHOP=" + shop.decode() + "\0")):
                with open(os.path.join(proc_g, str(pid_), n_), "w") as f:
                    f.write(inh)
        z = lauf(repo, proc_g, pf, tr, "2026-10-22", False, 99, eigene)
        pruef("N Datei mit falschem Host → ⚠️ obwohl alle Prozesse gesund", z[0].startswith("⚠️ SHOPIFY-HOST:") and "secrets_env.sh" in z[0])
        z = lauf(repo, proc_g, sd, tr, "2026-10-22", False, 99, eigene)
        pruef("O Kanarienvogel Leser: eigene Umgebung hat SHOPIFY_SHOP, /proc-Eintrag fehlt → unklar", z[0].startswith("SHOPIFY-HOST: unklar") and "eigene Umgebung" in z[0])
        leer_repo = os.path.join(d, "leer_repo")
        os.makedirs(leer_repo)
        z = lauf(leer_repo, proc_g, sd, tr, "2026-10-22", False, 2, eigene)
        pruef("P Quelltext ohne Sender → unklar, nicht «0 ungeprüft»", z[0].startswith("SHOPIFY-HOST: unklar") and "kein Sender" in z[0])
        z = lauf(repo, proc_g, sd, tr, "2026-10-22", False, 2, eigene)
        pruef("P2 gesunder Lauf mit gesundem /proc und Datei → ok (Gegenprobe zu P, N, O)", z[0].startswith("SHOPIFY-HOST: ok (") and len(z) == 1)
        z = lauf(repo, proc, sd, tr, "2026-10-22", False, 10, eigene, liste=True)
        pruef("Q --liste: Dateien je Klasse", any(x.startswith("  roh\tautomation/a_roh.mjs") for x in z))
        # ── leer (zweite Prüfung, Befund 2/10): ein leerer SHOPIFY_SHOP ist nicht «brauchbar» ──
        proc_l = os.path.join(d, "proc_l")
        os.makedirs(proc_l)
        with open(os.path.join(proc_l, "uptime"), "w") as f:
            f.write("5000.0 1.0\n")
        mache(2, 1, ["/opt/claude-code/bin/claude", "--x"], b"", wurzel=proc_l)
        mache(10, 1, ["python3", "automation/a.py"], b"", wurzel=proc_l)
        mache(11, 1, ["/opt/node22/bin/node", "automation/b.mjs"], b"", wurzel=proc_l)
        u = umgebung(proc_l, eigene_pid=10, eigene_env={"SHOPIFY_SHOP": ""})
        pruef("S1 drei leere Prozesse: nicht «mit», drei gezählt als leer, Sitzung + 2 Verbraucher schlecht, nicht unklar", u["mit"] == 0 and u["leer"] == 3 and u["schlecht"] == 3 and u["sitzung"] == [2] and u["unklar"] is None)
        z = lauf(repo, proc_l, sd, tr, "2026-10-22", False, 10, {"SHOPIFY_SHOP": ""})
        pruef("S2 Zeile ⚠️ statt «alle brauchbar» (so lautete die Zeile vor der Korrektur: «ok … alle brauchbar»)", z[0].startswith("⚠️ SHOPIFY-HOST:") and "alle Verbraucher davon brauchbar" not in z[0] and "leer: Länge 0" in z[0])
        proc_s = os.path.join(d, "proc_s")
        os.makedirs(proc_s)
        with open(os.path.join(proc_s, "uptime"), "w") as f:
            f.write("5000.0 1.0\n")
        mache(2, 1, ["/opt/claude-code/bin/claude", "--x"], ECHT, wurzel=proc_s)
        mache(10, 1, ["python3", "automation/a.py"], ECHT, wurzel=proc_s)
        mache(11, 1, ["/opt/node22/bin/node", "automation/b.mjs"], ECHT, wurzel=proc_s)
        mache(12, 1, ["bash", "/tmp/cj_queue_runner.sh"], b"", wurzel=proc_s)                 # Shell-Hülle mit leerem Wert: kein Verbraucher
        z = lauf(repo, proc_s, sd, tr, "2026-10-22", False, 10, eigene)
        pruef("S3 leere Shell-Hülle: ok-Zeile nennt sie ehrlich (3 tragen, 1 weitere leer), kein ⚠️", z[0].startswith("SHOPIFY-HOST: ok (") and "3 von 4 Prozessen" in z[0] and "1 weitere mit leerem Wert (keine Verbraucher)" in z[0])
        pl = os.path.join(d, "s_leer.sh")
        with open(pl, "w") as f:
            f.write("SHOPIFY_SHOP=\n")
        z = lauf(repo, proc_s, pl, tr, "2026-10-22", False, 10, eigene)
        pruef("S4 Datei mit leerem SHOPIFY_SHOP: ⚠️ (die Runner würden den gültigen Wert mit «» überschreiben)", z[0].startswith("⚠️ SHOPIFY-HOST:") and "secrets_env.sh" in z[0] and "(leer)" in z[0])
        # ── Datei: ANSI-C-Form $'…' (so schreibt `printf %q` Werte mit Zeilenende/Tab/CR; zweite Prüfung, Befund 5) ──
        pf_q = os.path.join(d, "q.sh")
        with open(pf_q, "w") as f:
            f.write("export SHOPIFY_SHOP=$'au3j0y-hq.myshopify.com\\n'\n")
        pruef("T1 $'…\\n' wird als bereinigt gelesen (nicht «falsch, Länge 26»)", datei_urteil(pf_q) == ("bereinigt", "Länge 24, Leerraum"))
        with open(pf_q, "w") as f:
            f.write("export SHOPIFY_SHOP=$'\\303\\251x'\n")
        pruef("T2 Oktal-Escape (UTF-8) wird entschlüsselt: falsch, Länge 2", datei_urteil(pf_q)[0] == "falsch" and datei_urteil(pf_q)[1].startswith("Länge 2,"))
        with open(pf_q, "w") as f:
            f.write("export SHOPIFY_SHOP=$'\\u00e9'\n")
        pruef("T3 nicht unterstützte Escape-Folge (\\u): unklar statt geraten", datei_urteil(pf_q)[0] == "unklar")
        rund, abweichend = 0, []
        werte = [(roh, art) for roh, art, _ in SH.faelle()] + [("\u00a0" + SH.SHOP_ECHT, "falsch"), ("\ufeff" + SH.SHOP_ECHT, "falsch"), (SH.SHOP_ECHT + "\x01", "falsch")]
        for loc in ("C", "C.UTF-8"):
            for roh, art in werte:
                q = subprocess.run(["bash", "--noprofile", "--norc", "-c", 'printf "export SHOPIFY_SHOP=%q\\n" "$1"', "_", roh],
                                   env={"PATH": "/usr/bin:/bin", "LC_ALL": loc}, capture_output=True, text=True, timeout=30)
                with open(pf_q, "w", encoding="utf-8") as f:
                    f.write(q.stdout)
                rund += 1
                if q.returncode != 0 or datei_urteil(pf_q)[0] != art:
                    abweichend.append((loc, len(roh), art, datei_urteil(pf_q)[0]))
        pruef(f"T4 Rundlauf: {len(werte)} Werte (Fallliste + NBSP/BOM/Steuerzeichen) durch das echte printf %q in C und UTF-8 → datei_urteil = Urteil des Werts ({rund} Läufe)", rund == 2 * len(werte) and not abweichend)
        if abweichend:
            print("  Abweichungen:", abweichend[:5])
        # ── Schalter ──
        with contextlib.redirect_stderr(io.StringIO()) as err, contextlib.redirect_stdout(io.StringIO()) as aus:
            codes = [main(["--hilfe"]), main(["--liste", "--selbsttest"]), main(["x"])]
        pruef("R unbekannter Schalter: Exit 2, kein Lauf, keine Zeile", codes == [2, 2, 2] and "SHOPIFY-HOST" not in aus.getvalue() and err.getvalue().count("unbekannter Schalter") == 3)
    print(f"Selbsttest: {ok}/{ok + fehl}")
    return 0 if fehl == 0 else 1


def main(argv=None):
    a = sys.argv[1:] if argv is None else argv
    if a == ["--selbsttest"]:
        return selbsttest()
    if a not in ([], ["--liste"]):
        print(f"unbekannter Schalter {a!r} — Abbruch (kein Lauf). Erlaubt: (ohne) · --liste · --selbsttest", file=sys.stderr)
        return 2
    print("\n".join(lauf(liste=a == ["--liste"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
