from fastapi import APIRouter, HTTPException
from src.data import get_latest_snapshot
from src.model import compute_risk_scores
from src.stress import apply_stress, SCENARIOS
from state import model_state
router = APIRouter()

@router.get("/scenarios")
def get_scenarios():
    return {
        "status": "ok",
        "data": [
            {"name": name, "description": s["description"]}
            for name, s in SCENARIOS.items()
        ]
    }

@router.get("/{scenario_name}")
def get_stress(scenario_name: str):
    if scenario_name not in SCENARIOS:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{scenario_name}' not found. "
                   f"Available: {list(SCENARIOS.keys())}"
        )
    try:
        snapshot = get_latest_snapshot()
        scores   = compute_risk_scores(
            snapshot,
            pca_weights=model_state.get("pca_weights"),
            logistic_model=model_state.get("logistic_model"),
        )
        stressed = apply_stress(scores, scenario_name, 
                                lambda s: compute_risk_scores(
                                    s,
                                    pca_weights=model_state.get("pca_weights"),
                                    logistic_model=model_state.get("logistic_model"),
                                ))

        result = []
        for country, row in stressed.iterrows():
            result.append({
                "country":          country,
                "risk_score":       round(float(row["risk_score"]), 2),
                "risk_score_delta": round(float(row["risk_score_delta"]), 2),
                "risk_label":       str(row["risk_label"]),
                "label_changed":    bool(row["label_changed"]),
                "scenario":         row["scenario"],
            })

        return {
            "status":      "ok",
            "scenario":    scenario_name,
            "description": SCENARIOS[scenario_name]["description"],
            "data":        result,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))