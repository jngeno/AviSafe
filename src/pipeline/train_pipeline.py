"""
End-to-end training pipeline for AviSafe.

Coordinates the complete machine learning workflow:
    1. Load dataset
    2. Validate
    3. Preprocess
    4. Feature engineering
    5. Risk engineering
    6. Derive accident-category labels from narrative text (Accident_Category target only)
    7. Build model-ready feature matrix (drop leakage/id/text columns, encode categoricals)
    8. Split dataset
    9. Train candidate models
    10. Evaluate and select the best model
    11. Save model
    12. Generate SHAP / LIME explanations
    13. Discover patterns
    14. Generate recommendations

Two target modes are supported:

- ``Fatal_Accident`` (default): a binary smoke-test target derived directly
  from injury counts. Fast, always available, useful for validating the
  pipeline end-to-end.
- ``Accident_Category``: the CFIT / LOC-I / Runway-Excursion classification
  described in the AviSafe research proposal. The source NTSB export
  (data/NTSB.csv) has no such column, so labels are derived via rule-based
  keyword matching against the ``Analysis`` narrative field
  (see ``src/data/label_engineering.py``). Rows whose narrative matches
  none of the three categories are dropped -- this mode trains only on the
  ~10% of accidents that clearly fall into one of the three ICAO/IATA
  high-risk categories, matching the proposal's stated scope.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd
from sklearn.utils.class_weight import compute_sample_weight

from ..core.logger import LoggerManager
from ..data.data_loader import DataLoader
from ..data.data_validator import DataValidator
from ..data.feature_engineering import FeatureEngineer
from ..data.label_engineering import AccidentCategoryLabeler
from ..data.preprocessing import Preprocessor
from ..data.risk_engineering import RiskEngineer
from ..explainability.feature_importance import FeatureImportanceAnalyzer
from ..explainability.lime_explainer import LIMEExplainer
from ..explainability.pattern_discovery import PatternDiscovery
from ..explainability.recommendation_engine import RecommendationEngine
from ..explainability.shap_explainer import SHAPExplainer
from ..models.evaluator import Evaluator
from ..models.experiment import Experiment, ExperimentManager
from ..models.persistence import ModelPersistence
from ..models.splitter import DataSplitter
from ..models.tuner import HyperparameterTuner

# Columns dropped before modelling: identifiers, free text, geo detail,
# raw categorical text that already has a *_Factorized numeric twin,
# NTSB report-publication metadata (not a causal risk factor), and any
# column that is derived from (or leaks) the Fatal_Accident target itself.
_ID_TEXT_GEO_COLUMNS = [
    "Event_Id",
    "Analysis",
    "Address",
    "City",
    "Place",
    "geometry",
]

_REDUNDANT_RAW_TEXT_COLUMNS = [
    "Far_Description",
    "Schedule",
    "Purpose_Of_Flight",
    "Make",
    "Model",
]

_PUBLICATION_METADATA_COLUMNS = [
    "Publication_Year",
    "Publication_Month",
    "Publication_Day",
    "Publication_Month_Name",
    "Date_Difference",
]

# Injury counts, damage, and their derived risk composites are outcomes
# of the SAME accident event being classified, not pre-accident risk
# factors -- they're circular for Fatal_Accident (Fatal_Accident is
# literally derived from Total_Fatal_Injuries), and for Accident_Category
# they'd let the model (and any downstream recommendation) lean on "how
# severe the crash turned out to be" instead of genuine causal/preventable
# signal like weather, phase of flight, or aircraft type. Excluded for
# both targets.
_OUTCOME_COLUMNS = [
    "Total_Fatal_Injuries",
    "Total_Serious_Injuries",
    "Total_Minor_Injuries",
    "Total_Uninjured",
    "Total_Injuries",
    "Total_Person",
    "Fatal_Accident",
    "Human_Severity_Risk",
    "Aircraft_Damage",
    "Damage_Level",
    "Damage_Risk",
    "LOCI_Risk",
    "Operational_Risk",
    "Investigation_Type",
]

TARGET_COLUMN = "Fatal_Accident"

ACCIDENT_CATEGORY_TARGET = "Accident_Category"

# SVM is excluded from the default candidate set: SVC scales poorly
# (roughly quadratic in sample count) and is impractically slow on
# ~88k rows compared to the tree ensembles and logistic regression.
DEFAULT_MODEL_CANDIDATES = [
    "random_forest",
    "extra_trees",
    "xgboost",
    "lightgbm",
    "logistic_regression",
]

# Randomized-search spaces per candidate model. Kept deliberately modest
# (RandomizedSearchCV samples a fixed number of combinations regardless
# of grid size) so tuning stays tractable on the full dataset.
_PARAMETER_GRIDS: dict[str, dict[str, list]] = {
    "random_forest": {
        "n_estimators": [200, 300, 500],
        "max_depth": [None, 10, 20, 30],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4],
        "max_features": ["sqrt", "log2"],
    },
    "extra_trees": {
        "n_estimators": [200, 300, 500],
        "max_depth": [None, 10, 20, 30],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4],
        "max_features": ["sqrt", "log2"],
    },
    "xgboost": {
        "n_estimators": [200, 300, 500],
        "max_depth": [3, 4, 6, 8],
        "learning_rate": [0.01, 0.05, 0.1, 0.2],
        "subsample": [0.7, 0.85, 1.0],
        "colsample_bytree": [0.7, 0.85, 1.0],
    },
    "lightgbm": {
        "n_estimators": [200, 300, 500],
        "learning_rate": [0.01, 0.05, 0.1, 0.2],
        "num_leaves": [15, 31, 63],
        "max_depth": [-1, 5, 10],
    },
    "logistic_regression": {
        "C": [0.01, 0.1, 1.0, 10.0, 100.0],
        "max_iter": [2000],
    },
}

_TUNING_ITERATIONS = 15

_TUNING_CV_FOLDS = 5


@dataclass(slots=True)
class PipelineResults:

    best_model_name: str

    best_model: object

    cv_metrics: dict

    test_metrics: dict

    model_path: Path

    feature_importance: pd.DataFrame

    patterns: pd.DataFrame

    recommendations: pd.DataFrame

    experiment: Experiment

    categorical_encodings: dict[str, dict[str, int]]

    target_label_map: dict[int, str] | None


class TrainingPipeline:

    def __init__(self):

        self.logger = LoggerManager.get_logger(__name__)

        self.loader = DataLoader()

        self.validator = DataValidator()

        self.preprocessor = Preprocessor()

        self.engineer = FeatureEngineer()

        self.risk = RiskEngineer()

        self.labeler = AccidentCategoryLabeler()

        self.splitter = DataSplitter()

        self.tuner = HyperparameterTuner()

        self.evaluator = Evaluator()

        self.persistence = ModelPersistence()

        self.experiments = ExperimentManager()

        self.shap = SHAPExplainer()

        self.lime = LIMEExplainer()

        self.importance = FeatureImportanceAnalyzer()

        self.patterns = PatternDiscovery()

        self.recommender = RecommendationEngine()

    def _build_feature_matrix(
        self,
        dataframe: pd.DataFrame,
        target_column: str,
    ) -> tuple[pd.DataFrame, dict[str, dict[str, int]]]:
        """
        Drop identifier/text/leakage columns and label-encode the
        remaining categorical columns so every model in the registry
        can consume the matrix directly.

        Returns the transformed dataframe alongside the category ->
        code mapping used for each encoded column, so a later live
        prediction request (which arrives with raw values like
        Weather_Condition="IMC", not pre-encoded integers) can be
        encoded consistently with how the model was trained. Without
        persisting this mapping, encoding would have to be re-derived
        per request via pd.factorize() on a single row, which has no
        way to reproduce the original training-time category -> code
        assignment.
        """

        drop_columns = [
            column
            for column in (
                _ID_TEXT_GEO_COLUMNS
                + _REDUNDANT_RAW_TEXT_COLUMNS
                + _PUBLICATION_METADATA_COLUMNS
                + _OUTCOME_COLUMNS
            )
            if column in dataframe.columns and column != target_column
        ]

        dataframe = dataframe.drop(columns=drop_columns)

        categorical_columns = [
            column
            for column in dataframe.select_dtypes(
                include=["object", "str", "category"]
            ).columns
            if column != target_column
        ]

        encodings: dict[str, dict[str, int]] = {}

        for column in categorical_columns:

            codes, categories = pd.factorize(dataframe[column], sort=True)

            dataframe[column] = codes

            encodings[column] = {
                str(category): code for code, category in enumerate(categories)
            }

        return dataframe, encodings

    def run(
        self,
        csv_path: str,
        target_column: str = TARGET_COLUMN,
        model_candidates: list[str] | None = None,
        models_dir: str | Path = Path("models"),
    ) -> PipelineResults:

        model_candidates = model_candidates or DEFAULT_MODEL_CANDIDATES

        models_dir = Path(models_dir)

        self.logger.info("Loading dataset")

        dataframe = self.loader.load(Path(csv_path))

        validation = self.validator.validate(
            dataframe,
            required_columns=[
                "Total Fatal Injuries",
                "Aircraft Damage",
                "Weather Condition",
                "Broad Phase Of Flight",
            ],
        )

        if not validation.passed:
            raise ValueError(f"Dataset validation failed: {validation.errors}")

        self.logger.info("Preprocessing")

        dataframe = self.preprocessor.run(dataframe)

        self.logger.info("Feature Engineering")

        dataframe = self.engineer.run(dataframe)

        self.logger.info("Risk Engineering")

        dataframe = self.risk.run(dataframe)

        if target_column == ACCIDENT_CATEGORY_TARGET:

            self.logger.info(
                "Deriving accident-category labels from narrative text"
            )

            dataframe = self.labeler.label(dataframe)

            before = len(dataframe)

            dataframe = dataframe.dropna(subset=[target_column])

            self.logger.info(
                "Kept %d of %d rows with a matched accident category (%.1f%%)",
                len(dataframe),
                before,
                100 * len(dataframe) / before,
            )

        if target_column not in dataframe.columns:
            raise ValueError(
                f"Target column '{target_column}' was not produced by "
                "feature engineering. Check the source dataset's schema."
            )

        dataframe, categorical_encodings = self._build_feature_matrix(
            dataframe, target_column
        )

        X = dataframe.drop(columns=[target_column])

        y = dataframe[target_column]

        self.logger.info(
            "Modelling matrix ready: %d rows, %d features, "
            "class distribution %s",
            len(X),
            X.shape[1],
            y.value_counts(normalize=True).round(3).to_dict(),
        )

        # XGBoost requires integer-coded class labels (0..n-1); sklearn
        # and LightGBM accept string labels directly. Encode string
        # targets deterministically (alphabetical) so every model in
        # the candidate set can train, and remember the mapping so
        # pattern discovery / recommendations (keyed on category name)
        # can translate codes back to labels afterward.
        label_map: dict[int, str] | None = None

        if y.dtype == object:

            codes, categories = pd.factorize(y, sort=True)

            label_map = dict(enumerate(categories))

            y = pd.Series(codes, index=y.index, name=target_column)

        # A fixed validation split wastes data and gives a single noisy
        # estimate on a small multiclass set. Instead: hold out the test
        # split untouched, and use 5-fold CV (inside RandomizedSearchCV)
        # over the remaining train+validation pool for both model
        # selection and hyperparameter tuning -- both a more data-
        # efficient and a more statistically stable estimate.
        split = self.splitter.split(X, y)

        X_cv = pd.concat([split.X_train, split.X_validation])

        y_cv = pd.concat([split.y_train, split.y_validation])

        sample_weight = compute_sample_weight("balanced", y_cv)

        best_model = None

        best_name = ""

        best_cv_score = -1.0

        best_cv_params = None

        for name in model_candidates:

            parameter_grid = _PARAMETER_GRIDS.get(name)

            if parameter_grid is None:
                self.logger.warning(
                    "No parameter grid registered for %s, skipping.",
                    name,
                )
                continue

            self.logger.info("Tuning %s", name)

            tuning_result = self.tuner.tune(
                name,
                X_cv,
                y_cv,
                parameter_grid,
                method="random",
                cv=_TUNING_CV_FOLDS,
                scoring="f1_weighted",
                n_iter=_TUNING_ITERATIONS,
                sample_weight=sample_weight,
            )

            self.logger.info(
                "%s CV F1 (weighted, class-balanced): %.4f | params: %s",
                tuning_result.model_name,
                tuning_result.best_score,
                tuning_result.best_parameters,
            )

            if tuning_result.best_score > best_cv_score:

                best_cv_score = tuning_result.best_score

                best_model = tuning_result.estimator

                best_name = tuning_result.model_name

                best_cv_params = tuning_result.best_parameters

        self.logger.info(
            "Best model: %s (CV F1 %.4f)",
            best_name,
            best_cv_score,
        )

        test_predictions = best_model.predict(split.X_test)

        test_probabilities = (
            best_model.predict_proba(split.X_test)
            if hasattr(best_model, "predict_proba")
            else None
        )

        test_evaluation = self.evaluator.evaluate(
            model_name=best_name,
            y_true=split.y_test,
            predictions=test_predictions,
            probabilities=test_probabilities,
        )

        cv_metrics = {
            "f1_weighted_mean": best_cv_score,
            "best_parameters": best_cv_params,
        }

        test_metrics = {
            "accuracy": test_evaluation.accuracy,
            "balanced_accuracy": test_evaluation.balanced_accuracy,
            "precision": test_evaluation.precision,
            "recall": test_evaluation.recall,
            "f1_score": test_evaluation.f1_score,
            "roc_auc": test_evaluation.roc_auc,
            "matthews_cc": test_evaluation.matthews_cc,
            "cohen_kappa": test_evaluation.cohen_kappa,
        }

        experiment = self.experiments.create(
            model_name=best_name,
            dataset_name=Path(csv_path).name,
            target_column=target_column,
            parameters=best_model.get_params(),
            feature_names=list(X.columns),
            random_state=42,
        )

        experiment = self.experiments.complete(
            experiment,
            metrics=test_metrics,
            training_time=0,
        )

        model_directory = models_dir / best_name.lower().replace(" ", "_")

        self.persistence.save(
            model=best_model,
            experiment=experiment,
            feature_names=list(X.columns),
            destination=model_directory,
        )

        self.logger.info("Generating SHAP explanations")

        explain_sample = split.X_test.sample(
            n=min(1000, len(split.X_test)),
            random_state=42,
        )

        self.shap.fit(best_model, split.X_train)

        shap_result = self.shap.explain(explain_sample)

        self.lime.fit(best_model, split.X_train)

        importance = self.importance.global_importance(shap_result)

        pattern_labels = split.y_test.loc[explain_sample.index]

        if label_map is not None:
            pattern_labels = pattern_labels.map(label_map)

        discovered = self.patterns.discover(
            shap_result,
            pattern_labels,
        )

        pattern_table = self.patterns.to_dataframe(discovered)

        recommendations = self.recommender.generate(discovered)

        recommendation_table = self.recommender.to_dataframe(recommendations)

        return PipelineResults(
            best_model_name=best_name,
            best_model=best_model,
            cv_metrics=cv_metrics,
            test_metrics=test_metrics,
            model_path=model_directory,
            feature_importance=importance.rankings,
            patterns=pattern_table,
            recommendations=recommendation_table,
            experiment=experiment,
            categorical_encodings=categorical_encodings,
            target_label_map=label_map,
        )


if __name__ == "__main__":

    import sys

    dataset_path = (
        Path(__file__).resolve().parents[2] / "data" / "NTSB.csv"
    )

    target = sys.argv[1] if len(sys.argv) > 1 else TARGET_COLUMN

    pipeline = TrainingPipeline()

    results = pipeline.run(str(dataset_path), target_column=target)

    print("\nBest model:", results.best_model_name)

    print("\nCross-validation metrics:")

    for key, value in results.cv_metrics.items():
        print(f"  {key}: {value}")

    print("\nTest metrics:")

    for key, value in results.test_metrics.items():
        print(f"  {key}: {value}")

    print("\nTop 15 features (mean |SHAP|):")

    print(results.feature_importance.head(15).to_string(index=False))

    print("\nDiscovered patterns (per category):")

    print(results.patterns.to_string(index=False))

    print("\nRecommendations:")

    print(results.recommendations.to_string(index=False))

    print("\nModel saved to:", results.model_path)

    sys.exit(0)
