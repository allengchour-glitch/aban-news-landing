#!/usr/bin/env python3
"""Meldet CJ-Auftraege, die bezahlbereit im Warenkorb liegen. BEZAHLT NICHTS.

Warum es diesen Waechter gibt (Betreiber 07.09.2026): **CJ nimmt Guthaben erst ab USD 2000
an.** Damit ist `shopping/pay/payBalance` fuer diesen Shop strukturell tot — das Guthaben
steht dauerhaft auf 0, und jede Kundenbestellung muss der Betreiber in der CJ-Konsole
einzeln bezahlen. Ein Automat, der trotzdem zu zahlen versucht, erzeugt nur Fehlerzeilen
und verdeckt die eigentliche Botschaft: «hier wartet Geld auf einen Klick».

Er braucht NUR den CJ-Token. Das Shopify-Admin-Token ist seit dem 05.09. tot (401), deshalb
haengt dieser Waechter bewusst an keiner Shopify-Abfrage — sonst waere er blind wie die
uebrigen Ampeln.

Ausgabe:
  * eine Zeile fuer den Aufseher/Keepalive
  * `dropship/CJ-ZAHLUNG-OFFEN.md` NUR wenn etwas offen ist; sonst wird der Bericht geloescht
    (ein Bericht ohne Befund wird nach dem zweiten Mal nicht mehr gelesen)

Sperrliste `dropship/_cj_nicht_bezahlen.txt` (orderId<TAB>Grund): Auftraege, die NIE bezahlt
werden duerfen — etwa Schatten zu rueckerstatteten Bestellungen. Sie werden getrennt
ausgewiesen, nicht verschwiegen.
"""
import json, os, re, sys, time, urllib.request, urllib.error
import os as _os_takt, sys as _sys_takt
_sys_takt.path.insert(0, _os_takt.path.dirname(_os_takt.path.abspath(__file__)))
from cj_takt import takt   # EIN Takt fuer alle CJ-Verbraucher (21.09.)


REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, "dropship", "CJ-ZAHLUNG-OFFEN.md")
SPERRE = os.path.join(REPO, "dropship", "_cj_nicht_bezahlen.txt")
MINDEST_EINZAHLUNG = 2000.0     # gemessen/Betreiber 07.09.2026
# Welche CJ-Status gelten als zahlbar. Konfigurierbar, damit der Waechter in BEIDE
# Richtungen pruefbar ist und eine CJ-Umbenennung nicht stillschweigend alles verschluckt.
# 12.10.2026 (#1025): CJ führt einen API-angelegten, unbezahlten Auftrag als «UNPAID» (LX1025, $73.29) — mit nur
# «IN_CART» meldete der Wächter «nichts offen» und löschte seinen Bericht, während das Geld wartete.
STATUS_ZAHLBAR = [x.strip() for x in os.environ.get("STATUS_ZAHLBAR", "IN_CART,UNPAID").split(",") if x.strip()]


def ist_zahlbar(o):
    """Zahlbar = Status in STATUS_ZAHLBAR, oder «CREATED» MIT eigener LX-Nummer UND Betrag > 0.
    «CREATED» mit «#…»-Nummer ohne Betrag = leere Hülle des CJ-Shopify-Connectors → nie (ZAHLUNG-LINKS-MERKEN.md)."""
    st, nr = o.get("orderStatus"), str(o.get("orderNum") or "").upper()
    if st in STATUS_ZAHLBAR:
        return True
    return st == "CREATED" and nr.startswith("LX") and float(o.get("orderAmount") or 0) > 0


# 13.10.2026 (Hetzner-Plan Schritt 3, Doppelbestellung): cj_order_engine läuft auf Server UND Cloud. Liegt dieselbe
# LX-Nummer zweimal bei CJ, würde der Zahllink-Dauerauftrag (11.10.) BEIDE zum Bezahlen vorlegen → echtes Geld doppelt.
# Darum: Warnung in der Ampel-Zeile, und für jeden weiteren Auftrag NIE ein Zahllink (nicht unter «Zu bezahlen»,
# keine Zahl-Erinnerung). Verworfene/stornierte Aufträge zählen nicht mit.
TOT = {"TRASH", "CANCELLED"}
UNBEZAHLT = {"CREATED", "IN_CART", "UNPAID"}


def lx_nr(o):
    """«LX1025» / «#LX1025» → «LX1025»; Connector-Hüllen «#1025» und Fremdnummern → ''."""
    n = str(o.get("orderNum") or "").strip().lstrip("#").upper()
    return n if n.startswith("LX") else ""


def stamm(o):
    """CJ TEILT einen Auftrag mit mehreren Artikeln schon VOR dem Bezahlen in Teile mit derselben LX-Nummer — gemessen
    13.10. an LX1013: cjOrderId SD2608141614440663500 (angelegt 16:14:47) und SD2608141614440663500-2 (16:25:31), beide
    bezahlt 16:26:48. Teile eines Auftrags tragen denselben Stamm (cjOrderId ohne «-<n>») und sind KEIN Doppel; ein
    zweites createOrderV2 bekommt eine eigene SD-Nummer. Ohne cjOrderId zählt jeder Eintrag als eigener Auftrag (vorsichtig)."""
    c = str(o.get("cjOrderId") or "").strip().upper()
    return re.sub(r"-\d+$", "", c) if c else "orderId " + str(o.get("orderId") or id(o))


def doppelte(alle):
    """→ (zaehl {LX: Anzahl verschiedener Aufträge (Stämme), nur ≥ 2}, nie {id(Eintrag): Grund}).
    Erlaubt bleibt EIN Auftrag je LX (mit allen seinen CJ-Teilen): ist einer schon bezahlt, ist jeder unbezahlte
    andere Auftrag ein Doppel; sonst darf nur der älteste (früheste createDate) bezahlt werden."""
    gruppen = {}
    for o in alle:
        nr = lx_nr(o)
        if nr and o.get("orderStatus") not in TOT:
            gruppen.setdefault(nr, {}).setdefault(stamm(o), []).append(o)
    zaehl, nie = {}, {}
    for nr, staemme in gruppen.items():
        if len(staemme) < 2:
            continue
        zaehl[nr] = len(staemme)
        bezahlt = [s for s, teile in staemme.items()
                   if any(o.get("orderStatus") not in UNBEZAHLT and not ist_zahlbar(o) for o in teile)]
        if bezahlt:
            erlaubt = set(bezahlt)
        else:
            erlaubt = {min(staemme, key=lambda s: (min(str(o.get("createDate") or "") for o in staemme[s]), s))}
        for s, teile in staemme.items():
            if s in erlaubt:
                continue
            for o in teile:
                nie[id(o)] = (f"{nr} ist schon bezahlt ({', '.join(sorted(erlaubt))})" if bezahlt else
                              f"zweiter Auftrag für {nr} ({s}) — bezahlt wird nur {next(iter(erlaubt))}")
    return zaehl, nie


def einteilen(alle, gesperrt):
    """CJ-Auftragsliste → (offen, blockiert, doppelt, zaehl). Nur «offen» bekommt einen Zahllink."""
    zaehl, nie = doppelte(alle)
    offen, blockiert, doppelt = [], [], []
    for o in alle:
        if not ist_zahlbar(o):
            continue
        oid = str(o.get("orderId") or "")
        eintrag = {"id": oid,
                   "nr": str(o.get("orderNum") or ""),
                   "betrag": float(o.get("orderAmount") or 0),
                   "datum": str(o.get("createDate") or "")[:16]}
        if id(o) in nie:
            eintrag["grund"] = nie[id(o)]
            doppelt.append(eintrag)
        elif oid in gesperrt:
            blockiert.append(eintrag)
        else:
            if lx_nr(o) in zaehl:
                eintrag["hinweis"] = (f"⚠️ {lx_nr(o)}: {zaehl[lx_nr(o)]} Aufträge bei CJ — NUR diesen ({stamm(o)}, "
                                      f"orderId {oid}) bezahlen, die anderen nie")
            offen.append(eintrag)
    return offen, blockiert, doppelt, zaehl


def ampel_zeile(offen, blockiert, zaehl, bal):
    teile = []
    if zaehl:
        teile.append("⚠️ DOPPELT bei CJ: " + " ".join(f"{nr} ×{n}" for nr, n in sorted(zaehl.items()))
                     + " — weitere Aufträge NIE bezahlen, in der CJ-Konsole löschen")
    if offen:
        teile.append(f"{len(offen)} zu bezahlen (${sum(e['betrag'] for e in offen):.2f}): " +
                     " ".join(f"{e['nr']}" for e in offen[:5]))
    if blockiert:
        teile.append(f"{len(blockiert)} gesperrt")
    if not teile:
        teile.append("nichts offen")
    return "CJ-ZAHLUNG: " + " · ".join(teile) + f" · Guthaben ${bal:.2f}"


def token():
    p = "/tmp/cj_token.json"
    if not os.path.exists(p):
        raise RuntimeError("kein CJ-Token (/tmp/cj_token.json fehlt) — Tresor/Keepalive zuerst")
    t = json.load(open(p)).get("accessToken")
    if not t:
        raise RuntimeError("/tmp/cj_token.json enthaelt keinen accessToken")
    return t


def cj(pfad, tok, versuche=6):
    """Wirft bei erschoepften Versuchen LAUT. Eine stille Rueckgabe waere eine Quittung
    ueber Arbeit, die nie stattgefunden hat (Lehre 05.09.)."""
    url = "https://developers.cjdropshipping.com/api2.0/v1/" + pfad
    letzter = ""
    for i in range(versuche):
        req = urllib.request.Request(url, headers={"CJ-Access-Token": tok,
                                                   "Content-Type": "application/json"})
        takt()                                   # prozessuebergreifend 1 Anfrage/s (cj_takt)
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                d = json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            try:
                d = json.loads(e.read().decode())
            except Exception:
                letzter = f"HTTP {e.code}"; time.sleep(2 + i); continue
        except Exception as e:
            letzter = str(e)[:120]; time.sleep(2 + i); continue
        code = d.get("code")
        # 1600200 = QPS-Drosselung, 16900500 = Tagesbudget: eine Warteanweisung ist
        # kein Abbruchgrund (Lehre 23.08.).
        if code in (1600200, 16900500):
            letzter = str(d.get("message"))[:120]; time.sleep(3 + 2 * i); continue
        return d
    raise RuntimeError(f"CJ antwortet nicht auf {pfad}: {letzter}")


def sperrliste():
    out = {}
    if os.path.exists(SPERRE):
        for z in open(SPERRE, encoding="utf-8"):
            z = z.strip()
            if not z or z.startswith("#"):
                continue
            teil = z.split("\t", 1)
            out[teil[0].strip()] = (teil[1].strip() if len(teil) > 1 else "gesperrt")
    return out


def main():
    tok = token()
    bal = float(((cj("shopping/pay/getBalance", tok).get("data")) or {}).get("amount") or 0)
    gesperrt = sperrliste()

    alle = []      # 13.10.2026: ALLE Aufträge sammeln (auch bezahlte) — nur so fällt eine doppelte LX-Nummer auf
    for seite in range(1, 6):
        d = cj(f"shopping/order/list?pageNum={seite}&pageSize=100", tok)
        lst = ((d.get("data") or {}).get("list")) or []
        if not lst:
            break
        alle += lst
        if len(lst) < 100:
            break
    offen, blockiert, doppelt, zaehl = einteilen(alle, gesperrt)

    summe = sum(e["betrag"] for e in offen)
    if not offen and not blockiert and not zaehl:
        if os.path.exists(BERICHT):
            os.remove(BERICHT)
        print(ampel_zeile(offen, blockiert, zaehl, bal))
        return

    z = [f"# CJ — bezahlbereite Auftraege (Stand {time.strftime('%Y-%m-%d %H:%M')} UTC)", "",
         f"CJ-Guthaben: **${bal:.2f}**. ⚠️ **CJ nimmt Guthaben erst ab USD "
         f"{MINDEST_EINZAHLUNG:.0f} an** — der Bestell-Automat kann deshalb NICHT selbst "
         "bezahlen. Jeder Auftrag hier braucht einen Klick in der CJ-Konsole.", ""]
    if zaehl:
        # 13.10.2026: Doppel zuerst — wer den Zahllink vorlegt, liest das vor der Tabelle «Zu bezahlen».
        z += ["## ⛔ DOPPELT bei CJ — weitere Aufträge NIE bezahlen", "",
              "Dieselbe LX-Nummer liegt mehrfach bei CJ: " + ", ".join(f"**{nr} ×{n}**" for nr, n in sorted(zaehl.items()))
              + ". Bezahlt wird höchstens EIN Auftrag je Nummer (unten unter «Zu bezahlen» mit seiner orderId, oder er ist "
              "schon bezahlt). Die folgenden NIE bezahlen und in der CJ-Konsole löschen (Betreiber); ist schon doppelt "
              "bezahlt, CJ-Ticket für die Rückerstattung.", ""]
        if doppelt:
            z += ["| Bestellung | Betrag | angelegt | CJ-orderId | Grund |", "|---|---:|---|---|---|"]
            z += [f"| {e['nr']} | ${e['betrag']:.2f} | {e['datum']} | `{e['id']}` | {e['grund']} |" for e in doppelt]
        z += [""]
    if offen:
        z += [f"## Zu bezahlen: {len(offen)} · zusammen ${summe:.2f}", "",
              "| Bestellung | Betrag | angelegt | CJ-orderId |", "|---|---:|---|---|"]
        z += [f"| {e['nr']}{' ' + e['hinweis'] if e.get('hinweis') else ''} | ${e['betrag']:.2f} | {e['datum']} | `{e['id']}` |"
              for e in offen]
        z += [""]
    if blockiert:
        z += ["## ⛔ NICHT bezahlen", "",
              "| Bestellung | Betrag | CJ-orderId | Grund |", "|---|---:|---|---|"]
        z += [f"| {e['nr']} | ${e['betrag']:.2f} | `{e['id']}` | {gesperrt.get(e['id'],'')} |"
              for e in blockiert]
        z += [""]
    open(BERICHT, "w", encoding="utf-8").write("\n".join(z) + "\n")
    # 07.10.2026 (Betreiber «mir den paylink schicken»): einmal pro Tag und Auftrag eine Erinnerung aufs Handy (ntfy).
    try:
        from betreiber_push import senden, CJ_BESTELLUNGEN
        tag = time.strftime("%Y-%m-%d")
        for e in offen:
            senden(f"{e['nr']}-erinnerung-{tag}", f"💳 Noch unbezahlt: {e['nr']} · ${e['betrag']:.2f}",
                   f"Liegt seit {e['datum']} im CJ-Warenkorb. Tippen → CJ → Bestellungen → {e['nr']} → Pay."
                   + (f" {e['hinweis']}." if e.get("hinweis") else ""),
                   klick=CJ_BESTELLUNGEN, prio="default")
        # 13.10.2026: Warnung je Doppel-Auftrag, OHNE Zahllink (kein klick auf die Zahlliste).
        for e in doppelt:
            senden(f"{e['nr']}-doppelt-{e['id']}", f"⛔ DOPPELT bei CJ: {e['nr']} — NICHT bezahlen",
                   f"Auftrag {e['id']} (${e['betrag']:.2f}, {e['datum']}): {e['grund']}. In der CJ-Konsole löschen.",
                   prio="high", tags="warning")
    except Exception as ex:
        print(f"   (Push-Erinnerung gescheitert: {type(ex).__name__})")

    print(ampel_zeile(offen, blockiert, zaehl, bal))


def selbsttest():
    faelle = [({"orderStatus": "UNPAID", "orderNum": "LX1025", "orderAmount": 73.29}, True),
              ({"orderStatus": "IN_CART", "orderNum": "LX1030", "orderAmount": 20}, True),
              ({"orderStatus": "CREATED", "orderNum": "#1025", "orderAmount": None}, False),   # Connector-Hülle
              ({"orderStatus": "CREATED", "orderNum": "LX1031", "orderAmount": 12.5}, True),
              ({"orderStatus": "CREATED", "orderNum": "LX1032", "orderAmount": 0}, False),
              ({"orderStatus": "UNSHIPPED", "orderNum": "LX1023", "orderAmount": 59.52}, False),  # bezahlt
              ({"orderStatus": "TRASH", "orderNum": "LX1016", "orderAmount": 10}, False)]
    f = 0
    for o, soll in faelle:
        ok = ist_zahlbar(o) == soll
        f += not ok
        print(f"  {'OK  ' if ok else 'FEHL'} {o['orderNum']} {o['orderStatus']} → {ist_zahlbar(o)}")
    f += selbsttest_doppelt()
    print("SELBSTTEST", "OK" if not f else f"FEHLER ({f})")
    return 0 if not f else 1


def selbsttest_doppelt():
    """13.10.2026 (Hetzner-Plan Schritt 3): doppelte LX-Nummer → Warnung, für den zweiten Auftrag NIE ein Zahllink.
    Erst die Einteilung, dann main() mit gefälschtem CJ, eigenem Bericht und gefälschtem Push (kein Netz)."""
    import tempfile, io, contextlib, types

    def a(oid, nr, st, betrag, datum, cj_id=None):
        return {"orderId": oid, "orderNum": nr, "orderStatus": st, "orderAmount": betrag, "createDate": datum,
                "cjOrderId": cj_id}
    faelle = [  # (Name, Aufträge, soll offen-IDs, soll doppelt-IDs, soll Warnung in der Zeile)
        ("doppelte LX, beide unbezahlt", [a("A1", "LX1027", "UNPAID", 19.94, "2026-10-13 10:00:00"),
                                          a("B2", "LX1027", "UNPAID", 19.94, "2026-10-13 10:20:00")], ["A1"], ["B2"], True),
        ("doppelte LX, Liste umgekehrt", [a("B2", "LX1027", "UNPAID", 19.94, "2026-10-13 10:20:00"),
                                          a("A1", "LX1027", "IN_CART", 19.94, "2026-10-13 10:00:00")], ["A1"], ["B2"], True),
        ("erster schon bezahlt",         [a("A1", "LX1027", "UNSHIPPED", 19.94, "2026-10-13 10:00:00"),
                                          a("B2", "LX1027", "UNPAID", 19.94, "2026-10-13 10:20:00")], [], ["B2"], True),
        ("erster verworfen = kein Doppel", [a("A1", "LX1027", "TRASH", 19.94, "2026-10-13 10:00:00"),
                                            a("B2", "LX1027", "UNPAID", 19.94, "2026-10-13 10:20:00")], ["B2"], [], False),
        ("Connector-Hülle #1027 ≠ LX1027", [a("H0", "#1027", "CREATED", 0, "2026-10-13 09:59:00"),
                                            a("A1", "LX1027", "UNPAID", 19.94, "2026-10-13 10:00:00")], ["A1"], [], False),
        ("zwei verschiedene LX",          [a("A1", "LX1027", "UNPAID", 19.94, "2026-10-13 10:00:00"),
                                           a("C3", "LX1028", "UNPAID", 5.00, "2026-10-13 10:05:00")], ["A1", "C3"], [], False),
        # CJ teilt VOR dem Bezahlen (gemessen LX1013: SD…500 + SD…500-2) — beide Teile zahlbar, keine Warnung
        ("CJ-Teilung vor dem Bezahlen",   [a("A1", "LX1027", "UNPAID", 15.64, "2026-10-13 10:00:00", "SD100"),
                                           a("A2", "LX1027", "UNPAID", 12.31, "2026-10-13 10:11:00", "SD100-2")],
         ["A1", "A2"], [], False),
        ("LX1013 echt (2 Teile, bezahlt)", [a("2608141614460667600", "LX1013", "CLOSED", 27.95, "2026-08-14 16:14:47",
                                             "SD2608141614440663500"),
                                           a("2608190158124509409", "LX1013", "CLOSED", 12.31, "2026-08-14 16:25:31",
                                             "SD2608141614440663500-2")], [], [], False),
        ("Doppel mit eigener SD-Nummer",  [a("A1", "LX1027", "UNPAID", 19.94, "2026-10-13 10:00:00", "SD100"),
                                           a("B2", "LX1027", "UNPAID", 19.94, "2026-10-13 10:20:00", "SD200")], ["A1"], ["B2"], True),
        ("geteiltes Original + Doppel",   [a("B2", "LX1027", "UNPAID", 19.94, "2026-10-13 10:20:00", "SD200"),
                                           a("A1", "LX1027", "UNPAID", 15.64, "2026-10-13 10:00:00", "SD100"),
                                           a("A2", "LX1027", "UNPAID", 12.31, "2026-10-13 10:11:00", "SD100-2")],
         ["A1", "A2"], ["B2"], True),
        ("Teil bezahlt, Doppel offen",    [a("A1", "LX1027", "UNSHIPPED", 15.64, "2026-10-13 10:00:00", "SD100"),
                                           a("B2", "LX1027", "UNPAID", 19.94, "2026-10-13 10:30:00", "SD200")], [], ["B2"], True),
    ]
    f = 0
    for name, alle, soll_offen, soll_doppelt, soll_warn in faelle:
        offen, blockiert, doppelt, zaehl = einteilen(alle, {})
        zeile = ampel_zeile(offen, blockiert, zaehl, 0.0)
        ok = (sorted(e["id"] for e in offen) == soll_offen and sorted(e["id"] for e in doppelt) == soll_doppelt
              and ("DOPPELT" in zeile) == soll_warn)
        f += not ok
        print(f"  {'OK  ' if ok else 'FEHL'} {name}: offen={[e['id'] for e in offen]} doppelt={[e['id'] for e in doppelt]}"
              f"{' · Warnung' if 'DOPPELT' in zeile else ''}")

    # Ende-zu-Ende: main() mit doppelter LX — Bericht, Ampel-Zeile und Push dürfen B2 nie zum Bezahlen vorlegen.
    global cj, token, BERICHT, SPERRE
    alt = (cj, token, BERICHT, SPERRE, sys.modules.get("betreiber_push"))
    pushes, tmp = [], tempfile.mkdtemp()
    liste = faelle[0][1]
    try:
        cj = lambda pfad, tok, versuche=6: ({"code": 200, "data": {"amount": 0}} if "getBalance" in pfad else
                                             {"code": 200, "data": {"list": liste}})
        token = lambda: "test"
        BERICHT, SPERRE = os.path.join(tmp, "bericht.md"), os.path.join(tmp, "fehlt.txt")
        fake = types.ModuleType("betreiber_push")
        fake.CJ_BESTELLUNGEN = "ZAHLLISTE"
        fake.senden = lambda schluessel, titel, text, klick=None, **k: pushes.append((schluessel, titel + " " + text, klick))
        sys.modules["betreiber_push"] = fake
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            main()
        bericht = open(BERICHT, encoding="utf-8").read()
        zu_bezahlen = bericht.split("## Zu bezahlen", 1)[1] if "## Zu bezahlen" in bericht else ""
        zahllinks = [p for p in pushes if p[2] == "ZAHLLISTE"]
        pruef = [("Ampel-Zeile warnt", "DOPPELT bei CJ: LX1027 ×2" in out.getvalue()),
                 ("B2 nicht unter «Zu bezahlen»", "`B2`" not in zu_bezahlen and "`A1`" in zu_bezahlen),
                 ("B2 im Doppel-Abschnitt", "`B2`" in bericht.split("## Zu bezahlen", 1)[0]),
                 ("Zahl-Erinnerung nur für A1", len(zahllinks) == 1 and "orderId A1" in zahllinks[0][1]
                                                and "B2" not in zahllinks[0][1]),
                 ("Warn-Push für B2 ohne Zahllink", any("B2" in p[0] and p[2] is None for p in pushes))]
        for name, ok in pruef:
            f += not ok
            print(f"  {'OK  ' if ok else 'FEHL'} main(): {name}")
    finally:
        cj, token, BERICHT, SPERRE = alt[:4]
        if alt[4] is not None:
            sys.modules["betreiber_push"] = alt[4]
        else:
            sys.modules.pop("betreiber_push", None)
        for n in os.listdir(tmp):
            os.unlink(os.path.join(tmp, n))
        os.rmdir(tmp)
    return f


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    try:
        main()
    except Exception as e:
        print(f"CJ-ZAHLUNG: unklar ({e})")
        sys.exit(1)
