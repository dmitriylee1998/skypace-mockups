/* =====================================================================
   New quote request: search bar with guided panels + start lists
   Origin → Destination → Cargo | Container | Services → Payment details
   ===================================================================== */

/* ---------- reference data ---------- */
const ORG_COUNTRY = 'US';
const COUNTRIES = [['US', 'USA'], ['PL', 'Poland'], ['DE', 'Germany'], ['NL', 'Netherlands'], ['CN', 'China'], ['VN', 'Vietnam'], ['GB', 'United Kingdom'], ['SE', 'Sweden'], ['LT', 'Lithuania'], ['BE', 'Belgium'], ['AU', 'Australia']];
const COUNTRY = Object.fromEntries(COUNTRIES);
const SUPPORTED = 'Belgium, Canada, China, United Kingdom, Hong Kong, Japan, South Korea, Germany, Spain, France, Indonesia, India, Italy, Malaysia, Netherlands, Philippines, Pakistan, Poland, Singapore, Thailand, Taiwan, United States, Vietnam';
/* ports / ramps that can be searched; `ok: false` = not supported yet */
const PORTS = [
  ...PLACES.map((p) => ({ key: p.key, label: `${p.label.replace(', 23001', '')} (${p.key})`, cc: p.cc, ok: true })),
  { key: 'USIND', label: 'Indianapolis (Indiana), United States (USIND)', cc: 'US', ok: true },
  { key: 'ITBDS', label: 'Brindisi, Italy (ITBDS)', cc: 'IT', ok: true },
  { key: 'AUMEL', label: 'Melbourne, Australia (AUMEL)', cc: 'AU', ok: false },
  { key: 'BRSSZ', label: 'Santos, Brazil (BRSSZ)', cc: 'BR', ok: false },
];
const PORT_BY = Object.fromEntries(PORTS.map((p) => [p.key, p]));
const NEAREST_PORT = { US: 'USCMH', PL: 'PLGDN', DE: 'DEHAM', NL: 'NLRTM', CN: 'CNSHA', VN: 'VNNHA', GB: 'GBLON', SE: 'SESTO', LT: 'LTKLJ', BE: 'BEANR' };
const ADDRESSES = [
  { a: '13th Street, 23B', city: 'Oakland, CA', zip: '94607', cc: 'US', full: true },
  { a: '701 New Dock Street Berth 212-215', city: 'Terminal Island, CA', zip: '90731', cc: 'US', full: true },
  { a: 'ul. Kontenerowa 7', city: 'Gdansk', zip: '80-601', cc: 'PL', full: true },
  { a: '13th Street', city: '', zip: '', cc: 'US', full: false },
];

/* HS code browser: sections → chapters → headings → subheadings */
const HS = [
  { code: 'FAK', label: 'Freight All Kinds (FAK)' },
  { code: '01–05', label: 'Animal & Animal Products', children: [
    { code: '01', label: 'Live animals' }, { code: '02', label: 'Meat and edible meat offal' }, { code: '03', label: 'Fish and crustaceans, molluscs' },
    { code: '04', label: 'Dairy produce; birds’ eggs; natural honey' }, { code: '05', label: 'Products of animal origin, not elsewhere specified' }] },
  { code: '06–14', label: 'Vegetable Products', children: [
    { code: '06', label: 'Trees and other plants, live, bulbs, roots and the like, cut flowers and ornamental foliage', children: [
      { code: '0601', label: 'Bulbs, tubers, tuberous roots, corms, crowns and rhizomes, dormant, in growth or in flower, chicory plants and roots other than roots of heading no. 1212', children: [
        { code: '060110', label: 'Plants, live, bulbs, tubers, tuberous roots, corms, crowns and rhizomes, dormant' },
        { code: '060120', label: 'Plants, live, bulbs, tubers, tuberous roots, corms, crowns and rhizomes, in growth or in flower, chicory plants and roots other than of heading no. 1212', excluded: true }] },
      { code: '0602', label: 'Plants, live n.e.c. in heading no. 0601, (including their roots) cuttings and slips, mushroom spawn' },
      { code: '0603', label: 'Flowers, cut flowers and flower buds of a kind suitable for bouquets or for ornamental purposes, fresh, dried, dyed, bleached, impregnated or otherwise prepared' },
      { code: '0604', label: 'Foliage, branches and other parts of plants, without flowers or flower buds, and grasses, mosses and lichens' }] },
    { code: '07', label: 'Vegetables and certain roots and tubers, edible' }, { code: '08', label: 'Fruit and nuts, edible, peel of citrus fruit or melons' },
    { code: '09', label: 'Coffee, tea, mate and spices' }, { code: '10', label: 'Cereals' }, { code: '11', label: 'Products of the milling industry, malt, starches, inulin, wheat gluten' }] },
  { code: '15–15', label: 'Animal and Vegetable Fats and Oils', children: [{ code: '15', label: 'Animal, vegetable or microbial fats and oils and their cleavage products; prepared edible fats' }] },
  { code: '16–24', label: 'Foodstuffs, Beverages and Tobacco', children: [
    { code: '21', label: 'Miscellaneous edible preparations', children: [
      { code: '210120', label: 'Extracts, essences and concentrates, of tea or maté' }, { code: '210122', label: 'Extracts of tea, preparations with a basis of extracts' }] },
    { code: '22', label: 'Beverages, spirits and vinegar' }, { code: '24', label: 'Tobacco and manufactured tobacco substitutes', excluded: true }] },
  { code: '25–27', label: 'Mineral Products', children: [{ code: '25', label: 'Salt; sulphur; earths and stone' }, { code: '27', label: 'Mineral fuels, mineral oils', excluded: true }] },
  { code: '28–38', label: 'Chemicals & Allied Industries', children: [{ code: '30', label: 'Pharmaceutical products' }, { code: '33', label: 'Essential oils, perfumery, cosmetic preparations' }] },
  { code: '39–40', label: 'Plastics / Rubbers', children: [{ code: '39', label: 'Plastics and articles thereof' }, { code: '40', label: 'Rubber and articles thereof' }] },
  { code: '50–63', label: 'Textiles', children: [{ code: '52', label: 'Cotton, incl. silk yarn' }, { code: '61', label: 'Apparel, knitted or crocheted' }] },
  { code: '84–85', label: 'Machinery / Electrical', children: [
    { code: '8470', label: 'Calculating machines and pocket-size data recording, reproducing and displaying machines with calculating functions' },
    { code: '8708', label: 'Parts and accessories of motor vehicles (bumpers)' }, { code: '85', label: 'Electrical machinery and equipment' }] },
];
const HS_FLAT = (() => { const out = []; const walk = (list, path) => list.forEach((n) => { out.push({ ...n, path }); n.children && walk(n.children, [...path, n]); }); walk(HS, []); return out; })();

const CUSTOMS = [
  { key: 'exp', label: 'Export Custom Clearance (AES)', price: 150 }, { key: 'ft', label: 'Free Time', price: 180 },
  { key: 'isf', label: 'ISF Filling', price: 35 },
];
const TERMS_OPTS = [
  { value: '30', label: '30 Days (Net) / Financial rate 0%' }, { value: '15', label: '15 Days (Net) / Financial rate 2%' },
  { value: '45', label: '45 Days (Net) / Financial rate +5%' }, { value: '60', label: '60 Days (Net) / Financial rate +7%', disabled: true, note: 'Available after a credit check' },
];
const CUSTOMERS_LIST = ['The Boring Company', 'Tesla Inc', 'Maxton Shipping', 'Blue Ocean Ltd'];
const REEFERS = ["20' Reefer Standard", "40' Reefer Standard", "40' Reefer High Cube"];
const DRY = ["20' ST", "40' ST", "40' HC", "45' HC"];

/* ---------- form model ---------- */
const emptyEnd = (cc) => ({ kind: 'door', cc, address: '', city: '', zip: '', partial: false, port: null, date: null });
const EMPTY_FORM = {
  origin: emptyEnd('US'), dest: emptyEnd('PL'),
  cargo: { lines: [{ hs: null, value: null }], temp: false, tempRange: [2, 8], genset: false, boxes: [{ type: null, qty: 1, weight: null }], customs: [] },
  pay: { customer: 'The Boring Company', flow: null, payer: 'me', terms: '30' },
};
const SAMPLE_FORM = {
  origin: { kind: 'door', cc: 'US', address: 'New York FASHIONS, East Liverpool', city: 'East Liverpool, OH', zip: '43920', partial: false, port: 'USCMH', date: '2026-10-19' },
  dest: { kind: 'port', cc: 'DE', address: '', city: '', zip: '', partial: false, port: 'DEHAM', date: '2026-10-29' },
  cargo: { lines: [{ hs: 'FAK', value: null }], temp: false, tempRange: [2, 8], genset: false, boxes: [{ type: "40' ST", qty: 1, weight: 18000 }], customs: [] },
  pay: { customer: 'The Boring Company', flow: 'export', payer: 'me', terms: '30' },
};
const SAMPLE_D2D = {
  ...SAMPLE_FORM,
  origin: { kind: 'door', cc: 'US', address: '13th Street, 23B', city: 'Oakland, CA', zip: '94607', partial: false, port: 'USOAK', date: '2026-10-16' },
  dest: { kind: 'door', cc: 'PL', address: 'ul. Kontenerowa 7', city: 'Gdansk', zip: '80-601', partial: false, port: 'PLGDN', date: '2026-11-20' },
  cargo: { ...SAMPLE_FORM.cargo, customs: ['exp', 'ft'] },
};
const endPort = (e) => e.port || NEAREST_PORT[e.cc];
const endText = (e) => {
  if (e.kind === 'door') return e.address || '';
  const where = e.port && (PLACE[e.port]?.short || PORT_BY[e.port]?.label.split(/[,(]/)[0].trim());
  return where ? `${where}${e.date ? ' | ' + dayjs(e.date).format('D MMM') : ''}` : '';
};
const hsLabel = (code) => HS_FLAT.find((n) => n.code === code)?.label;
const cargoSummary = (c) => {
  const boxes = c.boxes.filter((b) => b.type).map((b) => `${b.type.replace("'", '`')} × ${b.qty}`).join(', ');
  const goods = c.lines.filter((l) => l.hs).map((l) => (l.hs === 'FAK' ? 'FAK' : hsLabel(l.hs).split(/[,;(]/)[0])).join(', ');
  return [boxes, goods].filter(Boolean).join(' | ');
};
const payFlowFor = (f) => {
  const canExport = f.dest.cc !== ORG_COUNTRY, canImport = f.origin.cc !== ORG_COUNTRY;
  return { canExport, canImport, auto: canExport && !canImport ? 'export' : canImport && !canExport ? 'import' : null };
};
const paySummary = (p) => (p.flow ? `${p.flow === 'export' ? 'Export' : 'Import'} | ${TERMS_OPTS.find((t) => t.value === p.terms).label.split(' /')[0]}` : '');
const missing = (f) => {
  const m = [];
  if (!(f.origin.kind === 'door' ? f.origin.address && (!f.origin.partial || (f.origin.city && f.origin.zip)) : f.origin.port) || !f.origin.date) m.push('origin');
  if (!(f.dest.kind === 'door' ? f.dest.address && (!f.dest.partial || (f.dest.city && f.dest.zip)) : f.dest.port)) m.push('dest');
  if (!f.cargo.lines.some((l) => l.hs) || f.cargo.boxes.some((b) => !b.type || !b.qty || !b.weight)) m.push('cargo');
  if (!f.pay.flow) m.push('pay');
  return m;
};
/* the form → the query the results page understands */
const formToQuery = (f) => ({
  ...DEFAULT_Q, from: PLACE[endPort(f.origin)] ? endPort(f.origin) : 'USOAK', to: PLACE[endPort(f.dest)] ? endPort(f.dest) : 'PLGDN',
  fromDate: f.origin.date || DEFAULT_Q.fromDate, toDate: f.dest.date || DEFAULT_Q.toDate,
  boxes: f.cargo.boxes.filter((b) => b.type).map((b) => ({ type: b.type, qty: b.qty })),
  commodity: hsLabel(f.cargo.lines.find((l) => l.hs)?.hs || '')?.split(/[,;(]/)[0] || 'FAK', form: f,
});

/* ---------- small hooks ---------- */
function useMobile() {
  const [m, setM] = useState(() => innerWidth < 760);
  useEffect(() => { const on = () => setM(innerWidth < 760); addEventListener('resize', on); return () => removeEventListener('resize', on); }, []);
  return m;
}

/* ---------- panel shell: popover on desktop, bottom sheet on phones ---------- */
function Panel({ open, onOpenChange, title, extra, width, children, footer, field }) {
  const mobile = useMobile();
  const body = (
    <div className="qp" style={{ width: mobile ? 'auto' : width }}>
      <div className="qp-h"><span className="strong">{title}</span><span className="grow" />{extra}</div>
      <div className="qp-b">{children}</div>
      {footer && <div className="qp-f">{footer}</div>}
    </div>
  );
  if (mobile) return (<>{React.cloneElement(field, { onClick: () => onOpenChange(true) })}<Drawer open={open} onClose={() => onOpenChange(false)} placement="bottom" height="auto" styles={{ body: { padding: 0 } }} closable={false}>{body}</Drawer></>);
  return <Popover open={open} onOpenChange={onOpenChange} trigger="click" placement="bottomLeft" arrow={false} content={body} styles={{ body: { padding: 0 } }} destroyOnHidden={false}>{field}</Popover>;
}
const Lbl = ({ children, tip }) => <div className="ql">{children}{tip && <Tooltip title={tip}><I.InfoCircleOutlined className="tip" /></Tooltip>}</div>;

/* ---------- origin / destination ---------- */
function EndPanel({ which, e, set, onDone, onUnsupported }) {
  const isOrigin = which === 'origin';
  const [q, setQ] = useState('');
  const ports = PORTS.filter((p) => !q || p.label.toLowerCase().includes(q.toLowerCase()));
  const portOptions = [
    ...ports.filter((p) => p.ok).map((p) => ({ value: p.key, label: p.label })),
    ...(ports.some((p) => !p.ok) ? [{ label: <span className="row"><span className="muted grow">Currently not supported {isOrigin ? 'origins' : 'destinations'}</span><Button size="small" onMouseDown={(ev) => { ev.preventDefault(); onUnsupported(); }}>View supported</Button></span>, options: ports.filter((p) => !p.ok).map((p) => ({ value: p.key, label: p.label, disabled: true })) }] : []),
  ];
  const addrOptions = ADDRESSES.filter((a) => a.cc === e.cc).map((a) => ({ value: a.a, label: <div><div>{a.a}</div><div className="muted">{a.city || 'Address details unavailable'} {a.zip}</div></div>, a }));
  const pickAddress = (v, opt) => {
    const a = opt?.a;
    set(a ? { address: a.a, city: a.city, zip: a.zip, partial: !a.full, port: e.port || NEAREST_PORT[e.cc] } : { address: v });
  };
  const ok = (e.kind === 'door' ? e.address && (!e.partial || (e.city && e.zip)) : e.port) && (!isOrigin || e.date);
  return (
    <>
      {e.kind === 'door' ? <>
        <div><Lbl req>Country</Lbl><Select showSearch optionFilterProp="label" style={{ width: '100%' }} value={e.cc} options={COUNTRIES.map(([v, l]) => ({ value: v, label: l }))} onChange={(cc) => set({ cc, address: '', city: '', zip: '', partial: false, port: NEAREST_PORT[cc] || null })} /></div>
        <div><Lbl req>Warehouse or factory address</Lbl><AutoComplete style={{ width: '100%' }} value={e.address} options={addrOptions} onSelect={pickAddress} onChange={(v) => set({ address: v, partial: false })} placeholder="Start typing a street and building" allowClear /></div>
        {e.partial && <>
          <Alert type="info" showIcon title="We couldn’t retrieve your full address. Please enter the missing details below." />
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="grow"><Lbl req>City</Lbl><Input value={e.city} status={!e.city ? 'warning' : ''} onChange={(ev) => set({ city: ev.target.value })} placeholder="New York, NY" /></div>
            <div style={{ width: 120 }}><Lbl req>Post code</Lbl><Input value={e.zip} status={!e.zip ? 'warning' : ''} onChange={(ev) => set({ zip: ev.target.value })} placeholder="10005" /></div>
          </div>
        </>}
        {e.address && <div><Lbl tip="We picked the closest port to the address. Change it if you prefer another one.">{isOrigin ? 'Port of loading' : 'Port of destination'}</Lbl>
          <Select style={{ width: '100%' }} value={e.port} options={PORTS.filter((p) => p.ok && p.cc === e.cc).map((p) => ({ value: p.key, label: p.label }))} onChange={(port) => set({ port })} /></div>}
      </> : (
        <div><Lbl req>Port/Ramp</Lbl>
          <Select showSearch style={{ width: '100%' }} value={e.port} placeholder="Start typing a city or UN/LOCODE" filterOption={false} onSearch={setQ} options={portOptions}
            notFoundContent={<div className="muted" style={{ padding: 8 }}>No ports found</div>} onChange={(port) => set({ port, cc: PORT_BY[port].cc })} />
        </div>
      )}
      <div><Lbl req={isOrigin}>{isOrigin ? 'Cargo ready date' : 'Required delivery date'}{!isOrigin && <span className="muted"> · optional</span>}</Lbl>
        <DatePicker style={{ width: '100%' }} format="D MMM YYYY" value={e.date ? dayjs(e.date) : null} disabledDate={(d) => d.isBefore(NOW, 'day')}
          onChange={(d) => set({ date: d ? d.format('YYYY-MM-DD') : null })} placeholder={isOrigin ? 'When can we pick it up?' : 'Leave empty if flexible'} /></div>
      {onDone && <Button color="default" variant="solid" block disabled={!ok} onClick={onDone}>{isOrigin ? 'Next: destination' : 'Next: cargo'} <I.ArrowRightOutlined /></Button>}
    </>
  );
}

/* ---------- commodity picker (HS browser + search) ---------- */
function CommodityPicker({ value, onChange, autoFocus }) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState([]);
  const [q, setQ] = useState('');
  const level = path.length ? path[path.length - 1].children : HS;
  const results = q.length > 1 ? HS_FLAT.filter((n) => !n.children && (n.label.toLowerCase().includes(q.toLowerCase()) || n.code.startsWith(q))).slice(0, 8) : null;
  const pick = (n) => { if (n.excluded) return; if (n.children) { setPath([...path, n]); return; } onChange(n.code); setOpen(false); setQ(''); setPath([]); };
  const row = (n) => (
    <Tooltip key={n.code} title={n.excluded ? 'Excluded commodity — we can’t quote it on this service' : null} placement="right">
      <div className={'hs-row' + (n.excluded ? ' off' : '') + (value === n.code ? ' on' : '')} onMouseDown={(ev) => { ev.preventDefault(); pick(n); }}>
        <span className="grow">{n.label}</span>{n.code !== 'FAK' && <span className="hs-code">{n.code}</span>}{n.children && <I.RightOutlined className="hs-go" />}
      </div>
    </Tooltip>
  );
  const dd = (
    <div className="hs-dd">
      {results ? (results.length ? results.map(row) : <div className="hs-empty"><I.SearchOutlined /> No results found</div>) : <>
        {path.length > 0 && <div className="hs-back" onMouseDown={(ev) => { ev.preventDefault(); setPath(path.slice(0, -1)); }}><I.ArrowLeftOutlined /> <span className="grow">{path[path.length - 1].label}</span></div>}
        {level.map(row)}
      </>}
    </div>
  );
  return (
    <Popover open={open} content={dd} trigger={[]} placement="bottomLeft" arrow={false} styles={{ body: { padding: 4 } }}>
      <Input autoFocus={autoFocus} value={open ? q : value ? `${value !== 'FAK' ? value + ' · ' : ''}${hsLabel(value)}` : ''} onChange={(ev) => { setQ(ev.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onBlur={() => { setOpen(false); setQ(''); }} onKeyDown={(ev) => ev.key === 'Escape' && setOpen(false)}
        placeholder="Search by name or HS code, or browse" prefix={<I.SearchOutlined style={{ color: 'var(--text-4)' }} />} allowClear onClear={() => onChange(null)} />
    </Popover>
  );
}

/* ---------- cargo | container | services ---------- */
function CargoPanel({ c, set, onDone }) {
  const setLine = (i, p) => set({ lines: c.lines.map((l, j) => (i === j ? { ...l, ...p } : l)) });
  const setBox = (i, p) => set({ boxes: c.boxes.map((b, j) => (i === j ? { ...b, ...p } : b)) });
  const types = c.temp ? REEFERS : DRY;
  const ok = c.lines.some((l) => l.hs) && c.boxes.every((b) => b.type && b.qty && b.weight);
  const toggleTemp = (temp) => set({ temp, genset: temp && c.genset, boxes: c.boxes.map((b) => ({ ...b, type: b.type && (temp ? REEFERS : DRY).includes(b.type) ? b.type : null })) });
  const del = (onClick) => <Tooltip title="Remove"><Button type="text" icon={<I.DeleteOutlined />} onClick={onClick} aria-label="Remove" /></Tooltip>;
  return (
    <Form layout="vertical" requiredMark={false} className="cargo-form" component={false}>
      <div className="pay-sec">
        <div className="pay-sec-h"><span className="strong">Commodity</span><span className="grow" />
          <label className="row" style={{ gap: 8, cursor: 'pointer' }}>Temperature control<Switch checkedChildren="On" unCheckedChildren="Off" checked={c.temp} onChange={toggleTemp} /></label></div>
        {c.lines.map((l, i) => (
          <div className="cf-row cf-c" key={i}>
            <Form.Item label={i === 0 ? 'Type' : null} required tooltip={i === 0 ? 'Pick the closest HS code. Not sure? Choose Freight All Kinds (FAK).' : null}>
              <CommodityPicker value={l.hs} onChange={(hs) => setLine(i, { hs })} />
            </Form.Item>
            <Form.Item label={i === 0 ? 'Goods value' : null} tooltip={i === 0 ? 'Used for cargo insurance' : null}>
              <InputNumber style={{ width: '100%' }} min={0} value={l.value} onChange={(value) => setLine(i, { value })} placeholder="Optional" prefix="$"
                formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')} parser={(v) => v.replace(/,/g, '')} />
            </Form.Item>
            <div className="cf-del">{c.lines.length > 1 && del(() => set({ lines: c.lines.filter((_, j) => j !== i) }))}</div>
          </div>
        ))}
        <Button type="link" className="cf-add" icon={<I.PlusOutlined />} onClick={() => set({ lines: [...c.lines, { hs: null, value: null }] })}>Add commodity</Button>
      </div>
      <div className="pay-sec">
        <div className="pay-sec-h"><span className="strong">Containers</span></div>
        {c.boxes.map((b, i) => (
          <div className="cf-row cf-b" key={i}>
            <Form.Item label={i === 0 ? 'Type' : null} required>
              <Select value={b.type} placeholder={c.temp ? 'Reefer container' : 'Select type'} options={types.map((v) => ({ value: v, label: v }))} onChange={(type) => setBox(i, { type })} />
            </Form.Item>
            <Form.Item label={i === 0 ? 'Quantity' : null} required>
              <InputNumber style={{ width: '100%' }} min={1} max={99} value={b.qty} onChange={(qty) => setBox(i, { qty })} />
            </Form.Item>
            <Form.Item label={i === 0 ? 'Weight per container' : null} required tooltip={i === 0 ? 'Gross cargo weight in one container, without the container itself' : null}
              validateStatus={b.weight > 26000 ? 'warning' : undefined} help={b.weight > 26000 ? 'Over 26 t — overweight surcharge may apply' : undefined}>
              <InputNumber style={{ width: '100%' }} min={1} max={30480} value={b.weight} onChange={(weight) => setBox(i, { weight })} suffix="kg" placeholder="e.g. 12,000" />
            </Form.Item>
            <div className="cf-del">{c.boxes.length > 1 && del(() => set({ boxes: c.boxes.filter((_, j) => j !== i) }))}</div>
          </div>
        ))}
        {c.temp && <label className="row" style={{ gap: 8, cursor: 'pointer', alignSelf: 'flex-start' }}><Switch checkedChildren="On" unCheckedChildren="Off" checked={c.genset} onChange={(genset) => set({ genset })} />Genset
          <Tooltip title="Generator set keeps the reefer powered during inland transport"><I.InfoCircleOutlined style={{ color: 'var(--text-4)' }} /></Tooltip></label>}
        <Button type="link" className="cf-add" icon={<I.PlusOutlined />} onClick={() => set({ boxes: [...c.boxes, { type: null, qty: 1, weight: null }] })}>Add container type</Button>
      </div>
      <div className="pay-sec">
        <div className="pay-sec-h"><span className="strong">Services</span><span className="muted">· optional</span></div>
        <Checkbox.Group value={c.customs} onChange={(customs) => set({ customs })} className="pay-radios">
          {CUSTOMS.map((sv) => (
            <label key={sv.key} className={'pay-radio' + (c.customs.includes(sv.key) ? ' on' : '')}>
              <Checkbox value={sv.key} /><span className="grow">{sv.label}</span><Tag bordered={false}>{usd(sv.price)}</Tag>
            </label>
          ))}
        </Checkbox.Group>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button color="default" variant="solid" disabled={!ok} onClick={onDone}>Next: payment details <I.ArrowRightOutlined /></Button>
      </div>
    </Form>
  );
}

/* ---------- payment details ---------- */
const ChoiceCard = ({ on, disabled, tip, icon, title, sub, onClick }) => (
  <Tooltip title={disabled ? tip : null}>
    <button className={'choice' + (on ? ' on' : '') + (disabled ? ' off' : '')} disabled={disabled} onClick={onClick}>
      <span className="choice-ic">{icon}</span><span className="col" style={{ alignItems: 'flex-start' }}><span className="strong">{title}</span>{sub && <span className="muted">{sub}</span>}</span>
      {on && <I.CheckCircleFilled className="choice-ok" />}
    </button>
  </Tooltip>
);
const PaySec = ({ n, title, tip, children, aside }) => (
  <div className="pay-sec">
    <div className="pay-sec-h"><span className="strong">{title}</span>{tip && <Tooltip title={tip}><I.InfoCircleOutlined className="tip" /></Tooltip>}<span className="grow" />{aside}</div>
    {children}
  </div>
);
function PayPanel({ f, p, set, onDone }) {
  const exp = p.flow === 'export';
  const flowOpt = (v, label, icon, ok, why) => ({ value: v, disabled: !ok, label: <Tooltip title={ok ? null : why}><span className="pay-seg">{icon}{label}</span></Tooltip> });
  return (
    <>
      <PaySec n={1} title="Customer" tip="The company this quote is prepared for">
        <Select showSearch style={{ width: '100%' }} value={p.customer} onChange={(customer) => set({ customer })}
          options={CUSTOMERS_LIST.map((v) => ({ value: v, label: v }))} />
      </PaySec>
      <PaySec n={2} title="Shipment direction">
        <Segmented block value={p.flow} onChange={(flow) => set({ flow })} className="pay-flow"
          options={[flowOpt('import', 'Import', <I.ArrowDownOutlined />, true),
            flowOpt('export', 'Export', <I.ArrowUpOutlined />, true)]} />
      </PaySec>
      {p.flow && <PaySec n={3} title={`Who pays ${exp ? 'destination' : 'origin'} charges?`} tip="Defines the Incoterms applied to the quote">
        <Radio.Group value={p.payer} onChange={(e) => set({ payer: e.target.value })} className="pay-radios">
          {[['me', 'My organization', exp ? 'DAP/DPU' : 'EXW'], ['other', exp ? 'Consignee' : 'Shipper', exp ? 'CFR' : 'FOB']].map(([v, t, i]) => (
            <label key={v} className={'pay-radio' + (p.payer === v ? ' on' : '')}><Radio value={v} /><span className="grow">{t}</span><Tag bordered={false}>{i}</Tag></label>
          ))}
        </Radio.Group>
      </PaySec>}
      <PaySec n={p.flow ? 4 : 3} title="Payment terms" tip="Pay later with financing. The rate is added to the total cost of service.">
        <Radio.Group value={p.terms} onChange={(e) => set({ terms: e.target.value })} className="pay-radios">
          {TERMS_OPTS.map((t) => {
            const [days, rate] = t.label.split(' / Financial rate ');
            return (
              <Tooltip key={t.value} title={t.disabled ? t.note : null} placement="left">
                <label className={'pay-radio' + (p.terms === t.value ? ' on' : '') + (t.disabled ? ' off' : '')}>
                  <Radio value={t.value} disabled={t.disabled} /><span className="grow">{days}</span>
                  <Tag bordered={false} color={rate === '0%' ? 'green' : undefined}>{rate === '0%' ? 'No fee' : `${rate.replace('+', '+')} fee`}</Tag>
                </label>
              </Tooltip>
            );
          })}
        </Radio.Group>
      </PaySec>
    </>
  );
}

/* ---------- search bar ---------- */
const STEP_ORDER = ['origin', 'dest', 'cargo', 'pay'];
function SearchForm({ q, onSearch, initialOpen, initialForm }) {
  const { message } = AntApp.useApp();
  const [f, setF] = useState(() => initialForm || q.form || SAMPLE_FORM);
  const [open, setOpen] = useState(null);
  /* open the requested panel after the bar has laid out, otherwise the popover can't position itself */
  useEffect(() => { if (!initialOpen) return undefined; const t = setTimeout(() => setOpen(initialOpen), 250); return () => clearTimeout(t); }, []);
  const [errs, setErrs] = useState([]);
  const [unsupported, setUnsupported] = useState(initialOpen === 'unsupported');
  const seenForm = useRef(q.form);
  useEffect(() => { if (q.form && q.form !== seenForm.current) { seenForm.current = q.form; setF(q.form); } }, [q.form]);
  const patch = (k) => (p) => { setF((x) => ({ ...x, [k]: { ...x[k], ...p } })); setErrs((e) => e.filter((x) => x !== k)); };
  /* export/import is decided by the route when only one makes sense */
  const routeReady = !missing(f).some((k) => k === 'origin' || k === 'dest');
  useEffect(() => { if (!routeReady || f.pay.flow) return; const { auto } = payFlowFor(f); if (auto) patch('pay')({ flow: auto }); }, [f.origin.cc, f.dest.cc, routeReady]);
  const go = (next) => setOpen(next);
  const submit = () => {
    const m = missing(f);
    if (m.length) { setErrs(m); setOpen(m[0]); message.warning('Fill in the highlighted fields to see quotes'); return; }
    setOpen(null); setErrs([]); onSearch(formToQuery(f));
  };
  const swap = () => setF((x) => ({ ...x, origin: { ...x.dest, date: x.origin.date }, dest: { ...x.origin, date: x.dest.date } }));
  const kindSwitch = (k) => <Segmented size="small" value={f[k].kind} onChange={(kind) => patch(k)({ kind })} options={[{ value: 'door', label: 'Door' }, { value: 'port', label: 'Port' }]} />;
  const field = (k, icon, text, ph, extraCls = '') => (
    <button className={'sf-btn' + (open === k ? ' open' : '') + (errs.includes(k) ? ' err' : '') + (text ? ' filled' : '') + extraCls} onClick={() => go(open === k ? null : k)}>
      {icon}<span className={text ? '' : 'ph'}>{text || ph}</span>
    </button>
  );
  const done = STEP_ORDER.filter((k) => !missing(f).includes(k)).length;
  return (
    <div className="box search v2">
      <div className="sf">
        <span className="sf-l">Type</span>
        <Tooltip title="Only full container load (FCL) is available for now"><div className="sf-btn static"><img className="ic" src="assets/shell/ship.svg?v=2" width={16} height={16} alt="" />FCL</div></Tooltip>
      </div>
      <div className="od grow">
        <div className="sf grow">
          <span className="sf-l">Origin</span>
          <Panel open={open === 'origin'} onOpenChange={(o) => go(o ? 'origin' : null)} title="Origin" extra={kindSwitch('origin')} width={380}
            field={field('origin', f.origin.kind === 'door' ? <I.HomeOutlined className="ic" /> : <I.EnvironmentOutlined className="ic" />, endText(f.origin), 'Where are you shipping from?')}>
            <EndPanel which="origin" e={f.origin} set={patch('origin')} onDone={() => go('dest')} onUnsupported={() => setUnsupported(true)} />
          </Panel>
        </div>
        <Tooltip title="Swap origin and destination"><Button className="swap" size="small" icon={<I.SwapOutlined />} onClick={swap} /></Tooltip>
        <div className="sf grow">
          <span className="sf-l">Destination</span>
          <Panel open={open === 'dest'} onOpenChange={(o) => go(o ? 'dest' : null)} title="Destination" extra={kindSwitch('dest')} width={380}
            field={field('dest', f.dest.kind === 'door' ? <I.HomeOutlined className="ic" /> : <img className="ic" src="assets/shell/anchor.svg" width={16} height={16} alt="" />, endText(f.dest), 'Where are you shipping to?')}>
            <EndPanel which="dest" e={f.dest} set={patch('dest')} onDone={() => go('cargo')} onUnsupported={() => setUnsupported(true)} />
          </Panel>
        </div>
      </div>
      <div className="sf grow" style={{ flexBasis: 260 }}>
        <span className="sf-l">Cargo | Containers | Services</span>
        <Panel open={open === 'cargo'} onOpenChange={(o) => go(o ? 'cargo' : null)} title="Cargo, containers and services" width={640}
          field={field('cargo', <img className="ic" src="assets/shell/containers.svg" width={16} height={16} alt="" />, cargoSummary(f.cargo), 'What are you shipping?')}>
          <CargoPanel c={f.cargo} set={patch('cargo')} onDone={() => go('pay')} />
        </Panel>
      </div>
      <div className="sf grow" style={{ flexBasis: 220 }}>
        <span className="sf-l">Payment Details</span>
        <Panel open={open === 'pay'} onOpenChange={(o) => go(o ? 'pay' : null)} title="Payment details" width={500}
          field={field('pay', <I.BlockOutlined className="ic" />, paySummary(f.pay), 'Tell us about details')}>
          <PayPanel f={f} p={f.pay} set={patch('pay')} onDone={submit} />
        </Panel>
      </div>
      <Tooltip title={done < 4 ? `${done} of 4 sections ready` : 'Show quotes'}>
        <Button className="sf-go" color="default" variant="solid" size="large" icon={<I.SearchOutlined />} onClick={submit} aria-label="Search quotes" />
      </Tooltip>
      <Modal open={unsupported} onCancel={() => setUnsupported(false)} width={420} footer={<Button color="default" variant="solid" onClick={() => setUnsupported(false)}>Done</Button>} title="Availability of this service is limited to the following countries:">
        <p style={{ lineHeight: '24px' }}>{SUPPORTED}</p>
      </Modal>
    </div>
  );
}

/* ---------- start lists: recent / popular / favorites ---------- */
const mkStart = (o, d, boxes, hs) => ({ ...SAMPLE_FORM, origin: { ...SAMPLE_FORM.origin, kind: 'port', port: o, cc: PLACE[o].cc }, dest: { ...SAMPLE_FORM.dest, kind: 'port', port: d, cc: PLACE[d].cc }, cargo: { ...SAMPLE_FORM.cargo, boxes, lines: [{ hs, value: null }] } });
const B2 = [{ type: "20' ST", qty: 2, weight: 12000 }, { type: "40' HC", qty: 1, weight: 18000 }];
const B1 = [{ type: "40' HC", qty: 1, weight: 18000 }];
const START = {
  Recent: [SAMPLE_D2D, mkStart('USOAK', 'PLGDN', B2, '85'), mkStart('CNSHA', 'NLRTM', B2, '8470'), mkStart('DEHAM', 'USLAX', B2, '85')],
  Popular: [mkStart('CNSHA', 'NLRTM', B1, 'FAK'), mkStart('DEHAM', 'USLAX', B1, 'FAK'), mkStart('NLRTM', 'USNYC', B1, 'FAK'), mkStart('USSAV', 'BEANR', B1, 'FAK'), mkStart('CNSHA', 'USLAX', B1, 'FAK'), mkStart('BEANR', 'USHOU', B1, 'FAK')],
};
const endName = (e) => (e.kind === 'door' ? e.city.split(',')[0] : placeShort(e.port));
const endCode = (e) => (e.kind === 'door' ? 'Door' : e.port);
const START_CARRIERS = ['HLCU', 'MAEU', 'CMDU', 'OOLU', 'ONEY', 'MSCU'];

/* start page — same layout as Vessel Schedules v2 "01 · Start": hero, recent + popular, carriers */
function StartLists({ onPick }) {
  const lane = (f) => {
    const q = formToQuery(f);
    const list = makeQuotes(q, 0);
    return { from: Math.min(...list.map((o) => quoteTotal(o, q, ['freight']))), n: list.length, days: Math.min(...list.map((o) => o.days)), direct: list.some((o) => !o.via.length) };
  };
  return (
    <div className="page" style={{ maxWidth: 'none' }}>
      <section className="box st-hero">
        <div className="st-hero-l">
          <div className="st-hero-ic"><I.FileSearchOutlined /></div>
          <h2>Get freight quotes</h2>
          <p className="st-lead">Search a lane once — we ask 8 carriers at the same time and line up all-in FCL prices, sailings and cut-offs in one list.</p>
        </div>
        <div className="st-hero-r">
          {[[<I.DollarOutlined />, 'All-in prices', 'Freight, terminal handling, pickup and delivery in one number'],
            [<I.CalendarOutlined />, 'Sailings & cut-offs', 'Every quote shows real vessels, transit time and deadlines'],
            [<I.CheckCircleOutlined />, 'Book in one click', 'Pick a quote and send the booking request right away']].map(([ic, t, d]) => (
            <div className="st-feat" key={t}><span className="st-feat-ic">{ic}</span><div><div className="strong">{t}</div><div className="muted">{d}</div></div></div>
          ))}
        </div>
      </section>
      <div className="st-grid">
        <section className="box st-sec">
          <div className="st-sec-h"><h3>Recent searches</h3><span className="muted">{START.Recent.length}</span></div>
          {START.Recent.map((f, i) => (
            <button className="st-recent" key={i} onClick={() => onPick(f)}>
              <span className="st-ic">{f.origin.kind === 'door' || f.dest.kind === 'door' ? <I.HomeOutlined /> : <I.NodeIndexOutlined />}</span>
              <span className="col grow" style={{ minWidth: 0 }}>
                <span className="strong ell">{endName(f.origin)} → {endName(f.dest)}</span>
                <span className="muted ell">{f.origin.kind === 'door' ? 'Door' : 'Port'} to {f.dest.kind === 'door' ? 'door' : 'port'} · {cargoSummary(f.cargo)}</span>
              </span>
              <I.ArrowRightOutlined className="st-go" />
            </button>
          ))}
        </section>
        <section className="box st-sec">
          <div className="st-sec-h"><h3>Popular lanes</h3></div>
          <div className="st-lanes">
            {START.Popular.map((f, i) => {
              const l = lane(f);
              return (
                <button className="st-lane" key={i} onClick={() => onPick(f)}>
                  <span className="strong">{endName(f.origin)} → {endName(f.dest)}</span>
                  <span className="muted">{endCode(f.origin)} → {endCode(f.dest)}</span>
                  <span className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <span className="tag"><I.ClockCircleOutlined />from {l.days} d</span>
                    <span className="tag blue">from {usd(l.from)}</span>
                    {l.direct && <span className="tag green">Direct</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
      <section className="box st-sec">
        <div className="st-sec-h"><h3>Carriers</h3></div>
        <div className="st-carriers">
          {START_CARRIERS.map((c) => <div className="st-carrier" key={c}><Logo c={c} /><span className="strong">{CARRIERS[c].name}</span><span className="muted">{c}</span></div>)}
        </div>
      </section>
    </div>
  );
}
