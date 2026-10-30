/* =====================================================================
   New Booking wizard (client + operator views)
   ===================================================================== */

const STEPS_CLIENT = ['Quote', 'Schedule', 'Booking details', 'Shipping parties', 'Pickup', 'Delivery', 'Services', 'Additional Info', 'Agreement', 'Summary'];
const STEPS_OPERATOR = ['Quote', 'Schedule', 'Cargo & Containers', 'Parties', 'Supplier & Receiver', 'Services', 'Additional Info', 'Team', 'Summary'];
const STEP_INFO = {
  Quote: ['Selected quote', 'Check the offer you are booking'],
  Schedule: ['Schedule', 'Pick the sailing that fits your cargo ready date'],
  'Booking details': ['Booking details', 'Describe the cargo and containers'],
  'Cargo & Containers': ['Cargo & Containers', 'Describe the cargo and containers'],
  'Shipping parties': ['Shipping parties', 'Who ships, receives and gets notified'],
  Parties: ['Parties', 'Who ships, receives and gets notified'],
  Pickup: ['Pickup', 'Where and when we collect the cargo'],
  Delivery: ['Delivery', 'Where and when we deliver the cargo'],
  'Supplier & Receiver': ['Supplier & Receiver', 'Pickup and delivery locations with contacts'],
  Services: ['Services', 'Additional services for this shipment'],
  'Additional Info': ['Additional info', 'B/L instructions and references'],
  Team: ['Assigning a team', 'Select and assign team members responsible for this shipment'],
  Agreement: ['Agreement', 'Review and accept the terms before booking'],
  Summary: ['Booking summary', 'Please make sure the information is correct before sending'],
};
const EMPLOYEES = [
  { name: 'Alexander Heles', email: 'a.heles@maxtonshipping.com', phone: '+48 456 374 99' },
  { name: 'Kate Miller', email: 'k.miller@maxtonshipping.com', phone: '+48 456 112 40' },
  { name: 'Liam Green', email: 'l.green@maxtonshipping.com', phone: '+48 456 870 03' },
  { name: 'Olga Petrova', email: 'o.petrova@maxtonshipping.com', phone: '+48 456 501 77' },
];
const OFFICES = [
  ['Los Angeles · Terminal Island', '701 New Dock Street Berth 212-215, Terminal Islands, California, USA (US)', '8204840', '7393-4-4893'],
  ['London · Kemp House', 'Kemp House, 160 City Road, London, EC1V 2NX, UK, VAT 362 6787 62', '8204840', '7393-4-4893'],
  ['Gdansk · Port Office', 'ul. Kontenerowa 7, 80-601 Gdansk, Poland', '5842211', '4211-2-0019'],
];
const PARTY = { company: 'Maxton Shipping', address: '701 New Dock Street Berth 212-215, Terminal Islands, California, USA (US)', person: 'Alexander Heles', phone: '+ 1 650 410 8900', email: 'info@maxtonshipping.com', refs: ['PO682304', 'SH81202'] };

/* ---------- shared blocks ---------- */
const Card = ({ title, extra, children, style }) => (
  <div className="card" style={style}>
    {title && <div className="card-h"><h4>{title}</h4>{extra}</div>}
    {children}
  </div>
);
const EditBtn = ({ onClick }) => <Button type="text" size="small" icon={<I.EditOutlined />} onClick={onClick}>Edit</Button>;

function ServiceOffice({ withHeader }) {
  const { message } = AntApp.useApp();
  const [all, setAll] = useState(false);
  const [office, setOffice] = useState(1);
  const [, addr, tax, ein] = OFFICES[office];
  const body = (
    <div className="office">
      <div>
        <div className="strong lg" style={{ marginBottom: 12 }}>Account manager</div>
        <div className="mgr">
          <img src="assets/avatar-bridget.png" alt="" />
          <div className="col" style={{ gap: 6, alignItems: 'flex-start' }}>
            <span className="strong">Bridget Tran</span>
            <span>+44920840467, bridget.tran@skypace.com</span>
            <Button size="small" icon={<I.MessageOutlined />} onClick={() => message.info('Live chat with Bridget Tran opened')}>Live chat</Button>
          </div>
        </div>
      </div>
      <div>
        <div className="strong lg" style={{ marginBottom: 12 }}>Your service office</div>
        <div>{addr}</div>
        <div style={{ marginTop: 6 }}>Tax ID: {tax}<br />EIN: {ein}</div>
      </div>
    </div>
  );
  return (
    <>
      <Card title={withHeader ? 'Your service office' : 'Your service details'} extra={withHeader && <Button icon={<I.EnvironmentOutlined />} onClick={() => setAll(true)}>See all offices</Button>}>
        {!withHeader && <Alert type="info" showIcon title="Our assigned local office does not handle shipments from the requested countries, so a new office and contact person have been assigned for this shipment." />}
        <div className="inner">{body}</div>
      </Card>
      <Modal open={all} onCancel={() => setAll(false)} title="Skypace offices" footer={null} width={560}>
        <Radio.Group value={office} onChange={(e) => { setOffice(e.target.value); setAll(false); message.success('Service office changed'); }} style={{ width: '100%' }}>
          <div className="col" style={{ gap: 8 }}>
            {OFFICES.map(([n, a], i) => <label key={n} className="inner row" style={{ cursor: 'pointer', alignItems: 'flex-start' }}><Radio value={i} /><div><div className="strong">{n}</div><div className="muted">{a}</div></div></label>)}
          </div>
        </Radio.Group>
      </Modal>
    </>
  );
}

/* ---------- designed steps ---------- */
function TeamStep({ team, setTeam }) {
  const sections = [['Management', ['Account manager']], ['Export', ['Customer Onboarding', 'Documentation Ops (Export)']], ['Import', ['Documentation Ops (Import)', 'Pricing']]];
  return (
    <>
      <Card title="Local office">
        <div className="inner row" style={{ gap: 16 }}>
          <span className="grow">Choosing a local office</span>
          <div style={{ width: '62%' }}><div className="muted">Address</div><Select style={{ width: '100%' }} value={team.office} onChange={(office) => setTeam({ ...team, office })} options={OFFICES.map(([n, a], i) => ({ value: i, label: a }))} /></div>
        </div>
      </Card>
      {sections.map(([title, roles]) => (
        <Card key={title} title={title}>
          <div className="team-row h"><span>Role</span><span>Name</span><span>Email</span><span>Phone</span></div>
          {roles.map((r) => {
            const e = EMPLOYEES.find((x) => x.name === team[r]);
            return (
              <div className="inner team-row" key={r}>
                <span>{r}</span>
                <Select allowClear placeholder="Assign an employee" value={team[r]} onChange={(v) => setTeam({ ...team, [r]: v })} options={EMPLOYEES.map((x) => ({ value: x.name, label: x.name }))} />
                <span className="row"><span className="ic-btn"><I.MailOutlined /></span>{e ? <a href={'mailto:' + e.email}>{e.email}</a> : <span className="tag">—</span>}</span>
                <span className="row"><span className="ic-btn"><I.PhoneOutlined /></span>{e ? e.phone : <span className="tag">—</span>}</span>
              </div>
            );
          })}
        </Card>
      ))}
    </>
  );
}
function AgreementStep({ agree, setAgree }) {
  return (
    <>
      <Card>
        <div className="agree">
          <div className="agree-art"><div className="s">S<span className="ok"><I.CheckOutlined /></span></div></div>
          <div className="col grow" style={{ gap: 10 }}>
            <span className="strong lg">Skypace’s Terms and Conditions of Service</span>
            <span className="sec-t">We need a Terms and Conditions Agreement to establish legal protection, clearly define the roles and responsibilities of both the freight forwarder and the client, and mitigate risks associated with international shipping and logistics. This agreement ensures transparency and compliance with regulations.</span>
            <div className={'agree-check' + (agree.terms ? '' : ' off')}>
              <Checkbox checked={agree.terms} onChange={(e) => setAgree({ ...agree, terms: e.target.checked })}>I agree with <a>Skypace’s Terms and Conditions of Service</a> *</Checkbox>
            </div>
          </div>
        </div>
      </Card>
      <ServiceOffice />
    </>
  );
}
function SummaryStep({ q, quote, agree, setAgree, go, steps, schedule }) {
  const idx = (name) => steps.indexOf(name);
  const cargoStep = steps.includes('Booking details') ? 'Booking details' : 'Cargo & Containers';
  const partiesStep = steps.includes('Shipping parties') ? 'Shipping parties' : 'Parties';
  const [more, setMore] = useState(false);
  const party = (title) => (
    <div className="inner col" style={{ gap: 8 }}>
      <span className="strong">{title}</span>
      <KV k="Company">{PARTY.company}</KV>
      <KV k="Address">{PARTY.address}</KV>
      <KV k="Contact person">{PARTY.person}<br />{PARTY.phone}<br />{PARTY.email}</KV>
      <KV k="References">{title === 'Notify' ? '—' : <span className="meta-chips">{PARTY.refs.map((r) => <span key={r} className="tag line">{r}</span>)}</span>}</KV>
    </div>
  );
  return (
    <>
      <Card title="Agreements">
        <div className={'agree-check' + (agree.rate ? '' : ' off')}><Checkbox checked={agree.rate} onChange={(e) => setAgree({ ...agree, rate: e.target.checked })}>I agree with <a>Negotiated Rate Arrangement</a> for this Shipment *</Checkbox></div>
        <div className={'agree-check' + (agree.terms ? '' : ' off')}><Checkbox checked={agree.terms} onChange={(e) => setAgree({ ...agree, terms: e.target.checked })}>I agree with <a>Skypace’s Terms and Conditions of Service</a> *</Checkbox></div>
      </Card>
      <ServiceOffice withHeader />
      <Card title="Payment details">
        <div className="grid3">
          <div className="inner"><KV k="Trade type">Export</KV></div>
          <div className="inner"><KV k="Destination charges">Paid by Tesla (DAP/DPU)</KV></div>
          <div className="inner"><KV k="Payment terms">60 Days (Net) / Financing rate 7%</KV></div>
        </div>
      </Card>
      <Card title="Schedule" extra={<EditBtn onClick={() => go(idx('Schedule'))} />}>
        <div className="cargo-line"><I.CalendarOutlined /><span className="strong grow">{CARRIERS[quote.o.carrier].name} · {quote.o.vessel}</span><span>ETD {schedule.etd.format('D MMM YYYY')}</span><span className="muted">→</span><span>ETA {schedule.eta.format('D MMM YYYY')}</span></div>
      </Card>
      <Card title="Cargo" extra={<EditBtn onClick={() => go(idx(cargoStep))} />}>
        {[['210120. Extracts, essences and concentrates, of tea or maté', 99, 'Box'], ['210122. Extracts', 9, 'Pallet']].map(([n, c, t]) => (
          <div className="cargo-line" key={n}><I.CodeSandboxOutlined /><span className="strong grow">{n} × {c}</span><span className="tag line">{t}</span><span className="tag line">999 kg</span><span className="tag line">9 cbm</span><span className="tag line">$ 9,999.99</span></div>
        ))}
      </Card>
      <Card title="Containers" extra={<EditBtn onClick={() => go(idx(cargoStep))} />}>
        {q.boxes.map((b, i) => (
          <div className="cargo-line" key={i}><I.BarcodeOutlined /><span className="strong">{b.type} × {b.qty}</span><span className="tag line">ASD 516551{i}</span>{b.qty > 1 && <span className="tag line">+{b.qty - 1}</span>}<span className="grow" /><span>{(b.qty * 17000).toLocaleString('en-US')} kg</span></div>
        ))}
      </Card>
      <Card title="Shipping parties" extra={<EditBtn onClick={() => go(idx(partiesStep))} />}>
        <div className="grid3">{party('Shipper')}{party('Consignee')}{party('Notify')}</div>
        {more && <div className="grid3">{party('Forwarder')}{party('Customs broker')}{party('Payer')}</div>}
        <Button style={{ alignSelf: 'flex-start' }} icon={more ? <ChevronIcon dir="up" /> : <ChevronIcon dir="down" />} onClick={() => setMore(!more)}>{more ? 'View Less' : 'View More (3)'}</Button>
      </Card>
      <Card title="Supplier & Receiver" extra={<EditBtn onClick={() => go(idx(steps.includes('Pickup') ? 'Pickup' : 'Supplier & Receiver'))} />}>
        <div className="grid2">
          {[['Pickup', 'Maxton Shipping Inc.'], ['Delivery', 'Skypace']].map(([t, c]) => (
            <div className="inner col" key={t} style={{ gap: 8 }}><span className="strong">{t}</span><span>{c}</span>
              <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}><span className="row muted" style={{ alignItems: 'flex-start' }}><I.EnvironmentOutlined />{PARTY.address}</span><span className="row muted" style={{ alignItems: 'flex-start' }}><I.UserOutlined /><span>{PARTY.person}<br />{PARTY.phone}<br />{PARTY.email}</span></span></div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Services" extra={<EditBtn onClick={() => go(idx('Services'))} />}>
        <div className="grid3">{['Export Customs Clearance', 'Temporary Export', 'Letter of Credit'].map((s) => <div className="inner" key={s}>{s}</div>)}</div>
      </Card>
      <Card title="Additional info" extra={<EditBtn onClick={() => go(idx('Additional Info'))} />}>
        <div className="inner col" style={{ gap: 8 }}>
          <span className="strong">BL Printing Instructions</span>
          <div className="grid3"><KV k="Bill of Lading Details">Express Release Type</KV><KV k="Overall Number of Originals BOLs">5 Freighted · 5 Unfreighted</KV><KV k="Overall Number of Copies BOLs">5 Freighted · 5 Unfreighted</KV></div>
        </div>
        <div className="inner col" style={{ gap: 8 }}>
          <span className="strong">References</span>
          <div className="meta-chips">{['PO682304', 'SH81202', 'INV-1333'].map((r) => <span className="tag line" key={r}>{r}</span>)}</div>
        </div>
      </Card>
    </>
  );
}

/* ---------- lighter steps (not in the design set, kept consistent) ---------- */
function SimpleStep({ name, q, quote, schedule, setSchedule }) {
  if (name === 'Quote') return <QuoteCard o={quote.o} q={q} incl={['freight']} onSelect={() => {}} />;
  if (name === 'Schedule') return (
    <Card title="Available sailings">
      <Radio.Group value={schedule.k} onChange={(e) => setSchedule(e.target.value)} style={{ width: '100%' }}>
        <div className="col" style={{ gap: 8 }}>
          {range(3, (k) => {
            const etd = quote.o.etd.add(k * 7, 'day');
            return (
              <label className="inner row" key={k} style={{ cursor: 'pointer', gap: 16 }}>
                <Radio value={k} />
                <div className="ends grow" style={{ alignItems: 'center' }}>
                  <span className="lg">{etd.format('D MMM, HH:mm')}</span>
                  <Lane label={`~ ${quote.o.days} day(s)`} rings={quote.o.via.length} />
                  <span className="lg r">{quote.o.eta.add(k * 7, 'day').format('D MMM, H:mm')}</span>
                </div>
                <span className="chip">Doc c/o: {dd(etd.subtract(4, 'day'))}</span>
              </label>
            );
          })}
        </div>
      </Radio.Group>
    </Card>
  );
  if (name === 'Booking details' || name === 'Cargo & Containers') return (
    <>
      <Card title="Cargo">
        <Form layout="vertical"><div className="grid3">
          <Form.Item label="Commodity (HS code)"><Select defaultValue="210120" options={[{ value: '210120', label: '210120. Extracts, essences of tea' }, { value: '210122', label: '210122. Extracts' }]} /></Form.Item>
          <Form.Item label="Packages"><Space.Compact block><InputNumber defaultValue={99} style={{ width: '50%' }} /><Select defaultValue="Box" style={{ width: '50%' }} options={['Box', 'Pallet', 'Crate'].map((v) => ({ value: v, label: v }))} /></Space.Compact></Form.Item>
          <Form.Item label="Gross weight"><InputNumber defaultValue={999} suffix="kg" style={{ width: '100%' }} /></Form.Item>
        </div></Form>
      </Card>
      <Card title="Containers">{q.boxes.map((b, i) => <div className="cargo-line" key={i}><I.BarcodeOutlined /><span className="strong grow">{b.type}</span><InputNumber defaultValue={b.qty} min={1} style={{ width: 90 }} /></div>)}</Card>
    </>
  );
  if (name === 'Shipping parties' || name === 'Parties') return (
    <Card title="Parties"><Form layout="vertical"><div className="grid3">
      {['Shipper', 'Consignee', 'Notify'].map((p) => <Form.Item key={p} label={p}><Select defaultValue={p === 'Notify' ? undefined : 'maxton'} placeholder="Select from contact book" options={[{ value: 'maxton', label: 'Maxton Shipping' }, { value: 'tesla', label: 'Tesla Inc' }]} /></Form.Item>)}
    </div></Form></Card>
  );
  if (name === 'Pickup' || name === 'Delivery' || name === 'Supplier & Receiver') return (
    <Card title={name === 'Supplier & Receiver' ? 'Pickup and delivery' : name + ' location'}><Form layout="vertical"><div className="grid2">
      <Form.Item label="Address"><Select defaultValue="a" options={[{ value: 'a', label: PARTY.address }]} /></Form.Item>
      <Form.Item label="Date range"><DatePicker.RangePicker style={{ width: '100%' }} defaultValue={[quote.o.etd.subtract(12, 'day'), quote.o.etd.subtract(11, 'day')]} format="D MMM" /></Form.Item>
      <Form.Item label="Contact person"><Select defaultValue="Alexander Heles" options={EMPLOYEES.map((e) => ({ value: e.name, label: e.name }))} /></Form.Item>
      <Form.Item label="Notes"><Input placeholder="Gate code, loading dock, opening hours" /></Form.Item>
    </div></Form></Card>
  );
  if (name === 'Services') return (
    <Card title="Additional services"><Checkbox.Group defaultValue={['ecc', 'te', 'lc']} style={{ width: '100%' }}><div className="grid3" style={{ width: '100%' }}>
      {[['ecc', 'Export Customs Clearance'], ['icc', 'Import Customs Clearance'], ['te', 'Temporary Export'], ['lc', 'Letter of Credit'], ['ins', 'Cargo insurance'], ['fum', 'Fumigation']].map(([v, l]) => <label className="inner" key={v}><Checkbox value={v}>{l}</Checkbox></label>)}
    </div></Checkbox.Group></Card>
  );
  return (
    <Card title="BL Printing Instructions"><Form layout="vertical"><div className="grid3">
      <Form.Item label="Bill of Lading Details"><Select defaultValue="express" options={[{ value: 'express', label: 'Express Release Type' }, { value: 'original', label: 'Original B/L' }]} /></Form.Item>
      <Form.Item label="Originals BOLs"><Input defaultValue="5 Freighted · 5 Unfreighted" /></Form.Item>
      <Form.Item label="Copies BOLs"><Input defaultValue="5 Freighted · 5 Unfreighted" /></Form.Item>
    </div><Form.Item label="References"><Select mode="tags" defaultValue={['PO682304', 'SH81202', 'INV-1333']} /></Form.Item></Form></Card>
  );
}

/* ---------- wizard ---------- */
function BookingWizard({ open, onClose, quote, q, role, initialStep }) {
  const steps = role === 'operator' ? STEPS_OPERATOR : STEPS_CLIENT;
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(null);
  const [agree, setAgree] = useState({ terms: true, rate: false });
  const [schedule, setScheduleK] = useState(0);
  const [team, setTeam] = useState({ office: 0, 'Account manager': 'Alexander Heles', 'Documentation Ops (Export)': 'Alexander Heles', 'Documentation Ops (Import)': 'Alexander Heles', Pricing: 'Alexander Heles' });
  const bodyRef = useRef();
  useEffect(() => { if (open) { setStep(Math.max(0, steps.indexOf(initialStep))); setDone(null); } }, [open, initialStep, role]);
  useEffect(() => { bodyRef.current && (bodyRef.current.scrollTop = 0); }, [step]);
  if (!quote) return null;
  const name = steps[step];
  const last = step === steps.length - 1;
  const sched = { k: schedule, etd: quote.o.etd.add(schedule * 7, 'day'), eta: quote.o.eta.add(schedule * 7, 'day') };
  const canNext = name === 'Agreement' ? agree.terms : name === 'Summary' ? agree.terms && agree.rate : true;
  const finish = () => setDone('BK-' + (24000 + (hashStr(quote.o.id) % 9999)));
  const [title, sub] = STEP_INFO[name];
  return (
    <Modal open={open} onCancel={onClose} footer={null} closable={false} width="calc(100vw - 32px)" style={{ top: 16, maxWidth: 1600 }} className="bk-modal" destroyOnHidden>
      <div className="bk">
        <div className="bk-head"><h2>New Booking</h2><Button icon={<I.CloseOutlined />} onClick={onClose} aria-label="Close" /></div>
        <div className="bk-wrap">
          {role === 'operator' && !done && (
            <aside className="bk-sum">
              <div className="strong lg" style={{ marginBottom: 8 }}>Summary</div>
              <div className="it"><KV k="Origin">{PLACE[q.from].label}</KV></div>
              <div className="it"><KV k="Destination">{PLACE[q.to].label}</KV></div>
              <div className="it"><KV k="ETD">{sched.etd.format('DD MMM, HH:mm')}</KV></div>
              <div className="it"><KV k="ETA">{sched.eta.format('DD MMM, H:mm')}</KV></div>
              <div className="it"><KV k="Carrier">{CARRIERS[quote.o.carrier].name}</KV></div>
              <div className="it"><KV k="Estimated Total"><span className="strong lg">{usd(quote.total, true)}</span></KV></div>
            </aside>
          )}
          <div className="bk-main" ref={bodyRef}>
            <div className="bk-inner">
              {done ? (
                <div className="card" style={{ padding: 40 }}>
                  <Result status="success" title={`Booking ${done} sent`}
                    subTitle={`${CARRIERS[quote.o.carrier].name} will confirm space for ${placeShort(q.from)} → ${placeShort(q.to)}, ETD ${sched.etd.format('D MMM YYYY')}. Bridget Tran will keep you posted.`}
                    extra={[<Button key="b" onClick={onClose}>Back to quotes</Button>, <Button key="s" color="default" variant="solid" onClick={onClose}>Go to shipment</Button>]} />
                </div>
              ) : <>
                <div className="bk-steps"><Steps size="small" current={step} titlePlacement="vertical" progressDot onChange={(s) => s < step && setStep(s)} items={steps.map((t) => ({ title: t }))} /></div>
                <div className="bk-title">
                  <div className="grow"><h3>{title}</h3><div className="muted" style={{ fontSize: 13 }}>{sub}</div></div>
                  {step > 0 && <Button size="large" type="text" onClick={() => setStep(step - 1)}>Back</Button>}
                  {name === 'Team' && <Button size="large" onClick={() => setStep(step + 1)}>Skip</Button>}
                  <Tooltip title={canNext ? null : 'Accept the required agreements first'}>
                    <Button size="large" color="default" variant="solid" disabled={!canNext} onClick={() => (last ? finish() : setStep(step + 1))}>{last ? 'Finish booking' : 'Next'}</Button>
                  </Tooltip>
                </div>
                {name === 'Team' ? <TeamStep team={team} setTeam={setTeam} />
                  : name === 'Agreement' ? <AgreementStep agree={agree} setAgree={setAgree} />
                  : name === 'Summary' ? <SummaryStep q={q} quote={quote} agree={agree} setAgree={setAgree} go={setStep} steps={steps} schedule={sched} />
                  : <SimpleStep name={name} q={q} quote={quote} schedule={sched} setSchedule={setScheduleK} />}
              </>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
