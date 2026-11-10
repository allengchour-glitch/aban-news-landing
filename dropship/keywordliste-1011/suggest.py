#!/usr/bin/env python3
"""Keyword-Ideen aus Googles Autovervollständigung (Schweiz, Deutsch). Kostenlos, ohne Schlüssel, ohne Suchvolumen.

Aufruf (Ernte in eine Datei im Scratch, nicht ins Repo):
  python3 suggest.py SEEDS.json AUSGABE.json [PAUSE_SEKUNDEN]
SEEDS.json: Liste von Suchbegriffen. AUSGABE.json: {seed: {variante: [vorschlaege]}}; ein erneuter Lauf setzt fort.
Bei HTTP 429 oder 403 bricht der Lauf ab (kein Hämmern auf den Dienst).
"""
import json
import os
import subprocess
import sys
import time
import urllib.parse

URL = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=de&gl=ch&q='
VARIANTEN = ['', ' für', ' mit', ' schweiz', ' kaufen', ' test']


class Gesperrt(Exception):
    pass


def holen(q, timeout=20):
    """Ruft die Vorschläge zu q ab. Rückgabe: Liste von Texten. Wirft Gesperrt bei 429/403."""
    r = subprocess.run(['curl', '-sS', '-m', str(timeout), '-A', 'Mozilla/5.0', '-w', '\n%{http_code}', URL + urllib.parse.quote(q)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError('curl %s: %s' % (r.returncode, r.stderr.strip()[:120]))
    body, _, code = r.stdout.rpartition('\n')
    return antwort_lesen(body, code)


def antwort_lesen(body, code):
    """Wertet Antworttext und HTTP-Code aus. 429/403 = gesperrt, anderer Code oder kein JSON = Fehler (später erneut versuchbar)."""
    if code in ('429', '403'):
        raise Gesperrt(code)
    if code != '200':
        raise RuntimeError('HTTP ' + code)
    try:
        d = json.loads(body)
    except ValueError:
        raise RuntimeError('keine JSON-Antwort')
    return [str(x) for x in d[1]] if isinstance(d, list) and len(d) > 1 and isinstance(d[1], list) else []


def ernten(seeds, ausgabe, pause=0.4, holer=holen, varianten=VARIANTEN, schlafen=time.sleep):
    """Setzt einen früheren Lauf fort (liest ausgabe, falls vorhanden). Schreibt nach jedem Seed."""
    erg = {}
    if os.path.exists(ausgabe):
        erg = json.load(open(ausgabe, encoding='utf-8'))
    for s in seeds:
        e = erg.setdefault(s, {})
        for v in varianten:
            if e.get(v) is not None:
                continue                # fertig (auch eine leere Liste ist ein Ergebnis); None = Fehler, erneut versuchen
            try:
                e[v] = holer(s + v)
            except Gesperrt:
                json.dump(erg, open(ausgabe, 'w', encoding='utf-8'), ensure_ascii=False)
                raise
            except RuntimeError:
                e[v] = None            # Fehler: später erneut versuchbar (None wird nicht als fertig gezählt)
            schlafen(pause)
        erg[s] = {k: v for k, v in e.items()}
        json.dump(erg, open(ausgabe, 'w', encoding='utf-8'), ensure_ascii=False)
    return erg


def selbsttest():
    import tempfile
    fehler = []

    def ok(bed, text):
        if not bed:
            fehler.append(text)

    ok(antwort_lesen('["a",["b","c"],[],{}]', '200') == ['b', 'c'], 'Antwort mit Vorschlägen')
    ok(antwort_lesen('["a",[]]', '200') == [], 'leere Liste ist ein Ergebnis')
    ok(antwort_lesen('{"x":1}', '200') == [], 'unerwartete Form ergibt leere Liste')
    for code in ('429', '403'):
        try:
            antwort_lesen('', code)
            ok(False, 'Sperre %s muss Gesperrt werfen' % code)
        except Gesperrt:
            pass
    for body, code in (('x', '200'), ('[]', '500')):
        try:
            antwort_lesen(body, code)
            ok(False, 'Fehler muss RuntimeError werfen: %s %s' % (body, code))
        except RuntimeError:
            pass

    with tempfile.TemporaryDirectory() as t:
        aus = os.path.join(t, 'a.json')
        aufrufe = []

        def holer(q):
            aufrufe.append(q)
            if q == 'b fehler':
                raise RuntimeError('x')
            return [q + ' 1', q + ' 2']

        pausen = []
        e = ernten(['a', 'b'], aus, 0.5, holer, varianten=['', ' fehler'], schlafen=pausen.append)
        ok(aufrufe == ['a', 'a fehler', 'b', 'b fehler'], 'Aufrufe: %r' % aufrufe)
        ok(e['a'][''] == ['a 1', 'a 2'] and e['b'][' fehler'] is None, 'Fehler bleibt None')
        ok(pausen == [0.5] * 4, 'Pause nach jedem Abruf')
        # Fortsetzen: nur der Fehler wird wiederholt
        aufrufe.clear()
        e = ernten(['a', 'b'], aus, 0, lambda q: aufrufe.append(q) or ['neu'], varianten=['', ' fehler'], schlafen=lambda s: None)
        ok(aufrufe == ['b fehler'], 'Fortsetzen holt nur Fehlendes: %r' % aufrufe)
        ok(e['b'][' fehler'] == ['neu'] and e['a'][''] == ['a 1', 'a 2'], 'Fortsetzen behält Fertiges')
        # Sperre: Teilergebnis bleibt gespeichert, Ausnahme geht weiter
        aus2 = os.path.join(t, 'b.json')

        def sperr(q):
            if q == 'y':
                raise Gesperrt('429')
            return ['ok']
        try:
            ernten(['x', 'y', 'z'], aus2, 0, sperr, varianten=[''], schlafen=lambda s: None)
            ok(False, 'Sperre muss weitergereicht werden')
        except Gesperrt:
            pass
        teil = json.load(open(aus2, encoding='utf-8'))
        ok(teil == {'x': {'': ['ok']}, 'y': {}}, 'Teilergebnis bei Sperre gespeichert: %r' % teil)
    for f in fehler:
        print('FEHLER:', f)
    print('Selbsttest suggest: %s' % ('ALLE OK' if not fehler else '%d Fehler' % len(fehler)))
    return 0 if not fehler else 1


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--selbsttest':
        sys.exit(selbsttest())
    seeds = json.load(open(sys.argv[1], encoding='utf-8'))
    out = sys.argv[2]
    pause = float(sys.argv[3]) if len(sys.argv) > 3 else 0.4
    try:
        erg = ernten(seeds, out, pause)
    except Gesperrt as g:
        print('GESPERRT (HTTP %s), Teilergebnis gespeichert in %s' % (g, out))
        sys.exit(3)
    n = sum(len(v) for e in erg.values() for v in e.values() if v)
    print('fertig: %d Seeds, %d Vorschläge (mit Dubletten)' % (len(erg), n))
