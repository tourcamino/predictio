import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/')({
  component: SettingsIndex,
});

function SettingsIndex() {
  // Redirect to trading settings by default
  return <Navigate to="/settings/trading" replace />;
}
