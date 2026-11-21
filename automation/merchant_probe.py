#!/usr/bin/env python3
"""Merchant-Leseprobe; die bisherige Kontenprobe bleibt die Vorgabe."""
import base64
import hashlib
import json
import logging
import os
import sys
from urllib.parse import urlsplit

SCOPE = "https://www.googleapis.com/auth/content"
API_HOST = "merchantapi.googleapis.com"
ACCOUNT_ID = "5797470070"
ACCOUNT_NAME = "LuxeStyle CH"
CASES = {
    "preis-draft": {
        "offerId": "15421165404545_cjtz292404406fu",
        "contentLanguage": "de",
        "feedLabel": "CH",
    },
    "nagellack-1": {
        "offerId": "shopify_ZZ_15448834736513_55877809340801",
        "contentLanguage": "de",
        "feedLabel": "CHF_99383214465",
    },
    "nagellack-6": {
        "offerId": "shopify_ZZ_15448834736513_67652260430215",
        "contentLanguage": "de",
        "feedLabel": "CHF_99383214465",
    },
}
MARKER = "LUXE_MERCHANT_READ_V1"
CSS_LIMIT_CASE = "css-produktlimit"
CSS_LIMIT_SCOPE = "ADS_EEA"
SOURCE_CASE = "css-quellen"
REPORT_CASE = "css-angebote"


def _emit(obj, stream=None):
    print(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), file=stream or sys.stdout)


def _unknown(case, code):
    _emit({"marker": MARKER, "case": case if case in CASES or case in (CSS_LIMIT_CASE, SOURCE_CASE, REPORT_CASE) else "unknown", "result": "unknown", "errorCode": code})
    return 2


def _encoded_product_key(case_spec):
    raw = "~".join((case_spec["contentLanguage"], case_spec["feedLabel"], case_spec["offerId"]))
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii").rstrip("=")


def _api_get(url, bearer, get=None):
    """Ein API-GET ohne Weiterleitung; `get` ist für Offline-Tests injizierbar."""
    if get is None:
        import requests  # Diese Abhängigkeit installiert der bestehende Workflow.
        get = requests.get
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname != API_HOST or parsed.port not in (None, 443):
        raise ValueError("blocked_host")
    return get(
        url,
        headers={"Authorization": "Bearer " + bearer, "Accept": "application/json"},
        timeout=20,
        allow_redirects=False,
    )


def _get_json(url, bearer, get=None):
    try:
        response = _api_get(url, bearer, get)
    except Exception as exc:
        # Fehlertexte bleiben verborgen, da HTTP-Bibliotheken URLs, Header oder Inhalte nennen können.
        return None, "timeout" if isinstance(exc, TimeoutError) or exc.__class__.__name__.lower().endswith("timeout") else "transport"
    status = getattr(response, "status_code", None)
    if status in (401, 403, 429):
        return None, f"http_{status}"
    if status != 200:
        return None, "redirect_blocked" if isinstance(status, int) and 300 <= status < 400 else "http_unknown"
    try:
        return response.json(), None
    except Exception:
        return None, "invalid_json"


def _read_css_limit(bearer, get=None):
    resource = f"accounts/{ACCOUNT_ID}/limits/products~{CSS_LIMIT_SCOPE}"
    response, error = _get_json(f"https://{API_HOST}/quota/v1/{resource}", bearer, get)
    if error:
        return _unknown(CSS_LIMIT_CASE, error)

    products = response.get("products") if isinstance(response, dict) else None
    if not isinstance(products, dict) or response.get("name") != resource:
        return _unknown(CSS_LIMIT_CASE, "limit_response_mismatch")

    limit = products.get("limit")
    if (
        products.get("scope") != CSS_LIMIT_SCOPE
        or not isinstance(limit, str)
        or not limit.isascii()
        or not limit.isdecimal()
        or not 1 <= len(limit) <= 19
        or not 0 <= int(limit) <= 2**63 - 1
    ):
        return _unknown(CSS_LIMIT_CASE, "limit_response_mismatch")

    _emit({
        "marker": MARKER,
        "case": CSS_LIMIT_CASE,
        "result": "ok",
        "scope": CSS_LIMIT_SCOPE,
        "productLimit": limit,
    })
    return 0


def _read_data_sources(bearer, get=None):
    prefix = f"accounts/{ACCOUNT_ID}/dataSources"
    data, error = _get_json(f"https://{API_HOST}/datasources/v1/{prefix}?pageSize=10", bearer, get)
    if error:
        return _unknown(SOURCE_CASE, error)

    sources = data.get("dataSources") if isinstance(data, dict) else None
    if not isinstance(sources, list) or len(sources) > 10:
        return _unknown(SOURCE_CASE, "data_sources_response_mismatch")

    rows = []
    for item in sources:
        source_id = item.get("dataSourceId") if isinstance(item, dict) else None
        if (
            not isinstance(source_id, str)
            or not source_id.isascii()
            or not source_id.isdecimal()
            or item.get("name") != f"{prefix}/{source_id}"
        ):
            return _unknown(SOURCE_CASE, "data_source_identity_mismatch")

        source_types = (
            "primaryProductDataSource", "supplementalProductDataSource",
            "localInventoryDataSource", "regionalInventoryDataSource",
            "promotionDataSource", "productReviewDataSource", "merchantReviewDataSource",
        )
        source_type = next((kind for kind in source_types if isinstance(item.get(kind), dict)), None)
        source = item.get(source_type, {})
        destinations = source.get("destinations")
        row = {
            "sourceId": source_id,
            "input": item.get("input"),
            "sourceType": source_type,
            "feedLabel": source.get("feedLabel"),
            "language": source.get("contentLanguage"),
            "countries": source.get("countries"),
            "destinations": [
                {"destination": entry.get("destination"), "state": entry.get("state")}
                for entry in destinations if isinstance(entry, dict)
            ] if isinstance(destinations, list) else None,
        }
        rows.append(row)

    _emit({"marker": MARKER, "case": SOURCE_CASE, "result": "ok",
           "sourceCount": len(rows), "truncated": bool(data.get("nextPageToken")), "sources": rows})
    return 0


def _read_shopping_report(bearer, post=None):
    """Eine begrenzte ProductView-Lesestichprobe. Die Reports-API verlangt POST."""
    if post is None:
        import requests
        post = requests.post

    query = (
        "SELECT id, offer_id, language_code, feed_label, "
        "aggregated_reporting_context_status, item_issues "
        "FROM product_view WHERE reporting_context = 'SHOPPING_ADS' "
        "AND aggregated_reporting_context_status IN "
        "('ELIGIBLE_LIMITED', 'NOT_ELIGIBLE_OR_DISAPPROVED') LIMIT 25"
    )
    try:
        response = post(
            f"https://{API_HOST}/reports/v1/accounts/{ACCOUNT_ID}/reports:search",
            json={"query": query, "pageSize": 25},
            headers={"Authorization": "Bearer " + bearer, "Accept": "application/json"},
            timeout=20,
            allow_redirects=False,
        )
    except Exception:
        return _unknown(REPORT_CASE, "report_transport")

    if response.status_code != 200:
        known = {400: "http_400", 401: "http_401", 403: "http_403", 429: "http_429"}
        return _unknown(REPORT_CASE, known.get(response.status_code, "report_http_other"))

    try:
        data = response.json()
    except Exception:
        return _unknown(REPORT_CASE, "invalid_json")
    if not isinstance(data, dict):
        return _unknown(REPORT_CASE, "report_response_mismatch")
    rows = data.get("results", [])
    if not isinstance(rows, list) or len(rows) > 25:
        return _unknown(REPORT_CASE, "report_response_mismatch")

    results = []
    for row in rows:
        product = row.get("productView") if isinstance(row, dict) else None
        if not isinstance(product, dict) or not isinstance(product.get("offerId"), str):
            return _unknown(REPORT_CASE, "report_response_mismatch")
        issues = product.get("itemIssues", [])
        if not isinstance(issues, list) or not all(isinstance(issue, dict) for issue in issues):
            return _unknown(REPORT_CASE, "report_response_mismatch")
        results.append({
            "id": product.get("id"),
            "offerId": product["offerId"],
            "language": product.get("languageCode"),
            "feedLabel": product.get("feedLabel"),
            "status": product.get("aggregatedReportingContextStatus"),
            "issueCodes": [
                issue["type"].get("code") for issue in issues if isinstance(issue.get("type"), dict)
            ],
        })

    for row in results:
        _emit({"marker": MARKER, "case": REPORT_CASE, "result": "row", **row})
    _emit({"marker": MARKER, "case": REPORT_CASE, "result": "ok",
           "rowCount": len(results), "nextPageExists": bool(data.get("nextPageToken")),
           "boundedSample": True})
    return 0


def _reader(case, env, bearer, get=None, post=None):
    # Produktmodus vor jedem API-Aufruf oder Erneuern der Zugangsdaten absichern.
    if env.get("REGISTRIEREN", "").strip().lower() == "true":
        return _unknown(case, "registration_blocked")
    if env.get("MERCHANT_ID", "").strip() != ACCOUNT_ID:
        return _unknown(case, "account_input_mismatch")
    if case not in CASES and case not in (CSS_LIMIT_CASE, SOURCE_CASE, REPORT_CASE):
        return _unknown(case, "case_not_allowed")

    account_url = f"https://{API_HOST}/accounts/v1/accounts/{ACCOUNT_ID}"
    account, error = _get_json(account_url, bearer, get)
    if error:
        return _unknown(case, error)
    if not isinstance(account, dict) or account.get("accountId") != ACCOUNT_ID or account.get("name") != f"accounts/{ACCOUNT_ID}" or account.get("accountName") != ACCOUNT_NAME:
        return _unknown(case, "account_response_mismatch")

    if case == CSS_LIMIT_CASE:
        return _read_css_limit(bearer, get)
    if case == SOURCE_CASE:
        return _read_data_sources(bearer, get)
    if case == REPORT_CASE:
        return _read_shopping_report(bearer, post)

    spec = CASES[case]
    key = _encoded_product_key(spec)
    resource_name = f"accounts/{ACCOUNT_ID}/products/{key}"
    product_url = f"https://{API_HOST}/products/v1/{resource_name}"
    product, error = _get_json(product_url, bearer, get)
    if error:
        return _unknown(case, error)
    if not isinstance(product, dict):
        return _unknown(case, "product_response_mismatch")
    returned_name = product.get("name")
    accepted_names = {
        resource_name,
        f"accounts/{ACCOUNT_ID}/products/{spec['contentLanguage']}~{spec['feedLabel']}~{spec['offerId']}",
    }
    if (
        returned_name not in accepted_names
        or product.get("offerId") != spec["offerId"]
        or product.get("contentLanguage") != spec["contentLanguage"]
        or product.get("feedLabel") != spec["feedLabel"]
        or not isinstance(product.get("dataSource"), str)
        or not product["dataSource"].startswith(f"accounts/{ACCOUNT_ID}/dataSources/")
        or not product["dataSource"].rsplit("/", 1)[-1]
    ):
        return _unknown(case, "product_response_mismatch")

    attrs = product.get("productAttributes")
    if not isinstance(attrs, dict):
        return _unknown(case, "product_response_mismatch")
    status = product.get("productStatus")
    issues = status.get("itemLevelIssues") if isinstance(status, dict) else None
    issuecodes = None
    issue_state = "unknown"
    if isinstance(issues, list) and all(isinstance(x, dict) and isinstance(x.get("code"), str) for x in issues):
        issuecodes = [x["code"] for x in issues]
        issue_state = "known"

    source_destinations = status.get("destinationStatuses") if isinstance(status, dict) else None
    destinations = None
    destination_state = "unknown"
    if isinstance(source_destinations, list) and source_destinations:
        if all(isinstance(x, dict) and isinstance(x.get("reportingContext"), str) for x in source_destinations):
            destinations = []
            fields_present = True
            for d in source_destinations:
                row = {"reportingContext": d["reportingContext"]}
                for field in ("approvedCountries", "pendingCountries", "disapprovedCountries"):
                    value = d.get(field)
                    if field not in d or not isinstance(value, list) or not all(isinstance(code, str) for code in value):
                        row[field] = None
                        fields_present = False
                    else:
                        row[field] = value
                destinations.append(row)
            if fields_present:
                destination_state = "known"
    actualstatus = destinations if destination_state == "known" else None
    result = "read" if issue_state == "known" and destination_state == "known" else "partial_read"

    _emit({
        "marker": MARKER,
        "accountId": ACCOUNT_ID,
        "accountName": ACCOUNT_NAME,
        "case": case,
        "resourceName": returned_name,
        "offerId": product["offerId"],
        "lang": product["contentLanguage"],
        "feedLabel": product["feedLabel"],
        "dataSource": product["dataSource"],
        "title": attrs.get("title"),
        "link": attrs.get("link"),
        "imageLink": attrs.get("imageLink"),
        "price": attrs.get("price"),
        "availability": attrs.get("availability"),
        "result": result,
        "destinations": destinations,
        "destinationState": destination_state,
        "actualstatus": actualstatus,
        "issueState": issue_state,
        "issuecodes": issuecodes,
    })
    return 0 if result == "read" else 2


AUTH_URL = "https://oauth2.googleapis.com/token"


class AuthTransportError(Exception):
    """Abgewiesener OAuth-Aufruf ohne gespeicherte Antwortdaten."""


def _one_shot_oauth_request(request):
    """Begrenzt google-auth auf einen HTTPS-OAuth-POST ohne Weiterleitung oder Wiederholung."""
    calls = 0

    def call(url, method="GET", body=None, headers=None, **kwargs):
        nonlocal calls
        parsed = urlsplit(url)
        if (
            url != AUTH_URL
            or parsed.scheme != "https"
            or parsed.hostname != "oauth2.googleapis.com"
            or parsed.port not in (None, 443)
            or parsed.path != "/token"
            or parsed.query
            or parsed.fragment
            or method != "POST"
        ):
            raise AuthTransportError("blocked")
        if calls >= 1:
            raise AuthTransportError("one_shot")
        calls += 1
        # google-auth nimmt das Zeitlimit beim Aufruf entgegen. Die Session erhält
        # allow_redirects=False; ihr Adapter ist mit max_retries=0 eingebunden.
        return request(
            url,
            method=method,
            body=body,
            headers=headers,
            timeout=20,
            allow_redirects=False,
        )

    return call


def _make_google_auth_transport(request_class=None, requests_module=None, adapter_class=None):
    if request_class is None or requests_module is None or adapter_class is None:
        import requests
        from requests.adapters import HTTPAdapter
        from google.auth.transport.requests import Request
        request_class = request_class or Request
        requests_module = requests_module or requests
        adapter_class = adapter_class or HTTPAdapter

    session = requests_module.Session()
    session.trust_env = False
    session.mount("https://", adapter_class(max_retries=0))
    return _one_shot_oauth_request(request_class(session=session))


def _refresh_bearer(raw, credentials_factory=None, request_factory=None):
    """Erneuert Zugangsdaten mit injizierbaren Fabriken für Offline-Tests."""
    if not raw.strip():
        return None, "credentials_missing"
    try:
        info = json.loads(raw)
    except Exception:
        return None, "credentials_invalid"
    if (
        not isinstance(info, dict)
        or info.get("token_uri") != AUTH_URL
        or info.get("universe_domain", "googleapis.com") != "googleapis.com"
    ):
        return None, "auth_endpoint_blocked"
    try:
        if credentials_factory is None:
            from google.oauth2 import service_account
            credentials_factory = service_account.Credentials.from_service_account_info
        if request_factory is None:
            request_factory = _make_google_auth_transport
        credentials = credentials_factory(info, scopes=[SCOPE])
        auth_request = request_factory()
        auth_logger = logging.getLogger("google.auth.transport.requests")
        previous_level = auth_logger.level
        auth_logger.setLevel(logging.WARNING)
        try:
            credentials.refresh(auth_request)
        finally:
            auth_logger.setLevel(previous_level)
        bearer = credentials.token
        if not isinstance(bearer, str) or not bearer:
            return None, "auth_unknown"
        return bearer, None
    except Exception:
        # Keine Fehlertexte ausgeben: Antworten des Token-Endpunkts können Daten enthalten.
        return None, "auth_unknown"


def _reader_with_credentials(case, env, raw, credentials_factory=None, request_factory=None, get=None):
    if env.get("REGISTRIEREN", "").strip().lower() == "true":
        return _unknown(case, "registration_blocked")
    if env.get("MERCHANT_ID", "").strip() != ACCOUNT_ID:
        return _unknown(case, "account_input_mismatch")
    bearer, error = _refresh_bearer(raw, credentials_factory, request_factory)
    if error:
        return _unknown(case, error)
    return _reader(case, env, bearer, get)


def _reader_with_service_account(case, env):
    return _reader_with_credentials(case, env, env.get("GCP_SA_KEY", ""))


def kurz(t):
    return hashlib.sha256(str(t).encode()).hexdigest()[:8]


def fehlergrund(r):
    return _schwaerzen(_fehlergrund(r))


def _schwaerzen(s):
    mid = os.environ.get("MERCHANT_ID", "").strip()
    return s.replace(mid, "<konto>") if mid else s


def _fehlergrund(r):
    try:
        e = r.json().get("error", {})
    except Exception:
        return r.text[:120].replace("\n", " ")
    teile = [str(e.get("status", "")), str(e.get("message", ""))[:160]]
    for d in e.get("details", []) or []:
        if d.get("reason"):
            teile.append("reason=" + d["reason"])
        meta = d.get("metadata") or {}
        if meta.get("activationUrl"):
            teile.append("aktivieren: " + meta["activationUrl"])
    return " | ".join(t for t in teile if t)


def _legacy_main():
    # Bisherige Kontenprobe als Standardmodus erhalten.
    import requests
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
    roh = os.environ.get("GCP_SA_KEY", "")
    if not roh.strip():
        print("ERGEBNIS: GCP_SA_KEY fehlt in Actions"); return 2
    info = json.loads(roh)
    print("Dienstkonto:", info.get("client_email", "?"), "| Projekt:", info.get("project_id", "?"))
    cred = service_account.Credentials.from_service_account_info(info, scopes=[SCOPE])
    cred.refresh(Request())
    h = {"Authorization": "Bearer " + cred.token}
    befunde = {}
    mid = os.environ.get("MERCHANT_ID", "").strip()
    if os.environ.get("REGISTRIEREN") == "true":
        if not mid.isdigit():
            print("REGISTRIEREN: abgebrochen, MERCHANT_ID fehlt oder ist keine Zahl"); return 2
        url = f"https://merchantapi.googleapis.com/accounts/v1/accounts/{mid}/developerRegistration:registerGcp"
        r = requests.post(url, headers={**h, "Content-Type": "application/json"}, json={}, timeout=30)
        if r.status_code == 200:
            print("registerGcp: HTTP 200 (Projekt angemeldet)")
        else:
            print(f"registerGcp: HTTP {r.status_code} | {fehlergrund(r)}")
    proben = [
        ("merchantapi_accounts_v1", "https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50"),
        ("merchantapi_accounts_v1beta", "https://merchantapi.googleapis.com/accounts/v1beta/accounts?pageSize=50"),
        ("content_authinfo", "https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo"),
    ]
    for name, url in proben:
        try:
            r = requests.get(url, headers=h, timeout=30)
        except Exception as ex:
            print(f"{name}: NETZFEHLER {type(ex).__name__}"); befunde[name] = ("netz", 0); continue
        if r.status_code == 200:
            j = r.json()
            konten = j.get("accounts") or j.get("accountIdentifiers") or []
            ids = [k.get("accountId") or k.get("merchantId") or k.get("aggregatorId") or k.get("name") for k in konten]
            print(f"{name}: HTTP 200, Konten sichtbar: {len(konten)} (Kennungen gekürzt: {[kurz(i) for i in ids]})")
            befunde[name] = ("ok", len(konten))
        else:
            print(f"{name}: HTTP {r.status_code} | {fehlergrund(r)}")
            befunde[name] = ("http", r.status_code)
    sichtbar = any(art == "ok" and n > 0 for art, n in befunde.values())
    print("ERGEBNIS:", "Zugang vorhanden" if sichtbar else "kein Konto sichtbar (API aus oder Dienstkonto nicht im Merchant Center eingetragen)")
    return 0


def main():
    env = os.environ
    case = env.get("MERCHANT_CASE", "account-probe").strip() or "account-probe"
    if case == "account-probe":
        return _legacy_main()
    if case not in CASES and case not in (CSS_LIMIT_CASE, SOURCE_CASE, REPORT_CASE):
        return _unknown(case, "case_not_allowed")
    # Unzulässige Eingaben vor dem Lesen oder Erneuern der Zugangsdaten abweisen.
    if env.get("REGISTRIEREN", "").strip().lower() == "true":
        return _unknown(case, "registration_blocked")
    if env.get("MERCHANT_ID", "").strip() != ACCOUNT_ID:
        return _unknown(case, "account_input_mismatch")
    return _reader_with_service_account(case, env)


if __name__ == "__main__":
    sys.exit(main())
