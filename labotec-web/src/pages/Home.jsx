import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

const testOptions = [
  'Perfil completo de laboratorio',
  'Prueba de COVID-19',
  'Perfil tiroideo',
  'Panel prenatal',
  'Chequeo ejecutivo'
]

export default function Home() {
  const initialRegister = {
    fullName: '',
    documentId: '',
    email: '',
    phone: '',
    birthDate: '',
    testType: '',
    password: ''
  }

  const [registerData, setRegisterData] = useState(initialRegister)
  const [registerStatus, setRegisterStatus] = useState(null)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [activeTests, setActiveTests] = useState([])
  const [testsLoading, setTestsLoading] = useState(true)
  const [testsError, setTestsError] = useState('')
  const [visibleStart, setVisibleStart] = useState(0)

  const handleRegisterChange = (event) => {
    const { name, value } = event.target
    setRegisterData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()

    const hasEmptyFields = Object.values(registerData).some((value) => !value)
    if (hasEmptyFields) {
      setRegisterStatus({ type: 'error', message: 'Por favor completa todos los campos para poder contactarte.' })
      return
    }

    setRegisterLoading(true)
    try {
      const payload = {
        fullName: registerData.fullName,
        documentId: registerData.documentId,
        email: registerData.email,
        phone: registerData.phone,
        birthDate: registerData.birthDate ? new Date(registerData.birthDate).toISOString() : null,
        testType: registerData.testType,
        password: registerData.password,
        role: 'patient',
        userName: registerData.email || registerData.phone
      }
      await api.post('/api/auth/register', payload)
      setRegisterStatus({ type: 'success', message: `¡Gracias ${registerData.fullName}! Hemos creado tu usuario para que puedas iniciar sesión en LABOTEC.` })
      setRegisterData(initialRegister)
    } catch (error) {
      console.error(error)
      const serverMessage = error?.response?.data?.[0]?.description || 'No pudimos completar tu registro en este momento. Por favor intenta más tarde.'
      setRegisterStatus({ type: 'error', message: serverMessage })
    } finally {
      setRegisterLoading(false)
    }
  }

  useEffect(() => {
    const loadActiveTests = async () => {
      setTestsLoading(true)
      setTestsError('')
      try {
        const response = await api.get('/api/labtests', { params: { page: 1, pageSize: 50, sortBy: 'Name' } })
        const items = response.data.items ?? response.data.Items ?? []
        const filtered = items.filter((item) => Boolean(item.active ?? item.Active))
        setActiveTests(filtered)
        setVisibleStart(0)
      } catch (error) {
        console.error(error)
        setTestsError('No pudimos cargar los servicios disponibles en este momento.')
      } finally {
        setTestsLoading(false)
      }
    }

    loadActiveTests()
  }, [])

  const totalActiveTests = activeTests.length
  const visibleCount = Math.min(5, totalActiveTests)
  const visibleTests =
    totalActiveTests <= 5
      ? activeTests
      : Array.from({ length: visibleCount }, (_, index) => activeTests[(visibleStart + index) % totalActiveTests])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      <header className="border-b border-sky-900 bg-sky-800/95 backdrop-blur sticky top-0 z-10 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-sm text-white/90">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-white font-semibold">L</div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/90">LABOTEC</p>
              <p className="text-sm font-semibold text-white">Laboratorio Clínico</p>
            </div>
          </div>
          <nav className="hidden gap-6 md:flex">
            <a href="#servicios" className="transition hover:text-white">Servicios</a>
            <a href="#procesos" className="transition hover:text-white">¿Cómo funciona?</a>
            <a href="#procesos" className="transition hover:text-white">Registro de pacientes</a>
            <a href="#contacto" className="transition hover:text-white">Contacto</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden text-white/90 transition hover:text-white md:inline">Soy paciente registrado</Link>
            <a href="#procesos" className="rounded-full bg-white px-4 py-2 text-sky-900 font-semibold shadow hover:bg-slate-50">Agenda ahora</a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-10 lg:py-16">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Resultados confiables para tu bienestar
            </span>
            <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl lg:text-5xl">
              Regístrate en LABOTEC y agenda tu prueba de laboratorio en minutos
            </h1>
            <p className="text-base text-gray-600 sm:text-lg">
              Somos tu aliado en diagnóstico clínico. Regístrate como paciente nuevo, selecciona la prueba que necesitas y reserva la fecha y hora que mejor se ajusten a tu rutina.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/login?next=/app/appointments"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-sky-700"
              >
                Registrarme y agendar
              </Link>
              <Link
                to="/login?next=/app/appointments"
                className="inline-flex items-center justify-center rounded-full border border-sky-100 bg-white px-6 py-3.5 text-base font-semibold text-sky-700 shadow-sm transition hover:border-sky-200 hover:text-sky-800"
              >
                Ver mis citas
              </Link>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Resultados en línea 24/7
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Atención domiciliaria disponible
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Cobertura con aseguradoras aliadas
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-6 -top-6 hidden h-28 w-28 rounded-3xl bg-emerald-200/50 blur-2xl lg:block" />
            <div className="absolute -bottom-8 -right-8 hidden h-32 w-32 rounded-full bg-sky-200/60 blur-2xl lg:block" />
            <div className="relative rounded-3xl border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70">
              <p className="text-sm font-semibold text-gray-900">Agendamiento Express</p>
              <p className="mt-2 text-sm text-gray-600">Completa tu registro y confirma tu cita en tres sencillos pasos.</p>
              <ol className="mt-4 space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white">1</span>
                  <div>
                    <p className="font-semibold">Cuéntanos sobre ti</p>
                    <p className="text-xs text-gray-500">Registra tus datos básicos y tus preferencias de contacto.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white">2</span>
                  <div>
                    <p className="font-semibold">Elige la prueba clínica</p>
                    <p className="text-xs text-gray-500">Selecciona entre nuestros perfiles especializados.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white">3</span>
                  <div>
                    <p className="font-semibold">Reserva tu cita</p>
                    <p className="text-xs text-gray-500">Elige fecha, hora y sede disponibles en tiempo real.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section id="servicios" className="grid gap-6 rounded-3xl bg-white/80 p-8 shadow-lg shadow-sky-100/60 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Por qué elegirnos</p>
            <h2 className="text-2xl font-semibold text-gray-900">Tecnología, precisión y acompañamiento humano</h2>
            <p className="text-sm text-gray-600">
              LABOTEC combina equipos de última generación con un equipo multidisciplinario de especialistas que acompañan a cada paciente durante todo el proceso.
            </p>
          </div>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <p className="font-semibold text-gray-900">Resultados rápidos</p>
              <p className="mt-1 text-xs text-gray-500">Más del 85% de las pruebas se entregan en menos de 24 horas.</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <p className="font-semibold text-gray-900">Convenios con aseguradoras</p>
              <p className="mt-1 text-xs text-gray-500">Aceptamos los principales planes de salud y contamos con tarifas preferenciales.</p>
            </div>
          </div>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <p className="font-semibold text-gray-900">Atención personalizada</p>
              <p className="mt-1 text-xs text-gray-500">Nuestro equipo de enfermería te acompaña antes, durante y después del procedimiento.</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <p className="font-semibold text-gray-900">Resultados digitales seguros</p>
              <p className="mt-1 text-xs text-gray-500">Consulta tus resultados desde cualquier dispositivo con autenticación segura.</p>
            </div>
          </div>
        </section>

        <section id="procesos" className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-emerald-100 bg-white/80 p-8 shadow-lg shadow-emerald-100/50">
            <h2 className="text-2xl font-semibold text-gray-900">Registra tus datos como paciente</h2>
            <p className="mt-2 text-sm text-gray-600">Completa el formulario y recibirás un correo con la confirmación de tu usuario LABOTEC.</p>
            <form onSubmit={handleRegisterSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="fullName" className="text-sm font-medium text-gray-700">Nombre completo *</label>
                <input
                  id="fullName"
                  name="fullName"
                  value={registerData.fullName}
                  onChange={handleRegisterChange}
                  type="text"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Ej. Ana María Rodríguez"
                />
              </div>
              <div>
                <label htmlFor="documentId" className="text-sm font-medium text-gray-700">Documento de identidad *</label>
                <input
                  id="documentId"
                  name="documentId"
                  value={registerData.documentId}
                  onChange={handleRegisterChange}
                  type="text"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Ej. CC 123456789"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700">Correo electrónico *</label>
                <input
                  id="email"
                  name="email"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  type="email"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Crea tu contraseña *</label>
                <input
                  id="password"
                  name="password"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  type="password"
                  minLength={8}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Mínimo 8 caracteres"
                />
                <p className="mt-1 text-xs text-gray-500">Esta contraseña te permitirá ingresar al portal de pacientes.</p>
              </div>
              <div>
                <label htmlFor="phone" className="text-sm font-medium text-gray-700">Teléfono de contacto *</label>
                <input
                  id="phone"
                  name="phone"
                  value={registerData.phone}
                  onChange={handleRegisterChange}
                  type="tel"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Ej. +57 320 123 4567"
                />
              </div>
              <div>
                <label htmlFor="birthDate" className="text-sm font-medium text-gray-700">Fecha de nacimiento *</label>
                <input
                  id="birthDate"
                  name="birthDate"
                  value={registerData.birthDate}
                  onChange={handleRegisterChange}
                  type="date"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="testType" className="text-sm font-medium text-gray-700">Tipo de prueba que necesitas *</label>
                <select
                  id="testType"
                  name="testType"
                  value={registerData.testType}
                  onChange={handleRegisterChange}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">Selecciona una opción</option>
                  {testOptions.map((test) => (
                    <option key={test} value={test}>{test}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex flex-col gap-3">
                <button type="submit" className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed" disabled={registerLoading}>
                  {registerLoading ? 'Enviando...' : 'Registrarme como paciente'}
                </button>
                {registerStatus && (
                  <p className={`text-sm ${registerStatus.type === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {registerStatus.message}
                  </p>
                )}
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-sky-100 bg-white/80 p-8 shadow-lg shadow-sky-100/60">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Servicios</p>
            <h3 className="mt-1 text-xl font-semibold text-gray-900">Pruebas disponibles para agendar</h3>
            <p className="mt-2 text-sm text-gray-600">Consulta las pruebas activas antes de finalizar tu registro. Los precios se cotizan después del contacto con nuestro equipo.</p>

            <div className="mt-5 grid gap-4 text-sm text-gray-700 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-3">
              {testsError && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">{testsError}</div>}
              <div className="space-y-3">
                {testsLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 rounded-full bg-sky-100 animate-pulse" />
                    <div className="h-4 w-2/3 rounded-full bg-sky-100 animate-pulse" />
                    <div className="h-4 w-1/2 rounded-full bg-sky-100 animate-pulse" />
                  </div>
                ) : activeTests.length > 0 ? (
                  visibleTests.map((test) => {
                    const testName = test.name ?? test.Name
                    const code = test.code ?? test.Code
                    const unit = test.defaultUnit ?? test.DefaultUnit
                    return (
                      <div key={code || testName} className="flex items-start justify-between rounded-2xl border border-sky-100 bg-white/60 px-4 py-3 shadow-sm">
                        <div>
                          <p className="font-semibold text-gray-900">{testName}</p>
                          <p className="text-xs text-gray-500">{unit ? `Unidad de referencia: ${unit}` : code ? `Código: ${code}` : 'Prueba disponible'}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Activa</span>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">No hay servicios activos disponibles en este momento.</div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 rounded-2xl bg-sky-50/70 p-3 text-xs font-semibold text-sky-700 shadow-inner">
                <button
                  type="button"
                  onClick={() => setVisibleStart((prev) => (prev - 1 + totalActiveTests) % totalActiveTests)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={testsLoading || totalActiveTests <= 5}
                  aria-label="Pruebas anteriores"
                >
                  ←
                </button>
                <div className="rounded-full bg-white px-4 py-2 text-[11px] uppercase tracking-wide text-sky-800">
                  {totalActiveTests > 0 ? `Mostrando ${visibleCount} de ${totalActiveTests}` : '0 de 0'}
                </div>
                <button
                  type="button"
                  onClick={() => setVisibleStart((prev) => (prev + 1) % totalActiveTests)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={testsLoading || totalActiveTests <= 5}
                  aria-label="Pruebas siguientes"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-gray-100 bg-white/80 p-8 shadow-lg shadow-gray-100/60 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">¿Qué puedes esperar el día de tu cita?</h2>
            <p className="mt-2 text-sm text-gray-600">Queremos que vivas una experiencia cómoda y segura de principio a fin.</p>
            <ul className="mt-6 space-y-4 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                Recepción ágil con tu documento y el correo de confirmación.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                Personal certificado y salas confortables para la toma de muestras.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                Acompañamiento para pacientes pediátricos y adultos mayores.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                Resultados disponibles en línea y entrega física según necesidad.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-sky-500 via-sky-600 to-emerald-500 p-6 text-white">
            <p className="text-xs uppercase tracking-widest text-white/80">Pacientes felices</p>
            <p className="mt-3 text-lg font-semibold">"El proceso de agendamiento fue inmediato y me atendieron con calidez desde el primer contacto."</p>
            <p className="mt-4 text-sm text-white/80">Laura G. · Paciente desde 2023</p>
            <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">¿Tienes dudas sobre una prueba específica?</p>
              <p className="mt-2">Escríbenos por WhatsApp al <span className="font-semibold">+57 320 111 2233</span> o agenda una llamada con un asesor.</p>
            </div>
          </div>
        </section>
      </main>

      <footer id="contacto" className="border-t bg-white/80 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-semibold text-gray-900">LABOTEC</p>
            <p className="text-xs text-gray-500">Resultados confiables para decisiones seguras.</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-gray-700">Línea de atención: <span className="font-semibold text-sky-600">(601) 555 1212</span></p>
            <p className="font-medium text-gray-700">Correo: <a href="mailto:contacto@labotec.com" className="text-sky-600 hover:text-sky-700">contacto@labotec.com</a></p>
          </div>
          <div className="space-y-2 text-xs text-gray-500">
            <p>Horarios de toma de muestras: Lunes a sábado de 6:00 a.m. a 6:00 p.m.</p>
            <p><Link to="/login" className="text-sky-600 hover:text-sky-700">Acceso para personal médico</Link></p>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">© {new Date().getFullYear()} LABOTEC. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
