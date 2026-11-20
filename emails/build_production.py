#!/usr/bin/env python3
"""Production (AWS SES) email templates in two versions, switched with New / Old in the gallery.

Old: emails/production/<Name>.html — the templates as they are today: HtmlPart with ${email_header} and
${email_footer} filled in from emails/production/source/email-header / email-footer (stored JSON-escaped, \\").
New: emails/production/new/<Name>.html — the same content (every text, link and block in the same order) in the
shared Skypace email design from build.py: page background, centered logo, white card, Roboto and the Ant Design
tokens, filled cards for the shipping preview and contacts, an alert panel for warnings, navy buttons. Only styles
change; nothing is added or removed (checked below: the text of every email is compared old vs new).

    python3 emails/build_production.py && python3 emails/build.py
"""
import json
import re
import sys
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

root = Path(__file__).parent
src = root / 'production' / 'source'
out = root / 'production'
(out / 'new').mkdir(exist_ok=True)
sys.path.insert(0, str(root))
import build as B  # noqa: E402  (shared design: tokens, shell, components)

B.ASSET_URL = '../../img'  # new versions live two folders below emails/
T, txt, STRONG = B.T, B.txt, B.STRONG


def part(name):
    return (src / name).read_text().strip().replace('\\"', '"')


HEADER, FOOTER = part('email-header'), part('email-footer')
TAGLINE = re.search(r'<p>(.*?)</p>', HEADER.split('<!-- Header -->')[1]).group(1)


def group(name):
    if re.search(r'Rate', name): return 'Production: Rates'
    if re.search(r'Invite|Welcome|Registration|Organizatio|Reject|AlreadyExists|AdditionalInfo', name): return 'Production: Account'
    if re.search(r'Container', name): return 'Production: Containers'
    return 'Production: Shipments'


def body_of(raw):
    """Content between the shared header and footer; templates without them give their own body."""
    if '${email_header}' in raw:
        return raw.split('${email_header}', 1)[1].split('${email_footer}', 1)[0], ''
    m = re.search(r'<body[^>]*>(.*)</body>', raw, re.S)
    if not m:
        return raw, ''
    st = re.search(r'<style>(.*?)</style>', raw, re.S)
    return m.group(1), (re.sub(r'(^|\})\s*body\s*\{[^}]*\}', r'\1', st.group(1)) if st else '')


def old_html(raw):
    raw = raw.replace('/n', '\n')
    if '${email_header}' in raw:
        return raw.replace('${email_header}', HEADER).replace('${email_footer}', FOOTER)
    body, style = body_of(raw)
    head = HEADER.replace('</style>', style + '</style>', 1) if style else HEADER
    return f'{head} <div class="content">{body}</div> {FOOTER}'


# ---------- restyle: same tags and text, new inline styles ----------
CAPTION = txt(12, 18, T['colorTextTertiary'], STRONG, 'text-transform:uppercase;letter-spacing:0;')
PANEL = f'background:{T["colorFillQuaternary"]};border-radius:{T["borderRadiusLG"]}px;padding:20px 24px;margin:4px 0 28px 0;'
WARN = f'background:{T["colorErrorBg"]};border:1px solid {T["colorErrorBorder"]};border-radius:{T["borderRadius"]}px;padding:20px 24px;margin:4px 0 28px 0;'
BUTTON = (f'display:inline-block;background:{T["colorBgSolid"]};color:#ffffff;border-radius:{T["borderRadius"]}px;padding:10px 28px;'
          f'font-family:{B.FONT};font-size:16px;line-height:24px;font-weight:400;text-decoration:none;margin:4px 0 16px 0;')
KEEP_TD = ('width', 'text-align', 'vertical-align', 'padding-left')
VOID = {'br', 'hr', 'img', 'meta', 'input'}


def keep(style, names):
    decl = [d.strip() for d in (style or '').split(';') if ':' in d]
    return ''.join(f'{d};' for d in decl if d.split(':')[0].strip().lower() in names)


class Restyle(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out, self.ctx, self.label_next = [], [], False

    def zone(self):
        return next((c for c in reversed(self.ctx) if c in ('sp', 'warn', 'contacts')), None)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs); cls = (a.get('class') or '').split(); st = a.get('style') or ''; z = self.zone(); s = None
        if tag == 'div':
            kind = 'sp' if 'shipping-preview' in cls else 'warn' if 'warning-message' in cls else 'contacts' if 'contacts' in cls else None
            if kind:
                s = WARN if kind == 'warn' else PANEL
            elif z in ('sp', 'warn') and self.ctx and self.ctx[-1] == z and not cls:
                s = CAPTION + 'margin:0 0 12px 0;'  # the panel's label ("Shipping Preview", "Important")
                kind = 'label'
            elif 'title' in cls:
                s = txt(24, 32, T['colorTextHeading'], STRONG, 'text-align:center;margin:0 0 12px 0;')
            elif 'description' in cls:
                s = txt(16, 24, T['colorTextBody'], 400, 'text-align:center;margin:0 0 24px 0;')
            elif 'image' in cls:
                s = 'text-align:center;margin:0 0 24px 0;'
            else:
                s = 'margin:0;'
            self.ctx.append(kind or 'div')
        elif tag == 'h1':
            s = txt(24, 32, T['colorTextHeading'], STRONG, 'margin:0 0 16px 0;')
        elif tag == 'h2':
            s = txt(16, 24, T['colorTextHeading'], STRONG, 'margin:0 0 4px 0;')
        elif tag == 'p':
            align = keep(st, ('text-align',))
            if z == 'contacts':
                s = txt(14, 22, T['colorTextBody'], 400, 'margin:0;')
            elif z in ('sp', 'warn'):
                muted = '#77767b' in st.lower()
                s = (txt(13, 20, T['colorTextSecondary']) if muted else txt(14, 22, T['colorTextHeading'])) + 'margin:2px 0;' + align
            else:
                s = txt(16, 24, T['colorTextBody'], 400, 'margin:0 0 16px 0;' + align + keep(st, ('margin-top',)))
        elif tag in ('ul', 'ol'):
            s = 'margin:0 0 16px 0;padding:0 0 0 22px;'
        elif tag == 'li':
            s = txt(16, 24, T['colorTextBody'], 400, 'margin:0 0 6px 0;')
        elif tag in ('b', 'strong'):
            s = f'font-weight:{STRONG};color:{T["colorTextHeading"]};'
        elif tag == 'a':
            if 'button' in cls or 'border-radius' in st or 'border:' in st:
                s = BUTTON
            else:
                s = f'color:{T["colorLink"]};text-decoration:underline;text-underline-offset:2px;'
        elif tag == 'hr':
            s = f'border:0;border-top:1px solid {T["colorSplit"]};height:0;margin:12px 0;'
        elif tag == 'table':
            s = 'width:100%;border-collapse:collapse;margin:0;'
        elif tag == 'td':
            s = keep(st, KEEP_TD) + 'padding-top:2px;padding-bottom:2px;'
        elif tag == 'img':
            s = ('display:block;width:100%;height:auto;border:0;border-radius:12px;margin:0 0 24px 0;' if 'content-image' in (a.get('src') or '')
                 else keep(st, ('max-width', 'vertical-align', 'width', 'height')) + 'border:0;')
        attrs = [(k, v) for k, v in attrs if k not in ('style', 'class')]
        if s is not None:
            attrs.append(('style', s))
        self.out.append('<' + tag + ''.join(f' {k}="{v}"' if v is not None else f' {k}' for k, v in attrs) + ('>' if tag not in VOID else '>'))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == 'div' and self.ctx:
            self.ctx.pop()
        if tag not in VOID:
            self.out.append(f'</{tag}>')

    def handle_data(self, d): self.out.append(d)
    def handle_entityref(self, n): self.out.append(f'&{n};')
    def handle_charref(self, n): self.out.append(f'&#{n};')
    def handle_comment(self, d): self.out.append(f'<!--{d}-->')


def restyle(html):
    p = Restyle(); p.feed(html); p.close()
    return ''.join(p.out)


# header and footer: the shared ones from build.py (logo on top; socials, links and legal below), as in every new email
def new_html(t):
    raw = t['HtmlPart'].replace('/n', '\n')
    body, _ = body_of(raw)
    rows = f'<tr><td class="px" style="padding:40px {B.PAD}px 40px {B.PAD}px;{txt(16, 24, T["colorTextBody"])}">{restyle(body)}</td></tr>'
    return B.shell(t['SubjectPart'].strip(), '', rows)


def text(html):
    """Visible text of the content area, to prove the new version says exactly the same."""
    h = re.sub(r'<(style|title|head)[^>]*>.*?</\1>', ' ', html, flags=re.S)
    h = re.sub(r'<!--.*?-->', ' ', h, flags=re.S)
    h = unescape(re.sub(r'<[^>]+>', ' ', h)).replace('\u034f', ' ').replace('\u2007', ' ')  # preheader filler is invisible
    return re.sub(r'\s+', ' ', h).strip()


if __name__ == '__main__':
    items, diffs = [], []
    for f in sorted(src.glob('email-template-*')):
        t = json.loads(f.read_text())
        name = t['TemplateName']
        old = old_html(t['HtmlPart'])
        if '<title>' not in old:
            old = old.replace('</head>', f'<title>{t["SubjectPart"].strip()}</title></head>', 1)
        (out / f'{name}.html').write_text(old)
        new = new_html(t)
        (out / 'new' / f'{name}.html').write_text(new)
        # same text in the content area, old vs new (header and footer are the shared build.py ones now)
        body = body_of(t['HtmlPart'].replace('/n', '\n'))[0]
        o, n = text(body), text(restyle(body))
        if o != n:
            diffs.append((name, o, n))
        items.append({'group': group(name), 'file': f'production/new/{name}.html', 'old': f'production/{name}.html',
                      'name': f'{name}: {re.sub(r"\s+", " ", t["SubjectPart"]).strip()}'})
    order = ['Production: Account', 'Production: Rates', 'Production: Shipments', 'Production: Containers']
    items.sort(key=lambda x: (order.index(x['group']), x['file']))
    (out / 'manifest.json').write_text(json.dumps(items, indent=1))
    print(f'{len(items)} production emails built (old + new)')
    for name, o, n in diffs:
        print(f'TEXT DIFFERS: {name}\n  old: {o[:300]}\n  new: {n[:300]}')
