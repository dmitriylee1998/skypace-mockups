/* Skypace Container Tracking — app page.
   Two shells share this file: the public site (tracking.html) and the Shipments cabinet (app-tracking.html). */
(function () {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;
  const SP = window.SP;
  const { html, A, ic, store, useStore, SHIPMENTS, BY_NUMBER, LIMIT, LOC, C } = SP;
  const SHELL = window.TRACKING_SHELL || 'site';
  // ?embed=1: map + panel only (no site header/footer), for the «Show on map» drawer in the Skypace prototype; ?tab= opens that tab
  const EMBED = new URLSearchParams(location.search).get('embed') === '1';
  if (EMBED) document.documentElement.classList.add('trk-embed');

  const useMedia = (q) => {
    const [m, setM] = useState(() => window.matchMedia(q).matches);
    useEffect(() => { const mq = window.matchMedia(q); const f = () => setM(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, [q]);
    return m;
  };

  /* ---------------- Auth & limit modals (Figma: Skypace | Sign in – Sign up, node 9001:8092) ---------------- */
  function ModalHead({ title, text }) {
    return html`<div className="spm-head"><${A.Typography.Title} level=${3}>${title}<//><${A.Typography.Paragraph}>${text}<//></div>`;
  }

  function AuthModal({ open, onClose, onDone, pending }) {
    const [mode, setMode] = useState('signin');
    const signin = mode === 'signin';
    return html`<${A.Modal} open=${open} onCancel=${onClose} footer=${null} width=${384} centered destroyOnHidden className="sp-modal">
      <${ModalHead} title=${signin ? 'Sign in to track shipments' : 'Create a free account'}
        text=${pending ? `Sign in and we'll track ${pending} right away. Free accounts get 5 searches a day.` : 'Container tracking is free with a Skypace account: 5 searches a day, saved shipments and live updates.'} />
      <${A.Form} layout="vertical" requiredMark=${false} onFinish=${onDone} className="spm-form">
        ${!signin && html`<${A.Form.Item} label="Company name" name="company"><${A.Input} size="large" id="auth-company" /><//>`}
        <${A.Form.Item} label="Work email" name="email"><${A.Input} size="large" id="auth-email" /><//>
        <${A.Form.Item} name="password" label=${signin
          ? html`<span className="spm-label">Password<${A.Button} type="link" size="small" className="spm-forgot">Forgot password?<//></span>`
          : 'Password'}>
          <${A.Input.Password} size="large" id="auth-pass" />
        <//>
        <${A.Button} type="primary" size="large" block htmlType="submit">${signin ? 'Sign in' : 'Create account'}<//>
      <//>
      <${A.Typography.Paragraph} className="spm-foot">${signin
        ? html`New to Skypace? <a href="#" onClick=${(e) => { e.preventDefault(); setMode('signup'); }}>Create an account</a>`
        : html`Already have an account? <a href="#" onClick=${(e) => { e.preventDefault(); setMode('signin'); }}>Sign in</a>`}<//>
    <//>`;
  }

  function LimitModal({ open, onClose }) {
    const rc = SP.useResetCountdown();
    return html`<${A.Modal} open=${open} onCancel=${onClose} footer=${null} width=${384} centered className="sp-modal">
      <${ModalHead} title=${`You've used all ${LIMIT} free searches`}
        text=${html`Free searches are limited to ${LIMIT} a day. New searches unlock in <b className="tnum">${rc.long}</b>. Shipments in your list keep updating.`} />
      <div style=${{ display: 'grid', gap: 16 }}>
        <${A.Button} type="primary" size="large" block onClick=${onClose}>Ship with Skypace<//>
        <${A.Typography.Paragraph} className="spm-foot" style=${{ margin: 0 }}>Need more searches? <a href="#" onClick=${(e) => { e.preventDefault(); onClose(); }}>Talk to sales</a><//>
      </div>
    <//>`;
  }

  /* ---------------- List view pieces ---------------- */
  function ShipmentCard({ s, hot, onOpen, onHover }) {
    const sm = SP.summarize(s);
    const arrived = s.status === 'delivered' || s.status === 'discharged';
    const via = s.stops.find((x) => /Canal|Transship/.test(x.role));
    return html`<button className=${'shp-card' + (hot ? ' is-hot' : '')} onClick=${() => onOpen(s.id)} onMouseEnter=${() => onHover(s.id)} onMouseLeave=${() => onHover(null)} onFocus=${() => onHover(s.id)} onBlur=${() => onHover(null)}>
      <div className="shp-head">
        <${SP.CarrierBadge} code=${s.carrier} size="lg" />
        <div style=${{ minWidth: 0 }}>
          <div className="num">${s.number}</div>
          <div className="sub"><span>${SP.CARRIERS[s.carrier].name}</span><i></i><span>${s.kind === 'bl' ? `B/L, ${s.containers.length} containers` : s.type.replace(' Dry', '')}</span></div>
        </div>
        <div className="tags"><${SP.StatusTag} s=${s} /></div>
      </div>
      <div className="shp-lane">
        <span>${sm.from}</span><span className="dash"></span>
        ${via ? html`<span className="via">via ${LOC[via.loc].city}</span><span className="dash"></span>` : null}
        <span>${sm.to}</span>
      </div>
      <${SP.LaneBar} s=${s} />
      <div className="shp-foot">
        <${A.Tag}>${arrived ? `ATA ${SP.fmtShort(s.ata)}` : `ETA ${SP.fmtShort(s.eta)}`}<//>
        <span>${ic('SyncOutlined')} ${SP.ago(s.updatedMin)}</span>
      </div>
    </button>`;
  }

  function Gate({ onLogin }) {
    return html`<div className="blk blk-pad">
      <div style=${{ width: 40, height: 40, borderRadius: '50%', background: C.primary1, color: C.primary, display: 'grid', placeItems: 'center', fontSize: 18, marginBottom: 12 }}>${ic('LockOutlined')}</div>
      <${A.Typography.Title} level=${4} className="blk-title">Log in to start tracking<//>
      <${A.Typography.Paragraph} className="muted" style=${{ margin: '6px 0 14px', lineHeight: 1.5 }}>Tracking is part of your free Skypace account. Type a number above, log in, and we'll open it right away.<//>
      <div style=${{ display: 'flex', gap: 8 }}><${A.Button} type="primary" onClick=${onLogin} style=${{ flex: 1 }}>Log in<//><${A.Button} onClick=${onLogin} style=${{ flex: 1 }}>Create free account<//></div>
    </div>`;
  }

  function Loading({ query, carrier }) {
    const d = SP.detect(query) || {};
    const [step, setStep] = useState(0);
    useEffect(() => { const ts = [350, 800, 1250].map((ms, i) => setTimeout(() => setStep(i + 1), ms)); return () => ts.forEach(clearTimeout); }, []);
    const cname = carrier !== 'AUTO' ? SP.CARRIERS[carrier].name : d.carrier ? SP.CARRIERS[d.carrier].name : 'by number lookup';
    const steps = [`Recognised ${d.kind === 'bl' ? 'bill of lading' : 'container number'}`, `Carrier: ${cname}`, 'Collecting events from the carrier', 'Drawing the route'];
    return html`<div className="blk loading-steps" aria-live="polite">
      <div className="mono" style=${{ fontSize: 16, fontWeight: 500 }}>${query}</div>
      ${steps.map((t, i) => html`<div key=${i} className=${'st ' + (i < step ? 'ok' : i === step ? 'on' : '')}>${i < step ? ic('CheckCircleFilled') : i === step ? html`<${A.Spin} size="small" />` : ic('ClockCircleOutlined')} ${t}</div>`)}
      <${A.Skeleton} active paragraph=${{ rows: 3 }} title=${false} />
    </div>`;
  }

  function NotFound({ query, onBack, onPickCarrier }) {
    return html`<div className="blk blk-pad" style=${{ display: 'grid', gap: 14 }}>
      <div style=${{ width: 40, height: 40, borderRadius: '50%', background: C.layout, display: 'grid', placeItems: 'center', fontSize: 18 }}>${ic('FileSearchOutlined')}</div>
      <div><${A.Typography.Title} level=${3} className="blk-title">No shipment found<//><div className="mono" style=${{ marginTop: 4, fontWeight: 500 }}>${query}</div></div>
      <div style=${{ fontSize: 14, lineHeight: "22px" }}>
        <ul style=${{ margin: 0, paddingLeft: 18 }}>
          <li>Carriers publish new bookings 24–48 h after gate-in.</li>
          <li>Leasing boxes (TCNU, TGHU, FCIU…) are easier to find with the carrier selected.</li>
          <li>This search didn't use your daily limit.</li>
        </ul>
      </div>
      <div style=${{ display: 'flex', gap: 8 }}><${A.Button} type="primary" onClick=${onPickCarrier}>Choose carrier<//><${A.Button} onClick=${onBack}>Back to shipments<//></div>
    </div>`;
  }

  /* ---------------- Detail ---------------- */
  // Expand/collapse arrow, as in Planning: Figma glyph «Outlined/right» rotated up/down, fontSizeLG, colorIcon
  const CHEVRON_PATH = 'M5.95622 12.1674C5.95622 11.9542 6.02597 11.7409 6.16548 11.5784L9.23077 8.00077L6.16381 4.42265C5.88479 4.09713 5.88479 3.56978 6.16381 3.24426C6.44283 2.91874 6.89483 2.91874 7.17385 3.24426L10.7453 7.41093C11.0243 7.73645 11.0243 8.26379 10.7453 8.58931L7.17385 12.756C6.89483 13.0815 6.44283 13.0815 6.16381 12.756C6.02541 12.5945 5.95622 12.381 5.95622 12.1674Z';
  const ChevronIcon = ({ dir = 'right' }) => html`<span role="img" className="anticon" style=${{ fontSize: 16, color: C.breadcrumb }}><svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" style=${{ transform: `rotate(${({ right: 0, down: 90, left: 180, up: -90 })[dir]}deg)` }}><path d=${CHEVRON_PATH} /></svg></span>`;
  const ExpandArrow = ({ open }) => html`<${ChevronIcon} dir=${open ? 'up' : 'down'} />`;

  // Route in the Planning style: rail (1px line + 8px dot), grey stop cards, transport rows with a ringed icon
  function RouteTimeline({ s }) {
    const all = s.stops.flatMap((st) => st.events);
    const lastPast = [...all].reverse().find((e) => SP.isPast(e.at));
    const [closed, setClosed] = useState({});
    const last = s.stops.length - 1;
    const rows = [];
    s.stops.forEach((st, i) => {
      const reached = st.events.some((e) => SP.isPast(e.at));
      const leg = s.legs[i];
      const legStarted = !!leg && leg.p > 0;
      const prevLeg = s.legs[i - 1];
      const prevStarted = i > 0 && !!prevLeg && prevLeg.p > 0;
      const open = !closed[i];
      const toggle = () => setClosed({ ...closed, [i]: open });
      rows.push(html`<div className="r-row" key=${'s' + i}>
        <div className="r-rail">
          <div className=${'r-line' + (i === 0 ? ' hidden' : '') + (prevStarted && reached ? '' : ' pale')} style=${{ height: 20 }}></div>
          <div className=${'r-dot' + (reached ? '' : ' pale')}></div>
          <div className=${'r-line fill' + (i === last ? ' hidden' : '') + (legStarted ? '' : ' pale')}></div>
        </div>
        <div className="r-body">
          <div className="stop" role="button" tabIndex=${0} aria-expanded=${open} onClick=${toggle} onKeyDown=${(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}>
            <div style=${{ flex: 1, minWidth: 0 }}>
              <div className="name">${SP.place(st.loc)}</div>
              <div className="meta"><span>${st.role}</span><span>${st.terminal}</span></div>
            </div>
            <${A.Button} type="text" aria-label=${open ? 'Collapse' : 'Expand'} icon=${html`<${ExpandArrow} open=${open} />`} />
          </div>
          ${open && html`<div className="stop-detail">
            ${st.events.map((e, j) => {
              const past = SP.isPast(e.at);
              return html`<div key=${j} className=${'ev' + (past ? '' : ' todo') + (e === lastPast ? ' now' : '')}>
                <span>${e.t}${!past ? html`<span className="est">Est.</span>` : null}</span>
                <span className="when">${e.was ? html`<s>${SP.fmtShort(e.was)}</s>` : null}${SP.fmtShort(e.at)}, ${SP.fmtTime(e.at)}</span>
              </div>`;
            })}
          </div>`}
        </div>
      </div>`);
      if (st.next) {
        const Mode = SP.MODE_ICON[st.next.mode];
        rows.push(html`<div className="r-row t-row" key=${'t' + i}>
          <div className="r-rail">
            <div className=${'r-line' + (legStarted ? '' : ' pale')} style=${{ height: 6 }}></div>
            <div className=${'t-ico' + (legStarted ? '' : ' pale')}><${Mode} /></div>
            <div className=${'r-line fill' + (leg && leg.p >= 1 ? '' : ' pale')} style=${{ minHeight: 6 }}></div>
          </div>
          <div className="transport">${st.next.label}</div>
        </div>`);
      }
    });
    return html`<div className="route">${rows}</div>`;
  }

  function Details({ s }) {
    const pol = s.stops.find((x) => /loading/.test(x.role)) || s.stops[0];
    const pod = s.stops.find((x) => /discharge/.test(x.role)) || s.stops[s.stops.length - 1];
    const del = s.stops[s.stops.length - 1];
    const items = [
      s.kind === 'container' && ['Size / type', `${s.type}, ISO ${s.iso}`],
      ['Carrier', SP.CARRIERS[s.carrier].name],
      ['Bill of lading', html`<span className="mono">${s.kind === 'bl' ? s.number : s.bl}</span>`],
      ['Booking', html`<span className="mono">${s.booking}</span>`],
      ['Vessel', `${s.vessel.name}, ${s.vessel.voyage}`],
      ['IMO / flag', `${s.vessel.imo}, ${s.vessel.flag}`],
      ['Port of loading', SP.place(pol.loc)],
      ['Port of discharge', SP.place(pod.loc)],
      del !== pod && ['Place of delivery', SP.place(del.loc)],
      ['ATD', SP.fmtDate(s.atd)],
      [s.ata ? 'ATA' : 'ETA', SP.fmtDate(s.ata || s.eta)],
      s.kind === 'bl' && ['Containers', `${s.containers.length}, ${s.containers.map((c) => SHIPMENTS[c].type.split(' ')[0]).join(', ')}`],
    ].filter(Boolean).map(([label, children], i) => ({ key: String(i), label, children }));
    return html`<div style=${{ padding: '12px 16px 20px' }}><${A.Descriptions} column=${1} size="small" items=${items} labelStyle=${{ color: C.secondary, width: 140 }} /></div>`;
  }

  function lastEvent(c) {
    return c.stops.flatMap((st) => st.events.map((e) => Object.assign({ loc: st.loc }, e))).filter((e) => SP.isPast(e.at)).pop();
  }

  // Figma «Tracking/Container row» (mZKwMgdnqq2tyNrTukYf6m 10001:2768): icon plate, number + size tag, status tag, chevron
  const sizeShort = (type) => type.replace(/'.*/, "'") + (/High Cube/.test(type) ? 'HC' : /Reefer/.test(type) ? 'RF' : 'DV');
  function Containers({ bl, onOpen }) {
    const list = bl.containers.map((id) => SHIPMENTS[id]);
    return html`<div className="ctr-list">
      ${list.map((c) => {
        const st = SP.summarize(c).st;
        return html`<button key=${c.id} type="button" className="ctr-row" onClick=${() => onOpen(c.id)}>
          <span className="ic"><img src="assets/icons/containers.svg" width="16" height="16" alt="" /></span>
          <span className="txt">
            <span className="line"><${A.Typography.Text} strong>${c.number}<//><${A.Tag} variant="filled">${sizeShort(c.type)}<//></span>
            <${A.Tag} variant="filled" color=${st.color === 'blue' ? undefined : st.color} style=${st.color === 'blue' ? { background: C.primary1, color: C.primary } : null}>${st.label}<//>
          </span>
          <img className="chev" src="assets/icons/right.svg" width="20" height="20" alt="" />
        </button>`;
      })}
    </div>`;
  }

  // Switch between containers of the same B/L without going back
  function SiblingArrows({ s, onOpen }) {
    const ids = SHIPMENTS[s.parent].containers;
    const i = ids.indexOf(s.id);
    return html`<span className="dt-switch">
      <${A.Button} size="small" aria-label="Previous container" icon=${html`<${ChevronIcon} dir="left" />`} disabled=${i === 0} onClick=${() => onOpen(ids[i - 1])} />
      <${A.Button} size="small" aria-label="Next container" icon=${html`<${ChevronIcon} dir="right" />`} disabled=${i === ids.length - 1} onClick=${() => onOpen(ids[i + 1])} />
    </span>`;
  }

  function Detail({ s, fromBl, initialTab, onBack, onOpenChild, onOpenSibling, onBackToBl, onRemove, msg }) {
    const sm = SP.summarize(s);
    const [tab, setTab] = useState(initialTab || 'route');
    const [spin, setSpin] = useState(false);
    const arrived = s.status === 'delivered' || s.status === 'discharged';
    const copy = (text, label) => { try { navigator.clipboard.writeText(text).then(() => msg.success(label), () => msg.info(text)); } catch (e) { msg.info(text); } };
    const refresh = () => { setSpin(true); setTimeout(() => { setSpin(false); msg.success('Up to date'); }, 900); };
    const tabs = [
      { key: 'route', label: 'Route', children: html`<${RouteTimeline} s=${s} />` },
      s.kind === 'bl' && { key: 'ctr', label: `Containers (${s.containers.length})`, children: html`<${Containers} bl=${s} onOpen=${onOpenChild} />` },
      { key: 'info', label: 'Details', children: html`<${Details} s=${s} />` },
    ].filter(Boolean);
    const bl = fromBl ? SHIPMENTS[fromBl] : null;
    return html`<div style=${{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      ${EMBED ? (bl && html`<div className="dt-top"><div className="dt-crumbs"><${A.Button} type="text" icon=${html`<${ChevronIcon} dir="left" />`} onClick=${onBackToBl}>B/L <span className="mono" style=${{ marginLeft: 4 }}>${bl.number}</span><//></div></div>`) : html`<div className="dt-top">
        <div className="dt-crumbs">
          ${bl
            ? html`<${A.Button} type="text" icon=${html`<${ChevronIcon} dir="left" />`} onClick=${onBackToBl}>B/L <span className="mono" style=${{ marginLeft: 4 }}>${bl.number}</span><//>`
            : html`<${A.Button} type="text" icon=${html`<${ChevronIcon} dir="left" />`} onClick=${onBack}>Shipments<//>`}
        </div>
        <div style=${{ display: 'flex', gap: 2 }}>
          <${A.Tooltip} title=${`Updated ${SP.ago(s.updatedMin)}`}><${A.Button} type="text" aria-label="Refresh" icon=${ic('ReloadOutlined', { spin })} onClick=${refresh} /><//>
          <${A.Tooltip} title="Copy share link"><${A.Button} type="text" aria-label="Copy share link" icon=${ic('LinkOutlined')} onClick=${() => copy(`https://skypace.com/tracking?n=${s.number}`, 'Link copied')} /><//>
          ${!bl && html`<${A.Popconfirm} title="Remove from your shipments?" okText="Remove" cancelText="Keep" onConfirm=${onRemove} placement="bottomRight">
            <${A.Button} type="text" aria-label="Remove" icon=${ic('DeleteOutlined')} />
          <//>`}
        </div>
      </div>`}
      <div className="trk-panel-scroll">
        <div className="blk blk-pad dt-head">
          ${bl && html`<${SiblingArrows} s=${s} onOpen=${onOpenSibling} />`}
          <div className="dt-id">
            <${SP.CarrierBadge} code=${s.carrier} size="lg" />
            <div className="dt-id-text">
              <div className="dt-num">
                <span className="dt-num-text" title=${s.number}>${s.number}</span>
              </div>
              <div className="dt-tags">
                <${A.Tag} className="kind-tag">${s.kind === 'bl' ? 'B/L' : bl ? `Container ${bl.containers.indexOf(s.id) + 1} of ${bl.containers.length}` : 'Container'}<//>
                <${SP.StatusTag} s=${s} />
              </div>
              <div className="dt-carrier">${SP.CARRIERS[s.carrier].name}, ${s.kind === 'bl' ? `${s.containers.length} containers` : s.type.replace(' Dry', '')}</div>
            </div>
          </div>
          <div className="dt-sep"></div>
          <div className="dt-ports">
            <div className="p"><small>From</small><b>${sm.fromCity}</b></div>
            <span></span>
            <div className="p r"><small>To</small><b>${sm.toCity}</b></div>
          </div>
          <div style=${{ margin: '12px 0 4px' }}><${SP.LaneBar} s=${s} /></div>
          <div className="dt-dates">
            <span>ATD <b>${SP.fmtShort(s.atd)}</b></span>
            <span>${arrived ? html`ATA <b>${SP.fmtShort(s.ata)}</b>` : html`ETA <b>${SP.fmtShort(s.eta)}</b>`}</span>
          </div>
        </div>

        <div className="blk dt-tabs"><${A.Tabs} activeKey=${tab} onChange=${setTab} items=${tabs} /></div>
      </div>
    </div>`;
  }

  /* ---------------- Prototype state switcher ---------------- */
  function ProtoPanel() {
    const s = useStore();
    const content = html`<div style=${{ width: 260, display: 'grid', gap: 14 }}>
      ${SHELL === 'site' && html`<div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>Logged in</span><${A.Switch} checked=${s.auth} onChange=${(v) => store.set({ auth: v })} /></div>`}
      <div><div style=${{ display: 'flex', justifyContent: 'space-between' }}><span>Searches used today</span><b className="tnum">${s.used} / ${LIMIT}</b></div>
        <${A.Slider} min=${0} max=${LIMIT} value=${s.used} onChange=${(v) => store.set({ used: v })} dots /></div>
      <${A.Button} block onClick=${() => store.set({ recent: [] })}>Empty shipment list<//>
      <${A.Button} block onClick=${() => store.reset()}>Reset demo<//>
    </div>`;
    return html`<div className="proto-fab"><${A.Popover} content=${content} title="Prototype states" trigger="click" placement="bottomRight"><${A.Button} shape="round" icon=${ic('ExperimentOutlined')}>States<//><//></div>`;
  }

  /* ---------------- Shipments cabinet shell (Figma: Skypace | Shipments) ---------------- */
  const MARK = () => window.SKY_LOGO.replace('viewBox="0 0 572 115"', 'viewBox="0 0 109 109"');
  function CabinetShell({ children }) {
    const items = [
      ['search', 'FileSearchOutlined', 'Quotes'], ['home', 'HomeOutlined', 'Home'], ['compass', 'CompassOutlined', 'Schedules'],
      ['add', 'FileAddOutlined', 'New booking'], ['chat', 'MessageOutlined', 'Messages'], ['ship', null, 'Shipments'],
      ['bank', 'BankOutlined', 'Finances'], ['contacts', 'ContactsOutlined', 'Contacts'], ['stock', 'StockOutlined', 'Analytics'], ['fund', 'FundOutlined', 'Reports'],
    ].map(([key, icon, label]) => ({
      key,
      label: html`<${A.Tooltip} title=${label} placement="right"><span className="menu-ic">${icon ? ic(icon, { style: { fontSize: 14 } }) : html`<${SP.ShipIcon} style=${{ fontSize: 15 }} />`}</span><//>`,
    }));
    return html`<div className="app-shell">
      <aside className="app-sider">
        <a className="logo" href="index.html" aria-label="Skypace home" dangerouslySetInnerHTML=${{ __html: MARK() }}></a>
        <${A.Menu} mode="vertical" selectedKeys=${['ship']} items=${items} />
      </aside>
      <div className="app-main">
        <header className="app-header">
          <${A.Breadcrumb} items=${[{ title: html`<span className="crumb-long">Home</span>` }, { title: 'Shipments' }, { title: 'Container tracking' }]} />
          <div className="tools">
            <${A.Button} shape="round" aria-label="Feedback" icon=${ic('LikeOutlined')} />
            <${A.Button} shape="round" aria-label="Messages" icon=${ic('MessageOutlined')} />
            <${A.Badge} dot offset=${[-3, 3]}><${A.Avatar} style=${{ background: C.placeholder }} icon=${ic('UserOutlined')} /><//>
          </div>
        </header>
        <div className="app-content">${children}</div>
      </div>
    </div>`;
  }

  /* ---------------- App ---------------- */
  /* ---------------- Lane rates: soft upsell from tracking to booking ----------------
     A quiet card on the map ("Ocean rates on this lane, from $X") → right drawer with Skypace
     rates for the same POL→POD → pick one → short request form → concierge confirms. */
  const EQUIP = [{ value: '20', label: "20' ST" }, { value: '40', label: "40' ST" }, { value: '40HC', label: "40' HC" }];
  const equipOf = (s) => { const t = (s.type || (s.containers && s.containers[0] && SHIPMENTS[s.containers[0]] && SHIPMENTS[s.containers[0]].type) || '').toLowerCase(); return /20'/.test(t) ? '20' : /high cube|hc/.test(t) ? '40HC' : '40'; };
  const hash = (str) => { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  function laneRates(s, equip) {
    const pol = s.stops.find((x) => /loading/.test(x.role)) || s.stops[0];
    const pod = s.stops.find((x) => /discharge/.test(x.role)) || s.stops[s.stops.length - 1];
    const seed = hash(pol.loc + pod.loc);
    const base = 1650 + (seed % 700);
    const mult = equip === '20' ? 0.62 : equip === '40HC' ? 1.04 : 1;
    const pool = [s.carrier, ...Object.keys(SP.CARRIERS).filter((k) => k !== s.carrier)];
    const picks = [pool[0], ...pool.slice(1).sort((a, b) => hash(a + seed) - hash(b + seed)).slice(0, 3)];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const rows = picks.map((code, i) => {
      const h = hash(code + seed);
      return {
        code, same: code === s.carrier,
        price: Math.round(((base + (h % 420) - 160) * mult) / 5) * 5,
        transit: 15 + (h % 9),
        dep: days[h % days.length],
        next: SP.NOW.add(2 + (h % 6), 'day'),
        valid: SP.NOW.add(14, 'day'),
        schedules: 1 + (h % 4),
        service: ['TP1', 'AAC', 'PS3', 'CEN', 'TPX', 'PNW'][h % 6],
        free: 4 + (h % 4) * 3,
      };
    });
    const min = Math.min(...rows.map((r) => r.price)); const fast = Math.min(...rows.map((r) => r.transit));
    rows.forEach((r) => { r.best = r.price === min; r.fastest = r.transit === fast; });
    return { pol: LOC[pol.loc], pod: LOC[pod.loc], polCode: pol.loc, podCode: pod.loc, rows, min };
  }
  const usd = (n) => '$' + n.toLocaleString('en-US');

  function RatesTeaser({ s, onOpen, compact }) {
    const [state, setState] = useState('hidden'); // hidden → card → pill
    useEffect(() => { setState('hidden'); const t = setTimeout(() => setState(compact ? 'pill' : 'card'), 1400); return () => clearTimeout(t); }, [s.id]);
    const eq = equipOf(s); const r = useMemo(() => laneRates(s, eq), [s.id]);
    const again = s.status === 'delivered' || s.status === 'discharged';
    if (state === 'hidden') return null;
    if (state === 'pill') return html`<button className="rates-pill" onClick=${onOpen} aria-label="Open ocean rates for this lane">${ic('DollarOutlined')}<span>Rates from <b>${usd(r.min)}</b></span></button>`;
    return html`<div className="rates-teaser" role="complementary" aria-label="Ocean rates on this lane">
      <button className="rt-close" aria-label="Hide" onClick=${() => setState('pill')}>${ic('CloseOutlined')}</button>
      <div className="rt-eyebrow">${again ? 'Ship this lane again' : 'Ocean rates on this lane'}</div>
      <div className="rt-lane">${r.pol.city} <span>→</span> ${r.pod.city}</div>
      <div className="rt-row">
        <div><span className="rt-from">from</span> <b className="rt-price">${usd(r.min)}</b> <span className="rt-eq">/ ${EQUIP.find((e) => e.value === eq).label}</span></div>
        <${A.Button} size="small" type="primary" onClick=${onOpen}>View rates<//>
      </div>
      <div className="rt-logos">${r.rows.map((x) => html`<${SP.CarrierBadge} key=${x.code} code=${x.code} />`)}<span>${r.rows.length} carriers, updated today</span></div>
    </div>`;
  }

  function RateCard({ x, r, onSelect }) {
    const arr = x.next.add(x.transit, 'day');
    return html`<div className="rc">
      <div className="rc-main">
        <div className="rc-left">
          <div className="rc-head">
            <span className="rc-logo"><${SP.CarrierBadge} code=${x.code} /></span>
            <b className="rc-name">${SP.CARRIERS[x.code].name}</b>
            <span className="rc-chips">
              ${x.best && html`<span className="rc-chip is-spot">${ic('ThunderboltOutlined')} Spot quote</span>`}
              ${x.same && !x.best && html`<span className="rc-chip">Your carrier</span>`}
              <span className="rc-chip">Book by: ${x.next.subtract(3, 'day').format('D MMM')}</span>
            </span>
          </div>
          <div className="rc-route">
            <div><span className="rc-city">${r.pol.city}, ${r.pol.cc}</span><b>${x.next.format('D MMM')}</b></div>
            <div className="rc-line"><span>~ ${x.transit}<i> day(s)</i><i className="sm">d</i></span></div>
            <div className="rc-end"><span className="rc-city">${r.pod.city}, ${r.pod.cc}</span><b>${arr.format('D MMM')}</b></div>
          </div>
        </div>
        <div className="rc-right">
          <div className="rc-price">${usd(x.price)} <${A.Tooltip} title="All-in, port to port, per container">${ic('InfoCircleOutlined')}<//></div>
          <${A.Button} type="primary" block onClick=${onSelect}>Select<//>
        </div>
      </div>
    </div>`;
  }

  function RatesDrawer({ s, open, onClose, isMobile, msg }) {
    const [eq, setEq] = useState(() => equipOf(s));
    const [sort, setSort] = useState('price');
    const [pick, setPick] = useState(null);
    const [step, setStep] = useState('rates'); // rates → form → sent
    const [form] = A.Form.useForm();
    useEffect(() => { setEq(equipOf(s)); setPick(null); setStep('rates'); }, [s.id]);
    useEffect(() => { if (open && step === 'sent') setStep('rates'); }, [open]);
    const r = useMemo(() => laneRates(s, eq), [s.id, eq]);
    const rows = [...r.rows].sort((a, b) => (sort === 'price' ? a.price - b.price : a.transit - b.transit));
    const sel = r.rows.find((x) => x.code === pick) || null;
    const eqLabel = EQUIP.find((e) => e.value === eq).label;

    const title = step === 'form'
      ? html`<span className="rd-title"><${A.Button} type="text" size="small" icon=${html`<${ChevronIcon} dir="left" />`} aria-label="Back to rates" onClick=${() => setStep('rates')} /> Request shipment</span>`
      : html`<span className="rd-title">Ocean rates</span>`;

    let body, footer = null;
    if (step === 'sent') {
      body = html`<${A.Result} status="success" title="Request sent"
        subTitle=${html`<span>Anna, your logistics concierge, will confirm space and the final price for <b>${r.pol.city} → ${r.pod.city}</b> within ~5 minutes.</span>`}
        extra=${[html`<${A.Button} key="d" type="primary" onClick=${onClose}>Done<//>`]} />`;
    } else if (step === 'form') {
      body = html`<div className="rd-body">
        <div className="rd-summary">
          <${SP.CarrierBadge} code=${sel.code} size="lg" />
          <div className="rd-sum-main"><b>${SP.CARRIERS[sel.code].name}</b><span>${r.pol.city} → ${r.pod.city}, ${eqLabel}, ${sel.transit} days</span></div>
          <b className="rd-sum-price">${usd(sel.price)}</b>
        </div>
        <${A.Form} form=${form} layout="vertical" requiredMark=${false} initialValues=${{ qty: 1, ready: SP.NOW.add(7, 'day'), door: [] }}
          onFinish=${() => { setStep('sent'); msg.success('Request sent to your concierge'); }}>
          <div className="rd-grid">
            <${A.Form.Item} name="ready" label="Cargo ready" rules=${[{ required: true }]}><${A.DatePicker} style=${{ width: '100%' }} format="DD MMM YYYY" /><//>
            <${A.Form.Item} name="qty" label="Containers"><${A.InputNumber} min=${1} max=${99} style=${{ width: '100%' }} addonAfter=${eqLabel} /><//>
          </div>
          <${A.Form.Item} name="commodity" label="Commodity" rules=${[{ required: true, message: 'Tell us what you ship' }]}><${A.Input} placeholder="e.g. Furniture, HS 9403" /><//>
          <${A.Form.Item} name="door" label="Add inland services"><${A.Checkbox.Group} options=${[{ label: `Pickup in ${r.pol.city}`, value: 'pickup' }, { label: `Delivery from ${r.pod.city}`, value: 'delivery' }, { label: 'Customs clearance', value: 'customs' }]} /><//>
          <${A.Form.Item} name="note" label="Comment" style=${{ marginBottom: 0 }}><${A.Input.TextArea} rows=${3} placeholder="Anything we should know" /><//>
        </${A.Form}>
      </div>`;
      footer = html`<div className="rd-foot"><div className="rd-foot-note">No payment now. Final price is confirmed by your concierge.</div><${A.Button} type="primary" size="large" block onClick=${() => form.submit()}>Send request<//></div>`;
    } else {
      body = html`<div className="rd-body">
        <div className="rd-lane">
          <div><span className="lbl">From</span><b>${r.pol.city}</b><span className="ctry">${r.polCode}, port of loading</span></div>
          <span className="rd-arrow">${ic('ArrowRightOutlined')}</span>
          <div style=${{ textAlign: 'right' }}><span className="lbl">To</span><b>${r.pod.city}</b><span className="ctry">${r.podCode}, port of discharge</span></div>
        </div>
        <${A.Segmented} block value=${eq} onChange=${(v) => { setEq(v); setPick(null); }} options=${EQUIP} />
        <div className="rd-bar"><span>${rows.length} offers, port to port, updated today</span>
          <${A.Segmented} size="small" value=${sort} onChange=${setSort} options=${[{ label: 'Cheapest', value: 'price' }, { label: 'Fastest', value: 'transit' }]} /></div>
        <div className="rd-list">
          ${rows.map((x) => html`<${RateCard} key=${x.code} x=${x} r=${r} onSelect=${() => { setPick(x.code); setStep('form'); }} />`)}
        </div>
      </div>`;
    }

    return html`<${A.Drawer} open=${open} onClose=${onClose} title=${title} placement=${isMobile ? 'bottom' : 'right'}
      size=${isMobile ? '88%' : 520} height=${isMobile ? '88%' : undefined} width=${isMobile ? undefined : 520}
      mask=${isMobile} getContainer=${false} closable=${false} extra=${html`<${A.Button} type="text" size="small" icon=${ic('CloseOutlined')} aria-label="Close rates" onClick=${onClose} />`} rootClassName="rates-drawer" footer=${footer} destroyOnHidden=${false}>
      ${body}
    <//>`;
  }

  function TrackingApp() {
    const s = useStore();
    const { message: msg } = A.App.useApp();
    const isMobile = useMedia('(max-width: 767px)');
    const params = useMemo(() => new URLSearchParams(location.search), []);
    const authed = true; // prototype: no sign-in gate
    const [q, setQ] = useState(() => (params.get('q') || '').toUpperCase());
    const firstTab = useRef(params.get('tab') || undefined);
    const [carrier, setCarrier] = useState(() => params.get('c') || 'AUTO');
    const [err, setErr] = useState(null);
    const [view, setView] = useState({ name: 'list' });
    const [hot, setHot] = useState(null);
    const [refit, setRefit] = useState(0);
    const [mapView, setMapView] = useState('globe');
    const [ratesOpen, setRatesOpen] = useState(false);
    const ratesRef = useRef(false);
    useEffect(() => { ratesRef.current = ratesOpen && !isMobile; setRefit((n) => n + 1); }, [ratesOpen]);
    const [auth, setAuth] = useState({ open: false, pending: null });
    const [limitOpen, setLimitOpen] = useState(false);
    const [sheetH, setSheetH] = useState(null);
    const [dragging, setDragging] = useState(false);
    const panelRef = useRef(); const mainRef = useRef(); const inputRef = useRef();

    const list = authed ? s.recent.map((id) => SHIPMENTS[id]).filter(Boolean) : [];
    const focus = view.name === 'detail' ? SHIPMENTS[view.id] : null;

    // open(id): a container that belongs to a saved B/L opens inside that B/L's context
    const open = useCallback((id, opts = {}) => {
      const sh = SHIPMENTS[id];
      const fromBl = opts.fromBl !== undefined ? opts.fromBl : sh.parent && store.get().recent.includes(sh.parent) ? sh.parent : null;
      setView({ name: 'detail', id, fromBl, tab: opts.tab || firstTab.current });
      firstTab.current = undefined;
      setHot(null);
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const run = useCallback((query, c) => {
      const d = SP.detect(query);
      if (!d) { setErr('Enter a container or B/L number'); return; }
      if (d.partial) { setErr('This number looks incomplete'); return; }
      if (!d.valid) { setErr(d.msg); return; }
      setErr(null);
      const id = BY_NUMBER[SP.norm(query)];
      const st = store.get();
      const known = id && (st.recent.includes(id) || (SHIPMENTS[id].parent && st.recent.includes(SHIPMENTS[id].parent)));
      if (known) { open(id); setQ(''); return; }
      setView({ name: 'loading', query: SP.norm(query), carrier: c });
      setTimeout(() => {
        if (id) {
          store.set((x) => ({ used: x.used + 1, recent: [id, ...x.recent.filter((r) => r !== id)] }));
          open(id, { fromBl: null }); setQ('');
        } else setView({ name: 'notfound', query: SP.norm(query) });
      }, 1700);
    }, [open]);

    useEffect(() => { if (params.get('q')) run(params.get('q'), params.get('c') || 'AUTO'); }, []);

    const doLogin = () => {
      const pending = auth.pending;
      store.set({ auth: true });
      setAuth({ open: false, pending: null });
      if (pending) setTimeout(() => run(pending, carrier), 50);
    };

    // mobile bottom sheet
    const snaps = () => { const H = mainRef.current ? mainRef.current.clientHeight : 600; return [Math.min(250, H * 0.36), H * 0.56, H - 12]; };
    useEffect(() => { if (isMobile) setSheetH(snaps()[1]); }, [isMobile, view.name, view.id]);
    const drag = useRef(null);
    const onDown = (e) => { drag.current = { y: e.clientY, h: panelRef.current.getBoundingClientRect().height, moved: false }; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); };
    const onMove = (e) => { if (!drag.current) return; const dy = e.clientY - drag.current.y; if (Math.abs(dy) > 4) drag.current.moved = true; const [a, , c] = snaps(); setSheetH(Math.min(c, Math.max(a * 0.7, drag.current.h - dy))); };
    const onUp = () => {
      if (!drag.current) return; const sn = snaps(); const cur = panelRef.current.getBoundingClientRect().height;
      let next = sn.reduce((b, v) => (Math.abs(v - cur) < Math.abs(b - cur) ? v : b), sn[0]);
      if (!drag.current.moved) { const i = sn.findIndex((v) => Math.abs(v - cur) < 8); next = sn[(i + 1) % sn.length]; }
      drag.current = null; setDragging(false); setSheetH(next);
    };

    const padding = () => {
      if (isMobile) return { top: 40, right: 64, left: 28, bottom: (sheetH || 300) + 24 };
      const r = panelRef.current ? panelRef.current.getBoundingClientRect().width : 440;
      return { top: 56, right: ratesRef.current ? 600 : 150, bottom: 56, left: r + 72 };
    };

    const search = html`<div className="blk search-blk"><${SP.SearchBox} value=${q} onChange=${(v) => { setQ(v); setErr(null); }} carrier=${carrier} onCarrier=${setCarrier}
      onSubmit=${() => run(q, carrier)} error=${err} loading=${view.name === 'loading'} inputRef=${inputRef} examples=${!authed || list.length < 3} /></div>`;

    let body;
    if (view.name === 'detail' && focus) {
      body = html`<${Detail} key=${focus.id} s=${focus} fromBl=${view.fromBl} initialTab=${view.tab} msg=${msg}
        onBack=${() => setView({ name: 'list' })}
        onOpenChild=${(id) => open(id, { fromBl: focus.id })}
        onOpenSibling=${(id) => open(id, { fromBl: view.fromBl })}
        onBackToBl=${() => open(view.fromBl, { fromBl: null, tab: 'ctr' })}
        onRemove=${() => { store.set((x) => ({ recent: x.recent.filter((r) => r !== focus.id) })); setView({ name: 'list' }); msg.success('Removed from your shipments'); }} />`;
    } else {
      body = html`<div className="trk-panel-scroll">
        ${search}
        ${view.name === 'loading' ? html`<${Loading} query=${view.query} carrier=${view.carrier} />`
          : view.name === 'notfound' ? html`<${NotFound} query=${view.query} onBack=${() => setView({ name: 'list' })} onPickCarrier=${() => { setView({ name: 'list' }); setQ(view.query); setTimeout(() => { const el = document.getElementById('trk-c-panel'); el && el.focus(); }, 50); }} />`
          : !authed ? html`<${Gate} onLogin=${() => setAuth({ open: true, pending: SP.detect(q) && SP.detect(q).valid ? SP.norm(q) : null })} />`
          : html`<${React.Fragment}>
              ${list.length ? list.map((x) => html`<${ShipmentCard} key=${x.id} s=${x} hot=${hot === x.id} onOpen=${open} onHover=${setHot} />`)
                : html`<div className="blk empty-list">${ic('InboxOutlined', { style: { fontSize: 28, color: C.n5 } })}<div style=${{ marginTop: 8 }}>No shipments yet. Track a container or B/L above and it will stay here.</div></div>`}
            <//>`}
      </div>`;
    }

    const app = html`<main className=${'trk' + (ratesOpen && !isMobile ? ' has-rates' : '')} ref=${mainRef}>
      <${SP.MapView} mode=${focus ? 'focus' : 'overview'} list=${list} focus=${focus} hot=${hot} onPick=${(id) => open(id)} onHover=${setHot} padding=${padding} refitKey=${refit} view=${mapView} onView=${setMapView} />
      <aside ref=${panelRef} className=${'trk-panel' + (dragging ? ' is-dragging' : '')} style=${isMobile && sheetH ? { '--sheet-h': sheetH + 'px' } : null} aria-label="Shipment tracking">
        <div className="sheet-handle" onPointerDown=${onDown} onPointerMove=${onMove} onPointerUp=${onUp} onPointerCancel=${onUp} role="button" aria-label="Resize panel" tabIndex="0"><span></span></div>
        ${body}
      </aside>
      ${!EMBED && focus && authed && !ratesOpen && html`<${RatesTeaser} key=${'t' + focus.id} s=${focus} compact=${isMobile} onOpen=${() => setRatesOpen(true)} />`}
      ${!EMBED && focus && authed && html`<${RatesDrawer} s=${focus} open=${ratesOpen} onClose=${() => setRatesOpen(false)} isMobile=${isMobile} msg=${msg} />`}
    </main>`;

    return html`<${React.Fragment}>
      ${EMBED ? app : SHELL === 'app'
        ? html`<${CabinetShell}>${app}<//>`
        : html`<${React.Fragment}><${SP.Header} onLogin=${() => setAuth({ open: true, pending: null })} />${app}<${SP.Footer} /><//>`}
      <${AuthModal} open=${auth.open} pending=${auth.pending} onClose=${() => setAuth({ open: false, pending: null })} onDone=${doLogin} />
      <${LimitModal} open=${limitOpen} onClose=${() => setLimitOpen(false)} />
    <//>`;
  }

  ReactDOM.createRoot(document.getElementById('root')).render(html`<${SP.AppShell}><${TrackingApp} /><//>`);
})();
