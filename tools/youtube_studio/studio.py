"""Erstellt originale Short-Entwürfe lokal, ohne Kontozugriff oder Veröffentlichung."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import subprocess

FOLGEN = [
 {'id':'email-entwurf','titel':'E-Mails schneller beantworten: mit einer Prüfstation',
  'szenen':['E-Mail-Automation?\nBaue zuerst eine Prüfstation.', '1 / SORTIEREN\nAnfrage, Termin oder Reklamation?\nUnklare Fälle bleiben manuell.', '2 / ENTWURF\nNur freigegebene Firmeninfos nutzen.\nKeine Liefertermine erfinden.', '3 / PRÜFEN\nAntwort lesen, dann versenden.\nTeste zuerst mit Demo-E-Mails.'],
  'beschreibung':'Ein einfacher Ablauf für kleine Betriebe: Anfragen sortieren, Antwortentwürfe erstellen und vor dem Versand prüfen. Demo-Konzept, keine gemessene Zeitersparnis. Welcher Schritt kostet dich am meisten Zeit?'},
 {'id':'angebot-nachfassen','titel':'Offene Angebote nachfassen, ohne Kunden zu nerven',
  'szenen':['Angebot geschickt.\nUnd dann vergessen?', '1 / LISTE\nAngebotsnummer, Datum, Status.\nAbgeschlossene Angebote auslassen.', '2 / ERINNERN\nNach sieben Tagen einen Entwurf bauen.\nSieben Tage sind eine Beispielregel.', '3 / PERSÖNLICH BLEIBEN\nGibt es noch Fragen zum Angebot?\nVor dem Senden prüfen.'],
  'beschreibung':'So lässt sich ein Angebots-Nachfasser als kleiner Prototyp aufbauen. Die Sieben-Tage-Frist ist eine Beispielregel, kein Beleg für bessere Verkäufe. Welche Frist passt zu deinem Betrieb?'},
 {'id':'null-fehler','titel':'Ein grüner Test bedeutet noch keinen fehlerfreien Shop',
  'szenen':['Alles grün.\nIst dein Shop jetzt fehlerfrei?', '1 / UMFANG\nWas hat der Test wirklich geprüft?\nAusgelassene Produkte zählen nicht.', '2 / FRISCHE\nVon wann ist die Messung?\nAlte Daten sind keine Live-Prüfung.', '3 / NACHWEIS\nFehler beheben und frisch prüfen.\nNull bekannte Fehler bleibt das Ziel.'],
  'beschreibung':'Drei Fragen, die vor falscher Sicherheit schützen: Prüfumfang, Messzeit und erneuter Nachweis. Ein grüner Workflow ist keine vollständige Shopprüfung.'}
]


def bauen(out, render=False, folge=0):
    if folge not in range(len(FOLGEN)): raise ValueError('Unbekannte Folge.')
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    video = FOLGEN[folge]
    (out/'folge.json').write_text(json.dumps(video,ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'kanal-entwurf.txt').write_text('Vorschlag: oio | KI im Arbeitsalltag\n\nPraktische KI und kleine Automationen für Selbstständige und kleine Betriebe. Wir zeigen Abläufe, Beispiele und ihre Grenzen: E-Mails, Angebote und Shop-Prüfungen. Keine erfundenen Erfolgszahlen.\n\nZielkanal laut Screenshot: https://www.youtube.com/@oio-o7s\nKontozuordnung noch nicht bestätigt.\n',encoding='utf-8')
    status={'version':1,'gemessen':datetime.now(timezone.utc).isoformat(),'folge':video['id'],
            'skript_gebaut':True,'video_gebaut':False,'veroeffentlicht':False,'kanal_bestaetigt':False,
            'follower':None,'wachstum_gemessen':False,'ton':'Stumm; Textvideo-Entwurf'}
    def speichern(): (out/'status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2),encoding='utf-8')
    speichern()
    if render:
        ffmpeg=shutil.which('ffmpeg')
        if not ffmpeg: raise ValueError('ffmpeg fehlt; nur Skript gebaut.')
        filters=[
            'drawbox=x=36:y=410:w=648:h=460:color=0x19394a:t=fill',
            'drawbox=x=36:y=410:w=6:h=460:color=0x78dfc6:t=fill',
            "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='OIO / KI IM ARBEITSALLTAG':fontcolor=0x78dfc6:fontsize=24:x=60:y=250",
            "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Kleine Abläufe. Klare Schritte.':fontcolor=0xb5ccd7:fontsize=25:x=60:y=990"
        ]
        for i,text in enumerate(video['szenen']):
            (out/f'szene-{i}.txt').write_text(text,encoding='utf-8')
            filters.append(f"drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile=szene-{i}.txt:fontcolor=white:fontsize=34:line_spacing=18:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(t,{i*7})*lt(t,{(i+1)*7})'")
        for i in range(4):
            filters.append(f"drawbox=x={60+i*155}:y=1090:w=135:h=7:color=0x78dfc6:t=fill:enable='gte(t,{i*7})'")
        cmd=[ffmpeg,'-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=0x102337:s=720x1280:r=24:d=28',
             '-vf',','.join(filters),'-an','-c:v','libx264','-preset','ultrafast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart','short.mp4']
        try:
            subprocess.run(cmd,cwd=out,check=True,capture_output=True,timeout=180)
        except (subprocess.SubprocessError,OSError):
            (out/'short.mp4').unlink(missing_ok=True)
            raise ValueError('Video-Bau fehlgeschlagen; kein fertiges Video freigegeben.')
        status['video_gebaut']=True
        speichern()
    return status


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('ausgabe',type=Path)
    p.add_argument('--render',action='store_true')
    p.add_argument('--folge',type=int,default=0)
    a=p.parse_args()
    try: bauen(a.ausgabe,a.render,a.folge)
    except (ValueError,OSError) as e: p.exit(2,str(e)+'\n')
