from src.data import (
    get_latest_snapshot,
    get_historical_spreads,
    get_debt_gdp,
    get_spread_volatility,
)
from src.model import fit_pca_weights, fit_logistic_model, compute_risk_scores

print("Fetching data...")
snapshot        = get_latest_snapshot()
hist_spreads    = get_historical_spreads()
hist_debt       = get_debt_gdp()
hist_vol        = get_spread_volatility()

print("\nFitting PCA weights...")
pca_weights = fit_pca_weights(hist_spreads, hist_vol)

print("\nFitting logistic model...")
logistic_model = fit_logistic_model(hist_spreads, hist_debt, hist_vol)

print("\nComputing risk scores...")
scores = compute_risk_scores(snapshot, pca_weights, logistic_model)
print(scores[["risk_score", "risk_label", "crisis_probability"]])