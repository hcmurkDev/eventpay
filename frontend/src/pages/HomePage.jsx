// import { useState, useEffect } from 'react';

// const SLIDES = [
//   {
//     bg: 'linear-gradient(135deg, #1a0533 0%, #3d1278 50%, #0a1a3d 100%)',
//     icon: 'ti-confetti',
//     title: 'Welcome to Farmers Pitso 2026',
//     sub: 'Agriculture and Excellence Awards',
//   },
//   {
//     bg: 'linear-gradient(135deg, #0a1f18 0%, #0d4a35 50%, #0a0a0f 100%)',
//     icon: 'ti-building-store',
//     title: 'Food & Drink Stalls',
//     sub: 'Local vendors, global flavours',
//   },
//   {
//     bg: 'linear-gradient(135deg, #1a0a0f 0%, #4a1020 50%, #0a0a1f 100%)',
//     icon: 'ti-wallet',
//     title: 'Cashless & Seamless',
//     sub: 'Use your LSL credits at any stall — no cash needed',
//   },
// ];

// export default function HomePage({ onNavigate }) {
//   const [slide, setSlide] = useState(0);

//   useEffect(() => {
//     const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4000);
//     return () => clearInterval(t);
//   }, []);

//   const current = SLIDES[slide];

//   return (
//     <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

//       {/* HERO SLIDER */}
//       <div style={{
//         background: current.bg,
//         transition: 'background 0.8s ease',
//         padding: '60px 24px 48px',
//         textAlign: 'center',
//         position: 'relative',
//         overflow: 'hidden',
//       }}>
//         <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
//         <div style={{ position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }} />

//         <i
//           key={slide + 'i'}
//           className={`ti ${current.icon}`}
//           style={{ fontSize: '60px', color: '#fff', display: 'block', marginBottom: '16px', animation: 'fadeIn .4s ease' }}
//           aria-hidden="true"
//         />
//         <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', letterSpacing: '-.5px', marginBottom: '10px', animation: 'fadeIn .4s ease' }} key={slide + 't'}>
//           {current.title}
//         </h1>
//         <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '15px', animation: 'fadeIn .4s ease' }} key={slide + 's'}>
//           {current.sub}
//         </p>

//         {/* Slide dots */}
//         <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
//           {SLIDES.map((_, i) => (
//             <button key={i} onClick={() => setSlide(i)} style={{
//               width: i === slide ? '24px' : '8px', height: '8px',
//               borderRadius: '4px', border: 'none',
//               background: i === slide ? '#fff' : 'rgba(255,255,255,.3)',
//               cursor: 'pointer', transition: 'all .3s ease', padding: 0,
//             }} />
//           ))}
//         </div>
//       </div>

//       {/* EVENT INFO */}
//       <div style={{ padding: '24px 20px', flex: 1 }}>
//         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
//           {[
//             { icon: 'ti-calendar', label: 'Date',    val: 'September 11, 2026' },
//             { icon: 'ti-map-pin',  label: 'Venue',   val: 'Manthabiseng Convention Centre' },
//             { icon: 'ti-clock',    label: 'Time',    val: '08 AM – 06 PM' },
//             { icon: 'ti-coin',     label: 'Credits', val: '100 per attendee' },
//           ].map(item => (
//             <div key={item.label} style={{
//               background: 'var(--card)', border: '1px solid var(--border)',
//               borderRadius: '12px', padding: '14px', textAlign: 'center',
//             }}>
//               <i className={`ti ${item.icon}`} style={{ fontSize: '22px', color: 'var(--accent)', display: 'block', marginBottom: '6px' }} aria-hidden="true" />
//               <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px', letterSpacing: '.5px', textTransform: 'uppercase' }}>{item.label}</div>
//               <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.val}</div>
//             </div>
//           ))}
//         </div>

//         <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
//           How will you be joining today?
//         </p>

//         <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
//           <button className="btn btn-primary" onClick={() => onNavigate('attendee')}
//             style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
//             <i className="ti ti-ticket" style={{ fontSize: '20px' }} aria-hidden="true" />
//             I'm an Attendee
//           </button>
//           <button className="btn btn-ghost" onClick={() => onNavigate('stall')}
//             style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
//             <i className="ti ti-building-store" style={{ fontSize: '20px' }} aria-hidden="true" />
//             I'm a Stall Owner
//           </button>
//           <button className="btn btn-ghost" onClick={() => onNavigate('admin')}
//             style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: .7, fontSize: '13px' }}>
//             <i className="ti ti-shield-lock" style={{ fontSize: '18px' }} aria-hidden="true" />
//             Organizer / Admin
//           </button>
//         </div>

//         <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '11px', marginTop: '24px' }}>
//           EventPay — Cashless credit system
//         </p>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from 'react';

const SLIDES = [
  {
    icon: 'ti-confetti',
    eyebrow: 'FARMERS PITSO 2026',
    title: 'Agriculture Excellence ',
    sub: 'A day celebrating farmers, food, enterprise and the people shaping our future.',
  },
  {
    icon: 'ti-building-store',
    eyebrow: 'FOOD & DRINK',
    title: 'Discover Local Flavours',
    sub: 'Explore amazing food and drink stalls from local vendors and businesses.',
  },
  {
    icon: 'ti-wallet',
    eyebrow: 'CASHLESS & SEAMLESS',
    title: 'One Event. One Wallet.',
    sub: 'Use your LSL credits across participating stalls without carrying cash.',
  },
];

const EVENT_INFO = [
  {
    icon: 'ti-calendar',
    label: 'Date',
    value: 'September 12, 2026',
  },
  {
    icon: 'ti-map-pin',
    label: 'Venue',
    value: 'Manthabiseng Convention Centre',
  },
  {
    icon: 'ti-clock',
    label: 'Time',
    value: '08 AM – 06 PM',
  },
  {
    icon: 'ti-coin',
    label: 'Credits',
    value: '100 per attendee',
  },
];

export default function HomePage({ onNavigate }) {
  const [slide, setSlide] = useState(0);
  const [theme, setTheme] = useState(
    () => localStorage.getItem('ep_theme') || 'feast'
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ep_theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((current) => (current + 1) % SLIDES.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ep_theme', theme);
  }, [theme]);

  const current = SLIDES[slide];

  const toggleTheme = () => {
    setTheme((current) => current === 'feast' ? 'night' : 'feast');
  };

  return (
    <div className="home-page">

      {/* ───────────────── HEADER ───────────────── */}
      <header className="home-header">
        <div className="home-brand">
          <div className="brand-mark">
            <i className="ti ti-seedling" aria-hidden="true" />
          </div>

          <div>
            <div className="brand-name">Farmers Pitso</div>
            <div className="brand-product">EVENTPAY 2026</div>
          </div>
        </div>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <i
            className={`ti ${theme === 'feast' ? 'ti-moon' : 'ti-sun'}`}
            aria-hidden="true"
          />
          <span>
            {theme === 'feast' ? 'Night mode' : 'Light mode'}
          </span>
        </button>
      </header>


      {/* ───────────────── HERO ───────────────── */}
      <section className="home-hero">

        <div className="hero-content">

          <div className="hero-copy">

            <div className="hero-eyebrow">
              <span />
              {current.eyebrow}
            </div>

            <i
              key={`icon-${slide}`}
              className={`ti ${current.icon} hero-icon`}
              aria-hidden="true"
            />

            <h1 key={`title-${slide}`}>
              {current.title}
            </h1>

            <p key={`sub-${slide}`}>
              {current.sub}
            </p>

            <div className="hero-actions">
              <button
                className="btn btn-primary hero-main-action"
                onClick={() => onNavigate('attendee')}
              >
                <i className="ti ti-ticket" />
                I'm an Attendee
              </button>

              <button
                className="btn btn-hero-secondary"
                onClick={() => onNavigate('stall')}
              >
                <i className="ti ti-building-store" />
                I'm a Stall Owner
              </button>
            </div>

          </div>

          <div className="hero-visual">

            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />

            <div className="hero-farm-card">
              <div className="farm-icon">
                <i className="ti ti-seedling" />
              </div>

              <div>
                <strong>Farmers Pitso</strong>
                <span>September 12, 2026</span>
              </div>

              <div className="farm-status">
                <span />
                LIVE EVENT
              </div>
            </div>

            <div className="floating-stat stat-one">
              <i className="ti ti-wallet" />
              <div>
                <strong>100</strong>
                <span>Credits</span>
              </div>
            </div>

            <div className="floating-stat stat-two">
              <i className="ti ti-building-store" />
              <div>
                <strong>Local</strong>
                <span>Vendors</span>
              </div>
            </div>

          </div>

        </div>

        <div className="hero-dots">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              className={index === slide ? 'active' : ''}
              onClick={() => setSlide(index)}
              aria-label={`Show slide ${index + 1}`}
            />
          ))}
        </div>

      </section>


      {/* ───────────────── EVENT INFO ───────────────── */}
      <main className="home-content">

        <section className="event-intro">
          <div>
            <span className="section-eyebrow">THE EVENT</span>
            <h2>Everything you need for the day.</h2>
          </div>

          <p>
            Your EventPay wallet gives you a simple, cashless way to enjoy
            Farmers Pitso and support participating vendors.
          </p>
        </section>


        <section className="event-info-grid">

          {EVENT_INFO.map((item) => (
            <div className="event-info-card" key={item.label}>

              <div className="event-info-icon">
                <i className={`ti ${item.icon}`} aria-hidden="true" />
              </div>

              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>

            </div>
          ))}

        </section>


        {/* ───────────────── ENTRY CARDS ───────────────── */}
        <section className="join-section">

          <div className="section-heading">
            <span className="section-eyebrow">GET STARTED</span>
            <h2>How are you joining us?</h2>
          </div>

          <div className="join-grid">

            <button
              className="join-card join-card-primary"
              onClick={() => onNavigate('attendee')}
            >
              <div className="join-icon">
                <i className="ti ti-ticket" />
              </div>

              <div className="join-card-content">
                <span>FOR VISITORS</span>
                <h3>I'm an Attendee</h3>
                <p>
                  Manage your EventPay credits and enjoy the event
                  without carrying cash.
                </p>
              </div>

              <i className="ti ti-arrow-up-right join-arrow" />
            </button>


            <button
              className="join-card"
              onClick={() => onNavigate('stall')}
            >
              <div className="join-icon">
                <i className="ti ti-building-store" />
              </div>

              <div className="join-card-content">
                <span>FOR VENDORS</span>
                <h3>I'm a Stall Owner</h3>
                <p>
                  Manage your stall, process purchases and track
                  your EventPay sales.
                </p>
              </div>

              <i className="ti ti-arrow-up-right join-arrow" />
            </button>


            <button
              className="join-card join-card-admin"
              onClick={() => onNavigate('admin')}
            >
              <div className="join-icon">
                <i className="ti ti-shield-lock" />
              </div>

              <div className="join-card-content">
                <span>EVENT MANAGEMENT</span>
                <h3>Organizer / Admin</h3>
                <p>
                  View event activity, attendees, stalls, transactions
                  and financial information.
                </p>
              </div>

              <i className="ti ti-arrow-up-right join-arrow" />
            </button>

          </div>

        </section>


        {/* ───────────────── FOOTER ───────────────── */}
        <footer className="home-footer">
          <div className="footer-brand">
            <i className="ti ti-seedling" />
            <span>Farmers Pitso 2026</span>
          </div>

          <span>EventPay • Cashless Event Platform</span>
        </footer>

      </main>

    </div>
  );
}