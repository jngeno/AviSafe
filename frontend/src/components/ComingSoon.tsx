import { IconClock } from './icons';

interface ComingSoonProps {
  title: string;
  description: string;
  requires?: string[];
}

export function ComingSoon({ title, description, requires }: ComingSoonProps) {
  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
      </div>
      <div className="card coming-soon">
        <span className="coming-soon-icon">
          <IconClock size={22} />
        </span>
        <h2>On the roadmap</h2>
        <p>{description}</p>
        {requires && requires.length > 0 && (
          <div>
            <p className="coming-soon-requires-label">Needs data not yet in the dataset:</p>
            <div className="evidence-list">
              {requires.map((req) => (
                <span className="evidence-chip" key={req}>
                  {req}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
