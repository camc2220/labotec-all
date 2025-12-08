import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ShieldCheck, Microscope, Award } from '../icons';
import { COMPANY_INFO } from '../constants';

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col gap-16 pb-16">
      
      {/* Hero Section */}
      <section className="relative bg-lab-900 text-white overflow-hidden">
         {/* Abstract BG pattern */}
         <div className="absolute inset-0 opacity-10">
             <div className="absolute right-0 top-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
             <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-400 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>
         </div>

         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
            <div className="max-w-3xl">
              <span className="inline-block py-1 px-3 rounded-full bg-blue-500/20 text-blue-200 text-sm font-semibold mb-6 border border-blue-500/30">
                Líderes en Santo Domingo Este
              </span>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                Resultados precisos para tu tranquilidad.
              </h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Tecnología de punta y calidez humana. Accede a tus resultados en línea y agenda tus citas desde la comodidad de tu hogar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/portal/citas" className="inline-flex items-center justify-center px-8 py-4 bg-white text-lab-900 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg">
                  Solicitar Cita
                  <ArrowRight className="ml-2" size={20} />
                </Link>
                <Link to="/servicios" className="inline-flex items-center justify-center px-8 py-4 border border-blue-400 bg-transparent text-white rounded-lg font-bold hover:bg-blue-800/50 transition">
                  Ver Análisis
                </Link>
              </div>
            </div>
         </div>
      </section>

      {/* Info Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-xl shadow-xl border-t-4 border-lab-600">
            <Clock className="text-lab-600 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Horarios Flexibles</h3>
            <p className="text-gray-600 mb-2">Abrimos temprano para tu comodidad.</p>
            <p className="font-medium text-lab-800">Lunes a Viernes: 8:00 AM - 6:00 PM</p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-xl border-t-4 border-lab-600">
             <ShieldCheck className="text-lab-600 mb-4" size={32} />
             <h3 className="text-xl font-bold mb-2">Resultados Seguros</h3>
             <p className="text-gray-600">
               Plataforma digital encriptada para descargar tus resultados históricos en PDF cuando los necesites.
             </p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-xl border-t-4 border-lab-600">
             <Microscope className="text-lab-600 mb-4" size={32} />
             <h3 className="text-xl font-bold mb-2">Tecnología Avanzada</h3>
             <p className="text-gray-600">
               Equipos automatizados de última generación que garantizan la máxima precisión en cada prueba.
             </p>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nuestros Servicios Principales</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Ofrecemos un catálogo completo de análisis clínicos, desde rutinas preventivas hasta pruebas especializadas.
            </p>
         </div>

         <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "Hematología Completa", 
              "Bioquímica Clínica", 
              "Hormonas", 
              "Marcadores Tumorales", 
              "Microbiología", 
              "Pruebas de Embarazo", 
              "Uroanálisis", 
              "Pruebas Especiales"
            ].map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition border border-gray-100 flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-lab-500"></div>
                 <span className="font-medium text-gray-800">{service}</span>
              </div>
            ))}
         </div>
         
         <div className="text-center mt-10">
            <Link to="/servicios" className="text-lab-600 font-semibold hover:text-lab-800 inline-flex items-center gap-1">
              Ver catálogo completo <ArrowRight size={16} />
            </Link>
         </div>
      </section>

      {/* Trust/Stats */}
      <section className="bg-lab-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                 <div className="text-4xl font-bold text-lab-800 mb-2">4.7/5</div>
                 <div className="text-gray-600 text-sm uppercase tracking-wide">Calificación Google</div>
              </div>
              <div>
                 <div className="text-4xl font-bold text-lab-800 mb-2">+5k</div>
                 <div className="text-gray-600 text-sm uppercase tracking-wide">Pacientes Atendidos</div>
              </div>
              <div>
                 <div className="text-4xl font-bold text-lab-800 mb-2">24h</div>
                 <div className="text-gray-600 text-sm uppercase tracking-wide">Entrega Promedio</div>
              </div>
              <div>
                 <div className="text-4xl font-bold text-lab-800 mb-2">100%</div>
                 <div className="text-gray-600 text-sm uppercase tracking-wide">Confiabilidad</div>
              </div>
           </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
         <div className="bg-gradient-to-r from-lab-800 to-lab-600 rounded-2xl p-12 text-white shadow-2xl relative overflow-hidden">
             <Award className="absolute top-4 right-4 text-white/10 w-32 h-32" />
             <h2 className="text-3xl font-bold mb-4 relative z-10">¿Listo para realizar tus análisis?</h2>
             <p className="text-blue-100 mb-8 max-w-xl mx-auto relative z-10">
               Evita filas y tiempos de espera. Agenda tu cita en línea hoy mismo y recibe atención prioritaria.
             </p>
             <Link to="/portal/citas" className="inline-block px-8 py-3 bg-white text-lab-800 font-bold rounded-lg hover:bg-gray-100 transition relative z-10">
               Agendar Cita Ahora
             </Link>
         </div>
      </section>
    </div>
  );
};