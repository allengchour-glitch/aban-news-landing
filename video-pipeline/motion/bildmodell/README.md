# Lokales Bildmodell (CPU) für Hintergründe

Ersatz für den Cloud-Weg aus dem Referenz-Short (ChatGPT, OpenArt mit Nano Banana Pro, SeeDance): ein kleines Bildmodell, das ohne GPU läuft. Es ist **deutlich schwächer** als Nano Banana Pro und **kein Videomodell**.

## Was installiert ist
- `stable-diffusion-cpp-python` (kompiliert aus dem Quelltext, CPU)
- Stable Diffusion 1.5 (`v1-5-pruned-emaonly.safetensors`, 4,27 GB, Prüfsumme beginnt mit 6ce0161689b3) und das LCM-LoRA (135 MB) in `~/.local/share/luxe-bildmodelle` (nicht im Repo)

## Installation neu ausführen
```bash
python3 -m pip install stable-diffusion-cpp-python
mkdir -p ~/.local/share/luxe-bildmodelle && cd ~/.local/share/luxe-bildmodelle
curl -L -o sd15.safetensors https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors
curl -L -o sd15-lcm-lora.safetensors https://huggingface.co/latent-consistency/lcm-lora-sdv1-5/resolve/main/pytorch_lora_weights.safetensors
```

## Benutzung
```bash
python3 bild.py "storybook illustration, golden wheat field at sunrise, hand painted" --out ../ausgabe/weizen.png --seed 3
```
Vier Schritte, 512×896 (etwa 9:16). Danach auf 1080×1920 hochskalieren (z. B. `ffmpeg -vf scale=1080:1920:flags=lanczos`).

## Lizenz (nicht rechtsverbindlich geprüft)
Stable Diffusion 1.5 steht unter CreativeML OpenRAIL-M, das LCM-LoRA unter OpenRAIL++-M: kommerzielle Nutzung ist grundsätzlich erlaubt, mit nutzungsbezogenen Verboten, die man weitergeben muss. Vor der Veröffentlichung selbst gegenlesen. Bewusst nicht gewählt: die schnellen Ein-Schritt-Modelle von Stability AI (nur nicht-kommerziell).

## Grenzen
- Keine Schrift im Bild, keine festen Figuren: Pia bleibt Vektor, das Modell liefert nur Hintergründe.
- Stil wechselt von Bild zu Bild; für einheitliche Szenen immer denselben Stil-Prompt und feste Seeds verwenden.
- Videomodelle (SeeDance) laufen hier nicht: kein CUDA, 4 Kerne.
