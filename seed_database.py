"""
Seed the AviSafe database with sample data for dashboard demonstration.
"""

from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from src.core.settings import get_settings
from src.database.base import Base
from src.database.models import (
    Experiment,
    FeatureImportanceRecord,
    SafetyRecommendationRecord,
    CategoryPatternRecord,
)

settings = get_settings()
engine = create_engine(settings.database_url)

def seed_data():
    with Session(engine) as db:
        # Create a sample experiment
        experiment = Experiment(
            model_name="XGBoost Accident Classifier",
            dataset_name="NTSB Aviation Accident Database",
            target_column="Accident_Category",
            model_path="models/xgboost_accident_model.pkl",
            random_state=42,
            parameters={
                "max_depth": 8,
                "learning_rate": 0.1,
                "n_estimators": 100,
            },
            cv_metrics={
                "cv_accuracy": 0.78,
                "cv_precision": 0.76,
                "cv_recall": 0.75,
            },
            test_metrics={
                "accuracy": 0.79,
                "precision": 0.77,
                "recall": 0.76,
                "f1": 0.765,
            },
            feature_names=[
                "Aircraft_Type",
                "Operator_Type",
                "Broad_Phase_Of_Flight",
                "Weather_Condition",
                "Latitude",
                "Longitude",
                "Total_Fatalities",
                "Total_Injuries",
            ],
            training_time=45.2,
            notes="Production model trained on 70,000 labeled accident records with stratified k-fold validation.",
            started_at=datetime.now() - timedelta(days=3),
            finished_at=datetime.now() - timedelta(days=3, hours=1),
        )
        db.add(experiment)
        db.flush()

        # Add feature importances
        features = [
            ("Broad_Phase_Of_Flight", 0.28),
            ("Aircraft_Type", 0.19),
            ("Weather_Condition", 0.17),
            ("Operator_Type", 0.14),
            ("Total_Fatalities", 0.12),
            ("Latitude", 0.06),
            ("Longitude", 0.02),
            ("Total_Injuries", 0.02),
        ]
        for rank, (feature, importance) in enumerate(features, 1):
            fi = FeatureImportanceRecord(
                experiment_id=experiment.id,
                feature=feature,
                importance=importance,
                rank=rank,
            )
            db.add(fi)

        # Add safety recommendations
        recommendations_data = [
            {
                "category": "LOC-I",
                "priority": "Critical",
                "recommendation": "Implement enhanced pilot training for unusual attitude recovery, particularly in night/low-visibility conditions",
                "stakeholder": "Airlines & Flight Training Operators",
                "confidence": 0.92,
                "evidence": ["Broad_Phase_Of_Flight", "Weather_Condition"],
                "icao_reference": "ICAO Annex 1, Part FCL",
                "hfacs_classification": "Crew Resource Management",
                "swiss_cheese_layer": "Crew Factors",
                "status": "Open",
                "assigned_officer": "Chief Training Officer",
                "due_date": date.today() + timedelta(days=60),
            },
            {
                "category": "CFIT",
                "priority": "High",
                "recommendation": "Mandate Terrain Awareness and Warning System (TAWS) upgrades for all commercial aircraft operating in mountainous regions",
                "stakeholder": "Regulatory Authorities & Operators",
                "confidence": 0.88,
                "evidence": ["Latitude", "Longitude", "Aircraft_Type"],
                "icao_reference": "ICAO Annex 8, Section 6.2.5",
                "hfacs_classification": "Technological",
                "swiss_cheese_layer": "Technological Factors",
                "status": "In Progress",
                "assigned_officer": "Safety Director",
                "due_date": date.today() + timedelta(days=90),
            },
            {
                "category": "Runway Excursion",
                "priority": "High",
                "recommendation": "Develop standardized runway surface friction testing protocol and implement quarterly assessments at high-traffic airports",
                "stakeholder": "Airport Management & Regulatory Bodies",
                "confidence": 0.85,
                "evidence": ["Weather_Condition", "Operator_Type"],
                "icao_reference": "ICAO Annex 14, Part 3",
                "hfacs_classification": "Environmental Factors",
                "swiss_cheese_layer": "Physical Environment",
                "status": "Open",
                "assigned_officer": None,
                "due_date": date.today() + timedelta(days=120),
            },
            {
                "category": "LOC-I",
                "priority": "Medium",
                "recommendation": "Expand autopilot failure recognition training and manual flight procedure drills for all pilots",
                "stakeholder": "Airlines & Training Organizations",
                "confidence": 0.81,
                "evidence": ["Aircraft_Type", "Broad_Phase_Of_Flight"],
                "icao_reference": "ICAO Doc 9868, Chapter 3",
                "hfacs_classification": "Technical Error",
                "swiss_cheese_layer": "Crew Factors",
                "status": "Open",
                "assigned_officer": "Training Coordinator",
                "due_date": date.today() + timedelta(days=45),
            },
        ]

        for rec_data in recommendations_data:
            rec = SafetyRecommendationRecord(
                experiment_id=experiment.id,
                **rec_data
            )
            db.add(rec)

        # Add category patterns
        patterns_data = [
            {
                "category": "LOC-I",
                "top_features": ["Broad_Phase_Of_Flight", "Weather_Condition", "Aircraft_Type"],
                "average_importance": 0.21,
                "occurrences": 4173,
                "confidence": 0.87,
            },
            {
                "category": "CFIT",
                "top_features": ["Latitude", "Longitude", "Operator_Type"],
                "average_importance": 0.18,
                "occurrences": 585,
                "confidence": 0.82,
            },
            {
                "category": "Runway Excursion",
                "top_features": ["Weather_Condition", "Aircraft_Type", "Broad_Phase_Of_Flight"],
                "average_importance": 0.20,
                "occurrences": 3557,
                "confidence": 0.79,
            },
        ]

        for pattern_data in patterns_data:
            pattern = CategoryPatternRecord(
                experiment_id=experiment.id,
                **pattern_data
            )
            db.add(pattern)

        db.commit()
        print("Database seeded with sample data!")
        print("   - 1 Experiment created")
        print("   - 8 Feature Importances added")
        print("   - 4 Safety Recommendations added")
        print("   - 3 Category Patterns added")

if __name__ == "__main__":
    seed_data()
