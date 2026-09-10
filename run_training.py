#!/usr/bin/env python
"""Run the AviSafe training pipeline."""

from src.pipeline.train_pipeline import TrainingPipeline
from pathlib import Path

def main():
    pipeline = TrainingPipeline()
    print('Starting training pipeline for Accident_Category classification...')
    
    results = pipeline.run(
        csv_path='data/NTSB.csv',
        target_column='Accident_Category',
        models_dir='models'
    )
    
    print('\\nTraining complete!')
    print(f'Best model: {results.best_model_name}')
    print(f'Test accuracy: {results.test_metrics.get("accuracy", "N/A"):.3f}')
    print(f'Test precision: {results.test_metrics.get("precision", "N/A"):.3f}')
    print(f'Test recall: {results.test_metrics.get("recall", "N/A"):.3f}')
    print(f'Model saved to: {results.model_path}')
    print(f'\\nGenerated {len(results.feature_importance)} feature importances')
    print(f'Discovered {len(results.patterns)} accident patterns')
    print(f'Generated {len(results.recommendations)} safety recommendations')

if __name__ == '__main__':
    main()
