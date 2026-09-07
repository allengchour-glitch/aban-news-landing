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
import json, os, sys, time, urllib.request, urllib.error

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, "dropship", "CJ-ZAHLUNG-OFFEN.md")
SPERRE = os.path.join(REPO, "dropship", "_cj_nicht_bezahlen.txt")
MINDEST_EINZAHLUNG = 2000.0     # gemessen/Betreiber 07.09.2026
# Welche CJ-Status gelten als zahlbar. Konfigurierbar, damit der Waechter in BEIDE
# Richtungen pruefbar ist und eine CJ-Umbenennung nicht stillschweigend alles verschluckt.
STATUS_ZAHLBAR = [x.strip() for x in os.environ.get("STATUS_ZAHLBAR", "IN_CART").split(",") if x.strip()]


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

    offen, blockiert = [], []
    for seite in range(1, 6):
        d = cj(f"shopping/order/list?pageNum={seite}&pageSize=100", tok)
        lst = ((d.get("data") or {}).get("list")) or []
        if not lst:
            break
        for o in lst:
            if o.get("orderStatus") not in STATUS_ZAHLBAR:
                continue
            oid = str(o.get("orderId") or "")
            eintrag = {"id": oid,
                       "nr": str(o.get("orderNum") or ""),
                       "betrag": float(o.get("orderAmount") or 0),
                       "datum": str(o.get("createDate") or "")[:16]}
            (blockiert if oid in gesperrt else offen).append(eintrag)
        if len(lst) < 100:
            break

    summe = sum(e["betrag"] for e in offen)
    if not offen and not blockiert:
        if os.path.exists(BERICHT):
            os.remove(BERICHT)
        print(f"CJ-ZAHLUNG: nichts offen · Guthaben ${bal:.2f}")
        return

    z = [f"# CJ — bezahlbereite Auftraege (Stand {time.strftime('%Y-%m-%d %H:%M')} UTC)", "",
         f"CJ-Guthaben: **${bal:.2f}**. ⚠️ **CJ nimmt Guthaben erst ab USD "
         f"{MINDEST_EINZAHLUNG:.0f} an** — der Bestell-Automat kann deshalb NICHT selbst "
         "bezahlen. Jeder Auftrag hier braucht einen Klick in der CJ-Konsole.", ""]
    if offen:
        z += [f"## Zu bezahlen: {len(offen)} · zusammen ${summe:.2f}", "",
              "| Bestellung | Betrag | angelegt | CJ-orderId |", "|---|---:|---|---|"]
        z += [f"| {e['nr']} | ${e['betrag']:.2f} | {e['datum']} | `{e['id']}` |" for e in offen]
        z += [""]
    if blockiert:
        z += ["## ⛔ NICHT bezahlen", "",
              "| Bestellung | Betrag | CJ-orderId | Grund |", "|---|---:|---|---|"]
        z += [f"| {e['nr']} | ${e['betrag']:.2f} | `{e['id']}` | {gesperrt.get(e['id'],'')} |"
              for e in blockiert]
        z += [""]
    open(BERICHT, "w", encoding="utf-8").write("\n".join(z) + "\n")

    teile = []
    if offen:
        teile.append(f"{len(offen)} zu bezahlen (${summe:.2f}): " +
                     " ".join(f"{e['nr']}" for e in offen[:5]))
    if blockiert:
        teile.append(f"{len(blockiert)} gesperrt")
    print("CJ-ZAHLUNG: " + " · ".join(teile) + f" · Guthaben ${bal:.2f}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"CJ-ZAHLUNG: unklar ({e})")
        sys.exit(1)
