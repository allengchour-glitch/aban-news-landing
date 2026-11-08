"""Lokale, eigenständige Ansichten für E-Mail- und Kommentarentwürfe."""
from html import escape


def erstellen(eintraege, firma):
    karten = []
    for eintrag in eintraege:
        nummer = eintrag['nummer']
        if 'entwurf' not in eintrag:
            manuell = eintrag.get('status') == 'Manuell prüfen'
            art, status = ('manuell', 'Manuell prüfen') if manuell else ('übersprungen', 'Übersprungen')
            original = ('<h3>' + escape(eintrag['betreff']) + '</h3><pre>' + escape(eintrag['original']) + '</pre>') if manuell else ''
            karten.append(f'<article data-art="{art}"><h2>Nachricht {nummer}</h2><p class="marke">{status}</p><p>{escape(eintrag["grund"])}</p>{original}</article>')
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
    return rahmen(karten, firma)


def rahmen(karten, firma, name='E-Mail-Assistent', titel='Antworten in Ruhe prüfen', hinweis='Diese Datei arbeitet lokal und sendet keine E-Mails. Die Antworten stammen aus festen Vorlagen oder bereitgestelltem Firmenwissen. Prüfe Empfänger und Inhalt vor dem Versand im Mailprogramm. Anhänge sind nicht enthalten.'):
    return '''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>Antwortentwürfe prüfen</title><style>
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
</style></head><body><main><p>''' + escape(name) + ' · ' + escape(firma) + '''</p>
<h1>''' + escape(titel) + '''</h1><p class="hinweis">''' + escape(hinweis) + '''</p>
<div class="filter"><label>Nachricht suchen<input type="search" placeholder="Inhalt, Betreff oder Kennung"></label>
<label>Anzeige<select><option value="alle">Alle Nachrichten</option><option value="entwurf">Entwürfe</option><option value="manuell">Manuell prüfen</option><option value="übersprungen">Übersprungen / bereits vorbereitet</option></select></label></div>
<p id="treffer" role="status"></p><section aria-label="Nachrichten">''' + '\n'.join(karten) + '''</section>
<p class="hinweis">Die Prüfseite enthält lokale Nachrichten und Entwürfe. Bewahre sie im freigegebenen Speicher deines Betriebs auf.</p>
</main><script>
const karten=Array.from(document.querySelectorAll('article'));
const suche=document.querySelector('input'),filter=document.querySelector('select');
function aktualisieren(){let n=0;const q=suche.value.trim().toLocaleLowerCase('de');karten.forEach(k=>{const passt=(filter.value==='alle'||k.dataset.art===filter.value)&&k.textContent.toLocaleLowerCase('de').includes(q);k.hidden=!passt;if(passt)n++;});document.getElementById('treffer').textContent=n+' von '+karten.length+' Nachrichten';}
suche.addEventListener('input',aktualisieren);filter.addEventListener('change',aktualisieren);aktualisieren();
karten.forEach(k=>{const button=k.querySelector('button');if(!button)return;button.addEventListener('click',async()=>{const feld=k.querySelector('textarea'),status=k.querySelector('.kopierstatus');try{await navigator.clipboard.writeText(feld.value);status.textContent='Antwort kopiert. Vor der Verwendung prüfen und einfügen.';}catch(e){feld.focus();feld.select();status.textContent='Text ausgewählt. Mit der Kopierfunktion deines Geräts kopieren.';}});});
</script></body></html>'''


def kommentare_erstellen(eintraege, luecken=None):
    karten = ['<p><a href="antwortentwuerfe.csv" download>Antwortliste herunterladen</a></p>']
    if luecken:
        karten.append('<details class="faq-luecken"><summary>Wiederkehrende offene Fragen · ' + str(len(luecken)) + '</summary><p>Vorschläge zur FAQ-Pflege. Antworten müssen aus freigegebenem Wissen ergänzt werden.</p><ul>')
        for l in luecken:
            karten.append('<li>' + str(l['anzahl']) + ' × ' + escape(l['frage']) + '</li>')
        karten.append('</ul><a href="wissensluecken.json" download>Fragen herunterladen</a></details>')
    for n, row in enumerate(eintraege, 1):
        status = row['status']
        art = 'entwurf' if status == 'Entwurf prüfen' else 'übersprungen' if status == 'Bereits vorbereitet' else 'manuell'
        karten.append(f'<article data-art="{art}"><h2>{escape(row["plattform"])} · {escape(row["id"])}</h2>'
                      f'<p class="marke">{escape(status)} · {escape(row["kategorie"])}</p>'
                      f'<details><summary>Originalkommentar lesen</summary><pre>{escape(row["text"])}</pre></details>')
        if row['antwortentwurf']:
            karten.append(f'<label for="antwort-{n}">Antwortentwurf</label><textarea id="antwort-{n}" rows="6" readonly>{escape(row["antwortentwurf"])}</textarea>'
                          '<div class="aktionen"><button type="button">Antwort kopieren</button></div><p class="kopierstatus" role="status"></p>')
        else:
            grund = 'Dieser Entwurf wurde bereits vorbereitet. Im vorherigen Ausgabeordner nachsehen.' if art == 'übersprungen' else 'Keine eindeutige automatische Antwort. Inhalt und Kontext manuell prüfen.'
            karten.append('<p>' + grund + '</p>')
        karten.append('</article>')
    return rahmen(karten, 'Lokale Arbeitsübersicht', name='Kommentar-Assistent', titel='Kommentare und Antworten prüfen',
                  hinweis='Diese Datei arbeitet lokal und veröffentlicht keine Kommentare. Antworten stammen aus festen Regeln und der bereitgestellten FAQ. Prüfe Inhalt und Kontext vor der Verwendung. Bereits vorbereitete Entwürfe gelten nicht als veröffentlicht oder erledigt.')
