"""mediakit/audio.py — wiederverwendbare ffmpeg-Audio-Filterstrings.

Stimm-EQ + dezente, generierte Hintergrund-Betten. Die Funktionen liefern reine
ffmpeg-Filter-Strings, die reel.py / video_edit.py zusammensetzen.

Stile (statt des alten brummigen A-Moll-Drones):
  warm  — weicher Dur-Pad (C-E-G-C), höher & mit Hochpass → kein tiefes Summen (Default)
  soft  — ein einzelner, sehr dezenter warmer Pad-Ton
  lofi  — gefiltertes braunes Rauschen (ruhiger Lo-Fi-Teppich, ganz ohne Ton/Brummen)
  none  — kein Bett
Eigene Musik: reel/​video akzeptieren eine Datei (royalty-free), die das Bett ersetzt.
"""

# Stimme entrumpeln + laut-normalisieren (für /with-timestamps-Voiceover)
VOICE_EQ = "highpass=f=60,dynaudnorm=f=200"

STYLES = ("warm", "soft", "lofi", "none")


def ambient(style="warm", gain=0.12, label="d"):
    """Hintergrund-Bett als Filter-Fragment, das [<label>] erzeugt. None bei 'none'."""
    if style == "none":
        return None
    if style == "lofi":
        # braunes Rauschen, tief gefiltert + Hochpass gegen Rumpeln → sanfter Teppich, kein Ton
        return (
            "anoisesrc=color=brown:amplitude=0.9,"
            "highpass=f=120,lowpass=f=900,tremolo=f=0.15:d=0.18,"
            f"volume={gain * 1.6:.3f}[{label}]"
        )
    if style == "soft":
        # ein warmer Pad-Akkord (G3+D4), sehr dezent
        return (
            "sine=f=196,volume=0.5[s1];sine=f=293.66,volume=0.22[s2];"
            "[s1][s2]amix=inputs=2:normalize=0,"
            f"highpass=f=120,lowpass=f=1100,volume={gain:.3f}[{label}]"
        )
    # "warm" (Default): weicher Dur-Pad C-E-G-C, höher als der alte Drone + Hochpass → kein Brummen
    return (
        "sine=f=130.81,volume=0.40[w1];sine=f=164.81,volume=0.34[w2];"
        "sine=f=196.00,volume=0.30[w3];sine=f=261.63,volume=0.16[w4];"
        "[w1][w2][w3][w4]amix=inputs=4:normalize=0,"
        "tremolo=f=0.10:d=0.16,highpass=f=110,lowpass=f=1200,"
        f"aecho=0.8:0.7:500|900:0.3|0.2,volume={gain:.3f}[{label}]"
    )


def ambient_drone(gain=0.12, label="d"):
    """Rückwärtskompatibel: liefert jetzt den wärmeren 'warm'-Pad statt des alten Drones."""
    return ambient("warm", gain=gain, label=label)
