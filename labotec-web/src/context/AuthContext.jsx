import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/api'

const STORAGE_KEY = 'auth:user'
const AuthContext = createContext(null)

function normalizeUser({ name, role, patientId }, fallbackName) {
  const normalizedRole = role || (fallbackName === 'admin' ? 'admin' : 'patient')
  return {
    name: name || fallbackName || 'Usuario',
    role: normalizedRole,
    patientId: patientId ?? null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem(STORAGE_KEY)
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        setUser(normalizeUser(parsed, parsed?.name))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  const login = async (userName, password) => {
    const res = await api.post('/api/auth/login', { userName, password })
    if (!res.data?.token) throw new Error('Credenciales inválidas')

    localStorage.setItem('token', res.data.token)

    const normalized = normalizeUser(res.data?.user ?? {}, userName)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    setUser(normalized)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  const value = useMemo(() => ({ user, login, logout, loading }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
