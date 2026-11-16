# R257 – Lokaler CJ-Pagination-Prüfentwurf

Nicht deployt, nicht in einen Publisher eingebaut, keine Installationen oder neuen Zeitpläne. Er prüft gespeicherte Antworten und sendet selbst keine API-Anfragen. Der beobachtete Schnittstellenfehler bleibt offen. Bei einer Guard-Ausnahme muss der Aufrufer stoppen und den Befund prüfen; keine automatische Retry- oder Schreiblogik.

Die echte zweite Anfrage lieferte wieder pageNum1. Eine synthetische korrekte zweite Seite mit neuen String-Identitäten wird akzeptiert. Eine leere Seite ist nur bei vollständig gelesenem Total ein Abschluss; fehlend, null, negativ, Bool und Float sind unbekannt und werden verworfen. Fehlermarker dürfen beim Entfernen von Preis-/Supplierfeldern nicht verschwinden.

Quelle des lokalen Codes: pagination-guard/connection_pagination_guard.py. SHA256:39c3eed6900cc99c6d85cc7feef07950267bdb450d98491aa360ffd5bfa03f97. 20 boolesche lokale Prüfaussagen bestanden; der Mutationsgegenbeweis nach Entfernen der Total-Schutzbedingung schlägt jetzt zuverlässig fehl. Kein Voll-CI- oder produktiver Ausführungsbeleg.

```python
"""Local, non-deployed guard for paginated CJ connection responses."""
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Tuple


Identity = Tuple[str, str, str]


class PaginationGuardError(ValueError):
    pass


def _identity(row: Dict[str, Any]) -> Identity:
    keys = ("shopId", "platformProductId", "platformVariantId")
    vals = tuple(row.get(k) for k in keys)
    if not all(type(v) is str and v.strip() and v == v.strip() for v in vals):
        raise PaginationGuardError("row has unknown/missing identity fields")
    return vals  # type: ignore[return-value]


@dataclass
class PaginationGuard:
    seen: set = field(default_factory=set)
    next_page: int = 1
    stopped: bool = False
    total: int = None

    def accept(self, requested_page: int, response: Dict[str, Any]) -> str:
        """Validate one page, returning CONTINUE or END; malformed data raises."""
        if self.stopped:
            raise PaginationGuardError("pagination already stopped")
        if type(requested_page) is not int or requested_page <= 0:
            raise PaginationGuardError("requested page must be a positive integer")
        if requested_page != self.next_page:
            raise PaginationGuardError("requested page is not the expected next page")
        if not isinstance(response, dict) or response.get("isError") is True:
            raise PaginationGuardError("unknown or error response; cannot treat as empty page")
        if "isError" in response and type(response["isError"]) is not bool:
            raise PaginationGuardError("isError flag has unknown type")
        if response.get("error") or response.get("errors"):
            raise PaginationGuardError("error payload cannot be treated as a page")
        if "pageNum" not in response or "list" not in response or "total" not in response:
            raise PaginationGuardError("unknown response shape")
        if type(response["pageNum"]) is not int or response["pageNum"] <= 0:
            raise PaginationGuardError("returned pageNum must be a positive integer")
        if response["pageNum"] != requested_page:
            raise PaginationGuardError("returned pageNum does not match requested page")
        total = response["total"]
        if type(total) is not int or total < 0:
            raise PaginationGuardError("total must be a non-negative integer")
        if self.total is not None and total != self.total:
            raise PaginationGuardError("total changed between pages")
        if self.total is None:
            self.total = total
        rows = response["list"]
        if not isinstance(rows, list):
            raise PaginationGuardError("list field is not a list")
        page_ids = [_identity(row) for row in rows if isinstance(row, dict)]
        if len(page_ids) != len(rows):
            raise PaginationGuardError("unknown row shape")
        if len(set(page_ids)) != len(page_ids):
            raise PaginationGuardError("duplicate identities within page; continuation blocked")
        if any(key in self.seen for key in page_ids):
            raise PaginationGuardError("repeated identity across pages; continuation blocked")
        if len(self.seen) + len(page_ids) > total:
            raise PaginationGuardError("rows exceed declared total")
        if not rows:
            if len(self.seen) != total:
                raise PaginationGuardError("empty page before declared total was fully read")
            self.stopped = True
            return "END"
        self.seen.update(page_ids)
        self.next_page += 1
        return "CONTINUE"


def run_probes(raw: Dict[str, Any]) -> Dict[str, Any]:
    page1, page2 = raw.get("page1"), raw.get("page2")
    if not isinstance(page1, dict) or not isinstance(page2, dict):
        raise PaginationGuardError("probe fixture missing page1/page2")
    # Strip supplier/commercial fields; only page and row identities enter validation.
    def scrub(p):
        rows = p.get("list")
        if isinstance(rows, list):
            rows = [({k: row.get(k) for k in ("shopId", "platformProductId", "platformVariantId")} if isinstance(row, dict) else row) for row in rows]
        result = {k:p[k] for k in ("pageNum", "total", "isError", "error", "errors") if k in p}
        if "list" in p:
            result["list"] = rows
        return result
    g = PaginationGuard()
    first = g.accept(1, scrub(page1))
    actual_page2_result = "BLOCKED"
    try:
        g.accept(2, scrub(page2))
    except PaginationGuardError as e:
        actual_page2_result = str(e)

    def expect_block(fn):
        try:
            fn()
        except PaginationGuardError:
            return True
        return False

    # A well-formed, distinct second page proceeds; an empty matching page ends.
    valid = PaginationGuard()
    distinct1 = {"pageNum": 1, "total": 2, "list": [{"shopId":"s","platformProductId":"p1","platformVariantId":"v1"}]}
    distinct2 = {"pageNum": 2, "total": 2, "list": [{"shopId":"s","platformProductId":"p2","platformVariantId":"v2"}]}
    valid.accept(1, distinct1)
    valid_second = valid.accept(2, distinct2)
    empty = PaginationGuard()
    empty_end = empty.accept(1, {"pageNum":1,"total":0,"list":[]})
    read_then_empty = PaginationGuard()
    read_then_empty.accept(1, {"pageNum":1,"total":1,"list":[{"shopId":"s","platformProductId":"p","platformVariantId":"v"}]})
    empty_after_total = read_then_empty.accept(2, {"pageNum":2,"total":1,"list":[]})
    incomplete_empty = PaginationGuard()
    incomplete_empty.accept(1, {"pageNum":1,"total":2,"list":[{"shopId":"s","platformProductId":"p","platformVariantId":"v"}]})
    empty_before_total = expect_block(lambda: incomplete_empty.accept(2, {"pageNum":2,"total":2,"list":[]}))
    # Explicit duplicate tests: same returned page number and repeated row.
    dup_page = PaginationGuard()
    dup_page.accept(1, distinct1)
    duplicate_same_page = expect_block(lambda: dup_page.accept(2, {"pageNum":1,"total":2,"list":distinct1["list"]}))
    duplicate_rows = PaginationGuard()
    duplicate_rows.accept(1, distinct1)
    duplicate_identity = expect_block(lambda: duplicate_rows.accept(2, {"pageNum":2,"total":2,"list":distinct1["list"]}))
    error_case = expect_block(lambda: PaginationGuard().accept(1, {"isError":True,"pageNum":1,"total":0,"list":[]}))
    # Ensure the wrapper preserves an MCP error marker instead of scrubbing it away.
    error_wrapped = expect_block(lambda: PaginationGuard().accept(1, scrub({"isError":True,"pageNum":1,"total":0,"list":[]})))
    unknown_case = expect_block(lambda: PaginationGuard().accept(1, {"pageNum":1,"total":0,"unexpected":[]}))
    wrong_page_case = expect_block(lambda: PaginationGuard().accept(1, {"pageNum":2,"total":0,"list":[]}))
    bad_requested_page = expect_block(lambda: PaginationGuard().accept(True, {"pageNum":True,"total":0,"list":[]}))
    bad_identity_types = expect_block(lambda: PaginationGuard().accept(1, {"pageNum":1,"total":1,"list":[{"shopId":2,"platformProductId":"p","platformVariantId":"v"}]}))
    bad_total_cases = [None, -1, True, 1.0]
    bad_totals_blocked = all(expect_block(lambda x=x: PaginationGuard().accept(1, {"pageNum":1,"total":x,"list":[]})) for x in bad_total_cases)
    missing_total = expect_block(lambda: PaginationGuard().accept(1,{"pageNum":1,"list":[]}))
    missing_list_wrapped = expect_block(lambda: PaginationGuard().accept(1,scrub({"pageNum":1,"total":0})))
    returned_bool_page = expect_block(lambda: PaginationGuard().accept(1,{"pageNum":True,"total":0,"list":[]}))
    changed_total = PaginationGuard()
    changed_total.accept(1,distinct1)
    changed_total_blocked = expect_block(lambda: changed_total.accept(2,{**distinct2,"total":3}))
    error_payload_wrapped = expect_block(lambda: PaginationGuard().accept(1,scrub({"pageNum":1,"total":0,"list":[],"error":"auth"})))
    checks = {
            "actual_probe_page1_allows_first_page": first == "CONTINUE",
            "actual_probe_page2_blocked": actual_page2_result != "BLOCKED",
            "actual_probe_page2_reason": actual_page2_result,
            "synthetic_distinct_second_page_continues": valid_second == "CONTINUE",
            "matching_empty_page_ends": empty_end == "END",
            "empty_after_all_rows_ends": empty_after_total == "END",
            "empty_before_total_blocked": empty_before_total,
            "same_page_number_duplicate_blocked": duplicate_same_page,
            "repeated_identity_blocked": duplicate_identity,
            "isError_blocked": error_case,
            "wrapper_preserves_isError": error_wrapped,
            "unknown_shape_blocked": unknown_case,
            "wrong_page_number_blocked": wrong_page_case,
            "bool_requested_page_blocked": bad_requested_page,
            "non_string_identity_blocked": bad_identity_types,
            "missing_null_negative_bool_float_total_blocked": bad_totals_blocked,
            "missing_total_blocked": missing_total,
            "wrapper_preserves_missing_list": missing_list_wrapped,
            "returned_bool_page_blocked": returned_bool_page,
            "changed_total_blocked": changed_total_blocked,
            "wrapper_preserves_error_payload": error_payload_wrapped,
        }
    return {
        "status": "PASS" if all(v for v in checks.values() if type(v) is bool) else "FAIL",
        "checks": checks,
        "scope": "Local fixture validation only; no API calls, no supplier values retained in output, not deployed.",
    }

```

Prüfbeleg:

```json
{
  "tests": {
    "status": "PASS",
    "checks": {
      "actual_probe_page1_allows_first_page": true,
      "actual_probe_page2_blocked": true,
      "actual_probe_page2_reason": "returned pageNum does not match requested page",
      "synthetic_distinct_second_page_continues": true,
      "matching_empty_page_ends": true,
      "empty_after_all_rows_ends": true,
      "empty_before_total_blocked": true,
      "same_page_number_duplicate_blocked": true,
      "repeated_identity_blocked": true,
      "isError_blocked": true,
      "wrapper_preserves_isError": true,
      "unknown_shape_blocked": true,
      "wrong_page_number_blocked": true,
      "bool_requested_page_blocked": true,
      "non_string_identity_blocked": true,
      "missing_null_negative_bool_float_total_blocked": true,
      "missing_total_blocked": true,
      "wrapper_preserves_missing_list": true,
      "returned_bool_page_blocked": true,
      "changed_total_blocked": true,
      "wrapper_preserves_error_payload": true
    },
    "scope": "Local fixture validation only; no API calls, no supplier values retained in output, not deployed."
  },
  "mutation": {
    "mutation": "removed empty-before-total rejection",
    "reportedStatus": "FAIL",
    "criticalCheck": false,
    "mutantRejected": true,
    "oldFalseGreenReproducedBeforeFix": true,
    "realApiCallsByThisTest": 0
  }
}
```
