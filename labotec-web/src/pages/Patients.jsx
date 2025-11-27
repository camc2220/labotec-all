import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { resolveEntityId } from '../lib/entity'
import { useAuth } from '../context/AuthContext'

export default function Patients() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [creatingMap, setCreatingMap] = useState({})
  const [formData, setFormData] = useState({
    fullName: '',
    documentId: '',
    birthDate: '',
    email: '',
    phone: '',
    status: 'active',
  })

  const resetForm = () => {
    setFormData({ fullName: '', documentId: '', birthDate: '', email: '', phone: '', status: 'active' })
    setFormError('')
    setEditingItem(null)
  }

  const fetchData = async () => {
    if (user?.role !== 'admin') return
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const res = await api.get('/api/patients', { params: { q, page: 1, pageSize: 20, sortDir: 'asc' } })
      setItems(res.data.items ?? res.data.Items ?? [])
    } catch (err) {
      console.error(err)
      setError('No pudimos cargar la lista de pacientes. Intenta nuevamente más tarde.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [user?.role])

  const openForm = item => {
    if (item) {
      setFormData({
        fullName: item.fullName ?? '',
        documentId: item.documentId ?? '',
        birthDate: item.birthDate ? item.birthDate.slice(0, 10) : '',
        email: item.email ?? '',
        phone: item.phone ?? '',
        status: item.status ?? 'active',
      })
      setEditingItem(item)
    } else {
      resetForm()
    }
    setShowForm(true)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleFormSubmit = async e => {
    e.preventDefault()
    if (user?.role !== 'admin') return
    setFormError('')
    setSaving(true)
    try {
      const payload = { ...formData }
      if (editingItem) {
        await api.put(`/api/patients/${resolveEntityId(editingItem)}`, payload)
      } else {
        await api.post('/api/patients', payload)
      }
      closeForm()
      fetchData()
    } catch (err) {
      console.error(err)
      setFormError('No pudimos guardar la información del paciente. Revisa los datos e intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async item => {
    if (user?.role !== 'admin') return
    const id = resolveEntityId(item)
    if (!id) return
    if (!window.confirm('¿Seguro que deseas eliminar este paciente?')) return
    setError('')
    try {
      await api.delete(`/api/patients/${id}`)
      fetchData()
    } catch (err) {
      console.error(err)
      setError('No pudimos eliminar el paciente. Intenta nuevamente más tarde.')
    }
  }

  const hasUserAccount = patient => {
    if (!patient) return false
    return Boolean(patient.userId ?? patient.userID ?? patient.UserId ?? patient.UserID ?? patient.userName ?? patient.username)
  }

  const handleCreateUser = async patient => {
    if (user?.role !== 'admin') return
    const id = resolveEntityId(patient)
    if (!id || hasUserAccount(patient)) return

    setError('')
    setSuccessMessage('')
    setCreatingMap(prev => ({ ...prev, [id]: true }))

    try {
      const res = await api.post(`/api/patients/${id}/create-user`)
      const credentials = res.data
      const extra = credentials?.userName && credentials?.password
        ? ` (${credentials.userName} / ${credentials.password})`
        : ''
      setSuccessMessage(`Se creó el usuario del paciente correctamente${extra}.`)
      fetchData()
    } catch (err) {
      console.error(err)
      setError('No pudimos crear el usuario para este paciente. Intenta nuevamente más tarde.')
    } finally {
      setCreatingMap(prev => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
    }
  }

  const columns = [
    { key: 'fullName', header: 'Nombre' },
    { key: 'documentId', header: 'Documento' },
    { key: 'birthDate', header: 'Nacimiento' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Teléfono' },
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
      key: 'userStatus',
      header: 'Usuario',
      render: row => (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${hasUserAccount(row) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {hasUserAccount(row) ? 'Cuenta creada' : 'Sin usuario'}
        </span>
      ),
    },
    ...(user?.role === 'admin'
      ? [
        {
          key: 'actions',
          header: 'Acciones',
          render: row => (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => openForm(row)} className="text-xs text-sky-700 hover:underline">Editar</button>
              <button onClick={() => handleDelete(row)} className="text-xs text-red-600 hover:underline">Eliminar</button>
              {!hasUserAccount(row) && (
                <button
                  onClick={() => handleCreateUser(row)}
                  className="text-xs text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
                  disabled={!!creatingMap[resolveEntityId(row)]}
                >
                  {creatingMap[resolveEntityId(row)] ? 'Creando...' : 'Crear usuario'}
                </button>
              )}
            </div>
          ),
        },
      ]
      : []),
  ]
  const panelClass = 'rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm'

  if (user?.role !== 'admin') {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl bg-white/70 px-6 py-5 shadow-sm ring-1 ring-slate-200/60">
          <h2 className="text-xl font-semibold text-gray-900">Pacientes</h2>
          <p className="mt-1 text-sm text-gray-600">Esta sección está disponible únicamente para personal administrativo.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-5 text-white shadow-md">
        <p className="text-xs uppercase tracking-[0.15em] text-white/80">Administración</p>
        <h2 className="text-2xl font-semibold">Pacientes</h2>
        <p className="mt-1 text-sm text-white/80">Gestiona la información básica y los datos de contacto de cada paciente.</p>
      </div>

      <div className={panelClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Listado de pacientes</h3>
            <p className="text-sm text-gray-600">Filtra, crea o edita los perfiles registrados en LABOTEC.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
            <button onClick={fetchData} className="rounded-xl border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50">Buscar</button>
            <button onClick={() => openForm(null)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">Agregar paciente</button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {successMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</div>}
          {loading ? <div className="text-sm text-gray-600">Cargando...</div> : items.length > 0 ? <Table columns={columns} data={items} /> : <div className="text-sm text-gray-500">No encontramos pacientes para tu búsqueda.</div>}
        </div>
      </div>

      {showForm && (
        <Modal title={editingItem ? 'Editar paciente' : 'Agregar paciente'} onClose={closeForm}>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Nombre completo</label>
              <input
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Documento</label>
              <input
                value={formData.documentId}
                onChange={e => setFormData({ ...formData, documentId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Teléfono</label>
                <input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Estado</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Correo</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <p className="text-xs text-gray-500">El rol del paciente se asignará automáticamente como <strong>paciente</strong>.</p>
            {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}
