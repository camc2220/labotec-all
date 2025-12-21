/*import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
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
*/
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/api'

const STORAGE_KEY = 'auth:user'
const TOKEN_KEY = 'token'
const AuthContext = createContext(null)

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function parseJwt(token) {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    let payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    // padding base64
    const pad = payload.length % 4
    if (pad) payload += '='.repeat(4 - pad)

    const decoded = atob(payload)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function getRolesFromPayload(payload) {
  if (!payload) return []

  // .NET a veces usa diferentes keys para roles
  const possible = [
    payload.role,
    payload.roles,
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
  ]

  const flat = possible.flatMap(v => (Array.isArray(v) ? v : v ? [v] : []))
  return flat.filter(Boolean).map(r => normalizeText(r))
}

function pickPrimaryRole(roles) {
  // prioridad: admin > recepcion > facturacion > bioanalista > patient
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('recepcion') || roles.includes('recepcionista') || roles.includes('reception')) return 'recepcion'
  if (roles.includes('facturacion') || roles.includes('billing')) return 'facturacion'
  if (roles.includes('bioanalista') || roles.includes('bio-analista') || roles.includes('bio analyst')) return 'bioanalista'
  if (roles.includes('paciente') || roles.includes('patient')) return 'patient'
  return 'patient'
}

function getUserFromToken(token, fallbackName) {
  const payload = parseJwt(token)
  if (!payload) return null

  // exp viene en segundos (JWT)
  if (payload.exp && Date.now() >= Number(payload.exp) * 1000) {
    return null
  }

  const roles = getRolesFromPayload(payload)
  const role = pickPrimaryRole(roles)

  const patientId = payload.patientId ?? payload.PatientId ?? null
  const name =
    payload.unique_name ||
    payload.name ||
    payload.sub ||
    fallbackName ||
    'Usuario'

  const isAdmin = role === 'admin'
  const isRecepcion = role === 'recepcion'
  const isFacturacion = role === 'facturacion'
  const isBioanalista = role === 'bioanalista'
  const isPatient = role === 'patient'
  const isStaff = !isPatient

  return {
    name,
    role,
    roles,
    patientId,
    isAdmin,
    isRecepcion,
    isFacturacion,
    isBioanalista,
    isPatient,
    isStaff,
  }
}

function normalizeUser(rawUser, fallbackName, token) {
  const tokenUser = getUserFromToken(token, fallbackName)
  if (!tokenUser) return null

  // si backend te manda user.role, lo respetamos pero normalizado
  const rawRole = normalizeText(rawUser?.role)
  const mergedRoles = [
    ...new Set([...(tokenUser.roles || []), ...(rawRole ? [rawRole] : [])]),
  ]
  const role = pickPrimaryRole(mergedRoles)

  const isAdmin = role === 'admin'
  const isRecepcion = role === 'recepcion'
  const isFacturacion = role === 'facturacion'
  const isBioanalista = role === 'bioanalista'
  const isPatient = role === 'patient'
  const isStaff = !isPatient

  return {
    name: rawUser?.name || tokenUser.name || fallbackName || 'Usuario',
    role,
    roles: mergedRoles,
    patientId: rawUser?.patientId ?? tokenUser.patientId ?? null,
    isAdmin,
    isRecepcion,
    isFacturacion,
    isBioanalista,
    isPatient,
    isStaff,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const storedUser = localStorage.getItem(STORAGE_KEY)

    if (token) {
      // si hay user guardado, lo normalizamos contra el token
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser)
          const normalized = normalizeUser(parsed, parsed?.name, token)
          if (!normalized) {
            localStorage.removeItem(TOKEN_KEY)
            localStorage.removeItem(STORAGE_KEY)
            setUser(null)
          } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
            setUser(normalized)
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY)
          setUser(getUserFromToken(token) ?? null)
        }
      } else {
        const tokenUser = getUserFromToken(token)
        if (tokenUser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tokenUser))
          setUser(tokenUser)
        } else {
          localStorage.removeItem(TOKEN_KEY)
          setUser(null)
        }
      }
    }

    setLoading(false)
  }, [])

  const login = async (userName, password) => {
    const res = await api.post('/api/auth/login', { userName, password })
    if (!res.data?.token) throw new Error('Credenciales inválidas')

    localStorage.setItem(TOKEN_KEY, res.data.token)

    const normalized = normalizeUser(res.data?.user ?? {}, userName, res.data.token)
    if (!normalized) throw new Error('Token inválido/expirado')

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    setUser(normalized)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  const value = useMemo(() => ({ user, login, logout, loading }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
