@echo off
REM ============================================================================
REM  LuxeStyle — Voice-Cloning einrichten (PC mit NVIDIA-GPU). F5-TTS (Code MIT).
REM  Klont eine Stimme aus ~10-15s Referenz UND uebernimmt Akzent/Prosodie ->
REM  mit Berner Referenz + Baernduetsch-Text klingt's authentisch schwiizerisch.
REM  Doppelklick. Voraussetzung: Miniconda/conda, NVIDIA-CUDA.
REM ============================================================================
setlocal
cd /d "%~dp0"
where conda >nul 2>nul || ( echo [FEHLER] conda fehlt: https://docs.conda.io/en/latest/miniconda.html & pause & exit /b 1 )

echo [1/3] Conda-Env "voiceclone" (Python 3.10) ...
call conda create -y -n voiceclone python=3.10 || goto :err
echo [2/3] PyTorch (CUDA 12.1) ...
call conda run -n voiceclone pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121 || goto :err
echo [3/3] F5-TTS (Voice-Clone) ...
call conda run -n voiceclone pip install f5-tts || goto :err

echo.
echo FERTIG. Klonen: KLON-STIMME.bat
echo Brauchst: eine Referenz-WAV (10-15s, RECHTE GEKLAERT - deine eigene/lizenzierte Stimme!).
echo Tipp: Referenz in der Cloud holen mit automation/fetch_voice_ref.sh (nur eigenes/erlaubtes Material).
pause
exit /b 0
:err
echo [FEHLER] Setup abgebrochen.
pause
exit /b 1
