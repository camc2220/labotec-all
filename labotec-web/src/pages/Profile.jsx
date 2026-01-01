import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

function normalizeProfile(data = {}, fallbackRole) {
  const pick = (...keys) => keys.map(key => data?.[key]).find(Boolean)

  return {
    name: pick('name', 'fullName', 'fullname', 'userName', 'username'),
    email: pick('email', 'mail'),
    userName: pick('userName', 'username'),
    phone: pick('phone', 'phoneNumber', 'telefono', 'mobile'),
    document: pick('document', 'dni', 'documentNumber'),
    patientId: data?.patientId ?? data?.patientID ?? data?.PatientId ?? data?.PatientID ?? null,
    role: data?.role || fallbackRole || 'patient',
    raw: data,
  }
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-white/60 p-3">
      <span className="text-xs uppercase tracking-[0.08em] text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value || 'Sin información'}</span>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const fetchProfile = async () => {
    if (!user) return
    setLoadingProfile(true)
    setProfileError('')
    try {
      const res = await api.get('/api/users/me')
      setProfile(normalizeProfile(res.data, user.role))
    } catch (err) {
      console.error(err)
      setProfileError('No pudimos cargar tu información personal. Intenta nuevamente más tarde.')
      setProfile(null)
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [user])

  const profileFields = useMemo(() => {
    const mapped = [
      { label: 'Nombre', value: profile?.name },
      { label: 'Correo electrónico', value: profile?.email },
      { label: 'Usuario', value: profile?.userName },
      { label: 'Rol', value: profile?.role === 'admin' ? 'Administrador' : 'Paciente' },
      { label: 'Teléfono', value: profile?.phone },
      { label: 'Documento', value: profile?.document },
    ]

    if (profile?.patientId) {
      mapped.push({ label: 'ID de paciente', value: profile.patientId })
    }

    return mapped
  }, [profile])

  const handlePasswordChange = async event => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!passwordForm.newPassword) {
      setPasswordError('La nueva contraseña es obligatoria.')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }

    setUpdatingPassword(true)
    try {
      await api.put('/api/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordSuccess('Tu contraseña se actualizó correctamente.')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      console.error(err)
      setPasswordError('No pudimos actualizar tu contraseña. Revisa los datos e intenta de nuevo.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  if (!user) return null

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-5 text-white shadow-md">
        <p className="text-xs uppercase tracking-[0.15em] text-white/80">Perfil</p>
        <h2 className="text-2xl font-semibold">Tu información personal</h2>
        <p className="mt-1 text-sm text-white/80">Consulta tus datos y mantén tu contraseña actualizada.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mis datos</h3>
              <p className="text-sm text-gray-600">Información obtenida desde el servicio.</p>
            </div>
            <button
              onClick={fetchProfile}
              className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
              disabled={loadingProfile}
            >
              Actualizar
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {profileError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</div>
            )}

            {loadingProfile ? (
              <div className="text-sm text-gray-600">Cargando tu información...</div>
            ) : profile ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {profileFields.map(field => (
                  <InfoRow key={field.label} label={field.label} value={field.value} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No hay información disponible.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Cambiar contraseña</h3>
          <p className="text-sm text-gray-600">Actualiza tus credenciales de acceso de forma segura.</p>

          <form className="mt-4 space-y-4" onSubmit={handlePasswordChange}>
            {passwordError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError}</div>
            )}
            {passwordSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{passwordSuccess}</div>
            )}

            <div className="space-y-1">
              <label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                Contraseña actual
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:outline-none"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                Nueva contraseña
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:outline-none"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:outline-none"
                placeholder="Repite tu nueva contraseña"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updatingPassword}
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-70"
              >
                {updatingPassword ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
