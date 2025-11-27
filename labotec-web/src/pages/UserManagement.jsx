import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import Table from '../components/Table'
import { useAuth } from '../context/AuthContext'
import { resolveEntityId } from '../lib/entity'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'patient', label: 'Paciente' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

export default function UserManagement() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [updatingMap, setUpdatingMap] = useState({})

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

  const normalizeUsers = data => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.items)) return data.items
    if (Array.isArray(data?.Users)) return data.Users
    if (Array.isArray(data?.results)) return data.results
    return []
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
      await api.put(`/api/users/${entityId}`, { role: newRole })
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
      await api.put(`/api/users/${entityId}`, { status: newStatus })
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
            {row.role === 'admin' ? 'Administrador' : 'Paciente'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        render: row => (
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${row.status === 'inactive' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {row.status === 'inactive' ? 'Inactivo' : 'Activo'}
          </span>
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
    ]
  }, [isAdmin, updatingMap])

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
          <button onClick={fetchUsers} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700" disabled={loading}>
            Actualizar lista
          </button>
        </div>
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
