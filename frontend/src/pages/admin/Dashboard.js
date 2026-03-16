import { Navigate } from 'react-router-dom';

// Redirige a AdminOverview que es el dashboard real
export default function AdminDashboard() {
  return <Navigate to="/admin" replace />;
}
