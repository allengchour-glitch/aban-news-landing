import os; os.environ["COQUI_TOS_AGREED"]="1"
import torch
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import XttsAudioConfig, XttsArgs
from TTS.config.shared_configs import BaseDatasetConfig
torch.serialization.add_safe_globals([XttsConfig,XttsAudioConfig,XttsArgs,BaseDatasetConfig])
from TTS.api import TTS
tts=TTS("tts_models/multilingual/multi-dataset/xtts_v2",progress_bar=False)
txt="Hey! Sechsundneunzig Mal am Tag greifst du zum Handy. Und merkst es nicht einmal."
for spk in ["Daisy Studious","Gracie Wise","Ana Florence","Tammie Ema"]:
    fn="/tmp/xtts_"+spk.split()[0].lower()+".wav"
    tts.tts_to_file(text=txt,speaker=spk,language="de",file_path=fn)
    print("ok",spk,fn)
print("ALL DONE")
