import React, { useEffect, useMemo, useState } from 'react'
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
  const isAdmin = user?.role === 'admin' || user?.isAdmin
  const canManageAppointments = isAdmin || user?.isRecepcion
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [availability, setAvailability] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')
  const defaultSlotsPerHour = 5
  const [availabilityForm, setAvailabilityForm] = useState({ id: null, day: '', time: '', slots: defaultSlotsPerHour })
  const [availabilitySaving, setAvailabilitySaving] = useState(false)
  const [formData, setFormData] = useState({
    patientId: '',
    scheduledAt: '',
    type: '',
    status: '',
    notes: '',
  })

  const isPatient = user?.role === 'patient'
  const canEditAppointments = canManageAppointments || isPatient
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

  useEffect(() => {
    if (isAdmin) {
      fetchAvailability()
    } else {
      setAvailability([])
    }
  }, [isAdmin, user])

  const openForm = item => {
    if (!canEditAppointments) return

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
    if (!canEditAppointments) return
    setSaving(true)
    setFormError('')
    try {
      const { day, time } = extractDayTimeFromDateTime(formData.scheduledAt)
      if (!day || !time) {
        setFormError('Debes seleccionar fecha y hora válidas.')
        return
      }

      const currentId = editingItem ? resolveEntityId(editingItem) : null
      const remainingSlots = getRemainingSlots(day, time, currentId)

      if (remainingSlots <= 0) {
        setFormError('No hay cupos disponibles para el horario seleccionado. Elige otra hora.')
        return
      }

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
    if (isPatient || !canManageAppointments) return
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

  const fetchAvailability = async () => {
    setAvailabilityLoading(true)
    setAvailabilityError('')
    try {
      const res = await api.get('/api/appointments/availability')
      setAvailability(res.data?.items ?? res.data?.Items ?? res.data ?? [])
    } catch (err) {
      console.error(err)
      setAvailabilityError('No pudimos cargar la disponibilidad. Intenta nuevamente más tarde.')
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const normalizeTime = value => (value ? value.slice(0, 5) : '')

  const normalizeDay = value => {
    if (!value) return ''
    if (value.includes('T')) {
      return value.split('T')[0]
    }
    return value
  }

  const extractDayTimeFromDateTime = value => {
    if (!value) return { day: '', time: '' }
    const [dayPart, timePart] = value.split('T')
    return { day: dayPart || '', time: normalizeTime(timePart || '') }
  }

  const normalizeAvailabilityPayload = form => ({
    day: form.day,
    time: normalizeTime(form.time),
    slots: Number(form.slots) || 0,
  })

  const handleAvailabilitySubmit = async e => {
    e.preventDefault()
    setAvailabilitySaving(true)
    setAvailabilityError('')
    try {
      if (!availabilityForm.day || !availabilityForm.time) {
        throw new Error('Debes completar el día y la hora.')
      }

      const payload = normalizeAvailabilityPayload(availabilityForm)

      const resourceUrl = availabilityForm.id
        ? `/api/appointments/availability/${availabilityForm.id}`
        : '/api/appointments/availability'

      if (availabilityForm.id) {
        await api.put(resourceUrl, payload)
      } else {
        await api.post(resourceUrl, payload)
      }

      setAvailabilityForm({ id: null, day: '', time: '', slots: defaultSlotsPerHour })
      fetchAvailability()
    } catch (err) {
      console.error(err)
      setAvailabilityError(
        err?.message || 'No pudimos guardar la disponibilidad. Revisa los datos e intenta nuevamente.',
      )
    } finally {
      setAvailabilitySaving(false)
    }
  }

  const handleAvailabilityEdit = slot => {
    setAvailabilityForm({
      id: resolveEntityId(slot),
      day: normalizeDay(slot.day || slot.date || slot.scheduledDay || slot.dateTime) || '',
      time: normalizeTime(slot.time || slot.hour || slot.scheduledTime || slot.dateTime) || '',
      slots: slot.slots ?? slot.availableSlots ?? slot.capacity ?? defaultSlotsPerHour,
    })
  }

  const getCapacityForSlot = (day, time) => {
    if (!day || !time) return defaultSlotsPerHour
    const slot = availability.find(
      entry => normalizeDay(entry.day || entry.date || entry.scheduledDay || entry.dateTime) === day &&
        normalizeTime(entry.time || entry.hour || entry.scheduledTime || entry.dateTime) === time,
    )

    const rawSlots = slot?.slots ?? slot?.availableSlots ?? slot?.capacity
    const parsedSlots = rawSlots === undefined ? undefined : Number(rawSlots)
    if (Number.isFinite(parsedSlots)) return parsedSlots
    return defaultSlotsPerHour
  }

  const getBookedCount = (day, time, excludeId) =>
    items.filter(item => {
      const { day: itemDay, time: itemTime } = extractDayTimeFromDateTime(item.scheduledAt)
      if (excludeId && resolveEntityId(item) === excludeId) return false
      return itemDay === day && itemTime === time
    }).length

  const getRemainingSlots = (day, time, excludeId) => {
    const capacity = getCapacityForSlot(day, time)
    const booked = getBookedCount(day, time, excludeId)
    return Math.max(capacity - booked, 0)
  }

  const formatDate = value => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatTime = value => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value.length > 5 ? value.slice(0, 5) : value
    }
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const appointmentColumns = useMemo(
    () => [
      ...(isPatient ? [] : [{ key: 'patientName', header: 'Paciente' }]),
      {
        key: 'scheduledDay',
        header: 'Día',
        render: row => formatDate(row.scheduledAt),
      },
      {
        key: 'scheduledTime',
        header: 'Hora',
        render: row => formatTime(row.scheduledAt),
      },
      { key: 'type', header: 'Tipo' },
      { key: 'status', header: 'Estado' },
      { key: 'notes', header: 'Notas' },
      ...(canEditAppointments
        ? [
            {
              key: 'actions',
              header: 'Acciones',
              render: row => (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openForm(row)} className="text-xs text-sky-700 hover:underline">
                    {isPatient ? 'Modificar' : 'Editar'}
                  </button>
                  {!isPatient && (
                    <button onClick={() => handleDelete(row)} className="text-xs text-red-600 hover:underline">
                      Eliminar
                    </button>
                  )}
                </div>
              ),
            },
          ]
        : []),
    ],
    [canEditAppointments, isPatient],
  )
  const panelClass = 'rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm'
  const calendarSubtitle = isPatient
    ? 'Consulta los detalles y horarios confirmados.'
    : canManageAppointments
      ? 'Crea, edita o elimina citas registradas.'
      : 'Consulta las citas programadas y su estado.'

  const currentSlot = extractDayTimeFromDateTime(formData.scheduledAt)
  const currentRemainingSlots = getRemainingSlots(
    currentSlot.day,
    currentSlot.time,
    editingItem ? resolveEntityId(editingItem) : null,
  )
  const currentCapacity = getCapacityForSlot(currentSlot.day, currentSlot.time)

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
            <p className="text-sm text-gray-600">{calendarSubtitle}</p>
          </div>
          {canEditAppointments && (
            <button
              onClick={() => openForm(null)}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              {isPatient ? 'Agendar cita' : 'Agregar cita'}
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {loading ? (
            <div className="text-sm text-gray-600">Cargando...</div>
          ) : items.length > 0 ? (
            <Table columns={appointmentColumns} data={items} />
          ) : (
            <div className="text-sm text-gray-500">{isPatient ? 'Aún no tienes citas programadas.' : 'No hay citas registradas.'}</div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className={panelClass}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Disponibilidad por día y hora</h3>
              <p className="text-sm text-gray-600">
                Ajusta los cupos disponibles para cada franja horaria y controla cuántas citas se pueden reservar.
              </p>
            </div>
          </div>

          <form onSubmit={handleAvailabilitySubmit} className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Día</label>
              <input
                type="date"
                value={availabilityForm.day}
                onChange={e => setAvailabilityForm({ ...availabilityForm, day: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Hora</label>
              <input
                type="time"
                value={availabilityForm.time}
                onChange={e => setAvailabilityForm({ ...availabilityForm, time: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Citas disponibles</label>
              <input
                type="number"
                min="0"
                value={availabilityForm.slots}
                onChange={e => setAvailabilityForm({ ...availabilityForm, slots: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>
            <div className="flex items-end justify-end gap-2">
                {availabilityForm.id && (
                  <button
                    type="button"
                    onClick={() => setAvailabilityForm({ id: null, day: '', time: '', slots: defaultSlotsPerHour })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-slate-50"
                  >
                    Cancelar edición
                  </button>
              )}
              <button
                type="submit"
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                disabled={availabilitySaving}
              >
                {availabilitySaving ? 'Guardando...' : availabilityForm.id ? 'Actualizar cupos' : 'Agregar disponibilidad'}
              </button>
            </div>
          </form>

          <div className="mt-4 space-y-3">
            {availabilityError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{availabilityError}</div>
            )}
            {availabilityLoading ? (
              <div className="text-sm text-gray-600">Cargando disponibilidad...</div>
            ) : availability.length > 0 ? (
              <Table
                columns={[
                  {
                    key: 'day',
                    header: 'Día',
                    render: row => formatDate(row.day || row.date || row.scheduledDay || row.dateTime),
                  },
                  {
                    key: 'time',
                    header: 'Hora',
                    render: row => formatTime(row.time || row.hour || row.scheduledTime || row.dateTime),
                  },
                  { key: 'slots', header: 'Citas disponibles', render: row => row.slots ?? row.availableSlots ?? row.capacity },
                  {
                    key: 'actions',
                    header: 'Acciones',
                    render: row => (
                      <button
                        onClick={() => handleAvailabilityEdit(row)}
                        className="text-xs font-semibold text-sky-700 hover:underline"
                      >
                        Editar cupos
                      </button>
                    ),
                  },
                ]}
                data={availability}
              />
            ) : (
              <div className="text-sm text-gray-500">Agrega cupos para comenzar a gestionar la disponibilidad.</div>
            )}
          </div>
        </div>
      )}

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
              <p className="mt-1 text-xs text-gray-600">
                Cupo base por hora: {currentCapacity}. Cupos restantes para este horario: {currentRemainingSlots}.
              </p>
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
