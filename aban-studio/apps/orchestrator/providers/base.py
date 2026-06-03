"""Provider abstraction for Aban Studio's multi-API orchestration.

One interface per modality (text / image / audio). Concrete providers live in
sibling modules (text_openai.py, image_flux.py, audio_elevenlabs.py, ...). The
worker selects providers via config so we can swap vendors when API prices drop
or for EU-residency reasons -- a config change, not a rewrite.

Every call returns a GenerationResult carrying the cost data needed to settle
credits and to keep COGS under 20% of the credit price.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Modality(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"


@dataclass
class GenerationResult:
    """Outcome of a single provider call.

    For text, ``content`` holds the generated string and ``binary`` is None.
    For image/audio, ``binary`` holds the bytes and ``content`` is None;
    the worker is responsible for uploading ``binary`` to Supabase Storage.
    """

    modality: Modality
    provider: str
    model: str
    content: str | None = None
    binary: bytes | None = None
    mime_type: str | None = None
    prompt_used: str = ""
    # Cost/audit fields -> api_call_log
    input_tokens: int | None = None
    output_tokens: int | None = None
    unit_cost_eur: float = 0.0
    latency_ms: int | None = None
    meta: dict[str, Any] = field(default_factory=dict)


class Provider(ABC):
    """Base class for all generation providers.

    Subclasses set ``name`` and ``modality`` and implement ``generate``.
    ``eu_resident`` flags whether the provider stores/processes data in the EU
    (used both for routing and for the DSGVO disclosure shown to users).
    """

    name: str
    modality: Modality
    eu_resident: bool = False

    @abstractmethod
    async def generate(self, prompt: str, **options: Any) -> GenerationResult:
        """Run one generation. Must be safe to call concurrently (fan-out)."""
        raise NotImplementedError

    def estimate_credits(self, prompt: str, **options: Any) -> int:
        """Up-front credit estimate used to place a hold before generation.

        Override per provider with a realistic figure. Default is intentionally
        conservative so the pre-authorization never under-reserves.
        """
        return options.get("estimated_credits", 10)


class ProviderRegistry:
    """Resolves the active provider per modality from config.

    Usage:
        registry = ProviderRegistry()
        registry.register(OpenAITextProvider())
        text_provider = registry.get(Modality.TEXT)
    """

    def __init__(self) -> None:
        self._by_modality: dict[Modality, Provider] = {}

    def register(self, provider: Provider) -> None:
        self._by_modality[provider.modality] = provider

    def get(self, modality: Modality) -> Provider:
        try:
            return self._by_modality[modality]
        except KeyError as exc:
            raise LookupError(f"No provider registered for {modality}") from exc

    def active(self) -> dict[Modality, str]:
        return {m: p.name for m, p in self._by_modality.items()}
