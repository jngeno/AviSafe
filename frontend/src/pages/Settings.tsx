import { ComingSoon } from '../components/ComingSoon';

export function Settings() {
  return (
    <ComingSoon
      title="Settings"
      description="User accounts, roles, notification preferences, and API key management will land once authentication is introduced to the platform."
      requires={['User accounts & authentication', 'Role-based access control']}
    />
  );
}
