
import React from "react";
import { Navigate } from "react-router-dom";
// Fixed path: src/pages/PortalIndex.tsx is in src/pages/, AuthContext is in src/context/
import { useAuth } from "../context/AuthContext";
// PatientDashboard is a default export in PatientDashboard.jsx
import PatientDashboard from "./PatientDashboard";

export const PortalIndex: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  // Replaced UserRole.Paciente with 'patient' string literal used in AuthContext
  if (user.role === 'patient') return <PatientDashboard />;

  // Replaced UserRole.Facturacion with 'facturacion' string literal used in AuthContext
  if (user.role === 'facturacion') {
    // Adjusted path to match available routes in App.jsx
    return <Navigate to="/app/invoices" replace />;
  }

  // Admin o Recepción
  // Adjusted path to match available routes in App.jsx (agenda -> appointments)
  return <Navigate to="/app/appointments" replace />;
};
