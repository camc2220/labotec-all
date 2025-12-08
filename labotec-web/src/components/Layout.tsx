import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Phone, MapPin, FlaskConical, UserCircle } from 'lucide-react';
import { COMPANY_INFO } from '../constants';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path
      ? 'text-lab-800 font-semibold'
      : 'text-gray-600 hover:text-lab-800';

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top Bar */}
      <div className="bg-lab-800 text-white py-2 px-4 text-sm hidden md:flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <span className="flex items-center gap-2">
            <Phone size={14} /> {COMPANY_INFO.phone}
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={14} /> Santo Domingo Este
          </span>
        </div>
        <div>
          <span>{COMPANY_INFO.schedule}</span>
        </div>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-lab-800 p-2 rounded-lg text-white">
                <FlaskConical size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-lab-800 leading-none">Labotec</h1>
                <span className="text-xs text-gray-500 uppercase tracking-widest">
                  Laboratorio Clínico
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className={isActive('/')}>Inicio</Link>
              <Link to="/servicios" className={isActive('/servicios')}>Servicios</Link>
              <Link to="/contacto" className={isActive('/contacto')}>Contacto</Link>

              {isAuthenticated ? (
                <Link
                  to="/portal"
                  className="flex items-center gap-2 px-4 py-2 bg-lab-100 text-lab-800 rounded-full font-medium hover:bg-lab-200 transition"
                >
                  <UserCircle size={20} />
                  Hola, {(user?.fullName || user?.username || 'Usuario').split(' ')[0]}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-2 bg-lab-800 text-white rounded-full font-medium hover:bg-lab-700 transition shadow-lg shadow-lab-500/30"
                >
                  Portal Paciente
                </Link>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50">Inicio</Link>
              <Link to="/servicios" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50">Servicios</Link>
              <Link to="/contacto" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50">Contacto</Link>
              <Link to={isAuthenticated ? "/portal" : "/login"} onClick={() => setIsMenuOpen(false)} className="block w-full text-left px-3 py-2 text-base font-medium text-lab-800 bg-lab-50 mt-2 rounded">
                {isAuthenticated ? 'Ir al Portal' : 'Iniciar Sesión'}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="text-lab-500" size={24} />
                <span className="text-xl font-bold">Labotec SRL</span>
              </div>
              <p className="text-gray-400 mb-4 text-sm max-w-xs">
                {COMPANY_INFO.slogan}. Comprometidos con la precisión y tu salud.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-lab-100">Enlaces Rápidos</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/servicios" className="hover:text-white">Nuestros Análisis</Link></li>
                <li><Link to="/portal" className="hover:text-white">Consultar Resultados</Link></li>
                <li><Link to="/portal/citas" className="hover:text-white">Agendar Cita</Link></li>
                <li><Link to="/contacto" className="hover:text-white">Ubicación</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-lab-100">Contacto</h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="mt-1 flex-shrink-0" />
                  <span>{COMPANY_INFO.address}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} />
                  <span>{COMPANY_INFO.phone}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Labotec SRL. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
