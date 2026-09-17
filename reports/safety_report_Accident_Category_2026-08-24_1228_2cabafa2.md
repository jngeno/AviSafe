# AviSafe Safety Recommendations Report

**Target category:** Accident_Category  
**Model:** XGBoost  
**Dataset:** NTSB.csv  
**Generated:** 2026-08-24 12:28 UTC  
**Experiment ID:** `2cabafa2-2628-445b-912c-ec3c9aa55021`

## Executive Summary

This report was generated automatically from a trained XGBoost classifier (Accident_Category), evaluated on a held-out test set never used during model selection or hyperparameter tuning. The model achieves 68.6% accuracy and a weighted F1 of 0.689 across 3 accident categories.

Explanations were cross-validated across two independent methods (SHAP and LIME) rather than relying on either alone; on average, the two methods independently agreed on 7% of the top contributing factors per category. 2 safety recommendation(s) below are grounded specifically in features both methods flagged, or in a single method's finding where noted.

## Methodology

1. Structured NTSB accident data was cleaned, feature-engineered, and enriched with aviation-specific risk indices (weather, flight-phase, CFIT, and runway-excursion risk).
2. Category labels were derived via rule-based keyword matching against NTSB accident narrative text (see src/data/label_engineering.py), not from an authoritative category field -- see Limitations.
3. Five candidate classifiers (Random Forest, Extra Trees, XGBoost, LightGBM, SVM) were tuned via class-balanced, cross-validated randomized search; the best performer by weighted F1 was selected and re-evaluated once on a held-out test split.
4. Global feature importance was computed via SHAP TreeExplainer; local, per-record explanations were independently computed via LIME. Per-category patterns from each method were compared, and features both methods flagged were promoted to a consensus set (see Causal Pattern Map below).
5. Selected model configuration (non-default parameters only): objective=multi:softprob, colsample_bytree=0.7, enable_categorical=True, eval_metric=logloss, gamma=0.1, learning_rate=0.01, max_depth=3, min_child_weight=3, missing=nan, n_estimators=300, n_jobs=1, random_state=42, reg_alpha=1.0, reg_lambda=0.5, subsample=0.9.

## Model Performance (held-out test set)

| Metric | Value |
|---|---|
| Accuracy | 0.686 |
| Balanced accuracy | 0.691 |
| Precision (weighted) | 0.737 |
| Recall (weighted) | 0.686 |
| F1 (weighted) | 0.689 |
| ROC AUC | 0.822 |
| Matthews correlation coefficient | 0.472 |
| Cohen's kappa | 0.452 |

Cross-validation mean F1 (weighted): 0.617

## Unified Causal Pattern Map (SHAP + LIME)

For each accident category, the top contributing factors identified independently by SHAP (game-theoretic feature attribution) and LIME (local surrogate-model coefficients) are compared. Features **both methods agree on** are the strongest evidentiary basis for a causal claim; features only one method surfaces are reported but should be treated as provisional.

### CFIT

- **SHAP top features:** Flight_Phase_Risk, Country, Runway_Excursion_Risk, Event_Year, Latitude
- **LIME top features:** Flight_Phase_Risk, Weather_Code, Aircraft_Category, Number_Of_Seats, Model_Factorized
- **Consensus (both methods agree):** Flight_Phase_Risk (11% agreement)
- **Occurrences in evaluation sample:** 15

### LOC-I

- **SHAP top features:** Flight_Phase_Risk, Event_Year, Broad_Phase_Of_Flight, Country, Latitude
- **LIME top features:** Flight_Phase_Risk, Weather_Code, Aircraft_Category, Number_Of_Seats, Longitude
- **Consensus (both methods agree):** Flight_Phase_Risk (11% agreement)
- **Occurrences in evaluation sample:** 190

### Runway Excursion

- **SHAP top features:** Country, Event_Year, Broad_Phase_Of_Flight, Latitude, Longitude
- **LIME top features:** Flight_Phase_Risk, Weather_Code, Aircraft_Category, Number_Of_Seats, Model_Factorized
- **Consensus (both methods agree):** (none) (0% agreement)
- **Occurrences in evaluation sample:** 152


## Safety Recommendations

### CFIT - Medium priority

**Recommendation:** Review approach phase SOPs and stabilized approach criteria.

**Responsible stakeholder:** Training Department

**Confidence:** 0.46

**Evidence (SHAP-ranked features):** Flight_Phase_Risk, Country, Runway_Excursion_Risk, Event_Year, Latitude

### Runway Excursion - Medium priority

**Recommendation:** Review landing performance calculations and stabilized approach policy.

**Responsible stakeholder:** Flight Operations

**Confidence:** 0.63

**Evidence (SHAP-ranked features):** Country, Event_Year, Broad_Phase_Of_Flight, Latitude, Longitude


## Limitations

- **Labels are a heuristic, not ground truth.** Accident-category labels were derived via keyword matching against narrative text, not an authoritative NTSB category field. Model accuracy is therefore bounded by label quality, not model capability alone.
- **Explanations describe correlation the model relies on, not proven causation.** SHAP and LIME agreement increases confidence that a factor is genuinely informative to the model, but a factor can be predictive without being causally manipulable (e.g. it may proxy for an unmeasured cause).
- **This report is decision support, not a decision.** It is intended to focus expert investigator attention on evidence-backed patterns, not to replace investigator judgement or formal accident investigation procedure.
- **Sample size varies by category.** Categories with fewer occurrences in the evaluation sample (see Causal Pattern Map) yield less statistically stable patterns; treat recommendations for low-occurrence categories with proportionally more caution.