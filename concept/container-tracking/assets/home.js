/* Skypace homepage — same content, new layout, plus the Container tracking block */
(function () {
  const { useState } = React;
  const SP = window.SP;
  const { html, A, ic } = SP;

  /* ---------- Hero with the quote widget ---------- */
  function Hero() {
    return html`<section className="hero">
      <div className="hero-dots" style=${{ backgroundImage: 'radial-gradient(#c9d0da 1.1px, transparent 1.3px)', backgroundSize: '16px 16px' }}></div>
      <div className="container hero-inner">
        <${A.Typography.Title} level=${1} className="h-display">Get instant ocean freight rates & book now!<//>
        <${A.Typography.Paragraph} className="lead"><b>Skypace is a freight forwarder,</b> not a marketplace. Book your shipment and work with your dedicated team.<//>
        <div className="quote-v2" role="search" aria-label="Freight quote">
          <${A.Space.Compact} block size="large">
            <${A.Select} id="q-type" defaultValue="FCL" style=${{ width: 92 }} options=${[{ value: 'FCL', label: 'FCL' }, { value: 'LCL', label: 'LCL' }]} />
            <${A.Input} id="q-from" placeholder="Origin" prefix=${ic('EnvironmentOutlined', { style: { color: '#6A6F88' } })} />
            <${A.Input} id="q-to" placeholder="Destination" prefix=${ic('EnvironmentOutlined', { style: { color: '#6A6F88' } })} />
            <${A.Select} id="q-cargo" defaultValue="40st" style=${{ width: 168 }} options=${[{ value: '40st', label: "40' ST × 1" }, { value: '40hc', label: "40' HC × 1" }, { value: '20st', label: "20' ST × 1" }]} />
            <${A.Select} id="q-det" defaultValue="exp" style=${{ width: 196 }} options=${[{ value: 'exp', label: 'Export, 30 days (Net)' }, { value: 'imp', label: 'Import, 30 days (Net)' }]} />
            <${A.Button} type="primary" icon=${ic('SearchOutlined')} aria-label="Get rates" />
          <//>
        </div>
        <div className="hero-note">Already shipping? <a href="#tracking" style=${{ fontWeight: 600, color: '#202C3C' }}>Track a container or B/L ${ic('ArrowRightOutlined')}</a></div>
      </div>
    </section>`;
  }

  function Logos() {
    const brands = [['JCtrans', 'Georgia, serif', 700], ['bitdeer', 'Inter', 700], ['WCA', 'Inter', 800], ['NOV', 'Inter', 800], ['Whirlpool', 'Georgia, serif', 600], ['Raben', 'Inter', 700]];
    const row = [...brands, ...brands];
    return html`<section className="logos" aria-label="Customers">
      <div className="container"><div className="t">We ship products of famous brands worldwide</div>
        <div className="marquee"><div className="marquee-track">${row.map(([n, f, w], i) => html`<span key=${i} style=${{ fontFamily: f, fontWeight: w }} aria-hidden=${i >= brands.length}>${n}</span>`)}</div></div>
      </div>
    </section>`;
  }

  /* ---------- Container tracking block (new) ---------- */
  function TrackingBlock() {
    const [q, setQ] = useState('');
    const [carrier, setCarrier] = useState('AUTO');
    const [err, setErr] = useState(null);
    const s = SP.SHIPMENTS.S1;
    const sm = SP.summarize(s);
    const go = () => {
      const d = SP.detect(q);
      if (!d) return setErr('Enter a container or B/L number');
      if (d.partial) return setErr('This number looks incomplete');
      if (!d.valid) return setErr(d.msg);
      location.href = `tracking.html?q=${encodeURIComponent(SP.norm(q))}&c=${carrier}`;
    };
    return html`<section className="trk-block" id="tracking">
      <div className="container">
        <div className="trk-band">
          <div className="trk-band-copy">
            <span className="eyebrow">${ic('AimOutlined')} Container tracking</span>
            <${A.Typography.Title} level=${2} className="h2">Track any container or bill of lading<//>
            <${A.Typography.Paragraph} className="lead">Vessel position, ETA changes and every port event from 30+ ocean carriers, on one live map.<//>
            <${SP.SearchBox} layout="band" value=${q} onChange=${(v) => { setQ(v); setErr(null); }} carrier=${carrier} onCarrier=${setCarrier} onSubmit=${go} error=${err} />
          </div>
          <div className="trk-band-visual" aria-hidden="true">
            <${SP.MapView} view="globe" mode="focus" focus=${s} controls=${false} interactive=${false} padding=${() => ({ top: 30, right: 30, bottom: 120, left: 60 })} />
            <div className="preview-card">
              <div className="row1"><${SP.CarrierBadge} code=${s.carrier} /><span className="num">${s.number}</span><span style=${{ marginLeft: 'auto' }}><${SP.StatusTag} s=${s} /></span></div>
              <div className="lane"><span>${sm.fromCity}</span><span>${sm.toCity}</span></div>
              <${SP.LaneBar} s=${s} />
              <div className="meta"><span>ATD ${SP.fmtShort(s.atd)}</span><span>ETA <b style=${{ color: '#202C3C' }}>${SP.fmtShort(s.eta)}</b></span></div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  /* ---------- Services: shippers / forwarders ---------- */
  const SVC = {
    shippers: {
      title: 'Shippers', href: '#',
      tiers: [
        ['Small Shippers', '1 - 200 containers / year', 'Ship stress-free with Skypace! Your personal Logistics Concierge manages every shipment, secures lowest-available rates, and offers pay-later terms up to 90 days - saving you time and money from day one. Start now!', 'UserOutlined'],
        ['Medium Shippers', '200-1000 containers / year', 'Our platform consolidates all your shipping needs. Our logistics team prevents costly delays, and our global expertise opens new markets - empowering you to grow effortlessly.', 'TeamOutlined'],
        ['Large Shippers', '1000 + containers / year', 'Real-time analytics give you total control, seamless API integration slashes costs, and our SLA-backed reliability ensures worry-free trade worldwide. Master your global supply chain with Skypace!', 'BankOutlined'],
      ],
    },
    forwarders: {
      title: 'Freight Forwarders', href: '#',
      tiers: [
        ['Global logistics agents', 'Quote faster, win more, and keep control.', 'Skypace gives you instant freight pricing with space visibility, dedicated execution support, and zero profit share — so you stay competitive, efficient, and fully in charge of your success.', 'GlobalOutlined'],
        ['NVO to NVO (Co-Load)', 'Go digital, scale faster, win cargo.', 'Expedite x 30 times your co-load execution with integrated booking sysetm, e-BL, and tracking in one system. Backed by our global space allocation and personal support, you’ll eliminate manual delays and grow without friction.', 'DeploymentUnitOutlined'],
        ['NON-NVOCC Forwarders', 'Get global reach, rates, full service, zero overhead.', 'Skypace gives you competitive door-to-door Export & Import rates, integrated shipment tools, and hands-on issue resolution - so you win more bids without adding complexity.', 'RocketOutlined'],
      ],
    },
  };
  function Services() {
    const [tab, setTab] = useState('shippers');
    const d = SVC[tab];
    return html`<section>
      <div className="container">
        <div className="sec-head">
          <div><span className="eyebrow">Logistics services for Shippers and Freight Forwarders</span><${A.Typography.Title} level=${2} className="h2">Meet your global logistics partner<//></div>
          <${A.Segmented} size="large" value=${tab} onChange=${setTab} options=${[{ label: 'For Shippers', value: 'shippers' }, { label: 'For Freight Fowarders', value: 'forwarders' }]} />
        </div>
        <div className="svc">
          <div className="svc-copy">
            <${A.Typography.Title} level=${3}>${d.title}<//>
            ${d.tiers.map(([t, sub, p, icn]) => html`<div className="tier" key=${t}><span className="ic">${ic(icn)}</span><div><b>${t} <span>(${sub})</span></b><${A.Typography.Paragraph}>${p}<//></div></div>`)}
            <div><${A.Button} type="primary" size="large">Learn more<//></div>
          </div>
          <div className="svc-visual stage" aria-hidden="true">
            <div className="stage-map"><${SP.MapView} mode="focus" focus=${SP.SHIPMENTS.S1} controls=${false} interactive=${false} padding=${() => ({ top: 40, right: 60, bottom: 60, left: 60 })} /></div>
            <div className="mock-dash stage-main">
              <div className="bar"><b>Instant quotes</b><${A.Tag}>Shanghai → Los Angeles, 40' HC<//></div>
              ${[['Maersk', 'MAEU', '18 days', '$2,140'], ['CMA CGM', 'CMDU', '20 days', '$2,065'], ['COSCO Shipping', 'COSU', '19 days', '$1,980', true]].map(([n, c, tt, pr, best]) => html`<div className=${'row' + (best ? ' is-best' : '')} key=${c}><span style=${{ display: 'flex', gap: 10, alignItems: 'center' }}><${SP.CarrierBadge} code=${c} /><b>${n}</b>${best ? html`<${A.Tag} color="blue" bordered=${false}>Best price<//>` : null}</span><span className="muted">${tt}</span><span className="price">${pr}</span></div>`)}
              <${A.Button} type="primary" block size="large">Book<//>
            </div>
            ${tab === 'shippers'
              ? html`<div className="float f1"><span className="av">AK</span><span><b>Your logistics concierge</b><small>Anna, replies in ~5 min</small></span></div>
                     <div className="float f2"><span className="fi">${ic('WalletOutlined')}</span><span><b>Pay later</b><small>up to 90 days</small></span></div>`
              : html`<div className="float f1"><span className="fi">${ic('PercentageOutlined')}</span><span><b>Zero profit share</b><small>your margin stays yours</small></span></div>
                     <div className="float f2"><span className="fi">${ic('FileProtectOutlined')}</span><span><b>e-BL & tracking</b><small>in one system</small></span></div>`}
          </div>
        </div>
      </div>
    </section>`;
  }

  /* ---------- Activity map ---------- */
  const DOTS = [
    ...[[-118.27, 33.73], [-74.15, 40.68], [-81.1, 32.08], [-95.3, 29.7], [121.8, 31.2], [121.85, 29.93], [4.1, 51.95], [9.97, 53.54], [129.04, 35.08], [114.27, 22.57]].map((at) => ({ at, color: '#202C3C', r: 6 })),
    ...[[106.7, 10.8], [72.9, 19.0], [-46.3, -23.95], [55.0, 25.0], [-104.3, 19.05], [103.55, 1.36], [-79.9, 9.36], [32.3, 31.2]].map((at) => ({ at, color: '#4A55AD', r: 5 })),
    ...[[3.4, 6.45], [39.66, -4.05], [31.0, -29.87], [-77.15, -12.05], [-71.62, -33.03], [174.8, -36.85], [144.9, -37.8], [18.4, -33.9]].map((at) => ({ at, color: '#9aa1ad', r: 4 })),
  ];
  function Activity() {
    return html`<section style=${{ paddingTop: 0 }}>
      <div className="container act">
        <div className="act-copy">
          <${A.Typography.Title} level=${2} className="h2">Need to ship a cargo internationally?<//>
          <${A.Typography.Paragraph} className="lead">Activity Map demonstrates the global reach available through our branches and networks.<//>
          <div className="act-legend">
            <span><i style=${{ background: '#202C3C' }}></i>Popular routes</span>
            <span><i style=${{ background: '#4A55AD' }}></i>Growing markets</span>
            <span><i style=${{ background: '#9aa1ad' }}></i>Low activity</span>
          </div>
          <div><${A.Button} size="large" icon=${ic('EnvironmentOutlined')}>Find local office<//></div>
        </div>
        <div className="act-map"><${SP.MapView} mode="dots" dots=${DOTS} fitTo=${[[-125, 62], [150, -42]]} center=${15} controls=${false} interactive=${false} padding=${() => ({ top: 16, right: 16, bottom: 16, left: 16 })} /></div>
      </div>
    </section>`;
  }

  function Statement() {
    return html`<section className="statement">
      <div className="container">
        <${A.Typography.Title} level=${2} className="h2">Skypace manages global freight, combining ocean shipping with our own inland transport solutions.<//>
        <div className="carriers" aria-label="Carriers">${['MAERSK', 'Hapag-Lloyd', 'MSC', 'ONE', 'EVERGREEN', 'ZIM', 'CMA CGM', 'OOCL', 'HMM', 'COSCO'].map((c) => html`<div key=${c}>${c}</div>`)}</div>
      </div>
    </section>`;
  }

  function News() {
    return html`<section>
      <div className="container">
        <div className="sec-head"><div><span className="eyebrow">Newsroom</span></div><${A.Button} size="large">All News<//></div>
        <article className="news">
          <div className="news-visual dark-map">
            <div className="stage-map"><${SP.MapView} mode="focus" focus=${SP.SHIPMENTS.S2} controls=${false} interactive=${false} padding=${() => ({ top: 70, right: 40, bottom: 130, left: 40 })} /></div>
            <div className="logo-stack">${['MAEU', 'MSCU', 'CMDU', 'COSU', 'HLCU', 'ONEY', 'EGLV', 'HDMU', 'ZIMU', 'OOLU'].map((c) => html`<${SP.CarrierBadge} key=${c} code=${c} />`)}<span>10+ carriers</span></div>
            <div className="kpi"><div><b>10+</b><small>carriers in one platform</small></div><div><b>FaaS</b><small>freight as a service</small></div><div><b>1</b><small>place for quotes & clearances</small></div></div>
          </div>
          <div className="news-copy">
            <span className="eyebrow">Case study</span>
            <${A.Typography.Title} level=${3}>How a Polymer Shipper Uses Skypace as a FaaS Platform to Manage Ocean Freight Across 10 Carriers<//>
            <${A.Typography.Paragraph}>Vanasia receives instant freight quotes, places bookings, and manages clearances across 10+ carriers directly in the Skypace platform.<//>
            <a href="#" style=${{ fontWeight: 600 }}>Read story ${ic('ArrowRightOutlined')}</a>
          </div>
        </article>
      </div>
    </section>`;
  }

  const STEPS = [
    ['Quote your shipment', 'Enter your cargo and route details to receive the most competitive port-to-door pricing, instantly. Need help or custom requirements? Our experts are here to assist.'],
    ['Make a booking', 'Review available options and select the one that fits best. No upfront payment or risk, just confirm, and we’ll handle the rest.'],
    ['Shipment begins', 'Once confirmed, our team handles pickup, port coordination, customs, and delivery. You’ll receive updates at every key milestone.'],
  ];
  function Steps() {
    const [on, setOn] = useState(0);
    const prog = html`<div className="step-prog">${STEPS.map((x, i) => html`<span key=${i} className=${i <= on ? 'on' : ''}>${i < on ? ic('CheckOutlined') : i + 1}</span>`)}</div>`;
    const visuals = [
      html`<div className="mock-dash">${prog}<div className="bar"><b>Ningbo, CN → Savannah, US</b><${A.Tag}>FCL, 40' HC<//></div>
        ${[['COSCO Shipping', 'COSU', '$2,410'], ['ONE', 'ONEY', '$2,480'], ['Evergreen', 'EGLV', '$2,525']].map(([n, c, p], i) => html`<div className=${'row' + (i === 0 ? ' is-best' : '')} key=${c}><span style=${{ display: 'flex', gap: 10, alignItems: 'center' }}><${SP.CarrierBadge} code=${c} /><b>${n}</b></span><span className="muted">port-to-door</span><span className="price">${p}</span></div>`)}
        <${A.Button} type="primary" block size="large">Continue to booking<//></div>
        <div className="float f1"><span className="fi">${ic('ThunderboltOutlined')}</span><span><b>Instant price</b><small>in about 2 seconds</small></span></div>`,
      html`<div className="mock-dash">${prog}<div className="bar"><b>Booking confirmed</b><${A.Tag} color="green" bordered=${false}>No upfront payment<//></div>
        <div className="row"><span style=${{ display: 'flex', gap: 10, alignItems: 'center' }}><${SP.CarrierBadge} code="COSU" /><b>COSCO AQUILA 087E</b></span><span className="muted">ETD 10 Sep</span><span className="price">4 × CTR</span></div>
        <div className="row"><span>Booking no.</span><span></span><span className="price">6431127850</span></div>
        <div className="row"><span>Your team</span><span></span><span className="avs"><span className="av">AK</span><span className="av">JM</span><span className="av">+2</span></span></div></div>
        <div className="float f2"><span className="fi">${ic('SafetyCertificateOutlined')}</span><span><b>Space guaranteed</b><small>even in peak season</small></span></div>`,
      html`<div className="mock-dash">${prog}<div className="bar"><b>In transit</b><${A.Tag} color="blue" bordered=${false}>ETA 19 Oct<//></div>
        <div className="row" style=${{ display: 'block' }}><div style=${{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, marginBottom: 8 }}><span>Ningbo</span><span>Savannah</span></div><${SP.LaneBar} s=${SP.SHIPMENTS.S2} /></div>
        <div className="row"><span>Panama Canal transit</span><span className="muted">12 Oct</span><span>${ic('CheckCircleFilled', { style: { color: '#52C41A' } })}</span></div>
        <a href="tracking.html" style=${{ fontWeight: 500 }}>Open in Container tracking ${ic('ArrowRightOutlined')}</a></div>
        <div className="float f1"><span className="fi">${ic('BellOutlined')}</span><span><b>Milestone update</b><small>Vessel left the Panama Canal</small></span></div>`,
    ];
    return html`<section style=${{ paddingTop: 0 }}>
      <div className="container">
        <div className="sec-head"><div><span className="eyebrow">How to book a shipment</span><${A.Typography.Title} level=${2} className="h2">Simple. Fast. Transparent.<//><${A.Typography.Paragraph} className="lead">From quote to delivery, we streamline your logistics in just a few steps.<//></div></div>
        <div className="steps">
          <div className="step-list">${STEPS.map(([t, p], i) => html`<button key=${i} className=${'step' + (on === i ? ' is-on' : '')} onClick=${() => setOn(i)} aria-pressed=${on === i}><span className="n">${i + 1}</span><span><b>Step ${i + 1}: ${t}</b><${A.Typography.Paragraph}>${p}<//></span></button>`)}</div>
          <div className="step-visual stage">${visuals[on]}</div>
        </div>
      </div>
    </section>`;
  }

  const QUOTES = [
    ['We initially started with Skypace as regular clients. After experiencing the potential of their platform - faster quoting, easier vessel schedule checks and booking flows, - we saw real growth potential. That’s why we didn’t just stay clients; we chose to partner with them.', 'Jan Maas', 'Owner of EWF'],
    ['M&C Appliances has proudly partnered with Skypace & Maxton Shipping for over four years, receiving excellent service and reliable logistics. Their professionalism and efficiency have been instrumental in ensuring smooth operations and timely deliveries. We value this strong partnership and look forward to continued success together.', 'Carlos Pimentel', 'M&C Appliances'],
    ['It’s always our pleasure to work with you as our favorite partner in the USA. You provide us with excellent support and high-quality service. 😊', 'Aya Ahmed', 'Bakma Cargo'],
    ['We’ve worked with Skypace for years and are very satisfied with their service. With their platform, we now quote faster, check vessel schedules more efficiently, and confidently place more bookings from the U.S.', 'NEETHU MONIJ', 'Livro Shipping'],
  ];
  function Testimonials() {
    return html`<section style=${{ paddingTop: 0 }}>
      <div className="container">
        <div className="sec-head"><div><${A.Typography.Title} level=${2} className="h2">We are proud to support 150+ customers in 18 countries<//></div>
          <div className="stats"><div><b>150+</b><small>customers</small></div><div><b>18</b><small>countries</small></div></div></div>
        <div className="tst">${QUOTES.map(([q, n, c]) => html`<figure key=${n}><blockquote>“${q}”</blockquote><figcaption><span className="av">${n.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span><span><b>${n}</b><small>${c}</small></span></figcaption></figure>`)}</div>
      </div>
    </section>`;
  }

  const FAQ = [
    ['What is Skypace?', 'Skypace is an integrated logistics solutions provider and NVOCC (Non-Vessel Operating Common Carrier). We work with negotiated contracts and spot offers by carriers, ensuring that our clients get competitive pricing and guaranteed space allocation, even during peak seasons.'],
    ['Why should I work with a Freight Forwarder/NVOCC like Skypace?', "Working with Skypace means you don't need to manage relationships with multiple shipping lines. We handle the complexity for you, offering better pricing and space allocation through our carrier agreements. Additionally, we provide superior customer service and a streamlined process, saving you time and effort."],
    ['What type of services does Skypace provide?', 'Skypace specializes in FCL (Full Container Load) services but can also assist with LCL (Less than Container Load), air freight, and project cargo through our Maxton Shipping departments. For exporters, our Port-to-Port services are fully autonomous, allowing you to quote, book, generate eBLs, and manage your shipment entirely on our platform.'],
    ['What can I do on the Skypace platform?', html`<div>The Skypace platform provides several powerful features, including:<ul>${['Dedicated logistics team for all your shipments.', 'Instant freight quotes.', 'Shipping schedules.', 'Online ocean freight bookings.', 'Workflow automations.', 'Creating own network of supply chain stakeholders.', 'Entire freight management: booking changes, splits, diversions.', 'Electronic Bill of Lading clearance.', 'Tracking & Tracing.', 'Documents exchange portal.', '24/7 logistics support.', 'ERP integrations with systems like SAP, Cargowise, QuickBooks, and more.'].map((x) => html`<li key=${x}>${x}</li>`)}</ul></div>`],
    ['Is the Skypace platform free to use?', 'Yes! The Skypace platform is completely free to use. There are no extra charges for tracking, tracing, or other tools. You get a seamless logistics experience in one place without any hidden fees.'],
  ];
  function Faq() {
    return html`<section style=${{ paddingTop: 0 }}>
      <div className="container faq">
        <div style=${{ display: 'grid', gap: 14, alignContent: 'start' }}><span className="eyebrow">FAQ</span><${A.Typography.Title} level=${2} className="h2">Answers to Your Questions<//><${A.Typography.Paragraph} className="lead">Everything you need to know about our logistics services<//></div>
        <${A.Collapse} ghost defaultActiveKey=${['0']} expandIconPosition="end" items=${FAQ.map(([q, a], i) => ({ key: String(i), label: q, children: a, style: { borderBottom: '1px solid #e6e8ec' } }))} />
      </div>
    </section>`;
  }

  function Cta() {
    return html`<section className="cta"><div className="container"><div className="cta-band">
      <${A.Typography.Title} level=${2} className="h2">Begin shipping with Skypace<//>
      <${A.Typography.Paragraph} className="lead">Sign up or contact us, and our logistics experts will guide you through the entire process.<//>
      <div className="actions"><${A.Button} type="primary" size="large">Sign up<//><${A.Button} size="large">Schedule a call<//></div>
    </div></div></section>`;
  }

  function Home() {
    return html`<${React.Fragment}>
      <${SP.Header} />
      <main className="home">
        <${Hero} /><${Logos} /><${TrackingBlock} /><${Services} /><${Activity} /><${Statement} /><${News} /><${Steps} /><${Testimonials} /><${Faq} /><${Cta} />
      </main>
      <${SP.Footer} />
    <//>`;
  }

  ReactDOM.createRoot(document.getElementById('root')).render(html`<${SP.AppShell}><${Home} /><//>`);
})();
