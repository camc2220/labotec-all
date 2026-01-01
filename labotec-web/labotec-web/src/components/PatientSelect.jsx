import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import { resolveEntityId } from '../lib/entity'

const normalizePatients = data => {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.Items)) return data.Items
  if (Array.isArray(data?.patients)) return data.patients
  if (Array.isArray(data?.Patients)) return data.Patients
  return []
}

const getPatientLabel = patient => {
  const name = patient.fullName || patient.name || 'Paciente sin nombre'
  const document = patient.documentId || patient.patientId || resolveEntityId(patient) || 'Sin documento'
  return `${name} (${document})`
}

export default function PatientSelect({ value, onChange, disabled = false, required = false, label = 'Paciente' }) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    const fetchPatients = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/api/patients', { params: { page: 1, pageSize: 50, sortDir: 'asc' } })
        if (!isMounted) return
        setPatients(normalizePatients(res.data))
      } catch (err) {
        console.error(err)
        if (isMounted) setError('No pudimos cargar la lista de pacientes.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPatients()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-1">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">{label}</label>
      <select
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled || loading}
        required={required}
      >
        <option value="" disabled>{loading ? 'Cargando pacientes...' : 'Selecciona un paciente'}</option>
        {patients.map(patient => {
          const id = resolveEntityId(patient)
          return (
            <option key={id ?? getPatientLabel(patient)} value={id ?? ''}>
              {getPatientLabel(patient)}
            </option>
          )
        })}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
