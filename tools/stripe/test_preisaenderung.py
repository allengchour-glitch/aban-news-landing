#!/usr/bin/env python3
"""Test: Preisänderung im Katalog → neuer Preis + neuer Payment-Link, alter Link und alter Preis abgeschaltet.
Gegenprobe: unveränderte Produkte bleiben unangetastet. Läuft gegen einen nachgebauten Stripe-Server.

    python3 tools/stripe/test_preisaenderung.py
"""
import json, os, subprocess, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs

ROOT = Path(__file__).resolve().parents[2]
aufrufe = []

class S(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def antwort(self, o):
        b = json.dumps(o).encode(); self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        aufrufe.append(("GET", self.path, {}))
        if self.path.startswith("/v1/payment_links"):
            return self.antwort({"data": [{"id": "plink_andere", "url": "https://buy.stripe.com/andere"},
                                          {"id": "plink_alt", "url": "https://buy.stripe.com/alt-19"}], "has_more": False})
        self.antwort({})
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); body = parse_qs(self.rfile.read(n).decode())
        aufrufe.append(("POST", self.path, body))
        if self.path == "/v1/prices": return self.antwort({"id": "price_neu"})
        if self.path == "/v1/payment_links": return self.antwort({"id": "plink_neu", "url": "https://buy.stripe.com/neu-12"})
        self.antwort({"id": self.path.rsplit("/", 1)[-1], "active": False})

srv = HTTPServer(("127.0.0.1", 0), S); threading.Thread(target=srv.serve_forever, daemon=True).start()
d = Path(tempfile.mkdtemp())
(d / "kat.json").write_text(json.dumps([
    {"slug": "budget-plan", "title": "Budget", "price_cents": 1200, "currency": "chf", "standalone": True},
    {"slug": "schulden-plan", "title": "Schulden", "price_cents": 2700, "currency": "chf", "standalone": True}]))
(d / "state.json").write_text(json.dumps({
    "budget-plan": {"product": "prod_b", "price": "price_alt", "link": "https://buy.stripe.com/alt-19", "cents": 1900, "currency": "chf"},
    "schulden-plan": {"product": "prod_s", "price": "price_s", "link": "https://buy.stripe.com/s-27", "cents": 2700, "currency": "chf"}}))
env = {**os.environ, "STRIPE_API_KEY": "sk_test_x", "DOWNLOAD_SALT": "s", "STRIPE_API_BASE": f"http://127.0.0.1:{srv.server_port}/v1"}
r = subprocess.run([sys.executable, str(ROOT / "automation/stripe_sync.py"), "--catalog", str(d / "kat.json"), "--state", str(d / "state.json"),
                    "--out", str(d / "out.json")], env=env, capture_output=True, text=True)
print(r.stdout[-600:], r.stderr[-400:])
st = json.loads((d / "state.json").read_text()); out = {p["slug"]: p for p in json.loads((d / "out.json").read_text())}
pruef = [
    (st["budget-plan"]["link"] == "https://buy.stripe.com/neu-12" and st["budget-plan"]["cents"] == 1200, "neuer Link + Preis im Status"),
    (out["budget-plan"]["price"] == "CHF 12" and out["budget-plan"]["buy"].endswith("neu-12"), "Shop zeigt CHF 12 MIT dem neuen Link (kein Preis-Widerspruch)"),
    (("POST", "/v1/payment_links/plink_alt", {"active": ["false"]}) in aufrufe, "alter Link (per URL gefunden) abgeschaltet"),
    (("POST", "/v1/prices/price_alt", {"active": ["false"]}) in aufrufe, "alter Preis archiviert"),
    (not any(a[1] == "/v1/payment_links/plink_andere" for a in aufrufe), "Gegenprobe: fremder Link nicht angefasst"),
    (any(a[1] == "/v1/prices" and a[2].get("product") == ["prod_b"] and a[2].get("unit_amount") == ["1200"] for a in aufrufe), "neuer Preis auf dasselbe Produkt"),
    (st["schulden-plan"]["link"] == "https://buy.stripe.com/s-27" and not any("prod_s" in str(a[2]) for a in aufrufe), "Gegenprobe: unveränderter Preis → nichts geändert"),
    (st["budget-plan"].get("link_id") == "plink_neu", "neue Link-ID gespeichert (nächstes Mal ohne Suche)"),
]
for ok, t in pruef: print(("✅ " if ok else "❌ ") + t)
srv.shutdown(); sys.exit(0 if all(o for o, _ in pruef) else 1)
