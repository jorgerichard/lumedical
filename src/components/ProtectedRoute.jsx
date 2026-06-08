import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Props:
// - children: the protected element(s)
// - allowedRoles?: array of allowed role strings (optional)
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <div className="loading-screen">Cargando sesión...</div>;
  }

  if (!token || !user) {
    // redirect to login and preserve attempted url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // unauthorized: redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
