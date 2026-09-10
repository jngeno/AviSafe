# Running AviSafe on macOS

This is a from-scratch setup guide for cloning and running the full AviSafe
stack (ML pipeline, PostgreSQL-backed API, React dashboard) on a Mac. It
mirrors the exact stack this project was built and tested against
(Python 3.13, Node 22, PostgreSQL 16) - everything here is a real, run
command, not a guess.

Works the same on Apple Silicon (M-series) and Intel Macs; a couple of
Apple-Silicon-specific notes are called out where they apply.

## 1. Prerequisites

Install [Homebrew](https://brew.sh) first if you don't have it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then install everything else through it:

```bash
brew install python@3.13 node postgresql@16 git git-lfs libomp
```

- **python@3.13** - the project requires Python >= 3.12; 3.13 is what it was
  built against.
- **node** - installs Node 22+ and npm (the frontend needs Node 20+).
- **postgresql@16** - the database. You can swap in Postgres.app or Docker
  instead (see §4 alternatives).
- **git-lfs** - `data/NTSB.csv` (~96 MB) is tracked with Git LFS; without
  this you'll only get a small pointer file, not the real dataset.
- **libomp** - XGBoost and LightGBM link against OpenMP at runtime.
  Without this, `import xgboost` / `import lightgbm` fails on macOS with a
  `Library not loaded: libomp.dylib` error. This is the single most common
  macOS-specific gotcha for this project - install it even if you think you
  won't need it yet.

Register Git LFS once (only needed the first time on a machine):

```bash
git lfs install
```

## 2. Clone the repository

```bash
git clone https://github.com/jngeno/AviSafe.git
cd AviSafe
git lfs pull   # fetches the real data/NTSB.csv content, not just the pointer
```

Confirm the dataset actually came through (should be ~96 MB, not a few
hundred bytes):

```bash
ls -lh data/NTSB.csv
```

## 3. Backend: Python environment

Create and activate a virtual environment, then install dependencies:

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Sanity-check the environment before moving on:

```bash
python -c "import pandas, sklearn, xgboost, lightgbm, shap, lime, fastapi, sqlalchemy; print('OK')"
```

If this fails on `xgboost`/`lightgbm` with a `libomp` error, re-run
`brew install libomp` and try again - Homebrew sometimes needs a `brew link
libomp` if it was installed but not linked.

**Apple Silicon note:** all of the above ship prebuilt `arm64` wheels on
PyPI as of the versions pinned in `requirements.txt`, so this should not
require compiling anything from source. If pip ever falls back to building
from source (slow, and needs Xcode Command Line Tools -
`xcode-select --install`), double check you're using the Homebrew Python
(`which python3.13` should point under `/opt/homebrew`), not a Rosetta/x86
Python.

## 4. Database: PostgreSQL

Start PostgreSQL as a background service:

```bash
brew services start postgresql@16
```

Create a database and, if you don't already have a role you use locally,
create one:

```bash
createdb avisafe
# only if you don't already have a usable Postgres role:
createuser -s $(whoami)
```

### Configure `.env`

Create a `.env` file in the project root (this file is git-ignored -
it will not exist after cloning, you're creating it fresh):

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql+psycopg://YOUR_USER:YOUR_PASSWORD@localhost:5432/avisafe

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=avisafe
POSTGRES_USER=YOUR_USER
POSTGRES_PASSWORD=YOUR_PASSWORD

API_HOST=0.0.0.0
API_PORT=8000
EOF
```

Replace `YOUR_USER`/`YOUR_PASSWORD` with whatever role you created above. If
you used `createuser -s $(whoami)` with no password (the common local-dev
default), you can drop the password entirely:
`postgresql+psycopg://YOUR_USER@localhost:5432/avisafe`.

### Run migrations

With the venv active and `.env` in place:

```bash
alembic upgrade head
```

This creates all 6 tables (`experiments`, `feature_importances`,
`safety_recommendations`, `category_patterns`, `training_jobs`,
`prediction_logs`). Verify:

```bash
psql avisafe -c '\dt'
```

**Alternative to Homebrew Postgres:** if you'd rather not install Postgres
directly, Docker works too:

```bash
docker run --name avisafe-pg -e POSTGRES_PASSWORD=root -e POSTGRES_DB=avisafe -p 5432:5432 -d postgres:16
```

then set `.env`'s `DATABASE_URL` to
`postgresql+psycopg://postgres:root@localhost:5432/avisafe`.

## 5. Frontend: Node dependencies

```bash
cd frontend
npm install
```

Create `frontend/.env` (also git-ignored):

```bash
cat > .env << 'EOF'
VITE_API_URL=http://localhost:8000
EOF
```

```bash
cd ..   # back to project root
```

## 6. Running everything

You'll want **two terminal tabs/windows** (three if you also run the
standalone training script), each with the venv active where Python is
involved.

**Terminal 1 - API server:**

```bash
source .venv/bin/activate
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

API docs (interactive, from FastAPI) are then at
`http://localhost:8000/docs`.

**Terminal 2 - frontend dev server:**

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in a browser - this is the dashboard.

**Terminal 3 (optional) - train a model:**

The dashboard is empty until at least one model is trained. Either trigger
it from the UI (Train page), or run the pipeline directly:

```bash
source .venv/bin/activate
python -m src.pipeline.train_pipeline Accident_Category
```

This runs the full pipeline (preprocess → feature/risk engineer → label →
tune with cross-validation → SHAP/LIME → recommendations) against
`data/NTSB.csv` and saves the model to `models/`. Expect this to take
several minutes - it trains and tunes 5 candidate models.

### Running the test suite

```bash
source .venv/bin/activate
pytest tests/ -v
```

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `Library not loaded: .../libomp.dylib` on `import xgboost`/`lightgbm` | `brew install libomp`, then `brew link libomp` if needed. |
| `data/NTSB.csv` is ~130 bytes and starts with `version https://git-lfs...` | You have the LFS pointer, not the file. Run `git lfs install && git lfs pull`. |
| `psycopg.OperationalError: connection refused` | Postgres isn't running - `brew services start postgresql@16` (or start your Docker container). |
| `sqlalchemy.exc.OperationalError` mentioning the database doesn't exist | You haven't run `createdb avisafe`, or `.env`'s `DATABASE_URL` database name doesn't match what you created. |
| Alembic errors about missing tables / out-of-date schema | Re-run `alembic upgrade head`; check `alembic current` vs `alembic heads` to see if you're behind. |
| Frontend loads but shows network errors / CORS errors | Confirm the API is actually running on port 8000, and that `frontend/.env`'s `VITE_API_URL` matches. The API's CORS allow-list is hard-coded to `localhost:5173` (see `src/api/main.py`) - if you serve the frontend on a different port, add it there. |
| `ModuleNotFoundError` for any Python package | You're not in the venv - `source .venv/bin/activate`, confirm with `which python`. |
| XGBoost/LightGBM training is very slow | Expected on a first run - hyperparameter tuning trains ~15 parameter combinations x 5 folds x up to 5 models. Pass a smaller model list via the API (`model_candidates`) or the Train page to speed this up for testing. |

## Reference: what's actually installed

Exact versions pinned and tested (see `requirements.txt` for the full,
current list with comments on what's exercised vs. planned):

- Python >= 3.12 (tested on 3.13.5)
- pandas, numpy, scikit-learn, xgboost, lightgbm, shap, lime - ML core
- fastapi, uvicorn, sqlalchemy, alembic, psycopg - API + database
- pytest - test suite
- Node >= 20 (tested on 22.18.0), React 19, Vite 8, TypeScript, react-router-dom, axios
