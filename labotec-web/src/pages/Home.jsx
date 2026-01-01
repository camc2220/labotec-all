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

const reviews = [
  {
    author: 'LUISANA GARCIA',
    rating: 5,
    text: 'Excelente servicio',
    date: 'Hace 10 meses',
    initial: 'L'
  },
  {
    author: 'Yarelin Sierra',
    rating: 5,
    text: 'Servicio rápido',
    date: 'Hace 2 años',
    initial: 'Y',
    badge: 'Local Guide'
  },
  {
    author: 'Caraballo',
    rating: 5,
    text: '',
    date: 'Hace 6 meses',
    initial: 'C'
  }
]

function StarIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${filled ? 'text-yellow-400' : 'text-gray-300 border-gray-300'}`}>
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
  )
}

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
  const [showAll, setShowAll] = useState(false)

  const handleRegisterChange = (event) => {
    const { name, value } = event.target
    const nextValue = name === 'documentId'
      ? value.replace(/\D/g, '').slice(0, 11)
      : value
    setRegisterData((prev) => ({ ...prev, [name]: nextValue }))
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    setRegisterStatus(null)
    if (registerData.documentId.length !== 11) {
      setRegisterStatus({ type: 'error', message: 'La cédula/ID debe tener exactamente 11 dígitos.' })
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
      setRegisterStatus({ type: 'success', message: `¡Gracias ${registerData.fullName}! Tu cuenta ha sido creada. Por favor inicia sesión.` })
      setRegisterData(initialRegister)
    } catch (error) {
      console.error(error)
      const serverMessage = error?.response?.data?.[0]?.description || 'Error al registrarse. Verifique sus datos.'
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
        const filtered = items.filter((item) => Boolean(item.active ?? item.Active ?? true))
        setActiveTests(filtered) // Guardamos todos los activos
      } catch (error) {
        console.error(error)
      } finally {
        setTestsLoading(false)
      }
    }
    loadActiveTests()
  }, [])

  const displayedTests = showAll ? activeTests : activeTests.slice(0, 6)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-sky-100 selection:text-sky-700">
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur shadow-sm border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-white shadow-md shadow-sky-200">
              <span className="text-xl font-bold">L</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight tracking-tight text-slate-900">Labotec SRL</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Laboratorio Clínico</span>
            </div>
          </div>
          
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
            <a href="#servicios" className="hover:text-sky-600 transition-colors">Servicios</a>
            <a href="#resenas" className="hover:text-sky-600 transition-colors">Opiniones</a>
            <a href="#ubicacion" className="hover:text-sky-600 transition-colors">Ubicación</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-sky-600 px-3 py-2">
              Iniciar Sesión
            </Link>
            <a href="#registro" className="hidden sm:inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 transition-all">
              Agendar Cita
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
              <div className="lg:col-span-6 text-center lg:text-left">
                <div className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-600 mb-6">
                  <span className="flex h-2 w-2 rounded-full bg-sky-600 mr-2"></span>
                  Abierto a las 8:00 a.m.
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl mb-6">
                  Tu salud en manos <br className="hidden lg:block"/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">expertas y confiables</span>
                </h1>
                <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  En <strong>Labotec SRL</strong> ofrecemos análisis clínicos precisos con entrega rápida de resultados. 
                  Regístrate hoy para gestionar tus citas y resultados en línea.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <a href="#registro" className="w-full sm:w-auto rounded-xl bg-sky-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-200 hover:bg-sky-500 hover:-translate-y-0.5 transition-all duration-200">
                    Registrarme
                  </a>
                  <a href="#ubicacion" className="w-full sm:w-auto rounded-xl bg-white border border-slate-200 px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition-all duration-200">
                    Cómo llegar
                  </a>
                </div>

                <div className="mt-10 flex items-center justify-center lg:justify-start gap-4 text-sm font-medium text-slate-500">
                  <div className="flex items-center gap-1">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(i => <StarIcon key={i} filled={i <= 4 || i === 4.7} />)}
                    </div>
                    <span className="text-slate-800 font-bold ml-1">4.7</span>
                    <span className="text-slate-400 mx-1">•</span>
                    <span className="underline decoration-slate-300 underline-offset-2">3 reseñas en Google</span>
                  </div>
                </div>
              </div>

              {/* Registration Card */}
              <div className="lg:col-span-6 mt-16 lg:mt-0" id="registro">
                <div className="relative rounded-3xl bg-white p-2 shadow-2xl ring-1 ring-slate-200">
                  <div className="rounded-2xl bg-slate-50/50 p-6 sm:p-8">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Crear cuenta de paciente</h3>
                      <p className="text-sm text-slate-500 mt-1">Completa tus datos para agendar tu primera cita.</p>
                    </div>

                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre Completo</label>
                          <input required name="fullName" value={registerData.fullName} onChange={handleRegisterChange} className="w-full rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="Ej. Juan Pérez" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Cédula / ID</label>
                          <input
                            required
                            name="documentId"
                            value={registerData.documentId}
                            onChange={handleRegisterChange}
                            className="w-full rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500"
                            placeholder="00000000000"
                            inputMode="numeric"
                            minLength={11}
                            maxLength={11}
                            pattern="[0-9]{11}"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono</label>
                          <input required name="phone" value={registerData.phone} onChange={handleRegisterChange} className="w-full rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="(809) 000-0000" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Nacimiento</label>
                          <input required type="date" name="birthDate" value={registerData.birthDate} onChange={handleRegisterChange} className="w-full rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Correo Electrónico</label>
                          <input required type="email" name="email" value={registerData.email} onChange={handleRegisterChange} className="w-full rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="tucorreo@ejemplo.com" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Contraseña</label>
                          <input required type="password" name="password" value={registerData.password} onChange={handleRegisterChange} className="w-full rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="Mínimo 8 caracteres" minLength={8} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Interés Principal</label>
                          <select required name="testType" value={registerData.testType} onChange={handleRegisterChange} className="w-full rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
                            <option value="">Selecciona un servicio...</option>
                            {testOptions.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button type="submit" disabled={registerLoading} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all">
                          {registerLoading ? 'Procesando...' : 'Crear mi cuenta'}
                        </button>
                      </div>

                      {registerStatus && (
                        <div className={`rounded-lg p-4 text-sm font-medium border ${registerStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
                          {registerStatus.message}
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats / Info Bar */}
        <section className="bg-white border-y border-slate-100 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
               <div className="px-4">
                 <p className="text-4xl font-bold text-slate-900">4.7</p>
                 <div className="flex justify-center text-yellow-400 my-2">
                   {[1,2,3,4,5].map(i => <StarIcon key={i} filled={i <= 4 || i === 4.7} />)}
                 </div>
                 <p className="text-sm font-medium text-slate-500">Calificación en Google</p>
               </div>
               <div className="px-4 pt-8 sm:pt-0">
                 <p className="text-4xl font-bold text-slate-900">8:00 AM</p>
                 <p className="text-xs uppercase font-bold text-emerald-600 my-2 bg-emerald-50 inline-block px-2 py-1 rounded">Abierto</p>
                 <p className="text-sm font-medium text-slate-500">Hora de apertura</p>
               </div>
               <div className="px-4 pt-8 sm:pt-0">
                 <p className="text-4xl font-bold text-slate-900">100+</p>
                 <p className="text-2xl text-slate-300 my-1">🔬</p>
                 <p className="text-sm font-medium text-slate-500">Tipos de análisis</p>
               </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="servicios" className="py-20 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Nuestros Servicios</h2>
              <p className="mt-4 text-lg text-slate-600">
                Realizamos una amplia gama de pruebas de laboratorio con equipos modernos y personal calificado.
              </p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testsLoading ? (
                [1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-2xl shadow-sm animate-pulse"></div>)
              ) : displayedTests.length > 0 ? (
                displayedTests.map((test) => (
                  <div key={test.id || test.code} className="group relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-sky-200">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                        </svg>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">Disponible</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">{test.name ?? test.Name}</h3>
                    <p className="mt-1 text-sm text-slate-500">Código: {test.code ?? test.Code}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-slate-500">No hay pruebas activas para mostrar.</div>
              )}
            </div>
            
            <div className="mt-12 text-center">
              {activeTests.length > 6 && (
                <button 
                  onClick={() => setShowAll(!showAll)}
                  className="rounded-full border border-sky-200 bg-white px-6 py-2.5 text-sm font-bold text-sky-600 shadow-sm transition hover:bg-sky-50 hover:border-sky-300"
                >
                  {showAll ? 'Ver menos' : 'Ver catálogo completo de servicios'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section id="resenas" className="py-20 bg-white border-t border-slate-100">
           <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
             <div className="flex flex-col md:flex-row items-end justify-between mb-10 gap-4">
               <div className="max-w-xl">
                 <h2 className="text-3xl font-bold tracking-tight text-slate-900">Reseñas de pacientes</h2>
                 <p className="mt-2 text-lg text-slate-600">Lo que dicen las personas que confían en nosotros.</p>
               </div>
               <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                  <span className="text-2xl font-bold text-slate-900">4.7</span>
                  <div className="flex text-yellow-400">
                    {[1,2,3,4,5].map(i => <StarIcon key={i} filled={i <= 4} />)}
                  </div>
                  <span className="text-xs text-slate-500 ml-2">(3 reseñas en Google)</span>
               </div>
             </div>

             <div className="grid gap-6 md:grid-cols-3">
               {reviews.map((review, idx) => (
                 <div key={idx} className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="h-10 w-10 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                         {review.initial}
                       </div>
                       <div>
                         <p className="font-semibold text-slate-900 text-sm">{review.author}</p>
                         <p className="text-xs text-slate-500">{review.date}</p>
                       </div>
                    </div>
                    <div className="flex text-yellow-400 mb-3">
                      {[...Array(review.rating)].map((_, i) => <StarIcon key={i} filled={true} />)}
                    </div>
                    <p className="text-slate-700 text-sm flex-1">{review.text || <span className="italic text-slate-400">Sin comentario escrito</span>}</p>
                    {review.badge && (
                      <div className="mt-4 pt-4 border-t border-slate-50">
                        <span className="text-xs font-medium text-orange-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>
                          {review.badge}
                        </span>
                      </div>
                    )}
                 </div>
               ))}
             </div>
           </div>
        </section>

        {/* Location Section */}
        <section id="ubicacion" className="py-20 bg-slate-900 text-white overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Encuéntranos fácilmente</h2>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="flex-none rounded-lg bg-white/10 p-3 h-fit">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-sky-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Dirección</h3>
                      <p className="text-slate-400 mt-1 leading-relaxed">
                        Apart. 1-A, Avenida Miguel Díaz esq.<br/>
                        Peatonal 17, Manzana 6<br/>
                        Santo Domingo Este, 11802
                      </p>
                      <p className="mt-2 text-xs text-slate-500 font-mono">Code: G5GP+PG Santo Domingo Este</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                     <div className="flex-none rounded-lg bg-white/10 p-3 h-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-sky-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                     </div>
                     <div>
                       <h3 className="font-semibold text-white">Contacto</h3>
                       <p className="text-slate-400 mt-1">(809) 695-1289</p>
                       <p className="text-sm text-emerald-400 mt-2 font-medium">Abre a las 8:00 a.m.</p>
                     </div>
                  </div>
                </div>
                
                <div className="mt-10 flex flex-wrap gap-4">
                  <a 
                    href="https://www.google.com/maps/dir//Labotec+SRL+Santo+Domingo+Este" 
                    target="_blank" 
                    rel="noreferrer"
                    className="rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 transition-colors"
                  >
                    Cómo llegar
                  </a>
                  <a 
                    href="tel:8096951289" 
                    className="rounded-lg bg-white/10 border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                  >
                    Llamar ahora
                  </a>
                </div>
              </div>

              {/* Decorative Map Card */}
              <div className="relative h-64 lg:h-80 w-full rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shadow-2xl">
                 {/* Abstract Map UI */}
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="relative">
                      <span className="flex h-4 w-4 absolute -top-1 -right-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500"></span>
                      </span>
                      <div className="h-12 w-12 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                           <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                         </svg>
                      </div>
                    </div>
                    <div className="mt-3 bg-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-bold text-slate-900">
                      Labotec SRL
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
             <div className="col-span-1">
               <div className="flex items-center gap-2 mb-4">
                 <div className="flex h-8 w-8 items-center justify-center rounded bg-sky-600 text-white font-bold text-sm">L</div>
                 <span className="text-lg font-bold text-slate-900">Labotec SRL</span>
               </div>
               <p className="text-sm text-slate-500 max-w-xs">
                 Comprometidos con la excelencia en diagnósticos clínicos para el cuidado de tu salud.
               </p>
             </div>
             <div>
               <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Enlaces</h3>
               <ul className="space-y-3 text-sm text-slate-600">
                 <li><a href="#servicios" className="hover:text-sky-600">Servicios</a></li>
                 <li><a href="#ubicacion" className="hover:text-sky-600">Contacto</a></li>
                 <li><Link to="/login" className="hover:text-sky-600">Portal de Pacientes</Link></li>
               </ul>
             </div>
             <div>
               <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Legal</h3>
               <ul className="space-y-3 text-sm text-slate-600">
                 <li><a href="#" className="hover:text-sky-600">Privacidad</a></li>
                 <li><a href="#" className="hover:text-sky-600">Términos de uso</a></li>
               </ul>
             </div>
           </div>
           <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
             <p className="text-sm text-slate-500">© {new Date().getFullYear()} Labotec SRL. Todos los derechos reservados.</p>
             <p className="text-xs text-slate-400">Desarrollado para el cuidado de la salud.</p>
           </div>
        </div>
      </footer>
    </div>
  )
}