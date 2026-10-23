#!/usr/bin/env python3
"""Local preview server for the emails: static files + a small test API.

    python3 emails/server.py                 # http://localhost:8766/emails/
    PORT=8800 python3 emails/server.py

API (localhost only):
    GET  /api/checks              → results of emails/checks.py for every email
    POST /api/send-test           {"file": "welcome.html", "to": "you@company.com"}
         Sends the email as a real MIME message (HTML + plain text, images inline via cid:)
         through SMTP when SMTP_HOST is set, otherwise saves it to emails/outbox/*.eml
         so it can be opened in Apple Mail / Outlook.

SMTP settings come from emails/.env or the environment (never from the browser):
    SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_SSL=1 for port 465
Gmail: copy emails/.env.example to emails/.env and paste a Google App Password.
"""
import json
import os
import re
import smtplib
import ssl
import sys
from datetime import datetime
from email.message import EmailMessage
from email.utils import make_msgid
from html import unescape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

root = Path(__file__).parent
sys.path.insert(0, str(root))
import checks  # noqa: E402

OUTBOX = root / 'outbox'
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def load_env(path=root / '.env'):
    """KEY=VALUE lines from emails/.env; real environment variables win."""
    if not path.is_file():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"\''))


load_env()


def sender():
    return os.environ.get('SMTP_FROM') or os.environ.get('SMTP_USER') or 'Skypace <no-reply@skypace.com>'


def plain_text(html):
    """Readable text/plain part: links kept as 'label (url)', blocks on their own lines."""
    body = re.sub(r'(?is)<(head|style)[^>]*>.*?</\1>|<!--.*?-->', '', html)
    body = re.sub(r'(?is)<div style="display:none;.*?</div>', '', body)  # preheader
    body = re.sub(r'(?is)<img [^>]*alt="([^"]*)"[^>]*>', r'\1', body)  # images → their alt text
    body = re.sub(r'(?is)<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                  lambda m: f'{re.sub("<[^>]+>", "", m.group(2)).strip()} ({m.group(1)})', body)
    body = re.sub(r'(?i)<br\s*/?>|</(p|h1|tr|li)>', '\n', body)
    text = unescape(re.sub(r'<[^>]+>', ' ', body))
    lines = [re.sub(r'[ \t ]+', ' ', ln).strip() for ln in text.splitlines()]
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip() + '\n'


def build_message(file, to):
    html = (root / file).read_text()
    title = unescape(re.search(r'<title>(.*?)</title>', html, re.S).group(1)).strip()
    msg = EmailMessage()
    msg['Subject'] = f'[Test] {title}'
    msg['From'] = sender()
    msg['To'] = to
    msg['X-Skypace-Template'] = file
    msg.set_content(plain_text(html))
    # Images: hosted URLs when ASSET_URL is set (how real sends work — nothing is attached),
    # otherwise embedded as inline parts (cid:) so the test renders without a CDN.
    asset_url = os.environ.get('ASSET_URL', '').rstrip('/')
    cids = {}
    def rewrite(m):
        src = m.group(1)
        if src.startswith(('http://', 'https://', 'cid:')):
            return m.group(0)
        if asset_url:
            return f'src="{asset_url}/{src.split("/", 1)[-1]}"'
        if src not in cids:
            cids[src] = make_msgid(domain='skypace.test')[1:-1]
        return f'src="cid:{cids[src]}"'
    html = re.sub(r'src="([^"]+)"', rewrite, html)
    msg.add_alternative(html, subtype='html')
    part = msg.get_payload()[1]
    for src, cid in cids.items():
        # Content-Disposition: inline and no filename — with a filename Outlook lists every image under "Attachments"
        part.add_related((root / src).read_bytes(), 'image', 'png', cid=f'<{cid}>', disposition='inline')
    return msg, title


def send(msg):
    host = os.environ.get('SMTP_HOST')
    if not host:
        OUTBOX.mkdir(exist_ok=True)
        path = OUTBOX / f'{msg["X-Skypace-Template"][:-5]}-{datetime.now():%Y%m%d-%H%M%S}.eml'
        path.write_bytes(bytes(msg))
        return {'mode': 'outbox', 'path': str(path.relative_to(root.parent))}
    port = int(os.environ.get('SMTP_PORT', '587'))
    user, password = os.environ.get('SMTP_USER'), os.environ.get('SMTP_PASSWORD')
    if os.environ.get('SMTP_SSL') == '1':
        client = smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=20)
    else:
        client = smtplib.SMTP(host, port, timeout=20)
        if port != 25 and os.environ.get('SMTP_STARTTLS', '1') == '1':
            client.starttls(context=ssl.create_default_context())
    with client:
        if user:
            client.login(user, password or '')
        client.send_message(msg)
    return {'mode': 'smtp', 'host': host}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(root.parent), **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')  # always show the latest build
        super().end_headers()

    def _json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith('/api/checks'):
            results = checks.run_all(prod='prod=1' in self.path)
            for f, rs in checks.run_merge().items():
                results[f] += rs
            return self._json(200, {'results': results, 'summary': checks.summary(results),
                                    # 'from' is shown in the Send test dialog; the password never leaves the server
                                    'smtp': bool(os.environ.get('SMTP_HOST')), 'from': sender(),
                                    'smtpHost': os.environ.get('SMTP_HOST')})
        if any(part.startswith('.') for part in self.path.split('?')[0].split('/')):
            return self._json(404, {'error': 'Not found'})  # never serve .env / dotfiles
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/send-test':
            return self._json(404, {'error': 'Not found'})
        try:
            data = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
        except ValueError:
            return self._json(400, {'error': 'Invalid JSON'})
        file, to = data.get('file', ''), (data.get('to') or '').strip()
        if file not in {e['file'] for e in checks.manifest()}:
            return self._json(400, {'error': f'Unknown email: {file}'})
        if not EMAIL_RE.match(to):
            return self._json(400, {'error': 'Enter one valid email address'})
        try:
            msg, title = build_message(file, to)
            result = send(msg)
        except smtplib.SMTPAuthenticationError:
            hint = (' Gmail needs an App Password (Google Account → Security → 2-Step Verification → App passwords), not your normal password.'
                    if 'gmail' in os.environ.get('SMTP_HOST', '') else '')
            return self._json(502, {'error': 'SMTP login was rejected.' + hint})
        except (OSError, smtplib.SMTPException) as e:
            return self._json(502, {'error': f'SMTP error: {e}'})
        return self._json(200, {**result, 'to': to, 'subject': msg['Subject']})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8766'))
    print(f'Emails preview: http://localhost:{port}/emails/  ·  SMTP: {os.environ.get("SMTP_HOST") or "off (saving to emails/outbox/)"}')
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
