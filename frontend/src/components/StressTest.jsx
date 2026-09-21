import { useState } from 'react'
import { getStressTest } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const RISK_COLORS = {
  Low:      'var(--risk-low)',
  Moderate: 'var(--risk-moderate)',
  High:     'var(--risk-high)',
}

const THRESHOLDS = {
  spread_vs_germany: { low: 0.0, high: 4.0 },
  debt_gdp:          { low: 40.0, high: 180.0 },
  spread_volatility: { low: 0.0, high: 1.5 },
}

const PCA_WEIGHTS = [0.375, 0.250, 0.375]

function normalize(val, low, high) {
  return Math.min(100, Math.max(0, ((Math.min(val, high) - low) / (high - low)) * 100))
}

function computeScore(country, shockBps) {
  const shockPp = shockBps / 100
  const shockedSpread = country.spread_vs_germany + shockPp
  
  const spreadScore = normalize(shockedSpread, THRESHOLDS.spread_vs_germany.low, THRESHOLDS.spread_vs_germany.high)
  const debtScore   = normalize(country.debt_gdp, THRESHOLDS.debt_gdp.low, THRESHOLDS.debt_gdp.high)
  const volScore    = normalize(country.spread_volatility, THRESHOLDS.spread_volatility.low, THRESHOLDS.spread_volatility.high)

  const score = spreadScore * PCA_WEIGHTS[0] + debtScore * PCA_WEIGHTS[1] + volScore * PCA_WEIGHTS[2]

  const label = score > 60 ? 'High' : score > 30 ? 'Moderate' : 'Low'
  return { score: Math.round(score * 10) / 10, label }
}

function getRiskTippingPoint(country) {
  // Find the bps shock that flips this country to the next risk tier
  const currentLabel = computeScore(country, 0).label
  const targetLabel  = currentLabel === 'Low' ? 'Moderate' : 'High'
  if (currentLabel === 'High') return null // already at max

  for (let bps = 0; bps <= 500; bps += 5) {
    const { label } = computeScore(country, bps)
    if (label === targetLabel) return bps
  }
  return null
}

// ── Slider Section ────────────────────────────────────────────
function SliderExplorer({ scores }) {
  const [shock, setShock] = useState(0)

  const stressed = scores.map(c => ({
    ...c,
    ...computeScore(c, shock),
    baseline_label: computeScore(c, 0).label,
    baseline_score: computeScore(c, 0).score,
    tipping_point:  getRiskTippingPoint(c),
  })).sort((a, b) => b.score - a.score)

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Slider control */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            Spread Shock
          </span>
          <span style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: shock === 0 ? 'var(--text-secondary)' : shock < 150 ? 'var(--risk-moderate)' : 'var(--risk-high)',
          }}>
            {shock === 0 ? 'No shock' : `+${shock}bps`}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={500}
          step={5}
          value={shock}
          onChange={e => setShock(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          <span>0bps — Baseline</span>
          <span>100bps — Mild Stress</span>
          <span>250bps — ECB Adverse</span>
          <span>500bps — Crisis 2012</span>
        </div>
      </div>

      {/* Country cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {stressed.map(c => {
          const flipped = c.label !== c.baseline_label
          return (
            <div key={c.country} style={{
              background: 'var(--bg-card)',
              border: `1px solid ${flipped ? RISK_COLORS[c.label] + '60' : 'var(--border)'}`,
              borderRadius: '10px',
              padding: '1rem',
              transition: 'border-color 0.3s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.country}</span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: RISK_COLORS[c.label],
                  background: `${RISK_COLORS[c.label]}20`,
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}>
                  {c.label}
                  {flipped && ' ↑'}
                </span>
              </div>

              {/* Score bar */}
              <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginBottom: '0.75rem' }}>
                <div style={{
                  height: '100%',
                  width: `${c.score}%`,
                  background: RISK_COLORS[c.label],
                  borderRadius: '2px',
                  transition: 'width 0.2s ease, background 0.3s',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Score: <span style={{ color: RISK_COLORS[c.label], fontWeight: 600 }}>{c.score}</span>
                </span>
                {c.tipping_point !== null && shock < c.tipping_point && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    Flips at <span style={{ color: 'var(--risk-moderate)', fontWeight: 600 }}>+{c.tipping_point}bps</span>
                  </span>
                )}
                {flipped && (
                  <span style={{ color: RISK_COLORS[c.label], fontSize: '0.75rem', fontWeight: 600 }}>
                    Risk upgraded
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Scenario Section ──────────────────────────────────────────
function ScenarioAnalysis({ scores, scenarios }) {
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runScenario = (scenarioName) => {
    setSelected(scenarioName)
    setLoading(true)
    getStressTest(scenarioName)
      .then(res => {
        setResult(res.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const chartData = result
    ? result.data.map(d => {
        const baseline = scores.find(s => s.country === d.country)
        return {
          country:       d.country,
          baseline:      baseline ? baseline.risk_score : 0,
          stressed:      d.risk_score,
          delta:         d.risk_score_delta,
          risk_label:    d.risk_label,
          label_changed: d.label_changed,
        }
      }).sort((a, b) => b.stressed - a.stressed)
    : []

  return (
    <div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Formal ECB-anchored scenarios — runs the full logistic regression model including crisis probability.
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {scenarios.map(s => (
          <button
            key={s.name}
            onClick={() => runScenario(s.name)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: selected === s.name ? 'var(--accent-blue)' : 'var(--border)',
              background: selected === s.name ? 'var(--accent-blue)20' : 'transparent',
              color: selected === s.name ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: selected === s.name ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {s.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {result && (
        <p style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: '1.25rem',
          padding: '0.75rem',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          borderLeft: '3px solid var(--accent-blue)',
        }}>
          {result.description}
        </p>
      )}

      {loading && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Running scenario...</p>}

      {result && !loading && (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={4}>
              <XAxis dataKey="country" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                }}
                formatter={(val, name) => [val.toFixed(1), name]}
              />
              <Bar dataKey="baseline" name="Baseline" fill="#3b82f640" radius={[4,4,0,0]} />
              <Bar dataKey="stressed" name="Stressed" radius={[4,4,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={RISK_COLORS[entry.risk_label]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Delta table */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '130px 80px 80px 80px 140px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '0.5rem 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <span>Country</span>
              <span>Baseline</span>
              <span>Stressed</span>
              <span>Delta</span>
              <span>Label Change</span>
            </div>
            {chartData.map(d => (
              <div key={d.country} style={{
                display: 'grid',
                gridTemplateColumns: '130px 80px 80px 80px 140px',
                fontSize: '0.875rem',
                padding: '0.6rem 0',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600 }}>{d.country}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{d.baseline.toFixed(1)}</span>
                <span style={{ color: RISK_COLORS[d.risk_label], fontWeight: 600 }}>{d.stressed.toFixed(1)}</span>
                <span style={{ color: 'var(--risk-high)' }}>+{d.delta.toFixed(1)}</span>
                <span>
                  {d.label_changed
                    ? <span style={{
                        color: 'var(--risk-high)',
                        background: 'var(--risk-high)20',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>↑ Upgraded Risk</span>
                    : <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>No change</span>
                  }
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {!result && !loading && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Select a scenario above to run the stress test.
        </p>
      )}
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────
export default function StressTest({ scores, scenarios }) {
  const [tab, setTab] = useState('explorer')

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.5rem',
    }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'explorer', label: ' Shock Explorer' },
          { id: 'scenarios', label: ' ECB Scenarios' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: tab === t.id ? 'var(--accent-blue)' : 'var(--border)',
              background: tab === t.id ? 'var(--accent-blue)20' : 'transparent',
              color: tab === t.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: tab === t.id ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'explorer'
        ? <SliderExplorer scores={scores} />
        : <ScenarioAnalysis scores={scores} scenarios={scenarios} />
      }
    </div>
  )
}