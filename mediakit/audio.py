"""mediakit/audio.py — wiederverwendbare ffmpeg-Audio-Filterstrings.

Stimm-EQ + ein ruhiger A-Moll-Ambient-Pad (portiert aus aban-files, aber leiser/
ruhiger für aban news — anti-hype statt Doku-Dread). Funktionen liefern reine
ffmpeg-Filter-Strings, damit reel.py / video_edit.py sie zusammensetzen können.
"""

# Stimme entrumpeln + laut-normalisieren (für /with-timestamps-Voiceover)
VOICE_EQ = "highpass=f=60,dynaudnorm=f=200"


def ambient_drone(gain=0.14, label="d"):
    """A-Moll-Pad (A/C#/E/A) als Filter-Fragment, das [<label>] erzeugt.

    gain ~0.14 = dezent (aban news). aban-files nutzt 0.2 (cinematischer).
    """
    return (
        "sine=f=110,volume=0.5[m1];sine=f=164.81,volume=0.4[m2];"
        "sine=f=220,volume=0.3[m3];sine=f=329.63,volume=0.12[m4];"
        "[m1][m2][m3][m4]amix=inputs=4:normalize=0,"
        f"tremolo=f=0.12:d=0.45,lowpass=f=1500,aecho=0.8:0.7:450|800:0.4|0.25,"
        f"volume={gain}[{label}]"
    )
