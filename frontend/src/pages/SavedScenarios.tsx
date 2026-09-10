import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryColor } from '../components/categoryColor';
import { deleteSavedScenario, listSavedScenarios, type SavedScenario } from '../savedScenarios';

export function SavedScenarios() {
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setScenarios(listSavedScenarios());
  }, []);

  function handleDelete(id: string) {
    deleteSavedScenario(id);
    setScenarios((rows) => rows.filter((s) => s.id !== id));
  }

  function handleLoad(scenario: SavedScenario) {
    navigate('/flight-risk-assessment', { state: { loadScenario: scenario } });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Saved Scenarios</h1>
        <p>
          Scenarios you&apos;ve saved from the Flight Risk Simulator, kept in this browser. Load one back into
          the simulator to rerun or tweak it.
        </p>
      </div>

      {scenarios.length === 0 && (
        <div className="empty-state">
          No saved scenarios yet. Run a simulation and use &ldquo;Save scenario&rdquo; to keep it here.
        </div>
      )}

      {scenarios.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Saved</th>
                <th>Model</th>
                <th>Predicted category</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="tabular">{new Date(s.createdAt).toLocaleString()}</td>
                  <td>{s.experimentLabel}</td>
                  <td>
                    {s.predictedClass ? (
                      <span style={{ color: categoryColor(s.predictedClass), fontWeight: 600 }}>
                        {s.predictedClass}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn-secondary btn-small" onClick={() => handleLoad(s)}>
                      Load
                    </button>
                    <button type="button" className="btn-secondary btn-small" onClick={() => handleDelete(s.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
