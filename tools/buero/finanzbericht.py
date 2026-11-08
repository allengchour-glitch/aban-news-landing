"""Privaten Finanzmonitor aus einem Connector-Bericht bauen, ausserhalb des Repositories."""
import argparse
import json
from pathlib import Path
import re
import subprocess

ROOT=Path(__file__).resolve().parent


def bauen(quelle,ziel):
    quelle,ziel=Path(quelle),Path(ziel).resolve()
    if ziel.is_relative_to(ROOT.parents[1]):
        raise ValueError('Private Finanzdaten dürfen nicht im Website-Repository abgelegt werden.')
    if quelle.stat().st_size>1500000: raise ValueError('Finanzbericht zu gross.')
    data=json.loads(quelle.read_text(encoding='utf-8'))
    subprocess.run(['node','-e','require(process.argv[1]).pruefen(JSON.parse(require("fs").readFileSync(0,"utf8")));',str(ROOT/'finanzmonitor.js')],
                   input=json.dumps(data),text=True,capture_output=True,check=True,timeout=15)
    css=re.search(r'<style>(.*?)</style>',(ROOT/'seite.html').read_text(),re.S).group(1)
    payload=json.dumps(data,ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    code=(ROOT/'finanzmonitor.js').read_text().replace('</script','<\\/script')
    html='''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>Privater Finanzmonitor</title><style>'''+css+'''
body{margin:0;background:#101d27}.kb.finanz-privat{--color-bg:#10212e;--color-panel:#193542;--color-fg:#eff9f5;--color-fg-muted:#acc6c4;--color-border-line:#385b64;--color-ok:#6bd6bb;--color-warn:#e7be73;--color-bad:#ed8e91;color-scheme:dark;max-width:1120px;margin:auto;border-radius:0;padding:clamp(16px,4vw,38px);min-height:100vh;box-sizing:border-box}
.finanz-privat .kb-finanzmonitor h2{font-size:clamp(26px,5vw,40px)}.finanz-privat .kb-finanz-karten strong{font-size:clamp(23px,4vw,34px)}.finanz-privat .kb-finanzmonitor button{min-height:44px;padding:10px 14px;border:1px solid var(--color-border-line);border-radius:10px;font:inherit;cursor:pointer;color:var(--color-fg);background:var(--color-bg)}.finanz-privat .kb-finanz-zeit button[aria-pressed="true"]{background:#6bd6bb;color:#10212e}
</style></head><body><main class="kb finanz-privat"><p>KI-Büro · Private Finanzübersicht · gespeicherter Datenstand</p><div id="finanzmonitor"></div><p class="kb-finanz-hinweis">Diese Datei enthält Geschäftszahlen. Privat aufbewahren. Die enthaltenen Werte wurden automatisch aus den genannten Quellen abgerufen. Die Datei aktualisiert sich nicht selbst; ein neuer Abruf erzeugt einen neuen Datenstand.</p></main><script type="application/json" id="finanzdaten">'''+payload+'''</script><script>'''+code+'''\nKBFinanzen.mount(document.getElementById('finanzmonitor'),{snapshot:JSON.parse(document.getElementById('finanzdaten').textContent)});</script></body></html>'''
    ziel.parent.mkdir(parents=True,exist_ok=True)
    ziel.write_text(html,encoding='utf-8')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('quelle',type=Path);p.add_argument('ziel',type=Path);a=p.parse_args()
    bauen(a.quelle,a.ziel)
