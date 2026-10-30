/* =====================================================================
   New request: search form, departure windows, filters, results states
   ===================================================================== */

/* search form lives in search.jsx */

function DepartureWindows({ q, win, setWin, incl, empty }) {
  const mins = WINDOWS.map((_, w) => Math.min(...makeQuotes(q, w).map((o) => quoteTotal(o, q, incl))));
  const best = mins.indexOf(Math.min(...mins));
  return (
    <div className="windows">
      <span className="win-label"><I.CalendarOutlined />Departure window</span>
      <Segmented block value={win} onChange={setWin} className="win-seg"
        options={WINDOWS.map(([label], w) => ({
          value: w,
          label: (
            <span className="win-opt">
              <span className="win-d">{label}</span>
              <span className="win-p">{empty ? '–' : usd(mins[w])}{!empty && w === best && <Tooltip title="Lowest price across departure windows"><i className="win-best" /></Tooltip>}</span>
            </span>
          ),
        }))} />
    </div>
  );
}

/* ---------- left column ---------- */
function IncludedPanel({ incl, setIncl }) {
  return (
    <div className="box side-sec">
      <div className="side-h"><I.DollarOutlined />What’s included in quote price?</div>
      {INCLUDED.map((s) => {
        const on = incl.includes(s.key);
        const locked = s.key === 'freight';
        return (
          <Tooltip key={s.key} title={locked ? 'Freight is always part of the quote' : null} placement="right">
            <button className={'incl-btn' + (on ? ' on' : '')} onClick={() => !locked && setIncl(on ? incl.filter((k) => k !== s.key) : [...incl, s.key])}>
              {on ? <I.CheckOutlined /> : <I.PlusOutlined />}{s.label}{s.cost > 0 && <span className="muted" style={{ marginLeft: 'auto' }}>+{usd(s.cost)}</span>}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

const EMPTY_F = { alt: true, price: null, transit: null, carriers: [], modes: [], origins: [], transits: [], dests: [] };
const fActive = (f) => !f.alt || f.price || f.transit || ['carriers', 'modes', 'origins', 'transits', 'dests'].some((k) => f[k].length);
function applyFilters(list, f, q, incl) {
  return list.filter((o) => {
    const t = quoteTotal(o, q, incl);
    if (!f.alt && o.alt) return false;
    if (f.price && (t < f.price[0] || t > f.price[1])) return false;
    if (f.transit && (o.days < f.transit[0] || o.days > f.transit[1])) return false;
    if (f.carriers.length && !f.carriers.includes(o.carrier)) return false;
    if (f.modes.length && !f.modes.includes(stopsKey(o))) return false;
    if (f.origins.length && !f.origins.includes(o.from)) return false;
    if (f.transits.length && !o.via.some((v) => f.transits.includes(v))) return false;
    if (f.dests.length && !f.dests.includes(o.to)) return false;
    return true;
  });
}
/* ---------- filters: the original set (alternative routes, price, transit time, carrier, transit mode, locations, transit ports) ---------- */
const stopsKey = (o) => (o.via.length ? 'ts' : 'direct');
function FxOptions({ options, value, onChange }) {
  return (
    <div className="fx-opts">
      {options.map(({ v, label, icon }) => (
        <label key={v} className="fx-opt">
          <Checkbox checked={value.includes(v)} onChange={(e) => onChange(e.target.checked ? [...value, v] : value.filter((x) => x !== v))} />
          {icon}<span className="grow ell">{label}</span>
        </label>
      ))}
    </div>
  );
}
/* collapsible filter section — open by default, click the header to hide or show */
function FxSec({ title, aside, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={'fx-sec' + (open ? '' : ' closed')}>
      <button type="button" className="fx-h fx-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="strong grow">{title}</span>{aside}
        <ChevronIcon dir="down" className="fx-chev" />
      </button>
      {open && children}
    </div>
  );
}
function Filters({ all, f, setF, q, incl }) {
  const totals = all.map((o) => quoteTotal(o, q, incl));
  const pr = [Math.floor(Math.min(...totals)), Math.ceil(Math.max(...totals))];
  const tr = [Math.min(...all.map((o) => o.days)), Math.max(...all.map((o) => o.days))];
  const set = (p) => setF({ ...f, ...p });
  const uniq = (arr) => [...new Set(arr)];
  const pv = f.price || pr, tv = f.transit || tr;
  return (
    <AntCard size="small" className="fx" styles={{ body: { padding: 0 } }}
      title={<span className="row" style={{ gap: 8 }}><I.FilterOutlined />Filters</span>}
      extra={fActive(f) && <Button size="small" icon={<I.ClearOutlined />} onClick={() => setF(EMPTY_F)}>Clear All</Button>}>
      <div className="fx-sec"><Checkbox checked={f.alt} onChange={(e) => set({ alt: e.target.checked })}>Include alternative routes</Checkbox></div>
      <FxSec title="Price">
        <Slider className="fx-slider" range min={pr[0]} max={pr[1]} step={1} value={pv} onChange={(v) => set({ price: v })} tooltip={{ formatter: (v) => usd(v) }} />
        <Space.Compact block>
          <InputNumber style={{ width: '50%' }} prefix="$ Min" controls={false} value={pv[0]} min={pr[0]} max={pv[1]} onChange={(v) => set({ price: [v ?? pr[0], pv[1]] })} />
          <InputNumber style={{ width: '50%' }} prefix="$ Max" controls={false} value={pv[1]} min={pv[0]} max={pr[1]} onChange={(v) => set({ price: [pv[0], v ?? pr[1]] })} />
        </Space.Compact>
      </FxSec>
      <FxSec title="Carrier">
        <FxOptions value={f.carriers} onChange={(carriers) => set({ carriers })} options={uniq(all.map((o) => o.carrier)).map((c) => ({ v: c, label: CARRIERS[c].name, icon: <span className="fx-logo"><Logo c={c} /></span> }))} />
      </FxSec>
      <FxSec title="Transit time">
        <Slider className="fx-slider" range min={tr[0]} max={tr[1]} value={tv} onChange={(v) => set({ transit: v })} tooltip={{ formatter: (v) => `${v} days` }} />
        <Space.Compact block>
          <InputNumber style={{ width: '50%' }} prefix="Min" suffix="Day(s)" controls={false} value={tv[0]} min={tr[0]} max={tv[1]} onChange={(v) => set({ transit: [v ?? tr[0], tv[1]] })} />
          <InputNumber style={{ width: '50%' }} prefix="Max" suffix="Day(s)" controls={false} value={tv[1]} min={tv[0]} max={tr[1]} onChange={(v) => set({ transit: [tv[0], v ?? tr[1]] })} />
        </Space.Compact>
      </FxSec>
      <FxSec title="Origin ports/ramps">
        <FxOptions value={f.origins} onChange={(origins) => set({ origins })} options={uniq(all.map((o) => o.from)).map((p) => ({ v: p, label: PLACE[p].label }))} />
      </FxSec>
      <FxSec title="Transit ports">
        <FxOptions value={f.transits} onChange={(transits) => set({ transits })} options={uniq(all.flatMap((o) => o.via)).map((p) => ({ v: p, label: p }))} />
      </FxSec>
      <FxSec title="Destination ports/ramps">
        <FxOptions value={f.dests} onChange={(dests) => set({ dests })} options={uniq(all.map((o) => o.to)).map((p) => ({ v: p, label: PLACE[p].label }))} />
      </FxSec>
    </AntCard>
  );
}

/* ---------- alternative routes / nearby ---------- */
function AltRoutes({ variant, onSearch, onBot, exclude }) {
  const [sel, setSel] = useState(variant === 'list' ? ['USNYC', 'USLAX', 'USHOU'] : ['DEBRV'].filter((p) => p !== exclude));
  if (variant === 'bot') return (
    <div className="bot">
      <div className="bot-ava">S</div>
      <div className="box bot-msg">
        <div className="grow"><div className="strong lg">Hi! Better rates may be available</div><div className="sec-t">We have rates for 5 alternative routes. Check them to see if there’s a better price for your shipment.</div></div>
        <Button color="default" variant="solid" style={{ width: 120 }} onClick={onBot}>Search</Button>
      </div>
    </div>
  );
  /* nearby ports to try, never the port we already searched */
  const ports = (variant === 'list' ? NEARBY : (variant === 'grid4' ? NEARBY_SHORT : NEARBY_SHORT.slice(0, 3)).map((p) => [p])).filter(([p]) => p !== exclude);
  const toggle = (p, on) => setSel(on ? [...sel, p] : sel.filter((x) => x !== p));
  return (
    <AntCard size="small" className="alt-card" styles={{ body: { padding: '16px 20px' } }}>
      <Flex gap={16} align="center" wrap>
        <Avatar shape="square" size={40} icon={<I.NodeIndexOutlined />} style={{ background: 'var(--primary-bg)', color: 'var(--primary)', flex: 'none' }} />
        <Flex vertical gap={8} flex={1} style={{ minWidth: 260 }}>
          <div>
            <Typography.Text strong>Lower rates may be available from nearby ports</Typography.Text><br />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>Pick the ports to include — we’ll search them alongside your route.</Typography.Text>
          </div>
          <Flex gap={8} wrap>
            {ports.map(([p, km]) => (
              <Tag.CheckableTag key={p} checked={sel.includes(p)} onChange={(on) => toggle(p, on)}>
                <Space size={4}>{sel.includes(p) ? <I.CheckOutlined /> : <I.PlusOutlined />}{placeShort(p)}{km && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{km} km</Typography.Text>}</Space>
              </Tag.CheckableTag>
            ))}
          </Flex>
        </Flex>
        <Button type="primary" disabled={!sel.length} icon={<I.SearchOutlined />} onClick={() => onSearch(sel)}>
          {sel.length ? `Search ${sel.length} port${sel.length > 1 ? 's' : ''}` : 'Select ports'}
        </Button>
      </Flex>
    </AntCard>
  );
}
function SelectPortsModal({ open, onClose, onSearch }) {
  const ports = NEARBY.map(([p]) => p);
  const [sel, setSel] = useState([]);
  const all = sel.length === ports.length;
  return (
    <Modal open={open} onCancel={onClose} title="Select Ports" width={470} footer={<Button color="default" variant="solid" disabled={!sel.length} onClick={() => { onSearch(sel); onClose(); }}>Search{sel.length ? ` (${sel.length})` : ''}</Button>}>
      <div className="muted" style={{ marginBottom: 8 }}>Ports near your pickup and delivery addresses</div>
      <div className="flt-list">
        <Checkbox checked={all} indeterminate={sel.length > 0 && !all} onChange={(e) => setSel(e.target.checked ? ports : [])}>All Ports</Checkbox>
        {NEARBY.map(([p, km, side]) => <Checkbox key={p} checked={sel.includes(p)} onChange={(e) => setSel(e.target.checked ? [...sel, p] : sel.filter((x) => x !== p))}><span className="row" style={{ width: 360 }}>{PLACE[p].label}<span className="cnt">{km} km from {side}</span></span></Checkbox>)}
      </div>
    </Modal>
  );
}
function NearbyAlert({ q, onRequest }) {
  return (
    <Alert type="info" showIcon
      title={`We don’t have quotes for the exact ${placeShort(q.from)}–${placeShort(q.to)} route, but here are offers for nearby ports. Want pricing for your exact route instead? Request a quote and we’ll email you a personalized rate within 24 hours.`}
      action={<Button color="default" variant="solid" onClick={onRequest}>Request quote</Button>} />
  );
}

/* ---------- loading / empty ---------- */
function LoadingState() {
  const [pct, setPct] = useState(12);
  useEffect(() => { const t = setInterval(() => setPct((p) => Math.min(96, p + 9)), 160); return () => clearInterval(t); }, []);
  return (
    <>
      <div className="loading-bar">
        <span className="row"><I.LoadingOutlined spin style={{ color: 'var(--primary)' }} />Selecting the best offers</span>
        <Progress percent={pct} showInfo={false} size="small" strokeColor="#323656" />
      </div>
      <div className="results">
        <div className="side"><div className="box side-sec"><Skeleton active paragraph={{ rows: 6 }} /></div></div>
        <div className="quotes">
          {range(3, (i) => <div className="box skel-card" key={i}><Skeleton.Avatar active size={40} /><Skeleton active title={{ width: '40%' }} paragraph={{ rows: 2 }} /><div style={{ width: 160 }}><Skeleton.Button active block /><div style={{ height: 8 }} /><Skeleton.Button active block /></div></div>)}
        </div>
      </div>
    </>
  );
}
const EmptyState = ({ onClear }) => (
  <div className="box" style={{ padding: '72px 24px' }}>
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><div className="strong lg">No quotes match your current filters</div><div className="muted">Try adjusting your filters or entering different criteria.</div></>}>
      <Button onClick={onClear} icon={<I.ClearOutlined />}>Clear all filters</Button>
    </Empty>
  </div>
);

/* ---------- results page ---------- */
function ResultsPage({ q, onSearch, scenario, onSelect }) {
  const { message, notification } = AntApp.useApp();
  const sc = scenario || {};
  const [win, setWin] = useState(0);
  const [loading, setLoading] = useState(!!sc.loading || !!sc.boot);
  const incl = useMemo(() => inclFor(q), [q]);
  const [f, setF] = useState(sc.empty ? { ...EMPTY_F, price: [120, 300] } : EMPTY_F);
  const [sort, setSort] = useState('recommended');
  const [fav, setFav] = useState(false);
  const [extra, setExtra] = useState([]);
  const [portsModal, setPortsModal] = useState(!!sc.selectPorts);
  const [sent, setSent] = useState(!!sc.requestSent);
  const [started, setStarted] = useState(!sc.start);
  const timer = useRef();

  const run = (fn) => {
    setLoading(true); clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLoading(false); fn && fn();
      if (sc.error) notification.error({
        key: 'err', duration: 0, title: 'We couldn’t load all quotes', placement: 'bottomRight',
        description: '2 of 8 carriers didn’t respond in time, so some offers may be missing. Try again to load the rest.',
        actions: <Space><Button size="small" type="text" onClick={() => notification.destroy('err')}>Close</Button><Button size="small" color="default" variant="solid" onClick={() => { notification.destroy('err'); message.success('All carriers answered'); }}>Try Again</Button></Space>,
      });
    }, sc.loading ? 600000 : 1200);
  };
  useEffect(() => { if (loading) run(); return () => { clearTimeout(timer.current); notification.destroy('err'); }; }, []);

  const all = useMemo(() => makeQuotes(q, win, extra), [q, win, extra]);
  const shown = useMemo(() => {
    const list = applyFilters(all, f, q, incl);
    const by = {
      recommended: (o) => o.rank ?? quoteTotal(o, q, incl) / 100 + o.days * 2 + o.via.length * 3 + (o.kind === 'spot' ? 0 : 2),
      price: (o) => quoteTotal(o, q, incl), transit: (o) => o.days, etd: (o) => o.etd.valueOf(),
    }[sort];
    return [...list].sort((a, b) => by(a) - by(b));
  }, [all, f, sort, incl]);
  const smart = shown.slice(0, 3);
  const other = shown.slice(3);
  const altVariant = sc.alt ?? 'grid4';
  const searchAlt = (ports) => run(() => { setExtra(ports); message.success(`Added offers via ${ports.map(placeShort).join(', ')}`); });
  const share = () => { try { navigator.clipboard.writeText(location.href); } catch { /* clipboard unavailable */ } message.success('Link to these quotes copied'); };

  return (
    <>
      <SearchForm q={q} initialOpen={sc.open} initialForm={sc.form} onSearch={(d) => { onSearch(d); setStarted(true); setExtra([]); setF(EMPTY_F); run(); }} />
      {!started ? <StartLists onPick={(form) => { onSearch(formToQuery(form)); setStarted(true); run(); }} /> : loading ? <LoadingState /> : <>
        <DepartureWindows q={q} win={win} incl={incl} empty={!shown.length} setWin={(w) => { setWin(w); run(); }} />
        <div className="results">
          <div className="side">
            <Filters all={all} f={f} setF={setF} q={q} incl={incl} />
          </div>
          <div className="quotes">
            {!shown.length ? <EmptyState onClear={() => setF(EMPTY_F)} /> : <>
              <div className="box qbar">
                <div className="col grow" style={{ minWidth: 0 }}>
                  <span className="row" style={{ gap: 10 }}><span className="strong lg">{doorOf(q, 'origin')?.city.split(',')[0] || placeShort(q.from)} → {doorOf(q, 'dest')?.city.split(',')[0] || placeShort(q.to)}</span><span className="tag blue">{routeKind(q)}</span></span>                </div>                <Tooltip title="Copy link to these quotes"><Button shape="circle" icon={<I.ShareAltOutlined />} onClick={share} aria-label="Share" /></Tooltip>
                <Tooltip title={fav ? 'Remove from favorites' : 'Add to favorites'}>
                  <Button shape="circle" icon={fav ? <I.BookFilled style={{ color: 'var(--primary)' }} /> : <I.BookOutlined />} aria-label="Favorite"
                    onClick={() => { setFav(!fav); message.success(fav ? 'Removed from favorites' : 'Search saved to favorites'); }} />
                </Tooltip>
                <Select value={sort} onChange={setSort} style={{ width: 220 }} prefix={<span className="muted" style={{ marginRight: 4 }}>Sort:</span>}
                  options={SORTS.map((s) => ({ value: s.key, label: s.label }))} />
              </div>
              {sc.nearby && <NearbyAlert q={q} onRequest={() => setSent(true)} />}
              <div className="sec-div"><span className="strong">Smart quotes</span><span className="muted">{smart.length}</span><i /></div>
              {smart.map((o, i) => <QuoteCard key={o.id} o={o} q={q} incl={incl} onSelect={onSelect} initialTab={i === 0 ? sc.tab : null} />)}
              {altVariant !== 'none' && !sc.nearby && !extra.length && <AltRoutes variant={altVariant} exclude={q.to} onSearch={searchAlt} onBot={() => setPortsModal(true)} />}
              {other.length > 0 && <div className="sec-div"><span className="strong">Other quotes</span><span className="muted">{other.length}</span><i /></div>}
              {other.map((o) => <QuoteCard key={o.id} o={o} q={q} incl={incl} onSelect={onSelect} />)}
            </>}
          </div>
        </div>
      </>}
      <SelectPortsModal open={portsModal} onClose={() => setPortsModal(false)} onSearch={searchAlt} />
      <Modal open={sent} width={420} onCancel={() => setSent(false)} footer={<Button color="default" variant="solid" onClick={() => setSent(false)}>Close</Button>}
        title={<span className="row"><I.CheckCircleFilled style={{ color: '#52c41a' }} />Quote request sent</span>}>
        Thank you! We’ve received your quote request for the {placeShort(q.from)}–{placeShort(q.to)} route. Our team will review it and email you a personalized quote within 24 hours.
      </Modal>
    </>
  );
}

/* ---------- roll shipment drawer ---------- */
function RollShipment({ open, onClose, q }) {
  const { message } = AntApp.useApp();
  const list = useMemo(() => makeQuotes(q, 1).slice(0, 5).map((o, i) => ({ ...o, carrier: 'HLCU', alt: true, kind: 'spot', delta: i === 0 ? -500 : 100 * i })), [q]);
  const field = (label, place, date, icon) => (
    <div className="sf"><span className="sf-l">{label}</span><button className="sf-btn">{icon}{placeShort(place)}, {dayjs(date).format('D MMM')}</button></div>
  );
  return (
    <Drawer open={open} onClose={onClose} title="Roll Shipment" width="min(1140px, 92vw)" styles={{ body: { background: 'var(--panel)', padding: 16 } }}>
      <div className="page" style={{ maxWidth: 'none' }}>
        <div className="box roll-search">
          {field('Place of receipt', q.from, q.fromDate, <I.ExportOutlined className="ic" />)}
          {field('Port of loading', q.from, q.fromDate, <I.ExportOutlined className="ic" />)}
          {field('Port of discharge', q.to, q.toDate, <I.ImportOutlined className="ic" />)}
          {field('Place of delivery', q.to, q.toDate, <I.ImportOutlined className="ic" />)}
          <Button color="default" variant="solid" size="large" icon={<I.SearchOutlined />} />
        </div>
        {list.map((o) => <QuoteCard key={o.id} o={o} q={q} incl={['freight']} roll={{ delta: o.delta }} onSelect={() => { message.success(`Shipment rolled to ${o.vessel} · ${dd(o.etd)}`); onClose(); }} />)}
      </div>
    </Drawer>
  );
}
