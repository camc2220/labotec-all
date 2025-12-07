import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { DashboardLayout } from './components/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './types';

// Public Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Services } from './pages/Services';
import { Contact } from './pages/Contact';

// Portal Pages
import { PatientDashboard } from './pages/dashboard/PatientDashboard';
import { Appointments } from './pages/dashboard/Appointments';
import { Results } from './pages/dashboard/Results';
import { ReceptionDashboard } from './pages/dashboard/reception/ReceptionDashboard';
import { BillingDashboard } from './pages/dashboard/billing/BillingDashboard';
import { AdminDashboard } from './pages/dashboard/admin/AdminDashboard';
import { useAuth } from './context/AuthContext';

// Helper component to redirect to correct dashboard based on role
const RoleBasedRedirect = () => {
    const { user } = useAuth();
    if (user?.role === UserRole.Admin) return <Navigate to="/portal/admin" />;
    if (user?.role === UserRole.Recepcion) return <Navigate to="/portal/recepcion" />;
    if (user?.role === UserRole.Facturacion) return <Navigate to="/portal/facturacion" />;
    return <PatientDashboard />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/servicios" element={<Services />} />
            <Route path="/contacto" element={<Contact />} />
          </Route>

          {/* Protected Portal Routes */}
          <Route path="/portal" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            {/* Default root redirects based on role */}
            <Route index element={<RoleBasedRedirect />} />

            {/* Patient Routes */}
            <Route path="citas" element={<Appointments />} />
            <Route path="resultados" element={<Results />} />
            
            {/* Reception Routes */}
            <Route path="recepcion" element={
               <ProtectedRoute allowedRoles={[UserRole.Recepcion, UserRole.Admin]}>
                 <ReceptionDashboard />
               </ProtectedRoute>
            } />
            <Route path="agenda" element={
                <ProtectedRoute allowedRoles={[UserRole.Recepcion, UserRole.Admin]}>
                    <ReceptionDashboard /> {/* Reuse for now, or separate if needed */}
                </ProtectedRoute>
            } />

            {/* Billing Routes */}
            <Route path="facturacion" element={
               <ProtectedRoute allowedRoles={[UserRole.Facturacion, UserRole.Admin]}>
                 <BillingDashboard />
               </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="admin" element={
               <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                 <AdminDashboard />
               </ProtectedRoute>
            } />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;