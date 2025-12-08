import React from 'react'
import { Link } from 'react-router-dom'

const highlights = [
  {
    title: 'Resultados en línea 24/7',
  },
  {
    title: 'Tomas a domicilio',
  },
  {
    title: 'Atención humana',
  },
]

const services = [
  'Perfil completo de laboratorio',
  'Prueba de COVID-19',
  'Perfil tiroideo',
  'Panel prenatal',
  'Chequeo ejecutivo',
  'Exámenes ocupacionales',
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 font-semibold">L</div>
            <div>
              <p className="text-xs uppercase tracking-widest text-sky-600">LABOTEC</p>
              <p className="text-sm font-semibold text-gray-900">Laboratorio Clínico</p>
            </div>
          </div>
          <nav className="hidden gap-6 md:flex">
            <a href="#servicios" className="hover:text-sky-600">Servicios</a>
            <a href="#citas" className="hover:text-sky-600">Mis citas</a>
            <a href="#contacto" className="hover:text-sky-600">Contacto</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden text-sky-600 hover:text-sky-700 md:inline">Iniciar sesión</Link>
            <Link
              to="/login?next=/app/appointments"
              className="rounded-full bg-sky-600 px-4 py-2 text-white shadow hover:bg-sky-700"
            >
              Ir a mis citas
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-10 lg:py-16">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Cuidado clínico confiable
            </span>
            <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl lg:text-5xl">
              Tu salud primero con un portal sencillo y rápido
            </h1>
            <p className="text-base text-gray-600 sm:text-lg">
              Accede a tus citas, resultados y servicios destacados desde un solo lugar. LABOTEC simplifica tu experiencia para que te concentres en sentirte bien.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              {highlights.map((item) => (
                <div key={item.title} className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  {item.title}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                to="/login?next=/app/appointments"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700"
              >
                Ver mis citas
              </Link>
              <a
                href="#servicios"
                className="inline-flex items-center justify-center rounded-full border border-sky-100 bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-200 hover:text-sky-800"
              >
                Explorar servicios
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-6 -top-6 hidden h-28 w-28 rounded-3xl bg-emerald-200/50 blur-2xl lg:block" />
            <div className="absolute -bottom-8 -right-8 hidden h-32 w-32 rounded-full bg-sky-200/60 blur-2xl lg:block" />
            <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70">
              <p className="text-sm font-semibold text-gray-900">Portal de pacientes LABOTEC</p>
              <p className="mt-2 text-sm text-gray-600">Todo lo que necesitas en un panel limpio y fácil de usar.</p>
              <div className="mt-6 grid gap-4 text-sm text-gray-700">
                <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-sky-50/60 p-4">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Citas en segundos</p>
                    <p className="text-xs text-gray-600">Ingresa y revisa disponibilidad sin llenar formularios extensos.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <div>
                    <p className="font-semibold text-gray-900">Resultados siempre contigo</p>
                    <p className="text-xs text-gray-600">Consulta tus reportes, compártelos y descárgalos cuando lo necesites.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4">
                  <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                  <div>
                    <p className="font-semibold text-gray-900">Acompañamiento personalizado</p>
                    <p className="text-xs text-gray-600">Un equipo atento a resolver tus dudas por chat, teléfono o en sede.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="servicios" className="grid gap-6 rounded-3xl bg-white/80 p-8 shadow-lg shadow-sky-100/60 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Servicios destacados</p>
            <h2 className="text-2xl font-semibold text-gray-900">Pruebas confiables con resultados oportunos</h2>
            <p className="text-sm text-gray-600">
              Selecciona el examen que necesitas y nuestro equipo coordinará la mejor experiencia para ti. Contamos con cobertura en sedes principales y servicio móvil.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-2">
              {services.map((service) => (
                <div key={service} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-3 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  {service}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 shadow-lg shadow-emerald-100/50">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Atención cálida</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">Resultados rápidos y soporte humano en cada visita</p>
            <p className="mt-3 text-sm text-gray-600">Más del 85% de los estudios se entregan en menos de 24 horas.</p>
            <div className="mt-6 space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                <p>Salas cómodas y personal certificado para todas tus pruebas.</p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                <p>Entrega digital y física según tus necesidades.</p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
                <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                <p>Asesoría para pacientes pediátricos, adultos mayores y empresas.</p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="citas"
          className="grid gap-6 rounded-3xl border border-gray-100 bg-white/80 p-8 shadow-lg shadow-gray-100/60 lg:grid-cols-[1fr_0.9fr]"
        >
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold text-gray-900">Accede a tus citas en segundos</h2>
            <p className="text-sm text-gray-600">
              Reemplazamos el formulario extenso por un acceso directo. Ingresa al portal, revisa tus próximas citas y gestiona cambios con un par de clics.
            </p>
            <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
              <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-sky-50/60 px-4 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-600" />
                <p>Ver calendario y confirmar disponibilidad.</p>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                <p>Solicitar cambios o agregar notas especiales.</p>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                <p>Recibir recordatorios y ubicaciones de sede.</p>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <p>Descargar comprobantes y resultados posteriores.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Link
                to="/login?next=/app/appointments"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-sky-700"
              >
                Entrar para ver mis citas
              </Link>
              <p className="text-xs text-gray-500">Si aún no tienes usuario, solicita tu acceso con nuestro equipo de recepción.</p>
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-3xl bg-gradient-to-br from-sky-500 via-sky-600 to-emerald-500 p-6 text-white shadow-lg shadow-sky-200/60">
            <p className="text-xs uppercase tracking-widest text-white/80">Experiencia simplificada</p>
            <p className="mt-3 text-lg font-semibold">"Encontré mis citas y resultados en segundos. El portal es claro y elegante."</p>
            <p className="mt-4 text-sm text-white/80">Laura G. · Paciente desde 2023</p>
            <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">¿Necesitas ayuda?</p>
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
