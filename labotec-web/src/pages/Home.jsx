
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

// Iconos simples simulados con SVG para evitar dependencias externas masivas
const StarIcon = () => (
  <svg className="h-4 w-4 text-amber-400 fill-current" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

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
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleStart, setVisibleStart] = useState(0)

  const normalizeText = (value) => (value ?? '').toString().toLowerCase()

  const handleRegisterChange = (event) => {
    const { name, value } = event.target
    setRegisterData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    const hasEmptyFields = Object.values(registerData).some((value) => !value)
    if (hasEmptyFields) {
      setRegisterStatus({ type: 'error', message: 'Por favor completa todos los campos.' })
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
      setRegisterStatus({ type: 'success', message: `¡Registro exitoso! Ya puedes iniciar sesión.` })
      setRegisterData(initialRegister)
    } catch (error) {
      const serverMessage = error?.response?.data?.[0]?.description || 'Error al registrarse.'
      setRegisterStatus({ type: 'error', message: serverMessage })
    } finally {
      setRegisterLoading(false)
    }
  }

  useEffect(() => {
    const loadActiveTests = async () => {
      setTestsLoading(true)
      try {
        const response = await api.get('/api/labtests/public')
        const items = response.data.items ?? response.data.Items ?? response.data ?? []
        setActiveTests(items.filter((item) => Boolean(item.active ?? item.Active ?? true)))
      } catch (error) {
        setTestsError('No pudimos cargar los servicios.')
      } finally {
        setTestsLoading(false)
      }
    }
    loadActiveTests()
  }, [])

  const filteredTests = searchQuery
    ? activeTests.filter((test) => {
        const name = normalizeText(test.name ?? test.Name)
        const code = normalizeText(test.code ?? test.Code)
        const query = normalizeText(searchQuery)
        return name.includes(query) || code.includes(query)
      })
    : activeTests

  const visibleTests = filteredTests.slice(visibleStart, visibleStart + 5)

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-sky-100">
      {/* Navegación Superior */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-sky-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-sky-200">L</div>
            <span className="text-xl font-bold tracking-tight text-gray-800">Labotec SRL</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-sky-600 transition">Iniciar Sesión</Link>
            <a href="#registro" className="bg-sky-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-sky-700 transition shadow-md shadow-sky-100">Registro Online</a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section - Estilo Google Business */}
        <section className="pt-8 pb-12 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">Labotec SRL</h1>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-800">4.7</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4].map(i => <StarIcon key={i} />)}
                    <svg className="h-4 w-4 text-amber-400 fill-current opacity-60" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  </div>
                  <span className="text-gray-500 text-sm">(3 opiniones)</span>
                </div>
                <p className="text-gray-600 font-medium">Laboratorio de análisis clínicos</p>
                <div className="flex flex-wrap gap-6 pt-2 text-sm font-semibold text-sky-700">
                  <button className="flex items-center gap-2 px-4 py-2 bg-sky-50 rounded-full hover:bg-sky-100 transition"><span></span> Indicaciones</button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-sky-50 rounded-full hover:bg-sky-100 transition"><span></span> Guardar</button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-sky-50 rounded-full hover:bg-sky-100 transition"><span></span> Compartir</button>
                </div>
              </div>
              <div className="hidden lg:block w-72 h-48 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                <img src="https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=400" alt="Interior laboratorio" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Info Grid */}
        <section className="py-12 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="bg-sky-100 p-3 rounded-xl text-sky-600"></div>
              <div>
                <p className="text-sm text-gray-500 mb-1 font-semibold uppercase tracking-wider">Ubicación</p>
                <p className="text-gray-800 leading-relaxed">Apart. 1-A, Avenida Miguel Díaz Esq, Peatonal 17 Manz. 6, Santo Domingo Este 11802</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="bg-sky-100 p-3 rounded-xl text-sky-600"></div>
              <div>
                <p className="text-sm text-gray-500 mb-1 font-semibold uppercase tracking-wider">Horario</p>
                <p className="text-emerald-600 font-bold">Cerrado ⋅ Abre a las 8:00 a.m. del lunes</p>
                <p className="text-xs text-gray-400 mt-1">Lunes a Sábado: 8:00 AM - 6:00 PM</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="bg-sky-100 p-3 rounded-xl text-sky-600"></div>
              <div>
                <p className="text-sm text-gray-500 mb-1 font-semibold uppercase tracking-wider">Teléfono</p>
                <p className="text-gray-800 font-bold text-lg">(809) 695-1289</p>
                <p className="text-xs text-gray-400 mt-1">Atención inmediata vía WhatsApp</p>
              </div>
            </div>
          </div>
        </section>

        {/* Catálogo de Pruebas (Funcionalidad Preservada) */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
              <div className="space-y-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-900">Catálogo de Servicios</h2>
                <p className="text-gray-500">Consulta nuestras pruebas disponibles para agendamiento.</p>
              </div>
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  placeholder="Buscar prueba o código..."
                  className="w-full px-5 py-3 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-sky-50 focus:border-sky-400 outline-none transition"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="absolute right-4 top-3.5 text-gray-400"></span>
              </div>
            </div>

            <div className="grid gap-4">
              {testsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl"></div>)}
                </div>
              ) : visibleTests.length > 0 ? (
                visibleTests.map((test) => (
                  <div key={test.code || test.name} className="flex items-center justify-between p-5 bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100 rounded-2xl transition group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-sky-600 font-bold group-hover:bg-sky-600 group-hover:text-white transition">
                        {test.code?.substring(0, 2) || "TS"}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{test.name || test.Name}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-tighter">{test.code || "Prueba General"} • {test.defaultUnit || "Consultar unidad"}</p>
                      </div>
                    </div>
                    <div className="text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-full">Activa</div>
                  </div>
                ))
              ) : (
                <p className="text-center py-10 text-gray-400">No se encontraron resultados.</p>
              )}
            </div>
          </div>
        </section>

        {/* Opiniones (Nueva Estructura de Datos) */}
        <section className="py-16 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-bold text-gray-900">Resumen de opiniones</h2>
              <button className="text-sky-600 font-bold hover:underline">Escribir una opinión</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { author: "LUISANA GARCIA", date: "Hace 11 meses", text: "Excelente servicio", badge: "1 opinión" },
                { author: "Yarelin Sierra", date: "Hace 2 años", text: "Servicio rápido", badge: "Local Guide · 31 opiniones" },
                { author: "caraballo", date: "Hace 6 meses", text: "Muy profesionales en la toma de muestras.", badge: "1 opinión · 2 fotos" }
              ].map((review, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">{review.author[0]}</div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{review.author}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">{review.badge}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => <StarIcon key={i} />)}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">"{review.text}"</p>
                  <p className="text-xs text-gray-400">{review.date}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Registro de Paciente (Funcionalidad Preservada) */}
        <section id="registro" className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-sky-600 rounded-[2.5rem] p-10 md:p-16 text-white shadow-2xl shadow-sky-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div className="relative z-10 space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-4xl font-bold">Registro de Pacientes</h2>
                  <p className="text-sky-100">Crea tu cuenta hoy y gestiona tus resultados 24/7</p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <input
                      name="fullName"
                      placeholder="Nombre Completo"
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 outline-none focus:bg-white focus:text-gray-900 transition placeholder:text-sky-100"
                      value={registerData.fullName}
                      onChange={handleRegisterChange}
                      required
                    />
                  </div>
                  <input
                    name="documentId"
                    placeholder="Documento Identidad"
                    className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 outline-none focus:bg-white focus:text-gray-900 transition placeholder:text-sky-100"
                    value={registerData.documentId}
                    onChange={handleRegisterChange}
                    required
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="Correo Electrónico"
                    className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 outline-none focus:bg-white focus:text-gray-900 transition placeholder:text-sky-100"
                    value={registerData.email}
                    onChange={handleRegisterChange}
                    required
                  />
                  <input
                    name="password"
                    type="password"
                    placeholder="Contraseña"
                    className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 outline-none focus:bg-white focus:text-gray-900 transition placeholder:text-sky-100"
                    value={registerData.password}
                    onChange={handleRegisterChange}
                    required
                  />
                  <input
                    name="phone"
                    placeholder="Teléfono"
                    className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 outline-none focus:bg-white focus:text-gray-900 transition placeholder:text-sky-100"
                    value={registerData.phone}
                    onChange={handleRegisterChange}
                    required
                  />
                  <div className="md:col-span-2">
                    <button 
                      type="submit" 
                      className="w-full bg-white text-sky-600 font-bold py-5 rounded-2xl hover:bg-gray-50 transition shadow-xl"
                      disabled={registerLoading}
                    >
                      {registerLoading ? 'Procesando...' : 'Completar Registro'}
                    </button>
                    {registerStatus && (
                      <p className={`text-center mt-4 text-sm font-semibold ${registerStatus.type === 'success' ? 'text-white' : 'text-rose-200'}`}>
                        {registerStatus.message}
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* También se buscó (Sección decorativa informativa) */}
        <section className="py-16 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2"><span></span> También se buscó</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Lab. Lic Mercedes Rodríguez", rate: "4.6", tags: "Laboratorio" },
                { name: "Lab. Clinico Beltre Rojas", rate: "5.0", tags: "Médico" },
                { name: "Lab. Clinico Tronilab", rate: "4.7", tags: "Laboratorio" },
                { name: "LAPMERCO Laboratorio", rate: "N/A", tags: "Patología" }
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="max-w-[70%]">
                    <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500">{item.tags}</p>
                  </div>
                  <div className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-md">{item.rate} ★</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="text-white font-bold tracking-widest text-lg uppercase">Labotec SRL</p>
          <p className="text-sm max-w-md mx-auto">Resultados confiables, atención humana y procesos rápidos para tu bienestar y el de tu familia.</p>
          <div className="pt-6 border-t border-gray-800 mt-8 text-[10px] uppercase tracking-widest">
            © {new Date().getFullYear()} LABOTEC SRL • Santo Domingo Este • RD
          </div>
        </div>
      </footer>
    </div>
  )
}

