/* =====================================================================
   Quote card (Schedules v2 route card) + detail tabs
   ===================================================================== */

function ChargesTable({ o, q, incl }) {
  const rows = charges(o, q, incl);
  return (
    <table className="charges">
      <thead><tr><th>Charges</th><th>20’ ST</th><th>40’ HC</th><th>Fees/Services</th><th>Total</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td>{r.n20 && r.p20 ? `${usd(r.p20)} × ${r.n20}` : '—'}</td>
            <td>{r.n40 && r.p40 ? `${usd(r.p40)} × ${r.n40}` : '—'}</td>
            <td>{r.fee ? usd(r.fee) : '—'}</td>
            <td>{usd(r.total)}</td>
          </tr>
        ))}
        <tr className="t"><td>Total</td><td /><td /><td /><td>{usd(rows.reduce((s, r) => s + r.total, 0))}</td></tr>
      </tbody>
    </table>
  );
}

/* ---------- Schedules tab ---------- */
/* reference quotes carry two cut-offs from the carrier: Port (rail ramp ETD) and Documents (Norfolk) */
const cutoffList = (etd, o, k) => (o && o.fixedTotal != null ? (() => { const t = refTimeline(o, k); return [['Port', t.railEtd, <I.BankOutlined />], ['Documents', t.norfolk, <I.FileTextOutlined />]]; })() : [
  ['Documents', etd.subtract(6, 'day').hour(17).minute(0), <I.FileTextOutlined />],
  ['VGM', etd.subtract(4, 'day').hour(12).minute(0), <I.DashboardOutlined />],
  ['Port / CY', etd.subtract(3, 'day').hour(18).minute(0), <I.BankOutlined />],
  ['Dangerous goods', etd.subtract(7, 'day').hour(12).minute(0), <I.ExperimentOutlined />],
].sort((x, y) => x[1] - y[1]));
const inDays = (d) => { const n = d.startOf('day').diff(NOW.startOf('day'), 'day'); return n < 0 ? 'passed' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`; };

function ScheduleRow({ o, q, k, open, onToggle, earliest }) {
  const etd = o.etd.add(k * 7, 'day');
  const eta = o.eta.add(k * 7, 'day');
  const cuts = cutoffList(etd, o, k);
  const next = cuts.find(([l, d]) => l !== 'Dangerous goods' && d.isAfter(NOW));
  return (
    <div className={'sch' + (open ? ' open' : '')}>
      <div className="sch-row" role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}>
        <div className="ends grow">
          <div className="col"><span className="muted">ETD</span><span className="lg strong">{etd.format('D MMM, HH:mm')}</span></div>
          <div className="col"><span className="muted" style={{ textAlign: 'center' }}>{o.via.length ? 'via ' + o.via.join(', ') : 'Direct'}</span><Lane label={`~ ${o.days} day(s)`} rings={o.via.length} /></div>
          <div className="col r"><span className="muted">ETA</span><span className="lg strong">{eta.format('D MMM, HH:mm')}</span></div>
        </div>
        <div className="sch-act">
          {next && <Tooltip title={`${next[0]} cut-off · ${ddt(next[1])}`}><span className="cut-chip"><I.ClockCircleOutlined />{next[0]} {inDays(next[1])}</span></Tooltip>}
          <span className="sch-chev">{open ? <ChevronIcon dir="up" /> : <ChevronIcon dir="down" />}</span>
        </div>
      </div>
      {open && <>
        <div className="cut-grid">
          {cuts.map(([label, d, ic]) => {
            const st = d.isBefore(NOW) ? 'passed' : next && d.isSame(next[1]) ? 'next' : '';
            return (
              <div className={'cut-tile ' + st} key={label}>
                <span className="row muted" style={{ gap: 6 }}>{ic}{label} cut-off</span>
                <span className="strong">{ddt(d)}</span>
                <span className="muted">{st === 'next' ? 'Next deadline · ' : ''}{inDays(d)}</span>
              </div>
            );
          })}
        </div>
        <div className="steps">
          {legs(o, k * 7, q).map((s, i) => (
            <div className="rstep" key={i}>
              <div className="rstep-rail"><span className={'rstep-mark' + (s.type === 'port' ? '' : ' ic')}>{s.type === 'truck' ? <I.CarOutlined /> : s.type === 'rail' ? <img src="assets/shell/train.svg" width={11} height={11} alt="" /> : s.type === 'vessel' ? <img src="assets/shell/ship-primary.svg" width={11} height={11} alt="" /> : null}</span></div>
              <div className={'rstep-body' + (s.type === 'port' ? ' port' : '')}>
                <div className="t">{s.t}</div>
                <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>{s.kv.map(([kk, v]) => <span className="kv-i" key={kk}>{kk}: <b>{v}</b></span>)}{s.note && <span className="muted" style={{ fontSize: 14 }}>· {s.note}</span>}</div>
              </div>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}
function SchedulesTab({ o, q }) {
  const [open, setOpen] = useState(o.schedules > 1 ? 1 : 0);
  if (!o.hasSchedules) return (
    <div className="nosch">
      <span className="strong lg">Schedule information currently is not available</span>
      <span className="muted">The carrier hasn’t provided sailing schedule for this route.</span>
      <div className="nosch-box">
        <div className="muted">Quote is valid for departures</div>
        <div className="strong">{o.etd.format('D MMM YYYY')} – {o.etd.add(14, 'day').format('D MMM YYYY')}</div>
        <Divider style={{ margin: '8px 0' }} />
        <div className="muted">When you make the booking, we’ll request the sailing date closest to your cargo ready date.</div>
      </div>
    </div>
  );
  return (
    <div className="col" style={{ gap: 8 }}>
      {range(o.schedules, (k) => <ScheduleRow key={k} o={o} q={q} k={k} earliest={k === 0 && o.schedules > 1} open={open === k} onToggle={() => setOpen(open === k ? null : k)} />)}
    </div>
  );
}

/* ---------- Breakdown tab ---------- */
const TERMS_TIP = { Prepaid: 'Paid by the shipper before departure', Collect: 'Paid by the consignee at destination' };
function BreakdownTab({ o, q, incl }) {
  const rows = charges(o, q, incl);
  const fr = rows.find((r) => r.name === 'Freight');
  const origin = rows.find((r) => r.name === 'Origin'), dest = rows.find((r) => r.name === 'Destination');
  const pick = rows.find((r) => r.name === 'Inland pickup'), deliv = rows.find((r) => r.name === 'Door delivery');
  const sizes = [["20’ Container", fr.p20, fr.n20], ["40’ Container", fr.p40, fr.n40]].filter(([, , n]) => n > 0);
  const sections = [
    { key: 'origin', name: 'Origin', terms: 'Collect', total: (origin?.total || 0) + (pick?.total || 0), groups: origin || pick ? [{ name: 'Origin', items: [...(pick ? [['Inland pickup · door to port', pick.total, 1, pick.total]] : []), ...(origin ? [['Terminal handling (THC)', null, null, origin.total - origin.fee], ...(origin.fee ? [['Export documentation', origin.fee, 1, origin.fee]] : [])] : [])] }] : null },
    { key: 'freight', name: 'Freight', terms: 'Prepaid', total: fr.total, groups: sizes.map(([name, rate, n]) => ({ name: `${name} × ${n}`, items: [['International freight', rate * 0.5, n, rate * 0.5 * n, 'incl. surcharges'], ['Applicable surcharge', rate * 0.5, n, rate * 0.5 * n, 'BAF and low-sulphur']] })) },
    { key: 'destination', name: 'Destination', terms: 'Prepaid', total: (dest?.total || 0) + (deliv?.total || 0), groups: dest || deliv ? [{ name: 'Destination', items: [...(dest ? [['Terminal handling (THC)', null, null, dest.total]] : []), ...(deliv ? [['Door delivery · port to door', deliv.total, 1, deliv.total]] : [])] }] : null },
  ];
  const [open, setOpen] = useState(['freight', ...sections.find((x) => x.key === 'freight').groups.map((g) => `freight-${g.name}`)]);
  const toggle = (k) => setOpen((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  const total = rows.reduce((t, r) => t + r.total, 0);
  /* antd tree data: section → (container group →) charge lines */
  const line = (sk, [n, rate, qty, amt, hint]) => ({ key: `${sk}-${n}`, level: 2, charge: n, rate, qty, amount: amt, hint });
  const treeData = sections.map((sc) => ({
    key: sc.key, level: 0, charge: sc.name, amount: sc.total, off: !sc.groups,
    children: sc.groups ? (sc.key === 'freight'
      ? sc.groups.map((g) => ({ key: `${sc.key}-${g.name}`, level: 1, charge: g.name, amount: g.items.reduce((t, it) => t + it[3], 0), children: g.items.map((it) => line(`${sc.key}-${g.name}`, it)) }))
      : sc.groups.flatMap((g) => g.items.map((it) => ({ ...line(sc.key, it), level: 1 })))) : undefined,
  }));
  const allKeys = treeData.flatMap((r) => [r.key, ...(r.children || []).filter((c) => c.children).map((c) => c.key)]).filter((k) => !treeData.find((r) => r.key === k && r.off));
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="bd-sum">
        {sections.map((s) => (
          <button key={s.key} className={'bd-tile' + (s.groups ? '' : ' off') + (open.includes(s.key) ? ' on' : '')} onClick={() => s.groups && toggle(s.key)} disabled={!s.groups}>
            <span className="row" style={{ gap: 6 }}><span className="muted">{s.name}</span><Tooltip title={TERMS_TIP[s.terms]}><span className="tag line">{s.terms}</span></Tooltip></span>
            <span className="strong lg">{s.groups ? usd(s.total, true) : 'Not included'}</span>
          </button>
        ))}
      </div>
      <Table className="bd-table" size="small" pagination={false} rowKey="key" dataSource={treeData}
        rowClassName={(r) => (r.level === 0 ? 'bd-sec' + (r.off ? ' off' : '') : r.level === 1 && r.children ? 'bd-grp' : '')}
        expandable={{ expandedRowKeys: open, onExpandedRowsChange: (keys) => setOpen(keys), expandRowByClick: true, indentSize: 20,
          expandIcon: ({ expanded, onExpand, record, expandable }) => (expandable
            ? <span className="bd-arrow" onClick={(e) => { e.stopPropagation(); onExpand(record, e); }}>{expanded ? <ChevronIcon dir="down" /> : <ChevronIcon dir="right" />}</span>
            : <span className="bd-arrow empty" />) }}
        columns={[
          { title: 'Charge', dataIndex: 'charge', render: (v, r) => (r.level === 0 ? <b>{v}</b> : <span>{v}{r.hint && <span className="muted"> · {r.hint}</span>}</span>) },
          { title: 'Rate', dataIndex: 'rate', align: 'right', width: 120, render: (v) => (v != null ? <span className="muted">{usd(v, true)}</span> : null) },
          { title: 'Qty', dataIndex: 'qty', align: 'right', width: 80, render: (v) => (v != null ? <span className="muted">× {v}</span> : null) },
          { title: <a className="link" onClick={() => setOpen(open.length >= allKeys.length ? [] : allKeys)}>{open.length >= allKeys.length ? 'Collapse all' : 'Expand all'}</a>, dataIndex: 'amount', align: 'right', width: 150,
            render: (v, r) => (r.off ? <span className="muted">Not included</span> : <span className={r.level === 0 ? 'strong' : ''}>{usd(v, true)}</span>) },
        ]}
        summary={() => (
          <Table.Summary.Row className="bd-total">
            <Table.Summary.Cell index={0}>Total, all-in</Table.Summary.Cell>
            <Table.Summary.Cell index={1} /><Table.Summary.Cell index={2} />
            <Table.Summary.Cell index={3} align="right">{usd(total, true)}</Table.Summary.Cell>
          </Table.Summary.Row>
        )} />
      <div className="muted"><I.InfoCircleOutlined /> Prices in USD. Not included sections can be added to the quote from the search form.</div>
    </div>
  );
}

/* collapsible row used by the Free Time tab */
function TreeNode({ label, extra, amount, unit, children, defaultOpen, level = 0, leaf }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <>
      <div className={'tn' + (open ? ' open' : '') + (leaf ? ' leaf' : '')} style={{ paddingLeft: level * 24 }}>
        {leaf ? <span className="tl">└</span> : <span className="caret" onClick={() => setOpen(!open)}>{open ? <ChevronIcon dir="down" /> : <ChevronIcon dir="right" />}</span>}
        <span className="lbl" style={{ cursor: leaf ? 'default' : 'pointer', fontWeight: level === 0 ? 600 : 400 }} onClick={() => !leaf && setOpen(!open)}>{label}</span>
        {extra}
        {unit && <span className="unit">{unit}</span>}
        <span className="amt" style={unit ? undefined : { marginLeft: 'auto' }}>{amount}</span>
      </div>
      {open && children}
    </>
  );
}

/* structure as the carrier sends it: side → category → container type → charges (per container) */
const ACC_ORIGIN = [['Sealing Fee', 65], ['Residential Fee', 200], ['Dry Run', 300], ['Dangerous Goods Additional Surcharge', 250], ['Container Storage At Truck Yard', 75],
  ['Triaxle Chassis', 100], ['Bond Fee', 150], ['Container Prepull', 250], ['Terminal Congestion', 150], ['Overweight Fee', 200], ['Redelivery Fee To Port/Ramp/Terminal Location', 150],
  ['Genset Inland Haulage Only', 100], ['Container Delivery To Storage Yard', 250], ['Rail Flip Fee', 150], ['Port Gate Fees', 100], ['Cargo Weight Verification', 240], ['Railway Charge', 100]];
const ACCESSORIALS = [
  ['Origin', [['Accessorials', ACC_ORIGIN], ['Penalty Charges', [['Late Gate-In Fee', 150], ['Missed Cut-Off Rebooking', 200], ['VGM Late Submission', 100]]]]],
  ['Freight', [['Accessorials', [['Bill Of Lading Amendment', 75], ['Telex Release', 50], ['Sea Waybill Correction', 75]]], ['Penalty Charges', [['Late Documentation', 100], ['Misdeclaration Of Cargo', 1500]]]]],
  ['Destination', [['Accessorials', [['Chassis Usage', 45], ['Pre-Pull To Yard', 250], ['Liftgate Delivery', 120], ['Hand Unloading', 300], ['Container Storage At Truck Yard', 75]]],
    ['Penalty Charges', [['Failed Delivery Attempt', 175], ['Waiting Time (After 2 Free Hours)', 85]]]]],
];
function AccessorialsTab({ q }) {
  const box = (q?.boxes?.[0]?.type || "40' ST").startsWith('20') ? '20` Dry Standard' : '40` Dry Standard';
  const [find, setFind] = useState('');
  const match = (n) => !find || n.toLowerCase().includes(find.toLowerCase());
  const data = ACCESSORIALS.map(([side, cats]) => {
    const children = cats.map(([cat, items]) => {
      const lines = items.filter(([n]) => match(n)).map(([n, rate]) => ({ key: `${side}-${cat}-${n}`, name: n, rate, unit: 'per container' }));
      return lines.length ? { key: `${side}-${cat}`, name: cat, level: 1, count: lines.length, children: [{ key: `${side}-${cat}-box`, name: box, level: 2, count: lines.length, children: lines }] } : null;
    }).filter(Boolean);
    return children.length ? { key: side, name: side, level: 0, count: children.reduce((t, c) => t + c.count, 0), children } : null;
  }).filter(Boolean);
  const allKeys = data.flatMap((r) => [r.key, ...r.children.flatMap((c) => [c.key, c.children[0].key])]);
  const [open, setOpen] = useState(['Origin', 'Origin-Accessorials', 'Origin-Accessorials-box']);
  const keys = find ? allKeys : open;
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 12 }}>
        <span className="grow" />
        <Input allowClear size="small" style={{ width: 220 }} prefix={<I.SearchOutlined style={{ color: 'var(--text-4)' }} />} placeholder="Find a charge" value={find} onChange={(e) => setFind(e.target.value)} />
      </div>
      <Table className="bd-table acc-table" size="small" pagination={false} rowKey="key" dataSource={data}
        locale={{ emptyText: `No charges match “${find}”` }}
        rowClassName={(r) => (r.level === 0 ? 'bd-sec' : r.level != null ? 'bd-grp' : '')}
        expandable={{ expandedRowKeys: keys, onExpandedRowsChange: (k) => !find && setOpen(k), expandRowByClick: true, indentSize: 20,
          expandIcon: ({ expanded, onExpand, record, expandable }) => (expandable
            ? <span className="bd-arrow" onClick={(e) => { e.stopPropagation(); onExpand(record, e); }}>{expanded ? <ChevronIcon dir="down" /> : <ChevronIcon dir="right" />}</span>
            : <span className="bd-arrow empty" />) }}
        columns={[
          { title: 'Charge', dataIndex: 'name', render: (v, r) => (r.level != null
            ? <span className="row" style={{ display: 'inline-flex', gap: 8 }}>{r.level === 0 ? <b>{v}</b> : <span>{v}</span>}<span className="muted">{r.count}</span></span> : v) },
          { title: 'Unit', dataIndex: 'unit', width: 140, render: (v) => (v ? <span className="muted">{v}</span> : null) },
          { title: <a className="link" onClick={() => !find && setOpen(open.length >= allKeys.length ? [] : allKeys)}>{open.length >= allKeys.length ? 'Collapse all' : 'Expand all'}</a>,
            dataIndex: 'rate', align: 'right', width: 130, render: (v) => (v != null ? <b>{usd(v, true)}</b> : null) },
        ]} />
    </div>
  );
}
/* ---------- Free Time tab ---------- */
/* free time per side — only the number of free days is known at quote stage */
function freeTimeFor(q) {
  const ft = [
    { side: 'Origin', name: 'Demurrage & Detention', kind: 'Combined · calendar days', free: 7, unit: 'day', icon: <I.ContainerOutlined />,
      clock: 'Starts when the empty container is picked up, stops when the loaded container is gated in at the port.' },
    { side: 'Destination', name: 'Demurrage & Detention', kind: 'Combined · calendar days', free: 14, unit: 'day', icon: <I.ContainerOutlined />,
      clock: 'Starts when the container is discharged at the port, stops when the empty container is returned to the carrier.' },
  ];
  return ft;
}
function FreeItem({ it }) {
  return (
    <div className="ft-item">
      <span className="ft-ic">{it.icon}</span>
      <div className="col grow" style={{ minWidth: 0 }}><span className="strong">{it.name}</span><span className="muted">{it.clock}</span></div>
      <span className="ft-free">{it.free} free {it.unit}s</span>
    </div>
  );
}
function FreeTimeTab({ q }) {
  const items = freeTimeFor(q);
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="ft-col">
        {items.map((it) => <FreeItem key={it.side} it={{ ...it, name: `${it.side} ${it.name}` }} />)}
      </div>
    </div>
  );
}
/* FAK exceptions — HS chapters (and headings) that are not covered by the FAK rate */
const FAK_EXCEPTIONS = [
  ['02', 'Meat & edible offal', [['0201', 'Meat of bovine animals, fresh or chilled'], ['0207', 'Meat and edible offal, of the poultry of heading No 0105, fresh, chilled or frozen']]],
  ['07', 'Fresh vegetables', [['0701', 'Potatoes, fresh or chilled'], ['0703', 'Onions, shallots, garlic, leeks, fresh or chilled']]],
  ['08', 'Fresh fruit & nuts', [['0803', 'Bananas, including plantains, fresh or dried'], ['0805', 'Citrus fruit, fresh or dried']]],
  ['09', 'Coffee, tea, spices', [['0901', 'Coffee, whether or not roasted or decaffeinated'], ['0902', 'Tea, whether or not flavoured']]],
  ['10', 'Cereals & grains', [['1001', 'Wheat and meslin'], ['1006', 'Rice']]],
  ['11', 'Milling products', [['1101', 'Wheat or meslin flour']]],
  ['12', 'Oil seeds & oleaginous', [['1201', 'Soya beans, whether or not broken'], ['1207', 'Other oil seeds and oleaginous fruits']]],
  ['13', 'Lac; gums; resins', [['1301', 'Lac; natural gums, resins, gum-resins and oleoresins']]],
  ['15', 'Animal/vegetable fats & oils', [['1507', 'Soya-bean oil and its fractions'], ['1511', 'Palm oil and its fractions']]],
  ['17', 'Sugar & confectionery', [['1701', 'Cane or beet sugar, in solid form'], ['1704', 'Sugar confectionery not containing cocoa']]],
  ['24', 'Tobacco', [['2401', 'Unmanufactured tobacco; tobacco refuse']]],
  ['27', 'Mineral fuels & oils', [['2710', 'Petroleum oils, other than crude']]],
];
function ExcludedTab() {
  const [find, setFind] = useState('');
  const m = (t) => t.toLowerCase().includes(find.toLowerCase());
  const data = FAK_EXCEPTIONS.map(([code, name, items]) => {
    const kids = items.filter(([c, n]) => !find || m(n) || c.startsWith(find) || m(name) || code.startsWith(find));
    return kids.length ? { key: code, code, name, level: 0, children: kids.map(([c, n]) => ({ key: c, code: c, name: n })) } : null;
  }).filter(Boolean);
  const [open, setOpen] = useState([FAK_EXCEPTIONS[0][0]]);
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 12 }}>
        <span className="grow" />
        <Input allowClear size="small" style={{ width: 220 }} prefix={<I.SearchOutlined style={{ color: 'var(--text-4)' }} />} placeholder="Find by name or HS code" value={find} onChange={(e) => setFind(e.target.value)} />
      </div>
      <Table className="bd-table" size="small" pagination={false} rowKey="key" dataSource={data} showHeader={false}
        locale={{ emptyText: `Nothing matches “${find}” — this commodity ships under FAK` }}
        rowClassName={(r) => (r.level === 0 ? 'bd-sec' : '')}
        expandable={{ expandedRowKeys: find ? data.map((r) => r.key) : open, onExpandedRowsChange: (k) => !find && setOpen(k), expandRowByClick: true, indentSize: 20,
          expandIcon: ({ expanded, onExpand, record, expandable }) => (expandable
            ? <span className="bd-arrow" onClick={(e) => { e.stopPropagation(); onExpand(record, e); }}>{expanded ? <ChevronIcon dir="down" /> : <ChevronIcon dir="right" />}</span>
            : <span className="bd-arrow empty" />) }}
        columns={[
          { dataIndex: 'name', render: (v, r) => (r.level === 0 ? <b>{v}</b> : v) },
          { dataIndex: 'code', align: 'right', width: 90, render: (v) => <span className="muted">{v}</span> },
        ]} />
    </div>
  );
}

/* ---------- card ---------- */
/* "City, CC" like the original card; door ends use the warehouse city */
const endLabel = (q, side, port) => { const p = PLACE[port]; return p ? `${p.short}, ${p.cc}` : port; };
/* secondary quote actions live in a "more" menu instead of a lone print icon */
function QuoteMenu({ o }) {
  const { message } = AntApp.useApp();
  const items = [
    { key: 'print', icon: <I.PrinterOutlined />, label: 'Print quote' },
    { key: 'pdf', icon: <I.FilePdfOutlined />, label: 'Download PDF' },
    { key: 'link', icon: <I.LinkOutlined />, label: 'Copy link to quote' },
  ];
  const onClick = ({ key, domEvent }) => {
    domEvent.stopPropagation();
    if (key === 'print') window.print();
    if (key === 'pdf') message.success(`Quote ${o.voyage} saved as PDF`);
    if (key === 'link') { try { navigator.clipboard.writeText(`${location.href.split('#')[0]}#quote=${o.id}`); } catch { /* clipboard unavailable */ } message.success('Link to this quote copied'); }
  };
  return (
    <Dropdown menu={{ items, onClick }} trigger={['click']} placement="bottomRight">
      <Button className="qc-more" type="text" size="small" icon={<I.MoreOutlined />} aria-label="More actions" />
    </Dropdown>
  );
}
function QuoteCard({ o, q, incl, onSelect, roll, initialTab }) {
  const [tab, setTab] = useState(initialTab || null);
  const c = CARRIERS[o.carrier];
  const total = quoteTotal(o, q, incl);
  const toggle = () => setTab(tab ? null : 'schedules');
  return (
    <div className={'qc' + (tab ? ' open' : '')}>
      <div className="qc-main">
        <div className="qc-left">
          <div className="qc-head">
            <Logo c={o.carrier} />
            <span className="strong lg">{c.name}</span>
            <span className="grow" />
            {o.kind === 'spot' && <span className="tag green"><I.ThunderboltOutlined />Spot quote</span>}
            {!roll && <span className="chip">Book by: {dd(o.bookBy)}</span>}
            <QuoteMenu o={o} />
          </div>
          <div className="qc-route">
            <div className="qr-end"><span className="qr-date">{o.hasSchedules ? dd(o.etd) : '—'}</span><span className="qr-city">{endLabel(q, 'origin', o.from)}</span></div>
            <div className="qr-mid">
              <span className="qr-days">{o.hasSchedules ? `${o.days} days` : 'Transit TBD'}</span>
              <Lane rings={o.via.length} />
              <span className="qr-via">{o.via.length ? `via ${o.via.join(', ')}` : '\u00a0'}</span>
            </div>
            <div className="qr-end r"><span className="qr-date">{o.hasSchedules ? dd(o.eta) : '—'}</span><span className="qr-city">{endLabel(q, 'dest', o.to)}</span></div>
          </div>
          {roll ? (
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="meta-chips"><span className="chip">Vessel: {o.vessel}</span><span className="chip">Voyage: {o.voyNo}</span></div>
              <div className="meta-chips">{['Doc', 'Port', 'VGM'].map((t) => <span className="chip" key={t}>{t} c/o: {dd(o.etd.subtract(4, 'day'))}</span>)}</div>
            </div>
          ) : null}
        </div>
        <div className="qc-right">
          <div className="price">{usd(total)}<Popover content={<ChargesTable o={o} q={q} incl={incl} />} placement="leftTop" arrow={false}><I.InfoCircleOutlined /></Popover></div>
          {roll ? <div className={'price-sub ' + (roll.delta < 0 ? 'delta-down' : 'delta-up')}>{roll.delta < 0 ? <I.CaretDownOutlined /> : <I.CaretUpOutlined />} {usd(Math.abs(roll.delta), true)}</div>
            : null}
          <Button color="default" variant="solid" block size="large" onClick={() => onSelect(o, total)}>Select</Button>
        </div>
      </div>
      {tab && (
        <div className="qc-body">
          <Tabs activeKey={tab} onChange={setTab} items={[
            { key: 'schedules', label: 'Schedules', children: <SchedulesTab o={o} q={q} /> },
            { key: 'breakdown', label: 'Breakdown', children: <BreakdownTab o={o} q={q} incl={incl} /> },
            { key: 'accessorials', label: 'Accessorials/Penalty Charges', children: <AccessorialsTab q={q} /> },
            { key: 'free', label: 'Free Time', children: <FreeTimeTab q={q} /> },
            { key: 'excluded', label: 'FAK Exceptions', children: <ExcludedTab /> },
          ]} />
        </div>
      )}
      {!roll && <button className="details-bar" onClick={toggle}>Details {tab ? <ChevronIcon dir="up" style={{ fontSize: 12 }} /> : <ChevronIcon dir="down" style={{ fontSize: 12 }} />}</button>}
    </div>
  );
}
