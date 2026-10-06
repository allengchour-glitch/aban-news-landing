#!/usr/bin/env python3
"""cj_mcp.py — LESENDER Zugang zum offiziellen CJ-MCP-Server (06.10.2026, Betreiber gab den MCP-Schlüssel im Chat).

GEMESSEN 06.10. 21:15 UTC: `https://developers.cjdropshipping.com/mcp/<Schlüssel>` (Streamable HTTP, Schlüssel ROH im Pfad —
URL-kodiert antwortet der Server «apiKey URL 登录已下线»), 62 Werkzeuge, `get_rate_limit_status`: Lesen 10/s, Schreiben 2/s,
5 gleichzeitig, KEIN Tageskontingent angezeigt. `get_product_detail(productSku, features="enable_inventory")` liefert
variants[].inventories in 0,6 s.
⚠️ KORREKTUR 21:25 UTC (60 Proben): MCP rechnet über DIESELBEN Konto-Punkte ab wie REST — «Insufficient API points. Used today:
119750, Remaining: 0, Required: 10» (get_product_detail kostet 10 Punkte) — und hat dieselbe Konto-QPS «1 time/1second».
Die angezeigten 10/s sind nur die MCP-Serverseite. Die ersten Erfolge waren Glückstreffer. → KEIN Ausweg aus dem Punktetopf.
Zusatzkonten CJ5602869 / CJ5603488 (Betreiber 06.10., Schlüssel /tmp/cj_konten.env): «Your API access has been disabled» →
im CJ-Portal unter my.html#/authorize/APIStores aktivieren (Betreiber-Klick).

⛔ NUR LESEN: die Weiche `LESEND` lässt keine Bestell-/Zahl-/Lösch-Werkzeuge durch (create_order, pay_by_balance,
confirm_cart_and_pay, delete_order …) — die bleiben Betreiber-Sache.
Schlüssel: Env `CJ_MCP_KEY` oder /tmp/cj_mcp.env (600, NIE ins Repo; steht im Pfad → URL nie loggen).
"""
import json, os, subprocess, threading

LESEND = {"check_login_status", "get_rate_limit_status", "get_product_detail", "get_product_variants", "get_product_inventory",
          "query_cj_inventory", "query_sku_detail_by_sku", "get_warehouses", "get_account_balance", "list_shops",
          "get_order_list", "get_order_detail", "get_tracking_info", "list_disputes", "get_dispute_detail", "search_products",
          "calculate_freight", "get_logistics_timeliness"}


def schluessel():
    k = os.environ.get("CJ_MCP_KEY", "").strip()
    if not k and os.path.exists("/tmp/cj_mcp.env"):
        for l in open("/tmp/cj_mcp.env"):
            if l.startswith("CJ_MCP_KEY="):
                k = l.split("=", 1)[1].strip().strip("'\"")
    return k


class Sitzung:
    def __init__(self):
        self.k = schluessel()
        if not self.k:
            raise RuntimeError("CJ-MCP-Schlüssel fehlt (Env CJ_MCP_KEY oder /tmp/cj_mcp.env)")
        self.url = "https://developers.cjdropshipping.com/mcp/" + self.k
        self.sid = None; self.n = 10; self.lock = threading.Lock()
        self._post({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
            "protocolVersion": "2025-03-26", "capabilities": {}, "clientInfo": {"name": "luxestyle", "version": "1"}}})
        self._post({"jsonrpc": "2.0", "method": "notifications/initialized"})

    def _post(self, body):
        h = ["-H", "Content-Type: application/json", "-H", "Accept: application/json, text/event-stream"]
        if self.sid:
            h += ["-H", "Mcp-Session-Id: " + self.sid]
        r = subprocess.run(["curl", "-s", "-m", "90", "-D", "-", "-X", "POST", self.url] + h + ["-d", json.dumps(body)],
                           capture_output=True, text=True)
        roh = r.stdout.replace("\r\n", "\n")
        kopf, _, rumpf = roh.partition("\n\n")
        while rumpf.startswith("HTTP/"):          # Proxy-«200 Connection Established» vor der echten Antwort
            kopf, _, rumpf = rumpf.partition("\n\n")
        for l in kopf.splitlines():
            if l.lower().startswith("mcp-session-id:"):
                self.sid = l.split(":", 1)[1].strip()
        if "data:" in rumpf:
            rumpf = "\n".join(l[5:] for l in rumpf.splitlines() if l.startswith("data:"))
        return json.loads(rumpf) if rumpf.strip() else {}

    def werkzeug(self, name, args):
        if name not in LESEND:
            raise PermissionError(f"{name}: nur lesende CJ-Werkzeuge erlaubt")
        with self.lock:
            self.n += 1; i = self.n
        d = self._post({"jsonrpc": "2.0", "id": i, "method": "tools/call", "params": {"name": name, "arguments": args}})
        res = d.get("result") or {}
        text = "".join(c.get("text", "") for c in res.get("content") or [] if c.get("type") == "text")
        if res.get("isError") or d.get("error"):
            raise RuntimeError(f"{name}: {(text or str(d.get('error')))[:160]}")
        return text

    def produkt(self, product_sku):
        """→ dict wie REST product/query data (variants[].variantSku + inventories), oder {} wenn CJ es nicht kennt."""
        t = self.werkzeug("get_product_detail", {"productSku": product_sku, "features": "enable_inventory"})
        i = t.find("{")
        return json.loads(t[i:]) if i >= 0 else {}


if __name__ == "__main__":
    s = Sitzung()
    print(s.werkzeug("check_login_status", {}).splitlines()[0])
    print(s.werkzeug("get_rate_limit_status", {}))
