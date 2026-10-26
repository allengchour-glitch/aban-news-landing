"""Conservative one-product, offline description review drafts. Never publishes."""
from __future__ import annotations

import argparse
import difflib
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import unicodedata
from typing import Any

VERSION = "selection-review-v1.0.1"
START = "<!-- ls-selection-guide-v1:start -->"
END = "<!-- ls-selection-guide-v1:end -->"
MAX_INPUT_BYTES = 524_288
VOID = frozenset("area base br col embed hr img input link meta param source track wbr".split())
INERT = frozenset({"script", "style", "template", "noscript"})
SERVICE_CLASSES = frozenset({"ls-liefer", "ls-service", "ls-service-badge", "ls-trust-badge"})
SERVICE_HEADINGS = (
    "versand und ruckgabe", "versand & ruckgabe", "versand & lieferung",
    "sorglos shoppen", "schweizer versprechen", "warum bei luxestyle ch kaufen",
)
OPTION_KINDS = {
    "farbe": "colour", "color": "colour", "colour": "colour",
    "grosse": "size", "groesse": "size", "size": "size",
    "muster": "pattern", "pattern": "pattern",
    "stil": "generic", "style": "generic", "design": "generic",
    "motiv": "generic", "ausfuhrung": "generic", "ausfuehrung": "generic",
    "modell": "generic", "model": "generic", "variante": "generic",
    "variant": "generic", "option": "generic",
}
TECHNICAL_LABEL = re.compile(
    r"\d\s*(?:[x×]\s*\d|(?:mm|cm|kg|ml|mah|hz|watt|volt|v|w)\b)|\b(?:usb|ip\d\d|\d{2,}t)\b", re.I
)
UNSAFE_LABEL_CLAIM = re.compile(
    r"heil|therap|schmerz|antibakter|medizin|wasserdicht|waterproof|tragkraft|belastbar|"
    r"kompatibel|compatible|garantiert|zertifiziert|certified|\b(?:uv-schutz|ce-gepruft)\b", re.I
)
SOURCE_FLAG_RULES = (
    ("EXISTING_MEDICAL_OR_SAFETY_CLAIM", r"heil|therap|schmerz|medizin|antibakter|sicher\s+(?:uber|über)\s+nacht"),
    ("EXISTING_PHYSICAL_OR_PERFORMANCE_CLAIM", r"\b\d+(?:[.,]\d+)?\s*(?:kg|cm|mm|ml|mah|db|watt|volt|stunden|sportmodi)\b|\b\d{2,}T\b|tragkraft|reissfest|reißfest|wasserdicht|schnelltrock"),
    ("EXISTING_MATERIAL_OR_CARE_CLAIM", r"\b(?:leder|nylon|baumwolle|pvc|bambus|material|pflege|waschbar)\b"),
    ("EXISTING_COMPATIBILITY_OR_PACKAGE_CLAIM", r"kompatibel|compatible|lieferumfang|mitgeliefert|im\s+set|in\s+der\s+box|befestigung"),
    ("EXISTING_SERVICE_OR_SUCCESS_CLAIM", r"lieferzeit|werktage|ruckgaberecht|rückgaberecht|geprufte angaben|geprüfte angaben|bestseller|bewertungen|sterne|lagernd|auf lager"),
)


def folded(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.casefold())
    return " ".join("".join(c for c in value if not unicodedata.combining(c)).split())


def sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


class SourceAnalysis(HTMLParser):
    """Read HTML text/offsets without executing or reserializing source markup."""

    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.lines = [0] + [m.end() for m in re.finditer("\n", source)]
        self.stack: list[dict] = []
        self.nodes: list[dict] = []
        self.text_parts: list[str] = []
        self.hrefs: list[str] = []
        self.markers: list[dict] = []
        self.structure_errors: list[str] = []
        self.active_content = False

    def source_offset(self) -> int:
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def safe_context(self) -> bool:
        return not any(n["tag"] in {"p", "a", "span", "strong", "em", "li", "table", "tr", "td", "th"} for n in self.stack)

    def handle_starttag(self, tag: str, attrs: list) -> None:
        attributes = dict(attrs)
        if tag in {"script", "iframe", "object", "embed", "form"}:
            self.active_content = True
        if any(k.lower().startswith("on") for k, _ in attrs):
            self.active_content = True
        if any(str(v or "").lstrip().lower().startswith(("javascript:", "vbscript:")) for k, v in attrs if k in {"href", "src"}):
            self.active_content = True
        if tag == "a" and "href" in attributes:
            self.hrefs.append(attributes["href"])
        node = {"tag": tag, "start": self.source_offset(), "text": [], "parent": self.stack[-1] if self.stack else None, "safeBefore": self.safe_context()}
        self.nodes.append(node)
        classes = set((attributes.get("class") or "").split())
        if classes & SERVICE_CLASSES and node["safeBefore"]:
            self.markers.append({"offset": node["start"], "kind": "known_service_class", "matched": sorted(classes & SERVICE_CLASSES)[0]})
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag in VOID:
            return
        if not self.stack or self.stack[-1]["tag"] != tag:
            self.structure_errors.append("Unexpected or non-nested closing tag: " + tag)
            # Analysis only: do not repair or serialize the source.
            for i in range(len(self.stack) - 1, -1, -1):
                if self.stack[i]["tag"] == tag:
                    del self.stack[i:]
                    return
            return
        self.stack.pop()

    def handle_data(self, value: str) -> None:
        if any(n["tag"] in INERT for n in self.stack):
            return
        self.text_parts.append(value)
        for node in self.stack:
            node["text"].append(value)

    def handle_comment(self, value: str) -> None:
        if re.fullmatch(r"\s*(?:ls-xsell-v1|xsell|ls-service-v1)\s*", value, re.I) and self.safe_context():
            self.markers.append({"offset": self.source_offset(), "kind": "known_comment", "matched": value.strip()})

    def finish(self) -> None:
        self.close()
        if self.stack:
            self.structure_errors.append("Unclosed source tags: " + ", ".join(n["tag"] for n in self.stack))
        for node in self.nodes:
            if node["tag"] not in {"h2", "h3", "h4", "p", "div"} or not node["safeBefore"]:
                continue
            text = folded(" ".join(node["text"]))
            # Ignore decorative leading symbols, not arbitrary text preceding a marker.
            text = re.sub(r"^[^\w]+", "", text)
            if not any(text.startswith(heading) for heading in SERVICE_HEADINGS):
                continue
            target = node
            parent = node["parent"]
            if parent and parent["tag"] in {"div", "section", "aside"} and parent["safeBefore"]:
                parent_text = folded(" ".join(parent["text"]))
                parent_text = re.sub(r"^[^\w]+", "", parent_text)
                if parent_text.startswith(text):
                    target = parent
            self.markers.append({"offset": target["start"], "kind": "known_service_heading", "matched": next(x for x in SERVICE_HEADINGS if text.startswith(x))})

    @property
    def visible_text(self) -> str:
        return " ".join(self.text_parts)


def present_in_text(label: str, visible_text: str) -> bool:
    label = folded(label)
    text = folded(visible_text)
    if not label:
        return False
    return re.search(r"(?<!\w)" + re.escape(label) + r"(?!\w)", text) is not None


def quote_list(values: list[str]) -> str:
    quoted = ["«" + html.escape(value, quote=True) + "»" for value in values]
    if len(quoted) == 1:
        return quoted[0]
    return ", ".join(quoted[:-1]) + " und " + quoted[-1]


def internal_source_flags(product: dict, analysis: SourceAnalysis) -> list[dict]:
    flags = []
    for code, pattern in SOURCE_FLAG_RULES:
        match = re.search(pattern, analysis.visible_text, re.I)
        if match:
            flags.append({"code": code, "scope": "existing_source_preserved_not_verified", "excerpt": analysis.visible_text[max(0, match.start() - 35):match.end() + 70].strip()})
    for tag in product.get("tags", []) if isinstance(product.get("tags", []), list) else []:
        if isinstance(tag, str) and re.search(r"review|auswahl-offen|rueckhol|sperr|entwurf", tag, re.I):
            flags.append({"code": "EXISTING_REVIEW_OR_GUARD_TAG", "scope": "existing_tag_preserved_no_permission_inferred", "value": tag})
    return flags


def option_sentence(name: str, kind: str, values: list[str], technical: bool) -> str:
    labels = quote_list(values)
    # Quote the actual field label without interpreting its semantics. Existing
    # fields named 'Grösse' sometimes contain regional codes rather than sizes.
    return f"In der Auswahl «{html.escape(name, quote=True)}» findest du zum Beispiel {labels}."


def generate_draft(product: dict) -> dict:
    """Return an offline review draft or BLOCKED_NEEDS_SOURCE for ONE product."""
    if not isinstance(product, dict):
        raise TypeError("Expected one product object, not a catalog/list.")
    description = product.get("descriptionHtml")
    result = {
        "generatorVersion": VERSION, "status": "BLOCKED_NEEDS_SOURCE",
        "reviewOnly": True, "liveWriteAllowed": False, "publisherQueue": False,
        "productId": product.get("id"), "title": product.get("title"),
        "source": {"recordCanonicalSha256": sha(canonical(product)), "updatedAt": product.get("updatedAt")},
        "beforeHtml": description if isinstance(description, str) else None,
        "afterHtml": None, "selectionBlockHtml": None, "facts": [],
        "blockers": [], "internalFlags": [], "optionDecisions": [],
    }
    if product.get("status") != "ACTIVE":
        result["blockers"].append({"code": "PRODUCT_NOT_ACTIVE", "detail": "Only the supplied ACTIVE scope is eligible."})
    if not isinstance(description, str) or not description.strip():
        result["blockers"].append({"code": "MISSING_SOURCE_HTML", "detail": "No existing product information to preserve; a grounded description source is required."})
        return result
    result["source"]["descriptionSha256"] = sha(description)
    result["source"]["optionsCanonicalSha256"] = sha(canonical(product.get("options")))
    if len(description.encode("utf-8")) > MAX_INPUT_BYTES:
        result["blockers"].append({"code": "SOURCE_TOO_LARGE_FOR_SINGLE_REVIEW", "detail": "Review this unusually large description manually."})
        return result
    if START in description or 'data-ls-selection-guide="v1"' in description:
        result["blockers"].append({"code": "SELECTION_GUIDE_ALREADY_PRESENT", "detail": "Existing review block must be reviewed, not appended again."})
        return result
    analysis = SourceAnalysis(description)
    analysis.feed(description)
    analysis.finish()
    result["internalFlags"] = internal_source_flags(product, analysis)
    if analysis.active_content:
        result["blockers"].append({"code": "ACTIVE_SOURCE_HTML_REQUIRES_MANUAL_REVIEW", "detail": "Source contains active HTML or event/JavaScript attributes. Nothing was executed."})
    if analysis.structure_errors:
        result["blockers"].append({"code": "UNCERTAIN_SOURCE_HTML_STRUCTURE", "detail": analysis.structure_errors})
    options = product.get("options")
    if not isinstance(options, list) or not options:
        result["blockers"].append({"code": "NO_CONFIGURED_OPTIONS", "detail": "No additional grounded selection data is supplied."})
        return result
    sentences = []
    for option_index, option in enumerate(options):
        decision = {"path": f"options[{option_index}]", "name": option.get("name") if isinstance(option, dict) else None, "reason": None, "selectedLabels": []}
        result["optionDecisions"].append(decision)
        if not isinstance(option, dict) or not isinstance(option.get("name"), str):
            decision["reason"] = "INVALID_OPTION_SCHEMA"
            continue
        name = option["name"].strip()
        normalized_name = folded(name)
        if normalized_name in {"title", "default title"}:
            decision["reason"] = "DEFAULT_OPTION_HIDDEN"
            continue
        kind = OPTION_KINDS.get(normalized_name)
        if not kind:
            decision["reason"] = "OPTION_SEMANTICS_NEED_SOURCE"
            continue
        values = option.get("optionValues")
        if not isinstance(values, list):
            decision["reason"] = "MISSING_OPTION_VALUES"
            continue
        eligible = []
        seen = set()
        for value_index, value in enumerate(values):
            if not isinstance(value, dict) or value.get("hasVariants") is not True or not isinstance(value.get("name"), str):
                continue
            label = value["name"].strip()
            normalized = folded(label)
            if not normalized or normalized in {"default title", "title"} or normalized in seen:
                continue
            seen.add(normalized)
            if len(label) > 72 or re.search(r"[\x00-\x1f<>«»]|https?://|[\U0001F300-\U0001FAFF]", label):
                result["internalFlags"].append({"code": "UNSUITABLE_OPTION_LABEL", "path": f"options[{option_index}].optionValues[{value_index}]", "value": label})
                continue
            if UNSAFE_LABEL_CLAIM.search(folded(label)):
                result["internalFlags"].append({"code": "CLAIM_LIKE_OPTION_LABEL_REQUIRES_SOURCE", "path": f"options[{option_index}].optionValues[{value_index}]", "value": label})
                continue
            eligible.append((label, value_index))
        decision["qualifiedLabelCount"] = len(eligible)
        if len(eligible) < 2:
            decision["reason"] = "NO_MEANINGFUL_OPTION_CHOICE"
            continue
        novel = [(label, idx) for label, idx in eligible if not present_in_text(label, analysis.visible_text)]
        decision["existingLabels"] = [label for label, _ in eligible if present_in_text(label, analysis.visible_text)]
        if not novel:
            decision["reason"] = "OPTION_INFORMATION_ALREADY_PRESENT"
            continue
        selected = novel[:3]
        labels = [label for label, _ in selected]
        technical = any(TECHNICAL_LABEL.search(label) for label in labels)
        if technical:
            result["internalFlags"].append({"code": "TECHNICAL_LABELS_ARE_NOT_VERIFIED_SPECIFICATIONS", "scope": "quoted_option_names_only", "values": labels})
        decision.update({"reason": "NEW_EXACT_LABEL_EXAMPLES", "selectedLabels": labels})
        sentences.append(option_sentence(name, kind, labels, technical))
        for label, value_index in selected:
            result["facts"].append({"kind": "exact_configured_option_label_only", "optionName": name, "value": label, "namePath": f"options[{option_index}].optionValues[{value_index}].name", "hasVariantsPath": f"options[{option_index}].optionValues[{value_index}].hasVariants", "hasVariants": True, "doesNotProve": ["availability", "variant_combinations", "physical_specification", "package_contents"]})
        if len(sentences) == 2:
            break
    if not sentences:
        result["blockers"].append({"code": "NO_NEW_GROUNDED_SELECTION_HELP", "detail": "Need additional verified product/selection information; no minimum length or filler is generated."})
    if result["blockers"]:
        return result
    block = START + '\n<section data-ls-selection-guide="v1">\n<h3>Deine Ausführung wählen</h3>\n' + "\n".join("<p>" + text + "</p>" for text in sentences) + "\n</section>\n" + END
    # A leading delivery badge is not the end of the product introduction.
    # Leave its original position intact and prefer a later service/cross-sell
    # boundary after actual source content.
    later_markers = [item for item in analysis.markers
                     if description[:item["offset"]].strip()
                     and not (item["kind"] == "known_service_class"
                              and item["matched"] == "ls-liefer")]
    if later_markers:
        marker = min(later_markers, key=lambda item: item["offset"])
        offset = marker["offset"]
    else:
        marker = {"offset": len(description), "kind": "append_after_preserved_source", "matched": None}
        offset = len(description)
    insertion = "\n" + block + "\n"
    after = description[:offset] + insertion + description[offset:]
    preserved = after[:offset] + after[offset + len(insertion):] == description
    assert preserved
    after_analysis = SourceAnalysis(after)
    after_analysis.feed(after)
    after_analysis.finish()
    assert after_analysis.hrefs == analysis.hrefs
    result.update({
        "status": "DRAFT_REVIEW_ONLY", "afterHtml": after, "selectionBlockHtml": block,
        "insertion": {**marker, "charOffset": offset, "utf8ByteOffset": len(description[:offset].encode("utf-8"))},
        "rawSourcePreservedExactly": preserved, "existingHrefsPreservedExactly": True,
        "addedHrefCount": 0, "newPhysicalClaims": False,
        "selectionExamplesAreExhaustive": False, "variantCombinationsInferred": False,
        "diff": "".join(difflib.unified_diff(description.splitlines(keepends=True), after.splitlines(keepends=True), fromfile="description.before.html", tofile="description.review.html")),
        "requiredReview": ["Check exact customer wording and option-source paths.", "Resolve existing source flags before any separate approval.", "Re-read current source before any separately authorized application."],
    })
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate ONE offline review draft from one product JSON object. No batch/API/publisher mode.")
    parser.add_argument("input", nargs="?", default="-", help="One JSON object file, or - for stdin; JSONL/catalog input is rejected.")
    args = parser.parse_args()
    if args.input == "-":
        raw = sys.stdin.buffer.read(MAX_INPUT_BYTES + 1)
    else:
        path = Path(args.input)
        if path.stat().st_size > MAX_INPUT_BYTES:
            parser.error("Input exceeds single-product limit; catalogs/JSONL are not accepted.")
        raw = path.read_bytes()
    if len(raw) > MAX_INPUT_BYTES:
        parser.error("Input exceeds single-product limit; catalogs/JSONL are not accepted.")
    try:
        product = json.loads(raw)
        result = generate_draft(product)
    except (ValueError, TypeError) as error:
        parser.error(str(error))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
