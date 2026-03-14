import { Navigate } from 'react-router-dom';

// ProducerDashboard redirige a ProducerOverview que es el dashboard real
export default function ProducerDashboard() {
  return <Navigate to="/producer" replace />;
}
