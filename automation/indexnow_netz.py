#!/usr/bin/env python3
"""indexnow_netz.py — Auswahl-Regel, Stand und Ampelzeile für die IndexNow-Meldung (21.10.2026).

ANLASS (Spähtrupp wf_32ed9d12, Bing/IndexNow, Skeptiker-Urteil): `indexnow_melden.py` sortierte die fälligen Adressen
`sorted({(prio, url)})` — also nach Prio und dann ALPHABETISCH. Das reicht, solange weniger als MAX (10'000) fällig sind (heute 172).
Ab dem 02.11. laufen die 30 Tage der 53'000 Adressen von 02.–07.10. ab: dann sind ~50'000 fällig, MAX schneidet nach dem
Alphabet, und eine gestern angelegte Neuware «z…» käme nie an die Reihe. Dieses Modul trägt die reine Auswahl (keine
Netzabfrage, keine Schlüsseldatei) und ist deshalb selbst prüfbar:

  1. nie gemeldet (oder zuletzt als «entfernt» gemeldet) vor allem anderen — bei Neuen jüngstes createdAt zuerst
  2. dann Prio (Kollektionen/Artikel/Seiten 0, Vorrang-Produkte 1, Rest 2)
  3. dann ältestes Ledger-Datum zuerst
  Wiederholfrist: Kollektionen/Artikel/Seiten 30 T, Produkte 90 T (IndexNow will Neues/Geändertes, kein Dauerrauschen).
  Entfernt: Adressen aus dem Ledger, die es nicht mehr gibt (Entwurf/Archiv/nicht im Onlineshop), werden EINMAL gemeldet
  (Ledger-Datum «entfernt-JJJJ-MM-TT») — Bing nimmt tote Adressen so schneller aus dem Index. Kommt die Seite wieder,
  gilt sie als neu. Schutz: nur wenn die Abfrage vollständig aussieht (≥ 1'000 Adressen, höchstens 15 % des Ledgers fehlen).

  python3 automation/indexnow_netz.py --selbsttest | --zeile
"""
import datetime as dt, json, os, sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
STAND = os.path.join(REPO, "dropship", "_indexnow_stand.json")
ENTFERNT = "entfernt-"
WIEDER_SEITE = 30
WIEDER_PRODUKT = 90
ENTFERNT_MAX = 3000
STALE_H = 36


def ledger_datum(led, url):
    """(datum, nie). «entfernt-…» zählt wie nie gemeldet: kommt die Adresse zurück, muss sie neu angemeldet werden."""
    d = led.get(url)
    if d is None or d.startswith(ENTFERNT):
        return "0000", True
    return d, False


def auswahl(kand, led, heute, max_n, wieder_seite=WIEDER_SEITE, wieder_produkt=WIEDER_PRODUKT):
    """kand = [(prio, url, art, created)], art 'p' = Produkt / 's' = sonst, created = ISO-Text oder ''.
    Gibt (urls, faellig_gesamt, nie_gesamt) zurück — urls höchstens max_n, in Meldereihenfolge."""
    heute = heute if isinstance(heute, dt.date) else dt.date.fromisoformat(str(heute))
    g_seite = str(heute - dt.timedelta(days=wieder_seite))
    g_prod = str(heute - dt.timedelta(days=wieder_produkt))
    faellig = {}
    for prio, url, art, created in kand:
        datum, nie = ledger_datum(led, url)
        if datum < (g_prod if art == "p" else g_seite):
            faellig[url] = (0 if nie else 1, prio, datum, created or "", url)
    reihe = sorted(faellig.values(), key=lambda x: x[4])
    reihe.sort(key=lambda x: x[3], reverse=True)         # jüngstes createdAt zuerst (stabil: bleibt innerhalb gleicher Schlüssel)
    reihe.sort(key=lambda x: (x[0], x[1], x[2]))        # nie vor Wiederholung, dann Prio, dann ältestes Ledger-Datum
    nie_n = sum(1 for x in reihe if x[0] == 0)
    return [x[4] for x in reihe[:max_n]], len(reihe), nie_n


def entfernte(kand_urls, led, max_n=ENTFERNT_MAX):
    """Ledger-Adressen, die nicht mehr öffentlich sind und noch nicht als entfernt gemeldet wurden. [] bei unvollständiger Abfrage."""
    lebend = set(kand_urls)
    im_ledger = [u for u, d in led.items() if not d.startswith(ENTFERNT)]
    if len(lebend) < 1000 or not im_ledger:
        return []
    fehlt = [u for u in im_ledger if u not in lebend]
    if len(fehlt) > 0.15 * len(im_ledger):
        return []                                        # sieht nach halber Abfrage aus, nicht nach Aufräumen
    return sorted(fehlt)[:max_n]


def stand_schreiben(**felder):
    d = {}
    try:
        d = json.load(open(STAND, encoding="utf-8"))
    except Exception:
        pass
    d.update(felder)
    tmp = STAND + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(tmp, STAND)


def zeile(jetzt=None):
    """Ampelzeile. Leer = in Ordnung. ⚠️ wenn der letzte erfolgreiche Lauf > 36 h her ist oder IndexNow die letzte Meldung abgelehnt hat."""
    if not os.path.exists(STAND):
        return ""
    try:
        s = json.load(open(STAND, encoding="utf-8"))
    except Exception:
        return "⚠️ INDEXNOW: Stand-Datei unlesbar (dropship/_indexnow_stand.json)"
    jetzt = jetzt or dt.datetime.utcnow()
    try:
        fertig = dt.datetime.strptime(s["fertig"], "%Y-%m-%dT%H:%MZ")
    except Exception:
        return "⚠️ INDEXNOW: kein gültiger Stempel «fertig» im Stand"
    alter = (jetzt - fertig).total_seconds() / 3600
    if s.get("http") not in (200, 202, None):
        return f"⚠️ INDEXNOW: letzte Meldung von IndexNow abgelehnt (HTTP {s.get('http')}) — Schlüsseldatei prüfen"
    if alter > STALE_H:
        return f"⚠️ INDEXNOW: letzter erfolgreicher Lauf vor {alter:.0f} h (Takt 6 h) — Log /tmp/indexnow_melden.log"
    return ""


def selbsttest():
    """Prüft Auswahl, Entfernt-Regel und Ampelzeile. Jede Prüfung fällt, wenn man die zugehörige Regel kaputtmacht
    (Mutanten: Sortierung alphabetisch, Frist 30 statt 90 für Produkte, «entfernt» als gemeldet behandelt, keine Teilabfrage-Sperre)."""
    fehler = []
    heute = dt.date(2026, 11, 3)

    def ok(bed, text):
        if not bed:
            fehler.append(text)

    # 1. 12'000 alte Produkte (Ledger 02.10., 32 T her) + 400 neue → 12'000 sind bei 90 T NICHT fällig, 400 neue ja
    led = {f"https://x/products/a{i:05d}": "2026-10-02" for i in range(12000)}
    kand = [(2, u, "p", "2026-09-01T00:00:00Z") for u in led]
    kand += [(2, f"https://x/products/z{i:03d}", "p", f"2026-11-0{1 + i % 3}T{i % 24:02d}:00:00Z") for i in range(400)]
    urls, faellig, nie = auswahl(kand, led, heute, 10000)
    ok(faellig == 400 and nie == 400, f"90-T-Frist: fällig {faellig} nie {nie} (erwartet 400/400)")
    ok(set(urls) == {u for _, u, _, _ in kand[12000:]}, "nur die neuen 400 gemeldet")
    # 2. Frist erreicht: 12'000 alte + 400 neue, MAX 10'000 → alle 400 Neuen zuerst, auch wenn alphabetisch hinten
    led2 = {u: "2026-07-01" for u in led}
    urls, faellig, nie = auswahl(kand, led2, heute, 10000)
    ok(faellig == 12400 and nie == 400, f"Rückstand: fällig {faellig} nie {nie}")
    ok(len(urls) == 10000, "MAX eingehalten")
    ok(all(u in set(urls[:400]) for _, u, _, _ in kand[12000:]), "alle 400 Neuen stehen vorn (nicht nach Alphabet abgeschnitten)")
    ok(urls[0].startswith("https://x/products/z"), "jüngste Neuware zuerst")
    neu = [u for u in urls[:400]]
    erst = {u: c for _, u, _, c in kand}
    ok(all(erst[neu[i]] >= erst[neu[i + 1]] for i in range(399)), "Neue nach createdAt absteigend")
    # 3. Wiederholung: ältestes Ledger-Datum zuerst
    led3 = {"https://x/products/b": "2026-06-01", "https://x/products/a": "2026-07-15", "https://x/products/c": "2026-05-01"}
    k3 = [(2, u, "p", "") for u in led3]
    urls, _, _ = auswahl(k3, led3, heute, 10)
    ok(urls == ["https://x/products/c", "https://x/products/b", "https://x/products/a"], f"älteste zuerst: {urls}")
    # 4. Prio: Kollektion (0) vor Produkt (2) bei gleichem Zustand
    k4 = [(2, "https://x/products/p", "p", ""), (0, "https://x/collections/c", "s", "")]
    urls, _, _ = auswahl(k4, {}, heute, 10)
    ok(urls[0].endswith("/collections/c"), "Kollektion vor Produkt")
    # 5. Seiten: 30 T, Produkte: 90 T
    led5 = {"https://x/collections/c": "2026-10-02", "https://x/products/p": "2026-10-02"}
    k5 = [(0, "https://x/collections/c", "s", ""), (2, "https://x/products/p", "p", "")]
    urls, _, _ = auswahl(k5, led5, heute, 10)
    ok(urls == ["https://x/collections/c"], f"Kollektion nach 32 T fällig, Produkt nicht: {urls}")
    # 6. entfernt-Marke: zählt als nie gemeldet, sobald die Seite zurück ist
    led6 = {"https://x/products/p": ENTFERNT + "2026-10-30"}
    urls, f, n = auswahl([(2, "https://x/products/p", "p", "2026-10-01T00:00:00Z")], led6, heute, 10)
    ok(urls == ["https://x/products/p"] and n == 1, "entfernt-Marke wird bei Rückkehr wieder als neu gemeldet")
    # 7. entfernte(): meldet fehlende, einmalig
    lebend = [f"https://x/products/p{i}" for i in range(1500)]
    led7 = {u: "2026-10-01" for u in lebend}
    led7["https://x/products/tot1"] = "2026-10-01"
    led7["https://x/products/tot2"] = ENTFERNT + "2026-10-10"
    ok(entfernte(lebend, led7) == ["https://x/products/tot1"], f"entfernt: {entfernte(lebend, led7)}")
    # 8. Schutz bei Teilabfrage
    ok(entfernte(lebend[:900], {u: "2026-10-01" for u in lebend}) == [], "unter 1'000 Adressen → nichts als entfernt melden")
    ok(entfernte(lebend[:1200], {u: "2026-10-01" for u in lebend}) == [], "mehr als 15 % fehlen → nichts als entfernt melden")
    # 9. Ampelzeile
    global STAND
    alt = STAND
    try:
        import tempfile
        STAND = os.path.join(tempfile.mkdtemp(), "stand.json")
        ok(zeile() == "", "ohne Stand-Datei: leer")
        stand_schreiben(fertig="2026-11-03T08:00Z", http=200)
        jetzt = dt.datetime(2026, 11, 3, 12, 0)
        ok(zeile(jetzt) == "", "frisch → leer")
        ok("INDEXNOW" in zeile(dt.datetime(2026, 11, 5, 12, 0)), "50 h alt → ⚠️")
        stand_schreiben(http=403)
        ok("abgelehnt" in zeile(jetzt), "HTTP 403 → ⚠️")
    finally:
        STAND = alt
    if fehler:
        print("SELBSTTEST FEHLER:\n  " + "\n  ".join(fehler))
        return 1
    print("SELBSTTEST OK (Auswahl, Fristen, Entfernt-Regel, Teilabfrage-Schutz, Ampelzeile)")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    print(zeile() or "OK")
