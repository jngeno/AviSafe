import { ComingSoon } from '../components/ComingSoon';

export function AirportAnalytics() {
  return (
    <ComingSoon
      title="Airport Analytics"
      description="Runway-level and airport-level risk analytics -- ICAO/IATA identifiers, runway condition, and per-airport accident rates -- will land once airport reference data is joined into the pipeline."
      requires={['ICAO/IATA airport codes', 'Runway identifiers & surface data', 'Per-airport traffic volume']}
    />
  );
}
