"""Öffentliche Handyansicht ohne private Daten oder vorgetäuschte Live-Verbindung."""
import ast
import hashlib
import zipfile
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent
PUBLIC_IDS = {'auswahl','schaufenster','waechter','autopilot','fortura','printful',
              'social_meta','social_pinterest','dev_bauen','dev_pruefen','dev_angebot',
              'yt_skript','yt_video','yt_wachstum'}


def bauen(ziel, design_paket=None, werkstatt_status=None):
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
                    'ort_art':'cloud','ort':'Arbeitsbereich','ort_kurz':'Büro','ort_text':'Die Webansicht öffnet ohne Installation. Für echte Arbeitsstände muss eine Datenquelle verbunden werden.',
                    'link':''})
        rows.append(row)
    module.aktionen(rows)
    for row in rows:
        row["link"] = row["aktion_url"] = ""
        row["aktion_hinweis"] = ""
        row["naechster_schritt"] = "Den nächsten Schritt im passenden Arbeitsbereich ansehen."
    if werkstatt_status:
        from projektstatus import bericht_lesen, IDS
        report = bericht_lesen(werkstatt_status)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False)
            f.flush()
            module.werkstatt_einlesen(f.name, rows)
        expert_spec = importlib.util.spec_from_file_location('buero_experten', ROOT.parent/'entwicklerbuero/experten.py')
        expert_mod = importlib.util.module_from_spec(expert_spec)
        expert_spec.loader.exec_module(expert_mod)
        team = expert_mod.planen(report)
        for row in rows:
            if row['id'] not in IDS: continue
            if row['id'] == 'dev_bauen': row['expertenplan'] = team
            row['quelle'] = 'Automatischer Projektbau und Selbsttests'
            row['ereignis'] = 'Projektstand automatisch geprüft'
            row['naechster_schritt'] = {
                'dev_bauen': 'Projektfortschritt ansehen und die noch offene Kundenanbindung vorbereiten.',
                'dev_pruefen': 'Letzte Prüfergebnisse und offene Pilotfragen ansehen.',
                'dev_angebot': 'Leistungsumfang, Preis und eigenen Produkt-Checkout festlegen.'}[row['id']]
            row['befund'] = row['befund'].replace('Lokaler Prototyp;', 'Geprüfter Prototyp;').replace('Kein Dauerlauf.', 'Automatischer Prüflauf geplant alle sechs Stunden; kein ständig aktiver Agent.')
    tree=ast.parse((ROOT/'pruefung/harness.py').read_text())
    template=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='KOPF' for t in n.targets))
    template=template.replace("  var NOW = Date.parse('2026-11-05T20:30:00Z');\n  Date.now = function () { return NOW; };\n",'')
    template=template.replace('<html lang="de"><head>','<html lang="de"><head><title>KI-Büro – Webansicht</title><meta name="robots" content="noindex,nofollow">')
    body=(ROOT/'seite.html').read_text()
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['node',str(ROOT/'3d/bauen.mjs'),tmp],check=True,capture_output=True)
        def inline(match):
            content=((ROOT/'geldmanager.js') if match.group(1)=='kb-geldmanager.js' else Path(tmp)/match.group(1)).read_text().replace('</script','<\\/script')
            return '<script>'+content+'</script>'
        body=re.sub(r'<script src="(kb3d-[^"]+\.js|kb-geldmanager\.js)"></script>',inline,body)
        if design_paket:
            version=re.search(r'data-design="([^"]+)"',body).group(1)
            code=(Path(tmp)/'kb3d-code.js').read_text()
            if "K.DESIGN_VERSION = '"+version+"'" not in code:
                raise ValueError("Darstellungsdateien haben unterschiedliche Versionen.")
            dateien={'seite.html':(ROOT/'seite.html').read_bytes(),'kb-geldmanager.js':(ROOT/'geldmanager.js').read_bytes()}
            for name in ('kb3d-code.js','kb3d-pack-1.js','kb3d-pack-2.js','kb3d-pack-3.js'):
                dateien[name]=(Path(tmp)/name).read_bytes()
            if any(len(value)>256*1024 for value in dateien.values()):
                raise ValueError("Eine Darstellungsdatei überschreitet das Claude-Dokumentlimit.")
            manifest={'design':version,'buero_daten_enthalten':False,'dateien':{name:{'sha256':hashlib.sha256(value).hexdigest(),'bytes':len(value)} for name,value in dateien.items()}}
            dateien['design-manifest.json']=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
            dateien['IN-CLAUDE-AKTUALISIEREN.txt']=('Bitte im vorhandenen KI-Büro nur die Darstellung aktualisieren. Zuerst kb-geldmanager.js, kb3d-code.js und die Modellpakete, danach seite.html aus diesem Paket übernehmen. Bestehende private Büro-Daten, Metricool-Zahlen und neuere Messstände erhalten. Dieses Paket enthält keine buero.json und keine privaten Daten. Alle Darstellungsdateien müssen gemeinsam zur Designversion '+version+' gehören. Die äußere Claude-Oberfläche wird dadurch nicht verändert.').encode()
            with zipfile.ZipFile(design_paket,'w',zipfile.ZIP_DEFLATED) as z:
                for name,value in dateien.items():z.writestr(name,value)
    notice='<p style="padding:14px;background:#fff2ce;color:#352900;border-radius:12px">Dein Büro für Shop, Projekte und Social Media. Private Kanalzahlen und geplante Beiträge bleiben in Metricool.</p>'
    body=notice+body
    result=template.replace('%%ROWS%%',json.dumps(rows,ensure_ascii=False)).replace('%%BODY%%',body)
    result=result.replace("</body>", "<script>window.__runAll();document.querySelectorAll('.kb-tab').forEach(function(b){b.addEventListener('click',function(){window.__runAll();});});setTimeout(window.__runAll,0);</script></body>")
    if werkstatt_status:
        result = result.replace('</body>', '<script>' + (ROOT/'status_anzeige.js').read_text() + '</script></body>')
    Path(ziel).write_text(result,encoding='utf-8')
    return rows


if __name__=='__main__':
    bauen(sys.argv[1], sys.argv[2] if len(sys.argv)>2 else None)
