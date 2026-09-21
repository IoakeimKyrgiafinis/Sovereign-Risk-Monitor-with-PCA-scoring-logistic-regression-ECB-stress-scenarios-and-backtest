import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

const COUNTRY_COLORS = {
  Greece:   '#ef4444',
  Italy:    '#f59e0b',
  Spain:    '#3b82f6',
  Portugal: '#8b5cf6',
  France:   '#06b6d4',
  Ireland:  '#22c55e',
}

export default function HistoricalChart({ data }) {
  // Merge all country series into one array keyed by date
  const allDates = new Set()
  Object.values(data).forEach(series => 
    series.forEach(d => allDates.add(d.date))
  )

  const chartData = Array.from(allDates).sort().map(date => {
    const point = { date }
    Object.entries(data).forEach(([country, series]) => {
      const match = series.find(d => d.date === date)
      if (match) point[country] = parseFloat(match.spread.toFixed(3))
    })
    return point
  })

  // Show only yearly labels
  const ticks = chartData
    .filter(d => d.date.endsWith('-01-01'))
    .map(d => d.date)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.5rem',
    }}>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={d => d.slice(0, 4)}
            stroke="var(--text-secondary)"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="var(--text-secondary)"
            tick={{ fontSize: 12 }}
            tickFormatter={v => `${v}pp`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.8rem',
            }}
            formatter={(val, name) => [`${val}pp`, name]}
            labelFormatter={l => l}
          />
          <Legend />
          {/* Mark crisis period */}
          <ReferenceLine x="2010-01-01" stroke="#ef444440" strokeDasharray="4 4" />
          <ReferenceLine x="2012-07-01" stroke="#ef444440" strokeDasharray="4 4" />
          {Object.keys(COUNTRY_COLORS).map(country => (
            <Line
              key={country}
              type="monotone"
              dataKey={country}
              stroke={COUNTRY_COLORS[country]}
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
        Dashed lines mark the 2010–2012 Eurozone sovereign debt crisis period.
      </p>
    </div>
  )
}