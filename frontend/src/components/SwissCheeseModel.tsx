import { useState } from 'react';
import { categoryColor } from './categoryColor';

export interface BarrierLayer {
  id: string;
  name: string;
  level: number;
  hfacsCategory: string;
  description: string;
  holes: {
    feature: string;
    shapImpact: string;
    description: string;
    icaoRef: string;
    mitigation: string;
  }[];
}

const SWISS_CHEESE_DATA: Record<string, BarrierLayer[]> = {
  CFIT: [
    {
      id: 'org',
      name: 'Organizational Influences',
      level: 1,
      hfacsCategory: 'Organizational Climate & Resource Management',
      description: 'Corporate safety policies, route terrain risk management, and GPWS retrofit mandates.',
      holes: [
        {
          feature: 'Terrain_Risk_Index',
          shapImpact: '+0.34 SHAP Contribution',
          description: 'Absence of sector-specific Minimum Safe Altitude Warning (MSAW) protocols.',
          icaoRef: 'ICAO Doc 9859 Safety Management (SMS) & Annex 6 Part I',
          mitigation: 'Implement mandatory Enhanced GPWS (TAWS Class A) and terrain database update audit cycles.',
        },
        {
          feature: 'Schedule_Type',
          shapImpact: '+0.18 SHAP Contribution',
          description: 'Tight turnaround pressures leading to rushed non-precision approach briefings.',
          icaoRef: 'ICAO Annex 6 - Fatigue Management Standards',
          mitigation: 'Enforce stabilized approach criteria with mandatory go-around policies without penalty.',
        },
      ],
    },
    {
      id: 'sup',
      name: 'Unsafe Supervision',
      level: 2,
      hfacsCategory: 'Supervisory Violations & Planned Inappropriate Ops',
      description: 'Flight operations oversight, crew pairing standards, and dispatch clearance in adverse weather.',
      holes: [
        {
          feature: 'Weather_Condition (IMC)',
          shapImpact: '+0.28 SHAP Contribution',
          description: 'Authorizing visual approach clearance in marginal instrument meteorological conditions (IMC).',
          icaoRef: 'ICAO Annex 2 - Rules of the Air (VFR/IFR Limits)',
          mitigation: 'Require automated flight ops dispatch cross-check for high-terrain non-precision approaches.',
        },
      ],
    },
    {
      id: 'pre',
      name: 'Preconditions for Unsafe Acts',
      level: 3,
      hfacsCategory: 'Environmental Factors & Cognitive State',
      description: 'Cockpit environment, nocturnal circadian disruption, darkness, and degraded visual cues.',
      holes: [
        {
          feature: 'Lighting_Condition (Night)',
          shapImpact: '+0.31 SHAP Contribution',
          description: 'Black-hole illusion and loss of visual horizon during night visual descent over unlit terrain.',
          icaoRef: 'ICAO Annex 14 - Aerodrome Visual Aids & Approach Lighting',
          mitigation: 'Mandate vertical flight path guidance (VNAV/PBN) for all night runway approaches.',
        },
        {
          feature: 'Ceiling_Height_FT (<500ft)',
          shapImpact: '+0.25 SHAP Contribution',
          description: 'Late breakout below overcast cloud layer reducing reaction time to ground proximity.',
          icaoRef: 'ICAO Doc 9365 - All-Weather Operations Manual',
          mitigation: 'Increase minimum decision altitude (MDA) for non-precision approaches without vertical guidance.',
        },
      ],
    },
    {
      id: 'act',
      name: 'Unsafe Acts (Active Failures)',
      level: 4,
      hfacsCategory: 'Skill-Based Errors & Decision Errors',
      description: 'Cockpit execution: premature descent below minimum safe altitudes and delayed pull-up response.',
      holes: [
        {
          feature: 'Flight_Phase (Approach)',
          shapImpact: '+0.42 SHAP Contribution',
          description: 'Descent below glideslope during visual capture phase without positive terrain clearance.',
          icaoRef: 'ICAO Annex 13 - Aircraft Accident Investigation & Prevention',
          mitigation: 'Standard Operating Procedure (SOP) callouts for radio altitude cross-checks at 1000, 500, and 100 ft.',
        },
      ],
    },
  ],
  'LOC-I': [
    {
      id: 'org',
      name: 'Organizational Influences',
      level: 1,
      hfacsCategory: 'Organizational Process & Training',
      description: 'Upset Prevention and Recovery Training (UPRT) curriculum depth and simulator fidelity.',
      holes: [
        {
          feature: 'Aircraft_Category',
          shapImpact: '+0.22 SHAP Contribution',
          description: 'Lack of recurring high-altitude stall recognition training in full-flight simulators.',
          icaoRef: 'ICAO Doc 10011 - Manual on Aeroplane Upset Prevention and Recovery Training',
          mitigation: 'Incorporate recurrent dynamic UPRT training covering high-altitude aerodynamic degradation.',
        },
      ],
    },
    {
      id: 'sup',
      name: 'Unsafe Supervision',
      level: 2,
      hfacsCategory: 'Crew Resource Management & Pairing',
      description: 'Dispatching across known severe convective weather SIGMETs with limited fuel diversion reserves.',
      holes: [
        {
          feature: 'Turbulence_Intensity',
          shapImpact: '+0.36 SHAP Contribution',
          description: 'Routing aircraft directly through squall line convective activity.',
          icaoRef: 'ICAO Annex 3 - Meteorological Service for International Air Navigation',
          mitigation: 'Implement real-time airborne radar data-link feeds with mandatory 20nm storm-cell clearance.',
        },
      ],
    },
    {
      id: 'pre',
      name: 'Preconditions for Unsafe Acts',
      level: 3,
      hfacsCategory: 'Sensory Illusion & Spatial Disorientation',
      description: 'Inadvertent entry into severe turbulence leading to vestibular illusions and somatogravic false cues.',
      holes: [
        {
          feature: 'Convective_Risk_Index',
          shapImpact: '+0.38 SHAP Contribution',
          description: 'Pitot-static icing or severe updrafts causing contradictory flight instrument indications.',
          icaoRef: 'ICAO Annex 8 - Airworthiness of Aircraft (Pitot heat & de-icing standards)',
          mitigation: 'Multi-sensor airspeed validation and automatic pitot heating redundancy monitoring.',
        },
      ],
    },
    {
      id: 'act',
      name: 'Unsafe Acts (Active Failures)',
      level: 4,
      hfacsCategory: 'Decision Errors & Inappropriate Control Inputs',
      description: 'Over-controlling or improper pitch-up input during aerodynamic stall onset.',
      holes: [
        {
          feature: 'Broad_Phase_Of_Flight (Maneuvering)',
          shapImpact: '+0.45 SHAP Contribution',
          description: 'Aggressive pitch input exceeding critical angle of attack (AoA).',
          icaoRef: 'ICAO Annex 6 - Flight Crew Operating Procedures',
          mitigation: 'Automated flight envelope protection and stick-pusher tactile stall warning systems.',
        },
      ],
    },
  ],
  'Runway Excursion': [
    {
      id: 'org',
      name: 'Organizational Influences',
      level: 1,
      hfacsCategory: 'Aerodrome Maintenance & Runway Friction Policy',
      description: 'Runway surface condition reporting standards and rubber removal intervals.',
      holes: [
        {
          feature: 'Runway_Friction_Index',
          shapImpact: '+0.33 SHAP Contribution',
          description: 'Inadequate reporting of standing water and hydroplaning potential (GRF).',
          icaoRef: 'ICAO Doc 9981 - PANS-Aerodromes & Global Reporting Format (GRF)',
          mitigation: 'Implement automated continuous runway friction measuring equipment (CFME).',
        },
      ],
    },
    {
      id: 'sup',
      name: 'Unsafe Supervision',
      level: 2,
      hfacsCategory: 'ATC Traffic Sequencing & Landing Clearance',
      description: 'Failure to change active landing runway to align with shifting tailwind components.',
      holes: [
        {
          feature: 'Tailwind_Component_KTS',
          shapImpact: '+0.29 SHAP Contribution',
          description: 'Approving landings with tailwinds exceeding airline operating limit (>10 kts).',
          icaoRef: 'ICAO Annex 14 - Aerodromes, Vol I Design and Operations',
          mitigation: 'Enforce strict automated ATC tailwind runway closure thresholds.',
        },
      ],
    },
    {
      id: 'pre',
      name: 'Preconditions for Unsafe Acts',
      level: 3,
      hfacsCategory: 'Physical Environment & Aircraft Energy State',
      description: 'High energy state on short final combined with contaminated wet pavement.',
      holes: [
        {
          feature: 'Weather_Condition (Rain/Snow)',
          shapImpact: '+0.35 SHAP Contribution',
          description: 'Dynamic hydroplaning reducing wheel braking coefficient by up to 80%.',
          icaoRef: 'ICAO Annex 6 Part I - Landing Distance at Time of Arrival (LDTA)',
          mitigation: 'Mandatory in-flight real-time landing distance assessment with 15% safety buffer before landing.',
        },
      ],
    },
    {
      id: 'act',
      name: 'Unsafe Acts (Active Failures)',
      level: 4,
      hfacsCategory: 'Procedural Deviation & Delayed Deceleration',
      description: 'Long float beyond touchdown zone and delayed deployment of reverse thrust and ground spoilers.',
      holes: [
        {
          feature: 'Touchdown_Distance_Deviation',
          shapImpact: '+0.44 SHAP Contribution',
          description: 'Attempting to salvage an unstabilized approach beyond the 1,000 ft touchdown zone.',
          icaoRef: 'ICAO Doc 10057 - Manual on Prevention of Runway Excursions',
          mitigation: 'Automated runway overrun awareness and alerting system (ROAAS) activation.',
        },
      ],
    },
  ],
};

export function SwissCheeseModel({
  selectedCategory = 'CFIT',
  onCategoryChange,
}: {
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}) {
  const activeCategory = SWISS_CHEESE_DATA[selectedCategory] ? selectedCategory : 'CFIT';
  const layers = SWISS_CHEESE_DATA[activeCategory];
  const [selectedHole, setSelectedHole] = useState<{
    layer: BarrierLayer;
    hole: BarrierLayer['holes'][0];
  } | null>(null);

  const catColor = categoryColor(activeCategory);

  return (
    <div className="swiss-cheese-container">
      <div className="swiss-cheese-header">
        <div>
          <div className="swiss-cheese-badge-row">
            <span className="research-tag">Academic Causation Framework</span>
            <span className="badge" style={{ backgroundColor: catColor, color: '#fff' }}>
              {activeCategory} Accident Causation
            </span>
          </div>
          <h3 style={{ margin: '8px 0 4px' }}>
            Reason&apos;s Swiss Cheese Accident Causation Model
          </h3>
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
            How SHAP-identified systemic risk factors align across defensive barriers to breach safety margins. Click any barrier hole to inspect HFACS classification & ICAO standards.
          </p>
        </div>

        {onCategoryChange && (
          <div className="swiss-category-tabs">
            {['CFIT', 'LOC-I', 'Runway Excursion'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`swiss-tab-btn ${activeCategory === cat ? 'active' : ''}`}
                style={{
                  borderColor: activeCategory === cat ? categoryColor(cat) : undefined,
                  color: activeCategory === cat ? categoryColor(cat) : undefined,
                }}
                onClick={() => {
                  onCategoryChange(cat);
                  setSelectedHole(null);
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trajectory Vector Arrow */}
      <div className="hazard-trajectory-bar">
        <div className="hazard-label">Hazard Trajectory (Latent Factors)</div>
        <div className="hazard-arrow-line">
          <div className="hazard-pulse" />
        </div>
        <div className="hazard-result-label" style={{ color: catColor }}>
          Accident: {activeCategory}
        </div>
      </div>

      {/* 4 Defensive Barrier Slices */}
      <div className="swiss-layers-grid">
        {layers.map((layer, idx) => {
          return (
            <div key={layer.id} className="swiss-slice-card">
              <div className="swiss-slice-header">
                <span className="swiss-level-pill">Layer {layer.level}</span>
                <h4 className="swiss-slice-title">{layer.name}</h4>
              </div>

              <div className="swiss-hfacs-tag">{layer.hfacsCategory}</div>
              <p className="swiss-slice-desc">{layer.description}</p>

              <div className="swiss-holes-wrapper">
                <div className="swiss-holes-label">Active SHAP Failure Holes:</div>
                <div className="swiss-holes-list">
                  {layer.holes.map((hole) => {
                    const isSelected = selectedHole?.hole.feature === hole.feature;
                    return (
                      <button
                        key={hole.feature}
                        type="button"
                        className={`swiss-hole-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedHole({ layer, hole })}
                      >
                        <span className="swiss-hole-indicator" />
                        <div className="swiss-hole-info">
                          <span className="swiss-hole-feature">{hole.feature}</span>
                          <span className="swiss-hole-impact">{hole.shapImpact}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="swiss-barrier-footer">
                <span>Barrier {idx + 1} of 4</span>
                <span className="swiss-status-indicator">
                  {layer.holes.length} Latent Weakness{layer.holes.length === 1 ? '' : 'es'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Popover / Inspector */}
      {selectedHole && (
        <div className="swiss-detail-panel">
          <div className="swiss-detail-header">
            <div>
              <span className="badge" style={{ backgroundColor: catColor, color: '#fff' }}>
                {activeCategory} Risk Factor
              </span>
              <h4 style={{ margin: '6px 0 2px', fontSize: 16 }}>
                {selectedHole.hole.feature} ({selectedHole.layer.name})
              </h4>
            </div>
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => setSelectedHole(null)}
            >
              Close
            </button>
          </div>

          <div className="swiss-detail-grid">
            <div className="swiss-detail-item">
              <span className="detail-item-label">SHAP Causal Weight</span>
              <strong style={{ color: catColor }}>{selectedHole.hole.shapImpact}</strong>
            </div>
            <div className="swiss-detail-item">
              <span className="detail-item-label">HFACS 7.0 Classification</span>
              <strong>{selectedHole.layer.hfacsCategory}</strong>
            </div>
            <div className="swiss-detail-item">
              <span className="detail-item-label">ICAO Regulatory Standard</span>
              <strong style={{ color: 'var(--brand-accent)' }}>{selectedHole.hole.icaoRef}</strong>
            </div>
          </div>

          <div className="swiss-detail-section">
            <strong>Systemic Causation Mechanism:</strong>
            <p>{selectedHole.hole.description}</p>
          </div>

          <div className="swiss-detail-section swiss-mitigation-box">
            <strong>Mandated Safety Mitigation & Policy Intervention:</strong>
            <p>{selectedHole.hole.mitigation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
