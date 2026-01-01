import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import Table from '../components/Table'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { resolveEntityId } from '../lib/entity'

const formatMoney = value =>
  Number(value ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function LabTests() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({ code: '', name: '', defaultUnit: '', defaultPrice: '', active: true })

  const canView = user?.isAdmin || user?.isFacturacion || user?.isRecepcion
  const canEdit = user?.isAdmin

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/labtests', { params: { page: 1, pageSize: 200, sortBy: 'Code' } })
      setItems(res.data.items ?? res.data.Items ?? [])
    } catch (err) {
      console.error(err)
      setError('No pudimos cargar las pruebas. Intenta nuevamente más tarde.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView) loadData()
  }, [canView])

  const openForm = item => {
    setFormError('')
    if (item) {
      setFormData({
        code: item.code ?? item.Code ?? '',
        name: item.name ?? item.Name ?? '',
        defaultUnit: item.defaultUnit ?? item.DefaultUnit ?? '',
        defaultPrice: item.defaultPrice ?? item.DefaultPrice ?? '',
        active: Boolean(item.active ?? item.Active ?? true),
      })
      setEditingItem(item)
    } else {
      setFormData({ code: '', name: '', defaultUnit: '', defaultPrice: '', active: true })
      setEditingItem(null)
    }
    setShowForm(true)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!canEdit) return
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        defaultUnit: formData.defaultUnit || null,
        defaultPrice: formData.defaultPrice === '' ? null : Number(formData.defaultPrice),
        active: Boolean(formData.active),
      }
      if (editingItem) {
        await api.put(`/api/labtests/${resolveEntityId(editingItem)}`, payload)
      } else {
        await api.post('/api/labtests', payload)
      }
      setShowForm(false)
      setEditingItem(null)
      loadData()
    } catch (err) {
      console.error(err)
      const isConflict = err?.response?.status === 409
      setFormError(isConflict ? 'Ya existe una prueba con ese código.' : 'No pudimos guardar la prueba.')
    } finally {
      setSaving(false)
    }
  }

  const columns = useMemo(
    () => [
      { key: 'code', header: 'Código' },
      { key: 'name', header: 'Nombre' },
      { key: 'defaultUnit', header: 'Unidad' },
      {
        key: 'defaultPrice',
        header: 'Precio',
        render: row => (row.defaultPrice ?? row.DefaultPrice ?? null) !== null
          ? `RD$ ${formatMoney(row.defaultPrice ?? row.DefaultPrice)}`
          : 'Sin precio',
      },
      { key: 'active', header: 'Activa', render: row => (row.active ?? row.Active ? 'Sí' : 'No') },
      ...(canEdit
        ? [{
            key: 'actions',
            header: 'Acciones',
            render: row => (
              <button onClick={() => openForm(row)} className="text-xs text-sky-700 hover:underline">Editar</button>
            ),
          }]
        : []),
    ],
    [canEdit]
  )

  if (!canView) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">No tienes permisos para ver las pruebas.</div>
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl px-6 py-5 text-white shadow-md bg-gradient-to-r from-indigo-600 to-sky-500">
        <p className="text-xs uppercase tracking-[0.15em] text-white/80">Pruebas de laboratorio</p>
        <h2 className="text-2xl font-semibold">Catálogo de pruebas</h2>
        <p className="mt-1 text-sm text-white/80">Gestiona los precios y disponibilidad de las pruebas facturables.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Listado de pruebas</h3>
            <p className="text-sm text-gray-600">Usa precios preconfigurados para evitar digitaciones manuales.</p>
          </div>
          {canEdit && (
            <button
              onClick={() => openForm(null)}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Agregar prueba
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {loading ? (
            <div className="text-sm text-gray-600">Cargando...</div>
          ) : items.length > 0 ? (
            <Table columns={columns} data={items} />
          ) : (
            <div className="text-sm text-gray-500">No hay pruebas registradas.</div>
          )}
        </div>
      </div>

      {showForm && (
        <Modal title={editingItem ? 'Editar prueba' : 'Agregar prueba'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Código</label>
                <input
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  required
                  readOnly={Boolean(editingItem)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nombre</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Unidad</label>
                <input
                  value={formData.defaultUnit}
                  onChange={e => setFormData({ ...formData, defaultUnit: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="mg/dL, g/dL, etc."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Precio de referencia</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.defaultPrice}
                  onChange={e => setFormData({ ...formData, defaultPrice: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Ej. 500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={formData.active}
                onChange={e => setFormData({ ...formData, active: e.target.checked })}
              />
              <label htmlFor="active" className="text-sm text-gray-700">Prueba activa</label>
            </div>
            {formError && <div className="text-sm text-red-600">{formError}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-3 py-2 text-sm">Cancelar</button>
              <button type="submit" className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}
