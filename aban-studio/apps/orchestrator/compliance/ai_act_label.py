"""EU AI Act Article 50 transparency labeling for generated assets.

Article 50 obligations apply from 2 August 2026: AI-generated audio/image/video/
text must be marked in a machine-readable form, AI interaction must be disclosed,
and deepfakes/synthetic media must be labeled. The European Commission's detailed
guidance is expected ~Q2 2026, so all disclosure wording is kept config-driven
here -- updating it is a one-line change, not a refactor.

This module produces the ``ai_act_label`` JSON stored on each content_asset and
the human-visible disclosure text included in every export.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

# --- Config: edit these strings when the Commission guidance lands (Q2 2026) ---

# Disclosure version -> bump when wording changes (also logged to consent_events).
DISCLOSURE_VERSION = "2026.1"

# Visible disclosure shown in exports, per locale.
VISIBLE_DISCLOSURE: dict[str, str] = {
    "de-DE": "Dieser Inhalt wurde mit Künstlicher Intelligenz erstellt (KI-generiert).",
    "de-AT": "Dieser Inhalt wurde mit Künstlicher Intelligenz erstellt (KI-generiert).",
    "de-CH": "Dieser Inhalt wurde mit Künstlicher Intelligenz erstellt (KI-generiert).",
    "en": "This content was generated with artificial intelligence (AI-generated).",
}

# Machine-readable marker embedded in/alongside the asset.
MACHINE_MARKER = "ai-generated"


@dataclass
class AiActLabel:
    """Structured label persisted to content_assets.ai_act_label (jsonb)."""

    kind: str                       # text | image | audio
    machine_marker: str
    visible_disclosure: str
    disclosure_version: str
    provider: str
    model: str
    c2pa_ref: str | None = None     # set by c2pa_stamp for image/audio
    labeled_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_json(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "machine_marker": self.machine_marker,
            "visible_disclosure": self.visible_disclosure,
            "disclosure_version": self.disclosure_version,
            "provider": self.provider,
            "model": self.model,
            "c2pa_ref": self.c2pa_ref,
            "labeled_at": self.labeled_at,
        }


def build_label(
    *,
    kind: str,
    provider: str,
    model: str,
    locale: str = "de-DE",
    c2pa_ref: str | None = None,
) -> AiActLabel:
    """Create the Art. 50 label for one asset.

    ``c2pa_ref`` is provided for image/audio after the C2PA manifest is stamped
    (see c2pa_stamp.py); text assets carry the marker via metadata only.
    """
    disclosure = VISIBLE_DISCLOSURE.get(locale, VISIBLE_DISCLOSURE["en"])
    return AiActLabel(
        kind=kind,
        machine_marker=MACHINE_MARKER,
        visible_disclosure=disclosure,
        disclosure_version=DISCLOSURE_VERSION,
        provider=provider,
        model=model,
        c2pa_ref=c2pa_ref,
    )


def export_footer(locale: str = "de-DE") -> str:
    """Disclosure line appended to exported text / ZIP readme."""
    return VISIBLE_DISCLOSURE.get(locale, VISIBLE_DISCLOSURE["en"])
