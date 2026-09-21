import { useEffect, useState } from 'react'
import { getScores, getHistoricalSpreads, getScenarios } from './api/client'
import ScoreTable from './components/ScoreTable'
import StressTest from './components/StressTest'
import HistoricalChart from './components/HistoricalChart'
import Backtest from './components/Backtest'

function App() {
  const [scores, setScores] = useState([])
  const [historical, setHistorical] = useState({})
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      getScores(),
      getHistoricalSpreads(),
      getScenarios(),
    ])
      .then(([scoresRes, historicalRes, scenariosRes]) => {
        setScores(scoresRes.data.data)
        setHistorical(historicalRes.data.data)
        setScenarios(scenariosRes.data.data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: 'var(--text-secondary)',
      fontSize: '1rem',
    }}>
      Loading market data...
    </div>
  )

  if (error) return (
    <div style={{ padding: '2rem', color: 'var(--risk-high)' }}>
      Error: {error}
    </div>
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
            Sovereign Risk Monitor
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Eurozone sovereign credit risk - live FRED data - PCA-weighted scoring - ECB stress scenarios
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last updated</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {new Date().toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Source: FRED · IMF World Economic Outlook
          </p>
        </div>
      </div>

      {/* Scores */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Current Risk Scores
        </h2>
        <ScoreTable scores={scores} />
      </section>

      {/* Historical Chart */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Historical Spreads vs Germany (2005–Present)
        </h2>
        <HistoricalChart data={historical} />
      </section>
      {/* Backtest */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Model Backtest — Crisis Detection (2005–Present)
        </h2>
        <Backtest />
      </section>
      {/* Stress Test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Stress Testing
        </h2>
        <StressTest scores={scores} scenarios={scenarios} />
      </section>
      {/* Methodology */}
      <section style={{
        borderTop: '1px solid var(--border)',
        paddingTop: '2rem',
        marginTop: '1rem',
      }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Methodology
        </h2>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '2rem',
        }}>
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Indicators</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Three indicators per country: 10Y government bond spread vs Germany (market signal),
              general government debt as % of GDP (fiscal fundamental), and 90-day rolling spread
              volatility annualized (early warning signal). Data sourced from FRED and IMF World
              Economic Outlook.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>PCA Weighting</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Indicator weights are derived from Principal Component Analysis on historical monthly
              spread and volatility data across all six countries since 2005. The first principal
              component loadings determine weights, ensuring they reflect empirical variance in
              Eurozone sovereign stress rather than arbitrary assumptions. Debt/GDP receives a
              fixed 25% weight given its annual frequency.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Crisis Probability</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              A logistic regression model trained on 1,540 monthly observations across six countries,
              with crisis periods labelled using historical Eurozone bailout events (2010–2015).
              Crisis probability blends the logistic output with the composite risk score to correct
              for model insensitivity at compressed spread levels. Backtested against the 2010–2012
              sovereign debt crisis.
            </p>
          </div>
        </div>
      </section>        
    </div>
  )
}

export default App