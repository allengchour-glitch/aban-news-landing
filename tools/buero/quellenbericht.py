"""Private Quellenübersicht ohne Veröffentlichung oder Netzabrufe bauen."""
import argparse
import json
from pathlib import Path
import re
import subprocess

ROOT=Path(__file__).resolve().parent


def bauen(quelle,ziel):
    quelle,ziel=Path(quelle).resolve(),Path(ziel).resolve()
    if any((p/'.git').is_file() or (p/'.git'/'HEAD').is_file() for p in [ziel.parent,*ziel.parents]):
        raise ValueError('Private Messwerte dürfen nicht in einem Repository gespeichert werden.')
    if quelle.stat().st_size>256*1024: raise ValueError('Quellenbericht zu gross.')
    data=json.loads(quelle.read_text())
    subprocess.run(['node','-e','require(process.argv[1]).pruefen(JSON.parse(require("fs").readFileSync(0,"utf8")));',str(ROOT/'quellenmonitor.js')],input=json.dumps(data),text=True,capture_output=True,check=True,timeout=15)
    css=re.search(r'<style>(.*?)</style>',(ROOT/'seite.html').read_text(),re.S).group(1)
    payload=json.dumps(data,ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    code=(ROOT/'quellenmonitor.js').read_text().replace('</script','<\\/script')
    html='''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>Privater Google- und Shop-Monitor</title><style>'''+css+'''body{margin:0;background:#101d27;font:16px system-ui}.kb.quellen-privat{--color-bg:#10212e;--color-panel:#193542;--color-fg:#eff9f5;--color-fg-muted:#acc6c4;--color-border-line:#385b64;--color-ok:#6bd6bb;color-scheme:dark;max-width:1160px;margin:auto;border-radius:0;padding:clamp(16px,4vw,38px);min-height:100vh;box-sizing:border-box}</style></head><body><main class="kb quellen-privat"><p>KI-Büro · nur für den Inhaber · privat aufbewahren</p><div id="quellen"></div></main><script type="application/json" id="daten">'''+payload+'''</script><script>'''+code+'''\nKBQuellen.mount(document.getElementById('quellen'),{snapshot:JSON.parse(document.getElementById('daten').textContent)});</script></body></html>'''
    ziel.parent.mkdir(parents=True,exist_ok=True);ziel.write_text(html)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('quelle',type=Path);p.add_argument('ziel',type=Path);a=p.parse_args();bauen(a.quelle,a.ziel)
