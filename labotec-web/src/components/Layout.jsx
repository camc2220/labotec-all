import React, { useMemo } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function getRoleLabel(user) {
  if (!user) return ''
  if (user.isAdmin) return 'Administrador'
  if (user.isRecepcion) return 'Recepción'
  if (user.isFacturacion) return 'Facturación'
  if (user.isBioanalista) return 'Bioanalista'
  return 'Paciente'
}

export default function Layout() {
  const { user, logout } = useAuth()

  const isAdmin = user?.isAdmin
  const isRecepcion = user?.isRecepcion
  const isFacturacion = user?.isFacturacion
  const isBioanalista = user?.isBioanalista

  const canProjectTurn = isAdmin || isRecepcion || isFacturacion || isBioanalista

  const navigation = useMemo(() => {
    if (!user) return []

    if (isAdmin) {
      return [
        { to: '/app/users', label: 'Usuarios' },
        { to: '/app/patients', label: 'Pacientes' },
        { to: '/app/appointments', label: 'Citas' },
        { to: '/app/next-turn-display', label: 'Próximo turno' },
        { to: '/app/results', label: 'Resultados' },
        { to: '/app/lab-tests', label: 'Pruebas' },
        { to: '/app/invoices', label: 'Facturas' },
        { to: '/app/profile', label: 'Mi perfil' },
      ]
    }

    if (isRecepcion) {
      return [
        { to: '/app/appointments', label: 'Citas' },
        { to: '/app/patients', label: 'Pacientes' },
        { to: '/app/next-turn-display', label: 'Próximo turno' },
        { to: '/app/profile', label: 'Mi perfil' },
      ]
    }

    if (isFacturacion) {
      return [
        { to: '/app/lab-tests', label: 'Pruebas' },
        { to: '/app/invoices', label: 'Facturas' },
        { to: '/app/next-turn-display', label: 'Próximo turno' },
        { to: '/app/profile', label: 'Mi perfil' },
      ]
    }

    if (isBioanalista) {
      return [
        { to: '/app/patients', label: 'Pacientes' },
        { to: '/app/appointments', label: 'Citas' },
        { to: '/app/next-turn-display', label: 'Próximo turno' },
        { to: '/app/results', label: 'Resultados' },
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
      <header className="border-b border-blue-500/30 bg-blue-600 text-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 font-semibold text-white">L</span>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/80">Labotec</p>
              <p className="text-sm font-semibold text-white">Portal clínico</p>
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
                      ? 'border-white/50 bg-white/20 text-white shadow-sm backdrop-blur'
                      : 'border-white/10 text-white/90 hover:border-white/40 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-right">
            {canProjectTurn && (
              <button
                type="button"
                onClick={() => window.open('/app/next-turn-display', '_blank', 'noopener,noreferrer')}
                className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:border-white/60 hover:bg-white/20"
              >
                Proyectar turno
              </button>
            )}
            <div className="leading-tight text-xs text-white/80">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="capitalize">{roleLabel}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white transition hover:border-white/50 hover:bg-white/10"
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
