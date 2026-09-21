import os
import pandas as pd
import yfinance as yf
from fredapi import Fred
from dotenv import load_dotenv
import numpy as np
load_dotenv()

fred = Fred(api_key=os.getenv("FRED_API_KEY"))

# Countries we cover
COUNTRIES = {
    "Greece": "GR",
    "Italy": "IT",
    "Spain": "ES",
    "Portugal": "PT",
    "France": "FR",
    "Germany": "DE",
    "Ireland": "IE",
}

# FRED series IDs for 10Y government bond spreads vs Germany
# These are real FRED series
SPREAD_SERIES = {
    "Greece":   "IRLTLT01GRM156N",
    "Italy":    "IRLTLT01ITM156N",
    "Spain":    "IRLTLT01ESM156N",
    "Portugal": "IRLTLT01PTM156N",
    "France":   "IRLTLT01FRM156N",
    "Germany":  "IRLTLT01DEM156N",
    "Ireland":  "IRLTLT01IEM156N",
}

# FRED series for debt/GDP ratio
DEBT_GDP_SERIES = {
    "Greece":   "GGGDTAGRC188N",
    "Italy":    "GGGDTAITA188N",
    "Spain":    "GGGDTAESA188N",
    "Portugal": "GGGDTAPRT188N",
    "France":   "GGGDTAFRA188N",
    "Germany":  "GGGDTADEA188N",
    "Ireland":  "GGGDTAIRL188N",
}


def get_bond_yields(start="2005-01-01") -> pd.DataFrame:
    """Fetch 10Y government bond yields for all countries from FRED."""
    data = {}
    for country, series_id in SPREAD_SERIES.items():
        try:
            series = fred.get_series(series_id, observation_start=start)
            data[country] = series
        except Exception as e:
            print(f"Warning: could not fetch {country} yield data: {e}")
    
    df = pd.DataFrame(data)
    df.index.name = "date"
    return df


def get_spreads(start="2005-01-01") -> pd.DataFrame:
    """Compute spreads vs Germany (the risk-free benchmark)."""
    yields = get_bond_yields(start=start)
    if "Germany" not in yields.columns:
        raise ValueError("German yield data missing — cannot compute spreads")
    
    spreads = yields.subtract(yields["Germany"], axis=0)
    spreads = spreads.drop(columns=["Germany"])
    return spreads


def get_debt_gdp(start="2005-01-01") -> pd.DataFrame:
    """Fetch government debt as % of GDP from FRED."""
    data = {}
    for country, series_id in DEBT_GDP_SERIES.items():
        try:
            series = fred.get_series(series_id, observation_start=start)
            data[country] = series
        except Exception as e:
            print(f"Warning: could not fetch {country} debt/GDP data: {e}")
    
    df = pd.DataFrame(data)
    df.index.name = "date"
    return df


def get_latest_snapshot() -> pd.DataFrame:
    """
    Get the most recent values for all indicators per country.
    Uses last valid value instead of strict latest to handle frequency mismatches.
    """
    spreads = get_spreads()
    debt_gdp = get_debt_gdp()

    # Use last valid observation for each country (handles frequency mismatch)
    latest_spread = spreads.apply(lambda col: col.dropna().iloc[-1] if not col.dropna().empty else None).rename("spread_vs_germany")
    latest_debt = debt_gdp.apply(lambda col: col.dropna().iloc[-1] if not col.dropna().empty else None).rename("debt_gdp")

    snapshot = pd.concat([latest_spread, latest_debt], axis=1)
    snapshot.index.name = "country"
    
    # Drop Germany from spreads result (it's 0 by definition, not a target country)
    snapshot = snapshot.drop(index="Germany", errors="ignore")
    
    print("Debug - spreads available:", spreads.columns.tolist())
    print("Debug - latest spreads:\n", latest_spread)
    print("Debug - latest debt:\n", latest_debt)
    
    return snapshot.dropna()

def get_historical_spreads(start="2005-01-01") -> pd.DataFrame:
    """
    Return full historical spread time series for all countries.
    Used for the crisis backtest visualization.
    """
    return get_spreads(start=start)

def get_spread_volatility(window: int = 90) -> pd.DataFrame:
    """
    Compute rolling volatility of spreads for each country.
    Volatility is a leading indicator — it spikes before spread levels do.
    Uses 90-day rolling standard deviation, annualized.
    """
    spreads = get_spreads(start="2005-01-01")
    
    # Resample to daily frequency, forward fill gaps
    spreads_daily = spreads.resample("D").ffill()
    
    # Rolling std, annualized (x sqrt(252) trading days)
    volatility = spreads_daily.rolling(window=window).std() * np.sqrt(252)
    
    return volatility


def get_latest_volatility() -> pd.Series:
    """
    Get the most recent volatility reading per country.
    """
    vol = get_spread_volatility()
    latest = vol.apply(lambda col: col.dropna().iloc[-1] if not col.dropna().empty else None)
    latest.name = "spread_volatility"
    return latest


def get_latest_snapshot() -> pd.DataFrame:
    """
    Get the most recent values for all indicators per country.
    Now includes spread volatility as a third indicator.
    """
    spreads = get_spreads()
    debt_gdp = get_debt_gdp()
    
    latest_spread = spreads.apply(lambda col: col.dropna().iloc[-1] if not col.dropna().empty else None).rename("spread_vs_germany")
    latest_debt = debt_gdp.apply(lambda col: col.dropna().iloc[-1] if not col.dropna().empty else None).rename("debt_gdp")
    latest_vol = get_latest_volatility()

    snapshot = pd.concat([latest_spread, latest_debt, latest_vol], axis=1)
    snapshot.index.name = "country"
    snapshot = snapshot.drop(index="Germany", errors="ignore")

    return snapshot.dropna()