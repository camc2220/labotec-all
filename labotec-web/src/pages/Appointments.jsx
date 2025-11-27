import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { resolveEntityId } from '../lib/entity'
import { useAuth } from '../context/AuthContext'
import PatientSelect from '../components/PatientSelect'

const typeOptions = [
  'Perfil completo de laboratorio',
  'Prueba de COVID-19',
  'Perfil tiroideo',
  'Panel prenatal',
  'Chequeo ejecutivo',
]

const statusOptions = ['Urgente', 'Rutinario', 'Normal']

export default function Appointments() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    patientId: '',
    scheduledAt: '',
    type: '',
    status: '',
    notes: '',
  })

  const isPatient = user?.role === 'patient'
  const endpoint = isPatient ? '/api/patients/me/appointments' : '/api/appointments'

  const availableTypeOptions = formData.type && !typeOptions.includes(formData.type)
    ? [formData.type, ...typeOptions]
    : typeOptions

  const availableStatusOptions = formData.status && !statusOptions.includes(formData.status)
    ? [formData.status, ...statusOptions]
    : statusOptions

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(endpoint, { params: { page: 1, pageSize: 20, sortDir: isPatient ? 'asc' : 'desc' } })
      setItems(res.data.items ?? res.data.Items ?? [])
    } catch (err) {
      console.error(err)
      setError('No pudimos cargar las citas. Intenta nuevamente más tarde.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchData()
  }, [endpoint, user])

  const openForm = item => {
    if (item) {
      setFormData({
        patientId: item.patientId ?? user?.patientId ?? '',
        scheduledAt: item.scheduledAt ? item.scheduledAt.slice(0, 16) : '',
        type: item.type ?? '',
        status: item.status ?? '',
        notes: item.notes ?? '',
      })
      setEditingItem(item)
    } else {
      setFormData({
        patientId: user?.patientId ?? '',
        scheduledAt: '',
        type: '',
        status: '',
        notes: '',
      })
      setEditingItem(null)
    }
    setFormError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setFormError('')
    setEditingItem(null)
  }

  const handleFormSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        scheduledAt: formData.scheduledAt,
        type: formData.type,
        status: formData.status,
        notes: formData.notes,
      }

      if (!isPatient || formData.patientId) {
        payload.patientId = formData.patientId
      }

      const resourceUrl = editingItem
        ? `${endpoint}/${resolveEntityId(editingItem)}`
        : endpoint

      if (editingItem) {
        await api.put(resourceUrl, payload)
      } else {
        await api.post(resourceUrl, payload)
      }
      closeForm()
      fetchData()
    } catch (err) {
      console.error(err)
      setFormError('No pudimos guardar la cita. Revisa los datos e intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async item => {
    if (isPatient) return
    const id = resolveEntityId(item)
    if (!id) return
    if (!window.confirm('¿Eliminar esta cita?')) return
    try {
      await api.delete(`/api/appointments/${id}`)
      fetchData()
    } catch (err) {
      console.error(err)
      setError('No pudimos eliminar la cita.')
    }
  }

  const columns = [
    ...(isPatient ? [] : [{ key: 'patientName', header: 'Paciente' }]),
    { key: 'scheduledAt', header: 'Fecha/Hora' },
    { key: 'type', header: 'Tipo' },
    { key: 'status', header: 'Estado' },
    { key: 'notes', header: 'Notas' },
    {
      key: 'actions',
      header: 'Acciones',
      render: row => (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openForm(row)} className="text-xs text-sky-700 hover:underline">
            {isPatient ? 'Modificar' : 'Editar'}
          </button>
          {!isPatient && (
            <button onClick={() => handleDelete(row)} className="text-xs text-red-600 hover:underline">Eliminar</button>
          )}
        </div>
      ),
    },
  ]
  const panelClass = 'rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm'

  return (
    <section className="space-y-4">
      <div className={`rounded-2xl px-6 py-5 text-white shadow-md ${isPatient ? 'bg-gradient-to-r from-emerald-500 to-sky-500' : 'bg-gradient-to-r from-sky-600 to-sky-500'}`}>
        <p className="text-xs uppercase tracking-[0.15em] text-white/80">Citas</p>
        <h2 className="text-2xl font-semibold">{isPatient ? 'Mis citas' : 'Gestión de citas'}</h2>
        <p className="mt-1 text-sm text-white/80">Revisa el estado de las citas y coordina nuevas reservas cuando sea necesario.</p>
      </div>

      <div className={panelClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{isPatient ? 'Historial de citas' : 'Calendario de atención'}</h3>
            <p className="text-sm text-gray-600">{isPatient ? 'Consulta los detalles y horarios confirmados.' : 'Crea, edita o elimina citas registradas.'}</p>
          </div>
          <button
            onClick={() => openForm(null)}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            {isPatient ? 'Agendar cita' : 'Agregar cita'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {loading ? (
            <div className="text-sm text-gray-600">Cargando...</div>
          ) : items.length > 0 ? (
            <Table columns={columns} data={items} />
          ) : (
            <div className="text-sm text-gray-500">{isPatient ? 'Aún no tienes citas programadas.' : 'No hay citas registradas.'}</div>
          )}
        </div>
      </div>

      {showForm && (
        <Modal title={editingItem ? 'Editar cita' : 'Agregar cita'} onClose={closeForm}>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {!isPatient ? (
              <PatientSelect
                value={formData.patientId}
                onChange={patientId => setFormData({ ...formData, patientId })}
                required
              />
            ) : (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Paciente</label>
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">{user?.name || 'Yo mismo'}</p>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Fecha y hora</label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Tipo</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  required
                >
                  <option value="">Selecciona una opción</option>
                  {availableTypeOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Estado</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  required
                >
                  <option value="">Selecciona una opción</option>
                  {availableStatusOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Notas</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                rows={3}
              />
            </div>
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
