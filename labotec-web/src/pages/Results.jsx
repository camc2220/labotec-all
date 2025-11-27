import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { resolveEntityId } from '../lib/entity'
import { useAuth } from '../context/AuthContext'
import PatientSelect from '../components/PatientSelect'
import { printRecords } from '../lib/print'

const getPatientKey = row => row?.patientId ?? row?.patientName ?? ''
const getResultKey = row =>
  resolveEntityId(row) ??
  `${getPatientKey(row)}-${row?.testName ?? ''}-${row?.releasedAt ?? ''}-${row?.resultValue ?? ''}`

const formatDateTime = value => {
  if (!value) return ''
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

export default function Results() {
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
    testName: '',
    resultValue: '',
    unit: '',
    releasedAt: '',
  })
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printPatientKey, setPrintPatientKey] = useState('')
  const [selectedResultIds, setSelectedResultIds] = useState([])

  const isPatient = user?.role === 'patient'
  const endpoint = isPatient ? '/api/patients/me/results' : '/api/results'

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(endpoint, { params: { page: 1, pageSize: 20, sortDir: 'desc' } })
      setItems(res.data.items ?? res.data.Items ?? [])
    } catch (err) {
      console.error(err)
      setError('No pudimos cargar los resultados. Intenta nuevamente más tarde.')
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
        patientId: item.patientId ?? '',
        testName: item.testName ?? '',
        resultValue: item.resultValue ?? '',
        unit: item.unit ?? '',
        releasedAt: item.releasedAt ? item.releasedAt.slice(0, 16) : '',
      })
      setEditingItem(item)
    } else {
      setFormData({ patientId: '', testName: '', resultValue: '', unit: '', releasedAt: '' })
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
    if (isPatient) return
    setSaving(true)
    setFormError('')
    try {
      const payload = { ...formData }
      if (editingItem) {
        await api.put(`/api/results/${resolveEntityId(editingItem)}`, payload)
      } else {
        await api.post('/api/results', payload)
      }
      closeForm()
      fetchData()
    } catch (err) {
      console.error(err)
      setFormError('No pudimos guardar el resultado. Revisa los datos e intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async item => {
    if (isPatient) return
    const id = resolveEntityId(item)
    if (!id) return
    if (!window.confirm('¿Eliminar este resultado?')) return
    try {
      await api.delete(`/api/results/${id}`)
      fetchData()
    } catch (err) {
      console.error(err)
      setError('No pudimos eliminar el resultado.')
    }
  }

  const patientOptions = useMemo(() => {
    if (isPatient) return []
    const map = new Map()
    items.forEach(row => {
      const key = getPatientKey(row)
      if (!key || map.has(key)) return
      map.set(key, {
        key,
        label: row.patientName ?? (row.patientId ? `Paciente #${row.patientId}` : 'Paciente sin identificación'),
      })
    })
    return Array.from(map.values())
  }, [isPatient, items])

  useEffect(() => {
    if (!printPatientKey) {
      setSelectedResultIds([])
      return
    }
    const rows = items.filter(row => getPatientKey(row) === printPatientKey)
    setSelectedResultIds(rows.map(getResultKey))
  }, [items, printPatientKey])

  const patientResults = useMemo(() => {
    if (!printPatientKey) return []
    return items.filter(row => getPatientKey(row) === printPatientKey)
  }, [items, printPatientKey])

  const selectedRows = useMemo(() => {
    if (!printPatientKey || selectedResultIds.length === 0) return []
    const selectedSet = new Set(selectedResultIds)
    return items.filter(row => getPatientKey(row) === printPatientKey && selectedSet.has(getResultKey(row)))
  }, [items, printPatientKey, selectedResultIds])

  const toggleResultSelection = id => {
    setSelectedResultIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const closePrintModal = () => {
    setShowPrintModal(false)
    setPrintPatientKey('')
    setSelectedResultIds([])
  }

  const printRows = rows => {
    if (!rows || rows.length === 0) return
    const title = isPatient
      ? 'Mis resultados'
      : rows.every(row => getPatientKey(row) === getPatientKey(rows[0]))
        ? `Resultados de ${rows[0]?.patientName ?? 'paciente'}`
        : 'Resultados de pacientes'
    printRecords({
      title,
      subtitle: 'Listado generado desde Labotec',
      columns: [
        ...(isPatient
          ? []
          : [{ header: 'Paciente', accessor: row => row.patientName ?? row.patientId ?? 'Sin nombre' }]),
        { header: 'Prueba', accessor: row => row.testName ?? '' },
        { header: 'Resultado', accessor: row => row.resultValue ?? '' },
        { header: 'Unidad', accessor: row => row.unit ?? '' },
        { header: 'Liberado', accessor: row => (row.releasedAt ? formatDateTime(row.releasedAt) : '') },
      ],
      rows,
    })
  }

  const handlePrint = () => {
    if (items.length === 0) return
    if (isPatient) {
      printRows(items)
      return
    }
    setShowPrintModal(true)
  }

  const handleConfirmPrint = () => {
    printRows(selectedRows)
    closePrintModal()
  }

  const columns = [
    ...(isPatient ? [] : [{ key: 'patientName', header: 'Paciente' }]),
    { key: 'testName', header: 'Prueba' },
    { key: 'resultValue', header: 'Resultado' },
    { key: 'unit', header: 'Unidad' },
    { key: 'releasedAt', header: 'Liberado' },
    ...(!isPatient
      ? [
        {
          key: 'actions',
          header: 'Acciones',
          render: row => (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => openForm(row)} className="text-xs text-sky-700 hover:underline">Editar</button>
              <button onClick={() => handleDelete(row)} className="text-xs text-red-600 hover:underline">Eliminar</button>
            </div>
          ),
        },
      ]
      : []),
  ]
  const panelClass = 'rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm'

  return (
    <section className="space-y-4">
      <div className={`rounded-2xl px-6 py-5 text-white shadow-md ${isPatient ? 'bg-gradient-to-r from-emerald-500 to-sky-500' : 'bg-gradient-to-r from-sky-600 to-sky-500'}`}>
        <p className="text-xs uppercase tracking-[0.15em] text-white/80">Resultados</p>
        <h2 className="text-2xl font-semibold">{isPatient ? 'Mis resultados' : 'Gestión de resultados'}</h2>
        <p className="mt-1 text-sm text-white/80">Consulta y administra los reportes de laboratorio con una vista consistente.</p>
      </div>

      <div className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{isPatient ? 'Historial de resultados' : 'Resultados recientes'}</h3>
            <p className="text-sm text-gray-600">{isPatient ? 'Descarga o imprime tus reportes en línea.' : 'Edita, imprime o elimina resultados publicados.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-xl border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
              disabled={items.length === 0}
            >
              Imprimir
            </button>
            {!isPatient && (
              <button onClick={() => openForm(null)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">Agregar resultado</button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {loading ? (
            <div className="text-sm text-gray-600">Cargando...</div>
          ) : items.length > 0 ? (
            <Table columns={columns} data={items} />
          ) : (
            <div className="text-sm text-gray-500">{isPatient ? 'Aún no tienes resultados disponibles.' : 'No hay resultados registrados.'}</div>
          )}
        </div>
      </div>
      {showForm && !isPatient && (
        <Modal title={editingItem ? 'Editar resultado' : 'Agregar resultado'} onClose={closeForm}>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <PatientSelect
              value={formData.patientId}
              onChange={patientId => setFormData({ ...formData, patientId })}
              required
              label="Paciente"
            />
            <div>
              <label className="block text-xs text-gray-600 mb-1">Prueba</label>
              <input
                value={formData.testName}
                onChange={e => setFormData({ ...formData, testName: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Resultado</label>
                <input
                  value={formData.resultValue}
                  onChange={e => setFormData({ ...formData, resultValue: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Unidad</label>
                <input
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Fecha de liberación</label>
              <input
                type="datetime-local"
                value={formData.releasedAt}
                onChange={e => setFormData({ ...formData, releasedAt: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>
            {formError && <div className="text-sm text-red-600">{formError}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="rounded-lg border px-3 py-2 text-sm">Cancelar</button>
              <button type="submit" className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {showPrintModal && !isPatient && (
        <Modal title="Imprimir resultados" onClose={closePrintModal}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Paciente</label>
              <select
                value={printPatientKey}
                onChange={e => setPrintPatientKey(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Selecciona un paciente</option>
                {patientOptions.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {printPatientKey && patientResults.length === 0 && (
              <div className="text-sm text-gray-500">Este paciente no tiene resultados disponibles.</div>
            )}
            {printPatientKey && patientResults.length > 0 && (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">
                {patientResults.map(row => {
                  const id = getResultKey(row)
                  return (
                    <label key={id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedResultIds.includes(id)}
                        onChange={() => toggleResultSelection(id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">{row.testName ?? 'Sin nombre'}</span>
                        <span className="block text-xs text-gray-500">
                          {row.resultValue ?? 'Sin resultado'} {row.unit ?? ''} •{' '}
                          {row.releasedAt ? formatDateTime(row.releasedAt) : 'Sin fecha'}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closePrintModal} className="rounded-lg border px-3 py-2 text-sm">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPrint}
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white"
                disabled={!printPatientKey || selectedRows.length === 0}
              >
                Imprimir seleccionados
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
