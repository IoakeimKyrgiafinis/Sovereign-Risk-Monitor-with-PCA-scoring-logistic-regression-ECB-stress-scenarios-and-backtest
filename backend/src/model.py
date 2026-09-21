import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression

# Crisis periods based on historical Eurozone events
CRISIS_PERIODS = {
    "Greece":   [("2010-01-01", "2013-12-31"), ("2015-01-01", "2015-12-31")],
    "Italy":    [("2011-06-01", "2012-12-31")],
    "Spain":    [("2011-06-01", "2012-12-31")],
    "Portugal": [("2010-01-01", "2014-12-31")],
    "France":   [],
    "Ireland":  [("2010-01-01", "2013-12-31")],
}

THRESHOLDS = {
    "spread_vs_germany": {"low": 0.0,  "high": 4.0},
    "debt_gdp":          {"low": 40.0, "high": 180.0},
    "spread_volatility": {"low": 0.0,  "high": 1.5},
}


def _normalize(series: pd.Series, low: float, high: float) -> pd.Series:
    clipped = series.clip(lower=low, upper=high)
    return ((clipped - low) / (high - low)) * 100


def _normalize_snapshot(df: pd.DataFrame) -> pd.DataFrame:
    normalized = pd.DataFrame(index=df.index)
    for col, bounds in THRESHOLDS.items():
        if col in df.columns:
            normalized[col] = _normalize(df[col], bounds["low"], bounds["high"])
    return normalized


def build_crisis_labels(historical_spreads: pd.DataFrame) -> pd.DataFrame:
    labels = pd.DataFrame(0, index=historical_spreads.index,
                          columns=historical_spreads.columns)

    for country, periods in CRISIS_PERIODS.items():
        if country not in labels.columns:
            continue
        for start, end in periods:
            mask = (labels.index >= pd.Timestamp(start)) & \
                   (labels.index <= pd.Timestamp(end))
            labels.loc[mask, country] = 1

    return labels


def fit_pca_weights(
    historical_spreads: pd.DataFrame,
    historical_vol: pd.DataFrame,
) -> np.ndarray:
    """
    Fit PCA on historical spread and volatility data across all countries.
    Debt is annual so excluded from PCA — varies too slowly at monthly frequency.
    Returns weights array: [spread_weight, debt_weight, vol_weight]
    """
    spreads_m = historical_spreads.resample("MS").last()
    vol_m = historical_vol.resample("MS").last()

    rows = []
    for country in spreads_m.columns:
        if country == "Germany":
            continue
        s = spreads_m[country].dropna()
        v = vol_m[country].dropna() if country in vol_m.columns else None

        combined = pd.concat([s, v], axis=1).dropna()
        combined.columns = ["spread", "vol"]

        combined["spread"] = _normalize(combined["spread"],
                                        THRESHOLDS["spread_vs_germany"]["low"],
                                        THRESHOLDS["spread_vs_germany"]["high"])
        combined["vol"] = _normalize(combined["vol"],
                                     THRESHOLDS["spread_volatility"]["low"],
                                     THRESHOLDS["spread_volatility"]["high"])
        rows.append(combined)

    feature_matrix = pd.concat(rows).dropna().values

    scaler = StandardScaler()
    scaled = scaler.fit_transform(feature_matrix)

    pca = PCA(n_components=1)
    pca.fit(scaled)

    loadings = np.abs(pca.components_[0])
    pca_weights_2 = loadings / loadings.sum()

    spread_w = pca_weights_2[0] * 0.75
    vol_w    = pca_weights_2[1] * 0.75
    debt_w   = 0.25

    weights = np.array([spread_w, debt_w, vol_w])
    weights = weights / weights.sum()

    print(f"PCA weights → spread: {weights[0]:.3f}, "
          f"debt: {weights[1]:.3f}, vol: {weights[2]:.3f}")

    return weights


def fit_logistic_model(
    historical_spreads: pd.DataFrame,
    historical_debt: pd.DataFrame,
    historical_vol: pd.DataFrame,
) -> LogisticRegression:
    """
    Fit logistic regression to predict crisis probability.
    Uses monthly spread and volatility; forward-fills annual debt.
    """
    crisis_labels = build_crisis_labels(historical_spreads)
    debt_monthly = historical_debt.resample("MS").ffill()

    rows = []
    for country in historical_spreads.columns:
        if country == "Germany":
            continue

        spread = historical_spreads[country].dropna()
        label  = crisis_labels[country]
        debt   = debt_monthly[country].dropna() \
                 if country in debt_monthly.columns else None
        vol    = historical_vol[country].dropna() \
                 if country in historical_vol.columns else None

        combined = pd.concat([spread, label], axis=1).dropna()
        combined.columns = ["spread", "label"]

        for date, row in combined.iterrows():
            debt_val = float(debt.asof(date)) \
                       if debt is not None and len(debt) > 0 else np.nan
            vol_val  = float(vol.asof(date)) \
                       if vol is not None and len(vol) > 0 else np.nan

            rows.append({
                "spread":  row["spread"],
                "debt":    debt_val,
                "vol":     vol_val,
                "label":   row["label"],
                "country": country,
            })

    df = pd.DataFrame(rows).dropna()

    print(f"Logistic training set: {len(df)} rows, "
          f"crisis rate: {df['label'].mean():.2%}")
    print("Crisis rows per country:")
    print(df.groupby("country")["label"].sum())

    X = df[["spread", "debt", "vol"]].values
    y = df["label"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(class_weight="balanced", random_state=42,
                               max_iter=1000)
    model.fit(X_scaled, y)
    model.scaler_ = scaler

    print(f"Logistic coefficients → "
          f"spread: {model.coef_[0][0]:.3f}, "
          f"debt: {model.coef_[0][1]:.3f}, "
          f"vol: {model.coef_[0][2]:.3f}")

    return model


def compute_risk_scores(
    snapshot: pd.DataFrame,
    pca_weights: np.ndarray = None,
    logistic_model: LogisticRegression = None,
) -> pd.DataFrame:
    """
    Compute sovereign risk scores (0-100) and crisis probability.
    Blends logistic regression output with normalized composite score
    to correct for model insensitivity at low spread levels.
    """
    df = snapshot.copy()
    normalized = _normalize_snapshot(df)

    cols = ["spread_vs_germany", "debt_gdp", "spread_volatility"]
    cols = [c for c in cols if c in normalized.columns]

    if pca_weights is not None and len(pca_weights) == len(cols):
        weights = pca_weights
    else:
        weights = np.ones(len(cols)) / len(cols)

    score_matrix = normalized[cols].values
    df["risk_score"] = (score_matrix * weights).sum(axis=1).round(2)

    df["risk_label"] = pd.cut(
        df["risk_score"],
        bins=[0, 30, 60, 100],
        labels=["Low", "Moderate", "High"],
        include_lowest=True,
    )

    if logistic_model is not None:
        features = df[["spread_vs_germany", "debt_gdp",
                        "spread_volatility"]].values
        features_scaled = logistic_model.scaler_.transform(features)
        proba = logistic_model.predict_proba(features_scaled)[:, 1]

        # Blend logistic probability (40%) with composite score (60%)
        # corrects for model insensitivity at low spread levels
        blended = (proba * 0.4) + (df["risk_score"].values / 100 * 0.6)
        df["crisis_probability"] = (blended * 100).round(2)

    return df