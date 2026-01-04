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

const UNIT_OPTIONS = ['mg/dL', 'g/dL', 'IU/L', 'mmol/L', '%', 'other']

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

const resolveUnitOption = unit => {
  const normalized = (unit ?? '').trim().toLowerCase()
  const match = UNIT_OPTIONS.find(option => option !== 'other' && option.toLowerCase() === normalized)
  return match ?? (unit ? 'other' : '')
}

const buildResultState = result => {
  const unitOption = resolveUnitOption(result?.unit)
  return {
    testId: result?.testId ?? '',
    testName: result?.testName ?? '',
    resultValue: result?.resultValue ?? '',
    unit: result?.unit ?? '',
    unitOption,
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
    releasedAt: '',
    results: [buildResultState({})],
  })
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printPatientKey, setPrintPatientKey] = useState('')
  const [selectedResultIds, setSelectedResultIds] = useState([])
  const [labTests, setLabTests] = useState([])
  const [loadingTests, setLoadingTests] = useState(false)
  const [resultLimit, setResultLimit] = useState('10')
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const isPatient = user?.role === 'patient'
  const displayUserName = user?.name ?? 'Usuario'
  const endpoint = isPatient ? '/api/patients/me/results' : '/api/results'

  const loadLabTests = async () => {
    setLoadingTests(true)
    try {
      const res = await api.get('/api/labtests', {
        params: { page: 1, pageSize: 200, active: true, sortBy: 'Code' },
      })
      setLabTests(res.data.items ?? res.data.Items ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTests(false)
    }
  }

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(endpoint, { params: { page: 1, pageSize: 200, sortDir: 'desc' } })
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

  useEffect(() => {
    loadLabTests()
  }, [])

  const invalidDateRange = useMemo(() => {
    if (!startDate || !endDate) return false
    const start = new Date(startDate)
    const end = new Date(endDate)
    return start > end
  }, [startDate, endDate])

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const startValue = startDate ? new Date(`${startDate}T00:00:00`) : null
    const endValue = endDate ? new Date(`${endDate}T23:59:59`) : null

    return items.filter(row => {
      const releaseDate = row.releasedAt ? new Date(row.releasedAt) : null
      const releaseValid = releaseDate && !Number.isNaN(releaseDate.getTime())

      if (invalidDateRange) return false
      if (startValue || endValue) {
        if (!releaseValid) return false
        if (startValue && releaseDate < startValue) return false
        if (endValue && releaseDate > endValue) return false
      }

      if (!term) return true

      const values = [
        row.testName,
        row.patientName,
        row.patientId ? `paciente ${row.patientId}` : '',
        row.resultValue,
        row.unit,
        row.createdByName,
        row.releasedAt ? formatDateTime(row.releasedAt) : '',
      ]

      return values.some(value => value && value.toString().toLowerCase().includes(term))
    })
  }, [items, searchTerm, startDate, endDate, invalidDateRange])

  const visibleItems = useMemo(() => {
    if (resultLimit === 'all') return filteredItems
    const limitNumber = Number(resultLimit)
    if (Number.isNaN(limitNumber) || limitNumber <= 0) return filteredItems
    return filteredItems.slice(0, limitNumber)
  }, [filteredItems, resultLimit])

  const findLabTestMatch = testName => {
    if (!testName) return null
    const normalized = testName.trim().toLowerCase()
    return labTests.find(test => (test.name ?? test.Name ?? '').trim().toLowerCase() === normalized) ?? null
  }

  const resolveReferenceValue = row => {
    const directValue = row?.referenceValue ?? row?.ReferenceValue
    if (directValue) return directValue
    const matchedTest = findLabTestMatch(row?.testName)
    return matchedTest?.referenceValue ?? matchedTest?.ReferenceValue ?? ''
  }

  const openForm = item => {
    if (item) {
      const matchedTest = findLabTestMatch(item.testName)
      setFormData({
        patientId: item.patientId ?? '',
        releasedAt: item.releasedAt ? item.releasedAt.slice(0, 16) : '',
        results: [
          buildResultState({
            testId: resolveEntityId(matchedTest) ?? '',
            testName: item.testName ?? '',
            resultValue: item.resultValue ?? '',
            unit: item.unit ?? '',
          }),
        ],
      })
      setEditingItem(item)
    } else {
      setFormData({
        patientId: '',
        releasedAt: '',
        results: [buildResultState({})],
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
    if (isPatient) return
    if (!formData.patientId || !formData.releasedAt) {
      setFormError('Debes seleccionar un paciente y la fecha de liberación.')
      return
    }

    const hasInvalidResult = formData.results.some(result => {
      const name = (result.testName ?? '').trim()
      const value = (result.resultValue ?? '').trim()
      return !name || !value
    })
    if (hasInvalidResult) {
      setFormError('Completa el nombre de la prueba y el resultado para cada fila.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const buildPayload = result => ({
        patientId: formData.patientId,
        testName: (result.testName ?? '').trim(),
        resultValue: (result.resultValue ?? '').trim(),
        unit: (result.unit ?? '').trim(),
        releasedAt: formData.releasedAt,
      })

      if (editingItem) {
        const firstResult = formData.results[0]
        await api.put(`/api/results/${resolveEntityId(editingItem)}`, buildPayload(firstResult))
      } else {
        const payloads = formData.results.map(result => buildPayload(result))
        await Promise.all(payloads.map(payload => api.post('/api/results', payload)))
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
    const singlePatient = rows.every(row => getPatientKey(row) === getPatientKey(rows[0]))
    const patientLabel = isPatient
      ? 'Mi cuenta'
      : singlePatient
        ? rows[0]?.patientName ?? rows[0]?.patientId ?? 'Paciente sin nombre'
        : 'Varios pacientes'
    const totalResults = rows.length
    const uniqueTests = new Set(rows.map(row => row.testName ?? '').filter(Boolean)).size
    const latestReleaseDate = rows.reduce((latest, row) => {
      const release = row.releasedAt ? new Date(row.releasedAt) : null
      if (!release || Number.isNaN(release.getTime())) return latest
      if (!latest) return release
      return release > latest ? release : latest
    }, null)

    const title = isPatient
      ? 'Mis resultados'
      : rows.every(row => getPatientKey(row) === getPatientKey(rows[0]))
        ? `Resultados de ${rows[0]?.patientName ?? 'paciente'}`
        : 'Resultados de pacientes'
    printRecords({
      title,
      subtitle: `Listado generado por ${displayUserName}`,
      columns: [
        ...(isPatient
          ? []
          : [{ header: 'Paciente', accessor: row => row.patientName ?? row.patientId ?? 'Sin nombre' }]),
        { header: 'Prueba', accessor: row => row.testName ?? '' },
        { header: 'Resultado', accessor: row => row.resultValue ?? '' },
        { header: 'Unidad', accessor: row => row.unit ?? '' },
        { header: 'Rango de referencia', accessor: row => resolveReferenceValue(row) || '—' },
        { header: 'Registrado por', accessor: row => row.createdByName ?? 'Desconocido' },
        { header: 'Liberado', accessor: row => (row.releasedAt ? formatDateTime(row.releasedAt) : '') },
      ],
      info: [
        { label: 'Paciente', value: patientLabel },
        { label: 'Resultados incluidos', value: `${totalResults} registro${totalResults === 1 ? '' : 's'}` },
        uniqueTests
          ? { label: 'Pruebas únicas', value: `${uniqueTests} prueba${uniqueTests === 1 ? '' : 's'}` }
          : null,
        latestReleaseDate
          ? { label: 'Última liberación', value: formatDateTime(latestReleaseDate) }
          : null,
      ].filter(Boolean),
      footerNote:
        'Los resultados impresos no sustituyen la interpretación médica. Para aclaraciones comunícate con Labotec.',
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
    {
      key: 'referenceValue',
      header: 'Rango de referencia',
      render: row => resolveReferenceValue(row) || '—',
    },
    { key: 'createdByName', header: 'Registrado por' },
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

  const handleAddResultRow = () => {
    setFormData(prev => ({
      ...prev,
      results: [
        ...prev.results,
        buildResultState({}),
      ],
    }))
  }

  const handleRemoveResultRow = index => {
    setFormData(prev => ({
      ...prev,
      results: prev.results.filter((_, idx) => idx !== index),
    }))
  }

  const handleResultChange = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      results: prev.results.map((item, idx) => (idx === index ? { ...item, ...updates } : item)),
    }))
  }

  const handleUnitOptionChange = (index, option) => {
    setFormData(prev => {
      const nextResults = prev.results.map((item, idx) => {
        if (idx !== index) return item
        const isSameOption = item.unitOption === option
        const newUnitOption = isSameOption ? '' : option
        const newUnitValue = newUnitOption === 'other' ? item.unit : newUnitOption
        return {
          ...item,
          unitOption: newUnitOption,
          unit: newUnitOption ? newUnitValue : '',
        }
      })

      return { ...prev, results: nextResults }
    })
  }

  const testOptions = useMemo(
    () =>
      labTests
        .map(test => ({
          id: resolveEntityId(test) ?? test.code ?? test.Code ?? test.name ?? test.Name,
          name: test.name ?? test.Name ?? 'Sin nombre',
          unit: test.defaultUnit ?? test.DefaultUnit ?? '',
          referenceValue: test.referenceValue ?? test.ReferenceValue ?? '',
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [labTests]
  )

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

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-700" htmlFor="results-search">Buscar</label>
            <input
              id="results-search"
              type="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Número, paciente o prueba"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700" htmlFor="results-limit">Mostrar</label>
            <select
              id="results-limit"
              value={resultLimit}
              onChange={e => setResultLimit(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="10">Últimas 10</option>
              <option value="20">Últimas 20</option>
              <option value="50">Últimas 50</option>
              <option value="all">Todas</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700" htmlFor="results-start-date">Desde</label>
            <input
              id="results-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              placeholder="mm/dd/yyyy"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700" htmlFor="results-end-date">Hasta</label>
            <input
              id="results-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              placeholder="mm/dd/yyyy"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>
        {invalidDateRange && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            El rango de fechas es inválido. La fecha inicial debe ser anterior o igual a la final.
          </div>
        )}
        {(searchTerm || startDate || endDate) && !invalidDateRange && (
          <div className="mt-2 text-xs text-gray-600">
            Mostrando {visibleItems.length} de {filteredItems.length} resultados filtrados
          </div>
        )}
        {(!searchTerm && !startDate && !endDate) && (
          <div className="mt-2 text-xs text-gray-600">
            Mostrando {visibleItems.length} de {items.length} resultados
          </div>
        )}

        <div className="mt-4 space-y-3">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {loading ? (
            <div className="text-sm text-gray-600">Cargando...</div>
          ) : visibleItems.length > 0 ? (
            <Table columns={columns} data={visibleItems} />
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
              <label className="block text-xs text-gray-600 mb-1">Fecha de liberación</label>
              <input
                type="datetime-local"
                value={formData.releasedAt}
                onChange={e => setFormData({ ...formData, releasedAt: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-4">
              {formData.results.map((result, index) => {
                const selectedOption = testOptions.find(option => option.id === result.testId)
                const referenceValue = selectedOption?.referenceValue || resolveReferenceValue(result)
                return (
                  <div key={index} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Resultado #{index + 1}</p>
                        <p className="text-xs text-gray-500">Selecciona una prueba existente o escribe su nombre.</p>
                      </div>
                      {formData.results.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveResultRow(index)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Prueba guardada</label>
                        <select
                          value={result.testId}
                          onChange={e => {
                            const selected = testOptions.find(option => option.id === e.target.value)
                            handleResultChange(index, {
                              testId: e.target.value,
                              testName: selected?.name ?? '',
                              unit: selected?.unit ?? '',
                              unitOption: resolveUnitOption(selected?.unit ?? ''),
                            })
                          }}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                          disabled={loadingTests}
                        >
                          <option value="">Selecciona una prueba</option>
                          {testOptions.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                        {loadingTests && <p className="text-xs text-gray-500">Cargando pruebas...</p>}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Nombre de la prueba</label>
                        <input
                          value={result.testName}
                          onChange={e => handleResultChange(index, { testName: e.target.value })}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                          disabled={Boolean(result.testId)}
                          required
                        />
                        {result.testId && (
                          <p className="mt-1 text-xs text-gray-500">Este nombre proviene de la prueba seleccionada.</p>
                        )}
                      </div>
                    </div>
                    {referenceValue && (
                      <p className="mt-2 text-xs text-emerald-700">Rango de referencia sugerido: {referenceValue}</p>
                    )}
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Resultado</label>
                        <input
                          value={result.resultValue}
                          onChange={e => handleResultChange(index, { resultValue: e.target.value })}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Unidad</label>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                            {UNIT_OPTIONS.map(option => (
                              <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={result.unitOption === option}
                                  onChange={() => handleUnitOptionChange(index, option)}
                                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>{option === 'other' ? 'Otro' : option}</span>
                              </label>
                            ))}
                          </div>
                          {result.unitOption === 'other' && (
                            <input
                              value={result.unit}
                              onChange={e => handleResultChange(index, { unit: e.target.value, unitOption: 'other' })}
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              placeholder="Escribe la unidad"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <button
                type="button"
                onClick={handleAddResultRow}
                className="w-full rounded-lg border border-dashed border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Agregar otra prueba
              </button>
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
                  const referenceValue = resolveReferenceValue(row)
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
                          {row.createdByName ? ` • Registrado por ${row.createdByName}` : ''}
                          {referenceValue ? ` • Ref: ${referenceValue}` : ''}
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
