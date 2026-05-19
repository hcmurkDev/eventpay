const STARTING = 100;
const CIRC = 276.46;

export default function CreditRing({ credits }) {
  const pct = Math.max(0, credits / STARTING);
  const offset = CIRC - CIRC * pct;
  const color = credits > 60 ? 'var(--green)' : credits > 30 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="credit-ring">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="44" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset .5s ease, stroke .3s ease' }}
        />
      </svg>
      <div className="credit-center">
        <div className="credit-val" style={{ color }}>{credits}</div>
        <div className="credit-lbl">CREDITS</div>
      </div>
    </div>
  );
}
