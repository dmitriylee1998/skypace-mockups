/* =====================================================================
   App shell (Vessel Schedules layout) + screen switcher for the 22 frames
   ===================================================================== */

const F_ROUTE = { ...EMPTY_FORM, origin: SAMPLE_FORM.origin, dest: SAMPLE_FORM.dest };
const F_CARGO = { ...F_ROUTE, cargo: SAMPLE_FORM.cargo };
const SCREENS = [
  ['New quote request · search', [
    ['new', 'Start · empty form with Recent / Popular / Favorites', { start: true, form: EMPTY_FORM }],
    ['new-filled', 'Start · filled form', { start: true, form: SAMPLE_FORM }],
    ['origin-door', 'Origin · Door (country, address, date)', { start: true, form: EMPTY_FORM, open: 'origin' }],
    ['origin-partial', 'Origin · address not fully recognised', { start: true, open: 'origin', form: { ...EMPTY_FORM, origin: { ...EMPTY_FORM.origin, address: '13th Street', partial: true, port: 'USOAK', date: '2026-10-16' } } }],
    ['origin-port', 'Origin · Port / Ramp search', { start: true, open: 'origin', form: { ...EMPTY_FORM, origin: { ...EMPTY_FORM.origin, kind: 'port', date: '2026-10-16' } } }],
    ['unsupported', 'Supported countries modal', { start: true, form: EMPTY_FORM, open: 'unsupported' }],
    ['dest', 'Destination', { start: true, open: 'dest', form: { ...EMPTY_FORM, origin: SAMPLE_FORM.origin } }],
    ['cargo', 'Cargo · commodity HS browser, containers, services', { start: true, open: 'cargo', form: F_ROUTE }],
    ['cargo-temp', 'Cargo · temperature control & genset', { start: true, open: 'cargo', form: { ...F_ROUTE, cargo: { ...SAMPLE_FORM.cargo, temp: true, genset: true, boxes: [{ type: "40' Reefer Standard", qty: 1, weight: 16000 }], lines: [{ hs: '060110', value: 18000 }] } } }],
    ['pay', 'Payment details', { start: true, open: 'pay', form: { ...F_CARGO, pay: { ...EMPTY_FORM.pay } } }],
  ]],
  ['Door to door', [
    ['d2d', 'Door to door · Oakland warehouse → Gdansk warehouse', { boot: true, query: SAMPLE_D2D }],
    ['d2d-route', 'Door to door · route with pickup and delivery', { query: SAMPLE_D2D, tab: 'schedules' }],
    ['d2d-price', 'Door to door · price breakdown', { query: SAMPLE_D2D, tab: 'breakdown' }],
  ]],
  ['New request', [
    ['start', 'Search → loading → results', { boot: true }],
    ['loading', 'Selecting the best offers (loading)', { loading: true }],
    ['grid4', 'Alternative routes · 4 nearby ports', { alt: 'grid4' }],
    ['grid3', 'Alternative routes · 3 nearby ports', { alt: 'grid3' }],
    ['list', 'Alternative routes · ports with distance', { alt: 'list' }],
    ['bot', 'Better rates may be available', { alt: 'bot' }],
    ['ports', 'Select Ports modal', { alt: 'bot', selectPorts: true }],
    ['none', 'Results without alternative routes', { alt: 'none' }],
    ['nearby', 'No exact route · offers for nearby ports', { alt: 'none', nearby: true }],
    ['sent', 'Quote request sent', { alt: 'none', nearby: true, requestSent: true }],
    ['error', 'Error notification · Try again', { boot: true, error: true }],
    ['empty', 'No quotes match your filters', { empty: true }],
  ]],
  ['Quote details', [
    ['schedules', 'Schedules · cutoffs & route legs', { tab: 'schedules' }],
    ['breakdown', 'Breakdown', { tab: 'breakdown' }],
    ['accessorials', 'Accessorials / Penalty charges', { tab: 'accessorials' }],
    ['free', 'Free Time', { tab: 'free' }],
    ['excluded', 'FAK Exceptions', { tab: 'excluded' }],
    ['roll', 'Roll Shipment', { roll: true }],
  ]],
  ['New Booking', [
    ['team', 'Team (operator view)', { booking: 'operator', step: 'Team' }],
    ['agreement', 'Agreement (client view)', { booking: 'client', step: 'Agreement' }],
    ['summary', 'Summary (client view)', { booking: 'client', step: 'Summary' }],
    ['booking', 'Whole booking flow from Quote', { booking: 'client', step: 'Quote' }],
  ]],
];
const SCREEN = Object.fromEntries(SCREENS.flatMap(([, l]) => l.map(([k, t, s]) => [k, { t, s }])));
const readScreen = () => { const k = new URLSearchParams(location.hash.slice(1)).get('screen'); return SCREEN[k] ? k : 'new'; };

/* Schedules/App menu · collapsed + Schedules/Global header (Vessel Schedules v2) */
const svgIc = (src) => <img src={src} width={14} height={14} alt="" />;
const RAIL = [
  [<I.FileSearchOutlined />, 'Quote requests', true], [<I.HomeOutlined />, 'Overview'], [<I.CompassOutlined />, 'Tracking'], [<I.FileAddOutlined />, 'New shipment'],
  [<I.MessageOutlined />, 'Messages'], [svgIc('assets/shell/containers.svg'), 'Containers'], [svgIc('assets/shell/ship.svg?v=2'), 'Vessel schedules'],
  [<I.BankOutlined />, 'Finances'], [<I.ContactsOutlined />, 'Contact Book'], [<I.StockOutlined />, 'Analytics'], [<I.FundOutlined />, 'Reports'],
];
function Shell({ children }) {
  return (
    <div className="app">
      <nav className="rail">
        <div className="rail-logo"><img src="assets/shell/logo.svg" width={36} height={36} alt="Skypace" /></div>
        {RAIL.map(([ic, t, on]) => (
          <div className="rail-item" key={t}><Tooltip title={t} placement="right"><button className={on ? 'active' : ''} aria-label={t}>{ic}</button></Tooltip></div>
        ))}
      </nav>
      <div className="main">
        <header className="topbar">
          <Breadcrumb items={[{ title: 'Home' }, { title: 'Quote requests' }, { title: 'New quote request' }]} />
          <div className="topbar-actions">
            <Tooltip title="Feedback"><Button shape="round" icon={<I.LikeOutlined />} aria-label="Feedback" /></Tooltip>
            <Tooltip title="Chat"><Button shape="round" icon={<I.MessageOutlined />} aria-label="Chat" /></Tooltip>
            <Avatar icon={<I.UserOutlined />} style={{ background: '#6a6f88' }} />
          </div>
        </header>
        <main className="panel">{children}</main>
      </div>
    </div>
  );
}

function ScreenSwitcher({ screen, go }) {
  const [open, setOpen] = useState(false);
  let n = 0;
  const list = (
    <div className="scr-list">
      {SCREENS.map(([g, items]) => (
        <div key={g}><div className="g">{g}</div>
          {items.map(([k, t]) => { n += 1; return <div key={k} className={'i' + (k === screen ? ' on' : '')} onClick={() => { go(k); setOpen(false); }}><span className="n">{n}</span>{t}</div>; })}
        </div>
      ))}
    </div>
  );
  return (
    <Popover content={list} trigger="click" open={open} onOpenChange={setOpen} placement="topRight" title="Screens from Figma">
      <Button className="screens-btn" shape="round" size="large" color="default" variant="solid" icon={<I.AppstoreOutlined />}>Screens</Button>
    </Popover>
  );
}

function QuotesApp() {
  const [screen, setScreen] = useState(readScreen);
  const [nonce, setNonce] = useState(0);
  const [q, setQ] = useState(() => formToQuery(SAMPLE_FORM));
  const [booking, setBooking] = useState(null);
  const [roll, setRoll] = useState(false);
  const sc = SCREEN[screen].s;
  const sample = useMemo(() => { const o = makeQuotes(DEFAULT_Q, 0)[0]; return { o, total: quoteTotal(o, DEFAULT_Q, ['freight']) }; }, []);
  useEffect(() => {
    const on = () => { setScreen(readScreen()); setNonce((x) => x + 1); };
    addEventListener('hashchange', on); return () => removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    setRoll(!!sc.roll);
    setBooking(sc.booking ? { quote: sample, role: sc.booking, step: sc.step } : null);
    if (!sc.booking) setQ(formToQuery(sc.query || SAMPLE_FORM));
    scrollTo(0, 0);
  }, [screen, nonce]);
  const go = (k) => { if (k === screen) setNonce((x) => x + 1); location.hash = 'screen=' + k; };
  return (
    <Shell>
      <div className="page">
        <div className="page-title"><Button type="text" icon={<ChevronIcon dir="left" />} onClick={() => go('new')} aria-label="Back" /><h1>New quote request</h1></div>
        <ResultsPage key={screen + nonce} q={q} onSearch={setQ} scenario={sc} onSelect={(o, total) => setBooking({ quote: { o, total }, role: 'client', step: 'Quote' })} />
      </div>
      <RollShipment open={roll} onClose={() => setRoll(false)} q={q} />
      <BookingWizard open={!!booking} onClose={() => setBooking(null)} quote={booking?.quote} q={q} role={booking?.role} initialStep={booking?.step} />
      <ScreenSwitcher screen={screen} go={go} />
    </Shell>
  );
}

const theme = {
  token: {
    colorPrimary: '#5f68c0', colorLink: '#5f68c0', colorText: '#323656', colorTextSecondary: '#414663', colorTextTertiary: '#555a75',
    colorBorderSecondary: '#f0f0f0', colorBgSolid: '#323656', colorBgSolidHover: '#454a6e', colorBgSolidActive: '#22253d', colorInfo: '#5f68c0',
    fontFamily: 'Roboto, -apple-system, "Segoe UI", sans-serif', borderRadius: 6, borderRadiusLG: 8,
  },
  components: {
    Alert: { colorInfoBg: '#f0f1fa', colorInfoBorder: '#c3c7e6' },
    Tabs: { itemColor: '#555a75' },
    Steps: { dotSize: 8, dotCurrentSize: 10 },
  },
};
ReactDOM.createRoot(document.getElementById('root')).render(<ConfigProvider theme={theme}><AntApp><QuotesApp /></AntApp></ConfigProvider>);
