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

from .routers import (
    analytics,
    datasets,
    experiments,
    health,
    predictions,
    recommendations,
    reports,
    training,
)
from .services import analytics_service

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(experiments.router)
app.include_router(training.router)
app.include_router(predictions.router)
app.include_router(recommendations.router)
app.include_router(analytics.router)
app.include_router(datasets.router)
app.include_router(reports.router)
