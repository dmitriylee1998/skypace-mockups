#!/usr/bin/env python3
"""Builds the Skypace transactional emails into emails/*.html.
Figma: "Frtune Development" → Email Template (registration review) and
"Frtune Internal Project Part II" → Email Templates (shipments, rates, finance, messages, account).

Content comes from Figma; type and colors are the Skypace Ant Design theme (Roboto, navy #323656,
link #414bb3, layout #f4f5f8); centered Apple-style hero, left-aligned body.
Each template is one responsive file that covers both Figma frames (Desktop 654 and Mobile 375).

Markup follows the conventions of Stripo templates so it holds up in every major client:
XHTML transitional skeleton, es-wrapper-color + VML v:background (Outlook), role="none" tables with
bgcolor fallbacks, Stripo-style buttons (span.es-button-border + a.es-button, VML in Outlook),
capitalised "Margin" for Outlook.com, a Gmail Android width fix, PNG images only, and a fluid-hybrid
layout that still adapts where <style> is stripped. Dark mode: prefers-color-scheme (Apple Mail, iOS,
Outlook for Mac/mobile, Thunderbird) and [data-ogsc]/[data-ogsb] (Outlook.com); Gmail recolors on its
own, so icons and the logo ship as baked tiles/badges to stay readable there.

    python3 emails/build.py                      # images referenced relative (local preview)
    ASSET_URL=https://cdn.skypace.com/email python3 emails/build.py   # absolute image URLs for sending
"""
import json
import os
import re
from html import escape
from pathlib import Path

root = Path(__file__).parent
ASSET_URL = os.environ.get('ASSET_URL', 'img').rstrip('/')

# ---------- company data (from skypace.com/contact) ----------
COMPANY = {
    'legal': 'Maxton Shipping Inc. dba Skypace',
    'address': '3555 Cincinnati Avenue, Rocklin, CA 95765, United States',
    'phone': '+1 415 651 8445', 'phone_href': 'tel:+14156518445',  # main line
    'hours': 'Mon–Fri, 08:00–17:00 PT',
    'contact': 'https://skypace.com/contact',
    'app': 'https://app.skypace.com',
    'sign_up': 'https://app.skypace.com/sign-up',
    'newsroom': 'https://skypace.com/newsroom',
    'support_email': 'support@skypace.com',  # from the Figma templates
}
# Per-recipient values: sample data for the preview; MERGE_TAGS=1 outputs {{tags}} for the sending service.
SAMPLE = {
    'customer_name': 'Daniel Carter',
    'admin_name': 'Bridget Moore',
    'organization': 'Northwind Imports LLC',
    'invite_url': 'https://app.skypace.com/sign-up?invite=8F3K-2QW7',
    'requested_info': 'Please send a copy of your company registration certificate (Articles of Incorporation or EIN confirmation letter), '
                      'a completed IRS Form W-9, and the full legal address of your business. If your company name has changed, '
                      'also include the document confirming the change.',
    'email': 'daniel.carter@northwindimports.com',
    'verify_url': 'https://app.skypace.com/verify-email?token=Q7M2-K9XD',
    'reset_code': '417354',
    # shipment / rates / invoice / messages (values from the Figma previews)
    'shipment_id': 'SP-82949',
    'carrier': 'Maersk',
    'vessel': 'VN73940',
    'origin': 'New York, US', 'etd': '8 Mar',
    'destination': 'Rotterdam, NL', 'eta': '24 Mar',
    'new_etd': '11 Mar', 'new_eta': '27 Mar',
    'containers': '2 × 20′, 1 × 40′',
    'references': 'CR746394, SR736548, CR74850',
    'request_ref': 'CR746394',
    'commodity': 'Long grain rice in husk',
    'rate_from': '400.00 USD',
    'invoice_number': 'INV-000003', 'invoice_amount': '90,000.00 PLN',
    'invoice_date': '24 Jan 2026', 'due_date': '7 Feb 2026',
    'message_author': 'Emma Collins, Skypace Operations', 'message_time': '15 May, 16:45',
    'message_text': 'Hi, the shipment SP-004078 is currently being held at customs due to a request for additional documentation. '
                    'Customs can’t proceed with the clearance until the documents are provided: they’ve asked for the HS code certificate '
                    'to verify the classification of the goods, and proof of origin to confirm where the shipment was produced.',
    'shipment_message_author': 'Daniel Carter, Northwind Imports', 'shipment_message_text': 'Thank you for your assistance, we have received everything!',
}
if os.environ.get('MERGE_TAGS'):
    SAMPLE = {k: '{{' + k + '}}' for k in SAMPLE}
C, S = COMPANY, SAMPLE

# ---------- Ant Design v6 tokens (Skypace theme — same values as src.html / manual-confirmation ConfigProvider) ----------
TOKENS = {
    'colorBgLayout': '#f4f5f8',         # page background
    'colorBgContainer': '#ffffff',      # card
    'colorFillTertiary': '#f3f4f7',     # code box, step numbers (one shade off the page bg so dark mode can tell them apart)
    'colorFillQuaternary': '#f7f8f9',   # help box (--gray-1)
    'colorSplit': '#eeeff1',
    'colorBorderSecondary': '#f0f0f0',  # card hairlines
    'colorTextHeading': '#323656',      # NAVY
    'colorText': '#323656',
    'colorTextBody': '#414663',         # colorTextSecondary — paragraphs
    'colorTextSecondary': '#555a75',    # colorTextTertiary / colorIcon
    'colorTextTertiary': '#6a6f88',     # app's colorTextPlaceholder — passes WCAG AA on every email background
    'colorLink': '#414bb3',
    'colorPrimary': '#5f68c0',
    'colorPrimaryBg': '#f0f1fa',        # --primary-bg
    'colorBgSolid': '#323656',          # Button type="primary" (Skypace navy)
    'colorErrorBg': '#fff2f0', 'colorErrorBorder': '#ffccc7',        # antd Alert type="error"
    'colorWarningBg': '#fffbe6', 'colorWarningBorder': '#ffe58f',    # antd Alert type="warning"
    'colorInfoBg': '#f0f1fa', 'colorInfoBorder': '#d1d4ef',          # antd Alert type="info", from colorPrimary
    'borderRadiusLG': 12,
    'borderRadius': 8,
    'borderRadiusSM': 4,
    'controlHeightLG': 44,
    'fontSize': 16,
    'fontSizeSM': 14,
    'lineHeight': 26,
    'fontWeightStrong': 500,            # Roboto Medium, as in the app's headings
    'fontFamily': "Roboto, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
}
T = TOKENS
# Dark theme: light value → dark value, per paint type. Contrast of every text/background pair is ≥ 4.5:1.
DARK = {
    'b': {'#f4f5f8': '#111219', '#ffffff': '#1b1d29', '#f7f8f9': '#242635', '#f3f4f7': '#2a2c3d', '#eeeff1': '#34374a',
          '#323656': '#eef0f7', '#fff2f0': '#2c1618', '#fffbe6': '#2b2611', '#f0f1fa': '#1f2140'},
    'c': {'#323656': '#eef0f7', '#414663': '#c6c9d8', '#555a75': '#a9acc2', '#6a6f88': '#9497b0', '#414bb3': '#a5acf0',
          '#ffffff': '#1b1d29'},
    'k': {'#eeeff1': '#34374a', '#f0f0f0': '#34374a', '#323656': '#eef0f7', '#ffccc7': '#5c2226', '#ffe58f': '#594214',
          '#d1d4ef': '#3b3f73'},
}
FONT = T['fontFamily']
STRONG = T['fontWeightStrong']
CARD_W = 600
PAD = 48  # card side padding (24 on mobile)

def txt(size=None, lh=None, color=None, weight=400, extra=''):
    return (f'font-family:{FONT};font-size:{size or T["fontSize"]}px;line-height:{lh or T["lineHeight"]}px;'
            f'color:{color or T["colorText"]};font-weight:{weight};mso-line-height-rule:exactly;{extra}')


def table(rows, extra='', width='100%'):
    return (f'<table role="none" width="{width}" cellpadding="0" cellspacing="0" border="0" '
            f'style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:separate;border-spacing:0;{extra}">{rows}</table>')


def img(src, w, h, alt='', style='', dark=None):
    """PNG with fixed size. With `dark`, a second image is swapped in by the dark-mode CSS (hidden elsewhere)."""
    base = f'display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;width:{w}px;height:{h}px;{style}'
    tag = f'<img src="{ASSET_URL}/{src}" width="{w}" height="{h}" alt="{alt}" style="{base}"'
    if not dark:
        return tag + '>'
    return (tag + ' class="light-img">'
            '<!--[if !mso]><!--><div class="dark-img" style="display:none;overflow:hidden;float:left;width:0;max-height:0;max-width:0;line-height:0;mso-hide:all;">'
            f'<img src="{ASSET_URL}/{dark}" width="{w}" height="{h}" alt="{alt}" style="{base}"></div><!--<![endif]-->')


# ---------- components ----------
def link(text, href='#'):
    return f'<a href="{href}" target="_blank" style="color:{T["colorLink"]};text-decoration:underline;text-underline-offset:2px;">{text}</a>'


def para(html, mb=16, align='left'):
    return f'<p style="margin:0 0 {mb}px 0;text-align:{align};{txt(color=T["colorTextBody"])}">{html}</p>'


def greeting(text=None):
    text = text or f'Dear {S["customer_name"]},'
    return f'<p style="margin:0 0 16px 0;{txt(weight=500, color=T["colorTextHeading"])}">{text}</p>'


def hairline(pad='0'):
    return table(f'<tr><td height="1" style="height:1px;line-height:1px;font-size:1px;background:{T["colorSplit"]};">&nbsp;</td></tr>', f'margin:{pad};')


ALERT = {t: (T[f'color{t.title()}Bg'], T[f'color{t.title()}Border']) for t in ('error', 'warning', 'info')}


def callout(message, description, tone, mb=28):
    """antd Alert with showIcon + message + description: tinted fill, 1px border, filled 24px status icon."""
    bg, border = ALERT[tone]
    return table(
        f'<tr><td class="panel" style="background:{bg};border:1px solid {border};border-radius:{T["borderRadius"]}px;padding:20px 24px;">'
        + table(
            f'<tr><td valign="top" width="24" style="width:24px;">{img(f"alert-{tone}.png", 24, 24)}</td>'
            f'<td valign="top" style="padding:0 0 0 12px;">'
            f'<p style="margin:0 0 4px 0;{txt(16, 24, T["colorTextHeading"])}">{message}</p>'
            f'<p style="margin:0;{txt(14, 22, T["colorText"])}">{description}</p></td></tr>')
        + '</td></tr>', f'margin:4px 0 {mb}px 0;')


def issue(text):
    return callout('Issue', text, 'error')


def steps(title, items):
    """Next steps (antd List, borderless): numbered rows, no dividers."""
    rows = ''.join(
        f'<tr><td style="padding:0 0 14px 0;">'
        + table(
            f'<tr><td valign="top" width="26" style="width:26px;">'
            f'{table(f"""<tr><td align="center" valign="middle" width="26" height="26" style="width:26px;height:26px;background:{T["colorFillTertiary"]};border-radius:13px;{txt(13, 26, T["colorTextHeading"], STRONG)}">{i}</td></tr>""", "", "26")}</td>'
            f'<td valign="top" style="padding:1px 0 0 14px;{txt(15, 24, T["colorTextBody"])}">{it}</td></tr>')
        + '</td></tr>' for i, it in enumerate(items, 1))
    return (f'<p style="margin:0 0 12px 0;{txt(15, 22, T["colorTextHeading"], STRONG)}">{title}</p>'
            + table(rows, 'margin:0 0 14px 0;'))


def lead(title, text):
    """List item with a medium-weight lead-in: "Title — text"."""
    return f'<span style="color:{T["colorTextHeading"]};font-weight:{STRONG};">{title}</span> — {text}'


def note(html, align='left'):
    """Small secondary line under a button."""
    return f'<p style="margin:20px 0 0 0;text-align:{align};{txt(13, 20, T["colorTextSecondary"])}">{html}</p>'


def card(html, mb=28):
    """antd Card, borderless on a filled background — same fill as the "Need help?" box."""
    return table(f'<tr><td class="panel" style="background:{T["colorFillQuaternary"]};border-radius:{T["borderRadiusLG"]}px;padding:20px 24px;">{html}</td></tr>',
                 f'margin:4px 0 {mb}px 0;')


def card_head(label, right=''):
    """Small uppercase caption on the left, optional value on the right."""
    return table(f'<tr><td valign="middle" style="{txt(12, 18, T["colorTextTertiary"], STRONG, "letter-spacing:0.06em;text-transform:uppercase;")}">{label}</td>'
                 f'<td valign="middle" align="right" style="text-align:right;{txt(14, 20, T["colorTextHeading"], STRONG)}">{right}</td></tr>', 'margin:0 0 14px 0;')


def route(etd_label='ETD', eta_label='ETA', etd=None, eta=None):
    """Origin → destination with dates, as a 3-column row."""
    city = txt(16, 22, T['colorTextHeading'], STRONG)
    date = txt(13, 20, T['colorTextSecondary'])
    return table(
        f'<tr><td valign="top" width="45%" style="width:45%;"><p style="margin:0;{city}">{S["origin"]}</p><p style="margin:2px 0 0 0;{date}">{etd_label} {etd or S["etd"]}</p></td>'
        f'<td valign="top" align="center" style="text-align:center;{txt(18, 22, T["colorTextTertiary"])}">&rarr;</td>'
        f'<td valign="top" width="45%" align="right" style="width:45%;text-align:right;"><p style="margin:0;{city}">{S["destination"]}</p><p style="margin:2px 0 0 0;{date}">{eta_label} {eta or S["eta"]}</p></td></tr>')


def card_rows(rows):
    """Label / value rows split by hairlines (antd Descriptions, 1 column)."""
    sep = f'border-top:1px solid {T["colorSplit"]};'
    return table(''.join(
        f'<tr><td valign="top" style="padding:10px 0;{sep}{txt(14, 20, T["colorTextSecondary"])}">{k}</td>'
        f'<td valign="top" align="right" style="padding:10px 0;{sep}text-align:right;{txt(14, 20, T["colorTextHeading"], STRONG)}">{v}</td></tr>'
        for k, v in rows), 'margin:16px 0 0 0;')


def shipment_card(etd=None, eta=None):
    return card(card_head(f'Shipment {S["shipment_id"]}', S['carrier']) + route(etd=etd, eta=eta)
                + card_rows([('Vessel', S['vessel']), ('Containers', S['containers']), ('References', S['references'])]))


def rates_card():
    return card(card_head(f'Request {S["request_ref"]}', f'from {S["rate_from"]}') + route()
                + card_rows([('Commodity', S['commodity']), ('Containers', S['containers'])]))


def invoice_card():
    return card(card_head(f'Invoice {S["invoice_number"]}')
                + f'<p style="margin:0;{txt(28, 34, T["colorTextHeading"], STRONG)}">{S["invoice_amount"]}</p>'
                + card_rows([('Invoice date', S['invoice_date']), ('Due date', S['due_date'])]))


def quote(author, time, text):
    """Message preview (antd Comment-like): who and when, then the text on a filled block."""
    return table(
        f'<tr><td class="panel" style="background:{T["colorFillQuaternary"]};border-radius:{T["borderRadiusLG"]}px;padding:20px 24px;">'
        f'<p style="margin:0 0 8px 0;{txt(13, 20, T["colorTextSecondary"])}"><span style="color:{T["colorTextHeading"]};font-weight:{STRONG};">{author}</span> &middot; {time}</p>'
        f'<p style="margin:0;{txt(15, 24, T["colorTextBody"])}">{text}</p></td></tr>', 'margin:4px 0 28px 0;')


def comment(text, author='Comment from Skypace'):
    """Quiet note: thin left rule, small caption, secondary text — no fill, no icon."""
    return table(
        f'<tr><td style="border-left:2px solid {T["colorSplit"]};padding:2px 0 2px 16px;">'
        f'<p style="margin:0 0 4px 0;{txt(13, 20, T["colorTextTertiary"])}">{author}</p>'
        f'<p style="margin:0;{txt(15, 24, T["colorTextBody"])}">{text}</p></td></tr>', 'margin:0 0 28px 0;')


def code_box(code):
    """One-time code: large, spaced digits on a filled tile."""
    return table(
        f'<tr><td align="center" style="background:{T["colorFillTertiary"]};border-radius:{T["borderRadiusLG"]}px;padding:20px;'
        f'{txt(32, 40, T["colorTextHeading"], STRONG, "letter-spacing:8px;text-align:center;")}">{code}</td></tr>', 'margin:4px 0 20px 0;')


def button(label, href='#', align='left'):
    """antd Button type="primary" size="large", built like a Stripo button:
    VML roundrect for Outlook desktop; span.es-button-border + padded a.es-button everywhere else.
    Height comes from padding, not line-height, so clients that reset link styles (Gmail) keep the shape."""
    bg, fg = T['colorBgSolid'], '#ffffff'
    h, r, w = T['controlHeightLG'], T['borderRadius'], 220
    return f'''<table role="none" width="100%" cellpadding="0" cellspacing="0" border="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;margin:4px 0 0 0;"><tr><td align="{align}" class="es-m-txt-c" style="padding:0;">
  <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{href}" style="height:{h}px;v-text-anchor:middle;width:{w}px;" arcsize="{round(r / h * 100)}%" stroke="f" fillcolor="{bg}"><w:anchorlock/><center style="color:{fg};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">{label}</center></v:roundrect><![endif]-->
  <!--[if !mso]><!-- --><span class="es-button-border" style="border-style:solid;border-color:{bg};background:{bg};border-width:0;display:inline-block;border-radius:{r}px;width:auto;"><a href="{href}" target="_blank" class="es-button" style="mso-style-priority:100 !important;text-decoration:none !important;mso-line-height-rule:exactly;color:{fg};font-size:16px;line-height:24px;padding:10px 28px;display:inline-block;background:{bg};border-radius:{r}px;font-family:{FONT};font-weight:{STRONG};font-style:normal;width:auto;min-width:{w - 56}px;text-align:center;letter-spacing:0;mso-padding-alt:0;mso-border-alt:10px solid {bg};-webkit-text-size-adjust:none;">{label}&nbsp;&nbsp;&rarr;</a></span><!--<![endif]-->
</td></tr></table>'''


def header():
    """Centered logo. Dark-mode clients swap in a light logo. Gmail can't be styled for dark mode (it recolors the
    page itself and leaves images alone), so Gmail alone gets the logo on a baked rounded badge — readable on its
    dark background. Gmail is targeted with the `u + .body` selector, as Stripo templates do."""
    logo = (f'<div class="std-logo">'
            + img('logo.png', 142, 28, 'Skypace', f'margin:0 auto;{txt(20, 24, T["colorTextHeading"], 700)}', dark='logo-dark.png')
            + '</div><!--[if !mso]><!--><div class="gm-only" style="display:none;max-height:0;overflow:hidden;mso-hide:all;">'
            + img('logo-badge.png', 190, 52, 'Skypace', 'margin:0 auto;')
            + '</div><!--<![endif]-->')
    return f'''<tr><td class="px" align="center" style="padding:0 {PAD}px 24px {PAD}px;">
  <a href="https://skypace.com" target="_blank" style="text-decoration:none;">{logo}</a>
</td></tr>'''


def hero(icon, title, divider=True):
    """Centered icon tile + headline. The tile is baked into the PNG (light and dark versions), so it survives
    Gmail's own dark-mode recoloring. Long letters get a hairline before the body; invites just get air."""
    tile = img(f'tile-{icon}.png', 64, 64, '', 'margin:0 auto 24px auto;', dark=f'tile-{icon}-dark.png')
    return f'''<tr><td class="px hero" align="center" style="padding:48px {PAD}px 0 {PAD}px;text-align:center;">
  {tile}
  <h1 class="h1" style="margin:0 auto;max-width:480px;text-align:center;{txt(32, 40, T["colorTextHeading"], STRONG)}">{title}</h1>
  {hairline('36px 0 36px 0') if divider else '<div style="height:16px;line-height:16px;font-size:16px;">&nbsp;</div>'}
</td></tr>'''


def content(html):
    return f'<tr><td class="px" style="padding:0 {PAD}px 0 {PAD}px;">{html}</td></tr>'


def help_section():
    """Quiet help box (antd Card, filled): who to call and when, plus a contact link. No sign-off — like most product emails."""
    help_box = table(
        f'<tr><td class="panel" style="background:{T["colorFillQuaternary"]};border-radius:{T["borderRadiusLG"]}px;padding:18px 20px;">'
        + table(
            f'<tr><td class="stack" valign="middle" align="left" style="text-align:left;">'
            f'<p style="margin:0 0 2px 0;{txt(14, 20, T["colorTextHeading"], STRONG)}">Need help?</p>'
            f'<p style="margin:0;{txt(13, 20, T["colorTextSecondary"])}">Call <a href="{C["phone_href"]}" style="color:{T["colorTextSecondary"]};text-decoration:none;white-space:nowrap;">{C["phone"]}</a> &middot; {C["hours"]}</p></td>'
            f'<td class="stack" valign="middle" align="right" style="text-align:right;white-space:nowrap;padding-left:16px;">'
            f'<a href="{C["contact"]}" style="{txt(14, 20, T["colorTextHeading"], STRONG, "text-decoration:none;")}">Contact us&nbsp;&rarr;</a></td></tr>')
        + '</td></tr>')
    return f'''<tr><td class="px" style="padding:36px {PAD}px {PAD}px {PAD}px;">
  {help_box}
</td></tr>'''


SOCIAL = [('LinkedIn', 'social-linkedin.png', 'https://www.linkedin.com/company/skypaceinc/'),
          ('Instagram', 'social-instagram.png', 'https://www.instagram.com/skypaceusa/'),
          ('skypace.com', 'social-web.png', 'https://skypace.com')]
FOOTER_LINKS = [('Platform', 'https://skypace.com/platform'), ('FAQs', 'https://skypace.com/faqs'),
                ('Contact us', 'https://skypace.com/contact'), ('Privacy', 'https://skypace.com/privacy'),
                ('Terms of use', 'https://skypace.com/terms-of-use')]


def footer():
    """Centered brand footer: socials, links, then one quiet line — legal entity + address."""
    socials = ''.join(
        f'<td style="padding:0 6px;"><a href="{h}" target="_blank" style="text-decoration:none;">'
        f'{img(src, 36, 36, n, txt(11, 36, T["colorTextSecondary"]), dark=src.replace(".png", "-dark.png"))}</a></td>' for n, src, h in SOCIAL)
    links = f' <span style="color:{T["colorTextTertiary"]};">&nbsp;&middot;&nbsp;</span> '.join(
        f'<a href="{h}" style="color:{T["colorTextSecondary"]};text-decoration:none;white-space:nowrap;">{t}</a>' for t, h in FOOTER_LINKS)
    small = txt(12, 18, T['colorTextTertiary'])
    return f'''<tr><td align="center" class="px" style="padding:32px {PAD}px 0 {PAD}px;">
  {table(f'<tr>{socials}</tr>', 'margin:0 auto 24px auto;', '')}
  <p style="margin:0 0 20px 0;{txt(13, 22, T["colorTextSecondary"], 500)}">{links}</p>
  <p style="margin:0;{small}">&copy; 2026 {C["legal"]} &middot; {C["address"]}</p>
</td></tr>'''


MOBILE_CSS = """
  @media only screen and (max-width: 620px) {
    .outer { padding:12px 0 32px 0 !important; }
    .card { border-radius:0 !important; }
    .px { padding-left:24px !important; padding-right:24px !important; }
    .h1 { font-size:26px !important; line-height:33px !important; }
    .panel { padding:16px !important; }
    .hero { padding-top:36px !important; }
    .stack { display:block !important; width:100% !important; text-align:left !important; padding:0 !important; }
    .stack + .stack { padding-top:10px !important; }
    .es-button-border { display:block !important; }
    a.es-button { display:block !important; min-width:0 !important; }
  }
  @media screen and (max-width: 384px) { .mail-message-content { width:414px !important; } }"""

DARK_IMG_SHOW = ('display:block !important;overflow:visible !important;float:none !important;width:auto !important;'
                 'max-height:none !important;max-width:none !important;line-height:normal !important;')


def dark_css(used):
    """prefers-color-scheme for Apple Mail / iOS / Outlook mac & mobile; [data-ogsc]/[data-ogsb] for Outlook.com."""
    prop = {'c': 'color', 'b': 'background-color', 'k': 'border-color'}
    rules = [(k, f'.d{k}-{hx[1:]}', f'{prop[k]}:{DARK[k][hx]} !important;') for k in 'cbk' for hx in sorted(used[k])]
    media = ''.join(f'{sel}{{{d}}}' for _, sel, d in rules)
    outlook = ''.join(f'[data-ogs{"b" if k == "b" else "c"}] {sel}{{{d}}}' for k, sel, d in rules)
    imgs = f'.light-img{{display:none !important;}}.dark-img{{{DARK_IMG_SHOW}}}'
    return (f'\n  @media (prefers-color-scheme: dark) {{ {media}{imgs} }}'
            f'\n  {outlook}[data-ogsc] .light-img{{display:none !important;}}[data-ogsc] .dark-img{{{DARK_IMG_SHOW}}}')


def finalize(html):
    """Post-process the whole document: dark-mode classes for every themed color, Outlook.com "Margin",
    links opening in a new tab. Keeps components free of client hacks."""
    used = {'c': set(), 'b': set(), 'k': set()}

    def themed(m):
        t = m.group(0)
        st = re.search(r'style="([^"]*)"', t)
        found = []
        decls = re.findall(r'(?:^|;)\s*(color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?)\s*:\s*([^;]+)', st.group(1)) if st else []
        bgc = re.search(r'\sbgcolor="(#[0-9a-fA-F]{6})"', t)
        if bgc:
            decls.append(('background', bgc.group(1)))
        for name, val in decls:
            hx = re.search(r'#[0-9a-fA-F]{6}', val)
            kind = 'c' if name == 'color' else 'b' if name.startswith('background') else 'k'
            if hx and hx.group(0).lower() in DARK[kind]:
                found.append(f'd{kind}-{hx.group(0).lower()[1:]}'); used[kind].add(hx.group(0).lower())
        if not found:
            return t
        cls = ' '.join(sorted(set(found)))
        if ' class="' in t:
            return t.replace(' class="', f' class="{cls} ', 1)
        return t[:-1] + f' class="{cls}">'
    body_start = html.index('<body')
    body = re.sub(r'<(?![/!])[a-zA-Z][^>]*>', themed, html[body_start:])
    body = re.sub(r'(style="(?:[^"]*;)?\s*)margin:', r'\1Margin:', body)  # Outlook.com drops lowercase margin
    return html[:body_start].replace('/*DARK*/', dark_css(used)) + body


def shell(title, preheader, rows):
    """Stripo-style document: XHTML skeleton, es-wrapper-color + v:background, fluid 600px content table."""
    bg = T['colorBgLayout']
    return finalize(f'''<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<meta charset="UTF-8">
<meta content="width=device-width, initial-scale=1" name="viewport">
<meta name="x-apple-disable-message-reformatting">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta content="telephone=no, date=no, address=no, email=no, url=no" name="format-detection">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{escape(title)}</title>
<!--[if (mso 16)]><style type="text/css">a {{text-decoration: none;}}</style><![endif]-->
<!--[if gte mso 9]><style>sup {{ font-size: 100% !important; }}</style><![endif]-->
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG></o:AllowPNG><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if mso]><style>table,td,p,a,span,h1{{font-family:Arial,Helvetica,sans-serif !important;}}</style><![endif]-->
<!--[if !mso]><!-- --><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"><!--<![endif]-->
<style type="text/css">
  :root {{ color-scheme: light dark; supported-color-schemes: light dark; }}
  #outlook a {{ padding:0; }}
  body {{ width:100%; height:100%; margin:0 !important; padding:0 !important; }}
  * {{ -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }}
  table, td {{ mso-table-lspace:0pt; mso-table-rspace:0pt; }}
  img {{ -ms-interpolation-mode:bicubic; }}
  .es-button {{ mso-style-priority:100 !important; text-decoration:none !important; }}
  a[x-apple-data-detectors] {{ color:inherit !important; text-decoration:none !important; font-size:inherit !important; font-family:inherit !important; font-weight:inherit !important; line-height:inherit !important; }}
  .es-desk-hidden {{ display:none; float:left; overflow:hidden; width:0; max-height:0; line-height:0; mso-hide:all; }}
  .es-button:hover {{ opacity:.85; }}
  u + .body .gm-only {{ display:block !important; max-height:none !important; overflow:visible !important; }}
  u + .body .std-logo {{ display:none !important; }}{MOBILE_CSS}/*DARK*/
</style>
</head>
<body class="body" style="width:100%;height:100%;padding:0;margin:0;background-color:{bg};">
<div dir="ltr" class="es-wrapper-color" lang="en" style="background-color:{bg};">
<!--[if gte mso 9]><v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t"><v:fill type="tile" color="{bg}"></v:fill></v:background><![endif]-->
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">{escape(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="none" width="100%" cellpadding="0" cellspacing="0" border="0" class="es-wrapper" bgcolor="{bg}" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0;padding:0;margin:0;width:100%;height:100%;background-color:{bg};">
<tr><td align="center" valign="top" class="outer" style="padding:40px 16px 48px 16px;">
<!--[if mso]><table role="none" width="{CARD_W}" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="none" width="100%" cellpadding="0" cellspacing="0" border="0" class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:separate;max-width:{CARD_W}px;">
{header()}
<tr><td class="card" bgcolor="{T["colorBgContainer"]}" style="background:{T["colorBgContainer"]};border-radius:{T["borderRadiusLG"]}px;">
{table(rows)}
</td></tr>
{footer()}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</div>
</body>
</html>
''')


# ---------- templates ----------
def letter(title, preheader, icon, body, cta=None, hello=None, after=''):
    """Long letter: hero, greeting, left-aligned body, optional CTA (+ a small note under it), help box."""
    return shell(title, preheader, '\n'.join([
        hero(icon, title),
        content(greeting(hello) + body + (button(*cta) if cta else '') + after),
        help_section(),
    ]))


def invite(title, text, cta, icon='mail', url=None, extra='', preheader=None):
    """Short centered letter: hero, a few lines, CTA, link fallback. Preheader defaults to the first line."""
    url = url or S['invite_url']
    fallback = (f'<p style="margin:24px 0 0 0;text-align:center;{txt(13, 20, T["colorTextSecondary"])}">{extra}Button not working? Paste this link into your browser:<br>'
                f'<a href="{url}" style="color:{T["colorLink"]};word-break:break-all;">{url}</a></p>')
    return shell(title, preheader or text.split('<br>')[0], '\n'.join([
        hero(icon, title, divider=False),
        content(''.join(para(p, align='center') for p in text.split('<br>')) + button(cta, url, 'center') + fallback),
        help_section(),
    ]))


DASH = link('your account dashboard', C['app'])
EMAILS = [
    # group, file, name, html
    ('Invitation', 'invite-organization', "You're Invited to an Organization",
     lambda: invite(f"You're Invited to {S['organization']}", f"You're invited to {S['organization']} by {S['admin_name']}.", 'Go to Application')),
    ('Invitation', 'invite-skypace', "You're Invited to Skypace",
     lambda: invite("You're Invited to Skypace",
                      f"You're invited to join Skypace by {S['admin_name']}.<br>Please, first register your account {link('here', C['sign_up'])} and follow further instructions.",
                      'Register Account')),
    ('Additional information', 'additional-information', 'Skypace Account Registration: Additional information is required',
     lambda: letter('Skypace Account Registration: Additional information is required',
                      'Your application has missing or incomplete information.', 'file-text',
                      para('Thank you for your application to join Skypace. Unfortunately, your application has missing or incomplete information preventing us from proceeding with your registration.')
                      + para('So we can complete your registration as quickly as possible, please provide the information described below within <strong>7 business days</strong>. You can provide the information by replying directly to this email.')
                      + callout('Information required', S['requested_info'], 'warning'),
                      ('Contact our team', C['contact']))),
    ('Reject', 'reject-1-documentation', 'Rejected. Reason 1 — Documentation',
     lambda: letter('Action Required: Issues Identified with Your Documentation',
                      'We identified issues with your submitted documentation.', 'file-x',
                      para('Thank you for your application to join Skypace. During the review of your submitted documentation, we identified issues that currently prevent us from proceeding with your registration.')
                      + issue('Submitted documentation is invalid or does not meet our verification standards.')
                      + steps('Please:', ['Review the documentation for accuracy and validity.',
                                          'Ensure that all provided documents are current, clear, and legible.',
                                          f'Re-submit the necessary documents through {DASH}.']),
                      ('Open dashboard', C['app']))),
    ('Reject', 'reject-2-verification', 'Rejected. Reason 2 — Verification',
     lambda: letter('Further Verification Needed for Your Registration',
                      'We could not verify the information provided during registration.', 'search',
                      para('Thank you for choosing Skypace. We have encountered issues verifying the information provided during registration against our external databases or references.')
                      + issue('We are unable to verify the information provided against external databases or references.')
                      + steps('We encourage you to:', ['Confirm the provided details for any possible errors.',
                                                       'Provide additional references or documents to aid verification.',
                                                       f'Submit any updates via {DASH}.']),
                      ('Open dashboard', C['app']))),
    ('Reject', 'reject-3-service-area', 'Rejected. Reason 3 — Service area',
     lambda: letter('Registration Update: Service Area Limitations',
                      'We are unable to approve your registration at this time.', 'map-pin',
                      para('Thank you for applying to Skypace. Regrettably, we are unable to approve your registration at this time.')
                      + issue('Business location is outside of our serviceable regions.')
                      + steps('We recommend:', ['Exploring our services when your business operates within our serviceable areas.',
                                                f'{link("Subscribing", C["newsroom"])} to our newsletter for updates on our expanding service areas.']),
                      ('Subscribe to updates', C['newsroom']))),
    ('Reject', 'reject-4-security', 'Rejected. Reason 4 — Security',
     lambda: letter('Your Registration and Security Considerations',
                      'Certain aspects of your registration need to be addressed.', 'shield',
                      para('Thank you for your interest in Skypace. During our review, certain aspects raised security or safety concerns that need to be addressed.')
                      + issue('There are concerns related to the security or safety of engaging in business activities with the applicant.')
                      + steps('We invite you to:', ['Provide clarifications or additional documents addressing the identified concerns.',
                                                    'Engage in dialogue with our team to discuss potential resolutions.']),
                      ('Contact our team', C['contact']))),
    ('Reject', 'reject-5-multiple-registrations', 'Rejected. Reason 5 — Multiple registrations',
     lambda: letter('Coordination Needed: Multiple Registrations Identified',
                      'We have noticed multiple registration applications from your organization.', 'users',
                      para('Thank you for considering Skypace. We have noticed multiple registration applications from your organization and, to maintain the integrity and security of data, we are proceeding with a single application.')
                      + issue('Multiple registrations have been identified from the same organization.')
                      + steps('Moving forward, please:', ['Collaborate within your organization to utilize the approved account.',
                                                          'Manage multiple users or departments within the single organizational account.',
                                                          'Contact our team for any adjustments or additional user onboardings.']),
                      ('Contact our team', C['contact']))),

    # ---------- Figma "Frtune Internal Project Part II" → Email Templates ----------
    ('Invitation', 'invite-member', 'Invitation by a member, partner or organization',
     lambda: invite(f"Join {S['organization']} on Skypace",
                    f"You have been invited by {S['admin_name']} to join {S['organization']} at Skypace, a comprehensive logistics platform designed to streamline your shipping operations.",
                    'Accept invitation', icon='user-plus', extra='This invitation expires in 7 days.<br>',
                    preheader=f"{S['admin_name']} invited you to join {S['organization']} on Skypace.")),
    ('Account', 'welcome', 'Welcome',
     lambda: letter('Welcome to Skypace', 'Your Skypace account is ready.', 'log-in',
                    para('Your Skypace account is ready. Get instant ocean freight rates, book shipments and keep track of every container — all in one place.')
                    + steps('Get started:', [lead('Request a quote', 'compare rates from 10+ carriers in seconds.'),
                                             lead('Book your first shipment', 'your dedicated team takes it from there.'),
                                             lead('Invite your team', 'partners and vendors can follow shipments with you.')]),
                    ('Go to Skypace', C['app']))),
    ('Account', 'verify-email', 'Verify email',
     lambda: invite('Verify Your Email Address',
                    f"Please confirm that {S['email']} is your email address to finish setting up your Skypace account.",
                    'Verify email', icon='mail-check', url=S['verify_url'],
                    extra='If you didn’t create a Skypace account, you can ignore this email. The link expires in 24 hours.<br><br>')),
    ('Account', 'reset-password', 'Reset password',
     lambda: letter('Reset Your Password', 'Your password reset code.', 'key',
                    para('We received a request to reset your password. Your password reset code is:')
                    + code_box(S['reset_code'])
                    + para('The code is only valid for the next 24 hours.')
                    + para(f'If you didn’t request a password reset, get in touch with our support team at {link(C["support_email"], "mailto:" + C["support_email"])} and secure your account.', 0))),
    ('Account', 'organization-registration-received', 'Organization registration request is received',
     lambda: letter('We’ve Received Your Registration Request', f'We’re reviewing {S["organization"]}.', 'building',
                    para(f'We have received a registration request for <strong style="font-weight:{STRONG};color:{T["colorTextHeading"]};">{S["organization"]}</strong>.')
                    + para('Your organization’s details will be reviewed within 2 days. We will contact you via email, and if the review is successful, you will be officially registered on the platform.'),
                    ('Open Skypace', C['app']))),
    ('Account', 'additional-docs-required', 'Additional docs required',
     lambda: letter('Additional Documents Required', 'Your application has missing or incomplete information.', 'file-text',
                    para(f'Thank you for registering your organization {S["organization"]} at Skypace. Unfortunately, your application has missing or incomplete information preventing us from proceeding with your registration.')
                    + para('So we can complete your registration as quickly as possible, please provide the information described below within <strong>7 business days</strong>. You can provide it by replying directly to this email.')
                    + callout('Note from Onboarding Team', S['requested_info'], 'warning')
                    + para(f'If you have any questions, please contact us at {link(C["support_email"], "mailto:" + C["support_email"])}. We’ll be happy to help.'),
                    ('Open dashboard', C['app']))),
    ('Account', 'account-approved', 'Your account is approved',
     lambda: letter('Your Account Is Approved', f'The account for {S["organization"]} has been approved.', 'check-circle',
                    para(f'We are delighted to inform you that the account for {S["organization"]} has been approved.')
                    + steps('Enjoy the process:', [lead('Book shipments', 'book and manage your shipments, all in one space.'),
                                                   lead('Global tracking', 'keep an eye on your shipments, every step of the way.'),
                                                   lead('Streamline finances', 'benefit from payment solutions tailored to your processes.'),
                                                   lead('Action Center', 'navigate through key events of your shipments.')])
                    + para('We appreciate your business!'),
                    ('Book a shipment', C['app']))),

    ('Shipments', 'shipment-update', 'Shipment (technical template)',
     lambda: letter(f'Update on Shipment {S["shipment_id"]}', f'There’s an update on shipment {S["shipment_id"]}.', 'ship',
                    para(f'There’s an update on your shipment {S["shipment_id"]}. Please review the details below.')
                    + shipment_card()
                    + callout('Important', 'The carrier needs the Verified Gross Mass (VGM) for all containers at least 48 hours before the vessel cut-off.', 'warning'),
                    ('Open shipment', C['app']))),
    ('Shipments', 'shipment-confirmed', 'Shipment is confirmed. No actions required',
     lambda: letter('Your Booking Is Confirmed', f'Shipment {S["shipment_id"]} is confirmed.', 'check-circle',
                    para('Thank you for trusting Skypace.')
                    + para(f'We are pleased to inform you that your booking for shipment {S["shipment_id"]} has been successfully confirmed. No action is required from your side.')
                    + shipment_card()
                    + steps('What’s next? Visit your Action Center:', [lead('Review booking details', 'verify the specifics of your shipment.'),
                                                                       lead('Check tasks', 'see if any actions or documents are pending on your side.'),
                                                                       lead('Manage shipments', 'track progress and access all related features.')]),
                    ('Open Action Center', C['app']))),
    ('Shipments', 'schedule-updated', 'Schedule for shipment has been updated',
     lambda: letter('Shipment Schedule Updated', f'New dates for shipment {S["shipment_id"]}.', 'calendar',
                    para(f'The carrier has updated the schedule for your shipment {S["shipment_id"]}. Please review the new dates below.')
                    + shipment_card(etd=S['new_etd'], eta=S['new_eta'])
                    + para('No action is required from your side. The Action Center is your hub for all shipment-related activities, so you’ll always have the latest details at your fingertips.'),
                    ('View shipment', C['app']))),

    ('Rates', 'rates-received', 'Rates are received',
     lambda: letter('Rates Are Ready for Your Request', f'Rates for request {S["request_ref"]}.', 'tag',
                    para('We have received rates for your request. Thank you for your interest and patience. You can review them using the link below.')
                    + rates_card(),
                    ('Review rates', C['app']))),
    ('Rates', 'rates-received-comments', 'Rates are received · with comments',
     lambda: letter('Rates Are Ready for Your Request', f'Rates for request {S["request_ref"]}, with comments from our team.', 'tag',
                    para('We have received rates for your request. Thank you for your interest and patience. You can review them using the link below.')
                    + rates_card()
                    + comment('We’ve added two options: a direct Maersk sailing, and a lower rate via Antwerp with 3 extra days in transit.'),
                    ('Review rates', C['app']))),
    ('Rates', 'rate-request-completed', 'Rate request is completed',
     lambda: letter('New Rates Matching Your Request', 'Rates you were looking for are now available.', 'search',
                    para('Recently, you requested quotes on Skypace for which we didn’t have rates. We’re pleased to inform you that rates matching your request have been added to our system.')
                    + rates_card()
                    + para('Sign in to Skypace to find quotes that fit your needs.'),
                    ('Find quotes', C['app']))),

    ('Finance', 'invoice', 'Invoice',
     lambda: letter(f'Your Invoice {S["invoice_number"]}', f'Invoice {S["invoice_number"]} for {S["invoice_amount"]}.', 'receipt',
                    para('Thank you for your business. Your invoice can be viewed, printed and downloaded as PDF from the link below.')
                    + invoice_card(),
                    ('Pay now', C['app']))),

    ('Messages', 'message-general', 'General message',
     lambda: letter('You Have a New Message', 'New message in Skypace.', 'message',
                    para('You have received a new message in the Skypace application:')
                    + quote(S['message_author'], S['message_time'], S['message_text']),
                    ('Go to message', C['app']))),
    ('Messages', 'message-shipment', 'Message linked to shipment',
     lambda: letter(f'New Message About Shipment {S["shipment_id"]}', f'New message about shipment {S["shipment_id"]}.', 'message',
                    para(f'You have received a new message regarding shipment {S["shipment_id"]} in the Skypace application:')
                    + quote(S['shipment_message_author'], S['message_time'], S['shipment_message_text'])
                    + shipment_card(),
                    ('Go to message', C['app']))),

    ('General', 'info', 'Info (technical template)',
     lambda: letter('Scheduled Maintenance', 'Skypace will be briefly unavailable.', 'info',
                    para('Skypace will be unavailable on Sunday, 15 Mar from 02:00 to 04:00 PT while we upgrade our systems.')
                    + para('Bookings and messages sent during this window will be processed as soon as the platform is back online.'),
                    ('Go to Skypace', C['app']))),
]

if __name__ == '__main__':
    manifest = []
    for group, slug, name, render in EMAILS:
        fname = f'{slug}.html'
        (root / fname).write_text(render())
        manifest.append({'group': group, 'file': fname, 'name': name})
    (root / 'manifest.js').write_text('window.EMAILS = ' + json.dumps(manifest, indent=1) + ';\n')
    print(f'{len(manifest)} emails built')
