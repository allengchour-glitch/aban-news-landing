"""Begrenzte Reparatur veröffentlichter HTML-Dateien; niemals Inhalte oder Preise erraten."""
import argparse
from datetime import datetime, timezone
import hashlib
from html import escape
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import stat
import tempfile

ATTR = re.compile(r'''\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?''')


class Messung(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.text = text
        self.lines = [0]
        for m in re.finditer('\n', text): self.lines.append(m.end())
        self.edits = []
        self.html = False
        self.heads = []
        self.viewport = False
        self.offen = 0
        self.raw = None
    def pos(self):
        line, col = self.getpos()
        return self.lines[line-1]+col
    def handle_starttag(self, tag, attrs):
        if self.raw: return
        if tag in ('textarea','title','xmp','iframe','noembed','noframes','plaintext','svg'):
            self.raw = tag
            return
        a = dict(attrs)
        if tag == 'html': self.html = True
        if tag == 'meta' and (a.get('name') or '').casefold() == 'viewport': self.viewport = True
        if tag != 'a' or (a.get('target') or '').casefold() != '_blank': return
        if len({k for k,v in attrs}) != len(attrs):
            self.offen += 1
            return
        tokens = (a.get('rel') or '').split()
        if any(t.casefold() == 'noopener' for t in tokens): return
        raw = self.get_starttag_text()
        matches = [m for m in ATTR.finditer(raw) if m.group(1).casefold() == 'rel']
        if 'rel' in a and len(matches) != 1:
            self.offen += 1
            return
        value = escape(' '.join(tokens + ['noopener']), quote=True)
        if matches:
            m = matches[0]
            new = raw[:m.start()] + ' rel="' + value + '"' + raw[m.end():]
        else:
            end = len(raw)-1
            if raw[:end].rstrip().endswith('/'):
                self.offen += 1
                return
            new = raw[:end] + ' rel="noopener">'
        self.edits.append((self.pos(),self.pos()+len(raw),new,'noopener'))
    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag,attrs)
    def handle_endtag(self, tag):
        if self.raw:
            if tag == self.raw: self.raw = None
            return
        if tag == 'head': self.heads.append(self.pos())


def reparieren(text):
    p = Messung(text)
    p.feed(text)
    p.close()
    if not p.html or len(p.heads) != 1:
        return text, {'noopener':0,'viewport':0}, p.offen, False
    if not p.viewport:
        p.edits.append((p.heads[0],p.heads[0],'<meta name="viewport" content="width=device-width, initial-scale=1">\n','viewport'))
    result=text
    counts={'noopener':0,'viewport':0}
    for start,end,value,rule in sorted(p.edits,reverse=True):
        result=result[:start]+value+result[end:]
        counts[rule]+=1
    return result,counts,p.offen,True


def lauf(root, schreiben=False):
    root=Path(root).resolve()
    if not root.is_dir(): raise ValueError('HTML-Verzeichnis fehlt.')
    plan=[]
    total={'noopener':0,'viewport':0}
    checked=0
    excluded=0
    unresolved=0
    for path in sorted(root.rglob('*.html')):
        if path.is_symlink() or any(p.startswith('.') for p in path.relative_to(root).parts):
            excluded+=1
            continue
        # Auch Verzeichnissymbole dürfen nicht aus dem Veröffentlichungsordner führen.
        if not path.resolve().is_relative_to(root):
            excluded+=1
            continue
        if path.stat().st_size > 8*1024*1024:
            excluded+=1
            continue
        before=path.read_bytes()
        try: text=before.decode('utf-8')
        except UnicodeDecodeError:
            excluded+=1
            continue
        after,counts,offen,full=reparieren(text)
        unresolved+=offen
        if not full:
            excluded+=1
            continue
        checked+=1
        for rule,n in counts.items(): total[rule]+=n
        if after != text:
            # Eine zweite Runde darf weder weitere Änderungen noch neue Eingriffe planen.
            second,again,_,_=reparieren(after)
            if second != after or any(again.values()): raise ValueError('Gegenprüfung fehlgeschlagen; keine Veröffentlichung.')
            plan.append((path,before,after.encode('utf-8')))
    if schreiben:
        for path,before,after in plan:
            if hashlib.sha256(path.read_bytes()).digest()!=hashlib.sha256(before).digest():
                raise ValueError('Datei während der Prüfung verändert; keine Veröffentlichung.')
        for path,before,after in plan:
            mode=stat.S_IMODE(path.stat().st_mode)
            with tempfile.NamedTemporaryFile(dir=path.parent,delete=False) as f:
                temp=Path(f.name)
                f.write(after)
            try:
                temp.chmod(mode)
                os.replace(temp,path)
                if path.read_bytes()!=after: raise ValueError('Frisches Lesen nach Reparatur fehlgeschlagen.')
            finally: temp.unlink(missing_ok=True)
    return {'version':1,'gemessen':datetime.now(timezone.utc).isoformat(),'modus':'angewendet' if schreiben else 'trockenlauf',
            'gepruefte_html':checked,'ausgenommene_dateien':excluded,'geaenderte_dateien':len(plan) if schreiben else 0,
            'geplante_dateien':len(plan),'korrekturen':total,'nicht_auto_reparierbare_links':unresolved,
            'zweite_pruefung':'bestanden','alle_fehler_gemessen':False,
            'umfang':'Nur fehlendes rel=noopener und fehlende Viewport-Metadaten. Keine Inhalts-, Preis-, Bestell- oder Zahlungsänderungen.'}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('verzeichnis',type=Path)
    p.add_argument('--anwenden',action='store_true')
    p.add_argument('--bericht',type=Path,required=True)
    a=p.parse_args()
    try:
        report=lauf(a.verzeichnis,a.anwenden)
        a.bericht.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    except (ValueError,OSError) as e: p.exit(2,str(e)+'\n')
    print(json.dumps(report,ensure_ascii=False))
