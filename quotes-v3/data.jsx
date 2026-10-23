/* =====================================================================
   Quote Shipment v3 — shared globals, reference data and quote model
   ===================================================================== */
const { useState, useEffect, useMemo, useRef } = React;
const {
  ConfigProvider, App: AntApp, Button, Select, Segmented, DatePicker, Tabs, Popover, InputNumber, Drawer, Modal, Form, Input, Checkbox,
  Result, Skeleton, Tooltip, Empty, Progress, Collapse, Slider, Alert, Steps, Radio, Dropdown, Space, Avatar, Divider, Switch, AutoComplete, Breadcrumb, Badge, Card: AntCard, Table, Tag, Flex, Typography,
} = antd;
const I = icons;

const NOW = dayjs('2026-10-21T10:00');
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const hashStr = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const seeded = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const usd = (n, cents) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
const dd = (d) => d.format('D MMM');
const ddt = (d) => d.format('D MMM, HH:mm');
const store = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

/* ---------- reference data ---------- */
const PLACES = [
  { key: 'USOAK', label: 'Oakland, CA, 23001', short: 'Oakland', cc: 'US' },
  { key: 'USLAX', label: 'Los Angeles, CA, US', short: 'Los Angeles', cc: 'US' },
  { key: 'USNYC', label: 'New York, NY, US', short: 'New York', cc: 'US' },
  { key: 'USHOU', label: 'Houston, TX, US', short: 'Houston', cc: 'US' },
  { key: 'USSAV', label: 'Savannah, GA, US', short: 'Savannah', cc: 'US' },
  { key: 'CNSHA', label: 'Shanghai, CN', short: 'Shanghai', cc: 'CN' },
  { key: 'PLGDN', label: 'Gdansk, PL', short: 'Gdansk', cc: 'PL' },
  { key: 'PLGDY', label: 'Gdynia, PL', short: 'Gdynia', cc: 'PL' },
  { key: 'DEHAM', label: 'Hamburg, DE', short: 'Hamburg', cc: 'DE' },
  { key: 'DEBRV', label: 'Bremerhaven, DE', short: 'Bremerhaven', cc: 'DE' },
  { key: 'NLRTM', label: 'Rotterdam, NL', short: 'Rotterdam', cc: 'NL' },
  { key: 'BEANR', label: 'Antwerp, BE', short: 'Antwerp', cc: 'BE' },
  { key: 'LTKLJ', label: 'Klaipeda, LT', short: 'Klaipeda', cc: 'LT' },
  { key: 'SESTO', label: 'Stockholm, SE', short: 'Stockholm', cc: 'SE' },
  { key: 'GBLON', label: 'London, GB', short: 'London', cc: 'GB' },
  { key: 'VNNHA', label: 'Nha Trang, VN', short: 'Nha Trang', cc: 'VN' },
  { key: 'USCMH', label: 'Columbus, OH', short: 'Columbus', cc: 'US' },
  { key: 'USCVG', label: 'Cincinnati, OH', short: 'Cincinnati', cc: 'US' },
  { key: 'USCLE', label: 'Cleveland, OH', short: 'Cleveland', cc: 'US' },
  { key: 'USORF', label: 'Norfolk, VA', short: 'Norfolk', cc: 'US' },
];
const PLACE = Object.fromEntries(PLACES.map((p) => [p.key, p]));
const placeOptions = PLACES.map((p) => ({ value: p.key, label: p.label }));

const CARRIERS = {
  HLCU: { name: 'Hapag Lloyd', logo: 'assets/logo-hapag.svg' },
  MAEU: { name: 'Maersk', logo: 'assets/logo-maersk.svg' },
  CMDU: { name: 'CMA CGM', text: 'CMA', color: '#0b2d71' },
  OOLU: { name: 'OOCL', logo: 'assets/logo-oocl.svg' },
  ONEY: { name: 'ONE', logo: 'assets/logo-one.svg' },
  MSCU: { name: 'MSC', text: 'MSC', color: '#1d1d1b' },
};
const MODES = [
  { value: 'FCL', label: 'FCL', icon: <I.ContainerOutlined /> },
  { value: 'LCL', label: 'LCL', icon: <I.CodeSandboxOutlined /> },
  { value: 'AIR', label: 'Air', icon: <I.RocketOutlined /> },
  { value: 'FTL', label: 'FTL', icon: <I.CarOutlined /> },
];
const BOX_TYPES = ["20' ST", "40' ST", "40' HC", "45' HC", "20' RF", "40' RF"];
const COMMODITIES = ['Bumpers', 'FAK', 'General cargo', 'Auto parts', 'Furniture', 'Electronics'];
const INCLUDED = [
  { key: 'pickup', label: 'Inland pickup', cost: 450 },
  { key: 'origin', label: 'Origin handling', cost: 320 },
  { key: 'freight', label: 'Freight transportation', cost: 0 },
  { key: 'destination', label: 'Destination handling', cost: 380 },
];
const SORTS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price', label: 'Lowest price' },
  { key: 'transit', label: 'Fastest transit time' },
  { key: 'etd', label: 'Earliest departure' },
];
/* nearby ports offered for alternative routes: [place, km, side] */
const NEARBY = [
  ['USNYC', 245, 'pickup'], ['USLAX', 310, 'pickup'], ['USHOU', 380, 'pickup'],
  ['SESTO', 420, 'delivery'], ['LTKLJ', 190, 'delivery'], ['DEHAM', 665, 'delivery'],
];
const NEARBY_SHORT = ['DEBRV', 'BEANR', 'DEHAM', 'GBLON'];

/* ---------- query ---------- */
const DEFAULT_Q = {
  mode: 'FCL', from: 'USCMH', fromDate: '2026-10-19', to: 'DEHAM', toDate: '2026-10-29',
  boxes: [{ type: "40' ST", qty: 1 }], commodity: 'FAK',
};
const cargoText = (q) => q.boxes.map((b) => `${b.type.replace("'", '`')} × ${b.qty}`).join(', ') + ' | ' + q.commodity;
const placeShort = (k) => PLACE[k]?.short || k;

/* ---------- quotes ---------- */
const WINDOWS = [['19 Oct–1 Nov', 0], ['2–15 Nov', 14], ['16–29 Nov', 28]];

/* the reference search (Columbus ramps → Hamburg, 40' ST × 1, FAK): 27 quotes, prices $1,647–$3,459, 33–57 days */
const REF_KNOWN = [
  { carrier: 'OOLU', kind: 'public', to: 'DEHAM', etd: '2026-10-25', eta: '2026-12-16', bookBy: '2026-10-31', total: 2097, schedules: 2, rank: 1 },
  { carrier: 'HLCU', kind: 'public', to: 'DEHAM', etd: '2026-10-23', eta: '2026-11-25', bookBy: '2026-11-21', total: 2113.5, schedules: 4, rank: 2 },
  { carrier: 'OOLU', kind: 'public', to: 'DEBRV', alt: true, etd: '2026-10-25', eta: '2026-12-17', bookBy: '2026-10-31', total: 1647, schedules: 2, rank: 3 },
  { carrier: 'MAEU', kind: 'spot', to: 'DEHAM', etd: '2026-10-24', eta: '2026-12-08', bookBy: '2026-10-24', total: 2558.4, schedules: 3, rank: 4 },
  { carrier: 'CMDU', kind: 'spot', to: 'DEHAM', etd: '2026-10-28', eta: '2026-12-19', bookBy: '2026-10-24', total: 3291, schedules: 2, rank: 5 },
];
function refQuotes(q, win, extraPorts) {
  const rnd = seeded(hashStr('ref' + win));
  const shift = WINDOWS[win][1];
  const carriers = ['OOLU', 'CMDU', 'HLCU', 'MAEU'];
  const origins = ['USCMH', 'USCMH', 'USCVG', 'USCLE'];
  const rows = [...REF_KNOWN];
  for (let i = rows.length; i < 27; i++) {
    const etd = dayjs('2026-10-22').add(Math.floor(rnd() * 9), 'day');
    rows.push({ carrier: carriers[i % 4], kind: rnd() > 0.6 ? 'spot' : 'public', to: rnd() > 0.8 ? 'DEBRV' : 'DEHAM', from: origins[i % 4],
      etd: etd.format('YYYY-MM-DD'), eta: etd.add(33 + Math.floor(rnd() * 25), 'day').format('YYYY-MM-DD'), bookBy: etd.add(4 + Math.floor(rnd() * 20), 'day').format('YYYY-MM-DD'),
      total: i === 26 ? 3459 : Math.round((1700 + rnd() * 1700) * 10) / 10, schedules: 1 + Math.floor(rnd() * 4), noSchedule: rnd() > 0.88, rank: 10 + i });
  }
  rows.forEach((r) => { if (r.to === 'DEBRV') r.alt = true; });
  extraPorts.forEach((p, j) => rows.push({ ...rows[2], to: p, alt: true, total: Math.round(rows[2].total * (0.92 + j * 0.03)), rank: 30 + j, altPort: p }));
  const vessels = { OOLU: 'OOCL Germany', CMDU: 'CMA CGM Jefferson', HLCU: 'Berlin Express', MAEU: 'Maersk Sentosa' };
  return rows.map((r, i) => {
    const etd = dayjs(r.etd + 'T11:00').add(shift, 'day'), eta = dayjs(r.eta + 'T19:00').add(shift, 'day');
    const total = r.total + (win ? 60 : 0);
    return {
      id: 'ref' + win + '-' + i, carrier: r.carrier, voyage: `CHIM${330 + i}N${20 + (i % 9)}`, kind: r.kind, alt: !!r.alt, altPort: r.altPort,
      bookBy: dayjs(r.bookBy).add(shift, 'day'), from: r.from || 'USCMH', to: r.to, via: ['Norfolk, US'], days: eta.diff(etd, 'day'), etd, eta,
      per20: 0, per40: Math.round(total * 0.8), fees: 0, fixedTotal: total, rank: r.rank,
      hasSchedules: !r.noSchedule, schedules: r.schedules, vessel: vessels[r.carrier], voyNo: `${700100 + i * 37}GH`,
    };
  });
}

function makeQuotes(q, win = 0, extraPorts = []) {
  if (q.from === 'USCMH' && q.to === 'DEHAM') return refQuotes(q, win, extraPorts);
  const rnd = seeded(hashStr(q.from + q.to + q.mode + win + q.boxes.map((b) => b.type + b.qty).join()));
  const keys = Object.keys(CARRIERS);
  const base = dayjs('2027-01-26T09:00').add(WINDOWS[win][1], 'day');
  const mk = (i, altPort) => {
    const carrier = i === 0 ? 'HLCU' : i === 1 ? 'MAEU' : i === 2 ? 'CMDU' : keys[Math.floor(rnd() * keys.length)];
    const via = rnd() > 0.35 ? (rnd() > 0.5 ? ['New York', 'Rotterdam'] : ['Rotterdam']) : [];
    const days = Math.round(11 + rnd() * 9) + via.length;
    const etd = base.add(Math.floor(rnd() * 5), 'day');
    const per20 = Math.round((180 + rnd() * 260) / 10) * 10;
    const per40 = Math.round(per20 * (1.6 + rnd() * 0.3) / 10) * 10;
    return {
      id: (altPort ? 'a-' + altPort : 'q') + i, carrier, voyage: `CHIM${330 + Math.floor(rnd() * 20)}N${20 + Math.floor(rnd() * 9)}`,
      kind: rnd() > 0.45 ? 'spot' : 'public', alt: !!altPort || rnd() > 0.7, altPort,
      bookBy: NOW.add(-5 + Math.floor(rnd() * 8), 'day'), from: q.from, to: altPort || q.to, via, days, etd, eta: etd.add(days, 'day'),
      per20: Math.round(per20 * (altPort ? 0.86 : 1)), per40: Math.round(per40 * (altPort ? 0.86 : 1)),
      fees: rnd() > 0.5 ? 100 : 0, hasSchedules: rnd() > 0.18, schedules: 1 + Math.floor(rnd() * 3),
      vessel: ['Victorya', 'Berlin Express', 'Maersk Sentosa', 'CMA CGM Jefferson'][Math.floor(rnd() * 4)], voyNo: `${700000 + Math.floor(rnd() * 99999)}GH`,
    };
  };
  const list = range(9, (i) => mk(i));
  extraPorts.forEach((p, j) => list.push(mk(20 + j, p)));
  return list;
}

/* charges table rows: [section, per20, per40, fees] */
function charges(o, q, incl) {
  const n20 = q.boxes.filter((b) => b.type.startsWith('20')).reduce((s, b) => s + b.qty, 0);
  const n40 = q.boxes.filter((b) => !b.type.startsWith('20')).reduce((s, b) => s + b.qty, 0);
  const rows = [];
  if (incl.includes('pickup')) rows.push(['Inland pickup', 0, 0, 450]);
  if (incl.includes('origin')) rows.push(['Origin', Math.round(o.per20 * 0.25), Math.round(o.per40 * 0.25), o.fees]);
  rows.push(['Freight', o.per20, o.per40, 0]);
  if (incl.includes('destination')) rows.push(['Destination', Math.round(o.per20 * 0.22), Math.round(o.per40 * 0.22), 0]);
  if (incl.includes('delivery')) rows.push(['Door delivery', 0, 0, 520]);
  const out = rows.map(([name, p20, p40, fee]) => ({ name, p20, p40, fee, n20, n40, total: p20 * n20 + p40 * n40 + fee }));
  /* fixed reference quotes: freight absorbs the difference so the breakdown always adds up to the quoted price */
  if (o.fixedTotal != null) {
    const fr = out.find((r) => r.name === 'Freight'); const rest = out.reduce((t, r) => t + (r === fr ? 0 : r.total), 0);
    const units = Math.max(1, n20 + n40); fr.total = Math.round((o.fixedTotal - rest) * 10) / 10;
    if (n40) { fr.p40 = Math.round(((fr.total - fr.p20 * n20) / n40) * 10) / 10; } else { fr.p20 = Math.round((fr.total / units) * 10) / 10; }
  }
  return out;
}
const quoteTotal = (o, q, incl) => charges(o, q, incl).reduce((s, r) => s + r.total, 0);

/* door ends of a search (null when the end is a port) */
const doorOf = (q, side) => { const e = q?.form?.[side]; return e && e.kind === 'door' && e.address ? e : null; };
const doorLine = (e) => [e.address, e.city, e.zip].filter(Boolean).join(', ');
const routeKind = (q) => `${doorOf(q, 'origin') ? 'Door' : 'Port'} to ${doorOf(q, 'dest') ? 'door' : 'port'}`;
/* included services follow the route: door ends add pickup / delivery and terminal handling */
const inclFor = (q) => ['freight', ...(doorOf(q, 'origin') ? ['pickup', 'origin'] : []), ...(doorOf(q, 'dest') ? ['destination', 'delivery'] : [])];

/* schedule legs for the Schedules tab */
/* reference quotes: door → truck → Columbus rail ramp → rail → Norfolk → vessel → Bremerhaven (T/S) → vessel → Hamburg.
   Key points keep the proportions of the reference sailing (25 Oct 11:00 → 16 Dec 19:00). */
const spanTxt = (a, b) => { const h = Math.round(b.diff(a, 'hour')); const d = Math.floor(h / 24), r = h % 24; return `${d} Day(s)${r ? ` ${r} Hour(s)` : ''}`; };
function refTimeline(o, k) {
  const etd = o.etd.add(k * 7, 'day'), eta = o.eta.add(k * 7, 'day');
  const T = eta.diff(etd, 'hour');
  const at = (f) => etd.add(Math.round(T * f), 'hour').minute(0);
  const railEtd = at(120 / 1256), norfolk = at(339 / 1256), brvEta = at(939 / 1256), brvEtd = at(1187 / 1256);
  return { etd, eta, railEtd, norfolk, brvEta, brvEtd, isRef: T === 1256 };
}
const fmtT = (d) => d.format('D MMM, HH:mm');
function refLegs(o, k) {
  const t = refTimeline(o, k);
  const pickup = `${dd(t.etd)} — ${dd(t.etd.add(3, 'day'))}`, drop = `${dd(t.etd.add(4, 'day'))} — ${dd(t.railEtd)}`;
  return [
    { type: 'port', t: '1619 EAST LIVINGSTON AVENUE, COLUMBUS, 43205', kv: [['Pickup', pickup]], note: 'Pickup date range' },
    { type: 'truck', t: 'Truck', kv: [['Transit time', '1 Day(s)']], note: 'Columbus, US → Columbus, US' },
    { type: 'port', t: 'COLUMBUS, US', kv: [['Drop', drop], ['ETD', fmtT(t.railEtd)]], note: 'Rail ramp' },
    { type: 'rail', t: 'Rail', kv: [['Transit time', t.isRef ? '9 Day(s) 4 Hour(s)' : spanTxt(t.railEtd, t.norfolk)]], note: 'Columbus, US → Norfolk, US' },
    { type: 'port', t: 'NORFOLK, US', kv: [['ETA', fmtT(t.norfolk)], ['ETD', fmtT(t.norfolk)]] },
    { type: 'vessel', t: o.vessel.toUpperCase(), kv: [['Transit time', t.isRef ? '24 Day(s) 18 Hour(s)' : spanTxt(t.norfolk, t.brvEta)]], note: 'Norfolk, US → Bremerhaven, DE' },
    { type: 'port', t: 'BREMERHAVEN, DE', kv: [['ETA', fmtT(t.brvEta)], ['ETD', fmtT(t.brvEtd)]], note: 'Transshipment' },
    { type: 'vessel', t: o.vessel.toUpperCase(), kv: [['Transit time', spanTxt(t.brvEtd, t.eta)]], note: `Bremerhaven, DE → ${PLACE[o.to]?.short}, DE` },
    { type: 'port', t: PLACE[o.to]?.label.toUpperCase(), kv: [['ETA', fmtT(t.eta)]] },
  ];
}

function legs(o, k, q) {
  if (o.fixedTotal != null) return refLegs(o, k);
  const etd = o.etd.add(k, 'day'), eta = o.eta.add(k, 'day');
  const f = (d) => d.format('DD MMM YYYY');
  const from = doorOf(q, 'origin'), to = doorOf(q, 'dest');
  const steps = [];
  if (from) {
    steps.push({ type: 'port', t: doorLine(from).toUpperCase(), kv: [['Pickup', `${dd(etd.subtract(4, 'day'))} — ${dd(etd.subtract(3, 'day'))}`]], note: 'Shipper’s warehouse' });
    steps.push({ type: 'truck', t: 'Truck', kv: [['Transit time', '1 Day']], note: `${from.city.split(',')[0]} → ${placeShort(o.from)} terminal` });
  }
  steps.push({ type: 'port', t: PLACE[o.from]?.label.toUpperCase(), kv: [...(from ? [['Gate in', f(etd.subtract(2, 'day'))]] : []), ['ETD', f(etd)]] });
  const legDays = Math.round(o.days / (o.via.length + 1));
  o.via.forEach((v, i) => {
    steps.push({ type: 'vessel', t: o.vessel.toUpperCase(), kv: [['Transit time', `${legDays} Days`]], note: `Voyage ${o.voyNo} · ${o.voyage}` });
    const at = etd.add(legDays * (i + 1), 'day');
    steps.push({ type: 'port', t: `${v.toUpperCase()}`, kv: [['ETA', f(at)], ['ETD', f(at.add(1, 'day'))]], note: 'Transshipment' });
  });
  steps.push({ type: 'vessel', t: o.vessel.toUpperCase(), kv: [['Transit time', `${o.days - legDays * o.via.length} Days`]], note: `Voyage ${o.voyNo} · ${o.voyage}` });
  steps.push({ type: 'port', t: PLACE[o.to]?.label.toUpperCase(), kv: [['ETA', f(eta)], ...(to ? [['Release', f(eta.add(2, 'day'))]] : [])] });
  if (to) {
    steps.push({ type: 'truck', t: 'Truck', kv: [['Transit time', '1 Day']], note: `${placeShort(o.to)} terminal → ${to.city.split(',')[0]}` });
    steps.push({ type: 'port', t: doorLine(to).toUpperCase(), kv: [['Delivery', `${dd(eta.add(3, 'day'))} — ${dd(eta.add(4, 'day'))}`]], note: 'Consignee’s warehouse' });
  }
  return steps;
}

/* ---------- small shared parts ---------- */
const Logo = ({ c }) => {
  const k = CARRIERS[c];
  return <div className="logo">{k.logo ? <img src={k.logo} alt={k.name} /> : <span style={{ color: k.color }}>{k.text}</span>}</div>;
};
const Lane = ({ label, rings = 0 }) => (
  <div className="lane">
    <i style={{ left: 4 }} />
    {range(rings, (j) => <i key={j} className="ring" style={{ left: rings === 1 ? '28%' : `${22 + j * 56 / (rings - 1)}%` }} />)}
    {label && <span className="mid">{label}</span>}
    <i style={{ right: 4 }} />
  </div>
);
const KV = ({ k, children }) => <div className="kv"><span className="k">{k}</span><span>{children}</span></div>;
