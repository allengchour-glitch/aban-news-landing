#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bild.py — erzeugt ein Bild lokal auf der CPU (Stable Diffusion 1.5 + LCM-LoRA über stable-diffusion.cpp).

Aufruf:
  python3 bild.py "Prompt" --out ausgabe/bild.png [--breite 512] [--hoehe 896] [--seed 1] [--schritte 4] [--negativ "..."]

Modelle (nicht im Repo): LUXE_BILDMODELLE (Vorgabe ~/.local/share/luxe-bildmodelle) mit
  sd15.safetensors            Stable Diffusion 1.5 (v1-5-pruned-emaonly)
  sd15-lcm-lora.safetensors   LCM-LoRA für 4 Schritte statt 20
Installation: siehe README.md. Ohne GPU dauert ein Bild je nach Grösse etwa eine halbe bis eine Minute.
"""
import argparse, os, sys, time
from pathlib import Path


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("prompt"); a.add_argument("--out", required=True)
    a.add_argument("--breite", type=int, default=512); a.add_argument("--hoehe", type=int, default=896)
    a.add_argument("--seed", type=int, default=1); a.add_argument("--schritte", type=int, default=4)
    a.add_argument("--cfg", type=float, default=1.5)
    a.add_argument("--negativ", default="text, letters, watermark, logo, signature, blurry, deformed, extra limbs, photo")
    a.add_argument("--threads", type=int, default=0, help="0 = alle Kerne")
    o = a.parse_args()
    if o.breite % 64 or o.hoehe % 64: sys.exit("FEHLER: Breite und Höhe müssen durch 64 teilbar sein")
    if not 1 <= o.schritte <= 8: sys.exit("FEHLER: --schritte 1 bis 8 (LCM braucht 4)")
    ordner = Path(os.environ.get("LUXE_BILDMODELLE", Path.home() / ".local/share/luxe-bildmodelle"))
    modell, lora = ordner / "sd15.safetensors", ordner / "sd15-lcm-lora.safetensors"
    for f in (modell, lora):
        if not f.is_file(): sys.exit(f"FEHLER: Modelldatei fehlt: {f} (Download siehe README.md)")
    from stable_diffusion_cpp import StableDiffusion
    sd = StableDiffusion(model_path=str(modell), lora_model_dir=str(ordner), n_threads=o.threads or -1, wtype="default", verbose=False)
    t = time.time()
    bilder = sd.generate_image(prompt=f"{o.prompt} <lora:sd15-lcm-lora:1>", negative_prompt=o.negativ, width=o.breite, height=o.hoehe,
                               cfg_scale=o.cfg, sample_steps=o.schritte, sample_method="lcm", seed=o.seed)
    out = Path(o.out); out.parent.mkdir(parents=True, exist_ok=True)
    bilder[0].save(out)
    print(f"Fertig: {out} ({o.breite}x{o.hoehe}, {o.schritte} Schritte, Seed {o.seed}, {time.time() - t:.0f} s)")


if __name__ == "__main__":
    main()
