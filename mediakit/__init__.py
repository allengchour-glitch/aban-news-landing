"""mediakit — gemeinsames Bild- & Video-Bearbeitungs-Toolkit (aban news).

Bequemer Zugriff auf das Markenkit:
    from mediakit import brand
    from mediakit.brand import AMBER, font, slide
Video-/Reel-Module (video_edit, reel) brauchen `imageio-ffmpeg`.
"""
from . import brand  # noqa: F401

__all__ = ["brand"]
