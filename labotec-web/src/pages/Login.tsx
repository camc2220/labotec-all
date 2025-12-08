import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FlaskConical, Lock, User, AlertCircle } from '../icons';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/portal');
    } catch (err) {
      setError('Credenciales inválidas o error de conexión.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-lab-100 text-lab-800 rounded-full mb-4">
             <FlaskConical size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Bienvenido a Labotec</h2>
          <p className="text-gray-500 mt-2">Accede a tus resultados y citas</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario o Correo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lab-500 focus:border-lab-500 outline-none transition"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lab-500 focus:border-lab-500 outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="text-right mt-1">
              <a href="#" className="text-xs text-lab-600 hover:text-lab-800">¿Olvidaste tu contraseña?</a>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-lab-800 text-white font-bold rounded-lg hover:bg-lab-900 transition shadow-lg shadow-lab-500/20"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
          <p>¿No tienes cuenta? <a href="/contacto" className="text-lab-600 font-bold hover:underline">Contáctanos</a></p>
        </div>
      </div>
    </div>
  );
};