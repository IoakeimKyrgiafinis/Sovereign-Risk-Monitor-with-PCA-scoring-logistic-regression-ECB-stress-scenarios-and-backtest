import { useEffect, useState } from 'react'
import { getBacktest } from '../api/client'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

const COUNTRY_COLORS = {
  Greece:   '#ef4444',
  Italy:    '#f59e0b',
  Spain:    '#3b82f6',
  Portugal: '#8b5cf6',
  France:   '#06b6d4',
  Ireland:  '#22c55e',
}

const CRISIS_EVENTS = [
  { date: '2010-05-01', label: 'Greece bailout' },
  { date: '2010-11-01', label: 'Ireland bailout' },
  { date: '2011-04-01', label: 'Portugal bailout' },
  { date: '2012-07-01', label: 'Draghi "whatever it takes"' },
  { date: '2015-01-01', label: 'Greece referendum' },
]

export default function Backtest() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(['Greece', 'Italy', 'Ireland'])
  const [metric, setMetric]     = useState('risk_score')

  useEffect(() => {
    getBacktest().then(res => {
      setData(res.data.data)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '2rem',
      color: 'var(--text-secondary)',
      fontSize: '0.875rem',
    }}>
      Computing historical risk scores... this takes a few seconds.
    </div>
  )

  // Merge all country series by date
  const allDates = new Set()
  Object.values(data).forEach(series =>
    series.forEach(d => allDates.add(d.date))
  )

  const chartData = Array.from(allDates).sort().map(date => {
    const point = { date }
    Object.entries(data).forEach(([country, series]) => {
      const match = series.find(d => d.date === date)
      if (match) point[country] = match[metric]
    })
    return point
  })

  const ticks = chartData
    .filter(d => d.date.endsWith('-01-01'))
    .map(d => d.date)

  const toggleCountry = (country) => {
    setSelected(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    )
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.5rem',
    }}>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Country toggles */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Object.keys(COUNTRY_COLORS).map(country => (
            <button
              key={country}
              onClick={() => toggleCountry(country)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${selected.includes(country) ? COUNTRY_COLORS[country] : 'var(--border)'}`,
                background: selected.includes(country) ? `${COUNTRY_COLORS[country]}20` : 'transparent',
                color: selected.includes(country) ? COUNTRY_COLORS[country] : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: selected.includes(country) ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {country}
            </button>
          ))}
        </div>

        {/* Metric toggle */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'risk_score', label: 'Risk Score' },
            { id: 'crisis_probability', label: 'Crisis Probability' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: metric === m.id ? 'var(--accent-blue)' : 'var(--border)',
                background: metric === m.id ? 'var(--accent-blue)20' : 'transparent',
                color: metric === m.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.15s',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={d => d.slice(0, 4)}
            stroke="var(--text-secondary)"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="var(--text-secondary)"
            tick={{ fontSize: 12 }}
            tickFormatter={v => metric === 'crisis_probability' ? `${v}%` : v}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.8rem',
            }}
            formatter={(val, name) => [
              metric === 'crisis_probability' ? `${val.toFixed(1)}%` : val.toFixed(1),
              name
            ]}
            labelFormatter={l => l}
          />

          {/* Crisis event reference lines */}
          {CRISIS_EVENTS.map(event => (
            <ReferenceLine
              key={event.date}
              x={event.date}
              stroke="#ef444450"
              strokeDasharray="4 4"
              label={{
                value: event.label,
                position: 'top',
                fontSize: 9,
                fill: '#ef4444',
              }}
            />
          ))}

          {/* Country lines */}
          {selected.map(country => (
            <Line
              key={country}
              type="monotone"
              dataKey={country}
              stroke={COUNTRY_COLORS[country]}
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
        Historical risk scores computed using the fitted PCA-weighted model and logistic regression.
        Dashed lines mark official crisis events. The model flagged Greece as High risk from late 2009 -
        May 2010.
      </p>
    </div>
  )
}