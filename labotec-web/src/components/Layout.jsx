import React, { useMemo } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function getRoleLabel(user) {
  if (!user) return ''
  if (user.isAdmin) return 'Administrador'
  if (user.isRecepcion) return 'Recepción'
  if (user.isFacturacion) return 'Facturación'
  return 'Paciente'
}

export default function Layout() {
  const { user, logout } = useAuth()

  const navigation = useMemo(() => {
    if (!user) return []

    if (user.isAdmin) {
      return [
        { to: '/app/users', label: 'Usuarios' },
        { to: '/app/patients', label: 'Pacientes' },
        { to: '/app/appointments', label: 'Citas' },
        { to: '/app/results', label: 'Resultados' },
        { to: '/app/invoices', label: 'Facturas' },
        { to: '/app/profile', label: 'Mi perfil' },
      ]
    }

    if (user.isRecepcion) {
      return [
        { to: '/app/appointments', label: 'Citas' },
        { to: '/app/patients', label: 'Pacientes' },
        { to: '/app/profile', label: 'Mi perfil' },
      ]
    }

    if (user.isFacturacion) {
      return [
        { to: '/app/invoices', label: 'Facturas' },
        { to: '/app/profile', label: 'Mi perfil' },
      ]
    }

    // patient
    return [
      { to: '/app/dashboard', label: 'Inicio' },
      { to: '/app/appointments', label: 'Mis citas' },
      { to: '/app/results', label: 'Mis resultados' },
      { to: '/app/invoices', label: 'Mis facturas' },
      { to: '/app/profile', label: 'Mi perfil' },
    ]
  }, [user])

  if (!user) return null

  const roleLabel = getRoleLabel(user)

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 text-gray-800">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sky-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 font-semibold">L</span>
            <div>
              <p className="text-xs uppercase tracking-widest">Labotec</p>
              <p className="text-sm font-semibold text-gray-900">Portal clínico</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 text-sm font-medium md:flex">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl border px-3 py-2 transition ${
                    isActive
                      ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sm'
                      : 'border-transparent text-gray-600 hover:border-sky-100 hover:bg-white hover:text-sky-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-right">
            <div className="leading-tight text-xs text-gray-500">
              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
              <p className="capitalize">{roleLabel}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t bg-white/90 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} LABOTEC
      </footer>
    </div>
  )
}
