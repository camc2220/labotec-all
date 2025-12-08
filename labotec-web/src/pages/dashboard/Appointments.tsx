import React, { useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle, AlertCircle, Loader2 } from '../../icons';
import { patientService } from '../../services/patientService';
import { useAuth } from '../../context/AuthContext';

export const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedTest, setSelectedTest] = useState('');

  const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Combine date and time to ISO string
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

      // Ensure we have a patient ID
      if (!user?.patientId) {
          throw new Error("No se pudo identificar al paciente. Por favor, reinicie sesión.");
      }

      await patientService.createAppointment({
          patientId: user.patientId, // Passed to match DTO, though backend controller gets it from token too
          scheduledAt: scheduledAt,
          type: selectedTest,
          notes: "Agendado desde el portal web"
      });

      setStep(3);
    } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || err.message || "Error al agendar la cita.");
    } finally {
        setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
         <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
           <CheckCircle size={32} />
         </div>
         <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cita Confirmada!</h2>
         <p className="text-gray-600 max-w-md mb-8">
           Hemos agendado tu cita para el <strong>{selectedDate}</strong> a las <strong>{selectedTime}</strong>.
           Puedes ver el estado en tu tablero principal.
         </p>
         <button onClick={() => { setStep(1); setSelectedDate(''); setSelectedTime(''); }} className="px-6 py-2 bg-lab-800 text-white rounded-lg hover:bg-lab-900">
           Agendar otra cita
         </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Agendar Nueva Cita</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {error}
            </div>
        )}

        <form onSubmit={handleSubmit}>
           <div className="space-y-6">
              
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Análisis</label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lab-500 outline-none bg-white"
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  required
                >
                  <option value="">Seleccione un servicio...</option>
                  <option value="Hemograma Completo">Hemograma Completo</option>
                  <option value="Perfil Lipídico">Perfil Lipídico</option>
                  <option value="Glucosa en Ayunas">Glucosa en Ayunas</option>
                  <option value="Uroanálisis">Uroanálisis</option>
                  <option value="Prueba COVID-19">Prueba COVID-19</option>
                  <option value="Consulta General">Consulta General</option>
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Preferida</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="date" 
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lab-500 outline-none"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                    required
                  />
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Horarios Disponibles</label>
                   <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                     {timeSlots.map(time => (
                       <button
                         key={time}
                         type="button"
                         onClick={() => setSelectedTime(time)}
                         className={`py-2 px-3 text-sm rounded-lg border transition ${
                           selectedTime === time 
                             ? 'bg-lab-600 text-white border-lab-600' 
                             : 'border-gray-200 text-gray-700 hover:border-lab-300 hover:bg-lab-50'
                         }`}
                       >
                         {time}
                       </button>
                     ))}
                   </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                 <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                 <p className="text-sm text-blue-800">
                   Recuerda que algunos exámenes requieren ayuno de 8 a 12 horas. Si tienes dudas, contáctanos antes de tu cita.
                 </p>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={!selectedDate || !selectedTime || !selectedTest || loading}
                  className="w-full py-3 bg-lab-800 text-white font-bold rounded-lg hover:bg-lab-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={20} className="animate-spin" />}
                  {loading ? 'Confirmando...' : 'Confirmar Cita'}
                </button>
              </div>
           </div>
        </form>
      </div>
    </div>
  );
};