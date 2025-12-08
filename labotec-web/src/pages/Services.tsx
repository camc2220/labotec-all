import React from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { LabTestService } from '../types';

const MOCK_SERVICES: LabTestService[] = [
  { id: '1', code: 'HEMO', name: 'Hemograma Completo', description: 'Evaluación de glóbulos rojos, blancos y plaquetas.', defaultPrice: 500, category: 'Hematología', active: true },
  { id: '2', code: 'LIPID', name: 'Perfil Lipídico', description: 'Colesterol Total, HDL, LDL, Triglicéridos.', defaultPrice: 1200, category: 'Bioquímica', active: true },
  { id: '3', code: 'GLU', name: 'Glucosa en Ayunas', description: 'Medición de azúcar en sangre.', defaultPrice: 300, category: 'Bioquímica', active: true },
  { id: '4', code: 'TSH', name: 'TSH (Tiroides)', description: 'Hormona estimulante de la tiroides.', defaultPrice: 850, category: 'Especial', active: true },
  { id: '5', code: 'URO', name: 'Uroanálisis', description: 'Análisis físico, químico y microscópico de orina.', defaultPrice: 400, category: 'Microbiología', active: true },
  { id: '6', code: 'HCG', name: 'Prueba de Embarazo (HCG)', description: 'Cualitativa en sangre.', defaultPrice: 600, category: 'Especial', active: true },
];

export const Services: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Catálogo de Servicios</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Realizamos una amplia variedad de análisis clínicos con los más altos estándares de calidad.
          </p>
        </div>

        {/* Search Bar - Visual only for demo */}
        <div className="max-w-md mx-auto mb-12 relative">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
           <input 
             type="text" 
             placeholder="Buscar análisis..." 
             className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 shadow-sm focus:ring-2 focus:ring-lab-500 focus:border-transparent outline-none"
           />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_SERVICES.map((service) => (
            <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition p-6 flex flex-col h-full">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-lab-50 text-lab-700 rounded-full text-xs font-semibold mb-2">
                  {service.category}
                </span>
                <h3 className="text-xl font-bold text-gray-900">{service.name}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-6 flex-grow">{service.description}</p>
              
              <div className="border-t pt-4 flex justify-between items-center">
                 <div className="text-lab-800 font-bold text-lg">RD$ {service.defaultPrice}</div>
                 <div className="flex items-center text-green-600 text-sm gap-1">
                   <CheckCircle2 size={16} /> Disponible
                 </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-blue-900 rounded-2xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
           <div>
             <h3 className="text-2xl font-bold mb-2">¿Necesitas una prueba especial?</h3>
             <p className="text-blue-200">Contáctanos para verificar disponibilidad de análisis no listados.</p>
           </div>
           <a href="/contacto" className="px-6 py-3 bg-white text-blue-900 font-bold rounded-lg hover:bg-gray-100 transition">
             Contactar Ahora
           </a>
        </div>
      </div>
    </div>
  );
};