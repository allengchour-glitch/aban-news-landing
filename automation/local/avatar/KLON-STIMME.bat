@echo off
REM ============================================================================
REM  LuxeStyle — Bärndütsch mit GEKLONTER Stimme erzeugen (PC, nach SETUP-VOICECLONE).
REM  Referenz-WAV (rechte-geklaert!) + Bärndütsch-Text -> klingt wie die Referenz.
REM ============================================================================
setlocal
cd /d "%~dp0"
set /p REF="Referenz-WAV (10-15s, Pfad): "
if not exist "%REF%" ( echo [FEHLER] Referenz nicht gefunden. & pause & exit /b 1 )
set /p REFTXT="Was wird in der Referenz GESAGT (Text): "
set /p GENTXT="Bärndütsch-Text der gesprochen werden soll: "

echo Klone Stimme (F5-TTS) ...
conda run -n voiceclone f5-tts_infer-cli --ref_audio "%REF%" --ref_text "%REFTXT%" --gen_text "%GENTXT%" --output_dir clone_out || ( echo [FEHLER] F5-TTS & pause & exit /b 1 )

echo.
echo ✅ FERTIG -> Ordner clone_out\ (WAV). Damit ein Reel:
echo   render_masterpiece.sh nimmt die WAV als voice.wav  (oder bern_voiceover-Workflow)
echo Tipp: Berner Referenz + Bärndütsch-Text = authentischer Schwiizer-Klang.
pause
