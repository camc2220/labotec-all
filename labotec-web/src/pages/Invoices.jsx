import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { resolveEntityId } from '../lib/entity'
import { useAuth } from '../context/AuthContext'
import { printRecords } from '../lib/print'
import PatientSelect from '../components/PatientSelect'

const getPatientKey = row => row?.patientId ?? row?.patientName ?? ''
const getInvoiceKey = row =>
  resolveEntityId(row) ??
  `${getPatientKey(row)}-${row?.number ?? ''}-${row?.issuedAt ?? ''}-${row?.amount ?? ''}`

const formatDate = value => {
  if (!value) return ''
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('es-ES', { dateStyle: 'medium' })
  } catch {
    return value
  }
}

const getLabTestId = test => test?.id ?? test?.Id ?? ''
const getLabTestPrice = test => Number(test?.defaultPrice ?? test?.DefaultPrice ?? 0)
const formatMoney = value => Number(value ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Invoices() {
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
    number: '',
    issuedAt: '',
    paid: false,
    items: [],
  })
  const [labTests, setLabTests] = useState([])
  const [labTestsLoading, setLabTestsLoading] = useState(false)
  const [labTestsError, setLabTestsError] = useState('')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printPatientKey, setPrintPatientKey] = useState('')
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([])
  const [updatingPaidId, setUpdatingPaidId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [resultLimit, setResultLimit] = useState('10')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const isPatient = user?.role === 'patient'
  const canManage = user?.isAdmin || user?.isFacturacion
  const displayUserName = user?.name ?? 'Usuario'
  const endpoint = isPatient ? '/api/patients/me/invoices' : '/api/invoices'

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(endpoint, { params: { page: 1, pageSize: 200, sortDir: 'desc' } })
      const list = res.data.items ?? res.data.Items ?? []
      const sorted = [...list].sort((a, b) => {
        const aDate = a.issuedAt ? new Date(a.issuedAt) : null
        const bDate = b.issuedAt ? new Date(b.issuedAt) : null
        const aTime = aDate && !Number.isNaN(aDate.getTime()) ? aDate.getTime() : 0
        const bTime = bDate && !Number.isNaN(bDate.getTime()) ? bDate.getTime() : 0
        return bTime - aTime
      })
      setItems(sorted)
    } catch (err) {
      console.error(err)
      setError('No pudimos cargar las facturas. Intenta nuevamente más tarde.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchData()
  }, [endpoint, user])

  useEffect(() => {
    const loadLabTests = async () => {
      if (!user || isPatient) return
      setLabTestsLoading(true)
      setLabTestsError('')
      try {
        const res = await api.get('/api/labtests', { params: { page: 1, pageSize: 200, active: true, sortBy: 'Code' } })
        const list = res.data.items ?? res.data.Items ?? []
        setLabTests(list)
      } catch (err) {
        console.error(err)
        setLabTestsError('No pudimos cargar las pruebas disponibles.')
      } finally {
        setLabTestsLoading(false)
      }
    }
    loadLabTests()
  }, [isPatient, user])

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 1000000)
    const paddedRandom = String(random).padStart(6, '0')
    return `FAC-${year}-${paddedRandom}`
  }

  const openForm = async item => {
    if (!canManage) return
    setFormError('')
    if (item) {
      try {
        const id = resolveEntityId(item)
        const res = await api.get(`/api/invoices/${id}`)
        const invoice = res.data ?? {}
        setFormData({
          patientId: invoice.patientId ?? '',
          number: invoice.number ?? '',
          issuedAt: invoice.issuedAt ? invoice.issuedAt.slice(0, 10) : '',
          paid: Boolean(invoice.paid),
          items: (invoice.items ?? []).map(it => ({
            labTestId: it.labTestId,
            price: it.price,
            name: it.name ?? it.Name ?? it.code ?? it.Code ?? '',
          })),
        })
        setEditingItem(item)
        setShowForm(true)
      } catch (err) {
        console.error(err)
        setFormError('No pudimos cargar el detalle de la factura para editarla.')
      }
    } else {
      const today = new Date().toISOString().slice(0, 10)
      setFormData({
        patientId: '',
        number: generateInvoiceNumber(),
        issuedAt: today,
        paid: false,
        items: [],
      })
      setEditingItem(null)
      setShowForm(true)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setFormError('')
    setEditingItem(null)
  }

  const handleFormSubmit = async e => {
    e.preventDefault()
    if (isPatient || !canManage) return
    setSaving(true)
    setFormError('')
    if (!formData.items || formData.items.length === 0) {
      setFormError('Selecciona al menos una prueba para facturar.')
      setSaving(false)
      return
    }
    try {
      const payload = {
        ...formData,
        issuedAt: formData.issuedAt ? `${formData.issuedAt}T00:00:00Z` : null,
        paid: Boolean(formData.paid),
        items: (formData.items ?? []).map(it => ({ labTestId: it.labTestId, price: it.price })),
      }
      if (editingItem) {
        await api.put(`/api/invoices/${resolveEntityId(editingItem)}`, payload)
      } else {
        await api.post('/api/invoices', payload)
      }
      closeForm()
      fetchData()
    } catch (err) {
      console.error(err)
      const isConflict = err?.response?.status === 409
      if (!editingItem && isConflict) {
        setFormError('El número de factura ya existe. Generamos un número aleatorio y puedes intentar nuevamente.')
        setFormData(prev => ({ ...prev, number: generateInvoiceNumber() }))
      } else {
        setFormError('No pudimos guardar la factura. Revisa los datos e intenta nuevamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async item => {
    if (isPatient || !canManage) return
    const id = resolveEntityId(item)
    if (!id) return
    if (!window.confirm('¿Eliminar esta factura?')) return
    try {
      await api.delete(`/api/invoices/${id}`)
      fetchData()
    } catch (err) {
      console.error(err)
      setError('No pudimos eliminar la factura.')
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
      setSelectedInvoiceIds([])
      return
    }
    const rows = items.filter(row => getPatientKey(row) === printPatientKey)
    setSelectedInvoiceIds(rows.map(getInvoiceKey))
  }, [items, printPatientKey])

  const patientInvoices = useMemo(() => {
    if (!printPatientKey) return []
    return items.filter(row => getPatientKey(row) === printPatientKey)
  }, [items, printPatientKey])

  const selectedRows = useMemo(() => {
    if (!printPatientKey || selectedInvoiceIds.length === 0) return []
    const selectedSet = new Set(selectedInvoiceIds)
    return items.filter(row => getPatientKey(row) === printPatientKey && selectedSet.has(getInvoiceKey(row)))
  }, [items, printPatientKey, selectedInvoiceIds])

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
      const issuedDate = row.issuedAt ? new Date(row.issuedAt) : null
      const issuedValid = issuedDate && !Number.isNaN(issuedDate.getTime())

      if (invalidDateRange) return false
      if (startValue || endValue) {
        if (!issuedValid) return false
        if (startValue && issuedDate < startValue) return false
        if (endValue && issuedDate > endValue) return false
      }

      if (!term) return true

      const amount = row.amount ?? row.Amount
      const issuedAt = row.issuedAt ? formatDate(row.issuedAt) : ''
      const tests = (row.items ?? row.Items ?? [])
        .map(item => item.name ?? item.Name ?? item.code ?? item.Code ?? '')
        .filter(Boolean)
        .join(' ')

      const values = [
        row.number,
        row.patientName,
        row.patientId ? `paciente ${row.patientId}` : '',
        issuedAt,
        tests,
        typeof amount === 'number' ? amount.toString() : amount,
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

  const selectedLabTestIds = useMemo(
    () => new Set((formData.items ?? []).map(item => item.labTestId)),
    [formData.items]
  )

  const selectedLabTests = useMemo(() => {
    if (labTests.length === 0 || selectedLabTestIds.size === 0) return []
    return labTests.filter(test => selectedLabTestIds.has(getLabTestId(test)))
  }, [labTests, selectedLabTestIds])

  const totalAmount = useMemo(
    () => (formData.items ?? []).reduce((sum, item) => sum + Number(item.price ?? 0), 0),
    [formData.items]
  )

  const inactiveSelectedItems = useMemo(
    () => (formData.items ?? []).filter(item => !labTests.some(test => getLabTestId(test) === item.labTestId)),
    [formData.items, labTests]
  )

  const toggleInvoiceSelection = id => {
    setSelectedInvoiceIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const togglePaidStatus = async (row, paid) => {
    if (!canManage || isPatient) return

    const id = resolveEntityId(row)
    if (!id) return

    setUpdatingPaidId(id)
    setError('')

    try {
      const itemsPayload = (row.items ?? row.Items ?? [])
        .map(item => ({
          labTestId: item.labTestId ?? item.LabTestId,
          price: item.price ?? item.Price,
        }))
        .filter(it => it.labTestId)

      if (itemsPayload.length === 0) throw new Error('Missing invoice items')

      const payload = {
        number: row.number ?? '',
        issuedAt: row.issuedAt ?? null,
        paid,
        items: itemsPayload,
      }

      await api.put(`/api/invoices/${id}`, payload)
      setItems(prev => prev.map(it => (resolveEntityId(it) === id ? { ...it, paid } : it)))
    } catch (err) {
      console.error(err)
      setError('No pudimos actualizar el estado de pago.')
    } finally {
      setUpdatingPaidId('')
    }
  }

  const closePrintModal = () => {
    setShowPrintModal(false)
    setPrintPatientKey('')
    setSelectedInvoiceIds([])
  }

  const printRows = rows => {
    if (!rows || rows.length === 0) return
    const singlePatient = rows.every(row => getPatientKey(row) === getPatientKey(rows[0]))
    const patientLabel = isPatient
      ? 'Mi cuenta'
      : singlePatient
        ? rows[0]?.patientName ?? rows[0]?.patientId ?? 'Paciente sin nombre'
        : 'Varios pacientes'
    const totalInvoices = rows.length
    const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount ?? row.Amount ?? 0), 0)
    const paidCount = rows.filter(row => Boolean(row.paid)).length
    const pendingCount = Math.max(totalInvoices - paidCount, 0)
    const latestIssueDate = rows.reduce((latest, row) => {
      const issued = row.issuedAt ? new Date(row.issuedAt) : null
      if (!issued || Number.isNaN(issued.getTime())) return latest
      if (!latest) return issued
      return issued > latest ? issued : latest
    }, null)

    const title = isPatient
      ? 'Mis facturas'
      : rows.every(row => getPatientKey(row) === getPatientKey(rows[0]))
        ? `Facturas de ${rows[0]?.patientName ?? 'paciente'}`
        : 'Facturas de pacientes'
    
    printRecords({
      title,
      subtitle: `Listado generado por ${displayUserName}`,
      columns: [
        ...(isPatient
          ? []
          : [{ header: 'Paciente', accessor: row => row.patientName ?? row.patientId ?? 'Sin nombre' }]),
        { header: 'Factura', accessor: row => row.number ?? '' },
        { header: 'Monto', accessor: row => `RD$ ${formatMoney(row.amount ?? row.Amount ?? 0)}` },
        { header: 'Fecha', accessor: row => (row.issuedAt ? formatDate(row.issuedAt) : '') },
        { header: 'Pagada', accessor: row => (row.paid ? 'Sí' : 'No') },
      ],
      info: [
        { label: 'Paciente', value: patientLabel },
        { label: 'Total de facturas', value: `${totalInvoices} registro${totalInvoices === 1 ? '' : 's'}` },
        { label: 'Monto total', value: `RD$ ${formatMoney(totalAmount)}` },
        { label: 'Pagadas / pendientes', value: `${paidCount} / ${pendingCount}` },
        latestIssueDate ? { label: 'Última emisión', value: formatDate(latestIssueDate) } : null,
      ].filter(Boolean),
      footerNote: 'Gracias por confiar en Labotec. Si necesitas soporte sobre tus pagos o facturas, contáctanos con este listado.',
      rows,
      // Esta función genera el HTML interno para el detalle de la factura
      renderRowDetails: (row) => {
        const items = row.items ?? row.Items ?? []
        if (!items || items.length === 0) return null
        
        const itemsHtml = items.map(item => `
          <tr>
            <td>${item.name ?? item.Name ?? item.code ?? item.Code ?? 'Prueba sin nombre'}</td>
            <td class="text-right">RD$ ${formatMoney(item.price ?? item.Price ?? 0)}</td>
          </tr>
        `).join('')

        return `
          <table class="sub-table">
            <thead>
              <tr>
                <th>Descripción / Prueba</th>
                <th class="text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        `
      }
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

  const handleRowPrint = row => {
    printRows([row])
  }

  const toggleLabTestSelection = labTestId => {
    setFormData(prev => {
      const items = prev.items ?? []
      const exists = items.find(it => it.labTestId === labTestId)
      if (exists) {
        return { ...prev, items: items.filter(it => it.labTestId !== labTestId) }
      }
      const test = labTests.find(t => getLabTestId(t) === labTestId)
      const price = test ? getLabTestPrice(test) : 0
      const name = test ? `${test.code ?? test.Code ?? ''} ${test.name ?? test.Name ?? ''}`.trim() : ''
      return { ...prev, items: [...items, { labTestId, price, name }] }
    })
  }

  const columns = [
    ...(isPatient ? [] : [{ key: 'patientName', header: 'Paciente' }]),
    { key: 'number', header: 'Factura' },
    {
      key: 'items',
      header: 'Pruebas',
      render: row => (row.items ?? row.Items ?? [])
        .map(item => item.name ?? item.Name ?? item.code ?? item.Code ?? '')
        .filter(Boolean)
        .join(', '),
    },
    { key: 'amount', header: 'Monto', render: row => `RD$ ${formatMoney(row.amount ?? row.Amount ?? 0)}` },
    { key: 'issuedAt', header: 'Fecha', render: row => (row.issuedAt ? formatDate(row.issuedAt) : '') },
    {
      key: 'paid',
      header: 'Pagada',
      render: row => {
        const id = resolveEntityId(row)
        const checked = Boolean(row.paid)

        if (!canManage || isPatient || !id) return checked ? 'Sí' : 'No'

        const disabled = updatingPaidId === id

        return (
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={e => togglePaidStatus(row, e.target.checked)}
            />
            <span>{checked ? 'Pagada' : 'Pendiente'}</span>
          </label>
        )
      },
    },
    ...(!isPatient && canManage
      ? [
        {
          key: 'actions',
          header: 'Acciones',
          render: row => (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleRowPrint(row)} className="text-xs text-indigo-700 hover:underline">Imprimir</button>
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
        <p className="text-xs uppercase tracking-[0.15em] text-white/80">Facturación</p>
        <h2 className="text-2xl font-semibold">{isPatient ? 'Mis facturas' : 'Gestión de facturas'}</h2>
        <p className="mt-1 text-sm text-white/80">Visualiza los montos y estados de pago con una presentación consistente.</p>
      </div>

      <div className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{isPatient ? 'Historial de facturación' : 'Facturación por paciente'}</h3>
            <p className="text-sm text-gray-600">{isPatient ? 'Descarga tus comprobantes o verifica pagos pendientes.' : 'Crea o actualiza facturas y genera listados para imprimir.'}</p>
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
            {canManage && (
              <button onClick={() => openForm(null)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">Agregar factura</button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-700" htmlFor="invoice-search">Buscar</label>
            <input
              id="invoice-search"
              type="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Número, paciente o prueba"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700" htmlFor="invoice-limit">Mostrar</label>
            <select
              id="invoice-limit"
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
            <label className="text-sm text-gray-700" htmlFor="invoice-start-date">Desde</label>
            <input
              id="invoice-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700" htmlFor="invoice-end-date">Hasta</label>
            <input
              id="invoice-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          {(searchTerm || startDate || endDate) && !invalidDateRange && (
            <span>
              Filtros activos:
              {searchTerm && <> búsqueda "{searchTerm}"</>}
              {startDate && <> desde {startDate}</>}
              {endDate && <> hasta {endDate}</>}
            </span>
          )}
          {(searchTerm || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setStartDate('')
                setEndDate('')
              }}
              className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {invalidDateRange && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              El rango de fechas es inválido. La fecha inicial debe ser anterior o igual a la final.
            </div>
          )}
          {loading ? (
            <div className="text-sm text-gray-600">Cargando...</div>
          ) : visibleItems.length > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Mostrando {visibleItems.length} de {filteredItems.length} resultados</span>
                {resultLimit !== 'all' && filteredItems.length > visibleItems.length && <span>Usa "Todas" para ver todos los resultados</span>}
              </div>
              <Table columns={columns} data={visibleItems} />
            </>
          ) : (
            <div className="text-sm text-gray-500">
              {isPatient
                ? 'No tienes facturas registradas o coincidentes con la búsqueda.'
                : 'No hay facturas registradas o coincidentes con la búsqueda.'}
            </div>
          )}
        </div>
      </div>
      {showForm && !isPatient && (
        <Modal title={editingItem ? 'Editar factura' : 'Agregar factura'} onClose={closeForm}>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <PatientSelect
              value={formData.patientId}
              onChange={patientId => setFormData({ ...formData, patientId })}
              required
              label="Paciente"
            />
            <div>
              <label className="block text-xs text-gray-600 mb-1">Número de factura</label>
              <input
                value={formData.number}
                onChange={e => setFormData({ ...formData, number: e.target.value })}
                readOnly={!editingItem}
                className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-50"
                required
              />
              {!editingItem && (
                <p className="mt-1 text-xs text-gray-500">
                  El número se asigna automáticamente de forma aleatoria.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Pruebas facturadas</label>
              {labTestsError && (
                <div className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{labTestsError}</div>
              )}
              {labTestsLoading ? (
                <div className="text-sm text-gray-600">Cargando pruebas...</div>
              ) : (
                <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {labTests.length === 0 && inactiveSelectedItems.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay pruebas configuradas.</div>
                  ) : (
                    labTests.map(test => {
                      const id = getLabTestId(test)
                      const checked = selectedLabTestIds.has(id)
                      const selected = (formData.items ?? []).find(it => it.labTestId === id)
                      const price = selected?.price ?? getLabTestPrice(test)
                      return (
                        <label key={id} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLabTestSelection(id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="font-medium">{test.code ?? test.Code} - {test.name ?? test.Name}</span>
                            <span className="block text-xs text-gray-500">Precio: RD$ {formatMoney(price)}</span>
                          </span>
                        </label>
                      )
                    })
                  )}
                  {inactiveSelectedItems.length > 0 && (
                    <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      Incluye {inactiveSelectedItems.length} prueba(s) ya inactivas que se mantienen para esta factura.
                    </div>
                  )}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">Selecciona una o varias pruebas para calcular el monto automáticamente.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fecha de emisión</label>
                <input
                  type="date"
                  value={formData.issuedAt}
                  onChange={e => setFormData({ ...formData, issuedAt: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Total calculado</label>
                <div className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
                  RD$ {formatMoney(totalAmount)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="paid"
                type="checkbox"
                checked={formData.paid}
                onChange={e => setFormData({ ...formData, paid: e.target.checked })}
              />
              <label htmlFor="paid" className="text-sm text-gray-700">Factura pagada</label>
            </div>
            {formError && <div className="text-sm text-red-600">{formError}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="rounded-lg border px-3 py-2 text-sm">Cancelar</button>
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white"
                disabled={saving || !formData.items || formData.items.length === 0}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {showPrintModal && !isPatient && (
        <Modal title="Imprimir facturas" onClose={closePrintModal}>
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
            {printPatientKey && patientInvoices.length === 0 && (
              <div className="text-sm text-gray-500">Este paciente no tiene facturas disponibles.</div>
            )}
            {printPatientKey && patientInvoices.length > 0 && (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">
                {patientInvoices.map(row => {
                  const id = getInvoiceKey(row)
                  return (
                    <label key={id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(id)}
                        onChange={() => toggleInvoiceSelection(id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">{row.number ?? 'Sin número'}</span>
                        <span className="block text-xs text-gray-500">
                          RD$ {formatMoney(row.amount ?? row.Amount ?? 0)} • {row.issuedAt ? formatDate(row.issuedAt) : 'Sin fecha'}
                          {' '}• {row.paid ? 'Pagada' : 'Pendiente'}
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
                Imprimir seleccionadas
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
