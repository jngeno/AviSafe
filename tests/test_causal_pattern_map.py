"""
Tests for src.explainability.causal_pattern_map.CausalPatternMapBuilder.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from src.explainability.causal_pattern_map import CausalPatternMapBuilder, _base_feature_name
from src.explainability.lime_explainer import LIMEExplainer
from src.explainability.pattern_discovery import AviationPattern


def _fitted_lime():

    rng = np.random.RandomState(0)

    X = pd.DataFrame(rng.rand(200, 4), columns=["a", "b", "c", "d"])

    y = rng.choice(["X", "Y"], 200)

    model = RandomForestClassifier(n_estimators=30, random_state=0).fit(X, y)

    lime = LIMEExplainer()

    lime.fit(model, X, class_names=["X", "Y"])

    return lime, X, pd.Series(y, index=X.index)


def test_base_feature_name_strips_conditions():
    assert _base_feature_name("Number_Of_Seats <= 4.00") == "Number_Of_Seats"
    assert _base_feature_name("2.00 < Weather_Risk <= 5.00") == "Weather_Risk"
    assert _base_feature_name("Country") == "Country"


def test_build_produces_one_pattern_per_shap_category():

    lime, X, labels = _fitted_lime()

    shap_patterns = [
        AviationPattern("X", ["a", "b"], 0.1, 100, 0.5),
        AviationPattern("Y", ["c", "d"], 0.1, 100, 0.5),
    ]

    builder = CausalPatternMapBuilder(lime_samples_per_category=5, top_n=3)

    unified = builder.build(shap_patterns, lime, X, labels)

    assert [p.accident_category for p in unified] == ["X", "Y"]

    for pattern in unified:
        assert 0.0 <= pattern.agreement_ratio <= 1.0
        assert set(pattern.consensus_features) <= (
            set(pattern.shap_top_features) & set(pattern.lime_top_features)
        )


def test_to_dataframe_has_expected_columns():

    lime, X, labels = _fitted_lime()

    shap_patterns = [AviationPattern("X", ["a", "b"], 0.1, 100, 0.5)]

    builder = CausalPatternMapBuilder(lime_samples_per_category=3, top_n=2)

    unified = builder.build(shap_patterns, lime, X, labels)

    df = builder.to_dataframe(unified)

    assert list(df.columns) == [
        "Category",
        "SHAP Top Features",
        "LIME Top Features",
        "Consensus Features",
        "Agreement",
        "Occurrences",
        "SHAP Confidence",
    ]
    assert len(df) == 1
