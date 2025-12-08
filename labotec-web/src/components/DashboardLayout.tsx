import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  LogOut,
  Settings,
  FlaskConical,
  DollarSign,
} from '../icons';
import { UserRole } from '../types';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const safeName = user?.fullName?.trim() || user?.username?.trim() || 'Usuario';
  const initial = (safeName[0] || '?').toUpperCase();

  const NavItem = ({
    to,
    icon: Icon,
    label,
  }: {
    to: string;
    icon: React.ElementType;
    label: string;
  }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive ? 'bg-lab-800 text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col">
        <div className="p-6 border-b flex items-center gap-2">
          <div className="bg-lab-800 text-white p-1.5 rounded">
            <FlaskConical size={20} />
          </div>
          <span className="text-xl font-bold text-gray-800">Labotec</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Patient */}
          {user?.role === UserRole.Paciente && (
            <>
              <NavItem to="/portal" icon={LayoutDashboard} label="Inicio" />
              <NavItem to="/portal/resultados" icon={FileText} label="Mis Resultados" />
              <NavItem to="/portal/citas" icon={Calendar} label="Agendar Cita" />
            </>
          )}

          {/* Reception */}
          {user?.role === UserRole.Recepcion && (
            <>
              <NavItem to="/portal/recepcion" icon={Users} label="Recepción" />
              <NavItem to="/portal/agenda" icon={Calendar} label="Agenda General" />
            </>
          )}

          {/* Billing */}
          {user?.role === UserRole.Facturacion && (
            <>
              <NavItem to="/portal/facturacion" icon={DollarSign} label="Caja y Cobros" />
            </>
          )}

          {/* Admin */}
          {user?.role === UserRole.Admin && (
            <>
              <NavItem to="/portal/admin" icon={Settings} label="Administración" />
              <NavItem to="/portal/recepcion" icon={Users} label="Vista Recepción" />
              <NavItem to="/portal/facturacion" icon={DollarSign} label="Vista Facturación" />
            </>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-lab-100 text-lab-800 flex items-center justify-center font-bold">
              {initial}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{safeName}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow p-4 flex justify-between items-center z-10">
          <span className="font-bold text-lg">Portal {user?.role}</span>
          <button onClick={handleLogout} className="p-2 text-gray-600">
            <LogOut size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
