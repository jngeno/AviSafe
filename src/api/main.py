"""
AviSafe FastAPI application entry point.

Run with: uvicorn src.api.main:app --reload
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import experiments, health, predictions, training

app = FastAPI(
    title="AviSafe API",
    description=(
        "Explainable AI for systemic aviation accident causation "
        "analysis -- serves trained model results, SHAP-driven safety "
        "recommendations, training job control, and live predictions."
    ),
    version="0.1.0",
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
