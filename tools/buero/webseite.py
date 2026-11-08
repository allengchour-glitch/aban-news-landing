"""Öffentliche Handyansicht ohne private Daten oder vorgetäuschte Live-Verbindung."""
import ast
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent
PUBLIC_IDS = {'auswahl','schaufenster','waechter','autopilot','fortura','printful','tagesupdate','paket',
              'social_meta','social_pinterest','social_linkedin','dev_bauen','dev_pruefen','dev_angebot',
              'yt_skript','yt_video','yt_wachstum','seitenpflege'}


def bauen(ziel):
    spec=importlib.util.spec_from_file_location('buero',ROOT/'make_buero.py')
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    rows=[]
    for original in module.ROWS:
        if original['id'] not in PUBLIC_IDS: continue
        row={k:original[k] for k in ('id','bereich','name','kurz','figur')}
        row.update({'status':'gelb','befund':'Webansicht ohne verbundene Statusquelle. Kein aktueller Lauf und kein Arbeitsfortschritt gemessen.',
                    'ereignis':'Nicht verbunden','ereignis_iso':'','gemessen':'','gemessen_text':'Nicht gemessen',
                    'frisch_h':0,'aktiv_h':0,'menge':0,'quelle':'Öffentliche Büroansicht ohne private Daten',
                    'ort_art':'cloud','ort':'GitHub-Projekt','ort_kurz':'GitHub','ort_text':'Die Webansicht öffnet ohne Installation. Für echte Arbeitsstände muss eine Datenquelle verbunden werden.',
                    'link':'https://github.com/allengchour-glitch/aban-news-landing/tree/main/tools/buero'})
        rows.append(row)
    module.aktionen(rows)
    tree=ast.parse((ROOT/'pruefung/harness.py').read_text())
    template=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='KOPF' for t in n.targets))
    template=template.replace("  var NOW = Date.parse('2026-11-05T20:30:00Z');\n  Date.now = function () { return NOW; };\n",'')
    template=template.replace('<html lang="de"><head>','<html lang="de"><head><title>KI-Büro – Webansicht</title><meta name="robots" content="noindex,nofollow">')
    body=(ROOT/'seite.html').read_text()
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['node',str(ROOT/'3d/bauen.mjs'),tmp],check=True,capture_output=True)
        def inline(match):
            content=(Path(tmp)/match.group(1)).read_text().replace('</script','<\\/script')
            return '<script>'+content+'</script>'
        body=re.sub(r'<script src="(kb3d-[^"]+\.js)"></script>',inline,body)
    notice='<p style="padding:14px;background:#fff2ce;color:#352900;border-radius:12px">Direkt auf dem Handy nutzbar. Diese Webansicht enthält keine privaten Daten und ist noch nicht mit deinen Live-Arbeitsständen verbunden.</p>'
    body=notice+body
    result=template.replace('%%ROWS%%',json.dumps(rows,ensure_ascii=False)).replace('%%BODY%%',body)
    result=result.replace("</body>", "<script>window.__runAll();document.querySelectorAll('.kb-tab').forEach(function(b){b.addEventListener('click',function(){window.__runAll();});});setTimeout(window.__runAll,0);</script></body>")
    Path(ziel).write_text(result,encoding='utf-8')
    return rows


if __name__=='__main__':
    bauen(sys.argv[1])
