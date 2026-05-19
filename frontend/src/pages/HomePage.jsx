import { useState, useEffect } from 'react';

const SLIDES = [
  {
    bg: 'linear-gradient(135deg, #1a0533 0%, #3d1278 50%, #0a1a3d 100%)',
    icon: 'ti-confetti',
    title: 'Welcome to Farmers Pitso 2026',
    sub: 'Agriculture and Excellence Awards',
  },
  {
    bg: 'linear-gradient(135deg, #0a1f18 0%, #0d4a35 50%, #0a0a0f 100%)',
    icon: 'ti-building-store',
    title: 'Food & Drink Stalls',
    sub: 'Local vendors, global flavours',
  },
  {
    bg: 'linear-gradient(135deg, #1a0a0f 0%, #4a1020 50%, #0a0a1f 100%)',
    icon: 'ti-wallet',
    title: 'Cashless & Seamless',
    sub: 'Use your LSL credits at any stall — no cash needed',
  },
];

export default function HomePage({ onNavigate }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const current = SLIDES[slide];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* HERO SLIDER */}
      <div style={{
        background: current.bg,
        transition: 'background 0.8s ease',
        padding: '60px 24px 48px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }} />

        <i
          key={slide + 'i'}
          className={`ti ${current.icon}`}
          style={{ fontSize: '60px', color: '#fff', display: 'block', marginBottom: '16px', animation: 'fadeIn .4s ease' }}
          aria-hidden="true"
        />
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', letterSpacing: '-.5px', marginBottom: '10px', animation: 'fadeIn .4s ease' }} key={slide + 't'}>
          {current.title}
        </h1>
        <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '15px', animation: 'fadeIn .4s ease' }} key={slide + 's'}>
          {current.sub}
        </p>

        {/* Slide dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} style={{
              width: i === slide ? '24px' : '8px', height: '8px',
              borderRadius: '4px', border: 'none',
              background: i === slide ? '#fff' : 'rgba(255,255,255,.3)',
              cursor: 'pointer', transition: 'all .3s ease', padding: 0,
            }} />
          ))}
        </div>
      </div>

      {/* EVENT INFO */}
      <div style={{ padding: '24px 20px', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
          {[
            { icon: 'ti-calendar', label: 'Date',    val: 'September 11, 2026' },
            { icon: 'ti-map-pin',  label: 'Venue',   val: 'Manthabiseng Convention Centre' },
            { icon: 'ti-clock',    label: 'Time',    val: '08 AM – 06 PM' },
            { icon: 'ti-coin',     label: 'Credits', val: '100 per attendee' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '14px', textAlign: 'center',
            }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: '22px', color: 'var(--accent)', display: 'block', marginBottom: '6px' }} aria-hidden="true" />
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px', letterSpacing: '.5px', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.val}</div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
          How will you be joining today?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('attendee')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <i className="ti ti-ticket" style={{ fontSize: '20px' }} aria-hidden="true" />
            I'm an Attendee
          </button>
          <button className="btn btn-ghost" onClick={() => onNavigate('stall')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <i className="ti ti-building-store" style={{ fontSize: '20px' }} aria-hidden="true" />
            I'm a Stall Owner
          </button>
          <button className="btn btn-ghost" onClick={() => onNavigate('admin')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: .7, fontSize: '13px' }}>
            <i className="ti ti-shield-lock" style={{ fontSize: '18px' }} aria-hidden="true" />
            Organizer / Admin
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '11px', marginTop: '24px' }}>
          EventPay — Cashless credit system
        </p>
      </div>
    </div>
  );
}
