#!/usr/bin/env python3
"""Build the evidence catalog for LuxeStyle self-design products.

This is an audit catalog, not the runtime EDM allowlist.  It intentionally
keeps incomplete and DRAFT products visible while setting all EDM eligibility
flags to false until the official Printful EDM path is freshly verified.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


SCRIPT = Path(__file__).resolve()
PACKAGE = SCRIPT.parents[1]
REPO = SCRIPT.parents[3]
OUTPUT = PACKAGE / "data" / "catalog-manifest.json"


SOURCES = {
    "shopify_full_snapshot": PACKAGE / "evidence" / "shopify-selfdesign-products-full-20261108.json",
    "shopify_tag_snapshot": PACKAGE / "evidence" / "shopify-wunschdesign-snapshot-20261108.json",
    "shopify_additional_snapshot": PACKAGE / "evidence" / "shopify-additional-selfdesign-snapshot-20261108.json",
    "printful_current_catalog": PACKAGE / "evidence" / "printful-relevant-products-20261108.json",
    "printful_variant_ownership_all": PACKAGE / "evidence" / "printful-variant-ownership-all-20261108.json",
    # Frozen eight-rule seed used when this audit catalog was assembled. The
    # runtime allowlist is generated separately from the completed catalog and
    # must not become a circular input here.
    "verified_runtime_mappings": PACKAGE / "evidence" / "verified-runtime-mappings-seed-20261108.json",
    "historical_page_products": REPO / "dropship" / "pod" / "wunsch_raw.json",
    "historical_page_html": REPO / "dropship" / "pod" / "page_body.html",
    "historical_editor_motifs": REPO / "dropship" / "designs" / "page_body.html",
    "historical_product_report": REPO / "dropship" / "selbst-gestalten-fertig-0511" / "l0" / "dpi_ergebnis.json",
    "historical_variant_prices": REPO / "dropship" / "selbst-gestalten-fertig-0511" / "werkzeuge" / "preise_gegenprobe.json",
    "historical_model_map": REPO / "dropship" / "codex-katalog" / "modelle.json",
    "historical_variant_catalog": REPO / "dropship" / "pod-auswahl" / "katalog.json",
    "historical_shop_snapshot": REPO / "dropship" / "pod-auswahl" / "bestand.json",
    "historical_price_backup": REPO / "dropship" / "selbst-gestalten-fertig-0511" / "preise" / "sicherung.json",
    "historical_variant_image_backup": REPO / "dropship" / "pod-variantenbilder-0411" / "vorher.json",
    "historical_iphone_backup": REPO / "dropship" / "pod-sicherung" / "hardcase-iphone_-hulle-mit-magsafe_-selbst-gestalten.json",
    "historical_poster_backup": REPO / "dropship" / "pod-sicherung" / "poster-zum-selbstgestalten.json",
    "historical_hoodie_backup": REPO / "dropship" / "pod-sicherung" / "unisex-hoodie-selbst-gestalten.json",
    "historical_tshirt_backup": REPO / "dropship" / "pod-sicherung" / "unisex-t-shirt-selbst-gestalten.json",
    "model_19_geometry": REPO / "dropship" / "selbst-gestalten-fertig-0511" / "werkzeuge" / "testdaten" / "katalog" / "19.json",
    "model_403_plan": REPO / "dropship" / "selbst-gestalten-fertig-0511" / "fabrik" / "lauf-0611" / "sicherung" / "keramik-tasse-farbige-innenseite-selbst-gestalten.plan.json",
    "historical_edm_report": REPO / "dropship" / "selbst-gestalten-fertig-0511" / "untersuchung" / "bericht-edm.md",
    "non_printful_fulfillment": REPO / "dropship" / "pod" / "MISTER-DTF-FULFILLMENT.md",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repo_path(path: Path) -> str:
    try:
        return path.relative_to(REPO).as_posix()
    except ValueError:
        return str(path)


def numeric_gid(value: str | None) -> int | None:
    if not value:
        return None
    tail = value.rsplit("/", 1)[-1]
    return int(tail) if tail.isdigit() and int(tail) > 0 else None


def sku_suffix(sku: str | None) -> int | None:
    if not sku or "_" not in sku:
        return None
    tail = sku.rsplit("_", 1)[-1]
    return int(tail) if tail.isdigit() and int(tail) > 0 else None


def current_default_technique(model: dict[str, Any] | None) -> str | None:
    if not model:
        return None
    defaults = [item["key"] for item in model.get("techniques", []) if item.get("is_default") is True]
    return defaults[0] if len(defaults) == 1 else None


def current_placements(model: dict[str, Any] | None) -> list[str]:
    if not model:
        return []
    return [str(item["id"]) for item in model.get("files", []) if item.get("type") != "mockup"]


def add_variant_identity(
    identities: dict[tuple[str, str], dict[str, Any]],
    conflicts: list[dict[str, Any]],
    handle: str,
    sku: str | None,
    gid: str | None,
    source: str,
    *,
    title: str | None = None,
    current: bool = False,
) -> None:
    if not handle or not sku or numeric_gid(gid) is None:
        return
    key = (handle, sku)
    incoming = {"gid": gid, "numericId": numeric_gid(gid), "sources": [source], "title": title, "current": current}
    existing = identities.get(key)
    if existing is None:
        identities[key] = incoming
        return
    if existing["gid"] != gid:
        conflicts.append({
            "handle": handle,
            "sku": sku,
            "kept": gid if current and not existing["current"] else existing["gid"],
            "rejected": existing["gid"] if current and not existing["current"] else gid,
            "sources": sorted(set(existing["sources"] + [source])),
        })
        if current and not existing["current"]:
            incoming["sources"] = sorted(set(existing["sources"] + [source]))
            identities[key] = incoming
        return
    existing["sources"] = sorted(set(existing["sources"] + [source]))
    existing["current"] = bool(existing["current"] or current)
    if current and title:
        existing["title"] = title


def collect_shopify_variant_identities(
    tagged: dict[str, Any],
    additional: dict[str, Any],
    full: dict[str, Any],
) -> tuple[dict[tuple[str, str], dict[str, Any]], list[dict[str, Any]]]:
    identities: dict[tuple[str, str], dict[str, Any]] = {}
    conflicts: list[dict[str, Any]] = []

    for snapshot_name, snapshot in (("shopify_tag_snapshot", tagged), ("shopify_additional_snapshot", additional)):
        for product in snapshot["products"]:
            for variant in product.get("variantSample", []):
                add_variant_identity(
                    identities,
                    conflicts,
                    product["handle"],
                    variant.get("sku"),
                    variant.get("id"),
                    snapshot_name,
                    title=variant.get("title"),
                    current=True,
                )

    for product in full["products"]:
        for variant in product.get("variants", []):
            add_variant_identity(
                identities,
                conflicts,
                product["handle"],
                variant.get("sku"),
                variant.get("id"),
                "shopify_full_snapshot",
                title=variant.get("title"),
                current=True,
            )

    price_backup = load_json(SOURCES["historical_price_backup"])
    for item in price_backup.get("geaendert", []):
        add_variant_identity(
            identities,
            conflicts,
            item.get("handle"),
            item.get("sku"),
            item.get("variantId"),
            "historical_price_backup",
        )

    shop_snapshot = load_json(SOURCES["historical_shop_snapshot"])
    for handle, product in shop_snapshot.get("produkte", {}).items():
        for variant in product.get("variants", []):
            title = " / ".join(option.get("value", "") for option in variant.get("selectedOptions", []) if option.get("value")) or None
            add_variant_identity(
                identities,
                conflicts,
                handle,
                variant.get("sku"),
                variant.get("id"),
                "historical_shop_snapshot",
                title=title,
            )

    image_backup = load_json(SOURCES["historical_variant_image_backup"])
    for handle, product in image_backup.items():
        for variant in product.get("varianten", []):
            add_variant_identity(
                identities,
                conflicts,
                handle,
                variant.get("sku"),
                variant.get("id"),
                "historical_variant_image_backup",
            )

    for source_name in (
        "historical_iphone_backup",
        "historical_poster_backup",
        "historical_hoodie_backup",
        "historical_tshirt_backup",
    ):
        payload = load_json(SOURCES[source_name])
        product = payload.get("zustand", payload)
        handle = product.get("handle") or payload.get("handle")
        for variant in product.get("variants", []):
            title = " / ".join(option.get("value", "") for option in variant.get("selectedOptions", []) if option.get("value")) or None
            add_variant_identity(
                identities,
                conflicts,
                handle,
                variant.get("sku"),
                variant.get("id"),
                source_name,
                title=title,
            )

    return identities, conflicts


def geometry_for_model_19() -> dict[int, list[dict[str, Any]]]:
    snapshot = load_json(SOURCES["model_19_geometry"])
    printfile_by_id = {item["printfile_id"]: item for item in snapshot["printfiles"]["printfiles"]}
    by_variant: dict[int, list[dict[str, Any]]] = {}
    for group in snapshot["printfiles"]["variant_printfiles_gruppen"]:
        placements = []
        for placement, printfile_id in group["placements"].items():
            printfile = printfile_by_id.get(printfile_id)
            if not printfile:
                raise RuntimeError(f"Missing geometry for printfile {printfile_id}")
            placements.append({
                "id": placement,
                "printfileId": printfile_id,
                "width": printfile["width"],
                "height": printfile["height"],
                "dpi": printfile["dpi"],
                "fillMode": printfile["fill_mode"],
                "canRotate": printfile["can_rotate"],
            })
        for variant_id in group["varianten"]:
            by_variant[int(variant_id)] = placements
    return by_variant


def build_manifest() -> dict[str, Any]:
    for name, path in SOURCES.items():
        if not path.is_file():
            raise RuntimeError(f"Missing source {name}: {path}")

    full = load_json(SOURCES["shopify_full_snapshot"])
    tagged = load_json(SOURCES["shopify_tag_snapshot"])
    additional = load_json(SOURCES["shopify_additional_snapshot"])
    printful = load_json(SOURCES["printful_current_catalog"])
    ownership = load_json(SOURCES["printful_variant_ownership_all"])
    runtime_mappings = load_json(SOURCES["verified_runtime_mappings"])

    if tagged.get("schemaVersion") != 1 or tagged.get("scope", {}).get("domain") != "luxestyle.ch":
        raise RuntimeError("Invalid Shopify tag snapshot")
    if tagged.get("scope", {}).get("complete") is not True or len(tagged.get("products", [])) != 39:
        raise RuntimeError("Shopify tag snapshot is not the complete 39-product scope")
    if additional.get("schemaVersion") != 1 or additional.get("complete") is not True or len(additional.get("products", [])) != 2:
        raise RuntimeError("Additional Shopify snapshot is not the complete 2-product scope")
    if full.get("schemaVersion") != 1 or full.get("scope", {}).get("complete") is not True or len(full.get("products", [])) != 41:
        raise RuntimeError("Full Shopify snapshot is not the complete 41-product scope")
    if sum(item.get("totalVariants", 0) for item in full["products"]) != 398:
        raise RuntimeError("Full Shopify snapshot does not contain the expected 398 variants")
    if any(item.get("readStatus") != "CONFIRMED" or item.get("totalVariants") != item.get("variantsReturned") or item.get("totalVariants") != len(item.get("variants", [])) for item in full["products"]):
        raise RuntimeError("Full Shopify snapshot contains a partial or unconfirmed product")
    all_current_variant_gids = [
        variant.get("id")
        for product in full["products"]
        for variant in product.get("variants", [])
    ]
    if any(numeric_gid(gid) is None for gid in all_current_variant_gids) or len(set(all_current_variant_gids)) != 398:
        raise RuntimeError("Full Shopify snapshot does not contain 398 globally unique positive variant GIDs")
    if len({item.get("id") for item in full["products"]}) != 41 or any(numeric_gid(item.get("id")) is None for item in full["products"]):
        raise RuntimeError("Full Shopify snapshot does not contain 41 unique positive product GIDs")
    for product in full["products"]:
        text_values = [product.get("handle"), product.get("title")]
        text_values.extend(value for variant in product.get("variants", []) for value in (variant.get("title"), variant.get("sku")))
        if any(value is not None and unicodedata.normalize("NFC", value) != value for value in text_values):
            raise RuntimeError(f"Shopify snapshot contains non-NFC text: {product.get('handle')}")
    if printful.get("schemaVersion") != 1 or len(printful.get("products", [])) != 45 or printful.get("missingIds") != []:
        raise RuntimeError("Current Printful evidence does not contain all 45 selected models")
    if ownership.get("schemaVersion") != 1 or ownership.get("scope", {}).get("complete") is not True or len(ownership.get("products", [])) != 45:
        raise RuntimeError("Current Printful variant ownership is not the complete 45-model scope")

    tagged_handles = {item["handle"] for item in tagged["products"]}
    additional_handles = {item["handle"] for item in additional["products"]}
    if tagged_handles & additional_handles or len(tagged_handles) != 39 or len(additional_handles) != 2:
        raise RuntimeError("Tag and targeted product scopes overlap or have unexpected size")
    expected_handles = tagged_handles | additional_handles
    full_handles = [item["handle"] for item in full["products"]]
    if len(set(full_handles)) != 41 or set(full_handles) != expected_handles:
        raise RuntimeError("Full Shopify snapshot does not match the 39+2 declared scope")
    declared_by_handle = {
        item["handle"]: item
        for item in tagged["products"] + additional["products"]
    }
    for product in full["products"]:
        declared = declared_by_handle[product["handle"]]
        declared_count = declared.get("variantsCount")
        if declared.get("id") != product.get("id") or declared.get("status") != product.get("status") or declared_count != product.get("totalVariants"):
            raise RuntimeError(f"Full Shopify product identity/status/count differs from declared scope: {product['handle']}")
    current_products: list[dict[str, Any]] = []
    seen_handles = set(full_handles)
    for raw in full["products"]:
        item = dict(raw)
        item["scope"] = "tag:wunschdesign" if item["handle"] in tagged_handles else "targeted_active_exception"
        current_products.append(item)

    current_by_handle = {item["handle"]: item for item in current_products}
    printful_by_id = {int(item["printfulProductId"]): item for item in printful["products"]}

    model_map_payload = load_json(SOURCES["historical_model_map"])
    model_map = model_map_payload["modelle"]
    candidates_by_handle: dict[str, list[int]] = defaultdict(list)
    for model in model_map:
        for handle in model.get("shopHandles", []):
            candidates_by_handle[handle].append(int(model["id"]))

    variant_catalog_payload = load_json(SOURCES["historical_variant_catalog"])
    variants_by_model: dict[int, set[int]] = {
        int(product["printfulProductId"]): {int(item["printfulVariantId"]) for item in product.get("variants", [])}
        for product in ownership["products"]
    }
    variant_name_by_model: dict[tuple[int, int], str] = {
        (int(product["printfulProductId"]), int(item["printfulVariantId"])): item.get("name")
        for product in ownership["products"]
        for item in product.get("variants", [])
    }
    if set(variants_by_model) != set(printful_by_id):
        raise RuntimeError("Printful model and variant ownership scopes differ")
    all_owned_pairs: list[tuple[int, int]] = []
    all_owned_variant_ids: list[int] = []
    for product in ownership["products"]:
        model_id = int(product["printfulProductId"])
        variant_ids = [int(item["printfulVariantId"]) for item in product.get("variants", [])]
        all_owned_pairs.extend((model_id, variant_id) for variant_id in variant_ids)
        all_owned_variant_ids.extend(variant_ids)
        current_model = printful_by_id[model_id]
        if product.get("httpStatus") != 200 or product.get("isDiscontinued") is True:
            raise RuntimeError(f"Printful ownership read is not usable for model {model_id}")
        if product.get("variantCount") != len(variant_ids) or len(set(variant_ids)) != len(variant_ids):
            raise RuntimeError(f"Printful ownership list is incomplete or duplicated for model {model_id}")
        if current_model.get("variantCount") != len(variant_ids):
            raise RuntimeError(f"Printful catalog and ownership counts differ for model {model_id}")
        response_hash = product.get("responseSha256", "")
        if len(response_hash) != 64 or any(char not in "0123456789abcdef" for char in response_hash):
            raise RuntimeError(f"Printful response hash is invalid for model {model_id}")
    if len(all_owned_pairs) != 2257 or len(set(all_owned_pairs)) != 2257 or len(set(all_owned_variant_ids)) != 2257:
        raise RuntimeError("Printful ownership evidence is not globally unique across all 2,257 model/variant rows")

    identities, identity_conflicts = collect_shopify_variant_identities(tagged, additional, full)

    old_rows = load_json(SOURCES["historical_variant_prices"])
    if old_rows.get("spalten")[:4] != ["handle", "status", "sku", "printfulVariante"]:
        raise RuntimeError("Unexpected historical price row schema")
    rows_by_handle: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in old_rows["zeilen"]:
        rows_by_handle[row[0]].append({"sku": row[2], "printfulVariantId": int(row[3])})

    historical_page = load_json(SOURCES["historical_page_products"])
    historical_page_handles = {
        edge["node"]["handle"] for edge in historical_page["products"]["edges"]
    }

    verified_runtime = {
        (
            item["shopifyHandle"],
            item["shopifyVariantId"],
            int(item["printfulProductId"]),
            int(item["printfulVariantId"]),
        ): item
        for item in runtime_mappings.get("mappings", [])
    }
    model_19_geometry = geometry_for_model_19()

    model_403_plan = load_json(SOURCES["model_403_plan"])

    def assign_model(handle: str, printful_variant_id: int) -> tuple[int | None, str]:
        candidates = sorted(candidates_by_handle.get(handle, []))
        if len(candidates) == 1:
            model_id = candidates[0]
            return (model_id, "single_model_handle_map_and_current_variant_ownership") if printful_variant_id in variants_by_model.get(model_id, set()) else (None, "variant_not_owned_by_mapped_model")
        direct = [model_id for model_id in candidates if printful_variant_id in variants_by_model.get(model_id, set())]
        if len(direct) == 1:
            return direct[0], "current_variant_ownership"
        return None, "unresolved"

    def make_variant(
        *,
        handle: str,
        sku: str | None,
        printful_variant_id: int | None,
        printful_product_id: int | None,
        model_evidence: str,
        title: str | None = None,
        shopify_gid: str | None = None,
        identity_sources: list[str] | None = None,
        slot_index: int | None = None,
        provider: str = "printful",
        status: str,
    ) -> dict[str, Any]:
        identity = identities.get((handle, sku)) if sku else None
        if shopify_gid is None and identity:
            shopify_gid = identity["gid"]
        shopify_numeric = numeric_gid(shopify_gid)
        if title is None and identity:
            title = identity.get("title")
        if identity_sources is None and identity:
            identity_sources = identity.get("sources", [])
        identity_sources = sorted(set(identity_sources or []))

        model = printful_by_id.get(printful_product_id) if printful_product_id else None
        technique = current_default_technique(model)
        known_placements = current_placements(model)
        exact_key = (handle, shopify_gid, printful_product_id, printful_variant_id)
        approved = exact_key in verified_runtime
        placements = model_19_geometry.get(printful_variant_id, []) if approved and printful_product_id == 19 else []
        mockup_eligible = bool(
            provider == "printful"
            and status == "ACTIVE"
            and shopify_numeric
            and printful_product_id
            and printful_variant_id
            and technique
            and placements
            and approved
        )

        blockers = ["EDM_RUNTIME_NOT_FRESHLY_VERIFIED"]
        if status == "DRAFT":
            blockers.append("SHOPIFY_DRAFT")
        if provider != "printful":
            blockers.append("NON_PRINTFUL_FULFILLMENT" if provider == "mister-dtf" else "PROVIDER_UNVERIFIED")
        if shopify_numeric is None:
            blockers.append("SHOPIFY_VARIANT_ID_UNVERIFIED")
        if not sku:
            blockers.append("SHOPIFY_SKU_UNVERIFIED")
        if printful_variant_id is None:
            blockers.append("PRINTFUL_VARIANT_UNVERIFIED")
        if printful_product_id is None:
            blockers.append("PRINTFUL_PRODUCT_MAPPING_UNVERIFIED")
        if technique is None and provider == "printful":
            blockers.append("TECHNIQUE_UNVERIFIED")
        if not mockup_eligible and provider == "printful":
            blockers.append("MOCKUP_RUNTIME_MAPPING_NOT_APPROVED")

        mapping_status = "exact" if all((shopify_numeric, sku, printful_variant_id, printful_product_id, technique)) else "incomplete"
        if provider == "mister-dtf":
            mapping_status = "non_printful"
        elif printful_variant_id and printful_product_id and not shopify_numeric:
            mapping_status = "printful_catalog_only"

        return {
            "slotIndex": slot_index,
            "title": title,
            "sku": sku,
            "shopifyVariantId": shopify_numeric,
            "shopifyVariantGid": shopify_gid,
            "printfulVariantId": printful_variant_id,
            "printfulProductId": printful_product_id,
            "technique": technique,
            "knownPlacements": known_placements,
            "eligiblePlacements": [item["id"] for item in placements],
            "placements": placements,
            "mappingStatus": mapping_status,
            "mappingEvidence": {
                "model": model_evidence,
                "shopifyIdentitySources": identity_sources,
                "printfulTechnique": "printful_current_catalog" if technique else None,
                "mockupRuntimeMapping": "verified_runtime_mappings" if approved else None,
                "geometry": "model_19_geometry" if placements else None,
            },
            "eligible": False,
            "edmEligible": False,
            "mockupEligible": mockup_eligible,
            "blockers": sorted(set(blockers)),
        }

    plan_403_by_sku = {item["sku"]: int(item["printfulVariantId"]) for item in model_403_plan["varianten"]}
    price_variant_by_handle_sku = {
        handle: {item["sku"]: int(item["printfulVariantId"]) for item in rows}
        for handle, rows in rows_by_handle.items()
    }

    products: list[dict[str, Any]] = []
    for current in sorted(current_products, key=lambda item: item["handle"]):
        handle = current["handle"]
        status = current["status"]
        expected = int(current["totalVariants"])
        current_variants = current["variants"]
        provider = "printful"
        if handle == "buegeltransfer-selbst-gestalten":
            provider = "mister-dtf"
        elif handle == "wm-trikot-selbst-gestalten":
            provider = "unknown"
        variant_specs: list[dict[str, Any]] = []

        for index, shop_variant in enumerate(current_variants, start=1):
            sku = shop_variant.get("sku")
            pf_variant: int | None = None
            model_id: int | None = None
            model_evidence = "unresolved"
            evidence_sources = ["shopify_full_snapshot"]

            if provider == "mister-dtf":
                model_evidence = "non_printful_fulfillment"
                evidence_sources.append("non_printful_fulfillment")
            elif provider == "unknown":
                model_evidence = "provider_and_printful_mapping_unresolved"
            elif handle == "keramik-tasse-farbige-innenseite-selbst-gestalten":
                pf_variant = plan_403_by_sku.get(sku)
                model_id = 403 if pf_variant else None
                model_evidence = "model_403_plan_and_current_variant_ownership" if pf_variant in variants_by_model.get(403, set()) else "unresolved"
                evidence_sources.extend(["model_403_plan", "printful_variant_ownership_all"])
            elif handle == "transparente-iphone®-hulle-selbst-gestalten":
                pf_variant = sku_suffix(sku)
                model_id = 181 if pf_variant in variants_by_model.get(181, set()) else None
                model_evidence = "sku_contract_and_current_variant_ownership" if model_id else "unresolved"
                evidence_sources.extend(["printful_variant_ownership_all", "historical_variant_catalog"])
            else:
                pf_variant = price_variant_by_handle_sku.get(handle, {}).get(sku)
                if pf_variant is None and handle == "baby-jersey-body-selbst-gestalten":
                    pf_variant = sku_suffix(sku)
                    evidence_sources.append("sku_contract_new_current_variant")
                if pf_variant is not None:
                    model_id, model_evidence = assign_model(handle, pf_variant)
                    evidence_sources.extend(["historical_variant_prices", "historical_model_map", "printful_variant_ownership_all"])

            if provider == "printful" and (pf_variant is None or model_id is None):
                raise RuntimeError(f"Unresolved current Printful mapping for {handle} / {sku}")
            if provider == "printful" and sku_suffix(sku) != pf_variant:
                raise RuntimeError(f"Current Shopify SKU suffix does not equal Printful variant for {handle} / {sku}")
            if provider == "printful" and pf_variant not in variants_by_model.get(model_id, set()):
                raise RuntimeError(f"Printful model {model_id} does not own variant {pf_variant} for {handle} / {sku}")

            printful_title = variant_name_by_model.get((model_id, pf_variant)) if model_id and pf_variant else None
            variant_specs.append(make_variant(
                handle=handle,
                sku=sku,
                shopify_gid=shop_variant.get("id"),
                printful_variant_id=pf_variant,
                printful_product_id=model_id,
                model_evidence=model_evidence,
                title=shop_variant.get("title") or printful_title,
                identity_sources=evidence_sources,
                slot_index=index,
                provider=provider,
                status=status,
            ))

        if len(variant_specs) != expected:
            raise RuntimeError(f"Variant coverage mismatch for {handle}: {len(variant_specs)} != {expected}")

        model_ids = sorted({item["printfulProductId"] for item in variant_specs if item["printfulProductId"]})
        models = []
        for model_id in model_ids:
            model = printful_by_id.get(model_id)
            if not model:
                raise RuntimeError(f"Model {model_id} for {handle} missing from current Printful evidence")
            models.append({
                "printfulProductId": model_id,
                "title": model["title"],
                "type": model["type"],
                "imageUrl": model["imageUrl"],
                "isDiscontinued": model["isDiscontinued"],
                "variantCount": model["variantCount"],
                "defaultTechnique": current_default_technique(model),
                "techniques": model["techniques"],
                "knownPlacements": current_placements(model),
                "mappingEvidence": "variant_level" if len(model_ids) > 1 else "handle_or_targeted_model",
            })

        exact_variants = sum(item["mappingStatus"] == "exact" for item in variant_specs)
        catalog_only = sum(item["mappingStatus"] == "printful_catalog_only" for item in variant_specs)
        unresolved = expected - exact_variants
        product_mockup_eligible = bool(
            provider == "printful"
            and status == "ACTIVE"
            and len(variant_specs) == expected
            and all(item["mockupEligible"] for item in variant_specs)
        )
        techniques = {model["defaultTechnique"] for model in models if model["defaultTechnique"]}
        technique = next(iter(techniques)) if len(techniques) == 1 and len(techniques) == len({m["defaultTechnique"] for m in models}) else None

        blockers = ["EDM_RUNTIME_NOT_FRESHLY_VERIFIED"]
        if status == "DRAFT":
            blockers.append("SHOPIFY_DRAFT")
        if provider == "mister-dtf":
            blockers.append("NON_PRINTFUL_FULFILLMENT")
        elif provider != "printful":
            blockers.extend(["PROVIDER_UNVERIFIED", "PRINTFUL_PRODUCT_MAPPING_UNVERIFIED"])
        if unresolved and provider == "printful":
            blockers.append("PARTIAL_VARIANT_PAIRING")
        elif unresolved and provider == "unknown":
            blockers.append("PRINTFUL_VARIANT_MAPPING_UNVERIFIED")
        if not product_mockup_eligible and provider == "printful":
            blockers.append("MOCKUP_PRODUCT_NOT_FULLY_APPROVED")

        mapping_status = "complete" if provider == "printful" and unresolved == 0 else "incomplete"
        if provider == "mister-dtf":
            mapping_status = "non_printful"

        product_id = current.get("numericId") or str(numeric_gid(current.get("id")))
        products.append({
            "handle": handle,
            "shopifyHandle": handle,
            "title": current["title"],
            "shopifyProductId": int(product_id),
            "shopifyProductGid": current["id"],
            "shopifyStatus": status,
            "sourceScope": current["scope"],
            "provider": provider,
            "featuredImageUrl": current.get("featuredImageUrl"),
            "historicalPageMembership": handle in historical_page_handles,
            "expectedVariantCount": expected,
            "listedVariantCount": len(variant_specs),
            "exactPairedVariantCount": exact_variants,
            "catalogOnlyVariantCount": catalog_only,
            "unresolvedVariantCount": unresolved,
            "printfulProductId": model_ids[0] if len(model_ids) == 1 else None,
            "printfulProductIds": model_ids,
            "technique": technique,
            "models": models,
            "mappingStatus": mapping_status,
            "state": (
                "non_printful_blocked" if provider == "mister-dtf" else
                "draft_blocked" if status == "DRAFT" else
                "mapping_incomplete" if unresolved else
                "edm_runtime_blocked"
            ),
            "eligible": False,
            "edmEligible": False,
            "mockupEligible": product_mockup_eligible,
            "blockers": sorted(set(blockers)),
            "variants": variant_specs,
        })

    status_counts = Counter(item["shopifyStatus"] for item in products)
    provider_counts = Counter(item["provider"] for item in products)
    expected_variants = sum(item["expectedVariantCount"] for item in products)
    listed_variants = sum(item["listedVariantCount"] for item in products)
    exact_variants = sum(item["exactPairedVariantCount"] for item in products)
    catalog_only = sum(item["catalogOnlyVariantCount"] for item in products)
    known_shopify_ids = sum(
        item["shopifyVariantId"] is not None
        for product in products
        for item in product["variants"]
    )
    known_printful_variants = sum(
        item["printfulVariantId"] is not None and item["printfulProductId"] is not None
        for product in products
        for item in product["variants"]
    )
    mockup_products = sum(item["mockupEligible"] for item in products)
    mockup_variants = sum(
        item["mockupEligible"]
        for product in products
        for item in product["variants"]
    )
    active_variants = sum(item["expectedVariantCount"] for item in products if item["shopifyStatus"] == "ACTIVE")
    draft_variants = sum(item["expectedVariantCount"] for item in products if item["shopifyStatus"] == "DRAFT")
    active_printful_variants = sum(item["expectedVariantCount"] for item in products if item["shopifyStatus"] == "ACTIVE" and item["provider"] == "printful")
    draft_printful_variants = sum(item["expectedVariantCount"] for item in products if item["shopifyStatus"] == "DRAFT" and item["provider"] == "printful")

    source_records = []
    observed_by_name = {
        "shopify_full_snapshot": full["measuredAt"],
        "shopify_tag_snapshot": tagged["measuredAt"],
        "shopify_additional_snapshot": additional["measuredAt"],
        "printful_current_catalog": printful["measuredAt"],
        "printful_variant_ownership_all": ownership["measuredAt"],
        "verified_runtime_mappings": runtime_mappings.get("measuredAt"),
        "historical_page_products": "historical; date not embedded",
        "historical_page_html": "historical; date not embedded",
        "historical_editor_motifs": "historical; date not embedded",
        "historical_product_report": load_json(SOURCES["historical_product_report"]).get("stand"),
        "historical_variant_prices": old_rows.get("stand"),
        "historical_model_map": model_map_payload.get("erstellt"),
        "historical_variant_catalog": variant_catalog_payload.get("stand"),
        "historical_shop_snapshot": load_json(SOURCES["historical_shop_snapshot"]).get("stand"),
        "historical_price_backup": load_json(SOURCES["historical_price_backup"]).get("gesichert"),
        "historical_variant_image_backup": "2026-11-04 (embedded per product)",
        "historical_iphone_backup": load_json(SOURCES["historical_iphone_backup"]).get("gesichertAm"),
        "historical_poster_backup": load_json(SOURCES["historical_poster_backup"]).get("gesichertAm"),
        "historical_hoodie_backup": load_json(SOURCES["historical_hoodie_backup"]).get("gesichertAm"),
        "historical_tshirt_backup": load_json(SOURCES["historical_tshirt_backup"]).get("gesichertAm"),
        "model_19_geometry": load_json(SOURCES["model_19_geometry"]).get("geholt"),
        "model_403_plan": model_403_plan.get("erzeugt", {}).get("am"),
        "historical_edm_report": "2026-11-05",
        "non_printful_fulfillment": "historical policy file",
    }
    for name, path in SOURCES.items():
        source_records.append({
            "id": name,
            "path": repo_path(path),
            "sha256": sha256(path),
            "observedAt": observed_by_name.get(name),
        })

    manifest = {
        "schema": 1,
        "schemaId": "luxestyle-printful-edm-audit-catalog/1",
        "schemaVersion": 1,
        "generatedAt": ownership["measuredAt"],
        "shop": {
            "name": "LuxeStyle",
            "domain": "luxestyle.ch",
            "currency": "CHF",
        },
        "scope": {
            "definition": "39 complete tag:wunschdesign products plus 2 targeted active self-design exceptions",
            "taggedSnapshotComplete": True,
            "targetedExceptionSnapshotComplete": True,
            "fullProductAndVariantSnapshotComplete": True,
            "shopifyVariantRead": "41 targeted product reads; exactly one targeted continuation page for the 84-variant Samsung product",
            "printfulVariantRead": "45 targeted public product reads; exactly one request per model",
            "noMassCatalogPagination": True,
            "productCount": len(products),
            "shopifyFullSnapshotSha256": sha256(SOURCES["shopify_full_snapshot"]),
            "shopifyVariantGidsGloballyUnique": True,
            "shopifyMeasuredAt": full["measuredAt"],
            "printfulVariantOwnershipSha256": sha256(SOURCES["printful_variant_ownership_all"]),
            "printfulMeasuredAt": ownership["measuredAt"],
        },
        "policy": {
            "mode": "fail_closed",
            "auditCatalogOnly": True,
            "runtimeAllowlist": False,
            "draftProductsBlocked": True,
            "nonPrintfulProductsBlocked": True,
            "missingVariantPairingBlocksEditor": True,
            "edmEligibilityRequiresFreshTokenDomainNonceAndOrderPathVerification": True,
        },
        "globalBlockers": [
            "EDM_TOKEN_SCOPES_AND_DOMAIN_BINDING_NOT_FRESHLY_VERIFIED",
            "EDM_NONCE_BACKEND_NOT_DEPLOYED_OR_VERIFIED",
            "EDM_ORDER_PATH_NOT_END_TO_END_VERIFIED",
        ],
        "historicalFindings": [
            {
                "date": "2026-11-05",
                "finding": "The then-tested token returned HTTP 403 for product_templates/read and product_templates/write.",
                "currentInterpretation": "Historical only; owner-confirmed entitlement does not prove the current technical token extension or domain binding.",
                "source": "historical_edm_report",
            }
        ],
        "coverage": {
            "products": len(products),
            "activeProducts": status_counts["ACTIVE"],
            "draftProducts": status_counts["DRAFT"],
            "activeVariants": active_variants,
            "draftVariants": draft_variants,
            "printfulProducts": provider_counts["printful"],
            "misterDtfProducts": provider_counts["mister-dtf"],
            "unknownProviderProducts": provider_counts["unknown"],
            "activePrintfulProducts": sum(item["shopifyStatus"] == "ACTIVE" and item["provider"] == "printful" for item in products),
            "draftPrintfulProducts": sum(item["shopifyStatus"] == "DRAFT" and item["provider"] == "printful" for item in products),
            "activePrintfulVariants": active_printful_variants,
            "draftPrintfulVariants": draft_printful_variants,
            "expectedVariants": expected_variants,
            "listedVariantSlots": listed_variants,
            "knownShopifyVariantIds": known_shopify_ids,
            "knownPrintfulProductVariantPairs": known_printful_variants,
            "exactShopifyPrintfulVariantPairs": exact_variants,
            "printfulCatalogOnlyVariantSlots": catalog_only,
            "unresolvedVariantPairings": expected_variants - exact_variants,
            "edmEligibleProducts": 0,
            "edmEligibleVariants": 0,
            "mockupEligibleProducts": mockup_products,
            "mockupEligibleVariants": mockup_variants,
            "historicalPageProducts": len(historical_page_handles),
            "historicalPageProductsStillInScope": len(historical_page_handles & seen_handles),
            "currentProductsAbsentFromHistoricalPage": len(seen_handles - historical_page_handles),
            "identityConflicts": len(identity_conflicts),
        },
        "identityConflicts": identity_conflicts,
        "sources": source_records,
        "products": products,
    }

    if manifest["coverage"]["products"] != 41:
        raise RuntimeError("Manifest product coverage is not 41")
    if (manifest["coverage"]["activeProducts"], manifest["coverage"]["draftProducts"]) != (19, 22):
        raise RuntimeError("Unexpected ACTIVE/DRAFT product split")
    if manifest["coverage"]["expectedVariants"] != 398 or listed_variants != 398:
        raise RuntimeError("Expected exactly 398 current variant slots")
    if (active_variants, draft_variants, active_printful_variants, draft_printful_variants) != (245, 153, 244, 133):
        raise RuntimeError("Unexpected ACTIVE/DRAFT and Printful variant split")
    if (provider_counts["printful"], provider_counts["mister-dtf"], provider_counts["unknown"], exact_variants) != (39, 1, 1, 377):
        raise RuntimeError("Unexpected provider or exact Printful pairing coverage")
    if any(product["edmEligible"] or product["eligible"] for product in products):
        raise RuntimeError("EDM audit catalog must remain fail closed")
    return manifest


def serialized(manifest: dict[str, Any]) -> str:
    return json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="compare generated content with data/catalog-manifest.json")
    parser.add_argument("--stdout", action="store_true", help="write generated content to stdout")
    args = parser.parse_args()

    output = serialized(build_manifest())
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != output:
            raise SystemExit("catalog-manifest.json is stale; run tools/build-catalog-manifest.py")
        print("catalog-manifest.json: OK")
        return 0
    if args.stdout:
        print(output, end="")
        return 0
    OUTPUT.write_text(output, encoding="utf-8")
    print(f"wrote {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
