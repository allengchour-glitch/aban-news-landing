#!/usr/bin/env python3
"""Reconcile LuxeStyle self-design image evidence without network access."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import shutil
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageDraw, ImageFont


OUT = Path(__file__).resolve().parent.parent
BASE = OUT.parents[1]
D = BASE / "dropship"
E = OUT / "evidence"
FRESH = E / "shopify-wunschdesign-snapshot-20261108.json"
EXTRA = E / "shopify-additional-selfdesign-snapshot-20261108.json"
SHOP_FULL = E / "shopify-selfdesign-products-full-20261108.json"
PF_META = E / "printful-relevant-products-20261108.json"
PF_OWN = E / "printful-variant-ownership-20261108.json"
PF_VARIANTS_FULL = E / "printful-relevant-product-variants-20261108.json"
VERIFIED_VARIANTS = OUT / "data/verified-variant-mappings.json"
RIGHTS = D / "katalog-einheiten-0411/sicherung/assets__luxe-clothing-reference-gallery.json.vor"
BASE_LEDGER = D / "pod-bilder-0211/ledger.json"
GAL1 = D / "pod-bilder-0211/galerie_ledger.json"
GAL2 = D / "pod-bilder-0211/galerie2_ledger.json"
OLD_FEATURED = D / "pod/wunsch_raw.json"
EDITOR_MAP = BASE / "pod/editor-hintergruende.json"
MUG_ROOT = E / "mug-r137"
MUG_MAP = MUG_ROOT / "mapping.json"
MISTER_DTF = D / "pod/MISTER-DTF-FULFILLMENT.md"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def manifest(path: Path) -> dict:
    return {"path": str(path), "sha256": sha(path), "bytes": path.stat().st_size}


def image_facts(path: Path) -> dict:
    out = {"path": str(path), "exists": path.is_file(), "sha256": None, "bytes": None,
           "width": None, "height": None, "format": None}
    if not path.is_file():
        return out
    out.update({"sha256": sha(path), "bytes": path.stat().st_size})
    try:
        with Image.open(path) as im:
            out.update({"width": im.width, "height": im.height, "format": im.format})
    except Exception:
        pass
    return out


def view_from_name(value: str) -> dict:
    low = value.lower()
    found = [t for t in ("front", "back", "left", "right", "flat", "flatlay", "lifestyle", "onman", "onwoman", "onmodel")
             if f"/{t}/" in low or f"_{t}_" in low or f"-{t}-" in low]
    view = next((t for t in ("front", "back", "left", "right") if t in found), "flat" if any(t in found for t in ("flat", "flatlay")) else "unknown")
    return {"value": view, "method": "filename_tokens_only", "tokens": found, "pixelsInspected": False}


def remote(url: str, role: str, source: Path, pointer: str) -> dict:
    return {
        "url": url, "role": role, "sourceManifest": str(source), "sourcePointer": pointer,
        "localPath": None, "sha256": None, "width": None, "height": None,
        "view": view_from_name(url),
        "rights": {"status": "unbound_for_customer_design_preview"},
        "suitability": {"catalogueReference": "unknown_without_byte_and_rights_check",
                        "customerDesignPreview": False, "officialGeneratedMockup": False},
    }


def local(path: Path, kind: str, handle: str, provenance: dict, view: str = "front") -> dict:
    out = image_facts(path)
    out.update({
        "classification": kind, "handle": handle, "view": view, "provenance": provenance,
        "rights": {"status": "unbound_for_customer_design_preview"},
        "suitability": {"productExact": False, "variantExact": False,
                        "customerDesignPreview": False, "officialPrintfulMockup": False},
    })
    return out


def catalog_maps():
    by_variant = defaultdict(set)
    sources = defaultdict(list)
    selection = D / "pod-auswahl/katalog.json"
    for pid, product in load(selection)["produkte"].items():
        for variant in product.get("variants", []):
            by_variant[int(variant["id"])].add(str(pid))
        sources[str(pid)].append(str(selection))
    cdir = D / "selbst-gestalten-fertig-0511/werkzeuge/testdaten/katalog"
    for path in sorted(cdir.glob("*.json")):
        data = load(path)
        pid = str(data["id"])
        for variant in data.get("varianten", []):
            by_variant[int(variant["id"])].add(pid)
        sources[pid].append(str(path))
    return by_variant, sources


def plan_map():
    result = {}
    root = D / "selbst-gestalten-fertig-0511/fabrik"
    paths = []
    for pat in ("beispiele/*.json", "beispiele/gegenproben/*.json", "lauf-0611/sicherung/*.json"):
        paths += list(root.glob(pat))
    for path in sorted(set(paths)):
        if path.name == "chargen.json":
            continue
        try:
            data = load(path)
        except Exception:
            continue
        if data.get("handle") and data.get("printfulProductId") is not None:
            result[data["handle"]] = {"printfulProductId": str(data["printfulProductId"]), "path": str(path),
                                      "sha256": sha(path), "title": data.get("titel"), "status": data.get("status")}
    return result


def local_candidates():
    result = defaultdict(list)
    ai_clean = BASE / "automation/pod_blank_mockups.mjs"
    ai_generic = BASE / "automation/gen_editor_blanks.mjs"
    ai_colour = BASE / "automation/gen_tee_colors.mjs"
    for path in sorted((BASE / "pod/blanks").glob("*")):
        if path.is_file():
            result[path.stem].append(local(path, "gemini_retouched_blank", path.stem,
                {"script": str(ai_clean), "risk": "AI reconstructs removed placeholder pixels; exact form/texture is not guaranteed."}))
    generic = {"buegeltransfer": "buegeltransfer-selbst-gestalten", "kissen": "kissen-zum-selbstgestalten",
               "magnet": "magnet-zum-selbstgestalten", "poster": "poster-zum-selbstgestalten", "tote": "tote-zum-selbstgestalten"}
    for key, handle in generic.items():
        path = BASE / f"pod/editor-blanks/{key}.jpg"
        if path.is_file():
            result[handle].append(local(path, "gemini_generated_generic_background", handle,
                {"script": str(ai_generic), "risk": "Synthetic image has no verified Printful product identity."}))
    for path in sorted((BASE / "pod/tees").glob("tee-*.jpg")):
        result["shirt-zum-selbstgestalten"].append(local(path, "gemini_recoloured_derivative", "shirt-zum-selbstgestalten",
            {"script": str(ai_colour), "risk": "Generated colour/material is not an exact variant proof."}))

    editor = load(EDITOR_MAP)
    handle = "hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten"
    for variant_id, url in editor[handle]["map"].items():
        name = Path(urlparse(url).path).name.removeprefix("luxe-editor-")
        item = local(BASE / "pod/editor/iphone" / name, "blank_front_editor_background_source_unverified", handle,
                     {"sourceManifest": str(EDITOR_MAP), "shopifyVariantId": variant_id, "sourceUrl": url,
                      "risk": "The local blank is mapped to a Shopify variant, but its Printful source identity, geometry and commercial overlay rights are unproven."})
        item.update({"shopifyVariantId": variant_id, "sourceUrl": url})
        result[handle].append(item)
    original = D / "pod-editor-sicherung-2810/originale"
    for path in sorted(original.glob("iphone-mockup-*")):
        result[handle].append(local(path, "historical_fixed_dein_design_placeholder", handle,
                                    {"sourceDirectory": str(original), "risk": "Baked sample; source rights unknown."}))
    classic = "klassisches-unisex-t-shirt-selbst-gestalten"
    for path in sorted(original.glob("unisex-classic-tee-*")):
        view = "left" if "-left-" in path.name else "right" if "-right-" in path.name else "front"
        result[classic].append(local(path, "historical_fixed_dein_design_placeholder", classic,
                                     {"sourceDirectory": str(original), "risk": "Baked sample; source rights unknown."}, view))

    static = {
        "kiss-cut-aufkleber-selbst-gestalten": [BASE / "pod/editor/aufkleber-vorlage.png"],
        "wm-trikot-selbst-gestalten": [BASE / "pod/editor/trikot-vorne.png", BASE / "pod/editor/trikot-hinten.png"],
        "kissen-zum-selbstgestalten": [BASE / "pod/templates/kissen.png", BASE / "pod/personalized/kissen.png"],
        "magnet-zum-selbstgestalten": [BASE / "pod/templates/magnet.png", BASE / "pod/personalized/magnet.png", BASE / "pod/magnet-blank.png"],
        "mauspad-selbst-gestalten": [BASE / "pod/templates/mousepad.png", BASE / "pod/personalized/mousepad.png"],
        "poster-zum-selbstgestalten": [BASE / "pod/templates/poster.png", BASE / "pod/personalized/poster.png", BASE / "pod/poster-blank.png"],
        "shirt-zum-selbstgestalten": [BASE / "pod/templates/shirt.png", BASE / "pod/personalized/shirt.png"],
        "tasse-zum-selbstgestalten": [BASE / "pod/templates/tasse.png", BASE / "pod/personalized/tasse.png"],
        "tote-zum-selbstgestalten": [BASE / "pod/templates/tote.png", BASE / "pod/personalized/tote.png"],
        "buegeltransfer-selbst-gestalten": [BASE / "pod/templates/buegeltransfer.png", BASE / "pod/personalized/buegeltransfer.png"],
    }
    for h, paths in static.items():
        for path in paths:
            if not path.is_file():
                continue
            kind = "marketing_tile" if "personalized" in path.parts else "generic_blank_unknown" if path.name in {"poster-blank.png", "magnet-blank.png"} else "schematic_editor_template"
            result[h].append(local(path, kind, h, {"risk": "No exact product/variant and rights binding."},
                                   "back" if "hinten" in path.name else "front"))
    if MUG_MAP.is_file():
        for h in ("keramik-tasse-selbst-gestalten", "tasse-zum-selbstgestalten"):
            result[h].append({"path": str(MUG_MAP), "exists": True, "sha256": sha(MUG_MAP),
                "classification": "detailed_official_mug_mapping", "view": "see_nested_mapping",
                "provenance": {"printfulProductId": 19, "variants": [1320, 4830, 16586]},
                "rights": {"status": "mixed_see_nested_mapping"},
                "suitability": {"productExact": "partial", "variantExact": True,
                                "customerDesignPreview": False, "officialPrintfulMockup": False}})
    return result


def contact_sheet(items, output):
    font = ImageFont.load_default()
    cells = []
    for path, label in items:
        try:
            im = Image.open(path).convert("RGB")
        except Exception:
            continue
        im.thumbnail((210, 188))
        cell = Image.new("RGB", (230, 240), "white")
        cell.paste(im, ((230 - im.width) // 2, 6))
        draw = ImageDraw.Draw(cell)
        text = label[-38:] if len(label) > 38 else label
        draw.text((5, 205), text, fill="black", font=font)
        draw.text((5, 220), f"{path.stat().st_size // 1024} KiB", fill=(80, 80, 80), font=font)
        cells.append(cell)
    cols = 5
    rows = max(1, (len(cells) + cols - 1) // cols)
    sheet = Image.new("RGB", (cols * 230, rows * 240), (225, 225, 225))
    for i, cell in enumerate(cells):
        sheet.paste(cell, ((i % cols) * 230, (i // cols) * 240))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=88, optimize=True)


def main():
    shop_full = load(SHOP_FULL)
    products = list(shop_full["products"])
    for p in products:
        p["numericId"] = p["id"].rsplit("/", 1)[-1]
    assert len(products) == 41 and len({p["handle"] for p in products}) == 41
    assert sum(p["totalVariants"] for p in products) == 398
    assert all(p["totalVariants"] == p["variantsReturned"] for p in products)

    pf_meta = {str(p["printfulProductId"]): p for p in load(PF_META)["products"]}
    pf_variant_data = load(PF_VARIANTS_FULL)
    pf_products = {str(p["printfulProductId"]): p for p in pf_variant_data["products"]}
    variant_owners = defaultdict(list)
    for pid, product in pf_products.items():
        for variant in product["variants"]:
            variant_owners[int(variant["id"])].append({"printfulProductId": pid, "variant": variant})
    rights = {str(p["productId"]): p for p in load(RIGHTS)["products"]}
    candidates = local_candidates()
    base_ledger, gal1, gal2 = load(BASE_LEDGER), load(GAL1), load(GAL2)
    old_featured = {e["node"]["handle"]: e["node"].get("featuredImage", {}).get("url")
                    for e in load(OLD_FEATURED)["products"]["edges"]}

    records = []
    transfer_handle = "buegeltransfer-selbst-gestalten"
    for p in products:
        h = p["handle"]
        is_non_printful = h == transfer_handle
        variant_mappings = []
        model_counts = defaultdict(int)
        for variant in p["variants"]:
            sku = variant.get("sku") or ""
            parsed = re.search(r"_(\d+)$", sku)
            vid = int(parsed.group(1)) if parsed else None
            owners = variant_owners.get(vid, []) if vid is not None else []
            if is_non_printful:
                status = "blocked_non_printful_fulfillment"
            elif vid is None:
                status = "unbound_no_numeric_printful_variant_suffix"
            elif len(owners) == 1:
                status = "verified_current_shopify_sku_and_printful_variant_membership"
                model_counts[owners[0]["printfulProductId"]] += 1
            elif len(owners) > 1:
                status = "blocked_ambiguous_printful_variant_membership"
            else:
                status = "unbound_variant_not_in_current_relevant_printful_catalog"
            row = {
                "shopifyVariantId": variant["id"], "shopifyVariantTitle": variant.get("title"),
                "shopifySku": sku, "parsedPrintfulVariantId": vid, "status": status,
                "printfulProductId": owners[0]["printfulProductId"] if len(owners) == 1 else None,
                "printfulVariant": owners[0]["variant"] if len(owners) == 1 else None,
                "evidencePaths": [str(SHOP_FULL), str(PF_VARIANTS_FULL)] if len(owners) == 1 else [str(SHOP_FULL)],
            }
            if is_non_printful:
                row["evidencePaths"].append(str(MISTER_DTF))
            variant_mappings.append(row)

        exact_count = sum(v["status"].startswith("verified_current") for v in variant_mappings)
        complete_identity = (not is_non_printful and p["variantsReturned"] == p["totalVariants"]
                             and exact_count == p["totalVariants"])
        if is_non_printful:
            binding_state = "blocked_non_printful_fulfillment"
        elif complete_identity:
            binding_state = "verified_complete_current_catalog"
        elif exact_count:
            binding_state = "partial_current_catalog"
        else:
            binding_state = "unbound_current_catalog"
        bindings = [{
            "printfulProductId": pid,
            "status": "verified_current_variant_membership",
            "matchedShopifyVariantCount": count,
            "printfulCatalogVariantCount": pf_products[pid]["variantsReturned"],
            "printfulCatalogConfirmed": pf_products[pid]["confirmed"],
            "evidencePaths": [str(SHOP_FULL), str(PF_VARIANTS_FULL)],
        } for pid, count in sorted(model_counts.items(), key=lambda x: int(x[0]))]

        rights_refs = []
        official_meta = []
        for b in bindings:
            pid = b["printfulProductId"]
            if pid in pf_meta:
                md = pf_meta[pid]
                official_meta.append({
                    "printfulProductId": pid, "bindingStatus": b["status"], "title": md["title"],
                    "type": md["type"], "isDiscontinued": md["isDiscontinued"],
                    "variantCount": md["variantCount"],
                    "image": remote(md["imageUrl"], "official_current_printful_catalog_image", PF_META,
                                    f"products[printfulProductId={pid}].imageUrl"),
                    "techniques": md["techniques"], "files": md["files"],
                })
            if pid in rights:
                ref = rights[pid]["reference"]
                rights_refs.append({
                    "printfulProductId": pid, "bindingStatus": b["status"], "url": ref.get("url"),
                    "sha256": ref.get("assetSha256"), "width": ref.get("width"), "height": ref.get("height"),
                    "visualType": ref.get("visualType"), "localPath": None, "sourceManifest": str(RIGHTS),
                    "approval": {"approved": ref.get("approved"), "rightsState": ref.get("rightsState"),
                                 "scope": ref.get("approvalScope"), "customerDesignPreview": False},
                })

        remote_refs = []
        featured = p.get("featuredImageUrl")
        if featured:
            remote_refs.append(remote(featured, "current_shopify_featured_image", SHOP_FULL,
                                      f"products[handle={h}].featuredImageUrl"))
        old = old_featured.get(h)
        if old and old != featured:
            remote_refs.append(remote(old, "historical_shopify_featured_image", OLD_FEATURED,
                                      f"products[handle={h}].featuredImage.url"))
        for i, url in enumerate(base_ledger.get(h, [])):
            remote_refs.append(remote(url, "printful_base_layer_manifest_reference", BASE_LEDGER, f"{h}[{i}]"))
        for source, ledger in ((GAL1, gal1), (GAL2, gal2)):
            for i, url in enumerate(ledger.get(h, [])):
                remote_refs.append(remote(url, "historical_gallery_manifest_reference", source, f"{h}[{i}]"))

        loc = candidates.get(h, [])
        blockers = [
            "No stored official Printful render of the customer's selected design is bound to the selected variant.",
            "No exact product-and-variant geometry plus commercial overlay-rights bundle is bound to a local renderer.",
        ]
        if not complete_identity and not is_non_printful:
            blockers.append("The current Shopify variants do not all have an exact Printful variant membership binding.")
        if is_non_printful:
            blockers.append("This product uses Mister DTF fulfillment and must not be sent to Printful.")
        if rights_refs:
            blockers.append("The exact approvals cover blank catalogue display only and exclude customer-design preview.")
        else:
            blockers.append("No exact customer-preview commercial rights entry is bound to the image.")
        if not loc:
            blockers.append("No local candidate image file with hash and dimensions is associated with this handle.")

        shopify_record = {k: p.get(k) for k in (
            "id", "numericId", "handle", "title", "vendor", "status", "productType", "tags",
            "featuredImageUrl", "totalVariants", "variantsReturned", "variants", "readStatus")}
        records.append({
            "shopify": shopify_record,
            "printfulBinding": {
                "state": binding_state, "bindings": bindings,
                "completeAcrossAllVariants": complete_identity,
                "exactVariantIdentityCount": exact_count,
                "unboundVariantIdentityCount": p["totalVariants"] - exact_count,
                "variantMappings": variant_mappings,
                "officialProductMetadata": official_meta,
            },
            "assets": {"remoteManifestReferences": remote_refs, "localCandidates": loc,
                       "exactRightsApprovedCatalogueReferences": rights_refs},
            "coverage": {
                "hasCurrentFeaturedImageUrl": bool(featured),
                "currentFeaturedBytesLocallyVerified": False,
                "hasLocalCandidateFile": bool(loc),
                "fullVariantIdentityMapping": complete_identity,
                "fullVariantImageMapping": False,
                "commercialCustomerDesignPreviewRights": False,
                "verifiedLocalOverlayGeometry": False,
                "officialCustomerDesignMockupStored": False,
            },
            "decision": {
                "allowAsProductExactDynamicPreview": False,
                "allowAsOfficialPrintfulMockup": False,
                "safePreviewPath": "official_provider_generated_mockup_or_EDM_only_after_separate_runtime_checks",
                "blockers": blockers,
            },
        })

    active = sum(r["shopify"]["status"] == "ACTIVE" for r in records)
    exact_active_printful = [r for r in records if r["shopify"]["status"] == "ACTIVE"
                             and r["printfulBinding"]["completeAcrossAllVariants"]]
    exact_draft_printful = [r for r in records if r["shopify"]["status"] == "DRAFT"
                            and r["printfulBinding"]["completeAcrossAllVariants"]]
    mapping = {
        "schemaVersion": 3,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "scope": {
            "brand": "LuxeStyle", "store": "luxestyle.ch", "products": len(records),
            "shopifyVariants": sum(r["shopify"]["totalVariants"] for r in records),
            "active": active, "draft": len(records) - active,
            "networkReadsDuringBuild": 0, "remoteWrites": 0,
        },
        "sources": {
            "canonicalShopifyProductsAndVariants": manifest(SHOP_FULL),
            "canonicalPrintfulProductsAndVariants": manifest(PF_VARIANTS_FULL),
            "printfulMetadata45": manifest(PF_META), "rights": manifest(RIGHTS),
            "targetedPrintfulVariantOwnership19And181": manifest(PF_OWN),
            "priorVerifiedVariantMappings": manifest(VERIFIED_VARIANTS),
            "misterDtfFulfillment": manifest(MISTER_DTF),
            "historicalTaggedShopifySnapshot": manifest(FRESH),
            "historicalAdditionalShopifySnapshot": manifest(EXTRA),
            "baseLayerLedger": manifest(BASE_LEDGER), "gallery1": manifest(GAL1),
            "gallery2": manifest(GAL2), "editorMap": manifest(EDITOR_MAP), "mugMapping": manifest(MUG_MAP),
        },
        "globalRules": [
            "All 398 Shopify variants were read; SKU membership was checked against all 2,257 variants in the 45 relevant current Printful models.",
            "Complete product/variant identity does not prove image identity, geometry, rendering quality or commercial overlay rights.",
            "Shopify URLs prove association only; remote bytes, dimensions, origin and rights remain unknown without an exact local match.",
            "Null hashes/dimensions remain unknown; no mass image fetch was performed.",
            "AI-retouched, AI-generated, AI-recoloured, schematic and baked-sample assets are not product-exact.",
            "Catalogue-blank approval never implies customer-design overlay rights.",
            "Bügeltransfer is Mister DTF, not Printful.",
        ],
        "coverage": {
            "currentProducts": len(records), "shopifyVariants": sum(r["shopify"]["totalVariants"] for r in records),
            "active": active, "draft": len(records) - active,
            "currentFeaturedImageUrls": sum(bool(r["shopify"]["featuredImageUrl"]) for r in records),
            "currentFeaturedImagesWithLocalHashAndDimensions": 0,
            "productsWithLocalCandidateFiles": sum(bool(r["assets"]["localCandidates"]) for r in records),
            "activePrintfulProductsWithCompleteVariantIdentity": len(exact_active_printful),
            "activePrintfulVariantsWithExactIdentity": sum(r["shopify"]["totalVariants"] for r in exact_active_printful),
            "draftPrintfulProductsWithCompleteVariantIdentity": len(exact_draft_printful),
            "draftPrintfulVariantsWithExactIdentity": sum(r["shopify"]["totalVariants"] for r in exact_draft_printful),
            "activeNonPrintfulProducts": 1,
            "activeNonPrintfulVariants": 1,
            "draftProductsWithUnboundPrintfulVariantIdentity": sum(
                r["shopify"]["status"] == "DRAFT" and not r["printfulBinding"]["completeAcrossAllVariants"]
                for r in records),
            "draftVariantsWithUnboundPrintfulVariantIdentity": sum(
                r["printfulBinding"]["unboundVariantIdentityCount"] for r in records
                if r["shopify"]["status"] == "DRAFT"),
            "fullVariantImageMappings": 0,
            "commercialCustomerDesignPreviewRights": 0,
            "productsWithVerifiedLocalOverlayGeometry": 0,
            "officialCustomerDesignMockupsStored": 0,
            "allowedProductExactDynamicPreviews": 0,
        },
        "products": records,
        "relevantPrintfulCatalog": {
            "products": len(pf_products),
            "variants": sum(p["variantsReturned"] for p in pf_products.values()),
            "note": "Current public metadata and variant membership; unbound models are not Shopify product bindings by themselves.",
        },
        "previewPaths": {
            "localDynamicOverlay": "blocked_for_all_41_products_missing_exact_geometry_and_customer_preview_rights",
            "edm": "separate_provider_editor_path_not_a_stored_image_or_local_overlay_approval",
            "officialPrintfulMockup": "separate_server_generated_path_requires_runtime_product_variant_design_and_rights_checks",
        },
        "mugConclusion": {
            "mappingPath": str(MUG_MAP), "printfulProductId": 19,
            "variants": [1320, 4830, 16586],
            "present": ["blank front-oblique handle-left", "flat wrap template"],
            "missing": ["handle-right", "side", "back", "360", "official customer-design render"],
            "decision": "Local cylindrical overlay must not be labelled as the original Printful preview.",
        },
    }
    out = OUT / "mapping.json"
    out.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    with (OUT / "product-coverage.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["handle", "status", "shopify_product_id", "variants_count", "exact_variant_identities",
                    "printful_product_ids", "variant_identity_complete", "featured_url", "local_candidates",
                    "remote_references", "blank_rights_refs", "local_dynamic_preview"])
        for r in records:
            w.writerow([r["shopify"]["handle"], r["shopify"]["status"], r["shopify"]["numericId"],
                        r["shopify"]["totalVariants"], r["printfulBinding"]["exactVariantIdentityCount"],
                        ",".join(b["printfulProductId"] for b in r["printfulBinding"]["bindings"]),
                        r["printfulBinding"]["completeAcrossAllVariants"],
                        r["shopify"]["featuredImageUrl"], len(r["assets"]["localCandidates"]),
                        len(r["assets"]["remoteManifestReferences"]), len(r["assets"]["exactRightsApprovedCatalogueReferences"]), "NO"])

    mug_out = E / "mug-r137"
    mug_out.mkdir(parents=True, exist_ok=True)
    for path in [MUG_MAP, MUG_ROOT / "contact-sheet.jpg", *sorted((MUG_ROOT / "images").glob("*"))]:
        destination = mug_out / path.name
        if path.is_file() and path.resolve() != destination.resolve():
            shutil.copy2(path, destination)
    sheet_items = []
    for h, assets in sorted(candidates.items()):
        for a in assets:
            path = Path(a["path"])
            if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"} and a["classification"] != "marketing_tile":
                sheet_items.append((path, f"{h}/{path.name}"))
    contact_sheet(sheet_items, E / "local-candidate-assets-contact-sheet.jpg")

    validation = {
        "mapping": manifest(out), "products": len(records),
        "shopifyVariants": sum(r["shopify"]["totalVariants"] for r in records),
        "uniqueHandles": len({r["shopify"]["handle"] for r in records}),
        "active": active, "draft": len(records) - active,
        "activePrintfulProductsWithCompleteVariantIdentity": len(exact_active_printful),
        "activePrintfulVariantsWithExactIdentity": sum(r["shopify"]["totalVariants"] for r in exact_active_printful),
        "draftPrintfulProductsWithCompleteVariantIdentity": len(exact_draft_printful),
        "draftPrintfulVariantsWithExactIdentity": sum(r["shopify"]["totalVariants"] for r in exact_draft_printful),
        "allFailClosed": all(not r["decision"]["allowAsProductExactDynamicPreview"] for r in records),
        "allFullVariantImageMappingsFailClosed": all(not r["coverage"]["fullVariantImageMapping"] for r in records),
        "missingLocalFiles": [a["path"] for r in records for a in r["assets"]["localCandidates"] if a.get("exists") is False],
    }
    (OUT / "validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(validation, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
