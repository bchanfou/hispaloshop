import { Navigate } from 'react-router-dom';

// Redirige a CustomerOverview que es el dashboard real
export default function CustomerDashboard() {
  return <Navigate to="/dashboard/consumer" replace />;
}
