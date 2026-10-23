#!/usr/bin/env python3
"""Pre-send checks for the built emails (emails/*.html).

Each rule mirrors a real email-client constraint: Gmail clipping, Outlook's Word renderer,
SVG/WebP support, link hygiene, leftover placeholders, contrast, merge tags.

    python3 emails/checks.py            # check the preview build
    python3 emails/checks.py --prod     # also require absolute image URLs (ASSET_URL)
    python3 emails/checks.py --json     # machine-readable output

Exit code 1 when any check fails (level "error"), so it can run in CI before sending.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

root = Path(__file__).parent

GMAIL_CLIP = 102 * 1024        # Gmail cuts the message ("[Message clipped]") above ~102 KB
GMAIL_STYLE_LIMIT = 16 * 1024  # Gmail drops a <style> block larger than this
SAFE_SCHEMES = ('https://', 'mailto:', 'tel:')
UNSUPPORTED_TAGS = {'script', 'form', 'input', 'iframe', 'video', 'audio', 'object', 'embed'}
OUTLOOK_RISKY_CSS = [  # inline CSS Outlook desktop (Word engine) ignores or breaks on
    (r'display\s*:\s*(flex|grid)', 'display:flex/grid'),
    (r'position\s*:\s*(absolute|fixed)', 'position:absolute/fixed'),
    (r'float\s*:', 'float'),
    (r'box-shadow\s*:', 'box-shadow'),
]


class Doc(HTMLParser):
    """Collects what the rules need in one pass."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags, self.imgs, self.links, self.styles, self.stack = [], [], [], [], []
        self.title, self.in_title, self.style_blocks, self.in_style = '', False, [], False
        self.text_runs = []  # (text, effective inline style chain)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.tags.append((tag, a))
        if a.get('style'):
            self.styles.append((tag, a['style']))
        if tag == 'img':
            self.imgs.append(a)
        elif tag == 'a':
            self.links.append(a)
        elif tag == 'title':
            self.in_title = True
        elif tag == 'style':
            self.in_style = True
            self.style_blocks.append('')
        if tag not in ('img', 'br', 'meta', 'link', 'hr'):
            self.stack.append(a.get('style', ''))

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        elif tag == 'style':
            self.in_style = False
        if tag not in ('img', 'br', 'meta', 'link', 'hr') and self.stack:
            self.stack.pop()

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        elif self.in_style:
            self.style_blocks[-1] += data
        elif data.strip():
            self.text_runs.append((data.strip(), list(self.stack)))


def _hex(s):
    s = s.lstrip('#')
    if len(s) == 3:
        s = ''.join(c * 2 for c in s)
    return tuple(int(s[i:i + 2], 16) / 255 for i in (0, 2, 4))


def contrast(fg, bg):
    def lum(c):
        c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    a, b = sorted((lum(_hex(fg)), lum(_hex(bg))), reverse=True)
    return (a + 0.05) / (b + 0.05)


def last(chain, prop):
    """Innermost value of an inline CSS property along the element chain."""
    for st in reversed(chain):
        m = re.search(r'(?:^|;)\s*' + prop + r'\s*:\s*([^;]+)', st)
        if m:
            return m.group(1).strip()
    return None


def check_html(name, html, prod=False, merge_keys=None):
    """Return a list of {level, rule, message} for one email."""
    out = []
    add = lambda level, rule, msg: out.append({'level': level, 'rule': rule, 'message': msg})
    d = Doc()
    d.feed(html)
    size = len(html.encode('utf-8'))

    # Size
    if size >= GMAIL_CLIP:
        add('error', 'size', f'{size // 1024} KB — Gmail clips messages over 102 KB.')
    elif size >= 80 * 1024:
        add('warn', 'size', f'{size // 1024} KB — close to Gmail\'s 102 KB clipping limit.')
    else:
        add('ok', 'size', f'{size // 1024} KB (Gmail clips at 102 KB).')
    style_size = sum(len(s.encode()) for s in d.style_blocks)
    if style_size > GMAIL_STYLE_LIMIT:
        add('error', 'size', f'<style> is {style_size // 1024} KB — Gmail drops style blocks over 16 KB.')

    # Document basics
    head = html[:3000].lower()
    for needle, rule, msg in [('<!doctype html', 'structure', 'Missing <!DOCTYPE html>.'),
                              ('charset=', 'structure', 'Missing <meta charset>.'),
                              ('name="viewport"', 'structure', 'Missing viewport meta — iOS Mail renders it zoomed out.'),
                              ]:
        if needle not in head:
            add('error', rule, msg)
    if not re.search(r'<html[^>]*\slang="', head):
        add('error', 'a11y', 'Missing <html lang> — screen readers guess the language.')
    title = d.title.strip()
    if not title:
        add('error', 'subject', 'Empty <title> (used as the subject line for tests).')
    elif len(title) > 70:
        add('warn', 'subject', f'Subject is {len(title)} characters — most inboxes cut it around 60–70.')
    pre = re.search(r'<div style="display:none;[^>]*>([^<]*)', html)
    pre_text = unescape(pre.group(1)).strip(' ͏ \n') if pre else ''
    if not pre:
        add('warn', 'preheader', 'No hidden preheader — inboxes will preview the first text they find.')
    elif not 20 <= len(pre_text) <= 140:
        add('warn', 'preheader', f'Preheader is {len(pre_text)} characters (aim for 20–140): “{pre_text[:60]}…”')
    else:
        add('ok', 'preheader', f'Preheader: “{pre_text}”')

    # Outlook
    if '<!--[if mso]>' not in html or 'width="600"' not in html:
        add('error', 'outlook', 'No MSO ghost table — Outlook desktop will stretch the layout full width.')
    if 'v:background' not in html:
        add('warn', 'outlook', 'No VML v:background — Outlook desktop shows a white page instead of the page color.')
    buttons = len(re.findall(r'<a [^>]*class="[^"]*\bes-button\b', html))
    vml = html.count('<v:roundrect')
    if buttons != vml:
        add('error', 'outlook', f'{buttons} buttons but {vml} VML fallbacks — Outlook shows bare links.')
    elif buttons:
        add('ok', 'outlook', f'{buttons} bulletproof button(s) with VML fallback.')
    risky = sorted({label for _, st in d.styles if 'mso-hide:all' not in st  # hidden from Outlook anyway
                    for pat, label in OUTLOOK_RISKY_CSS if re.search(pat, st)})
    if risky:
        add('warn', 'outlook', 'Inline CSS Outlook ignores: ' + ', '.join(risky) + '.')
    tables = [a for t, a in d.tags if t == 'table']
    if any(a.get('role') not in ('presentation', 'none') for a in tables):
        add('warn', 'a11y', 'Layout tables without role="presentation" are read out as data tables.')

    # Dark mode
    lights = len(re.findall(r'class="[^"]*\blight-img\b', html))
    darks = len(re.findall(r'class="[^"]*\bdark-img\b', html))
    scheme = re.search(r'name="color-scheme" content="([^"]+)"', html)
    if not scheme or 'dark' not in scheme.group(1):
        add('warn', 'dark', 'color-scheme does not include dark — Apple Mail and iOS will auto-invert the email.')
    elif 'prefers-color-scheme: dark' not in html:
        add('error', 'dark', 'color-scheme says dark is supported, but there are no dark styles.')
    elif lights != darks:
        add('error', 'dark', f'{lights} light images but {darks} dark replacements — some images stay light in dark mode.')
    elif '[data-ogsc]' not in html:
        add('warn', 'dark', 'No [data-ogsc] rules — Outlook.com dark mode will recolor on its own.')
    else:
        add('ok', 'dark', f'Dark theme: prefers-color-scheme + Outlook.com rules, {darks} image swaps.')

    # Unsupported markup
    bad = sorted({t for t, _ in d.tags if t in UNSUPPORTED_TAGS})
    if bad:
        add('error', 'markup', 'Tags stripped by email clients: ' + ', '.join(f'<{t}>' for t in bad) + '.')
    for t, a in d.tags:
        if t == 'link' and a.get('rel') == 'stylesheet' and 'fonts.googleapis.com' not in a.get('href', ''):
            add('error', 'markup', f'External stylesheet {a.get("href")} — clients block it.')

    # Images
    for img in d.imgs:
        src = img.get('src', '')
        label = src.rsplit('/', 1)[-1] or '(no src)'
        if 'alt' not in img:
            add('error', 'images', f'{label}: no alt attribute (images are often blocked by default).')
        if not (img.get('width') and img.get('height')):
            add('warn', 'images', f'{label}: no width/height attributes — layout jumps when images load.')
        if re.search(r'\.(svg|webp)(\?|$)', src, re.I):
            add('error', 'images', f'{label}: SVG/WebP are not shown by Gmail and Outlook — use PNG/JPG.')
        if src.startswith(('http://', 'https://')):
            continue
        if prod:
            add('error', 'images', f'{label}: relative src — rebuild with ASSET_URL=https://… before sending.')
        elif not (root / src).is_file():
            add('error', 'images', f'{label}: file not found ({src}).')
    if d.imgs and not any(o['rule'] == 'images' for o in out):
        add('ok', 'images', f'{len(d.imgs)} images: PNG, alt text, fixed sizes, files present.')

    # Links
    hrefs = [a.get('href', '') for a in d.links]
    for h in hrefs:
        if not h or h == '#':
            add('error', 'links', 'Empty link (href="#" or missing).')
        elif h.startswith('http://'):
            add('warn', 'links', f'Insecure link: {h}')
        elif not h.startswith(SAFE_SCHEMES) and not h.startswith('{{'):
            add('error', 'links', f'Unexpected link scheme: {h}')
    if hrefs and not any(o['rule'] == 'links' for o in out):
        add('ok', 'links', f'{len(hrefs)} links, all https / mailto / tel.')

    # Content placeholders
    text = ' '.join(t for t, _ in d.text_runs)
    left = sorted(set(re.findall(r'\[[A-Z][^\]\[]{1,40}\]', text)))
    if left:
        add('error', 'content', 'Unfilled placeholders: ' + ', '.join(left))
    if re.search(r'lorem ipsum', html, re.I):
        add('error', 'content', 'Lorem ipsum left in the email.')
    tags = sorted(set(re.findall(r'\{\{\s*([a-z_]+)\s*\}\}', html)))
    if merge_keys is None:
        if tags:
            add('error', 'content', 'Merge tags in a preview build: ' + ', '.join(tags))
    else:
        unknown = [t for t in tags if t not in merge_keys]
        if unknown:
            add('error', 'merge', 'Unknown merge tags: ' + ', '.join(unknown))
    if not any(o['rule'] == 'content' for o in out):
        add('ok', 'content', 'No placeholders or lorem ipsum.')

    # Contrast (text on the white card / page background)
    weak = {}
    for t, chain in d.text_runs:
        if not re.search(r'\w', t):  # separators like "·" are decorative
            continue
        fg = last(chain, 'color')
        bg = last(chain, 'background') or '#ffffff'
        if not (fg and re.fullmatch(r'#[0-9a-fA-F]{6}', fg) and re.fullmatch(r'#[0-9a-fA-F]{6}', bg)):
            continue
        ratio = contrast(fg, bg)
        fs = last(chain, 'font-size') or '16px'
        px = float(re.sub(r'[^0-9.]', '', fs) or 16)
        need = 3.0 if px >= 18 else 4.5
        if ratio < need:
            key = (fg.lower(), bg.lower(), int(px))
            weak.setdefault(key, [ratio, t])
    for (fg, bg, px), (ratio, sample) in weak.items():  # readability issue, not a rendering break → warn
        add('warn', 'a11y', f'Contrast {ratio:.1f}:1 for {px}px {fg} on {bg} (WCAG AA wants 4.5:1) — e.g. “{sample[:40]}”.')
    if not weak:
        add('ok', 'a11y', 'Text contrast meets WCAG AA.')
    dark = dark_palette()
    if dark:
        low = {}
        for t, chain in d.text_runs:
            fg, bg = (last(chain, 'color') or '').lower(), (last(chain, 'background') or last(chain, 'background-color') or '#ffffff').lower()
            if not re.search(r'\w', t) or fg not in dark['c']:
                continue
            ratio = contrast(dark['c'][fg], dark['b'].get(bg, '#1b1d29'))
            if ratio < 4.5:
                low.setdefault((fg, bg), (ratio, t))
        for (fg, bg), (ratio, t) in low.items():
            add('warn', 'dark', f'Dark mode contrast {ratio:.1f}:1 for “{t[:40]}”.')
    return out


def dark_palette():
    try:
        sys.path.insert(0, str(root))
        import build
        return build.DARK
    except Exception:
        return None


def manifest():
    m = (root / 'manifest.js').read_text()
    return json.loads(m[m.index('['):m.rindex(']') + 1])


def run_all(prod=False):
    return {e['file']: check_html(e['file'], (root / e['file']).read_text(), prod=prod) for e in manifest()}


def run_merge():
    """Build with MERGE_TAGS=1 in a temp copy and check that only known tags (no sample data) remain."""
    sys.path.insert(0, str(root))
    import build  # noqa: E402  — only for SAMPLE keys and a sample value to look for
    keys = set(build.SAMPLE)
    tmp = Path(tempfile.mkdtemp())
    try:
        shutil.copy(root / 'build.py', tmp / 'build.py')
        subprocess.run([sys.executable, str(tmp / 'build.py')], check=True, capture_output=True,
                       env={**os.environ, 'MERGE_TAGS': '1'})
        res = {}
        for e in manifest():
            html = (tmp / e['file']).read_text()
            r = [o for o in check_html(e['file'], html, merge_keys=keys) if o['rule'] == 'merge']
            leaked = [v for k, v in build.SAMPLE.items() if len(v) > 6 and v in html]
            if leaked:
                r.append({'level': 'error', 'rule': 'merge', 'message': 'Sample data hardcoded (not a merge tag): ' + ', '.join(leaked[:3])})
            if not r:
                found = sorted(set(re.findall(r'\{\{([a-z_]+)\}\}', html)))
                r.append({'level': 'ok', 'rule': 'merge', 'message': f'{len(found)} merge tags, all known: ' + ', '.join(found)})
            res[e['file']] = r
        return res
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def summary(results):
    worst = {}
    for f, rs in results.items():
        lv = [r['level'] for r in rs]
        worst[f] = 'error' if 'error' in lv else 'warn' if 'warn' in lv else 'ok'
    return worst


if __name__ == '__main__':
    prod = '--prod' in sys.argv
    results = run_all(prod=prod)
    for f, rs in run_merge().items():
        results[f] += rs
    if '--json' in sys.argv:
        print(json.dumps(results, indent=1))
    else:
        icon = {'ok': '✓', 'warn': '!', 'error': '✗'}
        for f, rs in results.items():
            w = summary({f: rs})[f]
            print(f'{icon[w]} {f}')
            for r in rs:
                if r['level'] != 'ok':
                    print(f'    {icon[r["level"]]} [{r["rule"]}] {r["message"]}')
        s = summary(results)
        n = {k: list(s.values()).count(k) for k in ('ok', 'warn', 'error')}
        print(f'\n{len(s)} emails: {n["ok"]} ok, {n["warn"]} with warnings, {n["error"]} failing')
    sys.exit(1 if 'error' in summary(results).values() else 0)
