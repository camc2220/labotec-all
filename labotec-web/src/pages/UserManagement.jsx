import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import Table from '../components/Table'
import { useAuth } from '../context/AuthContext'
import { resolveEntityId } from '../lib/entity'

const ROLE_LABELS = {
  admin: 'Administrador',
  recepcion: 'Recepción',
  facturacion: 'Facturación',
  patient: 'Paciente',
}

const ROLE_OPTIONS = [
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'recepcion', label: ROLE_LABELS.recepcion },
  { value: 'facturacion', label: ROLE_LABELS.facturacion },
  { value: 'patient', label: ROLE_LABELS.patient },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

const normalizeRole = roles => {
  const list = Array.isArray(roles) ? roles : roles ? [roles] : []
  const normalized = list.map(r => (r ? r.toString().trim().toLowerCase() : ''))

  if (normalized.some(r => r === 'admin')) return 'admin'
  if (normalized.some(r => ['recepcion', 'recepción', 'recepcionista', 'reception'].includes(r))) return 'recepcion'
  if (normalized.some(r => ['facturacion', 'facturación', 'billing'].includes(r))) return 'facturacion'
  return 'patient'
}

const toApiRole = role => {
  if (role === 'admin') return 'Admin'
  if (role === 'recepcion') return 'Recepcion'
  if (role === 'facturacion') return 'Facturacion'
  return 'Paciente'
}

const resolveStatus = (isLocked, lockoutEnd) => {
  if (isLocked) return 'inactive'
  if (lockoutEnd) {
    const lockDate = new Date(lockoutEnd)
    if (!Number.isNaN(lockDate.valueOf()) && lockDate > new Date()) return 'inactive'
  }
  return 'active'
}

export default function UserManagement() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUser, setNewUser] = useState({ userName: '', email: '', role: 'patient', password: '' })
  const [updatingMap, setUpdatingMap] = useState({})
  const [resettingMap, setResettingMap] = useState({})
  const [deletingMap, setDeletingMap] = useState({})

  const resolveUserIdentifier = user => {
    if (!user) return undefined
    return (
      resolveEntityId(user) ??
      user.userId ??
      user.userID ??
      user.UserId ??
      user.UserID ??
      user.userName ??
      user.username ??
      user.email ??
      user.name
    )
  }

  const resolveUserName = user => {
    if (!user) return ''

    const composedName = [user.firstName ?? user.FirstName, user.lastName ?? user.LastName]
      .filter(Boolean)
      .join(' ')
      .trim()

    const candidates = [
      composedName,
      user.name,
      user.fullName,
      user.fullname,
      user.displayName,
      user.userName,
      user.username,
      user.email,
      resolveUserIdentifier(user),
    ]

    const resolved = candidates.find(value => typeof value === 'string' && value.trim().length > 0)
    return resolved?.trim() ?? 'Sin nombre'
  }

  const normalizeUsers = data => {
    if (!data) return []
    const rawUsers = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.Users)
          ? data.Users
          : Array.isArray(data?.results)
            ? data.results
            : []

    return rawUsers.map(item => {
      const role = normalizeRole(item.roles ?? item.Roles)
      const status = resolveStatus(item.isLocked ?? item.IsLocked, item.lockoutEnd ?? item.LockoutEnd)
      const name = resolveUserName(item)
      return { ...item, role, status, name }
    })
  }

  const fetchUsers = async () => {
    if (!isAdmin) return
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const res = await api.get('/api/users')
      setItems(normalizeUsers(res.data))
    } catch (err) {
      console.error(err)
      setError('No pudimos cargar los usuarios registrados. Intenta nuevamente más tarde.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [isAdmin])

  const updateLocalRole = (entityId, newRole) => {
    setItems(prev => prev.map(item => (resolveUserIdentifier(item) === entityId ? { ...item, role: newRole } : item)))
  }

  const updateLocalStatus = (entityId, newStatus) => {
    setItems(prev => prev.map(item => (resolveUserIdentifier(item) === entityId ? { ...item, status: newStatus } : item)))
  }

  const handleRoleChange = async (target, newRole) => {
    if (!isAdmin) return
    const entityId = resolveUserIdentifier(target)
    if (!entityId || target.role === newRole) return

    setError('')
    setSuccessMessage('')
    setUpdatingMap(prev => ({ ...prev, [entityId]: true }))
    const previousRole = target.role
    updateLocalRole(entityId, newRole)

    try {
      await api.put(`/api/users/${entityId}`, { roles: [toApiRole(newRole)] })
      setSuccessMessage('El rol del usuario se actualizó correctamente.')
    } catch (err) {
      console.error(err)
      updateLocalRole(entityId, previousRole)
      setError('No pudimos actualizar el rol. Intenta nuevamente más tarde.')
    } finally {
      setUpdatingMap(prev => {
        const copy = { ...prev }
        delete copy[entityId]
        return copy
      })
    }
  }

  const handleDeleteUser = async target => {
    if (!isAdmin) return
    const entityId = resolveUserIdentifier(target)
    if (!entityId) return

    const nameForConfirm = resolveUserName(target)
    const confirmed = window.confirm(`¿Eliminar al usuario "${nameForConfirm}"? Esta acción no se puede deshacer.`)
    if (!confirmed) return

    setError('')
    setSuccessMessage('')
    setDeletingMap(prev => ({ ...prev, [entityId]: true }))

    try {
      await api.delete(`/api/users/${entityId}`)
      setItems(prev => prev.filter(item => resolveUserIdentifier(item) !== entityId))
      setSuccessMessage('El usuario fue eliminado correctamente.')
    } catch (err) {
      console.error(err)
      setError('No pudimos eliminar al usuario. Intenta nuevamente más tarde.')
    } finally {
      setDeletingMap(prev => {
        const copy = { ...prev }
        delete copy[entityId]
        return copy
      })
    }
  }

  const handleCreateUser = async e => {
    e.preventDefault()
    if (!isAdmin || creating) return

    setError('')
    setSuccessMessage('')
    setCreating(true)

    const payload = {
      userName: newUser.userName.trim(),
      email: newUser.email.trim(),
      password: newUser.password.trim() || undefined,
      roles: [toApiRole(newUser.role)],
    }

    try {
      const res = await api.post('/api/users', payload)
      setItems(prev => [normalizeUsers([res.data])[0], ...prev])
      setSuccessMessage('Usuario creado correctamente.')
      setNewUser({ userName: '', email: '', role: 'patient', password: '' })
      setShowCreateForm(false)
    } catch (err) {
      console.error(err)
      setError('No pudimos crear al usuario. Verifica los datos e intenta nuevamente.')
    } finally {
      setCreating(false)
    }
  }

  const handleStatusChange = async (target, newStatus) => {
    if (!isAdmin) return
    const entityId = resolveUserIdentifier(target)
    if (!entityId || target.status === newStatus) return

    setError('')
    setSuccessMessage('')
    setUpdatingMap(prev => ({ ...prev, [entityId]: true }))
    const previousStatus = target.status
    updateLocalStatus(entityId, newStatus)

    try {
      await api.put(`/api/users/${entityId}`, { lockout: newStatus === 'inactive' })
      setSuccessMessage('El estado del usuario se actualizó correctamente.')
    } catch (err) {
      console.error(err)
      updateLocalStatus(entityId, previousStatus)
      setError('No pudimos actualizar el estado. Intenta nuevamente más tarde.')
    } finally {
      setUpdatingMap(prev => {
        const copy = { ...prev }
        delete copy[entityId]
        return copy
      })
    }
  }

  const handleResetPassword = async target => {
    if (!isAdmin) return
    const entityId = resolveUserIdentifier(target)
    if (!entityId) return

    setError('')
    setSuccessMessage('')
    setResettingMap(prev => ({ ...prev, [entityId]: true }))

    try {
      await api.post(`/api/users/${entityId}/reset-password`, {})
      setSuccessMessage('Contraseña restablecida a la clave genérica: Labotec1@')
    } catch (err) {
      console.error(err)
      setError('No pudimos restablecer la contraseña. Intenta nuevamente más tarde.')
    } finally {
      setResettingMap(prev => {
        const copy = { ...prev }
        delete copy[entityId]
        return copy
      })
    }
  }

  const columns = useMemo(() => {
    if (!isAdmin) return []
    return [
      { key: 'name', header: 'Nombre' },
      { key: 'email', header: 'Correo electrónico' },
      {
        key: 'role',
        header: 'Rol actual',
        render: row => (
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-1 text-xs text-sky-700">
            {ROLE_LABELS[row.role] ?? ROLE_LABELS.patient}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        render: row => (
          row.role === 'admin' ? (
            <span className="text-xs text-slate-500">—</span>
          ) : (
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${row.status === 'inactive' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {row.status === 'inactive' ? 'Inactivo' : 'Activo'}
            </span>
          )
        ),
      },
      {
        key: 'actions',
        header: 'Cambiar rol',
        render: row => {
          const entityId = resolveEntityId(row)
          const isUpdating = !!updatingMap[entityId]
          return (
            <select
              className="border rounded-lg px-2 py-1 text-sm"
              value={row.role}
              disabled={isUpdating}
              onChange={e => handleRoleChange(row, e.target.value)}
            >
              {ROLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )
        },
      },
      {
        key: 'statusActions',
        header: 'Cambiar estado',
        render: row => {
          if (row.role === 'admin') return <span className="text-xs text-slate-500">—</span>
          const entityId = resolveEntityId(row)
          const isUpdating = !!updatingMap[entityId]
          return (
            <select
              className="border rounded-lg px-2 py-1 text-sm"
              value={row.status ?? 'active'}
              disabled={isUpdating}
              onChange={e => handleStatusChange(row, e.target.value)}
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )
        },
      },
      {
        key: 'credentials',
        header: 'Credenciales',
        render: row => {
          if (row.role === 'admin') return <span className="text-xs text-slate-500">—</span>
          const entityId = resolveEntityId(row)
          const isResetting = !!resettingMap[entityId]
          return (
            <button
              className="text-xs font-semibold text-sky-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
              onClick={() => handleResetPassword(row)}
              disabled={isResetting}
            >
              {isResetting ? 'Restableciendo...' : 'Restablecer'}
            </button>
          )
        },
      },
      {
        key: 'delete',
        header: 'Eliminar',
        render: row => {
          if (row.role === 'admin') return <span className="text-xs text-slate-500">—</span>
          const entityId = resolveEntityId(row)
          const isDeleting = !!deletingMap[entityId]
          const isBusy = isDeleting || !!updatingMap[entityId] || !!resettingMap[entityId]
          return (
            <button
              className="text-xs font-semibold text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
              onClick={() => handleDeleteUser(row)}
              disabled={isBusy}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          )
        },
      },
    ]
  }, [isAdmin, resettingMap, updatingMap, deletingMap])

  const panelClass = 'rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm'

  if (!isAdmin) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl bg-white/70 px-6 py-5 shadow-sm ring-1 ring-slate-200/60">
          <h2 className="text-xl font-semibold text-gray-900">Gestión de usuarios</h2>
          <p className="mt-1 text-sm text-gray-600">Esta sección está disponible únicamente para administradores.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-5 text-white shadow-md">
        <p className="text-xs uppercase tracking-[0.15em] text-white/80">Administración</p>
        <h2 className="text-2xl font-semibold">Gestión de usuarios</h2>
        <p className="mt-1 text-sm text-white/80">Controla los roles y permisos con una interfaz consistente.</p>
      </div>

      <div className={panelClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Usuarios registrados</h3>
            <p className="text-sm text-gray-600">Actualiza los roles para garantizar el acceso correcto a cada módulo.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(prev => !prev)}
              className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
            >
              {showCreateForm ? 'Cerrar' : 'Agregar usuario'}
            </button>
            <button onClick={fetchUsers} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700" disabled={loading}>
              Actualizar lista
            </button>
          </div>
        </div>
        {showCreateForm && (
          <form onSubmit={handleCreateUser} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Nombre de usuario
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none"
                value={newUser.userName}
                onChange={e => setNewUser(prev => ({ ...prev, userName: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Correo electrónico
              <input
                type="email"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none"
                value={newUser.email}
                onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Contraseña inicial (opcional)
              <input
                type="password"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none"
                value={newUser.password}
                onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Se usará la genérica si se deja en blanco"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Rol
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none"
                value={newUser.role}
                onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}
              >
                {ROLE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewUser({ userName: '', email: '', role: 'patient', password: '' })
                  setError('')
                  setSuccessMessage('')
                }}
                disabled={creating}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                disabled={creating}
              >
                {creating ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        )}
        <div className="mt-4 space-y-3">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {successMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</div>}
          {loading ? (
            <div className="text-sm text-gray-600">Cargando usuarios...</div>
          ) : items.length > 0 ? (
            <Table columns={columns} data={items} rowKey={(row, idx) => resolveUserIdentifier(row) ?? idx} />
          ) : (
            <div className="text-sm text-gray-500">Aún no hay usuarios registrados.</div>
          )}
        </div>
      </div>
    </section>
  )
}
