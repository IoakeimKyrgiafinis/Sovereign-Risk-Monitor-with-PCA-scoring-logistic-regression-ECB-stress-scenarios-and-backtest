from fastapi import APIRouter, HTTPException
from src.data import get_latest_snapshot
from src.model import compute_risk_scores
from state import model_state

router = APIRouter()

@router.get("/")
def get_scores():
    try:
        snapshot = get_latest_snapshot()
        scores = compute_risk_scores(
            snapshot,
            pca_weights=model_state.get("pca_weights"),
            logistic_model=model_state.get("logistic_model"),
        )

        result = []
        for country, row in scores.iterrows():
            result.append({
                "country":            country,
                "spread_vs_germany":  round(float(row["spread_vs_germany"]), 4),
                "debt_gdp":           round(float(row["debt_gdp"]), 2),
                "spread_volatility":  round(float(row["spread_volatility"]), 4),
                "risk_score":         round(float(row["risk_score"]), 2),
                "risk_label":         str(row["risk_label"]),
                "crisis_probability": round(float(row["crisis_probability"]), 2),
            })

        return {"status": "ok", "data": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))