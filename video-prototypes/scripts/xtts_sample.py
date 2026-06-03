import os, sys
os.environ["COQUI_TOS_AGREED"]="1"
import torch
# allowlist for torch>=2.6 weights_only load
try:
    from TTS.tts.configs.xtts_config import XttsConfig
    from TTS.tts.models.xtts import XttsAudioConfig, XttsArgs
    from TTS.config.shared_configs import BaseDatasetConfig
    torch.serialization.add_safe_globals([XttsConfig, XttsAudioConfig, XttsArgs, BaseDatasetConfig])
except Exception as e:
    print("warn allowlist:", e)
from TTS.api import TTS
print("loading xtts_v2 (downloads ~1.8GB first time)...")
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False)
spk = tts.synthesizer.tts_model.speaker_manager.speaker_names
print("speakers:", len(spk), spk[:8])
# pick a female-sounding built-in speaker
fav = [s for s in spk if s in ("Daisy Studious","Tammy Grit","Gracie Wise","Alison Dietlinde","Claribel Dervla","Tanja Adelina")]
speaker = (fav or spk)[0]
print("using speaker:", speaker)
txt = "Hey! Sechsundneunzig Mal am Tag greifst du zum Handy. Und merkst es nicht einmal."
tts.tts_to_file(text=txt, speaker=speaker, language="de", file_path="/tmp/xtts_sample.wav")
print("done -> /tmp/xtts_sample.wav")
