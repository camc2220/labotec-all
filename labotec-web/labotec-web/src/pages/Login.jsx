import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export default function Login() {
  const [userName, setUserName] = useState('admin')
  const [password, setPassword] = useState('Labotec1@')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(userName, password)
      const params = new URLSearchParams(location.search)
      const redirectTo = params.get('next') || '/app'
      navigate(redirectTo, { replace: true })
    }
    catch { setError('Credenciales inválidas o API no disponible') }
  }
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4">
      <div className="absolute inset-x-0 top-10 flex justify-center">
        <div className="h-32 w-32 rounded-full bg-sky-100 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-sky-100/60">
        <div className="mb-6 space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-lg font-semibold text-sky-700">L</div>
          <h1 className="text-xl font-semibold text-gray-900">Bienvenido a LABOTEC</h1>
          <p className="text-sm text-gray-600">Ingresa tus credenciales para acceder al portal</p>
        </div>
        {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Usuario</label>
            <input
              value={userName}
              onChange={e=>setUserName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              placeholder="Correo o nombre de usuario"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              placeholder="Ingresa tu contraseña"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700 hover:shadow-lg"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-sky-200 hover:bg-sky-50"
          >
            Volver al inicio
          </button>
        </form>
      </div>
    </div>
  )
}
