import React from 'react';
import { MapPin, Phone, Mail, Clock } from '../icons';
import { COMPANY_INFO } from '../constants';

export const Contact: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="bg-lab-800 py-16 text-center text-white">
        <h1 className="text-4xl font-bold mb-4">Contáctanos</h1>
        <p className="text-blue-100">Estamos aquí para atenderte.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Info Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 h-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Información de Contacto</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-lab-100 p-3 rounded-full text-lab-600">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Dirección</h3>
                  <p className="text-gray-600 max-w-xs">{COMPANY_INFO.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-lab-100 p-3 rounded-full text-lab-600">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Teléfono</h3>
                  <p className="text-gray-600">{COMPANY_INFO.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-lab-100 p-3 rounded-full text-lab-600">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Correo</h3>
                  <p className="text-gray-600">{COMPANY_INFO.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-lab-100 p-3 rounded-full text-lab-600">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Horarios</h3>
                  <p className="text-gray-600 whitespace-pre-line">{COMPANY_INFO.schedule}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form & Map */}
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-bold mb-4">Envíanos un mensaje</h2>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Nombre" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-lab-500 outline-none" />
                  <input type="text" placeholder="Teléfono" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-lab-500 outline-none" />
                </div>
                <input type="email" placeholder="Correo Electrónico" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-lab-500 outline-none" />
                <textarea placeholder="Mensaje" rows={4} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-lab-500 outline-none"></textarea>
                <button className="w-full py-3 bg-lab-600 text-white font-bold rounded-lg hover:bg-lab-700 transition">Enviar Mensaje</button>
              </form>
            </div>

            {/* Map Embed Placeholder */}
            <div className="bg-gray-200 rounded-xl h-64 overflow-hidden relative shadow-lg">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3784.457891234567!2d-69.8!3d18.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDMwJzAwLjAiTiA2OcKwNDgnMDAuMCJX!5e0!3m2!1sen!2sdo!4v1620000000000!5m2!1sen!2sdo" 
                  width="100%" 
                  height="100%" 
                  style={{border:0}} 
                  allowFullScreen={true} 
                  loading="lazy"
                  title="Labotec Location"
                ></iframe>
                <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow text-xs">
                  <p className="font-bold">Labotec SRL</p>
                  <p>Santo Domingo Este</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};