import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../types";
import { PatientDashboard } from "./PatientDashboard";

export const PortalIndex: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === UserRole.Paciente) return <PatientDashboard />;

  if (user.role === UserRole.Facturacion) {
    return <Navigate to="/portal/facturacion" replace />;
  }

  // Admin o Recepción
  return <Navigate to="/portal/agenda" replace />;
};
