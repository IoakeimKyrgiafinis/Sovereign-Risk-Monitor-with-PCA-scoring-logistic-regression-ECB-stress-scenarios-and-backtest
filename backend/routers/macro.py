from fastapi import APIRouter, HTTPException
from src.data import get_historical_spreads, get_debt_gdp, get_spread_volatility
from src.model import compute_risk_scores
from state import model_state
import pandas as pd

router = APIRouter()

@router.get("/historical-spreads")
def get_historical():
    try:
        df = get_historical_spreads(start="2005-01-01")
        result = {}
        for country in df.columns:
            series = df[country].dropna()
            result[country] = [
                {"date": str(date.date()), "spread": round(float(val), 4)}
                for date, val in series.items()
            ]
        return {"status": "ok", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backtest")
def get_backtest():
    """
    Compute historical risk scores month by month using the fitted model.
    Shows whether the model flagged crises before they were officially declared.
    """
    try:
        hist_spreads = get_historical_spreads(start="2005-01-01")
        hist_debt    = get_debt_gdp(start="2005-01-01")
        hist_vol     = get_spread_volatility()

        debt_monthly = hist_debt.resample("MS").ffill()
        vol_monthly  = hist_vol.resample("MS").last()

        pca_weights    = model_state.get("pca_weights")
        logistic_model = model_state.get("logistic_model")

        result = {}

        for country in hist_spreads.columns:
            if country == "Germany":
                continue

            series = []
            for date, spread_val in hist_spreads[country].dropna().items():
                debt_val = debt_monthly[country].asof(date) \
                           if country in debt_monthly.columns else None
                vol_val  = vol_monthly[country].asof(date) \
                           if country in vol_monthly.columns else None

                if pd.isna(debt_val) or pd.isna(vol_val):
                    continue

                snapshot = pd.DataFrame([{
                    "spread_vs_germany":  float(spread_val),
                    "debt_gdp":           float(debt_val),
                    "spread_volatility":  float(vol_val),
                }], index=[country])
                snapshot.index.name = "country"

                scores = compute_risk_scores(snapshot, pca_weights, logistic_model)
                row = scores.iloc[0]

                series.append({
                    "date":              str(date.date()),
                    "risk_score":        round(float(row["risk_score"]), 2),
                    "crisis_probability": round(float(row["crisis_probability"]), 2),
                    "risk_label":        str(row["risk_label"]),
                })

            result[country] = series

        return {"status": "ok", "data": result}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))