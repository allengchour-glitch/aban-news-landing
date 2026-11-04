#!/usr/bin/env python3
"""Build a complete, read-only LuxeStyle product review queue.

The queue joins historical offline audit evidence. It never calls Shopify or
Merchant APIs and never marks a historical signal as a current live defect.
"""

from __future__ import annotations

from collections import Counter, defaultdict
import csv
import gzip
import hashlib
import json
from pathlib import Path
import re
from typing import Any


AUDIT = Path("/workspace/luxestyle-review/full-audit-20261104")
EXPORT = Path("/workspace/luxestyle-review/produkttexte-20261026/katalog/active-products.jsonl")
OUT = Path("/workspace/luxestyle-review/catalog-improvement-20261104")
OUT.mkdir(parents=True, exist_ok=True)

REPORTS = {
    name: AUDIT / f"{name}-report.json"
    for name in ("materials", "taxonomy", "title-variant", "commerce", "merchant")
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def product_id(value: Any) -> str:
    return str(value).rsplit("/", 1)[-1]


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


materials = load(REPORTS["materials"])
taxonomy = load(REPORTS["taxonomy"])
titles = load(REPORTS["title-variant"])
commerce = load(REPORTS["commerce"])

signals: dict[str, list[dict[str, Any]]] = defaultdict(list)


def add(pid: str, source: str, group: str, code: str, level: str,
        evidence: Any, action: str, confidence: str | None = None) -> None:
    item = {
        "source": source,
        "group": group,
        "code": code,
        "level": level,
        "evidence": evidence,
        "requiredAction": action,
    }
    if confidence:
        item["confidence"] = confidence
    key = (source, code, json.dumps(evidence, ensure_ascii=False, sort_keys=True))
    if not any((old["source"], old["code"], json.dumps(old["evidence"], ensure_ascii=False, sort_keys=True)) == key
               for old in signals[pid]):
        signals[pid].append(item)


P0_CODES = {
    "MEDICAL_OR_THERAPEUTIC_CLAIM",
    "MEDICAL_TAG_REVIEW_NEEDED",
    "ADULT_OR_18PLUS_REVIEW_NEEDED",
    "REVIEW_OR_POPULARITY_CLAIM",
}
P1_CODES = {
    "POTENTIAL_MATERIAL_COMPONENT_CONFLICT",
    "MULTIPLE_DIFFERENT_MATERIAL_LINES",
    "ABSOLUTE_MATERIAL_WITH_MULTIPLE_MATERIALS",
    "TITLE_BODY_MATERIAL_MISMATCH",
    "RIGHTS_BRAND_OR_CHARACTER_REVIEW_NEEDED",
    "DUPLICATE_VISIBLE_BLOCK",
    "WATERPROOF_CONTRADICTION",
    "WIRELESS_WIRED_CONTRADICTION",
    "DISPOSABLE_REUSABLE_CONTRADICTION",
    "ABSOLUTE_PERFORMANCE_CLAIM",
    "MANY_DIMENSION_SETS",
}

group_for_code = {
    "FIXED_DELIVERY_WINDOW": "delivery_and_trust_claims",
    "GENERIC_VERIFIED_CLAIM": "delivery_and_trust_claims",
    "SOCIAL_BLOCK_TAG_PRESENT": "social_guard",
    "RIGHTS_BRAND_OR_CHARACTER_REVIEW_NEEDED": "rights_review",
    "ADULT_OR_18PLUS_REVIEW_NEEDED": "policy_and_age_review",
    "MEDICAL_TAG_REVIEW_NEEDED": "medical_and_policy_review",
    "MEDICAL_OR_THERAPEUTIC_CLAIM": "medical_and_policy_review",
    "REVIEW_OR_POPULARITY_CLAIM": "unsupported_social_proof",
    "POTENTIAL_MATERIAL_COMPONENT_CONFLICT": "material_and_components",
    "MULTIPLE_DIFFERENT_MATERIAL_LINES": "material_and_components",
    "ABSOLUTE_MATERIAL_WITH_MULTIPLE_MATERIALS": "material_and_components",
    "TITLE_BODY_MATERIAL_MISMATCH": "material_and_components",
    "MANY_DIMENSION_SETS": "measurement_scope",
    "DUPLICATE_VISIBLE_BLOCK": "copy_quality",
    "WATERPROOF_CONTRADICTION": "claim_contradiction",
    "WIRELESS_WIRED_CONTRADICTION": "claim_contradiction",
    "DISPOSABLE_REUSABLE_CONTRADICTION": "claim_contradiction",
    "ABSOLUTE_PERFORMANCE_CLAIM": "performance_claim",
}

detailed_material: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
for record in materials.get("materialCandidates", []):
    pid = product_id(record["id"])
    for issue in record.get("materialIssues", []):
        detailed_material[pid][issue["code"]] = issue
for record in materials.get("prioritizedHighRiskProducts", []):
    pid = product_id(record["id"])
    for issue in record.get("issues", []):
        detailed_material[pid][issue["code"]] = issue

for record in materials["findingIndex"]:
    pid = product_id(record["id"])
    for code in record["issueCodes"]:
        detail = detailed_material.get(pid, {}).get(code)
        if detail:
            evidence = detail.get("evidence")
            severity = detail.get("severity")
            note = detail.get("note")
        else:
            evidence = {
                "snapshotIssueCode": code,
                "recordUpdatedAt": record.get("updatedAt"),
                "detail": "Exact rule hit is recorded in materials-report.findingIndex; a detailed excerpt is not materialized for every medium rule.",
            }
            severity = "critical" if code in P0_CODES else "high" if code in P1_CODES else "medium"
            note = None
        level = "P0" if code in P0_CODES or severity == "critical" else "P1" if code in P1_CODES or severity == "high" else "P2"
        action = (
            "Keep blocked from claims or promotion; verify current product, policy and supplier evidence before any field change."
            if level == "P0" else
            "Read the current product and source evidence, then prepare only a field-level correction diff."
            if level == "P1" else
            "Preserve guards and verify the dated service or copy signal during routine live review."
        )
        add(pid, "materials-report.json", group_for_code.get(code, "copy_quality"), code, level,
            {"detail": evidence, "auditNote": note} if note else evidence, action,
            confidence="historical_rule_hit")

# Historical taxonomy findings.
for record in taxonomy.get("highConfidenceFindings", []):
    pid = product_id(record["productId"])
    add(pid, "taxonomy-report.json", "taxonomy", "HIGH_CONFIDENCE_PRODUCT_TYPE_OR_TAG_MISMATCH", "P1", record,
        "Verify current product function, variants, tags and official taxonomy ID; prepare a minimal taxonomy/tag diff.", "high_historical")
for record in taxonomy.get("reviewNeededFindings", []):
    pid = product_id(record["productId"])
    add(pid, "taxonomy-report.json", "taxonomy", "TAXONOMY_TENSION_REVIEW_NEEDED", "P2", record,
        "Review current product purpose and category; do not reclassify from the historical tag alone.", "review_needed")
current_exact = taxonomy.get("currentExactFinding")
if current_exact:
    add(product_id(current_exact["productId"]), "taxonomy-report.json", "taxonomy",
        "CURRENT_EXACT_SHOPIFY_GOOGLE_CATEGORY_MISMATCH", "P1", current_exact,
        "Re-read current fields and select an official target category ID before any write.", "current_exact_at_report_time")

# Title and option-language findings.
for record in titles.get("findings", []):
    pid = product_id(record["productId"])
    level = "P1" if str(record.get("confidence", "")).upper() == "HIGH" else "P2"
    add(pid, "title-variant-report.json", "title_variant", record["code"], level, record.get("evidence"),
        "Read the complete current option and variant matrix; correct only wording that is demonstrably inconsistent.",
        str(record.get("confidence", "unknown")).lower())

# Commerce P1 findings and confirmed option-value collisions.
for record in commerce.get("optionAudit", {}).get("confirmedCaseInsensitiveDuplicateOptionValueProducts", []):
    add(product_id(record["productId"]), "commerce-report.json", "variant_identity",
        "CASE_INSENSITIVE_DUPLICATE_OPTION_VALUES", "P1", record,
        "Bind each label to variant IDs and SKUs before renaming or merging values.", "confirmed_historical_snapshot")
for finding in commerce.get("priorityFindings", []):
    if finding.get("priority") != "P1":
        continue
    for pid in finding.get("products", []):
        add(product_id(pid), "commerce-report.json", "commerce_identity", finding["code"], "P1",
            {"finding": finding["finding"], "affected": finding["affected"]}, finding["next"], "bounded_sample")

# Duplicate titles are recomputed over the full export below and added before output.

# Merchant latest-series rows are rejoined to products, preserving context rather than summing countries.
def stamp(path: Path) -> str | None:
    match = re.search(r"(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})", path.name)
    return match.group(1) + "T" + ":".join(match.groups()[1:]) if match else None


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


issue_paths = sorted(Path("/workspace").rglob("product_issues_*.csv"))
unique: dict[str, Path] = {}
for path in issue_paths:
    digest = sha256(path)
    candidate = unique.get(digest)
    if candidate is None or str(path) < str(candidate):
        unique[digest] = path
latest_paths = [path for path in unique.values() if (stamp(path) or "") >= "2026-11-02T12:41:30"]
merchant_by_product: dict[str, dict[str, Any]] = defaultdict(lambda: defaultdict(lambda: {
    "offers": set(), "contexts": set(), "examples": [], "severities": set(), "statuses": set(),
}))
merchant_unmapped = set()
for path in sorted(latest_paths):
    for row in read_csv(path):
        match = re.search(r"(?:shopify_[A-Z]{2}_)?(\d{10,})_", row["Item ID"])
        if not match:
            merchant_unmapped.add(row["Item ID"])
            continue
        pid = match.group(1)
        issue = row["Issue title"]
        item = merchant_by_product[pid][issue]
        item["offers"].add(row["Item ID"])
        item["contexts"].add((row["Language"], row["Country"], row["Traffic type"]))
        item["severities"].add(row["Issue severity"])
        item["statuses"].add(row["Item status"])
        example = {"offerId": row["Item ID"], "title": row["Title"]}
        if example not in item["examples"] and len(item["examples"]) < 3:
            item["examples"].append(example)

merchant_data_errors = {
    "Missing product price", "Missing attribute: [availability]", "Broken image link",
    "Product page unavailable", "Image too small", "Promotional overlay on image",
}
merchant_capacity = {
    "Over capacity for Shopping ads (in CSS program)",
    "Shopping ads quota limit reached (outside of CSS program)",
    "Missing shipping info in some countries",
}
for pid, issues in merchant_by_product.items():
    for issue, item in issues.items():
        if issue in merchant_data_errors:
            level, group, action = "P1", "merchant_product_data", "Identify the active source and submitted raw value; compare it with the current Shopify variant, URL and image before a source-specific fix."
        elif issue in merchant_capacity:
            level, group, action = "P2", "merchant_account_or_scope", "Keep separate from product copy; verify account, source, target country and program capacity."
        else:
            level, group, action = "P0", "merchant_policy_review", "Review the exact product and policy classification; do not evade policy or assume a false positive."
        evidence = {
            "issueTitle": issue,
            "uniqueOfferCountForProduct": len(item["offers"]),
            "contexts": [dict(zip(("language", "country", "trafficType"), values)) for values in sorted(item["contexts"])],
            "issueSeverities": sorted(item["severities"]),
            "itemStatuses": sorted(item["statuses"]),
            "examples": item["examples"],
            "sourceWindow": ["2026-11-02T12:41:30", "2026-11-02T13:04:55"],
        }
        add(pid, "user-supplied Merchant CSV latest filtered series", group, issue, level, evidence, action, "historical_csv_observation")

# Read all historical active products once and compute full duplicate-title groups.
products: list[dict[str, Any]] = []
title_groups: dict[str, list[str]] = defaultdict(list)
with EXPORT.open(encoding="utf-8") as stream:
    for line_number, line in enumerate(stream, 1):
        record = json.loads(line)
        pid = product_id(record["id"])
        record["_pid"] = pid
        record["_sourceLine"] = line_number
        products.append(record)
        title_groups[record.get("title", "").strip()].append(pid)

for title, pids in title_groups.items():
    if title and len(pids) > 1:
        for pid in pids:
            add(pid, "historical active-products.jsonl", "discoverability_identity", "DUPLICATE_TITLE_GROUP", "P2",
                {"title": title, "groupSize": len(pids), "productIds": pids},
                "Compare current images, variants and supplier IDs; change a title only when offers are genuinely distinct.", "historical_exact_title")

all_product_ids = {record["_pid"] for record in products}
merchant_mapped_not_in_snapshot = sorted(set(merchant_by_product) - all_product_ids)

live_profiles = {
    "FULL_PRODUCT_SOURCE_V1": [
        "id", "status", "updatedAt", "title", "handle", "descriptionHtml", "productType", "tags",
        "category{id,name,fullName}", "google_product_category metafield", "options{name,values}",
        "variants{id,title,selectedOptions,sku,price,availableForSale,inventoryPolicy,inventoryItem{tracked}}",
        "media{id,status,alt,dimensions,source}", "resourcePublications/isPublished", "Storefront product and selected variant availability",
        "supplier source per claimed material, measurement, function and compatibility",
    ]
}

score_by_level = {"P0": 100, "P1": 50, "P2": 10}
queue = []
for record in products:
    pid = record["_pid"]
    item_signals = signals.get(pid, [])
    if not item_signals:
        item_signals = [{
            "source": "historical active-products.jsonl plus R81 rule reports",
            "group": "baseline_review",
            "code": "NO_SPECIFIC_SIGNAL_IN_AVAILABLE_OFFLINE_RULES",
            "level": "P2",
            "confidence": "historical_scope_only",
            "evidence": {"sourceLine": record["_sourceLine"], "snapshotUpdatedAt": record.get("updatedAt")},
            "requiredAction": "No change is justified from this scan alone; include in routine current-state QA.",
        }]
    levels = [entry["level"] for entry in item_signals]
    priority = min(levels, key=lambda level: ("P0", "P1", "P2").index(level))
    groups = sorted({entry["group"] for entry in item_signals})
    codes = sorted({entry["code"] for entry in item_signals})
    score = max(score_by_level[level] for level in levels) + min(49, len(codes))
    if priority == "P0":
        recommendation = "Immediate evidence review: keep relevant policy, social and claim guards; verify live product and supplier/policy evidence before any minimal diff."
    elif priority == "P1":
        recommendation = "Priority live verification: read complete current product, variant, image and source fields; prepare a field-level diff only for confirmed discrepancies."
    else:
        recommendation = "Routine live QA: historical signals or absence of a high signal do not justify a write. Preserve existing guards and change only a confirmed current discrepancy."
    queue.append({
        "schemaVersion": "luxestyle-product-review-queue-v1",
        "productId": pid,
        "gid": record["id"],
        "title": record.get("title"),
        "handle": record.get("handle"),
        "productType": record.get("productType"),
        "historicalStatus": record.get("status"),
        "snapshotUpdatedAt": record.get("updatedAt"),
        "snapshotSourceLine": record["_sourceLine"],
        "snapshotState": "HISTORICAL_NEEDS_CURRENT_LIVE_VERIFICATION",
        "priority": priority,
        "priorityScore": score,
        "signalGroups": groups,
        "signalCodes": codes,
        "signals": sorted(item_signals, key=lambda entry: (("P0", "P1", "P2").index(entry["level"]), entry["group"], entry["code"])),
        "requiredLiveProfile": "FULL_PRODUCT_SOURCE_V1",
        "requiredLiveFields": live_profiles["FULL_PRODUCT_SOURCE_V1"],
        "recommendedAction": recommendation,
        "autoFixAllowed": False,
    })

queue.sort(key=lambda item: (("P0", "P1", "P2").index(item["priority"]), -item["priorityScore"], item["snapshotUpdatedAt"] or "", item["productId"]))

queue_path = OUT / "PRODUCT-REVIEW-QUEUE.jsonl"
with queue_path.open("w", encoding="utf-8") as stream:
    for item in queue:
        stream.write(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n")

compressed_queue_path = OUT / "PRODUCT-REVIEW-QUEUE.jsonl.gz"
with queue_path.open("rb") as source, compressed_queue_path.open("wb") as raw_target:
    with gzip.GzipFile(filename="PRODUCT-REVIEW-QUEUE.jsonl", mode="wb", fileobj=raw_target, mtime=0, compresslevel=9) as target:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            target.write(chunk)

priority_counts = Counter(item["priority"] for item in queue)
group_counts = Counter(group for item in queue for group in item["signalGroups"])
code_counts = Counter(code for item in queue for code in item["signalCodes"])
summary = {
    "schemaVersion": "luxestyle-product-review-queue-summary-v1",
    "mode": "historical_offline_read_only",
    "generatedFrom": {
        "activeExport": {"path": str(EXPORT), "sha256": sha256(EXPORT), "rows": len(products)},
        "reports": {name: {"path": str(path), "sha256": sha256(path)} for name, path in REPORTS.items()},
        "merchantLatestUniqueCsvBlobs": len(latest_paths),
    },
    "interpretation": [
        "Every historical active product appears exactly once.",
        "Priority is a review order, not a current live error or severity verdict.",
        "No automatic fix is allowed; every row requires a current live and, where relevant, supplier or policy check.",
        "P0 means immediate evidence and compliance review, P1 means priority data review, P2 means routine review.",
        "Products with no specific offline rule hit remain P2 and are not certified error-free.",
    ],
    "queue": {
        "path": str(queue_path),
        "sha256": sha256(queue_path),
        "compressedPath": str(compressed_queue_path),
        "compressedSha256": sha256(compressed_queue_path),
        "rows": len(queue),
        "uniqueProductIds": len({item["productId"] for item in queue}),
        "priorityCounts": dict(sorted(priority_counts.items())),
        "signalGroupCounts": dict(group_counts.most_common()),
        "signalCodeCounts": dict(code_counts.most_common()),
        "autoFixAllowedTrue": sum(item["autoFixAllowed"] for item in queue),
    },
    "merchant": {
        "parsedProductIdsInLatestSeries": len(merchant_by_product),
        "parsedProductIdsNotInHistoricalActiveSnapshot": merchant_mapped_not_in_snapshot,
        "opaqueOfferIdsWithoutProductBinding": len(merchant_unmapped),
    },
    "requiredLiveProfiles": live_profiles,
    "firstBatch": {
        "path": str(OUT / "LIVE-BATCH-01-50.json"),
        "selection": "first 50 queue rows by deterministic priority order; read-only current verification required",
    },
}

(OUT / "LIVE-BATCH-01-50.json").write_text(json.dumps(queue[:50], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
summary["firstBatch"]["sha256"] = sha256(OUT / "LIVE-BATCH-01-50.json")
(OUT / "SUMMARY.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

lines = [
    "# LuxeStyle Produkt-Prüfwarteschlange – 04.11.2026", "",
    "Vollständige, deduplizierte Offline-Warteschlange für den belegten historischen ACTIVE-Export. Sie enthält jedes der 56’630 Produkte genau einmal. Sie ist kein aktueller Shopify-Vollscan, keine Live-Fehlerquote und keine Schreibfreigabe.", "",
    "## Ergebnis", "",
    f"- Produkte: **{len(queue):,}**".replace(",", "’"),
    f"- P0 Sofortige Evidenz-/Complianceprüfung: **{priority_counts['P0']:,}**".replace(",", "’"),
    f"- P1 Priorisierte Datenprüfung: **{priority_counts['P1']:,}**".replace(",", "’"),
    f"- P2 Routinemässige aktuelle Prüfung: **{priority_counts['P2']:,}**".replace(",", "’"),
    "- `autoFixAllowed=true`: **0**", "",
    "P0/P1/P2 ordnen die aktuelle Gegenprüfung. Sie behaupten nicht, dass ein historischer Kandidat heute noch unverändert live oder definitiv falsch ist. Auch P2-Produkte ohne spezifischen Treffer sind nicht als fehlerfrei zertifiziert.", "",
    "## Grösste Signalgruppen", "",
    "| Signalgruppe | Produkte |", "|---|---:|",
]
for group, count in group_counts.most_common(15):
    lines.append(f"| `{group}` | {count:,} |".replace(",", "’"))
lines += ["", "## Sichere Arbeitsweise", "",
    "1. Nur kleine explizite Live-Stapel lesen; der erste deterministische 50er-Stapel liegt separat vor.",
    "2. Pro Produkt vollständige Varianten, SKUs, Preise, Bilder, Tags, Tracking/Policy, Storefront und offizielle Taxonomie lesen.",
    "3. Material, Masse, Funktion, Kompatibilität, medizinische Aussagen und Rechte gegen eine echte modell-/variantenbezogene Quelle prüfen.",
    "4. Erst danach einen minimalen Felddiff erstellen. Kein Queue-Eintrag erlaubt automatische Änderungen.",
    "5. Historische Merchant-Zeilen nach aktiver Quelle, Zielland, Sprache und Marketingmethode getrennt halten.", "",
    "## Dateien", "",
    f"- `PRODUCT-REVIEW-QUEUE.jsonl` – {len(queue):,} Zeilen – SHA-256 `{sha256(queue_path)}`".replace(",", "’"),
    f"- `PRODUCT-REVIEW-QUEUE.jsonl.gz` – komprimierte, inhaltsgleiche Warteschlange – SHA-256 `{sha256(compressed_queue_path)}`",
    f"- `LIVE-BATCH-01-50.json` – SHA-256 `{summary['firstBatch']['sha256']}`",
    "- `SUMMARY.json` – maschinenlesbare Definitionen, Abdeckung und Zähler",
    "- `build_product_review_queue.py` – reproduzierbarer Builder", "",
]
(OUT / "SUMMARY.md").write_text("\n".join(lines), encoding="utf-8")

print(json.dumps({
    "rows": len(queue),
    "uniqueProductIds": len({item["productId"] for item in queue}),
    "priorities": dict(priority_counts),
    "queueSha256": sha256(queue_path),
    "compressedQueueSha256": sha256(compressed_queue_path),
    "summaryJsonSha256": sha256(OUT / "SUMMARY.json"),
    "summaryMdSha256": sha256(OUT / "SUMMARY.md"),
    "batchSha256": sha256(OUT / "LIVE-BATCH-01-50.json"),
}, ensure_ascii=False, indent=2))
