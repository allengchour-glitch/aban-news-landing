"""Bounded public QA helper. Requires explicit target input and --go for network calls."""
from __future__ import annotations

import argparse
import datetime as dt
from decimal import Decimal, InvalidOperation
import hashlib
from html.parser import HTMLParser
import json
import re
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit, urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener


MAX_PRODUCTS = 4
ALLOWED_HOSTS = {"luxestyle.ch", "www.luxestyle.ch", "cdn.shopify.com"}


def canonical_id(value: str) -> str:
    """Return the numeric Shopify id, rejecting other forms before selector use."""
    value = str(value)
    match = re.fullmatch(r"(?:gid://shopify/Product/)?([0-9]+)", value)
    if not match:
        raise ValueError(f"Invalid Shopify product id: {value!r}")
    return match.group(1)


def load_targets(path: Path) -> list[dict]:
    """Load explicit {productId, selectedOptions} rows; never infer/catalog-scan."""
    return validate_targets(json.loads(path.read_text()))


def validate_targets(data) -> list[dict]:
    """Validate already-parsed explicit target data without filesystem/network I/O."""
    if isinstance(data, dict):
        data = data.get("products")
    if not isinstance(data, list) or not 1 <= len(data) <= MAX_PRODUCTS:
        raise ValueError(f"Target input must contain 1–{MAX_PRODUCTS} explicit products")
    targets, seen = [], set()
    for row in data:
        if not isinstance(row, dict):
            raise ValueError("Each target must be an object")
        pid = canonical_id(row.get("productId", ""))
        if pid in seen:
            raise ValueError(f"Duplicate product id: {pid}")
        seen.add(pid)
        values = row.get("selectedOptions")
        if not isinstance(values, list) or not values or not all(isinstance(x, str) and x for x in values):
            raise ValueError(f"{pid}: selectedOptions must be a nonempty list of exact option values")
        targets.append({"productId": pid, "selectedOptions": values})
    return targets


def parse_chf(text: str) -> Decimal | None:
    """Parse a complete CHF price; malformed or ambiguous strings stay unknown."""
    if not isinstance(text, str):
        return None
    # CHF amounts use an explicit currency/space prefix. Optional Swiss
    # thousands separators are apostrophe, typographic apostrophe, or space;
    # decimals are absent or exactly two digits. Full-match rejects suffixes,
    # multiple amounts, and any accidental rounding.
    grouped = r"[0-9]{1,3}(?P<sep>['’\u00a0\u202f ])[0-9]{3}(?:(?P=sep)[0-9]{3})*"
    number = r"(?:[0-9]+|" + grouped + r")(?:[.,][0-9]{2})?"
    match = re.fullmatch(r"CHF[\u0020\t\r\n\u00a0\u202f]+(" + number + r")", text.strip())
    if not match:
        return None
    raw = match.group(1).replace("'", "").replace("’", "").replace("\u00a0", "").replace("\u202f", "").replace(" ", "")
    if "," in raw:
        raw = raw.replace(",", ".")
    try:
        return Decimal(raw)
    except (InvalidOperation, ValueError):
        return None


def scope_main_price_nodes(nodes: list, product_id: str) -> list[dict]:
    """Keep only visible price nodes from the exact PDP details root, never cards."""
    pid = canonical_id(product_id)
    if not isinstance(nodes, list):
        return []
    return [
        node for node in nodes
        if isinstance(node, dict)
        and str(node.get("productId") or "") == pid
        and node.get("visible") is True
        and node.get("withinProductInformationDetails") is True
        and node.get("insideRecommendation") is not True
    ]


def main_price_selector(product_id: str) -> str:
    """The live Horizon PDP's product-specific details subtree selector."""
    pid = canonical_id(product_id)
    return f'[data-testid="product-information-details"] product-price[data-product-id="{pid}"] .price'


def evaluate_main_price_gate(
    snapshot: dict,
    *,
    product_id: str,
    expected_variant_id: str,
    expected_price_chf: str,
) -> dict:
    """Fail closed unless selected variant and its product-id-scoped main price match.

    Sticky prices and recommendation cards are intentionally not fallback inputs.
    """
    pid = canonical_id(product_id)
    expected_vid = str(expected_variant_id).split("/")[-1]
    actual_vid = str(snapshot.get("variantId") or "").split("/")[-1]
    variant_ok = bool(actual_vid) and actual_vid == expected_vid
    visible = scope_main_price_nodes(snapshot.get("mainProductPrices"), pid)
    parsed = [parse_chf(n.get("text", "")) for n in visible]
    expected = parse_chf("CHF " + str(expected_price_chf))
    price_ok = bool(visible) and expected is not None and all(x is not None and x == expected for x in parsed)
    if not actual_vid:
        reason = "selected_variant_id_missing"
    elif not variant_ok:
        reason = "selected_variant_id_mismatch"
    elif not visible:
        reason = "main_product_price_missing_or_invisible"
    elif expected is None or any(x is None for x in parsed):
        reason = "main_product_price_unknown_or_ambiguous"
    elif not price_ok:
        reason = "main_product_price_mismatch"
    else:
        reason = None
    return {
        "passed": variant_ok and price_ok,
        "reason": reason,
        "productId": pid,
        "expectedVariantId": expected_vid,
        "actualVariantId": actual_vid or None,
        "variantIdMatches": variant_ok,
        "expectedPriceCHF": f"{expected:.2f}" if expected is not None else None,
        "visibleMainPriceNodeCount": len(visible),
        "parsedMainPricesCHF": [f"{x:.2f}" if x is not None else None for x in parsed],
        "mainPriceMatches": price_ok,
    }


def native_for(root: Path, pid: str) -> tuple[dict, str]:
    for name in (f"native-after-{pid}.json", f"native-current-{pid}.json", f"native-before-{pid}.json"):
        path = root / name
        if not path.exists():
            continue
        raw = json.loads(path.read_text())
        product = raw.get("structuredContent", {}).get("data", {}).get("product")
        if not product and isinstance(raw.get("content"), list):
            for block in raw["content"]:
                text = block.get("text", "") if isinstance(block, dict) else ""
                start = text.find('{"data"')
                if start >= 0:
                    try:
                        product = json.loads(text[start:]).get("data", {}).get("product")
                    except json.JSONDecodeError:
                        pass
                if product:
                    break
        if product:
            return product, str(path)
    raise FileNotFoundError(f"No local native snapshot for {pid} under {root}")


class LDParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.buf = []
        self.objects = []

    def handle_starttag(self, tag, attrs):
        if tag == "script" and (dict(attrs).get("type") or "").lower() == "application/ld+json":
            self.active, self.buf = True, []

    def handle_endtag(self, tag):
        if tag == "script" and self.active:
            try:
                self.objects.append(json.loads("".join(self.buf)))
            except (json.JSONDecodeError, TypeError):
                pass
            self.active = False

    def handle_data(self, data):
        if self.active:
            self.buf.append(data)


def product_offers(obj):
    found = []
    if isinstance(obj, dict):
        if obj.get("@type") == "Product" and isinstance(obj.get("offers"), dict):
            offer = obj["offers"]
            found.append({"sku": obj.get("sku"), "price": str(offer.get("price")), "currency": offer.get("priceCurrency")})
        for value in obj.values():
            if isinstance(value, (dict, list)):
                found.extend(product_offers(value))
    elif isinstance(obj, list):
        for value in obj:
            found.extend(product_offers(value))
    return found


def normalize(value):
    return re.sub(r">\s+<", "><", value.strip()) if value else None


def variants_match(native, public):
    return len(native) == len(public) and all(
        any(
            str(candidate.get("id")) == variant["id"].split("/")[-1]
            and candidate.get("title") == variant.get("title")
            and candidate.get("sku") == variant.get("sku")
            and round(float(candidate.get("price")) / 100, 2) == float(variant["price"])
            for candidate in public
        )
        for variant in native
    )


def choose(page, value):
    custom = page.locator(".lx-bildwahl__knopf").filter(has_text=value)
    if custom.count():
        custom.first.scroll_into_view_if_needed()
        custom.first.click(timeout=5000)
        return
    labels = page.locator("variant-picker label").filter(has=page.locator(f'input[type="radio"][value="{value}"]'))
    if labels.count():
        labels.first.scroll_into_view_if_needed()
        labels.first.click(timeout=5000)
        return
    selects = page.locator("variant-picker select")
    for i in range(selects.count()):
        if value in selects.nth(i).locator("option").all_text_contents():
            selects.nth(i).select_option(label=value, timeout=5000)
            return
    raise RuntimeError(f"No visible buyer control for {value!r}")


def browser_snapshot(page, width, product_id):
    page.set_viewport_size({"width": width, "height": 900})
    page.wait_for_timeout(900)
    return page.evaluate("""(args) => {
      const productId=args.productId, exactSelector=args.priceSelector;
      const q=s=>document.querySelector(s), rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,y:r.y}};
      const d=q('.rte.lux-beschreibung'),spec=q('#lux-spezi'),form=q('form[action*=\"/cart/add\"]');
      const exactMainPrices=[...document.querySelectorAll(exactSelector)]
        .filter(e=>!e.closest('product-card,.product-recommendations,[data-testid*=\"recommendation\"]')).map(e=>{
        const r=e.getBoundingClientRect(),s=getComputedStyle(e);
        return {productId:e.closest('product-price')?.getAttribute('data-product-id')||null,text:e.innerText.trim(),className:String(e.className),visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden',withinProductInformationDetails:!!e.closest('[data-testid=\"product-information-details\"]'),insideRecommendation:!!e.closest('product-card,.product-recommendations,[data-testid*=\"recommendation\"]')};
      });
      const sticky=[...document.querySelectorAll('.sticky-add-to-cart__price .price')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}).map(e=>e.innerText.trim());
      return {viewport:innerWidth,scrollX,bodyWidth:document.body.scrollWidth,docWidth:document.documentElement.scrollWidth,
        h1:q('h1')?.innerText?.trim(),documentTitle:document.title,metaDescription:q('meta[name=\"description\"]')?.content||null,
        canonical:q('link[rel=\"canonical\"]')?.href||null,robots:q('meta[name=\"robots\"]')?.content||null,
        descriptionHtml:d?.innerHTML||null,descriptionRect:rect(d),specText:spec?.innerText||null,specRect:rect(spec),formRect:rect(form),
        mainPriceSelector:exactSelector,mainProductPrices:exactMainPrices,stickyProductPrices:sticky,
        pickers:[...document.querySelectorAll('variant-picker fieldset,variant-picker .product-form__input,.lx-bildwahl')].map(e=>({legend:e.querySelector('legend')?.innerText?.trim()||null,label:e.querySelector('label')?.innerText?.trim()||null,aria:e.getAttribute('aria-label'),selected:e.querySelector('[aria-pressed=\"true\"]')?.innerText?.trim()||e.querySelector('input:checked')?.value||null})),
        tables:[...document.querySelectorAll('.rte.lux-beschreibung table,#lux-spezi table')].map(t=>({rect:rect(t),headers:[...t.querySelectorAll('th')].map(x=>x.innerText.trim()),rows:[...t.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(c=>c.innerText.trim()))}))};
    }""", {"productId": canonical_id(product_id), "priceSelector": main_price_selector(product_id)})


def _validate_url_parts(url: str, *, require_product_path: bool, allow_query: bool) -> tuple[str, str, str, str, str]:
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError as error:
        raise ValueError(f"Invalid URL: {url!r}") from error
    host = (parsed.hostname or "").lower()
    if parsed.scheme.lower() != "https" or host not in {"luxestyle.ch", "www.luxestyle.ch"}:
        raise ValueError(f"Refusing non-HTTPS or non-LuxeStyle URL: {url!r}")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError(f"Refusing URL userinfo: {url!r}")
    if port not in (None, 443):
        raise ValueError(f"Refusing non-default URL port: {url!r}")
    if parsed.fragment:
        raise ValueError(f"Refusing URL fragment: {url!r}")
    if parsed.query and not allow_query:
        raise ValueError(f"Unexpected query in canonical product URL: {url!r}")
    if require_product_path and not re.fullmatch(r"/products/[^/]+/?", parsed.path):
        raise ValueError(f"Refusing non-canonical product path: {url!r}")
    path = parsed.path.rstrip("/") or "/"
    # Normalize accepted default ports and host casing before making requests.
    return ("https", host, path, parsed.query if allow_query else "", "")


def validate_product_url(url: str) -> str:
    """Validate a canonical native PDP URL and return a clean normalized URL."""
    scheme, host, path, _query, _fragment = _validate_url_parts(url, require_product_path=True, allow_query=False)
    return urlunsplit((scheme, host, path, "", ""))


def validate_redirect_url(url: str) -> str:
    """Validate each redirect target before urllib is permitted to follow it."""
    scheme, host, path, query, _fragment = _validate_url_parts(url, require_product_path=False, allow_query=True)
    if any(x in path.lower() for x in ("/cart", "/checkout", "/account", "/login", "/register", "shop_pay", "shop-pay", "consent")):
        raise ValueError(f"Refusing redirect to a guarded route: {url!r}")
    return urlunsplit((scheme, host, path, query, ""))


def validate_browser_request_url(url: str) -> tuple[str, str]:
    """Validate a browser request URL before Playwright fetches it."""
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError as error:
        raise ValueError("Invalid browser request URL") from error
    host = (parsed.hostname or "").lower()
    if parsed.scheme.lower() != "https" or host not in ALLOWED_HOSTS:
        raise ValueError("Refusing non-HTTPS or untrusted browser request")
    if parsed.username is not None or parsed.password is not None or port not in (None, 443) or parsed.fragment:
        raise ValueError("Refusing unsafe browser request URL components")
    path = parsed.path.lower()
    if any(x in path for x in ("/cart", "/checkout", "/account", "/login", "/register", "shop_pay", "shop-pay", "consent")):
        raise ValueError("Refusing guarded browser route")
    return host, parsed.path


def guarded_browser_route(route, blocked: list[dict]) -> None:
    """Fulfill safe GETs without following redirects; reject every 3xx."""
    request = route.request
    try:
        host, path = validate_browser_request_url(request.url)
    except ValueError:
        parsed = urlsplit(request.url)
        blocked.append({"method": request.method, "host": parsed.hostname or "", "path": parsed.path,
                        "reason": "unsafe_initial_request"})
        return route.abort()
    if request.method != "GET":
        blocked.append({"method": request.method, "host": host, "path": path,
                        "reason": "non_get_request"})
        return route.abort()
    try:
        response = route.fetch(max_redirects=0)
    except Exception:
        blocked.append({"method": request.method, "host": host, "path": path,
                        "reason": "fetch_failed"})
        return route.abort()
    if 300 <= response.status < 400:
        blocked.append({"method": request.method, "host": host, "path": path,
                        "reason": "redirect_rejected", "status": response.status})
        return route.abort()
    return route.fulfill(response=response)


class StrictRedirectHandler(HTTPRedirectHandler):
    """Follow only redirects to HTTPS LuxeStyle hosts on the default port."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = validate_redirect_url(urljoin(req.full_url, newurl))
        return super().redirect_request(req, fp, code, msg, headers, target)


def open_validated_get(request: Request, timeout: int = 40):
    opener = build_opener(StrictRedirectHandler())
    return opener.open(request, timeout=timeout)


def cache_busted_url(base_url: str, *, suffix: str, stamp: str, product_id: str) -> str:
    clean = urlsplit(validate_product_url(base_url))
    path = clean.path + suffix
    query = urlencode({"qa_cache_bust": f"{stamp}-{product_id}-{suffix or 'browser'}"})
    return urlunsplit((clean.scheme, clean.netloc, path, query, ""))


def run(targets: list[dict], native_root: Path, output: Path) -> dict:
    """Run only explicitly supplied product targets; network is invoked by caller --go."""
    output.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("r265-%Y%m%dT%H%M%SZ")
    records, fetches = [], []
    for target in targets:
        pid = target["productId"]
        product, source_path = native_for(native_root, pid)
        if canonical_id(product.get("id", "")) != pid:
            raise ValueError(f"{pid}: native file identity mismatch")
        url = validate_product_url(product.get("onlineStoreUrl") or f"https://luxestyle.ch/products/{product['handle']}")
        options = product.get("options", [])
        selected_options = target["selectedOptions"]
        if len(selected_options) != len(options):
            raise ValueError(f"{pid}: selectedOptions count does not match native options")
        for index, value in enumerate(selected_options):
            allowed = [v.get("name") for v in options[index].get("optionValues", [])]
            if value not in allowed:
                raise ValueError(f"{pid}: selected option absent from current native values: {value!r}")
        expected = next((v for v in product.get("variants", {}).get("nodes", [])
                         if [o.get("value") for o in v.get("selectedOptions", [])] == selected_options), None)
        if expected is None:
            raise ValueError(f"{pid}: no exact native variant for {selected_options}")
        expected_variant_id = expected["id"].split("/")[-1]
        expected_price = str(expected.get("price"))
        record = {"productId": pid, "nativeSource": source_path, "url": url,
                  "nativeTitle": product.get("title"), "nativeSEO": product.get("seo"),
                  "nativeOptions": options, "selectedOptions": selected_options,
                  "expectedVariant": {"id": expected_variant_id, "sku": expected.get("sku"), "priceCHF": expected_price}}
        for kind, suffix in (("html", ""), ("js", ".js")):
            request_url = cache_busted_url(url, suffix=suffix, stamp=stamp, product_id=pid)
            request = Request(request_url, headers={"User-Agent": "Mozilla/5.0 bounded R265 product QA"})
            with open_validated_get(request, timeout=40) as response:
                data, status, headers = response.read(), response.status, dict(response.headers)
            path = output / f"{pid}.{kind}"
            path.write_bytes(data)
            fetches.append({"productId": pid, "kind": kind, "status": status,
                            "headers": {k.lower(): v for k, v in headers.items() if k.lower() in ("date", "etag", "cache-control", "age", "last-modified", "cf-cache-status")},
                            "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "path": str(path)})
            record[kind + "Path"] = str(path)
        public = json.loads(Path(record["jsPath"]).read_text())
        native_variants = product.get("variants", {}).get("nodes", [])
        public_variants = public.get("variants", [])
        record["publicJsDescriptionEqualsNative"] = public.get("description") == product.get("descriptionHtml")
        record["publicVariantsMatchNative"] = variants_match(native_variants, public_variants)
        parser = LDParser()
        parser.feed(Path(record["htmlPath"]).read_text())
        offers = []
        for obj in parser.objects:
            offers.extend(product_offers(obj))
        record["jsonLdOffers"] = offers
        record["jsonLdOffersMatchNative"] = len(offers) == len(native_variants) and all(
            any(o.get("sku") == v.get("sku") and o.get("price") == str(v.get("price")) and o.get("currency") == "CHF" for o in offers)
            for v in native_variants
        )
        record["_product"] = product
        records.append(record)
    (output / "fetch-proof.json").write_text(json.dumps({"capturedAtUTC": dt.datetime.now(dt.timezone.utc).isoformat(), "fetches": fetches}, ensure_ascii=False, indent=2) + "\n")

    from playwright.sync_api import sync_playwright
    browser_records = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        for record in records:
            pid, product = record["productId"], record["_product"]
            page = browser.new_page(viewport={"width": 390, "height": 900})
            blocked = []

            def guard(route):
                return guarded_browser_route(route, blocked)

            page.route("**/*", guard)
            response = page.goto(cache_busted_url(record["url"], suffix="", stamp=stamp + "-browser", product_id=pid), wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(2800)
            mobile360 = browser_snapshot(page, 360, pid)
            page.screenshot(path=str(output / f"{pid}-360.png"), full_page=False)
            mobile390 = browser_snapshot(page, 390, pid)
            page.screenshot(path=str(output / f"{pid}-390.png"), full_page=False)
            for value in record["selectedOptions"]:
                choose(page, value)
            expected = record["expectedVariant"]
            try:
                page.wait_for_function('(id)=>document.querySelector(\'form[action*=\"/cart/add\"] input[name=\"id\"]\')?.value===id', arg=expected["id"], timeout=8000)
            except Exception:
                pass
            page.wait_for_timeout(600)
            selected = page.evaluate("""(args) => {
              const pid=String(args.productId), selector=args.priceSelector;
              const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
              const mainNodes=[...document.querySelectorAll(selector)].filter(e=>!e.closest('product-card,.product-recommendations,[data-testid*=\"recommendation\"]'));
              const f=document.querySelector('form[action*=\"/cart/add\"]');
              return {productId:pid,variantId:f?.querySelector('input[name=\"id\"]')?.value||null,
                mainPriceSelector:selector,
                mainProductPrices:mainNodes.map(e=>({productId:e.closest('product-price')?.getAttribute('data-product-id')||null,text:e.innerText.trim(),className:String(e.className),visible:visible(e),withinProductInformationDetails:!!e.closest('[data-testid=\"product-information-details\"]'),insideRecommendation:!!e.closest('product-card,.product-recommendations,[data-testid*=\"recommendation\"]')})),
                stickyProductPrices:[...document.querySelectorAll('.sticky-add-to-cart__price .price')].filter(visible).map(e=>e.innerText.trim()),
                recommendationPrices:[...document.querySelectorAll('product-card product-price[data-product-id] .price, .product-recommendations product-price[data-product-id] .price')].filter(visible).map(e=>({productId:e.closest('product-price')?.getAttribute('data-product-id')||null,text:e.innerText.trim()})),
                pickers:[...document.querySelectorAll('variant-picker fieldset,variant-picker .product-form__input,.lx-bildwahl')].map(e=>({legend:e.querySelector('legend')?.innerText?.trim()||null,label:e.querySelector('label')?.innerText?.trim()||null,aria:e.getAttribute('aria-label'),selected:e.querySelector('[aria-pressed=\"true\"]')?.innerText?.trim()||e.querySelector('input:checked')?.value||null}))};
            }""", {"productId": pid, "priceSelector": main_price_selector(pid)})
            price_gate = evaluate_main_price_gate(selected, product_id=pid, expected_variant_id=expected["id"], expected_price_chf=expected["priceCHF"])
            page.screenshot(path=str(output / f"{pid}-selected.png"), full_page=False)
            seo = product.get("seo") or {}
            expected_body = re.sub(r'<div class="ls-produktdetails">.*?</div>', '', product.get("descriptionHtml", ""), flags=re.S)
            body_projection = normalize(mobile390.get("descriptionHtml")) == normalize(expected_body)
            metadata = {"h1MatchesNative": mobile390.get("h1") == product.get("title"),
                        "metaDescriptionMatchesNative": mobile390.get("metaDescription") == seo.get("description"),
                        "canonicalMatchesNative": mobile390.get("canonical") == product.get("onlineStoreUrl"),
                        "noindex": bool(mobile390.get("robots") and "noindex" in mobile390["robots"].lower()),
                        "documentTitle": mobile390.get("documentTitle"), "configuredSeoTitle": seo.get("title"),
                        "documentTitleMatchesConfiguredExactly": mobile390.get("documentTitle") == seo.get("title")}
            mobile_ok = all(m["bodyWidth"] == m["viewport"] and m["docWidth"] == m["viewport"] and
                            all(t["rect"]["scrollWidth"] <= t["rect"]["clientWidth"] for t in m["tables"])
                            for m in (mobile360, mobile390))
            record_out = {"productId": pid, "nativeSource": record["nativeSource"], "url": record["url"],
                          "httpStatus": response.status if response else None, "metadata": metadata,
                          "bodyProjectionMatchesNative": body_projection,
                          "publicJsDescriptionEqualsNative": record["publicJsDescriptionEqualsNative"],
                          "publicVariantsMatchNative": record["publicVariantsMatchNative"],
                          "jsonLdOffersMatchNative": record["jsonLdOffersMatchNative"],
                          "mobile360": mobile360, "mobile390": mobile390, "noHorizontalOverflow360390": mobile_ok,
                          "expectedVariant": expected, "selected": selected, "mainPriceGate": price_gate,
                          "stickyPriceMatchesNativeSupplemental": any(parse_chf(x) == parse_chf("CHF " + expected["priceCHF"]) for x in selected.get("stickyProductPrices", [])),
                          "blockedRequestCount": len(blocked), "blockedRequests": blocked}
            browser_records.append(record_out)
            page.close()
        browser.close()
    result = "PASS_BOUNDED" if all(r["mainPriceGate"]["passed"] and r["httpStatus"] == 200 and all(r["metadata"].get(k) for k in ("h1MatchesNative", "metaDescriptionMatchesNative", "canonicalMatchesNative", "documentTitleMatchesConfiguredExactly")) and not r["metadata"]["noindex"] and r["bodyProjectionMatchesNative"] and r["publicJsDescriptionEqualsNative"] and r["publicVariantsMatchNative"] and r["jsonLdOffersMatchNative"] and r["noHorizontalOverflow360390"] for r in browser_records) else "FAIL_BOUNDED"
    report = {"capturedAtUTC": dt.datetime.now(dt.timezone.utc).isoformat(), "result": result,
              "scope": "Explicit target list only (max four). Public GET only; redirect scheme/host/port/userinfo validation, browser host/cart/checkout/account/consent guards active. Main price is read only from product-price[data-product-id] under the product-information-details ancestor, excluding cards/recommendations; sticky and recommendation prices are never fallback evidence.",
              "fetches": fetches, "products": browser_records}
    (output / "public-qa.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, required=True, help="JSON with explicit productId and selectedOptions rows (maximum four)")
    parser.add_argument("--native-root", type=Path, required=True, help="Local directory containing native product snapshots")
    parser.add_argument("--out", type=Path, required=True, help="Local evidence output directory")
    parser.add_argument("--go", action="store_true", help="Permit bounded public GET/browser QA for the explicit target input")
    args = parser.parse_args()
    targets = load_targets(args.targets)
    if not args.go:
        raise SystemExit(f"Prepared {len(targets)} explicit target(s); no public calls made. Pass --go only after review.")
    report = run(targets, args.native_root, args.out)
    print(json.dumps({"capturedAtUTC": report["capturedAtUTC"], "result": report["result"], "productIds": [x["productId"] for x in report["products"]]}, indent=2))
    if report["result"] != "PASS_BOUNDED":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
