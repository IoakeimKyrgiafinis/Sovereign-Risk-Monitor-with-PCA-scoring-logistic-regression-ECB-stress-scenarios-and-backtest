from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import scores, macro, stress
from src.data import (
    get_historical_spreads,
    get_debt_gdp,
    get_spread_volatility,
)
from src.model import fit_pca_weights, fit_logistic_model
from state import model_state

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Fitting models on startup...")
    hist_spreads = get_historical_spreads()
    hist_debt    = get_debt_gdp()
    hist_vol     = get_spread_volatility()

    model_state["pca_weights"]    = fit_pca_weights(hist_spreads, hist_vol)
    model_state["logistic_model"] = fit_logistic_model(hist_spreads, hist_debt, hist_vol)
    model_state["ready"]          = True
    print("Models ready.")
    yield
    model_state.clear()

app = FastAPI(title="Sovereign Risk Monitor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scores.router, prefix="/api/scores", tags=["scores"])
app.include_router(macro.router,  prefix="/api/macro",  tags=["macro"])
app.include_router(stress.router, prefix="/api/stress", tags=["stress"])

@app.get("/")
def root():
    return {
        "status": "Sovereign Risk Monitor API running",
        "models_ready": model_state.get("ready", False),
    }