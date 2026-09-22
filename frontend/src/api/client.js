import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://sovereign-risk-monitor-with-pca-scoring-logistic-production.up.railway.app'

const api = axios.create({
  baseURL: BASE_URL,
})

export const getScores = () => api.get('/api/scores/')
export const getHistoricalSpreads = () => api.get('/api/macro/historical-spreads')
export const getScenarios = () => api.get('/api/stress/scenarios')
export const getStressTest = (scenario) => api.get(`/api/stress/${scenario}`)
export const getBacktest = () => api.get('/api/macro/backtest')