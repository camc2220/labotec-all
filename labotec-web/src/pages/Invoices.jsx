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
    amount: '',
    issuedAt: '',
    paid: false,
  })
  const [loadingInvoiceNumber, setLoadingInvoiceNumber] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printPatientKey, setPrintPatientKey] = useState('')
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([])

  const isPatient = user?.role === 'patient'
  const endpoint = isPatient ? '/api/patients/me/invoices' : '/api/invoices'

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(endpoint, { params: { page: 1, pageSize: 20, sortDir: 'desc' } })
      setItems(res.data.items ?? res.data.Items ?? [])
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

  const buildNextInvoiceNumber = lastNumber => {
    const match = /^FAC-(\d{4})-(\d{4})$/.exec(lastNumber ?? '')
    if (match) {
      const [, year, seq] = match
      const nextSeq = String(Number(seq) + 1).padStart(4, '0')
      return `FAC-${year}-${nextSeq}`
    }
    const year = new Date().getFullYear()
    return `FAC-${year}-0001`
  }

  const loadNextInvoiceNumber = async () => {
    setLoadingInvoiceNumber(true)
    try {
      const res = await api.get('/api/invoices', {
        params: { page: 1, pageSize: 1, sortBy: 'Number', sortDir: 'desc' },
      })
      const list = res.data.items ?? res.data.Items ?? []
      const lastNumber = list[0]?.number ?? list[0]?.Number ?? ''
      setFormData(prev => ({ ...prev, number: buildNextInvoiceNumber(lastNumber) }))
    } catch (err) {
      console.error(err)
      setFormError('No pudimos obtener el último número de factura; usamos un consecutivo sugerido.')
      setFormData(prev => ({ ...prev, number: buildNextInvoiceNumber() }))
    } finally {
      setLoadingInvoiceNumber(false)
    }
  }

  const openForm = async item => {
    setFormError('')
    if (item) {
      setFormData({
        patientId: item.patientId ?? '',
        number: item.number ?? '',
        amount: item.amount ?? '',
        issuedAt: item.issuedAt ? item.issuedAt.slice(0, 10) : '',
        paid: Boolean(item.paid),
      })
      setEditingItem(item)
      setShowForm(true)
    } else {
      setFormData({ patientId: '', number: '', amount: '', issuedAt: '', paid: false })
      setEditingItem(null)
      setShowForm(true)
      await loadNextInvoiceNumber()
    }
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
      const payload = { ...formData, paid: Boolean(formData.paid) }
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
        setFormError('El número de factura ya existe. Actualizamos el consecutivo y puedes intentar nuevamente.')
        await loadNextInvoiceNumber()
      } else {
        setFormError('No pudimos guardar la factura. Revisa los datos e intenta nuevamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async item => {
    if (isPatient) return
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

  const toggleInvoiceSelection = id => {
    setSelectedInvoiceIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const closePrintModal = () => {
    setShowPrintModal(false)
    setPrintPatientKey('')
    setSelectedInvoiceIds([])
  }

  const printRows = rows => {
    if (!rows || rows.length === 0) return
    const title = isPatient
      ? 'Mis facturas'
      : rows.every(row => getPatientKey(row) === getPatientKey(rows[0]))
        ? `Facturas de ${rows[0]?.patientName ?? 'paciente'}`
        : 'Facturas de pacientes'
    printRecords({
      title,
      subtitle: 'Listado generado desde Labotec',
      columns: [
        ...(isPatient
          ? []
          : [{ header: 'Paciente', accessor: row => row.patientName ?? row.patientId ?? 'Sin nombre' }]),
        { header: 'Factura', accessor: row => row.number ?? '' },
        { header: 'Monto', accessor: row => row.amount ?? '' },
        { header: 'Fecha', accessor: row => (row.issuedAt ? formatDate(row.issuedAt) : '') },
        { header: 'Pagada', accessor: row => (row.paid ? 'Sí' : 'No') },
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
    { key: 'number', header: 'Factura' },
    { key: 'amount', header: 'Monto' },
    { key: 'issuedAt', header: 'Fecha' },
    { key: 'paid', header: 'Pagada', render: r => r.paid ? 'Sí' : 'No' },
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
            {!isPatient && (
              <button onClick={() => openForm(null)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">Agregar factura</button>
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
            <div className="text-sm text-gray-500">{isPatient ? 'No tienes facturas registradas.' : 'No hay facturas registradas.'}</div>
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
                readOnly={!editingItem}
                disabled={loadingInvoiceNumber && !editingItem}
                className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-50"
                required
              />
              {!editingItem && (
                <p className="mt-1 text-xs text-gray-500">
                  El número se asigna automáticamente según el último consecutivo registrado.
                </p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  required
                />
              </div>
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
              <button type="submit" className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white" disabled={saving}>
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
                          {row.amount ?? 'Sin monto'} • {row.issuedAt ? formatDate(row.issuedAt) : 'Sin fecha'} •{' '}
                          {row.paid ? 'Pagada' : 'Pendiente'}
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
