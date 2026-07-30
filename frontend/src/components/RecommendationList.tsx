import type { Recommendation } from '../api/types';
import { PriorityBadge } from './Badge';
import { categoryColor } from './categoryColor';

export function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <p>
        No recommendations fired for this experiment — either the model's top features
        for each category didn't match a rule in the recommendation engine, or this
        experiment used a target other than accident category.
      </p>
    );
  }

  return (
    <div>
      {recommendations.map((rec, i) => (
        <div className="recommendation-item" key={i}>
          <div className="recommendation-head">
            <span
              className="recommendation-category"
              style={{ color: categoryColor(rec.category) }}
            >
              {rec.category}
            </span>
            <PriorityBadge priority={rec.priority} />
            <span className="recommendation-stakeholder">{rec.stakeholder}</span>
          </div>
          <p>{rec.recommendation}</p>
          <div className="evidence-list">
            {rec.evidence.map((item) => (
              <span className="evidence-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
