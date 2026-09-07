"""
AviSafe FastAPI application entry point.

Run with: uvicorn src.api.main:app --reload
"""

from __future__ import annotations

import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.logger import LoggerManager
from src.core.settings import get_settings

from .routers import (
    airports,
    alerts,
    analytics,
    datasets,
    experiments,
    health,
    incidents,
    investigations,
    predictions,
    recommendations,
    reports,
    risk_register,
    safety_actions,
    training,
)
from .services import analytics_service, airport_service

logger = LoggerManager.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Loading + labelling data/NTSB.csv takes tens of seconds (dominated
    by narrative-text label matching over ~88k rows). Warm it in a
    background thread at startup so the first real dashboard/analytics
    request isn't the one that pays for it, without blocking server
    startup itself.
    """

    def _warm() -> None:
        try:
            analytics_service.get_dataset()
        except Exception:
            logger.exception("Failed to warm analytics cache at startup")

        try:
            airport_service.get_airports()
        except Exception:
            logger.exception("Failed to warm airport directory cache at startup")

    threading.Thread(target=_warm, daemon=True).start()

    yield


app = FastAPI(
    title="AviSafe API",
    description=(
        "Explainable AI for systemic aviation accident causation "
        "analysis -- serves trained model results, SHAP-driven safety "
        "recommendations, training job control, and live predictions."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

_dev_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://192.168.11.156:5175",
]
_extra_origins = [
    origin.strip()
    for origin in get_settings().cors_extra_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_dev_origins + _extra_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(experiments.router)
app.include_router(training.router)
app.include_router(predictions.router)
app.include_router(recommendations.router)
app.include_router(risk_register.router)
app.include_router(incidents.router)
app.include_router(investigations.router)
app.include_router(safety_actions.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(datasets.router)
app.include_router(reports.router)
app.include_router(airports.router)
