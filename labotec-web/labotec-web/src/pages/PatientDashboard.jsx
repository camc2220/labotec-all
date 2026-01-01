import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

function formatDate(value, { includeTime = true, ...options } = {}) {
  if (!value) return 'Sin información'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('es-ES', {
      dateStyle: 'long',
      ...(includeTime ? { timeStyle: 'short' } : {}),
      ...options,
    })
  } catch {
    return value
  }
}

export default function PatientDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState({ nextAppointment: null, recentResult: null, pendingInvoices: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSummary = async () => {
      if (!user || user.role !== 'patient') {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const [appointmentsRes, resultsRes, invoicesRes] = await Promise.all([
          api.get('/api/patients/me/appointments', { params: { page: 1, pageSize: 1, upcoming: true, sortDir: 'asc' } }),
          api.get('/api/patients/me/results', { params: { page: 1, pageSize: 1, sortDir: 'desc' } }),
          api.get('/api/patients/me/invoices', { params: { page: 1, pageSize: 10, paid: false } }),
        ])

        const appointments = appointmentsRes.data?.items ?? appointmentsRes.data?.Items ?? []
        const results = resultsRes.data?.items ?? resultsRes.data?.Items ?? []
        const invoices = invoicesRes.data?.items ?? invoicesRes.data?.Items ?? []

        setSummary({
          nextAppointment: appointments[0] ?? null,
          recentResult: results[0] ?? null,
          pendingInvoices: invoices.filter((invoice) => !invoice.paid).length,
        })
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar tu información personal. Intenta nuevamente más tarde.')
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [user])

  const cards = useMemo(() => {
    if (user?.role !== 'patient') return []

    return [
      {
        title: 'Próxima cita',
        description: summary.nextAppointment
          ? `${formatDate(summary.nextAppointment.scheduledAt)} · ${summary.nextAppointment.type || 'Consulta'}`
          : 'Aún no tienes citas programadas.',
        action: { to: '/app/appointments', label: 'Ver mis citas' },
      },
      {
        title: 'Último resultado',
        description: summary.recentResult
          ? `${summary.recentResult.testName || 'Estudio'} · ${formatDate(summary.recentResult.releasedAt, { includeTime: false })}`
          : 'Revisaremos tus resultados apenas estén disponibles.',
        action: { to: '/app/results', label: 'Ver mis resultados' },
      },
      {
        title: 'Facturas pendientes',
        description: summary.pendingInvoices > 0
          ? `Tienes ${summary.pendingInvoices} factura${summary.pendingInvoices > 1 ? 's' : ''} por pagar.`
          : 'Estás al día con tus pagos. ¡Gracias!',
        action: { to: '/app/invoices', label: 'Administrar facturas' },
      },
    ]
  }, [summary, user?.role])

  if (user?.role !== 'patient') {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Panel administrativo</h2>
        <p className="text-sm text-gray-600">Selecciona una sección en la navegación para gestionar la información de los pacientes.</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 text-white p-6 shadow">
        <p className="text-sm opacity-90">Bienvenido</p>
        <h2 className="text-2xl font-semibold">{user.name}</h2>
        <p className="mt-2 text-sm text-sky-100 max-w-lg">
          Aquí tienes un resumen con tu información más importante. Desde este panel podrás seguir tus citas, resultados y facturas.
        </p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando tu información...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <article key={card.title} className="bg-white rounded-xl shadow p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800">{card.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{card.description}</p>
              </div>
              <Link to={card.action.to} className="mt-4 inline-flex items-center text-sm font-medium text-sky-600 hover:text-sky-700">
                {card.action.label}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
