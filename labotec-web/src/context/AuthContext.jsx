import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/api'

const STORAGE_KEY = 'auth:user'
const AuthContext = createContext(null)

function parseJwt(token) {
  if (!token) return null
  try {
    const [, payload] = token.split('.')
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(normalized)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function normalizeRole(rawRoles) {
  const roles = Array.isArray(rawRoles) ? rawRoles : rawRoles ? [rawRoles] : []
  if (roles.some(r => r && r.toLowerCase() === 'admin')) return 'admin'
  return 'patient'
}

function getUserFromToken(token, fallbackName) {
  const payload = parseJwt(token)
  if (!payload) return null

  const role = normalizeRole(payload.role)
  const patientId = payload.patientId ?? null
  const name = payload.unique_name || payload.sub || fallbackName || 'Usuario'

  return { name, role, patientId }
}

function normalizeUser(rawUser, fallbackName, token) {
  const tokenUser = getUserFromToken(token, fallbackName)
  const normalizedRole = rawUser?.role || tokenUser?.role || (fallbackName === 'admin' ? 'admin' : 'patient')

  return {
    name: rawUser?.name || tokenUser?.name || fallbackName || 'Usuario',
    role: normalizedRole,
    patientId: rawUser?.patientId ?? tokenUser?.patientId ?? null,
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
        setUser(normalizeUser(parsed, parsed?.name, token))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    } else if (token) {
      const tokenUser = getUserFromToken(token)
      if (tokenUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tokenUser))
        setUser(tokenUser)
      }
    }
    setLoading(false)
  }, [])

  const login = async (userName, password) => {
    const res = await api.post('/api/auth/login', { userName, password })
    if (!res.data?.token) throw new Error('Credenciales inválidas')

    localStorage.setItem('token', res.data.token)

    const normalized = normalizeUser(res.data?.user ?? {}, userName, res.data.token)
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
