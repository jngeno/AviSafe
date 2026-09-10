# AviSafe

## Beyond the Black Box

**An Explainable AI Framework for Systemic Aviation Accident Causation Analysis**

AviSafe is a production-oriented research platform for analysing aviation accident causation using machine learning and explainable AI. It is being developed as an MSc research project, with a modular architecture that supports reproducible research, deployment, and future commercial expansion.

## Research Objective

The platform will identify and explain systemic factors associated with aviation accidents. It combines structured accident data, aviation-specific risk engineering, classification models, and explanation methods to produce interpretable safety insights and actionable recommendations.

## Architecture

The application follows a layered architecture:

```text
Presentation Layer
        ↓
FastAPI
        ↓
Business Logic
        ↓
Machine Learning Engine
        ↓
Explainable AI
        ↓
Database
        ↓
Filesystem
```

Business logic is implemented in reusable Python modules. Jupyter notebooks are reserved for orchestration and visualisation only.

## Technology Stack

- Python 3.12
- Pandas, NumPy, scikit-learn, XGBoost, LightGBM
- SHAP and LIME
- FastAPI and SQLAlchemy
- PostgreSQL and Alembic
- React, TypeScript, and Plotly
- Pytest and Jupyter Notebook

## Project Layout

```text
AviSafe/
├── backend/                 # Backend service integration
├── data/                    # Managed project datasets (not source code)
├── docs/                    # Technical and research documentation
├── frontend/                # React dashboard
├── models/                  # Persisted model artefacts
├── notebooks/               # Pipeline orchestration and visualisation
├── reports/                 # Generated research and safety reports
├── src/
│   ├── api/                 # FastAPI application and transport concerns
│   ├── core/                # Configuration, logging, and shared utilities
│   ├── data/                # Data ingestion, validation, and transformation
│   ├── database/            # SQLAlchemy entities and repositories
│   ├── models/              # ML training, evaluation, and persistence
│   └── visualization/       # Reusable visualisation services
└── tests/                   # Automated tests
```

## Delivery Roadmap

1. Repository foundation
2. Data engineering and aviation risk features
3. Reusable machine-learning framework
4. Explainable-AI and safety recommendation engine
5. Database and repository layer
6. FastAPI services
7. React analytics dashboard

## Aviation Risk Engineering

The data engineering layer will provide reusable, chainable feature engineering for weather, operational, human, aircraft, airport, and operator risk. Planned indices include CFIT, LOC-I, runway-excursion, weather-complexity, and operational-risk scores.

## Development Principles

- Clear module boundaries and single-responsibility design
- Typed, tested, and logged Python code
- Path-independent configuration; no hard-coded file paths
- Reproducible training and evaluation workflows
- Explainability outputs translated into aviation safety recommendations
- Git-friendly, incremental changes

## Status
- Completed

