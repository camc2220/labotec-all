import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const REFRESH_INTERVAL_MS = 30000

const getAppointmentsFromResponse = (response) =>
  response?.data?.items ?? response?.data?.Items ?? response?.data ?? []

const parseDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatTime = (value) => {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const formatDay = (value) => {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })
}

const resolvePatientName = (appointment) =>
  appointment?.patientName ??
  appointment?.patient?.name ??
  appointment?.patientFullName ??
  appointment?.patient?.fullName ??
  'Paciente sin nombre'

const resolveType = (appointment) => appointment?.type ?? 'Cita programada'

export default function NextTurnDisplay() {
  const { user } = useAuth()
  const [nextAppointment, setNextAppointment] = useState(null)
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
          params: { page: 1, pageSize: 100, sortDir: 'asc' },
        })
        const appointments = getAppointmentsFromResponse(response)
        const now = new Date()
        const upcoming = appointments
          .map((item) => ({ ...item, parsedDate: parseDate(item.scheduledAt) }))
          .filter((item) => item.parsedDate && item.parsedDate >= now)
          .sort((a, b) => a.parsedDate - b.parsedDate)?.[0]

        if (!cancelled) {
          setNextAppointment(upcoming ?? null)
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
                Actualización automática cada 30 segundos
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
          ) : nextAppointment ? (
            <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
              <div className="rounded-3xl bg-white/10 p-8 shadow-xl ring-1 ring-white/10">
                <p className="text-sm uppercase tracking-[0.14em] text-sky-200">Paciente</p>
                <h2 className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl">
                  {resolvePatientName(nextAppointment)}
                </h2>
                <p className="mt-3 text-lg text-slate-100">{resolveType(nextAppointment)}</p>
                {nextAppointment.notes && (
                  <p className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-100/90">{nextAppointment.notes}</p>
                )}
              </div>

              <div className="flex flex-col gap-4 rounded-3xl bg-white/5 p-6 shadow-lg ring-1 ring-white/10">
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-sky-200">Hora</p>
                  <p className="mt-1 text-3xl font-bold">{formatTime(nextAppointment.scheduledAt)}</p>
                  <p className="text-sm text-slate-200">{formatDay(nextAppointment.scheduledAt)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-sky-200">Estado</p>
                  <p className="mt-1 text-xl font-semibold">{nextAppointment.status || 'Confirmada'}</p>
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
