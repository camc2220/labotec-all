import React, { useEffect, useMemo, useState, useCallback } from 'react'
import api from '../lib/api'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { resolveEntityId } from '../lib/entity'
import { useAuth } from '../context/AuthContext'
import PatientSelect from '../components/PatientSelect'

const baseTypeOptions = [
  'Perfil completo de laboratorio',
  'Prueba de COVID-19',
  'Perfil tiroideo',
  'Panel prenatal',
  'Chequeo ejecutivo',
]

const baseStatusOptions = [
  'Scheduled',
  'CheckedIn',
  'InProgress',
  'Completed',
  'NoShow',
  'Canceled',
  'Cancelled',
  'Confirmed',
  'Pendiente',
  'Confirmada',
  'Atendida',
  'Cancelada',
  'Urgente',
  'Rutinario',
  'Normal',
]

const statusAlias = {
  scheduled: 'Scheduled',
  pendiente: 'Scheduled',
  confirmed: 'Scheduled',
  confirmada: 'Scheduled',
  checkin: 'CheckedIn',
  'check-in': 'CheckedIn',
  checkedin: 'CheckedIn',
  enprogreso: 'InProgress',
  inprogress: 'InProgress',
  atendiendo: 'InProgress',
  atendida: 'Completed',
  completed: 'Completed',
  completada: 'Completed',
  cancelada: 'Canceled',
  cancelled: 'Canceled',
  canceled: 'Canceled',
  noshow: 'NoShow',
  'no_show': 'NoShow',
}

const STATUS_FLOW = ['Scheduled', 'CheckedIn', 'InProgress', 'Completed']
const ACTIVE_QUEUE_STATUSES = new Set(['Scheduled', 'CheckedIn', 'InProgress'])

const normalizeStatus = (value) => {
  if (!value) return ''
  const key = String(value).replace(/\s+/g, '').toLowerCase()
  return statusAlias[key] ?? value
}

const getNextStatus = (value) => {
  const current = normalizeStatus(value) || 'Scheduled'
  const idx = STATUS_FLOW.indexOf(current)
  if (idx === -1) return STATUS_FLOW[0]
  if (idx >= STATUS_FLOW.length - 1) return STATUS_FLOW[idx]
  return STATUS_FLOW[idx + 1]
}

// ✅ Horas permitidas (sin 12:00 Lun–Vie)
const WEEKDAY_HOURS = [8, 9, 10, 11, 13, 14, 15, 16] // 08–17, bloquea 12, último turno 16:00
const SAT_HOURS = [8, 9, 10, 11] // 08–12, último turno 11:00

function pad2(n) {
  return String(n).padStart(2, '0')
}

function buildDayString(y, m, d) {
  if (![y, m, d].every((x) => Number.isFinite(x))) return ''
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`
}

function getTodayDayString() {
  const now = new Date()
  return buildDayString(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

function getDowFromDateString(dateStr) {
  // dateStr: "YYYY-MM-DD"
  const [y, m, d] = String(dateStr).split('-').map(Number)
  if (![y, m, d].every((x) => Number.isFinite(x))) return null
  return new Date(y, m - 1, d).getDay() // 0=Dom, 6=Sáb (local)
}

function getHoursForDate(dateStr) {
  if (!dateStr) return []
  const dow = getDowFromDateString(dateStr)
  if (dow === null) return []
  if (dow === 0) return [] // domingo cerrado
  if (dow === 6) return SAT_HOURS
  return WEEKDAY_HOURS
}

function buildScheduledAt(dateStr, hour) {
  // Enviar como string sin timezone: "YYYY-MM-DDTHH:00:00"
  if (!dateStr || hour == null) return ''
  return `${dateStr}T${pad2(hour)}:00:00`
}

function buildLocalDateFromDayHour(dayStr, hour) {
  if (!dayStr || hour == null) return null
  const [y, m, d] = String(dayStr).split('-').map(Number)
  if (![y, m, d].every((x) => Number.isFinite(x))) return null
  return new Date(y, m - 1, d, Number(hour), 0, 0, 0)
}

function extractLocalDayHour(value) {
  if (!value) return { day: '', hour: null }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { day: '', hour: null }
  const day = buildDayString(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const hour = d.getHours()
  return { day, hour }
}

function getApiMessage(err, fallback) {
  return err?.response?.data?.message || err?.response?.data?.Message || err?.message || fallback
}

function formatDate(value) {
  if (!value) return '-'

  const parseDateOnly = (str) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim())
    if (!match) return null
    const [_, y, m, d] = match.map(Number)
    if (![y, m, d].every(Number.isFinite)) return null
    const local = new Date(y, m - 1, d, 12, 0, 0, 0) // mediodía para evitar TZ anteriores
    return Number.isNaN(local.getTime()) ? null : local
  }

  let dateObj = null

  if (typeof value === 'string') {
    dateObj = parseDateOnly(value)
  }

  if (!dateObj) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
    dateObj = d
  }

  return dateObj.toLocaleDateString('es-DO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(11, 16)
  return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
}

// ✅ Reglas de horario + BLOQUEO 12:00 Lun–Vie
function isWithinBusinessHours(dateObj) {
  if (!dateObj) return { ok: false, reason: 'Fecha/hora inválida.' }

  const dayOfWeek = dateObj.getDay() // 0 dom, 6 sáb
  const hh = dateObj.getHours()

  // Domingo cerrado
  if (dayOfWeek === 0) return { ok: false, reason: 'Domingo no laborable.' }

  // Sábado: 08:00 - 12:00 (12 no permitido)
  if (dayOfWeek === 6) {
    if (hh < 8 || hh >= 12) return { ok: false, reason: 'Sábado: horario disponible de 08:00 a 12:00.' }
    return { ok: true, reason: '' }
  }

  // Lun–Vie: 08:00 - 17:00, pero 12:00 bloqueado
  if (hh < 8 || hh >= 17) return { ok: false, reason: 'Lun–Vie: horario disponible de 08:00 a 17:00.' }
  if (hh === 12) return { ok: false, reason: 'Las 12:00pm están bloqueadas. Elige otra hora.' }
  return { ok: true, reason: '' }
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function normalizeDayString(value, fallback = '') {
  if (!value) return fallback
  const [y, m, d] = String(value).split('-').map(Number)
  if (![y, m, d].every((x) => Number.isFinite(x))) return fallback
  return buildDayString(y, m, d)
}

function shiftDay(dayStr, delta) {
  const normalized = normalizeDayString(dayStr, getTodayDayString())
  const [y, m, d] = normalized.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  base.setDate(base.getDate() + delta)
  return buildDayString(base.getFullYear(), base.getMonth() + 1, base.getDate())
}

// ✅ Normaliza citas de API a un formato estable (camelCase)
function normalizeAppointment(raw) {
  const id = resolveEntityId(raw)
  const scheduledAt =
    raw?.scheduledAt ??
    raw?.ScheduledAt ??
    raw?.dateTime ??
    raw?.DateTime ??
    raw?.appointmentAt ??
    raw?.AppointmentAt ??
    null

  const patientId =
    raw?.patientId ??
    raw?.PatientId ??
    raw?.patient?.id ??
    raw?.patient?.Id ??
    raw?.Patient?.Id ??
    raw?.Patient?.id ??
    null

  const patientName =
    raw?.patientName ??
    raw?.PatientName ??
    raw?.patient?.fullName ??
    raw?.patient?.FullName ??
    raw?.patient?.name ??
    raw?.patient?.Name ??
    raw?.Patient?.FullName ??
    raw?.Patient?.Name ??
    raw?.Patient?.fullName ??
    null

  return {
    id,
    patientId: patientId ?? '',
    patientName: patientName ?? '',
    scheduledAt: scheduledAt ?? '',
    type: raw?.type ?? raw?.Type ?? '',
    status: raw?.status ?? raw?.Status ?? '',
    notes: raw?.notes ?? raw?.Notes ?? '',
    _raw: raw,
  }
}

// ✅ Normaliza disponibilidad
function normalizeAvailability(raw, defaultSlotsPerHour) {
  const dayRaw =
    raw?.day ?? raw?.Day ?? raw?.date ?? raw?.Date ?? raw?.scheduledDay ?? raw?.ScheduledDay ?? raw?.dateTime ?? raw?.DateTime ?? ''

  const timeRaw =
    raw?.time ?? raw?.Time ?? raw?.hour ?? raw?.Hour ?? raw?.scheduledTime ?? raw?.ScheduledTime ?? raw?.dateTime ?? raw?.DateTime ?? ''

  const day = String(dayRaw).includes('T') ? String(dayRaw).split('T')[0] : String(dayRaw).slice(0, 10)

  let time = ''
  const str = String(timeRaw || '')
  if (str.includes('T')) {
    const d = new Date(str)
    if (!Number.isNaN(d.getTime())) time = `${pad2(d.getHours())}:00`
  } else if (str) {
    const [hh] = str.split(':')
    time = `${pad2(Number(hh))}:00`
  }

  const id = resolveEntityId(raw)

  const toNumber = (value) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  const capacity =
    toNumber(raw?.slots ?? raw?.Slots ?? raw?.capacity ?? raw?.Capacity) ??
    defaultSlotsPerHour

  const availableSlots =
    toNumber(raw?.availableSlots ?? raw?.AvailableSlots ?? raw?.remaining ?? raw?.Remaining ?? raw?.available ?? raw?.Available) ??
    capacity

  const isCustomFlag = raw?.isCustom ?? raw?.IsCustom
  const isCustom = typeof isCustomFlag === 'boolean' ? isCustomFlag : Boolean(id)

  return {
    id,
    day,
    time,
    slots: capacity,
    capacity,
    availableSlots,
    isCustom,
  }
}

export default function Appointments() {
  const { user } = useAuth()

  const isAdmin = user?.isAdmin || user?.role === 'admin'
  const canManageAppointments = isAdmin || user?.isRecepcion
  const isPatient = user?.role === 'patient' || user?.isPatient
  const canEditAppointments = canManageAppointments || isPatient

  const endpoint = isPatient ? '/api/patients/me/appointments' : '/api/appointments'

  // ✅ Por defecto: 10 cupos por hora (backend manda el real, esto es para UI)
  const defaultSlotsPerHour = 10

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
  const [availabilityForm, setAvailabilityForm] = useState({ id: null, day: '', time: '', slots: defaultSlotsPerHour })
  const [availabilitySaving, setAvailabilitySaving] = useState(false)

  // inline status change
  const [statusSavingId, setStatusSavingId] = useState(null)
  const [statusError, setStatusError] = useState('')

  const [selectedDay, setSelectedDay] = useState(() => getTodayDayString())

  const appointmentsForSelectedDay = useMemo(() => {
    const normalizedDay = normalizeDayString(selectedDay, '')
    if (!normalizedDay) return items

    return items.filter((it) => {
      const { day } = extractLocalDayHour(it.scheduledAt)
      return day === normalizedDay
    })
  }, [items, selectedDay])

  const availabilityForSelectedDay = useMemo(() => {
    const normalizedDay = normalizeDayString(selectedDay, '')
    if (!normalizedDay) return availability
    return availability.filter((slot) => normalizeDayString(slot.day, '') === normalizedDay)
  }, [availability, selectedDay])

  const nextAppointment = useMemo(() => {
    if (!canManageAppointments) return null

    const candidates = appointmentsForSelectedDay
      .map((it) => {
        const parsed = new Date(it.scheduledAt)
        return {
          ...it,
          _date: Number.isNaN(parsed.getTime()) ? null : parsed,
          status: normalizeStatus(it.status) || it.status,
        }
      })
      .filter((it) => it._date && ACTIVE_QUEUE_STATUSES.has(normalizeStatus(it.status)))
      .sort((a, b) => a._date - b._date)

    if (!candidates.length) return null

    const now = Date.now()
    const future = candidates.find((it) => it._date.getTime() >= now)
    const pick = future || candidates[0]
    return { ...pick, status: normalizeStatus(pick.status) || pick.status }
  }, [appointmentsForSelectedDay, canManageAppointments])

  // ✅ Nuevo: guardamos DÍA + HORA (sin minutos)
  const [formData, setFormData] = useState({
    patientId: '',
    day: '',
    hour: null, // number
    type: '',
    status: '',
    notes: '',
  })

  // ✅ opciones sacadas de data + defaults
  const typeOptions = useMemo(() => {
    const fromData = items.map((x) => x.type).filter(Boolean)
    const set = new Set([...fromData, ...baseTypeOptions])
    return Array.from(set)
  }, [items])

  const statusOptions = useMemo(() => {
    const fromData = items
      .map((x) => normalizeStatus(x.status) || x.status)
      .filter(Boolean)
    const set = new Set([...fromData, ...baseStatusOptions])
    return Array.from(set)
  }, [items])

  const availableTypeOptions = formData.type && !typeOptions.includes(formData.type)
    ? [formData.type, ...typeOptions]
    : typeOptions

  const availableStatusOptions = formData.status && !statusOptions.includes(formData.status)
    ? [formData.status, ...statusOptions]
    : statusOptions

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')

    try {
      const res = await api.get(endpoint, {
        params: { page: 1, pageSize: isPatient ? 200 : 500, sortDir: isPatient ? 'asc' : 'desc' },
      })
      const data = res.data
      const list = data?.items ?? data?.Items ?? (Array.isArray(data) ? data : [])
      setItems(list.map(normalizeAppointment))
    } catch (err) {
      console.error(err)
      setError(getApiMessage(err, 'No pudimos cargar las citas. Intenta nuevamente más tarde.'))
    } finally {
      setLoading(false)
    }
  }, [endpoint, isPatient, user])

  useEffect(() => {
    if (user) fetchData()
  }, [fetchData, user])

  const fetchAvailability = useCallback(async () => {
    setAvailabilityLoading(true)
    setAvailabilityError('')

    try {
      const res = await api.get('/api/appointments/availability')
      const list = res.data?.items ?? res.data?.Items ?? (Array.isArray(res.data) ? res.data : [])
      setAvailability(list.map((x) => normalizeAvailability(x, defaultSlotsPerHour)))
    } catch (err) {
      console.error(err)
      setAvailabilityError(getApiMessage(err, 'No pudimos cargar la disponibilidad. Intenta nuevamente más tarde.'))
    } finally {
      setAvailabilityLoading(false)
    }
  }, [defaultSlotsPerHour])

  useEffect(() => {
    if (isAdmin) fetchAvailability()
    else setAvailability([])
  }, [fetchAvailability, isAdmin])

  const openForm = (item) => {
    if (!canEditAppointments) return

    if (item) {
      const { day, hour } = extractLocalDayHour(item.scheduledAt)
      setFormData({
        patientId: item.patientId || user?.patientId || '',
        day,
        hour,
        type: item.type || '',
        status: item.status || '', // solo se usa en update staff
        notes: item.notes || '',
      })
      setEditingItem(item)
    } else {
      setFormData({
        patientId: user?.patientId || '',
        day: '',
        hour: null,
        type: '',
        status: 'Scheduled', // staff create: default; paciente lo ignoramos
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

  const parseNumber = (value) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  const findAvailabilitySlot = (day, hourStr) => {
    if (!day || !hourStr) return null
    return availability.find((entry) => entry.day === day && entry.time === hourStr) || null
  }

  const getCapacityForSlot = (day, hourStr) => {
    const slot = findAvailabilitySlot(day, hourStr)
    const n = slot?.capacity ?? slot?.slots ?? slot?.availableSlots
    return parseNumber(n) ?? defaultSlotsPerHour
  }

  const matchesDayAndHour = (scheduledAt, day, hourStr) => {
    const d = new Date(scheduledAt)
    if (Number.isNaN(d.getTime())) return false
    const itDay = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    const itHour = `${pad2(d.getHours())}:00`
    return itDay === day && itHour === hourStr
  }

  const getBookedCount = (day, hourStr, excludeId) =>
    items.filter((it) => {
      if (excludeId && it.id === excludeId) return false
      return matchesDayAndHour(it.scheduledAt, day, hourStr)
    }).length

  const getRemainingSlots = (day, hourStr, excludeId) => {
    const slot = findAvailabilitySlot(day, hourStr)
    if (slot) {
      const fromApi = parseNumber(slot.availableSlots)
      if (fromApi != null) {
        let remaining = fromApi
        if (excludeId && items.some((it) => it.id === excludeId && matchesDayAndHour(it.scheduledAt, day, hourStr))) {
          remaining += 1
        }
        return Math.max(remaining, 0)
      }
    }

    const cap = getCapacityForSlot(day, hourStr)
    const booked = getBookedCount(day, hourStr, excludeId)
    return Math.max(cap - booked, 0)
  }

  const currentDateObj = buildLocalDateFromDayHour(formData.day, formData.hour)
  const currentHourStr = formData.hour == null ? '' : `${pad2(formData.hour)}:00`
  const currentId = editingItem ? editingItem.id : null
  const currentCapacity = formData.day && currentHourStr ? getCapacityForSlot(formData.day, currentHourStr) : defaultSlotsPerHour
  const currentRemaining = formData.day && currentHourStr ? getRemainingSlots(formData.day, currentHourStr, currentId) : null

  const hoursForSelectedDay = useMemo(() => getHoursForDate(formData.day), [formData.day])

  useEffect(() => {
    // si cambias el día y la hora ya no aplica, límpiala
    if (formData.hour != null && !hoursForSelectedDay.includes(formData.hour)) {
      setFormData((prev) => ({ ...prev, hour: null }))
    }
  }, [hoursForSelectedDay, formData.hour])

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!canEditAppointments) return

    setSaving(true)
    setFormError('')

    try {
      const dt = buildLocalDateFromDayHour(formData.day, formData.hour)
      if (!dt) {
        setFormError('Debes seleccionar un día y una hora válidos.')
        return
      }

      // ✅ 1) horario laboral + bloqueo 12
      const hoursCheck = isWithinBusinessHours(dt)
      if (!hoursCheck.ok) {
        setFormError(hoursCheck.reason)
        return
      }

      // ✅ 2) regla paciente: después de 12pm no agenda para hoy
      if (isPatient) {
        const now = new Date()
        const afterNoon = now.getHours() >= 12
        if (afterNoon && isSameLocalDay(now, dt)) {
          setFormError('Después de las 12:00pm no se permiten citas para el mismo día. Elige otra fecha.')
          return
        }
      }

      // ✅ 3) capacidad por hora (front-check aproximado)
      const remaining = getRemainingSlots(formData.day, `${pad2(formData.hour)}:00`, currentId)
      if (remaining <= 0) {
        setFormError('No hay cupos disponibles para esa hora. Elige otra.')
        return
      }

      const scheduledAt = buildScheduledAt(formData.day, formData.hour)

      // ✅ payload
      const payload = {
        scheduledAt,
        type: String(formData.type || '').trim(),
        notes: String(formData.notes || '').trim(),
      }

      // staff create/update necesita patientId (create) y status (update)
      if (!isPatient && formData.patientId) payload.patientId = formData.patientId

      const id = editingItem?.id
      const resourceUrl = id ? `${endpoint}/${id}` : endpoint

      if (id) {
        // update: staff requiere status; paciente no
        if (!isPatient) {
          const st = String(formData.status || '').trim()
          if (!st) {
            setFormError('Selecciona un estado.')
            return
          }
          payload.status = st
        }
        await api.put(resourceUrl, payload)
      } else {
        // create: no enviamos status (backend lo pone Scheduled)
        await api.post(resourceUrl, payload)
      }

      closeForm()
      fetchData()
    } catch (err) {
      console.error(err)
      setFormError(getApiMessage(err, 'No pudimos guardar la cita. Revisa los datos e intenta nuevamente.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (isPatient || !canManageAppointments) return
    const id = item?.id
    if (!id) return
    if (!window.confirm('¿Eliminar esta cita?')) return

    try {
      await api.delete(`/api/appointments/${id}`)
      fetchData()
    } catch (err) {
      console.error(err)
      setError(getApiMessage(err, 'No pudimos eliminar la cita.'))
    }
  }

  // ✅ Cambio rápido de estado (solo Admin/Recepción)
  const handleQuickStatusChange = async (row, newStatus) => {
    if (!canManageAppointments || isPatient) return
    if (!row?.id) return

    const statusToSend = normalizeStatus(newStatus) || String(newStatus || '').trim()
    if (!statusToSend) {
      setStatusError('Selecciona un estado válido.')
      return
    }

    setStatusSavingId(row.id)
    setStatusError('')

    try {
      const { day, hour } = extractLocalDayHour(row.scheduledAt)
      const scheduledAt = buildScheduledAt(day, hour) || row.scheduledAt

      const payload = {
        scheduledAt,
        type: String(row.type || '').trim(),
        status: statusToSend,
        notes: String(row.notes || '').trim(),
        patientId: row.patientId || null,
      }

      await api.put(`/api/appointments/${row.id}`, payload)

      setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, status: payload.status } : x)))
    } catch (err) {
      console.error(err)
      setStatusError(getApiMessage(err, 'No pudimos cambiar el estado.'))
    } finally {
      setStatusSavingId(null)
    }
  }

  const handleAvailabilitySubmit = async (e) => {
    e.preventDefault()
    setAvailabilitySaving(true)
    setAvailabilityError('')

    try {
      if (!availabilityForm.day || !availabilityForm.time) {
        throw new Error('Debes completar el día y la hora.')
      }

      const payload = {
        day: availabilityForm.day,
        time: availabilityForm.time, // "HH:00"
        slots: Number(availabilityForm.slots) || 0,
      }

      const resourceUrl = availabilityForm.id
        ? `/api/appointments/availability/${availabilityForm.id}`
        : '/api/appointments/availability'

      if (availabilityForm.id) await api.put(resourceUrl, payload)
      else await api.post(resourceUrl, payload)

      setAvailabilityForm({ id: null, day: '', time: '', slots: defaultSlotsPerHour })
      fetchAvailability()
    } catch (err) {
      console.error(err)
      setAvailabilityError(getApiMessage(err, 'No pudimos guardar la disponibilidad.'))
    } finally {
      setAvailabilitySaving(false)
    }
  }

  const handleAvailabilityEdit = (slot) => {
    setAvailabilityForm({
      id: slot.id,
      day: slot.day || '',
      time: slot.time || '',
      slots: Number(slot.capacity ?? slot.slots) || defaultSlotsPerHour,
    })
  }

  const availabilityHours = useMemo(() => getHoursForDate(availabilityForm.day), [availabilityForm.day])

  useEffect(() => {
    // si cambias el día y la hora no aplica, límpiala
    if (!availabilityForm.day) return
    const currentHour = availabilityForm.time ? Number(String(availabilityForm.time).split(':')[0]) : null
    if (currentHour != null && !availabilityHours.includes(currentHour)) {
      setAvailabilityForm((prev) => ({ ...prev, time: '' }))
    }
  }, [availabilityHours, availabilityForm.day, availabilityForm.time])

  const appointmentColumns = useMemo(() => {
    return [
      ...(isPatient ? [] : [{ key: 'patientName', header: 'Paciente', render: (row) => row.patientName || '-' }]),
      { key: 'scheduledDay', header: 'Día', render: (row) => formatDate(row.scheduledAt) },
      { key: 'scheduledTime', header: 'Hora', render: (row) => formatTime(row.scheduledAt) },
      { key: 'type', header: 'Tipo', render: (row) => row.type || '-' },

      {
        key: 'status',
        header: 'Estado',
        render: (row) => {
          const disabled = !canManageAppointments || isPatient || statusSavingId === row.id
          const statusValue = normalizeStatus(row.status) || row.status || ''
          if (!canManageAppointments || isPatient) return statusValue || '-'

          return (
            <select
              value={statusValue}
              disabled={disabled}
              onChange={(e) => handleQuickStatusChange(row, e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              title="Cambiar estado"
            >
              <option value="">-</option>
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )
        },
      },

      { key: 'notes', header: 'Notas', render: (row) => row.notes || '-' },

      ...(canEditAppointments
        ? [{
          key: 'actions',
          header: 'Acciones',
          render: (row) => {
            const currentStatus = normalizeStatus(row.status) || 'Scheduled'
            const nextStatus = getNextStatus(currentStatus)
            const canAdvance = canManageAppointments && !isPatient && STATUS_FLOW.includes(currentStatus) && nextStatus !== currentStatus

            return (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => openForm(row)} className="text-xs text-sky-700 hover:underline">
                  {isPatient ? 'Modificar' : 'Editar'}
                </button>

                {canAdvance && (
                  <button
                    onClick={() => handleQuickStatusChange(row, nextStatus)}
                    className="text-xs text-emerald-700 hover:underline disabled:text-gray-400"
                    disabled={statusSavingId === row.id}
                    title={`Cambiar a ${nextStatus}`}
                  >
                    Pasar a {nextStatus}
                  </button>
                )}

                {!isPatient && canManageAppointments && (
                  <button onClick={() => handleDelete(row)} className="text-xs text-red-600 hover:underline">
                    Eliminar
                  </button>
                )}
              </div>
            )
          },
        }]
        : []),
    ]
  }, [canEditAppointments, canManageAppointments, isPatient, statusOptions, statusSavingId])

  const panelClass = 'rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm'
  const calendarSubtitle = isPatient
    ? 'Consulta los detalles y horarios confirmados.'
    : canManageAppointments
      ? 'Crea, edita o elimina citas registradas.'
      : 'Consulta las citas programadas y su estado.'

  return (
    <section className="space-y-4">
      <div className={`rounded-2xl px-6 py-5 text-white shadow-md ${isPatient ? 'bg-gradient-to-r from-emerald-500 to-sky-500' : 'bg-gradient-to-r from-sky-600 to-sky-500'}`}>
        <p className="text-xs uppercase tracking-[0.15em] text-white/80">Citas</p>
        <h2 className="text-2xl font-semibold">{isPatient ? 'Mis citas' : 'Gestión de citas'}</h2>
        <p className="mt-1 text-sm text-white/80">Revisa el estado de las citas y coordina nuevas reservas cuando sea necesario.</p>
      </div>

      {canManageAppointments && !isPatient && (
        <div className={panelClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Proximo turno</p>
              {nextAppointment ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {nextAppointment.patientName || 'Paciente sin nombre'}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {formatDate(nextAppointment.scheduledAt)} - {formatTime(nextAppointment.scheduledAt)} - {nextAppointment.type || 'Sin tipo'}
                  </p>
                  <p className="text-xs text-gray-500">Estado: {normalizeStatus(nextAppointment.status) || '-'}</p>
                </>
              ) : (
                <p className="text-sm text-gray-600">No hay turnos pendientes.</p>
              )}
            </div>

            {nextAppointment && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => handleQuickStatusChange(nextAppointment, 'CheckedIn')}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:opacity-60"
                  disabled={statusSavingId === nextAppointment.id}
                >
                  Marcar check-in
                </button>
                <button
                  onClick={() => handleQuickStatusChange(nextAppointment, 'InProgress')}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  disabled={statusSavingId === nextAppointment.id}
                >
                  Atender ahora
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
          <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDay((prev) => shiftDay(prev, -1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-slate-50"
              >
                Día anterior
              </button>
              <input
                type="date"
                value={normalizeDayString(selectedDay, '')}
                onChange={(e) => setSelectedDay(normalizeDayString(e.target.value, getTodayDayString()))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <button
                type="button"
                onClick={() => setSelectedDay((prev) => shiftDay(prev, 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-slate-50"
              >
                Siguiente día
              </button>
              <button
                type="button"
                onClick={() => setSelectedDay(getTodayDayString())}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-slate-50"
              >
                Hoy
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Mostrando citas del <span className="font-semibold text-gray-900">{formatDate(selectedDay)}</span>.
            </p>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {statusError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{statusError}</div>}

          {loading ? (
            <div className="text-sm text-gray-600">Cargando...</div>
          ) : appointmentsForSelectedDay.length > 0 ? (
            <Table columns={appointmentColumns} data={appointmentsForSelectedDay} />
          ) : (
            <div className="text-sm text-gray-500">
              {isPatient ? 'No tienes citas para este día.' : 'No hay citas registradas para este día.'}
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className={panelClass}>
          <h3 className="text-lg font-semibold text-gray-900">Disponibilidad por día y hora</h3>
          <p className="text-sm text-gray-600">
            Ajusta los cupos disponibles por franja horaria (por hora exacta, sin minutos).
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Mostrando disponibilidad del <span className="font-semibold text-gray-900">{formatDate(selectedDay)}</span>.
          </p>

          <form onSubmit={handleAvailabilitySubmit} className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Día</label>
              <input
                type="date"
                value={availabilityForm.day}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, day: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
              {availabilityForm.day && availabilityHours.length === 0 && (
                <p className="mt-1 text-xs text-red-600">Domingo cerrado.</p>
              )}
            </div>

            <div className="md:col-span-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Hora</label>

              {availabilityForm.day ? (
                availabilityHours.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {availabilityHours.map((h) => {
                      const key = `${pad2(h)}:00`
                      const selected = availabilityForm.time === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setAvailabilityForm({ ...availabilityForm, time: key })}
                          className={[
                            'rounded-xl border px-2 py-2 text-xs font-semibold shadow-sm',
                            selected ? 'bg-sky-600 text-white border-sky-600' : 'bg-white border-slate-200 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          {key}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mt-2">No hay horas disponibles para ese día.</div>
                )
              ) : (
                <div className="text-xs text-gray-500 mt-2">Elige un día para ver horas.</div>
              )}

              <p className="mt-1 text-xs text-gray-500">Se guarda como “HH:00”.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Citas disponibles</label>
              <input
                type="number"
                min="0"
                value={availabilityForm.slots}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, slots: e.target.value })}
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
            {availabilityError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{availabilityError}</div>}
            {availabilityLoading ? (
              <div className="text-sm text-gray-600">Cargando disponibilidad...</div>
            ) : availabilityForSelectedDay.length > 0 ? (
              <Table
                columns={[
                  { key: 'day', header: 'Día', render: (row) => formatDate(row.day) },
                  { key: 'time', header: 'Hora', render: (row) => row.time || '-' },
                  {
                    key: 'availableSlots',
                    header: 'Citas disponibles',
                    render: (row) => {
                      const available = parseNumber(row.availableSlots)
                      const capacity = parseNumber(row.capacity ?? row.slots)
                      if (available != null && capacity != null) return `${available} / ${capacity}`
                      return available ?? capacity ?? defaultSlotsPerHour
                    },
                  },
                  {
                    key: 'capacity',
                    header: 'Cupo base',
                    render: (row) => parseNumber(row.capacity ?? row.slots) ?? defaultSlotsPerHour,
                  },
                  {
                    key: 'isCustom',
                    header: 'Tipo',
                    render: (row) => (row.isCustom ? 'Personalizada' : 'Genérica'),
                  },
                  {
                    key: 'actions',
                    header: 'Acciones',
                    render: (row) => (
                      <button onClick={() => handleAvailabilityEdit(row)} className="text-xs font-semibold text-sky-700 hover:underline">
                        Editar cupos
                      </button>
                    ),
                  },
                ]}
                data={availabilityForSelectedDay}
              />
            ) : (
              <div className="text-sm text-gray-500">No hay cupos configurados para este día.</div>
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
                onChange={(patientId) => setFormData({ ...formData, patientId })}
                required
              />
            ) : (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Paciente</label>
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">
                  {user?.name || 'Yo mismo'}
                </p>
              </div>
            )}

            {/* ✅ Día */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Día</label>
              <input
                type="date"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
              {formData.day && hoursForSelectedDay.length === 0 && (
                <p className="mt-1 text-xs text-red-600">Domingo cerrado.</p>
              )}
            </div>

            {/* ✅ Hora (sin minutos) */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Hora</label>

              {formData.day ? (
                hoursForSelectedDay.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {hoursForSelectedDay.map((h) => {
                      const selected = formData.hour === h
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setFormData({ ...formData, hour: h })}
                          className={[
                            'rounded-xl border px-2 py-2 text-xs font-semibold shadow-sm',
                            selected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          {pad2(h)}:00
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No hay horas disponibles para ese día.</div>
                )
              ) : (
                <div className="text-xs text-gray-500">Elige un día para ver horas.</div>
              )}

              <p className="mt-2 text-xs text-gray-600">
                Cupo por hora: <b>{currentCapacity}</b>.{' '}
                Restantes:{' '}
                <b>{currentRemaining == null ? '-' : currentRemaining}</b>. <br />
                Horario: Lun–Vie 08:00–17:00 (12:00 bloqueada) | Sáb 08:00–12:00 | Dom cerrado.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  required
                >
                  <option value="">Selecciona una opción</option>
                  {availableTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* ✅ Estado SOLO para staff cuando edita */}
              {!isPatient && editingItem && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    required
                  >
                    <option value="">Selecciona una opción</option>
                    {availableStatusOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                rows={3}
              />
            </div>

            {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}
