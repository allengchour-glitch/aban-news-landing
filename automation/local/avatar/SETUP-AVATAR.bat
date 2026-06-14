@echo off
REM ============================================================================
REM  LuxeStyle — Avatar-Sprecher EINMALIG einrichten (PC mit NVIDIA-GPU).
REM  SadTalker (Apache-2.0) + OpenVoice (MIT). Doppelklick. ~15-30 Min beim 1. Mal.
REM  Voraussetzung: Miniconda/conda, git, ffmpeg im PATH, NVIDIA-Treiber/CUDA.
REM ============================================================================
setlocal
cd /d "%~dp0"
echo === LuxeStyle Avatar-Setup ===

where conda >nul 2>nul || ( echo [FEHLER] conda nicht gefunden. Miniconda installieren: https://docs.conda.io/en/latest/miniconda.html & pause & exit /b 1 )
where git   >nul 2>nul || ( echo [FEHLER] git nicht gefunden. & pause & exit /b 1 )
where ffmpeg>nul 2>nul || ( echo [WARN] ffmpeg nicht im PATH - fuers Finish noetig. )

echo.
echo [1/5] Conda-Env "avatar" (Python 3.10) ...
call conda create -y -n avatar python=3.10 || goto :err
echo [2/5] PyTorch (CUDA 12.1) ...
call conda run -n avatar pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 || goto :err

if not exist SadTalker ( echo [3/5] SadTalker klonen ... & git clone https://github.com/OpenTalker/SadTalker.git || goto :err ) else ( echo [3/5] SadTalker schon da )
call conda run -n avatar pip install -r SadTalker\requirements.txt || echo [WARN] einige SadTalker-Deps evtl. manuell noetig
echo     SadTalker-Checkpoints laden ...
pushd SadTalker
if exist scripts\download_models.sh ( bash scripts\download_models.sh ) else ( echo [WARN] download_models.sh fehlt - Checkpoints manuell laden, s. SadTalker README )
popd

if not exist OpenVoice ( echo [4/5] OpenVoice klonen ... & git clone https://github.com/myshell-ai/OpenVoice.git || goto :err ) else ( echo [4/5] OpenVoice schon da )
call conda run -n avatar pip install -e OpenVoice || echo [WARN] OpenVoice-Install pruefen
echo     OpenVoice-Checkpoints: s. OpenVoice README (checkpoints_v2 herunterladen nach OpenVoice\checkpoints_v2)

echo [5/6] piper-TTS (Stimme, MIT) + deutsche Stimme ...
call conda run -n avatar pip install piper-tts || echo [WARN] piper-tts pruefen
if not exist kerstin.onnx ( curl -sS -L -o kerstin.onnx "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/kerstin/low/de_DE-kerstin-low.onnx" & curl -sS -L -o kerstin.onnx.json "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/kerstin/low/de_DE-kerstin-low.onnx.json" )

echo [6/6] Fertig (sofern keine FEHLER oben).
echo Naechster Schritt: presenter.jpg in diesen Ordner legen, dann MACHE-AVATAR.bat
pause
exit /b 0
:err
echo [FEHLER] Setup abgebrochen - Meldung oben pruefen.
pause
exit /b 1
