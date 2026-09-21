# Sovereign Risk Monitor

A full-stack sovereign credit risk monitoring and stress testing tool for Eurozone countries.

Live data is pulled from the FRED API and IMF World Economic Outlook. Risk scores are computed using a PCA-weighted composite model and a logistic regression crisis probability estimator, both fitted on historical Eurozone data since 2005.

---

## What it does

- **Current risk scores** — composite 0–100 risk score per country, updated from live FRED data, with Low/Moderate/High classification
- **Historical spreads** — 10Y bond spread time series from 2005 to present, contextualised against the 2010–2012 sovereign debt crisis
- **Model backtest** — retrospective risk scores showing the model would have flagged Greece as High risk from late 2009, before the official bailout in May 2010
- **Shock explorer** — interactive slider to apply continuous spread shocks (0–500bps) and observe in real time which countries flip risk tiers and at what threshold
- **ECB stress scenarios** — four formal scenarios (Baseline, Mild Stress, ECB 2024 Adverse, Crisis 2012 Replication) run through the full logistic regression model

---

## Methodology

### Indicators
Three indicators per country:
- **Spread vs Germany** — 10Y government bond yield spread, the market's real-time sovereign credit risk premium within the Eurozone
- **Debt/GDP** — General government gross debt as % of GDP (IMF WEO, annual)
- **Spread volatility** — 90-day rolling standard deviation of spreads, annualised. A leading indicator that spikes before spread levels do

### PCA Weighting
Weights are derived from Principal Component Analysis on historical monthly spread and volatility data across all six countries since 2005. The first principal component loadings are taken as absolute values, normalised to sum to 1, then scaled to 75% of the total weight. Debt/GDP receives a fixed 25% weight given its annual frequency.

Current weights: **Spread 37.5% · Debt/GDP 25% · Volatility 37.5%**

### Logistic Regression
A logistic regression trained on 1,540 monthly observations across six countries (France, Greece, Ireland, Italy, Portugal, Spain). Crisis periods labelled from official Eurozone bailout events:
- Greece: 2010–2013, 2015
- Ireland: 2010–2013
- Portugal: 2010–2014
- Italy, Spain: June 2011–December 2012

Crisis probability blends the logistic output (40%) with the normalised composite risk score (60%) to correct for model insensitivity at compressed spread levels.

### Stress Testing
Macro scenarios apply additive shocks to spread and debt/GDP, then recompute scores through the full model pipeline. Scenarios are anchored to real events:
- **Mild Stress** — 2018 Italy budget crisis (+100bps)
- **Adverse** — ECB 2024 Financial Stability Review adverse scenario (+250bps)
- **Crisis 2012** — Eurozone sovereign debt crisis peak replication (+500bps)

---

## Data Sources
- [FRED API](https://fred.stlouisfed.org/) — 10Y government bond yields, IMF debt/GDP series
- [IMF World Economic Outlook](https://www.imf.org/en/Publications/WEO) — General government gross debt

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Python 3.12 |
| Modelling | scikit-learn (PCA, LogisticRegression), pandas, numpy |
| Frontend | React + Vite |
| Charts | Recharts |
| Data | FRED API, IMF WEO via FRED |
| Deployment | Railway (two services) |

---

## Running locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment variables
Create a `.env` file in the `backend/` folder:


Get a free FRED API key at https://fred.stlouisfed.org/docs/api/api_key.html

---

## Project structure
'''
sovereign-risk-monitor/
├── backend/
│ ├── main.py # FastAPI app + model startup
│ ├── state.py # shared model state
│ ├── routers/
│ │ ├── scores.py # current risk scores endpoint
│ │ ├── macro.py # historical data + backtest endpoint
│ │ └── stress.py # stress scenario endpoints
│ └── src/
│ ├── data.py # FRED API data fetching
│ ├── model.py # PCA weighting + logistic regression
│ └── stress.py # stress scenario logic
└── frontend/
└── src/
├── App.jsx
├── api/client.js
└── components/
├── ScoreTable.jsx
├── HistoricalChart.jsx
├── Backtest.jsx
└── StressTest.jsx
'''
