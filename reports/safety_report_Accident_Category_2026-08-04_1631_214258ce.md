# AviSafe Safety Recommendations Report

**Target category:** Accident_Category  
**Model:** XGBoost  
**Dataset:** NTSB.csv  
**Generated:** 2026-08-04 16:31 UTC  
**Experiment ID:** `214258ce-b07a-4615-91a6-c8db4b2a7823`

## Executive Summary

This report was generated automatically from a trained XGBoost classifier (Accident_Category), evaluated on a held-out test set never used during model selection or hyperparameter tuning. The model achieves 67.0% accuracy and a weighted F1 of 0.677 across 3 accident categories.

Explanations were cross-validated across two independent methods (SHAP and LIME) rather than relying on either alone; on average, the two methods independently agreed on 18% of the top contributing factors per category. 2 safety recommendation(s) below are grounded specifically in features both methods flagged, or in a single method's finding where noted.

## Methodology

1. Structured NTSB accident data was cleaned, feature-engineered, and enriched with aviation-specific risk indices (weather, flight-phase, CFIT, and runway-excursion risk).
2. Category labels were derived via rule-based keyword matching against NTSB accident narrative text (see src/data/label_engineering.py), not from an authoritative category field -- see Limitations.
3. Five candidate classifiers (Random Forest, Extra Trees, XGBoost, LightGBM, SVM) were tuned via class-balanced, cross-validated randomized search; the best performer by weighted F1 was selected and re-evaluated once on a held-out test split.
4. Global feature importance was computed via SHAP TreeExplainer; local, per-record explanations were independently computed via LIME. Per-category patterns from each method were compared, and features both methods flagged were promoted to a consensus set (see Causal Pattern Map below).
5. Selected model configuration (non-default parameters only): objective=multi:softprob, colsample_bytree=0.6, enable_categorical=True, eval_metric=logloss, gamma=0, learning_rate=0.08, max_depth=3, min_child_weight=7, missing=nan, n_estimators=200, random_state=42, reg_alpha=0.01, reg_lambda=3.0, subsample=0.6.

## Model Performance (held-out test set)

| Metric | Value |
|---|---|
| Accuracy | 0.670 |
| Balanced accuracy | 0.660 |
| Precision (weighted) | 0.708 |
| Recall (weighted) | 0.670 |
| F1 (weighted) | 0.677 |
| ROC AUC | 0.825 |
| Matthews correlation coefficient | 0.456 |
| Cohen's kappa | 0.446 |

Cross-validation mean F1 (weighted): 0.650

## Unified Causal Pattern Map (SHAP + LIME)

For each accident category, the top contributing factors identified independently by SHAP (game-theoretic feature attribution) and LIME (local surrogate-model coefficients) are compared. Features **both methods agree on** are the strongest evidentiary basis for a causal claim; features only one method surfaces are reported but should be treated as provisional.

### CFIT

- **SHAP top features:** Broad_Phase_Of_Flight, Flight_Phase_Risk, Flight_Phase_Code, CFIT_Risk, Engine_Type
- **LIME top features:** Event_Year, Make_Factorized, Weather_Code, Longitude, Country
- **Consensus (both methods agree):** (none) (0% agreement)
- **Occurrences in evaluation sample:** 71

### LOC-I

- **SHAP top features:** Broad_Phase_Of_Flight, Flight_Phase_Risk, Event_Year, Flight_Phase_Code, CFIT_Risk
- **LIME top features:** Make_Factorized, Event_Year, Weather_Code, Longitude, Number_Of_Seats
- **Consensus (both methods agree):** Event_Year (11% agreement)
- **Occurrences in evaluation sample:** 502

### Runway Excursion

- **SHAP top features:** Broad_Phase_Of_Flight, Event_Year, CFIT_Risk, Longitude, Make_Factorized
- **LIME top features:** Event_Year, Make_Factorized, Weather_Code, Longitude, Country
- **Consensus (both methods agree):** Event_Year, Longitude, Make_Factorized (43% agreement)
- **Occurrences in evaluation sample:** 427


## Safety Recommendations

### CFIT - Medium priority

**Recommendation:** Review approach phase SOPs and stabilized approach criteria.

**Responsible stakeholder:** Training Department

**Confidence:** 0.65

**Evidence (SHAP-ranked features):** Broad_Phase_Of_Flight, Flight_Phase_Risk, Flight_Phase_Code, CFIT_Risk, Engine_Type

### Runway Excursion - Medium priority

**Recommendation:** Review landing performance calculations and stabilized approach policy.

**Responsible stakeholder:** Flight Operations

**Confidence:** 0.67

**Evidence (SHAP-ranked features):** Broad_Phase_Of_Flight, Event_Year, CFIT_Risk, Longitude, Make_Factorized


## Limitations

- **Labels are a heuristic, not ground truth.** Accident-category labels were derived via keyword matching against narrative text, not an authoritative NTSB category field. Model accuracy is therefore bounded by label quality, not model capability alone.
- **Explanations describe correlation the model relies on, not proven causation.** SHAP and LIME agreement increases confidence that a factor is genuinely informative to the model, but a factor can be predictive without being causally manipulable (e.g. it may proxy for an unmeasured cause).
- **This report is decision support, not a decision.** It is intended to focus expert investigator attention on evidence-backed patterns, not to replace investigator judgement or formal accident investigation procedure.
- **Sample size varies by category.** Categories with fewer occurrences in the evaluation sample (see Causal Pattern Map) yield less statistically stable patterns; treat recommendations for low-occurrence categories with proportionally more caution.