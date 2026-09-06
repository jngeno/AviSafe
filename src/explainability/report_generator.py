"""
Regulator-ready safety recommendations report generator.

Addresses AviSafe Aim 2 / O7: "Produce a regulator-ready safety
recommendations report grounded in explainable, evidence-based causal
attribution."

Takes a completed training run (a PipelineResults) and renders a
self-contained Markdown report: methodology, model performance, the
unified SHAP+LIME causal pattern map per category (O6), and the safety
recommendations themselves -- each recommendation traceable back to
the specific evidence (features, cross-method agreement, confidence)
that produced it, rather than presented as an unexplained conclusion.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pandas as pd


class SafetyReportGenerator:
    """
    Renders a PipelineResults object into a regulator-facing Markdown
    safety report.
    """

    def generate(self, results, *, dataset_description: str | None = None) -> str:
        """
        Args:
            results:
                A pipeline.train_pipeline.PipelineResults instance.

            dataset_description:
                Optional free-text note on the dataset/labelling used,
                surfaced in the Methodology and Limitations sections.

        Returns:
            The report as a Markdown string.
        """

        sections = [
            self._header(results),
            self._executive_summary(results),
            self._methodology(results, dataset_description),
            self._model_performance(results),
            self._causal_pattern_map(results),
            self._recommendations(results),
            self._limitations(results, dataset_description),
        ]

        return "\n\n".join(sections)

    def save(
        self,
        results,
        destination: Path,
        *,
        dataset_description: str | None = None,
    ) -> Path:
        """
        Render and write the report to `destination`, creating parent
        directories as needed. Returns the path written.
        """

        destination.parent.mkdir(parents=True, exist_ok=True)

        report = self.generate(results, dataset_description=dataset_description)

        destination.write_text(report, encoding="utf-8")

        return destination

    # -- section builders ----------------------------------------------

    @staticmethod
    def _header(results) -> str:

        generated_at = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")

        return (
            "# AviSafe Safety Recommendations Report\n\n"
            f"**Target category:** {results.experiment.target_column}  \n"
            f"**Model:** {results.best_model_name}  \n"
            f"**Dataset:** {results.experiment.dataset_name}  \n"
            f"**Generated:** {generated_at}  \n"
            f"**Experiment ID:** `{results.experiment.experiment_id}`"
        )

    @staticmethod
    def _executive_summary(results) -> str:

        test = results.test_metrics

        category_count = results.causal_pattern_map["Category"].nunique()

        rec_count = len(results.recommendations)

        avg_agreement = (
            results.causal_pattern_map["Agreement"].mean()
            if not results.causal_pattern_map.empty
            else 0.0
        )

        return (
            "## Executive Summary\n\n"
            f"This report was generated automatically from a trained {results.best_model_name} "
            f"classifier ({results.experiment.target_column}), evaluated on a held-out test set "
            f"never used during model selection or hyperparameter tuning. The model achieves "
            f"{test.get('accuracy', 0):.1%} accuracy and a weighted F1 of {test.get('f1_score', 0):.3f} "
            f"across {category_count} accident categories.\n\n"
            f"Explanations were cross-validated across two independent methods (SHAP and LIME) rather "
            f"than relying on either alone; on average, the two methods independently agreed on "
            f"{avg_agreement:.0%} of the top contributing factors per category. {rec_count} safety "
            f"recommendation(s) below are grounded specifically in features both methods flagged, or "
            f"in a single method's finding where noted."
        )

    @staticmethod
    def _methodology(results, dataset_description: str | None) -> str:

        params = results.experiment.parameters

        tuned = {k: v for k, v in params.items() if v is not None}

        note = dataset_description or (
            "Category labels were derived via rule-based keyword matching against "
            "NTSB accident narrative text (see src/data/label_engineering.py), not "
            "from an authoritative category field -- see Limitations."
        )

        return (
            "## Methodology\n\n"
            "1. Structured NTSB accident data was cleaned, feature-engineered, and enriched with "
            "aviation-specific risk indices (weather, flight-phase, CFIT, and runway-excursion risk).\n"
            f"2. {note}\n"
            "3. Five candidate classifiers (Random Forest, Extra Trees, XGBoost, LightGBM, SVM) "
            "were tuned via class-balanced, cross-validated randomized search; the best "
            "performer by weighted F1 was selected and re-evaluated once on a held-out test split.\n"
            "4. Global feature importance was computed via SHAP TreeExplainer; local, per-record "
            "explanations were independently computed via LIME. Per-category patterns from each "
            "method were compared, and features both methods flagged were promoted to a consensus "
            "set (see Causal Pattern Map below).\n"
            f"5. Selected model configuration (non-default parameters only): "
            f"{', '.join(f'{k}={v}' for k, v in tuned.items())}."
        )

    @staticmethod
    def _model_performance(results) -> str:

        test = results.test_metrics

        cv = results.cv_metrics

        rows = [
            ("Accuracy", test.get("accuracy")),
            ("Balanced accuracy", test.get("balanced_accuracy")),
            ("Precision (weighted)", test.get("precision")),
            ("Recall (weighted)", test.get("recall")),
            ("F1 (weighted)", test.get("f1_score")),
            ("ROC AUC", test.get("roc_auc")),
            ("Matthews correlation coefficient", test.get("matthews_cc")),
            ("Cohen's kappa", test.get("cohen_kappa")),
        ]

        table = "\n".join(
            f"| {name} | {value:.3f} |" if isinstance(value, (int, float)) else f"| {name} | - |"
            for name, value in rows
        )

        cv_score = cv.get("f1_weighted_mean")

        cv_line = (
            f"Cross-validation mean F1 (weighted): {cv_score:.3f}"
            if isinstance(cv_score, (int, float))
            else ""
        )

        return (
            "## Model Performance (held-out test set)\n\n"
            "| Metric | Value |\n|---|---|\n" + table + "\n\n" + cv_line
        )

    @staticmethod
    def _causal_pattern_map(results) -> str:

        df: pd.DataFrame = results.causal_pattern_map

        if df.empty:
            return "## Unified Causal Pattern Map\n\nNo per-category patterns were available."

        lines = [
            "## Unified Causal Pattern Map (SHAP + LIME)\n",
            "For each accident category, the top contributing factors identified independently by "
            "SHAP (game-theoretic feature attribution) and LIME (local surrogate-model coefficients) "
            "are compared. Features **both methods agree on** are the strongest evidentiary basis for "
            "a causal claim; features only one method surfaces are reported but should be treated as "
            "provisional.\n",
        ]

        for _, row in df.iterrows():

            lines.append(f"### {row['Category']}\n")
            lines.append(f"- **SHAP top features:** {row['SHAP Top Features']}")
            lines.append(f"- **LIME top features:** {row['LIME Top Features']}")
            lines.append(
                f"- **Consensus (both methods agree):** {row['Consensus Features']} "
                f"({row['Agreement']:.0%} agreement)"
            )
            lines.append(f"- **Occurrences in evaluation sample:** {row['Occurrences']}\n")

        return "\n".join(lines)

    @staticmethod
    def _recommendations(results) -> str:

        df: pd.DataFrame = results.recommendations

        if df.empty:
            return (
                "## Safety Recommendations\n\nNo recommendation rules matched this run's "
                "top features for any category."
            )

        lines = ["## Safety Recommendations\n"]

        for _, row in df.iterrows():

            lines.append(f"### {row['Category']} - {row['Priority']} priority\n")
            lines.append(f"**Recommendation:** {row['Recommendation']}\n")
            lines.append(f"**Responsible stakeholder:** {row['Stakeholder']}\n")
            lines.append(f"**Confidence:** {row['Confidence']:.2f}\n")
            lines.append(f"**Evidence (SHAP-ranked features):** {row['Evidence']}\n")

        return "\n".join(lines)

    @staticmethod
    def _limitations(results, dataset_description: str | None) -> str:

        return (
            "## Limitations\n\n"
            "- **Labels are a heuristic, not ground truth.** Accident-category labels were derived "
            "via keyword matching against narrative text, not an authoritative NTSB category field. "
            "Model accuracy is therefore bounded by label quality, not model capability alone.\n"
            "- **Explanations describe correlation the model relies on, not proven causation.** SHAP "
            "and LIME agreement increases confidence that a factor is genuinely informative to the "
            "model, but a factor can be predictive without being causally manipulable (e.g. it may "
            "proxy for an unmeasured cause).\n"
            "- **This report is decision support, not a decision.** It is intended to focus expert "
            "investigator attention on evidence-backed patterns, not to replace investigator judgement "
            "or formal accident investigation procedure.\n"
            "- **Sample size varies by category.** Categories with fewer occurrences in the evaluation "
            "sample (see Causal Pattern Map) yield less statistically stable patterns; treat "
            "recommendations for low-occurrence categories with proportionally more caution."
        )
