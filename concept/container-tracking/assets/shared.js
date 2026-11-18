/* Skypace — shared pieces for the homepage and the Container Tracking app.
   React 18 + Ant Design v6 (UMD) + htm (JSX-free templates) + d3/topojson for the map. */
(function () {
  const { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } = React;
  const html = htm.bind(React.createElement);
  const A = antd;
  const I = icons;

  /* ------------------------------------------------------------------ */
  /* Theme                                                               */
  /* ------------------------------------------------------------------ */
  // Tokens from the Skypace Ant Design v6 Figma library (Primary / Neutral / Character Branding)
  // Tokens from "Ant Design System – v6" Figma (colorText #323656, colorLink #414BB3, colorBgSolid #323656 …)
  const C = {
    primary: '#414BB3', primary1: '#F0F1FA', primary4: '#A3A9E0',
    title: '#323656', text: '#323656', secondary: '#6A6F88', breadcrumb: '#555A75', placeholder: '#6A6F88',
    n1: '#FFFFFF', n3: '#FAFAFB', n4: '#F0F0F0', n5: '#D9D9D9', n8: '#323656', layout: '#F5F6F8',
    success: '#52C41A', warning: '#FAAD14', error: '#FF4D4F', hover: 'rgba(50,54,86,0.04)',
  };
  const THEME = {
    token: {
      colorPrimary: C.primary,
      colorInfo: C.primary,
      colorLink: C.primary,
      colorSuccess: C.success,
      colorWarning: C.warning,
      colorError: C.error,
      colorText: C.text,
      colorTextHeading: C.title,
      colorTextSecondary: C.secondary,
      colorTextPlaceholder: C.placeholder,
      colorBorder: C.n5,
      colorBorderSecondary: C.n4,
      colorBgLayout: C.layout,
      colorBgContainer: C.n1,
      colorBgSolid: C.n8,
      controlItemBgHover: C.hover,
      fontFamily: 'Roboto, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      borderRadius: 6,
      borderRadiusSM: 4,
      borderRadiusLG: 8,
      controlHeight: 32,
      controlHeightLG: 40,
      fontSize: 14,
      boxShadowSecondary: '0 6px 16px 0 rgba(0,0,0,.08), 0 3px 6px -4px rgba(0,0,0,.12), 0 9px 28px 8px rgba(0,0,0,.05)',
    },
    components: {
      // primary actions use the DS "solid" button (colorBgSolid #323656)
      Button: { colorPrimary: C.n8, colorPrimaryHover: '#4A4F75', colorPrimaryActive: '#24273F', primaryShadow: '0 2px 0 rgba(50,54,86,.02)', defaultShadow: '0 2px 0 rgba(50,54,86,.02)', fontWeight: 400 },
      Tabs: { itemSelectedColor: C.primary, inkBarColor: C.primary, itemColor: C.secondary, titleFontSize: 14, horizontalItemPadding: '12px 0' },
      Tag: { defaultBg: C.n3, defaultColor: C.title },
      Select: { optionSelectedBg: C.primary1, optionHeight: 32 },
      Form: { labelColor: C.text, verticalLabelPadding: '0 0 8px' },
      Modal: { titleFontSize: 20 },
      Collapse: { headerPadding: '20px 0', contentPadding: '0 0 20px' },
      Menu: { itemColor: C.text, itemHeight: 40, itemBorderRadius: 8, itemMarginInline: 4, iconMarginInlineEnd: 10, itemBg: 'transparent', itemSelectedBg: C.n1, itemSelectedColor: C.title, collapsedWidth: 48 },
      Breadcrumb: { itemColor: C.breadcrumb, separatorColor: C.breadcrumb, linkColor: C.breadcrumb, lastItemColor: C.text },
    },
  };
  function AppShell({ children }) {
    return html`<${A.ConfigProvider} theme=${THEME} wave=${{ disabled: true }}><${A.App}>${children}<//><//>`;
  }

  /* ------------------------------------------------------------------ */
  /* Icons (antd + a few logistics glyphs antd lacks)                    */
  /* ------------------------------------------------------------------ */
  const ic = (name, props) => (I[name] ? React.createElement(I[name], props) : null);
  const svgIcon = (d, vb = '0 0 24 24') => (props = {}) =>
    html`<span role="img" className=${'anticon ' + (props.className || '')} style=${props.style}>
      <svg width="1em" height="1em" viewBox=${vb} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg></span>`;
  const ShipIcon = svgIcon(html`<path d="M3 15l1.6 4.2c.2.5.7.8 1.2.8h12.4c.5 0 1-.3 1.2-.8L21 15H3z"/><path d="M5 15V9h14v6"/><path d="M9 9V5h6v4"/><path d="M12 5V3"/>`);
  const TruckIcon = svgIcon(html`<path d="M2 6h11v10H2z"/><path d="M13 9h4l3 3.5V16h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>`);
  const RailIcon = svgIcon(html`<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14"/><path d="M8 20l2-4M16 20l-2-4"/><circle cx="9" cy="13" r=".6"/><circle cx="15" cy="13" r=".6"/>`);
  const ContainerIcon = svgIcon(html`<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/><path d="M7.5 9v8M16.5 9v8"/>`);
  const DocIcon = svgIcon(html`<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>`);
  const MODE_ICON = { sea: ShipIcon, truck: TruckIcon, rail: RailIcon };

  /* ------------------------------------------------------------------ */
  /* Carriers                                                            */
  /* ------------------------------------------------------------------ */
  const CARRIERS = {
    MAEU: { name: 'Maersk', short: 'MSK', bg: '#42b0d5' },
    MSCU: { name: 'MSC', short: 'MSC', bg: '#1a1a1a' },
    CMDU: { name: 'CMA CGM', short: 'CMA', bg: '#0c2e6e' },
    COSU: { name: 'COSCO Shipping', short: 'CSC', bg: '#1d3f8f' },
    HLCU: { name: 'Hapag-Lloyd', short: 'HL', bg: '#f26a21' },
    ONEY: { name: 'ONE', short: 'ONE', bg: '#d6007a' },
    EGLV: { name: 'Evergreen', short: 'EMC', bg: '#00843d' },
    HDMU: { name: 'HMM', short: 'HMM', bg: '#0b3a82' },
    YMLU: { name: 'Yang Ming', short: 'YML', bg: '#c48a00' },
    ZIMU: { name: 'ZIM', short: 'ZIM', bg: '#15305e' },
    OOLU: { name: 'OOCL', short: 'OOCL', bg: '#d4002a' },
  };
  const CTR_PREFIX = { MSKU: 'MAEU', MRKU: 'MAEU', MAEU: 'MAEU', MRSU: 'MAEU', MSCU: 'MSCU', MEDU: 'MSCU', CMAU: 'CMDU', CGMU: 'CMDU', CSNU: 'COSU', CBHU: 'COSU', CCLU: 'COSU', HLXU: 'HLCU', HLBU: 'HLCU', ONEU: 'ONEY', EGHU: 'EGLV', EMCU: 'EGLV', HMMU: 'HDMU', HDMU: 'HDMU', YMLU: 'YMLU', ZIMU: 'ZIMU', OOLU: 'OOLU' };
  const LEASING = { TCNU: 'Triton', TGHU: 'Textainer', FCIU: 'Florens', TEMU: 'Textainer', CAIU: 'CAI', SEGU: 'SeaCo', BMOU: 'Beacon', TRHU: 'Trident' };
  const BL_PREFIX = { MAEU: 'MAEU', MEDU: 'MSCU', CMDU: 'CMDU', COSU: 'COSU', HLCU: 'HLCU', ONEY: 'ONEY', EGLV: 'EGLV', HDMU: 'HDMU', YMLU: 'YMLU', ZIMU: 'ZIMU', OOLU: 'OOLU' };

  // Carrier logos from Figma "Skypace | Quote Shipment" → Logo Quote Carrier (8007:44041)
  const LOGOS = Object.fromEntries(Object.entries({ MAEU: 'maersk', ONEY: 'one', HLCU: 'hapag', CMDU: 'cma', MSCU: 'msc', ZIMU: 'zim', YMLU: 'yangming', HDMU: 'hmm', EGLV: 'evergreen', COSU: 'cosco', OOLU: 'oocl' }).map(([k, f]) => [k, `assets/logos/${f}.svg`]));
  function CarrierBadge({ code, size }) {
    const c = CARRIERS[code];
    const cls = 'carrier-badge ' + (size || '');
    if (c && LOGOS[code]) return html`<img className=${cls} src=${LOGOS[code]} alt=${c.name} title=${c.name} />`;
    return html`<span className=${cls} style=${{ color: c ? c.bg : C.secondary }} title=${c ? c.name : 'Unknown carrier'}>${c ? c.short : '?'}</span>`;
  }
  const CARRIER_OPTIONS = [
    { value: 'AUTO', label: 'Autodetect' },
    ...Object.entries(CARRIERS).map(([k, c]) => ({ value: k, label: html`<span style=${{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><${CarrierBadge} code=${k} /> ${c.name}</span>` })),
  ];

  /* ------------------------------------------------------------------ */
  /* Number recognition (ISO 6346 container numbers, carrier B/L prefixes) */
  /* ------------------------------------------------------------------ */
  const ISO_MAP = (() => { const m = {}; let v = 10; for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { if (v % 11 === 0) v++; m[ch] = v; v++; } return m; })();
  function checkDigit(first10) {
    let sum = 0;
    for (let i = 0; i < 10; i++) { const c = first10[i]; sum += (/\d/.test(c) ? +c : ISO_MAP[c]) * Math.pow(2, i); }
    return (sum % 11) % 10;
  }
  const ctr = (owner, serial) => owner + serial + checkDigit(owner + serial);
  const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const fmtNum = (n) => (/^[A-Z]{4}\d{7}$/.test(n) ? n.slice(0, 4) + ' ' + n.slice(4, 10) + ' ' + n.slice(10) : n);

  function detect(raw) {
    const v = norm(raw);
    if (!v) return null;
    if (/^[A-Z]{4}\d{7}$/.test(v)) {
      const owner = v.slice(0, 4);
      if (!/[UJZ]$/.test(owner)) return { kind: 'container', valid: false, msg: 'The 4th letter of a container number is U, J or Z' };
      const cd = checkDigit(v.slice(0, 10));
      if (cd !== +v[10]) return { kind: 'container', valid: false, msg: `Check digit doesn't match — the last digit should be ${cd}` };
      const carrier = CTR_PREFIX[owner];
      return { kind: 'container', valid: true, carrier, leasing: !carrier ? LEASING[owner] || 'leasing company' : null };
    }
    if (/^[A-Z]{3}[UJZ]\d{0,6}$/.test(v)) return { kind: 'container', partial: true };
    if (/^[A-Z]{4}[A-Z0-9]{6,16}$/.test(v)) {
      const carrier = BL_PREFIX[v.slice(0, 4)];
      return { kind: 'bl', valid: true, carrier };
    }
    if (/^\d{9,12}$/.test(v)) return { kind: 'bl', valid: true, carrier: null };
    if (v.length < 6) return { kind: null, partial: true };
    return { kind: null, valid: false, msg: 'Use a container number (4 letters + 7 digits) or a B/L number' };
  }

  /* ------------------------------------------------------------------ */
  /* Demo data — as of 15 Oct 2026, 10:00                                */
  /* ------------------------------------------------------------------ */
  const NOW = dayjs('2026-10-15T10:00:00');
  const LOC = {
    CNDGG: { city: 'Dongguan', cc: 'CN', at: [113.75, 23.02] },
    CNYTN: { city: 'Yantian', cc: 'CN', at: [114.27, 22.57] },
    CNNGB: { city: 'Ningbo', cc: 'CN', at: [121.85, 29.93] },
    CNSHA: { city: 'Shanghai', cc: 'CN', at: [121.8, 31.2] },
    KRPUS: { city: 'Busan', cc: 'KR', at: [129.04, 35.08] },
    USLAX: { city: 'Los Angeles', cc: 'US', at: [-118.27, 33.73] },
    USLGB: { city: 'Long Beach', cc: 'US', at: [-118.21, 33.75] },
    USCHI: { city: 'Chicago', cc: 'US', at: [-87.63, 41.88] },
    USMEM: { city: 'Memphis', cc: 'US', at: [-90.05, 35.15] },
    USSAV: { city: 'Savannah', cc: 'US', at: [-81.1, 32.08] },
    USATL: { city: 'Atlanta', cc: 'US', at: [-84.39, 33.75] },
    USNYC: { city: 'New York', cc: 'US', at: [-74.15, 40.68] },
    PAPCN: { city: 'Panama Canal', cc: 'PA', at: [-79.7, 9.1] },
    DEHAM: { city: 'Hamburg', cc: 'DE', at: [9.97, 53.54] },
  };
  const PATHS = {
    dgg_ytn: [[113.75, 23.02], [114.0, 22.8], [114.27, 22.57]],
    ytn_lax: [[114.27, 22.57], [114.9, 22.1], [117, 21.6], [120.8, 21.4], [122.6, 23.6], [126, 27.6], [133, 31.2], [142, 35], [155, 40.2], [170, 44], [-175, 45.6], [-160, 45], [-145, 42], [-132, 37.6], [-123, 34.2], [-118.27, 33.73]],
    lax_chi: [[-118.27, 33.73], [-117.3, 34.1], [-114.6, 35.0], [-111.6, 35.2], [-106.6, 35.1], [-101.8, 35.2], [-97.5, 35.5], [-94.6, 39.1], [-91.5, 40.6], [-87.63, 41.88]],
    ngb_pcn: [[121.85, 29.93], [122.7, 29.8], [125, 29.2], [132, 28.6], [142, 28], [156, 25.6], [170, 22], [-170, 18], [-150, 14], [-130, 11], [-110, 9], [-92, 7.4], [-82, 7.2], [-79.7, 9.1]],
    pcn_sav: [[-79.7, 9.1], [-79.85, 9.4], [-79.3, 11], [-76.6, 14.6], [-74.6, 18.6], [-73.9, 20.2], [-74.6, 23], [-77.3, 26.8], [-79.6, 30.2], [-80.6, 31.8], [-81.1, 32.08]],
    sav_atl: [[-81.1, 32.08], [-82.4, 32.6], [-83.6, 33.2], [-84.39, 33.75]],
    pus_lgb: [[129.04, 35.08], [129.8, 34.2], [132, 32.6], [136, 33.4], [141, 35], [150, 39.2], [165, 44], [180, 46.5], [-165, 46], [-150, 43], [-135, 38], [-123, 34], [-118.21, 33.75]],
    lgb_mem: [[-118.21, 33.75], [-116, 34.6], [-112, 35], [-106.6, 35.1], [-101.8, 35.2], [-97.5, 35.4], [-94.4, 35.4], [-90.05, 35.15]],
    ham_nyc: [[9.97, 53.54], [9.0, 54.0], [7.6, 54.1], [4.2, 52.9], [2.4, 51.4], [1.4, 51.05], [-1.2, 50.3], [-5.6, 49.6], [-15, 48.4], [-35, 45], [-55, 41.8], [-68, 40.3], [-73.7, 40.35], [-74.15, 40.68]],
  };
  const E = (t, at, extra) => Object.assign({ t, at }, extra || {});

  const RAW = [
    {
      id: 'S1', kind: 'container', number: ctr('MSKU', '734291'), carrier: 'MAEU', status: 'in_transit',
      type: "40' High Cube Dry", iso: '45G1', booking: '258114906', bl: '258114906',
      vessel: { name: 'MAERSK EMDEN', voyage: '439E', imo: '9456783', flag: 'Denmark' },
      atd: '2026-09-27', eta: '2026-10-18', etaOriginal: '2026-10-16', updatedMin: 25,
      now: { title: 'At sea, North Pacific', sub: '1,540 nm to Los Angeles, 17.8 kn' },
      legs: [{ mode: 'truck', path: 'dgg_ytn', p: 1 }, { mode: 'sea', path: 'ytn_lax', p: 0.74 }, { mode: 'rail', path: 'lax_chi', p: 0 }],
      stops: [
        { loc: 'CNDGG', role: 'Place of receipt', terminal: 'Shipper facility', events: [E('Empty container picked up', '2026-09-19 09:40'), E('Gate out full, by truck', '2026-09-20 15:05')], next: { mode: 'truck', label: 'Pre-carriage by truck' } },
        { loc: 'CNYTN', role: 'Port of loading', terminal: 'Yantian International Container Terminals', events: [E('Gate in full', '2026-09-21 07:22'), E('Loaded on vessel', '2026-09-26 22:10'), E('Vessel departed', '2026-09-27 20:14')], next: { mode: 'sea', label: 'MAERSK EMDEN 439E' } },
        { loc: 'USLAX', role: 'Port of discharge', terminal: 'APM Terminals Pier 400', events: [E('Vessel arrival', '2026-10-18 06:00', { was: '2026-10-16 06:00' }), E('Discharged', '2026-10-18 21:00'), E('Loaded on rail', '2026-10-20 14:00')], next: { mode: 'rail', label: 'BNSF intermodal' } },
        { loc: 'USCHI', role: 'Place of delivery', terminal: 'BNSF Logistics Park Chicago', events: [E('Rail arrival', '2026-10-24 08:00'), E('Available for pickup', '2026-10-24 16:00'), E('Empty container returned', '2026-10-28 12:00')] },
      ],
    },
    {
      id: 'S2', kind: 'bl', number: 'COSU6431127850', carrier: 'COSU', status: 'in_transit', booking: '6431127850',
      vessel: { name: 'COSCO AQUILA', voyage: '087E', imo: '9783512', flag: 'Hong Kong' },
      atd: '2026-09-10', eta: '2026-10-19', etaOriginal: '2026-10-19', updatedMin: 12,
      now: { title: 'At sea, Caribbean Sea', sub: 'Through the Panama Canal on 12 Oct, 690 nm to Savannah' },
      containers: ['S2a', 'S2b', 'S2c', 'S2d'],
      legs: [{ mode: 'sea', path: 'ngb_pcn', p: 1 }, { mode: 'sea', path: 'pcn_sav', p: 0.36 }, { mode: 'truck', path: 'sav_atl', p: 0 }],
      stops: [
        { loc: 'CNNGB', role: 'Port of loading', terminal: 'Ningbo Meishan Island Container Terminal', events: [E('Containers gated in (3 of 4)', '2026-09-06 11:30'), E('Loaded on vessel', '2026-09-10 02:40'), E('Vessel departed', '2026-09-10 18:30')], next: { mode: 'sea', label: 'COSCO AQUILA 087E' } },
        { loc: 'PAPCN', role: 'Canal transit', terminal: 'Neopanamax locks, Agua Clara', events: [E('Panama Canal transit', '2026-10-12 04:10')], next: { mode: 'sea', label: 'COSCO AQUILA 087E' } },
        { loc: 'USSAV', role: 'Port of discharge', terminal: 'Garden City Terminal', events: [E('Vessel arrival', '2026-10-19 07:00'), E('Discharged', '2026-10-19 22:00')], next: { mode: 'truck', label: 'On-carriage by truck' } },
        { loc: 'USATL', role: 'Place of delivery', terminal: 'Consignee warehouse', events: [E('Out for delivery', '2026-10-21 08:00'), E('Delivered', '2026-10-21 15:00')] },
      ],
    },
    {
      id: 'S3', kind: 'container', number: ctr('HMMU', '641072'), carrier: 'HDMU', status: 'delivered', bl: 'HDMUPUSA4471209',
      type: "40' Dry Standard", iso: '42G1', booking: 'PUSA4471209',
      vessel: { name: 'HMM TOPAZ', voyage: '0041E', imo: '9742118', flag: 'Panama' },
      atd: '2026-09-14', ata: '2026-10-03', eta: '2026-10-03', etaOriginal: '2026-10-02', updatedMin: 300,
      now: { title: 'Delivered, Memphis', sub: 'Empty container returned on 13 Oct' },
      legs: [{ mode: 'sea', path: 'pus_lgb', p: 1 }, { mode: 'rail', path: 'lgb_mem', p: 1 }],
      stops: [
        { loc: 'KRPUS', role: 'Port of loading', terminal: 'HPNT Busan New Port', events: [E('Gate in full', '2026-09-10 13:12'), E('Loaded on vessel', '2026-09-13 23:40'), E('Vessel departed', '2026-09-14 06:20')], next: { mode: 'sea', label: 'HMM TOPAZ 0041E' } },
        { loc: 'USLGB', role: 'Port of discharge', terminal: 'Long Beach Container Terminal', events: [E('Vessel arrival', '2026-10-03 05:30'), E('Discharged', '2026-10-03 18:45'), E('Loaded on rail', '2026-10-06 10:00')], next: { mode: 'rail', label: 'Union Pacific intermodal' } },
        { loc: 'USMEM', role: 'Place of delivery', terminal: 'UP Marion Intermodal', events: [E('Rail arrival', '2026-10-10 04:15'), E('Delivered', '2026-10-11 13:30'), E('Empty container returned', '2026-10-13 09:05')] },
      ],
    },
    {
      id: 'S4', kind: 'container', number: ctr('HLXU', '806512'), carrier: 'HLCU', status: 'discharged', bl: 'HLCUHAM260931447',
      type: "20' Dry Standard", iso: '22G1', booking: '61847203', lastFreeDay: '2026-10-17',
      vessel: { name: 'ELBE EXPRESS', voyage: '041W', imo: '9501344', flag: 'Germany' },
      atd: '2026-10-01', ata: '2026-10-13', eta: '2026-10-13', etaOriginal: '2026-10-13', updatedMin: 48,
      now: { title: 'Discharged, waiting for pickup', sub: 'APM Terminals Elizabeth, customs released' },
      legs: [{ mode: 'sea', path: 'ham_nyc', p: 1 }],
      stops: [
        { loc: 'DEHAM', role: 'Port of loading', terminal: 'CTA Altenwerder', events: [E('Gate in full', '2026-09-28 10:05'), E('Loaded on vessel', '2026-10-01 01:30'), E('Vessel departed', '2026-10-01 09:00')], next: { mode: 'sea', label: 'ELBE EXPRESS 041W' } },
        { loc: 'USNYC', role: 'Port of discharge', terminal: 'APM Terminals Elizabeth', events: [E('Vessel arrival', '2026-10-12 22:10'), E('Discharged', '2026-10-13 08:40'), E('Customs released', '2026-10-14 11:20'), E('Gate out for delivery', '2026-10-17 17:00')] },
      ],
    },
  ];
  // containers of B/L COSU6431127850
  const blStops = RAW[1].stops;
  const blCtr = (id, owner, serial, type, iso, gateIn, last) => ({
    id, kind: 'container', number: ctr(owner, serial), carrier: 'COSU', status: 'in_transit', bl: RAW[1].number, parent: 'S2', type, iso, booking: RAW[1].booking,
    vessel: RAW[1].vessel, atd: RAW[1].atd, eta: RAW[1].eta, etaOriginal: RAW[1].etaOriginal, updatedMin: 12, now: RAW[1].now, legs: RAW[1].legs, last,
    stops: [Object.assign({}, blStops[0], { events: [E('Empty container picked up', gateIn[0]), E('Gate in full', gateIn[1]), E('Loaded on vessel', '2026-09-10 02:40'), E('Vessel departed', '2026-09-10 18:30')] }), blStops[1], blStops[2], blStops[3]],
  });
  RAW.push(
    blCtr('S2a', 'CSNU', '718245', "40' High Cube Dry", '45G1', ['2026-09-02 08:10', '2026-09-04 16:22']),
    blCtr('S2b', 'CBHU', '902317', "40' High Cube Dry", '45G1', ['2026-09-02 08:55', '2026-09-05 09:47']),
    blCtr('S2c', 'TCNU', '355108', "40' Dry Standard", '42G1', ['2026-09-03 10:30', '2026-09-06 11:30']),
    {
      id: 'S2d', kind: 'container', number: ctr('FCIU', '481736'), carrier: 'COSU', status: 'rolled', bl: RAW[1].number, parent: 'S2', type: "20' Dry Standard", iso: '22G1', booking: RAW[1].booking,
      vessel: { name: 'CSCL VENUS', voyage: '112E', imo: '9645970', flag: 'Hong Kong' },
      atd: '2026-09-25', eta: '2026-11-03', etaOriginal: '2026-10-19', updatedMin: 12,
      now: { title: 'At sea, North Pacific', sub: 'Rolled from COSCO AQUILA to the next sailing' },
      legs: [{ mode: 'sea', path: 'ngb_pcn', p: 0.52 }, { mode: 'sea', path: 'pcn_sav', p: 0 }, { mode: 'truck', path: 'sav_atl', p: 0 }],
      stops: [
        Object.assign({}, blStops[0], { events: [E('Empty container picked up', '2026-09-06 07:20'), E('Gate in full', '2026-09-09 21:05'), E('Rolled — not loaded on COSCO AQUILA', '2026-09-10 02:40', { warn: true }), E('Loaded on vessel CSCL VENUS', '2026-09-24 23:15'), E('Vessel departed', '2026-09-25 08:00')], next: { mode: 'sea', label: 'CSCL VENUS 112E' } }),
        Object.assign({}, blStops[1], { events: [E('Panama Canal transit', '2026-10-27 06:00')], next: { mode: 'sea', label: 'CSCL VENUS 112E' } }),
        Object.assign({}, blStops[2], { events: [E('Vessel arrival', '2026-11-03 07:00', { was: '2026-10-19 07:00' }), E('Discharged', '2026-11-03 20:00')] }),
        Object.assign({}, blStops[3], { events: [E('Out for delivery', '2026-11-05 08:00'), E('Delivered', '2026-11-05 15:00')] }),
      ],
    }
  );
  const SHIPMENTS = Object.fromEntries(RAW.map((s) => [s.id, s]));
  const BY_NUMBER = Object.fromEntries(RAW.map((s) => [norm(s.number), s.id]));
  const EXAMPLES = [SHIPMENTS.S1.number, 'COSU6431127850', SHIPMENTS.S2b.number, SHIPMENTS.S4.number];

  const isPast = (at) => dayjs(at.replace(' ', 'T')).isBefore(NOW);
  const fmtDate = (d) => dayjs(d.replace(' ', 'T')).format('DD MMM YYYY');
  const fmtShort = (d) => dayjs(d.replace(' ', 'T')).format('DD MMM');
  const fmtTime = (d) => dayjs(d.replace(' ', 'T')).format('HH:mm');
  const daysBetween = (a, b) => dayjs(b).startOf('day').diff(dayjs(a).startOf('day'), 'day');
  const ago = (m) => (m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`);
  const place = (k) => `${LOC[k].city}, ${LOC[k].cc}`;

  const STATUS = {
    in_transit: { label: 'In transit', color: 'blue', tone: '' },
    delivered: { label: 'Delivered', color: 'green', tone: 'is-done' },
    discharged: { label: 'Discharged', color: 'gold', tone: 'is-warn' },
    rolled: { label: 'Rolled', color: 'orange', tone: 'is-warn' },
  };

  function summarize(s) {
    const pol = s.stops.find((x) => /loading/.test(x.role)) || s.stops[0];
    const pod = s.stops.find((x) => /discharge/.test(x.role)) || s.stops[s.stops.length - 1];
    const seaLegs = s.legs.filter((l) => l.mode === 'sea');
    const lens = seaLegs.map((l) => PATHS[l.path].length - 1);
    const total = lens.reduce((a, b) => a + b, 0);
    let p = 0; seaLegs.forEach((l, i) => (p += l.p * lens[i]));
    const delay = s.etaOriginal && s.eta ? daysBetween(s.etaOriginal, s.eta) : 0;
    const ts = s.stops.filter((x) => /Canal|Transship/.test(x.role));
    const arrived = s.status === 'delivered' || s.status === 'discharged';
    return {
      from: place(pol.loc), to: place(pod.loc), fromCity: LOC[pol.loc].city, toCity: LOC[pod.loc].city,
      progress: arrived ? 1 : total ? p / total : 0, delay, ts: ts.map((x) => ({ name: LOC[x.loc].city, at: 0.62 })),
      daysLeft: arrived ? 0 : Math.max(0, daysBetween(NOW, s.eta)),
      st: STATUS[s.status],
    };
  }

  /* ------------------------------------------------------------------ */
  /* Store — auth, daily quota, saved shipments (localStorage, per browser) */
  /* ------------------------------------------------------------------ */
  const LIMIT = 5;
  const KEY = 'skypace-tracking-proto-v2';
  const today = () => dayjs().format('YYYY-MM-DD');
  const DEFAULT = () => ({ auth: true, day: today(), used: 2, recent: ['S1', 'S2', 'S4', 'S3'] });
  let state = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.day === today()) return Object.assign(DEFAULT(), s); if (s) return Object.assign(DEFAULT(), s, { day: today(), used: 0 }); } catch (e) {} return DEFAULT(); })();
  const subs = new Set();
  const store = {
    get: () => state,
    set(patch) { state = Object.assign({}, state, typeof patch === 'function' ? patch(state) : patch); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} subs.forEach((f) => f()); },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    reset() { store.set(DEFAULT()); },
  };
  window.addEventListener('storage', (e) => { if (e.key === KEY) { try { state = JSON.parse(e.newValue) || DEFAULT(); subs.forEach((f) => f()); } catch (_) {} } });
  const useStore = () => useSyncExternalStore(store.subscribe, store.get);

  function useResetCountdown() {
    const [, tick] = useState(0);
    useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
    const ms = dayjs().endOf('day').diff(dayjs());
    const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1000);
    return { long: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, short: h ? `${h} h ${m} min` : `${m} min` };
  }

  /* ------------------------------------------------------------------ */
  /* Header                                                              */
  /* ------------------------------------------------------------------ */
  const Logo = ({ href = 'index.html' }) => html`<a className="sp-logo" href=${href} aria-label="Skypace home" dangerouslySetInnerHTML=${{ __html: window.SKY_LOGO }}></a>`;
  const Flag = () => html`<span className="sp-flag" aria-label="United States"><svg viewBox="0 0 22 15" width="22" height="15"><rect width="22" height="15" fill="#b22234"/>${[1, 3, 5, 7, 9, 11, 13].map((y) => html`<rect key=${y} y=${(y * 15) / 13 - 15 / 13} width="22" height=${15 / 13} fill="#fff" transform=${`translate(0 ${15 / 13})`} />`)}<rect width="9.5" height="8.1" fill="#3c3b6e"/></svg></span>`;

  const NAV = [
    {
      key: 'svc', label: 'Logistics services', cols: '220px 280px',
      groups: [
        { title: 'Freight forwarding', links: [['Ocean freight'], ['Road freight'], ['Customs clearance'], ['Air freight'], ['Warehousing'], ['Project logistics']] },
        { title: 'Shipping platform', feature: true, links: [['Free shipping platform', 'Instant Quotes, Effortless Booking, and Smarter Shipping Management.'], ['1 min demo', 'Watch how booking works']] },
      ],
    },
    {
      key: 'co', label: 'Company', cols: '200px 280px',
      groups: [
        { title: 'Company', links: [['Global team'], ['Compliance'], ['Careers', "We're hiring!"], ['Newsroom']] },
        { title: 'About us', feature: true, links: [['About us', 'Our mission is to accelerate the global supply chain digitalization in a collaborative logistics hub accessible worldwide.'], ['Need to ship cargo?', 'Create account or Contact us']] },
      ],
    },
    {
      key: 'cl', label: 'For Clients', cols: '200px 260px 240px',
      groups: [
        { title: 'Industries', links: [['Industrial'], ['Foods and Perishables'], ['Electronics'], ['Energy'], ['Retail'], ['Agriculture'], ['Automotive'], ['Healthcare'], ['All industries']] },
        { title: 'Who we serve', links: [['Cargo Shippers', 'Meet your logistics team, enhance efficiency, and accelerate trade worldwide.'], ['Freight Forwarders', 'Compare rates, book instantly, win and ship faster.']] },
        { title: 'Tools', feature: true, links: [['Container tracking', 'Track containers and bills of lading on a live map.', 'tracking.html'], ['Freight Rates Analytics', 'Ocean rate trends by trade lane.']] },
      ],
    },
  ];

  function NavDrop({ item }) {
    const [open, setOpen] = useState(false);
    const t = useRef();
    const show = () => { clearTimeout(t.current); setOpen(true); };
    const hide = () => { t.current = setTimeout(() => setOpen(false), 120); };
    return html`<div style=${{ position: 'relative' }} onMouseEnter=${show} onMouseLeave=${hide} onFocus=${show} onBlur=${hide}>
      <button className=${'sp-nav-item' + (open ? ' is-open' : '')} aria-expanded=${open} onClick=${() => setOpen(!open)}>
        ${item.label}${item.key === 'cl' ? html`<span className="new-dot">New</span>` : null}<span className="chev">${ic('DownOutlined')}</span>
      </button>
      ${open && html`<div className="mega" style=${{ position: 'absolute', top: 'calc(100% + 10px)', left: -12, gridTemplateColumns: item.cols, zIndex: 120 }}>
        ${item.groups.map((g) => html`<div key=${g.title} className=${g.feature ? 'feature' : ''}>
          <h6>${g.title}</h6>
          ${g.links.map(([l, d, href]) => html`<a key=${l} href=${href || '#'}>${l}${href ? html` <span className="new-dot" style=${{ font: '600 10px/1 Inter', background: C.primary, color: '#fff', padding: '3px 6px', borderRadius: 99, marginLeft: 4 }}>New</span>` : null}${d ? html`<small>${d}</small>` : null}</a>`)}
        </div>`)}
      </div>`}
    </div>`;
  }

  function AccountMenu({ onLogout }) {
    const content = html`<div style=${{ width: 220, display: 'grid', gap: 10 }}>
      <div style=${{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <${A.Avatar} style=${{ background: C.placeholder }} icon=${ic('UserOutlined')} />
        <div><b>Demo user</b><div className="muted" style=${{ fontSize: 12 }}>Free plan</div></div>
      </div>
      <${A.Button} block href="tracking.html" icon=${ic('AimOutlined')}>My shipments<//>
      <${A.Button} block type="text" danger icon=${ic('LogoutOutlined')} onClick=${onLogout}>Log out<//>
    </div>`;
    return html`<${A.Popover} content=${content} trigger="click" placement="bottomRight" arrow=${false}>
      <button className="sp-nav-item" aria-label="Account" style=${{ padding: 4 }}>
        <${A.Avatar} size=${32} style=${{ background: C.placeholder }} icon=${ic('UserOutlined')} />
      </button>
    <//>`;
  }

  function Header({ app, onLogin }) {
    const s = useStore();
    const [drawer, setDrawer] = useState(false);
    const login = () => (onLogin ? onLogin() : (location.href = 'tracking.html?login=1'));
    return html`<header className=${'sp-header' + (app ? ' is-app' : '')}>
      <div className="container">
        <${Logo} />
        <nav className="sp-nav" aria-label="Main">
          ${NAV.map((n) => html`<${NavDrop} key=${n.key} item=${n} />`)}
          <a className="sp-nav-item" href="#">Contacts</a>
        </nav>
        <div className="sp-actions">
          <span className="hide-md"><${Flag} /></span>
          ${s.auth
            ? html`<${AccountMenu} onLogout=${() => store.set({ auth: false })} />`
            : html`<span className="hide-md" style=${{ display: 'flex', gap: 8 }}>
                <${A.Button} type="text" onClick=${login}>Log in<//>
                <${A.Button} type="primary" onClick=${login}>Sign up<//>
              </span>`}
          <${A.Button} className="sp-burger" type="text" aria-label="Open menu" icon=${ic('MenuOutlined')} onClick=${() => setDrawer(true)} />
        </div>
      </div>
      <${A.Drawer} open=${drawer} onClose=${() => setDrawer(false)} placement="right" width=${340} title=${html`<div style=${{ width: 100, color: C.title }} dangerouslySetInnerHTML=${{ __html: window.SKY_LOGO }}></div>`}>
        <${A.Collapse} ghost accordion expandIconPosition="end" items=${NAV.map((n) => ({
          key: n.key, label: html`<b>${n.label}</b>`,
          children: n.groups.map((g) => html`<div key=${g.title} style=${{ marginBottom: 12 }}><div className="eyebrow" style=${{ marginBottom: 6 }}>${g.title}</div>${g.links.map(([l, , href]) => html`<a key=${l} href=${href || '#'} style=${{ display: 'block', padding: '7px 0', textDecoration: 'none' }}>${l}</a>`)}</div>`),
        }))} />
        <a href="#" style=${{ display: 'block', padding: '12px 0', fontWeight: 600, textDecoration: 'none' }}>Contacts</a>
        <${A.Divider} />
        ${s.auth
          ? html`<${A.Button} block onClick=${() => store.set({ auth: false })}>Log out<//>`
          : html`<div style=${{ display: 'grid', gap: 8 }}><${A.Button} block size="large" type="primary" onClick=${() => { setDrawer(false); login(); }}>Sign up<//><${A.Button} block size="large" onClick=${() => { setDrawer(false); login(); }}>Log in<//></div>`}
      <//>
    </header>`;
  }

  /* ------------------------------------------------------------------ */
  /* Footer                                                              */
  /* ------------------------------------------------------------------ */
  // Same structure as the skypace.com footer: white, 1200px grid, brand + 4 columns, FMC note, © and socials
  const LINKEDIN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.857 2A2.857 2.857 0 0 0 2 4.857v14.286A2.857 2.857 0 0 0 4.857 22h14.286A2.857 2.857 0 0 0 22 19.143V4.857A2.857 2.857 0 0 0 19.143 2H4.857Zm1.574 6.139a1.707 1.707 0 1 0 0-3.415 1.707 1.707 0 0 0 0 3.415Zm1.429 10.737V9.477H5.003v9.399H7.86Zm1.897-9.399h2.857v1.259c.422-.66 1.347-1.549 3.069-1.549 2.054 0 3.17 1.362 3.17 3.952 0 .124.011.691.011.691v5.044h-2.857v-5.043c0-.693-.146-2.054-1.686-2.054-1.541 0-1.671 1.711-1.707 2.831v4.266H9.757V9.477Z" fill="currentColor"/></svg>';
  const INSTAGRAM = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5-.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0ZM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" fill="currentColor"/></svg>';
  function Footer() {
    const col = (t, items) => html`<div className="fcol"><h6>${t}</h6><ul>${items.map((i) => html`<li key=${i}><a href="#">${i}</a></li>`)}</ul></div>`;
    return html`<footer className="sp-footer">
      <div className="container">
        <div className="grid">
          <div className="brand"><${Logo} /><${A.Typography.Paragraph} className="tagline">Shipping to the future<//></div>
          ${col('Services', ['Ocean freight', 'Road freight', 'Air freight', 'Warehousing', 'Project logistics', 'Customs clearance', 'Freight Rates Analytics'])}
          ${col('Platform', ['Features', 'How it works'])}
          ${col('Company', ['About us', 'Careers', 'Industries', 'Contacts', 'FAQs'])}
          ${col('Legal', ['Privacy', 'Terms of use', 'Compliance', 'Anti-bribery policy', 'Safety & health policy', 'Code of business conduct'])}
        </div>
        <div className="fmc">
          <img src="assets/fmc-seal.png" alt="Federal Maritime Commission seal" width="40" height="40" />
          <div><${A.Typography.Paragraph}>Skypace operates in full compliance with international freight forwarding regulations.<//><${A.Typography.Paragraph}>Maxton Shipping Inc DBA Skypace is a registered NVOCC (Non-Vessel Operating Common Carrier) under FMC License 027662.<//></div>
        </div>
        <div className="legal">
          <span>© 2024. Maxton Shipping Inc DBA Skypace. All rights reserved.</span>
          <div className="social"><a href="#" aria-label="LinkedIn" dangerouslySetInnerHTML=${{ __html: LINKEDIN }}></a><a href="#" aria-label="Instagram" dangerouslySetInnerHTML=${{ __html: INSTAGRAM }}></a></div>
        </div>
      </div>
    </footer>`;
  }

  /* ------------------------------------------------------------------ */
  /* Search box (shared by homepage block and the tracking app)          */
  /* ------------------------------------------------------------------ */
  function DetectLine({ value, carrier, error }) {
    const d = detect(value);
    if (error) return html`<div className="detect-line"><span className="err">${ic('ExclamationCircleFilled')} ${error}</span></div>`;
    if (!d) return html`<div className="detect-line">Container, B/L or booking number — we detect the carrier for you</div>`;
    if (d.partial) return html`<div className="detect-line">${d.kind === 'container' ? 'Container number, keep typing' : 'Keep typing…'}</div>`;
    if (!d.valid) return html`<div className="detect-line"><span className="err">${ic('ExclamationCircleFilled')} ${d.msg}</span></div>`;
    const who = carrier !== 'AUTO' ? CARRIERS[carrier].name : d.carrier ? CARRIERS[d.carrier].name : null;
    return html`<div className="detect-line">
      <span className="ok">${ic('CheckCircleFilled')}</span>
      <span>${d.kind === 'container' ? 'Container number' : 'Bill of lading'}${who ? html`, <b style=${{ color: 'inherit' }}>${who}</b>` : d.leasing ? `, ${d.leasing} box, carrier found on search` : ', carrier found on search'}</span>
    </div>`;
  }

  // One row: number · carrier (Autodetect) · icon button. No captions or examples; only an error line when needed.
  function SearchBox({ value, onChange, carrier, onCarrier, onSubmit, error, layout = 'panel', loading, inputRef }) {
    const submit = () => onSubmit && onSubmit();
    return html`<div className=${'trk-search is-' + layout}>
      <${A.Space.Compact} block size="large">
        <${A.Input} ref=${inputRef} id=${'trk-q-' + layout} allowClear value=${value} maxLength=${24}
          onChange=${(e) => onChange(e.target.value.toUpperCase())} onPressEnter=${submit}
          placeholder="Container or B/L" aria-label="Container or bill of lading number"
          style=${{ fontFamily: value ? 'var(--mono)' : undefined, letterSpacing: value ? '.03em' : undefined }} status=${error ? 'error' : undefined} />
        <${A.Select} id=${'trk-c-' + layout} value=${carrier} onChange=${onCarrier} options=${CARRIER_OPTIONS} aria-label="Carrier" listHeight=${320} popupMatchSelectWidth=${220} className="trk-carrier" />
        <${A.Button} type="primary" aria-label="Track" icon=${ic('SearchOutlined')} onClick=${submit} loading=${loading} />
      <//>
      ${error ? html`<div className="search-err" role="alert">${error}</div>` : null}
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Map (d3 + world-atlas, no tile server)                              */
  /* ------------------------------------------------------------------ */
  const OCEANS = [['North Pacific Ocean', [-150, 30]], ['South Pacific Ocean', [-125, -25]], ['North Atlantic Ocean', [-42, 32]], ['South Atlantic Ocean', [-18, -25]], ['Indian Ocean', [78, -20]], ['Caribbean Sea', [-74, 15.5]]];

  const LABEL_POS = { USLGB: 'b', USLAX: 'b', PAPCN: 'b', USSAV: 'b', USATL: 'l', USMEM: 'r', USNYC: 'l' };
  function createMap(el, opts) {
    const W = 1000;
    const center = opts.center != null ? opts.center : -100;
    const proj = d3.geoMercator().rotate([-center, 0]).scale(W / (2 * Math.PI)).translate([W / 2, W / 2]);
    const gpath = d3.geoPath(proj);
    const svg = d3.select(el).append('svg').attr('role', 'img').attr('aria-label', 'World map with shipment routes');
    const gz = svg.append('g');
    const land = topojson.feature(window.WORLD, window.WORLD.objects.countries);
    const base = gz.append('g');
    base.append('path').datum(d3.geoGraticule().step([20, 20])()).attr('class', 'grat').attr('d', gpath);
    base.append('g').selectAll('path').data(land.features.filter((f) => f.id !== '010')).join('path').attr('class', 'land').attr('d', gpath);
    // seamless wrap: copies of the world to the west and east
    [-W, W].forEach((dx) => gz.insert(() => base.node().cloneNode(true), ':first-child').attr('transform', `translate(${dx},0)`));
    const gRoutes = gz.append('g');
    const gTop = svg.append('g');
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    gz.node().appendChild(tmp); tmp.setAttribute('fill', 'none'); tmp.setAttribute('stroke', 'none');
    const line = d3.line().curve(d3.curveCatmullRom.alpha(0.5));
    const cache = {};
    function sample(key) {
      if (cache[key]) return cache[key];
      const pts = PATHS[key].map((p) => proj(p));
      tmp.setAttribute('d', line(pts));
      const L = tmp.getTotalLength(); const N = Math.max(24, Math.round(L / 2));
      const out = []; for (let i = 0; i <= N; i++) { const q = tmp.getPointAtLength((L * i) / N); out.push([q.x, q.y]); }
      return (cache[key] = out);
    }
    const cut = (arr, p) => { const i = Math.round((arr.length - 1) * p); return [arr.slice(0, i + 1), arr.slice(i)]; };
    const poly = (a) => (a.length > 1 ? 'M' + a.map((q) => q[0].toFixed(2) + ',' + q[1].toFixed(2)).join('L') : null);
    function currentPos(s) {
      for (const l of s.legs) if (l.p < 1) { const a = sample(l.path); return a[Math.round((a.length - 1) * l.p)]; }
      const a = sample(s.legs[s.legs.length - 1].path); return a[a.length - 1];
    }

    let t = d3.zoomIdentity, vw = 1, vh = 1, data = { mode: 'overview', list: [] }, focusKey = null;
    const zoom = d3.zoom().scaleExtent([0.2, 60]).on('zoom', (ev) => { t = ev.transform; gz.attr('transform', t); placeTop(); });
    if (opts.interactive !== false) svg.call(zoom).on('dblclick.zoom', null); else svg.style('cursor', 'default');

    function size() {
      const r = el.getBoundingClientRect(); vw = Math.max(1, r.width); vh = Math.max(1, r.height);
      const minK = Math.max(vw / (2.4 * W), Math.min(vh / 1000, 0.3));
      zoom.scaleExtent([minK, 60]).translateExtent([[-W, 20], [2 * W, 900]]).extent([[0, 0], [vw, vh]]);
    }
    function fitPoints(pts, pad, animate) {
      if (!pts.length) return;
      size();
      const p = Object.assign({ top: 40, right: 40, bottom: 40, left: 40 }, pad || (opts.padding && opts.padding()) || {});
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const aw = Math.max(40, vw - p.left - p.right), ah = Math.max(40, vh - p.top - p.bottom);
      const [kmin, kmax] = zoom.scaleExtent();
      const k = Math.min(Math.max(Math.min(aw / Math.max(1, x1 - x0), ah / Math.max(1, y1 - y0)), kmin), Math.min(kmax, opts.maxFit || 9));
      const tx = p.left + aw / 2 - k * (x0 + x1) / 2, ty = p.top + ah / 2 - k * (y0 + y1) / 2;
      const target = d3.zoomIdentity.translate(tx, ty).scale(k);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (animate && !reduce) svg.transition().duration(850).ease(d3.easeCubicInOut).call(zoom.transform, target);
      else svg.call(zoom.transform, target);
    }
    function boundsFor() {
      if (data.mode === 'focus' && data.focus) return data.focus.legs.flatMap((l) => sample(l.path));
      if (data.mode === 'dots') return data.fitTo ? data.fitTo.map((p) => proj(p)) : data.dots.map((d) => proj(d.at));
      const pts = data.list.flatMap((s) => s.legs.flatMap((l) => sample(l.path)));
      return pts.length ? pts : [proj([-170, 60]), proj([20, -30])];
    }

    function renderRoutes() {
      gRoutes.selectAll('*').remove();
      if (data.mode === 'focus' && data.focus) {
        data.focus.legs.forEach((l) => {
          const [a, b] = cut(sample(l.path), l.p);
          const cls = l.mode === 'rail' ? ' route-rail' : '';
          if (l.p < 1) gRoutes.append('path').attr('class', 'route-todo' + cls).attr('d', poly(l.p > 0 ? b : sample(l.path)));
          if (l.p > 0) gRoutes.append('path').attr('class', 'route-done' + cls).attr('d', poly(l.p < 1 ? a : sample(l.path)));
        });
      } else if (data.mode === 'overview') {
        data.list.forEach((s) => s.legs.forEach((l) => gRoutes.append('path').attr('class', 'route-ghost' + (s.id === data.hot ? ' is-hot' : '')).attr('d', poly(sample(l.path)))));
      }
    }
    function renderTop() {
      gTop.selectAll('*').remove();
      gTop.selectAll('text.ocean-label').data(OCEANS).join('text').attr('class', 'ocean-label').attr('text-anchor', 'middle').text((d) => d[0]).datum((d) => ({ p: proj(d[1]) }));
      if (data.mode === 'dots') {
        data.dots.forEach((d) => {
          const g = gTop.append('g').datum({ p: proj(d.at) });
          g.append('circle').attr('r', d.r || 5).attr('fill', d.color).attr('fill-opacity', 0.9).attr('stroke', '#fff').attr('stroke-width', 1.5);
        });
        return;
      }
      if (data.mode === 'focus' && data.focus) {
        const s = data.focus;
        s.stops.forEach((st, i) => {
          const end = i === 0 || i === s.stops.length - 1;
          const g = gTop.append('g').attr('class', 'mk-port' + (end ? ' is-end' : '') + (/Canal|Transship/.test(st.role) ? ' is-ts' : '')).datum({ p: proj(LOC[st.loc].at) });
          g.append('circle').attr('r', end ? 6 : 5);
          const nb = s.stops[i + 1];
          if (nb && d3.geoDistance(LOC[st.loc].at, LOC[nb.loc].at) < 0.03) return; // too close to the next stop: its label speaks for both
          const pos = LABEL_POS[st.loc] || 'r';
          const below = pos === 'b', left = pos === 'l';
          const x = left ? -10 : 10, anchor = left ? 'end' : 'start';
          g.append('text').attr('class', 'mk-label').attr('text-anchor', anchor).attr('x', x).attr('y', below ? 18 : -8).text(LOC[st.loc].city);
          g.append('text').attr('class', 'mk-sub').attr('text-anchor', anchor).attr('x', x).attr('y', below ? 31 : 5).text(st.role.replace('Port of loading', 'POL').replace('Port of discharge', 'POD'));
        });
        shipMarker(s, true);
        return;
      }
      data.list.forEach((s) => shipMarker(s, false));
    }
    function shipMarker(s, focused) {
      const tone = STATUS[s.status].tone;
      const dim = !focused && data.hot && data.hot !== s.id;
      const g = gTop.append('g').attr('class', 'mk mk-ship ' + tone + (dim ? ' is-dim' : '')).datum({ p: currentPos(s), id: s.id });
      g.append('circle').attr('class', 'halo').attr('r', 14);
      g.append('circle').attr('class', 'core').attr('r', focused ? 8 : 7);
      g.append('title').text(s.number);
      if (!focused) {
        g.on('click', () => data.onPick && data.onPick(s.id)).on('mouseenter', () => data.onHover && data.onHover(s.id)).on('mouseleave', () => data.onHover && data.onHover(null));
        if (data.hot === s.id) {
          const w = s.number.length * 7.1 + 18;
          const c = g.append('g').attr('class', 'mk-chip').attr('transform', `translate(${-w / 2},-38)`);
          c.append('rect').attr('width', w).attr('height', 24).attr('rx', 7);
          c.append('text').attr('x', 9).attr('y', 16).text(s.number);
        }
      }
    }
    function placeTop() {
      gTop.selectAll('text.ocean-label').style('display', t.k < 0.75 ? 'none' : null);
      gTop.selectAll(':scope > g, :scope > text').attr('transform', (d) => (d && d.p ? `translate(${t.applyX(d.p[0])},${t.applyY(d.p[1])})` : null));
    }
    function render(next) {
      const prevMode = data.mode;
      data = Object.assign({}, data, next);
      const key = data.mode + ':' + (data.focus ? data.focus.id : data.list.map((s) => s.id).join(','));
      renderRoutes(); renderTop(); placeTop();
      if (key !== focusKey) { const first = focusKey == null; focusKey = key; fitPoints(boundsFor(), null, !first && prevMode !== undefined); }
    }
    const ro = new ResizeObserver(() => { size(); placeTop(); });
    ro.observe(el);
    size();
    return {
      render,
      zoomBy: (f) => svg.transition().duration(300).call(zoom.scaleBy, f),
      fit: () => fitPoints(boundsFor(), null, true),
      destroy: () => { ro.disconnect(); svg.remove(); },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Globe (orthographic, drag to rotate, wheel / buttons to zoom)       */
  /* ------------------------------------------------------------------ */
  function createGlobe(el, opts) {
    const land = topojson.feature(window.WORLD, window.WORLD.objects.countries);
    const borders = topojson.mesh(window.WORLD, window.WORLD.objects.countries, (a, b) => a !== b);
    const proj = d3.geoOrthographic().clipAngle(90).precision(0.4);
    const path = d3.geoPath(proj);
    const svg = d3.select(el).append('svg').attr('class', 'globe').attr('role', 'img').attr('aria-label', 'Globe with shipment routes');
    const uid = 'g' + Math.random().toString(36).slice(2, 7);
    const defs = svg.append('defs');
    const sh = defs.append('radialGradient').attr('id', uid + 'sh').attr('cx', '38%').attr('cy', '32%').attr('r', '75%');
    sh.append('stop').attr('offset', '0%').attr('stop-color', '#ffffff').attr('stop-opacity', 0.0);
    sh.append('stop').attr('offset', '70%').attr('stop-color', '#1b2140').attr('stop-opacity', 0.06);
    sh.append('stop').attr('offset', '100%').attr('stop-color', '#1b2140').attr('stop-opacity', 0.32);
    const glow = defs.append('radialGradient').attr('id', uid + 'gl');
    glow.append('stop').attr('offset', '82%').attr('stop-color', '#414BB3').attr('stop-opacity', 0.16);
    glow.append('stop').attr('offset', '100%').attr('stop-color', '#414BB3').attr('stop-opacity', 0);
    const gHalo = svg.append('circle').attr('class', 'globe-halo').attr('fill', `url(#${uid}gl)`);
    const gSea = svg.append('path').attr('class', 'globe-sea');
    const gGrat = svg.append('path').attr('class', 'grat');
    const gLand = svg.append('path').attr('class', 'land');
    const gBord = svg.append('path').attr('class', 'globe-borders');
    const gRoutes = svg.append('g');
    const gShade = svg.append('path').attr('class', 'globe-shade').attr('fill', `url(#${uid}sh)`).style('pointer-events', 'none');
    const gTop = svg.append('g');
    const grat = d3.geoGraticule().step([20, 20])();
    let vw = 1, vh = 1, rot = [100, -25, 0], k = 1, data = { mode: 'overview', list: [] }, key = null, anim = null;
    const pad = () => Object.assign({ top: 40, right: 40, bottom: 40, left: 40 }, (opts.padding && opts.padding()) || {});
    function dense(points) { const out = []; for (let i = 0; i < points.length - 1; i++) { const f = d3.geoInterpolate(points[i], points[i + 1]); const n = Math.max(2, Math.ceil(d3.geoDistance(points[i], points[i + 1]) / 0.02)); for (let j = 0; j < n; j++) out.push(f(j / n)); } out.push(points[points.length - 1]); return out; }
    const cache = {}; const legPts = (key) => cache[key] || (cache[key] = dense(PATHS[key]));
    const cut = (a, p) => { const i = Math.round((a.length - 1) * p); return [a.slice(0, i + 1), a.slice(i)]; };
    const pos = (s) => { for (const l of s.legs) if (l.p < 1) { const a = legPts(l.path); return a[Math.round((a.length - 1) * l.p)]; } const a = legPts(s.legs[s.legs.length - 1].path); return a[a.length - 1]; };
    const visible = (ll) => d3.geoDistance(ll, [-rot[0], -rot[1]]) < Math.PI / 2 - 0.02;
    function layout() {
      const r = el.getBoundingClientRect(); vw = Math.max(1, r.width); vh = Math.max(1, r.height);
      const p = pad(); const aw = Math.max(80, vw - p.left - p.right), ah = Math.max(80, vh - p.top - p.bottom);
      proj.translate([p.left + aw / 2, p.top + ah / 2]).scale((Math.min(aw, ah) / 2) * 0.92 * k).rotate(rot);
    }
    function draw() {
      layout();
      const [cx, cy] = proj.translate(), R = proj.scale();
      gHalo.attr('cx', cx).attr('cy', cy).attr('r', R * 1.12);
      gSea.attr('d', path({ type: 'Sphere' })); gShade.attr('d', path({ type: 'Sphere' }));
      gGrat.attr('d', path(grat)); gLand.attr('d', path(land)); gBord.attr('d', path(borders));
      gRoutes.selectAll('*').remove(); gTop.selectAll('*').remove();
      const line = (pts, cls) => gRoutes.append('path').attr('class', cls).attr('d', path({ type: 'LineString', coordinates: pts }));
      if (data.mode === 'focus' && data.focus) {
        data.focus.legs.forEach((l) => { const a = legPts(l.path); const [d, t] = cut(a, l.p); const rail = l.mode === 'rail' ? ' route-rail' : ''; if (l.p < 1) line(l.p > 0 ? t : a, 'route-todo' + rail); if (l.p > 0) line(l.p < 1 ? d : a, 'route-done' + rail); });
        data.focus.stops.forEach((st, i) => { const ll = LOC[st.loc].at; if (!visible(ll)) return; const p = proj(ll); const end = i === 0 || i === data.focus.stops.length - 1;
          const g = gTop.append('g').attr('class', 'mk-port' + (end ? ' is-end' : '') + (/Canal|Transship/.test(st.role) ? ' is-ts' : '')).attr('transform', `translate(${p[0]},${p[1]})`); g.append('circle').attr('r', end ? 6 : 5);
          const nb = data.focus.stops[i + 1]; if (nb && d3.geoDistance(ll, LOC[nb.loc].at) < 0.03) return;
          const left = LABEL_POS[st.loc] === 'l'; const below = LABEL_POS[st.loc] === 'b'; const x = left ? -10 : 10;
          g.append('text').attr('class', 'mk-label').attr('text-anchor', left ? 'end' : 'start').attr('x', x).attr('y', below ? 18 : -8).text(LOC[st.loc].city);
          g.append('text').attr('class', 'mk-sub').attr('text-anchor', left ? 'end' : 'start').attr('x', x).attr('y', below ? 31 : 5).text(st.role.replace('Port of loading', 'POL').replace('Port of discharge', 'POD')); });
        ship(data.focus, true);
      } else if (data.mode === 'dots') {
        (data.dots || []).forEach((d) => { if (!visible(d.at)) return; const p = proj(d.at); gTop.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', d.r || 5).attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 1.5); });
      } else {
        data.list.forEach((s) => s.legs.forEach((l) => line(legPts(l.path), 'route-ghost' + (s.id === data.hot ? ' is-hot' : ''))));
        data.list.forEach((s) => ship(s, false));
      }
    }
    function ship(s, focused) {
      const ll = pos(s); if (!visible(ll)) return; const p = proj(ll);
      const dim = !focused && data.hot && data.hot !== s.id;
      const g = gTop.append('g').attr('class', 'mk mk-ship ' + STATUS[s.status].tone + (dim ? ' is-dim' : '')).attr('transform', `translate(${p[0]},${p[1]})`);
      g.append('circle').attr('class', 'halo').attr('r', 14); g.append('circle').attr('class', 'core').attr('r', focused ? 8 : 7); g.append('title').text(s.number);
      if (!focused) { g.on('click', () => data.onPick && data.onPick(s.id)).on('mouseenter', () => data.onHover && data.onHover(s.id)).on('mouseleave', () => data.onHover && data.onHover(null));
        if (data.hot === s.id) { const w = s.number.length * 7.1 + 18; const c = g.append('g').attr('class', 'mk-chip').attr('transform', `translate(${-w / 2},-38)`); c.append('rect').attr('width', w).attr('height', 24).attr('rx', 7); c.append('text').attr('x', 9).attr('y', 16).text(s.number); } }
    }
    function target() {
      let pts;
      if (data.mode === 'focus' && data.focus) pts = data.focus.legs.flatMap((l) => legPts(l.path));
      else if (data.mode === 'dots') pts = data.fitTo || (data.dots || []).map((d) => d.at);
      else pts = data.list.flatMap((s) => s.legs.flatMap((l) => legPts(l.path)));
      if (!pts || !pts.length) return { rot: [100, -25, 0], k: 1 };
      const c = d3.geoCentroid({ type: 'MultiPoint', coordinates: pts });
      const spread = d3.max(pts, (p) => d3.geoDistance(p, c));
      const kk = Math.max(1, Math.min(3.2, 1.25 / Math.max(0.35, Math.sin(Math.min(spread, Math.PI / 2)) + 0.12)));
      return { rot: [-c[0], -Math.max(-55, Math.min(55, c[1])), 0], k: data.mode === 'focus' ? kk : 1 };
    }
    function flyTo(t, animate) {
      if (anim) anim.stop();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!animate || reduce) { rot = t.rot; k = t.k; draw(); return; }
      const r0 = rot.slice(), k0 = k; let dl = ((t.rot[0] - r0[0] + 540) % 360) - 180;
      const ir = d3.interpolate([r0[0], r0[1]], [r0[0] + dl, t.rot[1]]), ik = d3.interpolate(k0, t.k);
      anim = d3.timer((el2) => { const u = Math.min(1, el2 / 1100); const e = d3.easeCubicInOut(u); const r = ir(e); rot = [r[0], r[1], 0]; k = ik(e); draw(); if (u >= 1) anim.stop(); });
    }
    if (opts.interactive !== false) {
      svg.call(d3.drag().on('start', () => { if (anim) anim.stop(); }).on('drag', (ev) => { const f = 70 / proj.scale(); rot = [rot[0] + ev.dx * f * 1.6, Math.max(-80, Math.min(80, rot[1] - ev.dy * f * 1.6)), 0]; draw(); }));
      svg.on('wheel', (ev) => { ev.preventDefault(); k = Math.max(0.7, Math.min(6, k * (ev.deltaY < 0 ? 1.12 : 1 / 1.12))); draw(); }, { passive: false });
    } else svg.style('cursor', 'default');
    function render(next) { const first = key == null; data = Object.assign({}, data, next); const nk = data.mode + ':' + (data.focus ? data.focus.id : (data.list || []).map((s) => s.id).join(',')); if (nk !== key) { key = nk; flyTo(target(), !first); } else draw(); }
    const ro = new ResizeObserver(() => draw()); ro.observe(el);
    return { render, zoomBy: (f) => { k = Math.max(0.7, Math.min(6, k * f)); draw(); }, fit: () => flyTo(target(), true), destroy: () => { if (anim) anim.stop(); ro.disconnect(); svg.remove(); } };
  }

  function MapView({ mode = 'overview', list = [], focus = null, hot = null, onPick, onHover, padding, controls = true, interactive = true, center, dots, fitTo, maxFit, refitKey, view = 'flat', onView }) {
    const ref = useRef(); const ctl = useRef(); const cb = useRef({});
    cb.current = { onPick, onHover, padding };
    useEffect(() => {
      const make = view === 'globe' ? createGlobe : createMap;
      ctl.current = make(ref.current, { interactive, center, maxFit, padding: () => (cb.current.padding ? cb.current.padding() : null) });
      ctl.current.render({ mode, list, focus, hot, dots, fitTo, onPick: (id) => cb.current.onPick && cb.current.onPick(id), onHover: (id) => cb.current.onHover && cb.current.onHover(id) });
      return () => ctl.current.destroy();
    }, [view]);
    useEffect(() => {
      ctl.current.render({ mode, list, focus, hot, dots, fitTo, onPick: (id) => cb.current.onPick && cb.current.onPick(id), onHover: (id) => cb.current.onHover && cb.current.onHover(id) });
    }, [mode, list, focus, hot, dots]);
    useEffect(() => { if (refitKey) ctl.current.fit(); }, [refitKey]);
    return html`<div className=${'map-root' + (view === 'globe' ? ' is-globe' : '')} ref=${ref}>
      ${onView && html`<div className="map-view-switch" role="group" aria-label="Map view"><${A.Segmented} value=${view} onChange=${onView} options=${[{ value: 'globe', label: 'Globe', icon: ic('GlobalOutlined') }, { value: 'flat', label: 'Map', icon: ic('BorderOutlined') }]} /></div>`}
      ${controls && html`<div className="map-ctrl">
        <div className="grp"><${A.Tooltip} title="Fit route" placement="left"><button className="fit-only" aria-label="Fit route on map" onClick=${() => ctl.current.fit()}>${ic('AimOutlined')}</button><//></div>
        <div className="grp">
          <button aria-label="Zoom in" onClick=${() => ctl.current.zoomBy(1.6)}>${ic('PlusOutlined')}</button>
          <button aria-label="Zoom out" onClick=${() => ctl.current.zoomBy(1 / 1.6)}>${ic('MinusOutlined')}</button>
        </div>
      </div>`}
    </div>`;
  }

  /* Progress lane: origin ● ━━━ 🚢 ┄┄┄ ○ destination */
  function LaneBar({ s }) {
    const sm = summarize(s);
    const pct = Math.round(sm.progress * 100);
    const Mode = sm.progress >= 1 && s.status === 'delivered' ? null : ShipIcon;
    return html`<div className=${'lane-bar ' + sm.st.tone} aria-label=${`Sea leg ${pct}% complete`}>
      <div className="track"></div>
      <div className="fill" style=${{ width: `calc((100% - 8px) * ${sm.progress})` }}></div>
      <span className="end l"></span>
      ${sm.ts.map((x) => html`<span key=${x.name} className="ts" style=${{ left: `calc(4px + (100% - 8px) * ${x.at})` }} title=${x.name}></span>`)}
      <span className=${'end r' + (sm.progress >= 1 ? ' done' : '')}></span>
      <span className="ship" style=${{ left: `calc(4px + (100% - 8px) * ${Math.min(1, Math.max(0, sm.progress))})` }}>${Mode ? html`<${Mode} />` : ic('CheckOutlined')}</span>
    </div>`;
  }

  function StatusTag({ s, withDelay = true }) {
    const sm = summarize(s);
    return html`<span style=${{ display: 'inline-flex', gap: 4 }}>
      <${A.Tag} color=${sm.st.color} bordered=${false} style=${{ marginInlineEnd: 0, fontWeight: 500 }}>${sm.st.label}<//>
    </span>`;
  }

  window.SP = {
    C, html, A, I, ic, AppShell, Header, Footer, SearchBox, DetectLine, MapView, LaneBar, StatusTag, CarrierBadge,
    ShipIcon, TruckIcon, RailIcon, ContainerIcon, DocIcon, MODE_ICON,
    CARRIERS, SHIPMENTS, BY_NUMBER, EXAMPLES, LOC, NOW, LIMIT, store, useStore, useResetCountdown,
    detect, norm, fmtNum, fmtDate, fmtShort, fmtTime, isPast, ago, place, summarize, daysBetween, STATUS,
  };
})();
