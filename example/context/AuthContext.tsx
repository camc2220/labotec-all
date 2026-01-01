import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AuthResponse } from '../types';
import api from '../services/api';
import { API_CONFIG } from '../constants';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  demoLogin: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (userName: string, password: string) => {
    setIsLoading(true);
    try {
      // Backend expects { userName, password } in LoginDto
      const response = await api.post<AuthResponse>(API_CONFIG.endpoints.login, { userName, password });
      
      const { token, user: backendUser } = response.data;
      
      // Map backend user response to frontend User type
      const mappedUser: User = {
        id: backendUser.id,
        username: backendUser.name, // The backend usually returns the username here
        email: userName.includes('@') ? userName : '', // If they logged in with email, store it, otherwise empty for now
        fullName: backendUser.name, // Fallback to username if fullname isn't provided separately
        role: backendUser.role as UserRole,
        roles: backendUser.roles,
        patientId: backendUser.patientId
      };
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(mappedUser));
      setUser(mappedUser);
    } catch (error) {
      console.error("Login error", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = (role: UserRole) => {
    const mockUser: User = {
      id: '1',
      username: role === UserRole.Paciente ? 'juan.perez' : 'admin.lab',
      email: role === UserRole.Paciente ? 'paciente@labotec.com.do' : 'admin@labotec.com.do',
      fullName: role === UserRole.Paciente ? 'Juan Pérez' : 'Administrador Sistema',
      role: role,
      roles: [role],
      patientId: role === UserRole.Paciente ? 'guid-mock-patient' : undefined
    };
    localStorage.setItem('token', 'demo-jwt-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};