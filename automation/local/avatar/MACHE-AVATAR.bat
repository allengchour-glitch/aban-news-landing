@echo off
REM ============================================================================
REM  LuxeStyle — Avatar-Reel erzeugen (PC, nach SETUP-AVATAR.bat).
REM  Text -> piper (Stimme) -> SadTalker (sprechender Kopf) -> ffmpeg 9:16 + Hook.
REM  Doppelklick. Braucht presenter.jpg in diesem Ordner.
REM ============================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"
set REPO=%~dp0..\..\..

if not exist presenter.jpg ( echo [FEHLER] presenter.jpg fehlt in diesem Ordner (frontales Portrait). & pause & exit /b 1 )
set /p TXT="Bärndütsch-Skript (1 Satz): "
if "%TXT%"=="" ( echo Kein Text. & pause & exit /b 1 )
set /p HOOK="Hook-Text fuers Bild (oben, kurz): "

set STAMP=%date:~-4%%date:~3,2%%date:~0,2%-%time:~0,2%%time:~3,2%
set STAMP=%STAMP: =0%
set OUT=%REPO%\reels\avatar-%STAMP%.mp4

echo [1/3] Stimme (piper) ...
echo %TXT% | conda run -n avatar python -m piper -m kerstin.onnx -f voice.wav || ( echo [FEHLER] piper & pause & exit /b 1 )

echo [2/3] Sprechender Kopf (SadTalker) ...
conda run -n avatar python SadTalker\inference.py --driven_audio voice.wav --source_image presenter.jpg --result_dir sad_out --still --preprocess full --enhancer gfpgan || ( echo [FEHLER] SadTalker & pause & exit /b 1 )
for /f "delims=" %%F in ('dir /b /o-d /s sad_out\*.mp4') do ( set TALK=%%F & goto :got )
:got
echo Talking-Head: !TALK!

echo [3/3] 9:16-Finish + Hook (Safe-Zone) ...
set FONT=C:\Windows\Fonts\arialbd.ttf
ffmpeg -y -i "!TALK!" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,drawtext=fontfile='%FONT%':text='%HOOK%':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=150:box=1:boxcolor=black@0.4:boxborderw=20,drawtext=fontfile='%FONT%':text='luxestyle.ch · Code WELCOME10':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=1480:box=1:boxcolor=black@0.35:boxborderw=14" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "%OUT%" || ( echo [FEHLER] ffmpeg & pause & exit /b 1 )

echo.
echo ✅ FERTIG: %OUT%
echo Naechster Schritt (autonom): auf CDN + in social/video_queue.csv -> Worker postet.
pause
