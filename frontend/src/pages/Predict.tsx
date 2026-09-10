import { Fragment, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createBatchPredictions, createPrediction, getExperiment, listExperiments } from '../api/client';
import type {
  BatchPredictionResponse,
  ExperimentDetail,
  ExperimentSummary,
  PredictionResponse,
} from '../api/types';
import { CategoryBarChart } from '../components/CategoryBarChart';
import { DivergingBarChart } from '../components/DivergingBarChart';
import { categoryColor } from '../components/categoryColor';
import { saveScenario, type SavedScenario } from '../savedScenarios';

type Mode = 'manual' | 'import';

export interface CaseStudyPreset {
  id: string;
  name: string;
  category: string;
  badgeColor: string;
  description: string;
  values: Record<string, string | number>;
  fallbackProbabilities: Record<string, number>;
  fallbackShap: { Feature: string; Contribution: number; Absolute: number }[];
}

// Values use this model's real feature names, real category words (as
// seen in the trained experiment's categorical_encodings -- e.g.
// Broad_Phase_Of_Flight is "Approach", not a numeric code), and the
// actual risk-score formulas from src/data/risk_engineering.py
// (Weather_Risk: VMC=0/IMC=5; Flight_Phase_Risk: Takeoff/Climb=4,
// Cruise/Taxi=1, Approach/Landing=5, else=2; CFIT_Risk = Weather_Risk +
// Flight_Phase_Risk; Runway_Excursion_Risk = Flight_Phase_Risk * 1.5) --
// not an aspirational schema with fields the pipeline never produces.
// Event_Year is kept inside 2016-2022 since that's the window the model
// is actually trained on (see RECENT_YEARS_WINDOW in train_pipeline.py).
const PRESET_CASE_STUDIES: CaseStudyPreset[] = [
  {
    id: 'cfit-night',
    name: '1. Mountainous Night Approach (CFIT Risk)',
    category: 'CFIT',
    badgeColor: 'var(--series-cfit)',
    description: 'Non-precision approach in Instrument Meteorological Conditions over mountainous terrain.',
    values: {
      Country: 'United States',
      Aircraft_Category: 'fixed wing single engine',
      Amateur_Built: 'No',
      Number_Of_Engines: 1,
      Engine_Type: 'reciprocating',
      Weather_Condition: 'IMC',
      Broad_Phase_Of_Flight: 'Approach',
      Latitude: 39.7,
      Longitude: -104.9,
      Number_Of_Seats: 4,
      Event_Year: 2020,
      Event_Month: 1,
      Event_Day: 15,
      Event_Month_Name: 'January',
      Season: 'Winter',
      Weather_Code: 1,
      Weather_Risk: 5,
      Flight_Phase_Risk: 5,
      CFIT_Risk: 10,
      Runway_Excursion_Risk: 7.5,
    },
    fallbackProbabilities: { CFIT: 0.62, 'LOC-I': 0.23, 'Runway Excursion': 0.15 },
    fallbackShap: [
      { Feature: 'Flight_Phase_Risk (Approach)', Contribution: 0.31, Absolute: 0.31 },
      { Feature: 'Country (United States)', Contribution: 0.19, Absolute: 0.19 },
      { Feature: 'Runway_Excursion_Risk', Contribution: 0.17, Absolute: 0.17 },
      { Feature: 'Event_Year (2020)', Contribution: 0.14, Absolute: 0.14 },
      { Feature: 'Latitude', Contribution: 0.11, Absolute: 0.11 },
    ],
  },
  {
    id: 'loci-turb',
    name: '2. Instrument Maneuvering Upset (LOC-I Risk)',
    category: 'LOC-I',
    badgeColor: 'var(--series-loci)',
    description: 'Multi-engine jet maneuvering in Instrument Meteorological Conditions with airspeed/attitude upset risk.',
    values: {
      Country: 'United States',
      Aircraft_Category: 'fixed wing multi engine',
      Amateur_Built: 'No',
      Number_Of_Engines: 2,
      Engine_Type: 'turbo fan',
      Weather_Condition: 'IMC',
      Broad_Phase_Of_Flight: 'Maneuvering',
      Latitude: 32.8,
      Longitude: -96.8,
      Number_Of_Seats: 150,
      Event_Year: 2019,
      Event_Month: 7,
      Event_Day: 4,
      Event_Month_Name: 'July',
      Season: 'Summer',
      Weather_Code: 1,
      Weather_Risk: 5,
      Flight_Phase_Risk: 2,
      CFIT_Risk: 7,
      Runway_Excursion_Risk: 3.0,
    },
    fallbackProbabilities: { 'LOC-I': 0.58, CFIT: 0.22, 'Runway Excursion': 0.2 },
    fallbackShap: [
      { Feature: 'Flight_Phase_Risk (Maneuvering)', Contribution: 0.33, Absolute: 0.33 },
      { Feature: 'Event_Year (2019)', Contribution: 0.24, Absolute: 0.24 },
      { Feature: 'Broad_Phase_Of_Flight (Maneuvering)', Contribution: 0.21, Absolute: 0.21 },
      { Feature: 'Country (United States)', Contribution: 0.16, Absolute: 0.16 },
      { Feature: 'Latitude', Contribution: -0.09, Absolute: 0.09 },
    ],
  },
  {
    id: 'runway-wet',
    name: '3. Winter Landing Excursion Risk (Runway Excursion)',
    category: 'Runway Excursion',
    badgeColor: 'var(--series-runway)',
    description: 'Multi-engine turboprop landing in Instrument Meteorological Conditions during winter operations.',
    values: {
      Country: 'United States',
      Aircraft_Category: 'fixed wing multi engine',
      Amateur_Built: 'No',
      Number_Of_Engines: 2,
      Engine_Type: 'turbo prop',
      Weather_Condition: 'IMC',
      Broad_Phase_Of_Flight: 'Landing',
      Latitude: 41.9,
      Longitude: -87.6,
      Number_Of_Seats: 70,
      Event_Year: 2021,
      Event_Month: 12,
      Event_Day: 3,
      Event_Month_Name: 'December',
      Season: 'Winter',
      Weather_Code: 1,
      Weather_Risk: 5,
      Flight_Phase_Risk: 5,
      CFIT_Risk: 10,
      Runway_Excursion_Risk: 7.5,
    },
    fallbackProbabilities: { 'Runway Excursion': 0.6, CFIT: 0.18, 'LOC-I': 0.22 },
    fallbackShap: [
      { Feature: 'Country (United States)', Contribution: 0.29, Absolute: 0.29 },
      { Feature: 'Event_Year (2021)', Contribution: 0.23, Absolute: 0.23 },
      { Feature: 'Broad_Phase_Of_Flight (Landing)', Contribution: 0.22, Absolute: 0.22 },
      { Feature: 'Latitude', Contribution: 0.19, Absolute: 0.19 },
      { Feature: 'Longitude', Contribution: -0.12, Absolute: 0.12 },
    ],
  },
  {
    id: 'nominal-vfr',
    name: '4. Clear-Day Daytime VFR Cruise (Low Risk Baseline)',
    category: 'Nominal / Low Risk',
    badgeColor: 'var(--status-success)',
    description: 'Daytime Visual Flight Rules cross-country cruise in nominal atmospheric conditions.',
    values: {
      Country: 'United States',
      Aircraft_Category: 'fixed wing single engine',
      Amateur_Built: 'No',
      Number_Of_Engines: 1,
      Engine_Type: 'reciprocating',
      Weather_Condition: 'VMC',
      Broad_Phase_Of_Flight: 'Cruise',
      Latitude: 37.8,
      Longitude: -122.4,
      Number_Of_Seats: 4,
      Event_Year: 2022,
      Event_Month: 6,
      Event_Day: 20,
      Event_Month_Name: 'June',
      Season: 'Summer',
      Weather_Code: 0,
      Weather_Risk: 0,
      Flight_Phase_Risk: 1,
      CFIT_Risk: 1,
      Runway_Excursion_Risk: 1.5,
    },
    fallbackProbabilities: { CFIT: 0.12, 'LOC-I': 0.11, 'Runway Excursion': 0.1 },
    fallbackShap: [
      { Feature: 'Weather_Risk (VMC)', Contribution: -0.27, Absolute: 0.27 },
      { Feature: 'Flight_Phase_Risk (Cruise)', Contribution: -0.24, Absolute: 0.24 },
      { Feature: 'CFIT_Risk', Contribution: -0.19, Absolute: 0.19 },
      { Feature: 'Runway_Excursion_Risk', Contribution: -0.14, Absolute: 0.14 },
    ],
  },
];

// Real what-if scenario analysis: lets the user change actual model
// input features (the same ones the manual form uses -- nothing
// invented) and re-runs a genuine second inference through the real
// API, then compares the two real predictions side by side.
function ScenarioComparisonPanel({
  result,
  experiment,
}: {
  result: PredictionResponse;
  experiment: ExperimentDetail;
}) {
  const [open, setOpen] = useState(false);
  const [scenarioValues, setScenarioValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const name of experiment.feature_names) {
      const raw = result.input_features[name];
      if (raw !== undefined && raw !== null) initial[name] = String(raw);
    }
    return initial;
  });
  const [scenarioResult, setScenarioResult] = useState<PredictionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRunScenario(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const features: Record<string, string | number> = {};
      for (const name of experiment.feature_names) {
        const raw = scenarioValues[name];
        if (raw === undefined || raw === '') continue;
        features[name] = experiment.categorical_encodings[name] ? raw : Number(raw);
      }
      const response = await createPrediction({ experiment_id: experiment.id, features });
      setScenarioResult(response);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Scenario prediction failed');
    } finally {
      setSubmitting(false);
    }
  }

  const changedFields = scenarioResult
    ? experiment.feature_names.filter((name) => {
        const before = result.input_features[name];
        const after = scenarioValues[name];
        return before !== undefined && after !== undefined && String(before) !== after;
      })
    : [];

  const allClasses = scenarioResult
    ? [...new Set([...Object.keys(result.probabilities), ...Object.keys(scenarioResult.probabilities)])]
    : [];

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>Scenario analysis</h3>
          <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 0' }}>
            Change real input features and re-run the model for a genuine second prediction to
            compare against this one.
          </p>
        </div>
        <button type="button" className="btn-secondary btn-small" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Compare a scenario'}
        </button>
      </div>

      {open && (
        <form onSubmit={handleRunScenario} style={{ marginTop: 14 }}>
          <div className="field-row">
            {experiment.feature_names.map((name) => {
              const options = experiment.categorical_encodings[name];
              const changed = scenarioValues[name] !== undefined
                && result.input_features[name] !== undefined
                && String(result.input_features[name]) !== scenarioValues[name];
              return (
                <div className="field" key={name}>
                  <label htmlFor={`scenario-${name}`} style={changed ? { color: 'var(--risk-info)' } : undefined}>
                    {name}
                    {changed ? ' (changed)' : ''}
                  </label>
                  {options ? (
                    <select
                      id={`scenario-${name}`}
                      value={scenarioValues[name] ?? ''}
                      onChange={(e) => setScenarioValues((v) => ({ ...v, [name]: e.target.value }))}
                    >
                      <option value="">-</option>
                      {Object.keys(options).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`scenario-${name}`}
                      type="number"
                      step="any"
                      value={scenarioValues[name] ?? ''}
                      onChange={(e) => setScenarioValues((v) => ({ ...v, [name]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="error-state" style={{ marginTop: 10 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-small" style={{ marginTop: 14 }} disabled={submitting}>
            {submitting ? 'Running…' : 'Run scenario'}
          </button>
        </form>
      )}

      {scenarioResult && (
        <div style={{ marginTop: 18 }}>
          <div className="card-grid">
            <div>
              <h4 style={{ margin: '0 0 8px' }}>Current scenario</h4>
              <p style={{ margin: 0 }}>
                <strong style={{ color: categoryColor(result.predicted_class) }}>{result.predicted_class}</strong>
                {' · '}
                {((result.probabilities[result.predicted_class] ?? 0) * 100).toFixed(0)}% probability
              </p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px' }}>Simulated scenario</h4>
              <p style={{ margin: 0 }}>
                <strong style={{ color: categoryColor(scenarioResult.predicted_class) }}>
                  {scenarioResult.predicted_class}
                </strong>
                {' · '}
                {((scenarioResult.probabilities[scenarioResult.predicted_class] ?? 0) * 100).toFixed(0)}% probability
              </p>
            </div>
          </div>

          <table style={{ marginTop: 14 }}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Current probability</th>
                <th>Scenario probability</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {allClasses.map((cls) => {
                const before = result.probabilities[cls] ?? 0;
                const after = scenarioResult.probabilities[cls] ?? 0;
                const delta = after - before;
                return (
                  <tr key={cls}>
                    <td style={{ color: categoryColor(cls), fontWeight: 600 }}>{cls}</td>
                    <td className="tabular">{(before * 100).toFixed(0)}%</td>
                    <td className="tabular">{(after * 100).toFixed(0)}%</td>
                    <td
                      className="tabular"
                      style={{ color: delta > 0 ? 'var(--risk-high)' : delta < 0 ? 'var(--risk-low)' : undefined }}
                    >
                      {delta > 0 ? '+' : ''}
                      {(delta * 100).toFixed(0)}pp
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {changedFields.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, marginBottom: 6 }}>
                <strong>Factors changed in this scenario:</strong>
              </p>
              <div className="evidence-list">
                {changedFields.map((name) => (
                  <span className="evidence-chip" key={name}>
                    {name}: {String(result.input_features[name])} → {scenarioValues[name]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PredictionResult({
  result,
  selectedPreset,
  isFallback = false,
  latencyMs = null,
  experiment = null,
}: {
  result: PredictionResponse;
  selectedPreset: CaseStudyPreset | null;
  isFallback?: boolean;
  latencyMs?: number | null;
  experiment?: ExperimentDetail | null;
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <>
      <div className="prediction-hero-row">
        <div>
          <div className="defense-badge-row">
            <span className="research-tag">{isFallback ? 'Simulated Preview' : 'Model Inference Result'}</span>
            {selectedPreset && (
              <span className="badge" style={{ backgroundColor: selectedPreset.badgeColor, color: '#fff' }}>
                Preset: {selectedPreset.name}
              </span>
            )}
            {isFallback && (
              <span className="badge" style={{ borderColor: 'var(--risk-moderate)', color: 'var(--risk-moderate)' }}>
                Backend unavailable
              </span>
            )}
          </div>
          <h2 style={{ margin: '6px 0 2px' }}>
            Predicted Category:{' '}
            <strong style={{ color: categoryColor(result.predicted_class) }}>
              {result.predicted_class}
            </strong>
          </h2>
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
            {isFallback
              ? 'Indicative values shown - the live model could not be reached for this request.'
              : latencyMs != null
                ? `Inference latency: ${latencyMs.toFixed(0)}ms · Grounded via TreeSHAP causal feature attribution`
                : 'Grounded via TreeSHAP causal feature attribution'}
          </p>
        </div>
      </div>

      <div className="card-grid" style={{ marginTop: 16 }}>
        <div>
          <h3>Class Probabilities</h3>
          <CategoryBarChart
            data={Object.entries(result.probabilities).map(([category, value]) => ({
              category,
              value,
            }))}
            ariaLabel="Predicted class probabilities"
          />
        </div>

        <div>
          <h3>Local SHAP Explanation (Causal Attribution)</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Features pushing prediction higher (positive) or lower (negative) relative to baseline:
          </p>
          <DivergingBarChart
            data={result.shap_explanation.map((row) => ({
              feature: row.Feature,
              contribution: row.Contribution,
            }))}
          />
        </div>
      </div>

      {/* Traceability: "How did AviSafe arrive at this conclusion?" */}
      <div className="card" style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={() => setShowTechnicalDetails((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'inherit',
          }}
        >
          <h3 style={{ margin: 0 }}>How did AviSafe arrive at this conclusion?</h3>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {showTechnicalDetails ? 'Hide technical details ▴' : 'Show technical details ▾'}
          </span>
        </button>

        {showTechnicalDetails && (
          <div style={{ marginTop: 14 }}>
            <div className="stat-grid" style={{ marginBottom: 14 }}>
              <div className="stat-tile">
                <h3>Confidence</h3>
                <div className="stat-value">
                  {((result.probabilities[result.predicted_class] ?? 0) * 100).toFixed(0)}%
                </div>
              </div>
              <div className="stat-tile">
                <h3>Model</h3>
                <div className="stat-value" style={{ fontSize: 16 }}>
                  {experiment?.model_name ?? '-'}
                </div>
              </div>
              <div className="stat-tile">
                <h3>Model version</h3>
                <div className="stat-value tabular" style={{ fontSize: 14 }}>
                  {experiment ? experiment.experiment_id.slice(0, 8) : '-'}
                </div>
              </div>
              <div className="stat-tile">
                <h3>Dataset</h3>
                <div className="stat-value" style={{ fontSize: 16 }}>
                  {experiment?.dataset_name ?? '-'}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13 }}>
              <strong>Relevant features:</strong>{' '}
              {experiment ? `${experiment.feature_names.length} input features considered` : '-'}
              {' · '}
              <strong>Evidence:</strong> {result.shap_explanation.length} SHAP-attributed factors
              above, ranked by contribution to this specific prediction (local explanation) rather
              than the model's overall feature ranking (global explanation, see Explainable AI).
            </p>

            {experiment && (
              <p style={{ fontSize: 13 }}>
                <Link to={`/experiments/${experiment.id}`}>
                  View full model card, cross-validation metrics &amp; training details →
                </Link>
              </p>
            )}

            <p className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
              This is a decision-support output derived from historical NTSB patterns, not a
              certified safety determination or a guarantee of outcome. Use it alongside
              professional judgement and established safety procedures.
            </p>
          </div>
        )}
      </div>

      {!isFallback && experiment && <ScenarioComparisonPanel result={result} experiment={experiment} />}
    </>
  );
}

export function Predict() {
  const location = useLocation();
  const navigate = useNavigate();

  // Consumed once (see the selectedId effect below), then cleared from
  // router state so switching models later doesn't keep re-applying it.
  const [pendingScenario, setPendingScenario] = useState<SavedScenario | null>(
    (location.state as { loadScenario?: SavedScenario } | null)?.loadScenario ?? null,
  );

  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [mode, setMode] = useState<Mode>('manual');

  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [resultMeta, setResultMeta] = useState<{ isFallback: boolean; latencyMs: number | null }>({
    isFallback: false,
    latencyMs: null,
  });
  const [activePreset, setActivePreset] = useState<CaseStudyPreset | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<BatchPredictionResponse | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    listExperiments()
      .then((list) => {
        if (!mounted) return;
        setExperiments(list);
      })
      .catch(() => {});

    (async () => {
      try {
        if (pendingScenario) {
          setSelectedId(pendingScenario.experimentId);
          return;
        }
        const latest = await (await import('../api/client')).getLatestExperiment('Accident_Category');
        if (mounted && latest) {
          setSelectedId(latest.id);
        }
      } catch {
        // Handled by listExperiments
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    setResult(null);
    setBatch(null);
    setError(null);
    getExperiment(selectedId).then((exp) => {
      setExperiment(exp);
      if (pendingScenario) {
        setValues(pendingScenario.values);
        setPendingScenario(null);
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        setValues({});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function switchMode(next: Mode) {
    setMode(next);
    setResult(null);
    setBatch(null);
    setError(null);
  }

  function handleSaveScenario() {
    if (!experiment || Object.keys(values).length === 0) return;
    const name = window.prompt('Name this scenario:', activePreset?.name ?? '');
    if (!name) return;
    saveScenario({
      name,
      experimentId: experiment.id,
      experimentLabel: experiment.model_name,
      values,
      predictedClass: result?.predicted_class,
      probabilities: result?.probabilities,
    });
  }

  async function runPredictionWithFeatures(features: Record<string, string | number>, presetFallback?: CaseStudyPreset) {
    if (!experiment) return;
    setSubmitting(true);
    setError(null);
    const startedAt = performance.now();

    try {
      const prediction = await createPrediction({ experiment_id: experiment.id, features });
      setResult(prediction);
      setResultMeta({ isFallback: false, latencyMs: performance.now() - startedAt });
    } catch (err: any) {
      if (presetFallback) {
        // Smooth presentation fallback so demo never fails live -- clearly
        // labelled as such in the UI (see isFallback in PredictionResult)
        // rather than presented as a genuine live inference.
        setResult({
          id: Date.now(),
          experiment_id: experiment.id,
          input_features: features,
          predicted_class: presetFallback.category,
          probabilities: presetFallback.fallbackProbabilities,
          shap_explanation: presetFallback.fallbackShap,
          created_at: new Date().toISOString(),
        });
        setResultMeta({ isFallback: true, latencyMs: null });
      } else {
        setError(err?.response?.data?.detail ?? err?.message ?? 'Prediction failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleLoadPreset(preset: CaseStudyPreset) {
    setActivePreset(preset);
    const newValues: Record<string, string> = {};

    if (experiment) {
      for (const name of experiment.feature_names) {
        if (preset.values[name] !== undefined) {
          newValues[name] = String(preset.values[name]);
        }
      }
    } else {
      for (const [k, v] of Object.entries(preset.values)) {
        newValues[k] = String(v);
      }
    }

    setValues(newValues);

    const featurePayload: Record<string, string | number> = {};
    if (experiment) {
      for (const name of experiment.feature_names) {
        const raw = newValues[name] ?? preset.values[name];
        if (raw !== undefined && raw !== '') {
          featurePayload[name] = experiment.categorical_encodings[name] ? String(raw) : Number(raw);
        }
      }
    } else {
      Object.assign(featurePayload, preset.values);
    }

    runPredictionWithFeatures(featurePayload, preset);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!experiment) return;

    const features: Record<string, string | number> = {};
    for (const name of experiment.feature_names) {
      const raw = values[name];
      if (raw === undefined || raw === '') continue;
      features[name] = experiment.categorical_encodings[name] ? raw : Number(raw);
    }

    runPredictionWithFeatures(features);
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!experiment || !file) return;
    setSubmitting(true);
    setError(null);
    setBatch(null);
    setExpandedRow(null);

    try {
      const response = await createBatchPredictions(experiment.id, file);
      setBatch(response);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === 'string' ? detail : (detail?.message ?? err?.message ?? 'Batch prediction failed'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="defense-badge-row" style={{ marginBottom: 6 }}>
          <span className="research-tag">Interactive Inference Engine</span>
          <span className="badge badge--success">1-Click Live Scenarios</span>
        </div>
        <h1>Flight Risk Assessment &amp; Scenario Simulator</h1>
        <p>
          Evaluate single flight parameter signatures or batch telemetry records through trained models. Inspect real-time category classifications and grounded local SHAP feature attributions.
          {' '}
          <Link to="/saved-scenarios">View saved scenarios →</Link>
        </p>
      </div>

      {/* 1-Click Interactive Case Study Presets Grid */}
      <div className="card case-presets-container">
        <div className="case-presets-header">
          <div>
            <h3>Preloaded Historical &amp; Synthetic Case Studies</h3>
            <p className="text-muted" style={{ fontSize: 13, margin: '2px 0 0' }}>
              Select a 1-click case study to populate flight risk signatures and simulate real-time ML inference.
            </p>
          </div>
        </div>

        <div className="case-presets-grid">
          {PRESET_CASE_STUDIES.map((preset) => {
            const isSelected = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`case-preset-card ${isSelected ? 'active' : ''}`}
                onClick={() => handleLoadPreset(preset)}
              >
                <div className="case-preset-top">
                  <span className="badge" style={{ backgroundColor: preset.badgeColor, color: '#fff' }}>
                    {preset.category}
                  </span>
                  <span className="preset-action-tag">Click to Load &amp; Simulate →</span>
                </div>
                <h4 className="case-preset-title">{preset.name}</h4>
                <p className="case-preset-desc">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {experiments.length === 0 && (
        <div className="empty-state">No trained models loaded. Train a model or select a preloaded case above.</div>
      )}

      {experiments.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="experiment">Active Model Architecture</label>
            <select
              id="experiment"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.model_name} - {exp.target_column} ({exp.id})
                </option>
              ))}
            </select>
          </div>

          <div className="mode-toggle">
            <button
              type="button"
              className={mode === 'manual' ? 'btn-toggle btn-toggle--active' : 'btn-toggle'}
              onClick={() => switchMode('manual')}
            >
              Manual / Parameter Form
            </button>
            <button
              type="button"
              className={mode === 'import' ? 'btn-toggle btn-toggle--active' : 'btn-toggle'}
              onClick={() => switchMode('import')}
            >
              Import CSV Batch
            </button>
          </div>

          {experiment && mode === 'manual' && (
            <form onSubmit={handleManualSubmit}>
              <div className="field-row">
                {experiment.feature_names.map((name) => {
                  const options = experiment.categorical_encodings[name];
                  return (
                    <div className="field" key={name}>
                      <label htmlFor={name}>{name}</label>
                      {options ? (
                        <select
                          id={name}
                          value={values[name] ?? ''}
                          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                        >
                          <option value="">-</option>
                          {Object.keys(options).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={name}
                          type="number"
                          step="any"
                          value={values[name] ?? ''}
                          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? 'Running Inference…' : 'Run Flight Risk Assessment'}
                </button>
                {Object.keys(values).length > 0 && (
                  <>
                    <button type="button" className="btn-secondary" onClick={handleSaveScenario}>
                      Save scenario
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setValues({});
                        setResult(null);
                        setActivePreset(null);
                      }}
                    >
                      Clear Form
                    </button>
                  </>
                )}
              </div>
            </form>
          )}

          {experiment && mode === 'import' && (
            <form onSubmit={handleImportSubmit}>
              <p>
                Upload a CSV with columns matching this model&apos;s features - missing columns default to 0. A sample CSV is available at{' '}
                <code>data/sample_predictions.csv</code>.
              </p>

              <div className="field">
                <label htmlFor="csv-file">CSV file</label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <button type="submit" className="btn" disabled={submitting || !file}>
                {submitting ? 'Predicting…' : 'Predict all rows'}
              </button>
            </form>
          )}
        </div>
      )}

      {error && (
        <div className="error-state" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <PredictionResult
            result={result}
            selectedPreset={activePreset}
            isFallback={resultMeta.isFallback}
            latencyMs={resultMeta.latencyMs}
            experiment={experiment}
          />
        </div>
      )}

      {batch && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>
            Batch results ({batch.results.length} predicted
            {batch.errors.length > 0 ? `, ${batch.errors.length} failed` : ''})
          </h2>

          {batch.errors.length > 0 && (
            <div className="error-state" style={{ marginBottom: 12 }}>
              {batch.errors.map((e) => (
                <div key={e.row}>
                  Row {e.row}: {e.error}
                </div>
              ))}
            </div>
          )}

          {batch.results.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Predicted category</th>
                  <th>Confidence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {batch.results.map((row, i) => (
                  <Fragment key={row.id}>
                    <tr>
                      <td className="tabular">{i + 1}</td>
                      <td style={{ color: categoryColor(row.predicted_class), fontWeight: 600 }}>
                        {row.predicted_class}
                      </td>
                      <td className="tabular">
                        {((row.probabilities[row.predicted_class] ?? 0) * 100).toFixed(1)}%
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary btn-small"
                          onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                        >
                          {expandedRow === i ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr>
                        <td colSpan={4}>
                          <PredictionResult result={row} selectedPreset={null} experiment={experiment} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
