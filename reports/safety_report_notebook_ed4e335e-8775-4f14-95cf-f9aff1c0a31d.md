# AviSafe Safety Recommendations Report

**Target category:** Accident_Category  
**Model:** XGBoost  
**Dataset:** NTSB.csv  
**Generated:** 2026-08-25 10:06 UTC  
**Experiment ID:** `ed4e335e-8775-4f14-95cf-f9aff1c0a31d`

## Executive Summary

This report was generated automatically from a trained XGBoost classifier (Accident_Category), evaluated on a held-out test set never used during model selection or hyperparameter tuning. The model achieves 72.1% accuracy and a weighted F1 of 0.727 across 3 accident categories.

Explanations were cross-validated across two independent methods (SHAP and LIME) rather than relying on either alone; on average, the two methods independently agreed on 16% of the top contributing factors per category. 7 safety recommendation(s) below are grounded specifically in features both methods flagged, or in a single method's finding where noted.

## Methodology

1. Structured NTSB accident data was cleaned, feature-engineered, and enriched with aviation-specific risk indices (weather, flight-phase, CFIT, and runway-excursion risk).
2. Category labels were derived via rule-based keyword matching against NTSB accident narrative text (see src/data/label_engineering.py), not from an authoritative category field -- see Limitations.
3. Five candidate classifiers (Random Forest, Extra Trees, XGBoost, LightGBM, SVM) were tuned via class-balanced, cross-validated randomized search; the best performer by weighted F1 was selected and re-evaluated once on a held-out test split.
4. Global feature importance was computed via SHAP TreeExplainer; local, per-record explanations were independently computed via LIME. Per-category patterns from each method were compared, and features both methods flagged were promoted to a consensus set (see Causal Pattern Map below).
5. Selected model configuration (non-default parameters only): objective=multi:softprob, colsample_bytree=0.6, enable_categorical=True, eval_metric=logloss, gamma=0, learning_rate=0.08, max_depth=3, min_child_weight=7, missing=nan, n_estimators=200, n_jobs=1, random_state=42, reg_alpha=0.01, reg_lambda=3.0, subsample=0.6.

## Model Performance (held-out test set)

| Metric | Value |
|---|---|
| Accuracy | 0.721 |
| Balanced accuracy | 0.678 |
| Precision (weighted) | 0.745 |
| Recall (weighted) | 0.721 |
| F1 (weighted) | 0.727 |
| ROC AUC | 0.849 |
| Matthews correlation coefficient | 0.525 |
| Cohen's kappa | 0.520 |



## Unified Causal Pattern Map (SHAP + LIME)

For each accident category, the top contributing factors identified independently by SHAP (game-theoretic feature attribution) and LIME (local surrogate-model coefficients) are compared. Features **both methods agree on** are the strongest evidentiary basis for a causal claim; features only one method surfaces are reported but should be treated as provisional.

### CFIT

- **SHAP top features:** Broad_Phase_Of_Flight, Flight_Phase_Risk, Event_Year, Far_Description_Factorized, Runway_Excursion_Risk
- **LIME top features:** Weather_Code, Make_Factorized, Longitude, Event_Year, Country
- **Consensus (both methods agree):** Event_Year (11% agreement)
- **Occurrences in evaluation sample:** 71

### LOC-I

- **SHAP top features:** Broad_Phase_Of_Flight, Flight_Phase_Risk, Event_Year, Type_Aircraft, Runway_Excursion_Risk
- **LIME top features:** Make_Factorized, Weather_Code, Event_Year, Longitude, Country
- **Consensus (both methods agree):** Event_Year (11% agreement)
- **Occurrences in evaluation sample:** 461

### Runway Excursion

- **SHAP top features:** Broad_Phase_Of_Flight, Event_Year, Runway_Excursion_Risk, Type_Aircraft, Longitude
- **LIME top features:** Weather_Code, Make_Factorized, Event_Year, Longitude, Country
- **Consensus (both methods agree):** Event_Year, Longitude (25% agreement)
- **Occurrences in evaluation sample:** 468


## Safety Recommendations

### CFIT - Medium priority

**Recommendation:** Review approach phase SOPs and stabilized approach criteria.

**Responsible stakeholder:** Training Department

**Confidence:** 0.57

**Evidence (SHAP-ranked features):** Broad_Phase_Of_Flight, Flight_Phase_Risk, Event_Year, Far_Description_Factorized, Runway_Excursion_Risk

### CFIT - Low priority

**Recommendation:** Investigate the temporal trend in CFIT rate to determine whether it reflects fleet/avionics composition changes, regulatory changes, or reporting practice shifts over the analyzed period.

**Responsible stakeholder:** Safety Data & Analytics

**Confidence:** 0.57

**Evidence (SHAP-ranked features):** Broad_Phase_Of_Flight, Flight_Phase_Risk, Event_Year, Far_Description_Factorized, Runway_Excursion_Risk

### LOC-I - High priority

**Recommendation:** Target upset-prevention and recovery training specifically at the flight phases most associated with LOC-I events (e.g. maneuvering, initial climb, go-around), not only generic recurrent training.

**Responsible stakeholder:** Training Department

**Confidence:** 0.63

**Evidence (SHAP-ranked features):** Broad_Phase_Of_Flight, Flight_Phase_Risk, Event_Year, Type_Aircraft, Runway_Excursion_Risk

### LOC-I - Low priority

**Recommendation:** Investigate the temporal trend in LOC-I rate to determine whether it reflects changes in fleet automation/envelope-protection equipage, training standards, or reporting practice over the analyzed period.

**Responsible stakeholder:** Safety Data & Analytics

**Confidence:** 0.63

**Evidence (SHAP-ranked features):** Broad_Phase_Of_Flight, Flight_Phase_Risk, Event_Year, Type_Aircraft, Runway_Excursion_Risk

### Runway Excursion - Medium priority

**Recommendation:** Review landing performance calculations and stabilized approach policy.

**Responsible stakeholder:** Flight Operations

**Confidence:** 0.63

**Evidence (SHAP-ranked features):** Broad_Phase_Of_Flight, Event_Year, Runway_Excursion_Risk, Type_Aircraft, Longitude

### Runway Excursion - Medium priority

**Recommendation:** Analyze runway excursion geographic concentration to identify whether specific airports/jurisdictions are over-represented, pointing at local runway infrastructure or procedural gaps rather than a generic fleet-wide issue.

**Responsible stakeholder:** Regulatory Affairs

**Confidence:** 0.63

**Evidence (SHAP-ranked features):** Broad_Phase_Of_Flight, Event_Year, Runway_Excursion_Risk, Type_Aircraft, Longitude

### Runway Excursion - Low priority

**Recommendation:** Investigate the temporal trend in runway excursion rate to determine whether it reflects changes in runway infrastructure/reporting (e.g. Global Reporting Format adoption), fleet braking technology, or reporting practice over the analyzed period.

**Responsible stakeholder:** Safety Data & Analytics

**Confidence:** 0.63

**Evidence (SHAP-ranked features):** Broad_Phase_Of_Flight, Event_Year, Runway_Excursion_Risk, Type_Aircraft, Longitude


## Limitations

- **Labels are a heuristic, not ground truth.** Accident-category labels were derived via keyword matching against narrative text, not an authoritative NTSB category field. Model accuracy is therefore bounded by label quality, not model capability alone.
- **Explanations describe correlation the model relies on, not proven causation.** SHAP and LIME agreement increases confidence that a factor is genuinely informative to the model, but a factor can be predictive without being causally manipulable (e.g. it may proxy for an unmeasured cause).
- **This report is decision support, not a decision.** It is intended to focus expert investigator attention on evidence-backed patterns, not to replace investigator judgement or formal accident investigation procedure.
- **Sample size varies by category.** Categories with fewer occurrences in the evaluation sample (see Causal Pattern Map) yield less statistically stable patterns; treat recommendations for low-occurrence categories with proportionally more caution.