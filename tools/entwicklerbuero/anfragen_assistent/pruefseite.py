"""Lokale, eigenständige Ansicht für ungesendete E-Mail-Entwürfe."""
from html import escape


def erstellen(eintraege, firma):
    karten = []
    for eintrag in eintraege:
        nummer = eintrag['nummer']
        if 'entwurf' not in eintrag:
            karten.append(f'<article data-art="übersprungen"><h2>Nachricht {nummer}</h2><p class="marke">Übersprungen</p><p>{escape(eintrag["grund"])}</p></article>')
            continue
        karten.append(f'''<article data-art="entwurf">
<h2>{escape(eintrag['betreff'])}</h2>
<p class="marke">Entwurf · {escape(eintrag['kategorie'])} · {escape(eintrag['prioritaet'])}</p>
<p>An: {escape(eintrag['empfaenger'])}</p>
<details><summary>Ursprüngliche Nachricht lesen</summary><pre>{escape(eintrag['original'])}</pre></details>
<label for="antwort-{nummer}">Antwortentwurf</label>
<textarea id="antwort-{nummer}" rows="12" readonly>{escape(eintrag['entwurf'])}</textarea>
<div class="aktionen"><button type="button">Antwort kopieren</button>
<a href="antwort-{nummer:04d}.eml" download>EML herunterladen</a></div>
<p class="kopierstatus" role="status"></p></article>''')
    return '''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>E-Mail-Entwürfe prüfen</title><style>
*{box-sizing:border-box}body{margin:0;background:#101820;color:#edf4f7;font:16px/1.6 system-ui,sans-serif}
main{max-width:880px;margin:auto;padding:24px 16px 48px}h1{font-size:clamp(26px,6vw,38px);line-height:1.2}h2{font-size:20px;overflow-wrap:anywhere}
p{overflow-wrap:anywhere}.hinweis{color:#b7cad4}.filter{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin:24px 0}label{display:block}
input,select,textarea{width:100%;background:#101820;color:inherit;border:1px solid #68818e;border-radius:10px;padding:12px;font:inherit}
input,select{min-height:48px}article{padding:20px;margin:16px 0;border:1px solid #405866;border-radius:16px;background:#192731}article[hidden]{display:none}
.marke{color:#aee8d0}textarea{line-height:1.5;resize:vertical;margin-top:8px}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}.aktionen{display:flex;flex-wrap:wrap;gap:12px;margin-top:16px}
button,a{min-height:48px;padding:10px 16px;border:1px solid #79ceb4;border-radius:10px;font:inherit;background:#aee8d0;color:#102820;text-decoration:none;cursor:pointer}
:focus-visible{outline:3px solid #f5cf78;outline-offset:3px}.kopierstatus{color:#c9dfeb}summary{cursor:pointer;min-height:44px;padding:8px 0}
@media(max-width:520px){.filter{grid-template-columns:1fr}article{padding:16px}.aktionen>*{width:100%;text-align:center}}
</style></head><body><main><p>E-Mail-Assistent · ''' + escape(firma) + '''</p>
<h1>Antworten in Ruhe prüfen</h1><p class="hinweis">Diese Datei arbeitet lokal und sendet keine E-Mails. Die Antworten stammen aus festen Vorlagen. Prüfe Empfänger und Inhalt vor dem Versand im Mailprogramm. Anhänge sind nicht enthalten.</p>
<div class="filter"><label>Nachricht suchen<input type="search" placeholder="Betreff, Inhalt oder Empfänger"></label>
<label>Anzeige<select><option value="alle">Alle Nachrichten</option><option value="entwurf">Entwürfe</option><option value="übersprungen">Übersprungen</option></select></label></div>
<p id="treffer" role="status"></p><section aria-label="Nachrichten">''' + '\n'.join(karten) + '''</section>
<p class="hinweis">Die Prüfseite enthält lokale Nachrichten und Entwürfe. Bewahre sie im freigegebenen Speicher deines Betriebs auf.</p>
</main><script>
const karten=Array.from(document.querySelectorAll('article'));
const suche=document.querySelector('input'),filter=document.querySelector('select');
function aktualisieren(){let n=0;const q=suche.value.trim().toLocaleLowerCase('de');karten.forEach(k=>{const passt=(filter.value==='alle'||k.dataset.art===filter.value)&&k.textContent.toLocaleLowerCase('de').includes(q);k.hidden=!passt;if(passt)n++;});document.getElementById('treffer').textContent=n+' von '+karten.length+' Nachrichten';}
suche.addEventListener('input',aktualisieren);filter.addEventListener('change',aktualisieren);aktualisieren();
karten.forEach(k=>{const button=k.querySelector('button');if(!button)return;button.addEventListener('click',async()=>{const feld=k.querySelector('textarea'),status=k.querySelector('.kopierstatus');try{await navigator.clipboard.writeText(feld.value);status.textContent='Antwort kopiert. Im Mailprogramm prüfen und einfügen.';}catch(e){feld.focus();feld.select();status.textContent='Text ausgewählt. Mit der Kopierfunktion deines Geräts kopieren.';}});});
</script></body></html>'''
