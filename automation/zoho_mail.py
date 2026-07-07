#!/usr/bin/env python3
"""zoho_mail.py — Mail-Automatik für info@luxestyle.ch (Zoho EU) aus der Cloud-Sandbox.

Die Sandbox erlaubt nur Ausgang über den HTTPS-Proxy → wir tunneln IMAP/SMTP per
HTTP-CONNECT durch den Proxy (beide Ports vom Proxy freigegeben, getestet 2026-07-07).

Auth: App-Passwort NUR aus Env ZOHO_APP_PASSWORD oder /tmp/zoho_app_pw (NIE im Repo!).

Befehle:
  python3 automation/zoho_mail.py inbox [N]        — neueste N Betreffzeilen (Default 10)
  python3 automation/zoho_mail.py read <num>       — Mail Nr. lesen (aus inbox-Liste)
  python3 automation/zoho_mail.py search <wort>    — Betreff/Absender-Suche im Posteingang
  python3 automation/zoho_mail.py send <an> <betreff> <textdatei|-> — Mail senden
"""
import os, sys, socket, ssl, imaplib, smtplib, email
from email.mime.text import MIMEText
from email.header import decode_header

USER = 'info@luxestyle.ch'
PW = (os.environ.get('ZOHO_APP_PASSWORD') or
      (open('/tmp/zoho_app_pw').read().strip() if os.path.exists('/tmp/zoho_app_pw') else ''))
if not PW:
    sys.exit('Kein App-Passwort (ZOHO_APP_PASSWORD oder /tmp/zoho_app_pw).')


def proxy_socket(host, port, timeout=30):
    """TCP-Socket zum Ziel, ggf. per HTTP-CONNECT durch den Sandbox-Proxy."""
    proxy = os.environ.get('HTTPS_PROXY', '')
    if not proxy:
        return socket.create_connection((host, port), timeout=timeout)
    ph, pp = proxy.replace('http://', '').rstrip('/').split(':')
    s = socket.create_connection((ph, int(pp)), timeout=timeout)
    s.sendall(f'CONNECT {host}:{port} HTTP/1.1\r\nHost: {host}:{port}\r\n\r\n'.encode())
    resp = b''
    while b'\r\n\r\n' not in resp:
        chunk = s.recv(4096)
        if not chunk:
            break
        resp += chunk
    if b' 200 ' not in resp.split(b'\r\n')[0]:
        raise OSError('Proxy CONNECT fehlgeschlagen: ' + resp.decode(errors='replace')[:100])
    return s


class ProxyIMAP(imaplib.IMAP4_SSL):
    def _create_socket(self, timeout):
        raw = proxy_socket(self.host, self.port, timeout or 30)
        return self.ssl_context.wrap_socket(raw, server_hostname=self.host)


class ProxySMTP(smtplib.SMTP_SSL):
    def _get_socket(self, host, port, timeout):
        raw = proxy_socket(host, port, timeout if timeout and timeout > 0 else 30)
        return self.context.wrap_socket(raw, server_hostname=host)


def dec(s):
    if not s:
        return ''
    out = []
    for part, enc in decode_header(s):
        out.append(part.decode(enc or 'utf-8', errors='replace') if isinstance(part, bytes) else part)
    return ''.join(out)


def imap():
    M = ProxyIMAP('imap.zoho.eu', 993, ssl_context=ssl.create_default_context())
    M.login(USER, PW)
    M.select('INBOX')
    return M


def cmd_inbox(n=10):
    M = imap()
    typ, data = M.search(None, 'ALL')
    ids = data[0].split()
    print(f'{len(ids)} Mails im Posteingang. Neueste {min(n, len(ids))}:')
    for i in ids[-n:][::-1]:
        typ, md = M.fetch(i, '(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])')
        h = email.message_from_bytes(md[0][1])
        print(f"  [{i.decode()}] {dec(h['Subject'])[:70]} — {dec(h['From'])[:50]} — {h['Date']}")
    M.logout()


def cmd_read(num):
    M = imap()
    typ, md = M.fetch(str(num).encode(), '(BODY.PEEK[])')
    msg = email.message_from_bytes(md[0][1])
    print('Von:', dec(msg['From']), '\nBetreff:', dec(msg['Subject']), '\nDatum:', msg['Date'], '\n---')
    body = ''
    if msg.is_multipart():
        for p in msg.walk():
            if p.get_content_type() == 'text/plain':
                body = p.get_payload(decode=True).decode(p.get_content_charset() or 'utf-8', errors='replace')
                break
        if not body:
            for p in msg.walk():
                if p.get_content_type() == 'text/html':
                    import re
                    html = p.get_payload(decode=True).decode(p.get_content_charset() or 'utf-8', errors='replace')
                    body = re.sub(r'<[^>]+>', ' ', html)
                    break
    else:
        body = msg.get_payload(decode=True).decode(msg.get_content_charset() or 'utf-8', errors='replace')
    print(body[:4000])
    M.logout()


def cmd_search(word):
    M = imap()
    typ, data = M.search(None, 'ALL')
    ids = data[0].split()
    hits = 0
    for i in ids[::-1][:200]:
        typ, md = M.fetch(i, '(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])')
        h = email.message_from_bytes(md[0][1])
        line = f"{dec(h['Subject'])} {dec(h['From'])}"
        if word.lower() in line.lower():
            print(f"  [{i.decode()}] {dec(h['Subject'])[:70]} — {dec(h['From'])[:50]} — {h['Date']}")
            hits += 1
    print(f'{hits} Treffer für «{word}».')
    M.logout()


def cmd_send(to, subject, textfile):
    text = sys.stdin.read() if textfile == '-' else open(textfile).read()
    msg = MIMEText(text, 'plain', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = f'LuxeStyle <{USER}>'
    msg['To'] = to
    S = ProxySMTP('smtp.zoho.eu', 465, context=ssl.create_default_context())
    S.login(USER, PW)
    S.sendmail(USER, [to], msg.as_string())
    S.quit()
    print(f'✅ gesendet an {to}: {subject}')


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] == 'inbox':
        cmd_inbox(int(a[1]) if len(a) > 1 else 10)
    elif a[0] == 'read':
        cmd_read(a[1])
    elif a[0] == 'search':
        cmd_search(a[1])
    elif a[0] == 'send':
        cmd_send(a[1], a[2], a[3])
    else:
        print(__doc__)
