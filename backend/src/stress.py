import pandas as pd
import numpy as np

# ECB stress scenarios — based on ECB 2024 Financial Stability Review
# adverse scenario parameters (publicly available)
# These represent shocks ABOVE current levels

SCENARIOS = {
    "baseline": {
        "description": "No stress — current market conditions persist",
        "spread_shock": 0.0,   # no change in spreads
        "debt_gdp_shock": 0.0, # no change in debt/GDP
    },
    "mild_stress": {
        "description": "Mild risk-off episode — similar to 2018 Italy selloff",
        "spread_shock": 1.0,   # +100bps spread widening
        "debt_gdp_shock": 5.0, # +5pp debt/GDP (growth slowdown)
    },
    "adverse": {
        "description": "ECB 2024 adverse scenario — severe but plausible shock",
        "spread_shock": 2.5,   # +250bps spread widening
        "debt_gdp_shock": 15.0,# +15pp debt/GDP (recession + fiscal slippage)
    },
    "crisis_2012": {
        "description": "Replication of 2012 Eurozone sovereign debt crisis peaks",
        "spread_shock": 5.0,   # +500bps — Greek/Italian crisis levels
        "debt_gdp_shock": 25.0,# +25pp — fiscal deterioration under crisis
    },
}


def apply_stress(
    scores_df: pd.DataFrame,
    scenario_name: str,
    compute_risk_scores_fn,
) -> pd.DataFrame:
    """
    Apply a macro stress scenario to the current snapshot and recompute scores.

    Args:
        scores_df: output of compute_risk_scores(), contains raw indicators
        scenario_name: one of the keys in SCENARIOS
        compute_risk_scores_fn: pass in compute_risk_scores from model.py

    Returns:
        Stressed scores dataframe with delta vs baseline
    """
    if scenario_name not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_name}. Choose from {list(SCENARIOS.keys())}")

    scenario = SCENARIOS[scenario_name]

    # Build stressed snapshot from raw indicators
        # Build stressed snapshot from raw indicators
    stressed = pd.DataFrame(index=scores_df.index)
    stressed["spread_vs_germany"] = (
        scores_df["spread_vs_germany"] + scenario["spread_shock"]
    ).clip(lower=0)
    stressed["debt_gdp"] = (
        scores_df["debt_gdp"] + scenario["debt_gdp_shock"]
    ).clip(lower=0)
    # Carry through volatility unchanged — not shocked in macro scenarios
    stressed["spread_volatility"] = scores_df["spread_volatility"]

    # Recompute risk scores under stress
    stressed_scores = compute_risk_scores_fn(stressed)

    # Add delta columns vs baseline
    stressed_scores["risk_score_delta"] = (
        stressed_scores["risk_score"] - scores_df["risk_score"]
    ).round(2)

    stressed_scores["label_changed"] = (
        stressed_scores["risk_label"] != scores_df["risk_label"]
    )

    stressed_scores["scenario"] = scenario_name
    stressed_scores["scenario_description"] = scenario["description"]

    return stressed_scores


def run_all_scenarios(
    scores_df: pd.DataFrame,
    compute_risk_scores_fn,
) -> dict:
    """
    Run all scenarios and return results as a dict keyed by scenario name.
    """
    return {
        name: apply_stress(scores_df, name, compute_risk_scores_fn)
        for name in SCENARIOS
    }