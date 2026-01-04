import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { ACTIVE_QUEUE_STATUSES, normalizeStatus, toAllowedStatus } from '../lib/appointmentStatus'

const REFRESH_INTERVAL_MS = 5000
const SANTO_DOMINGO_TZ = 'America/Santo_Domingo'

const getAppointmentsFromResponse = (response) =>
  response?.data?.items ?? response?.data?.Items ?? response?.data ?? []

const parseDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const str = String(value ?? '').trim()
  if (!str) return null

  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(str)
  const isoNoTz = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/

  if (!hasTimezone && isoNoTz.test(str)) {
    const asUtc = new Date(`${str}Z`)
    if (!Number.isNaN(asUtc.getTime())) return asUtc
  }

  const date = new Date(str)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatTime = (value) => {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', timeZone: SANTO_DOMINGO_TZ })
}

const formatDay = (value) => {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('es-DO', { weekday: 'long', day: '2-digit', month: 'long', timeZone: SANTO_DOMINGO_TZ })
}

const resolvePatientName = (appointment) =>
  appointment?.patientName ??
  appointment?.patient?.name ??
  appointment?.patientFullName ??
  appointment?.patient?.fullName ??
  'Paciente sin nombre'

const resolveType = (appointment) => appointment?.type ?? 'Cita programada'

const resolveAppointmentId = (value) =>
  value?.id ?? value?.Id ?? value?.ID ?? value?.appointmentId ?? value?.AppointmentId ?? null

const normalizeAppointment = (raw) => {
  const scheduledAt =
    raw?.scheduledAt ?? raw?.ScheduledAt ?? raw?.dateTime ?? raw?.DateTime ?? raw?.appointmentAt ?? raw?.AppointmentAt ?? null

  const status = raw?.status ?? raw?.Status ?? raw?.appointmentStatus ?? raw?.AppointmentStatus ?? ''
  const normalizedStatus = toAllowedStatus(status) || normalizeStatus(status) || ''

  const patientName =
    raw?.patientName ??
    raw?.PatientName ??
    raw?.patient?.fullName ??
    raw?.patient?.FullName ??
    raw?.patient?.name ??
    raw?.patient?.Name ??
    raw?.Patient?.fullName ??
    raw?.Patient?.FullName ??
    raw?.Patient?.name ??
    raw?.Patient?.Name ??
    null

  const type =
    raw?.type ?? raw?.Type ?? raw?.appointmentType ?? raw?.AppointmentType ?? raw?.category ?? raw?.Category ?? 'Cita programada'

  return {
    ...raw,
    id: resolveAppointmentId(raw),
    patientName: patientName ?? raw?.patientName,
    scheduledAt,
    parsedDate: parseDate(scheduledAt),
    status: status || normalizedStatus,
    normalizedStatus,
    type,
    notes: raw?.notes ?? raw?.Notes ?? raw?.note ?? raw?.Note ?? '',
  }
}

export default function NextTurnDisplay() {
  const { user } = useAuth()
  const [currentAppointment, setCurrentAppointment] = useState(null)
  const [queueAppointments, setQueueAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const canProject = useMemo(
    () => Boolean(user?.isAdmin || user?.isRecepcion || user?.isBioanalista || user?.isFacturacion),
    [user],
  )

  useEffect(() => {
    if (!canProject) return undefined

    let cancelled = false

    const loadNextTurn = async () => {
      setError('')
      try {
        const response = await api.get('/api/appointments', {
          params: { page: 1, pageSize: 100, sortBy: 'ScheduledAt', sortDir: 'asc' },
        })
        const now = Date.now()
        const appointments = getAppointmentsFromResponse(response)
        const candidates = appointments
          .map((item) => normalizeAppointment(item))
          .filter((item) => item.parsedDate && ACTIVE_QUEUE_STATUSES.has(item.normalizedStatus))
          .sort((a, b) => a.parsedDate - b.parsedDate)

        const inProgress = candidates.filter((item) => item.normalizedStatus === 'InProgress')
        const current =
          inProgress[0] ?? candidates.find((item) => item.parsedDate.getTime() >= now) ?? candidates[0]
        const currentIndex = current ? candidates.findIndex((item) => item === current) : -1
        const queueStart = currentIndex >= 0 ? currentIndex + 1 : 0
        const queue = candidates.slice(queueStart, queueStart + 2)

        if (!cancelled) {
          setCurrentAppointment(current ?? null)
          setQueueAppointments(queue)
          setLastUpdated(new Date())
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setError('No pudimos cargar el próximo turno. Verifica tu conexión o inténtalo nuevamente.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadNextTurn()
    const intervalId = window.setInterval(loadNextTurn, REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [canProject])

  if (!canProject) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="max-w-xl rounded-3xl bg-white/10 px-10 py-12 text-center shadow-2xl shadow-sky-900/20 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.18em] text-sky-200">Pantalla de turnos</p>
          <h1 className="mt-3 text-3xl font-semibold">Solo disponible para el personal</h1>
          <p className="mt-2 text-sm text-slate-200/90">
            Inicia sesión con una cuenta de recepción, facturación, bioanálisis o administración para proyectar el próximo
            turno.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-900 via-slate-900 to-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.1),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.12),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(14,165,233,0.08),transparent_30%)]" />
      <div className="relative z-10 w-full max-w-5xl px-6 py-10 sm:px-10">
        <div className="flex flex-col gap-6 rounded-3xl bg-white/10 p-8 shadow-2xl shadow-sky-900/20 ring-1 ring-white/10 backdrop-blur-xl sm:p-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Pantalla de turnos</p>
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">Próximo turno</h1>
              <p className="mt-2 text-sm text-slate-200">Abre esta pestaña en pantalla completa para proyectarla en sala de espera.</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Actualización automática cada {REFRESH_INTERVAL_MS / 1000} segundos
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-300/40 bg-red-900/30 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center text-lg text-slate-200">Cargando turno...</div>
          ) : currentAppointment ? (
            <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
              <div className="rounded-3xl bg-white/10 p-8 shadow-xl ring-1 ring-white/10">
                <p className="text-sm uppercase tracking-[0.14em] text-sky-200">
                  {currentAppointment.normalizedStatus === 'InProgress' ? 'Turno en atención' : 'Próximo turno'}
                </p>
                <h2 className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl">
                  {resolvePatientName(currentAppointment)}
                </h2>
                <p className="mt-3 text-lg text-slate-100">{resolveType(currentAppointment)}</p>
                {currentAppointment.notes && (
                  <p className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-100/90">
                    {currentAppointment.notes}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-4 rounded-3xl bg-white/5 p-6 shadow-lg ring-1 ring-white/10">
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-sky-200">Hora</p>
                  <p className="mt-1 text-3xl font-bold">{formatTime(currentAppointment.scheduledAt)}</p>
                  <p className="text-sm text-slate-200">{formatDay(currentAppointment.scheduledAt)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-sky-200">Estado</p>
                  <p className="mt-1 text-xl font-semibold">{currentAppointment.status || 'Confirmada'}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-sky-200">En cola</p>
                  {queueAppointments.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm text-slate-100">
                      {queueAppointments.map((item) => (
                        <li key={`${item.id}-${item.scheduledAt}`} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{resolvePatientName(item)}</p>
                            <p className="text-xs text-slate-300">{resolveType(item)}</p>
                          </div>
                          <div className="text-right text-xs text-slate-200">
                            <p className="font-medium">{formatTime(item.scheduledAt)}</p>
                            <p className="text-slate-300">{item.normalizedStatus || item.status || 'Pendiente'}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-200/80">Solo queda este turno en la cola.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-slate-100">
              <p className="text-2xl font-semibold">No hay turnos próximos</p>
              <p className="text-sm text-slate-300">Las nuevas citas aparecerán aquí automáticamente en cuanto estén programadas.</p>
            </div>
          )}

          <div className="flex flex-col gap-2 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <p>Mantén la pestaña abierta para que el turno se actualice en tiempo real.</p>
            {lastUpdated && <p>Última actualización: {lastUpdated.toLocaleTimeString('es-ES')}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
