const RISK_COLORS = {
  Low: 'var(--risk-low)',
  Moderate: 'var(--risk-moderate)',
  High: 'var(--risk-high)',
}

function RiskBar({ score }) {
  return (
    <div style={{
      width: '100%',
      height: '6px',
      background: 'var(--border)',
      borderRadius: '3px',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${score}%`,
        height: '100%',
        background: score > 60 ? 'var(--risk-high)' : score > 30 ? 'var(--risk-moderate)' : 'var(--risk-low)',
        borderRadius: '3px',
        transition: 'width 0.6s ease',
      }} />
    </div>
  )
}

export default function ScoreTable({ scores }) {
  const sorted = [...scores].sort((a, b) => b.risk_score - a.risk_score)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr 100px 100px 110px 120px',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        <span>Country</span>
        <span>Risk Score</span>
        <span>Spread</span>
        <span>Debt/GDP</span>
        <span>Volatility</span>
        <span>Crisis Prob.</span>
      </div>

      {/* Rows */}
      {sorted.map((c, i) => (
        <div key={c.country} style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 100px 100px 110px 120px',
          padding: '1rem 1.5rem',
          borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
          alignItems: 'center',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {/* Country */}
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.country}</span>

          {/* Score + bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '2rem' }}>
            <span style={{
              fontWeight: 700,
              fontSize: '1rem',
              color: RISK_COLORS[c.risk_label],
              minWidth: '40px',
            }}>
              {c.risk_score}
            </span>
            <div style={{ flex: 1 }}>
              <RiskBar score={c.risk_score} />
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: RISK_COLORS[c.risk_label],
              background: `${RISK_COLORS[c.risk_label]}20`,
              padding: '2px 8px',
              borderRadius: '4px',
              minWidth: '70px',
              textAlign: 'center',
            }}>
              {c.risk_label}
            </span>
          </div>

          {/* Spread */}
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {c.spread_vs_germany.toFixed(2)}pp
          </span>

          {/* Debt/GDP */}
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {c.debt_gdp.toFixed(1)}%
          </span>

          {/* Volatility */}
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {c.spread_volatility.toFixed(3)}
          </span>

          {/* Crisis probability */}
          <span style={{
            fontWeight: 600,
            fontSize: '0.875rem',
            color: c.crisis_probability > 30 ? 'var(--risk-high)'
                 : c.crisis_probability > 15 ? 'var(--risk-moderate)'
                 : 'var(--text-secondary)',
          }}>
            {c.crisis_probability.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}