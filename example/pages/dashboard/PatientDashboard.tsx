import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import { Calendar, Clock, FileText, Activity, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Appointment, LabResult } from '../../types';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch upcoming appointments
        const apptData = await patientService.getMyAppointments(true);
        setAppointments(apptData.items || []);

        // Fetch recent results
        const resultData = await patientService.getMyResults(1, 5);
        setResults(resultData.items || []);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando información...</div>;
  }

  const nextAppointment = appointments.length > 0 ? appointments[0] : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Bienvenido, {user?.username}</h1>
        <p className="text-gray-500">Resumen de tu actividad reciente.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
             <FileText size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500">Resultados Listos</p>
             <p className="text-2xl font-bold text-gray-900">{results.length}</p>
           </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="p-3 bg-green-50 text-green-600 rounded-lg">
             <Calendar size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500">Próxima Cita</p>
             <p className="text-2xl font-bold text-gray-900">
                {nextAppointment ? new Date(nextAppointment.scheduledAt).toLocaleDateString('es-DO', {month: 'short', day: 'numeric'}) : '--'}
             </p>
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
             <Activity size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500">Estado</p>
             <p className="text-xl font-bold text-gray-900">Activo</p>
           </div>
        </div>
      </div>

      {/* Recent Activity / Actions */}
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Next Appointment Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
           <div className="p-6 border-b border-gray-100 flex justify-between items-center">
             <h3 className="font-bold text-gray-800">Próxima Cita</h3>
             {nextAppointment && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    {nextAppointment.status}
                </span>
             )}
           </div>
           <div className="p-6">
              {nextAppointment ? (
                <>
                  <div className="flex items-start gap-4 mb-4">
                     <div className="bg-gray-100 p-3 rounded text-center min-w-[60px]">
                        <span className="block text-sm text-gray-500 uppercase">
                            {new Date(nextAppointment.scheduledAt).toLocaleDateString('es-DO', {month: 'short'})}
                        </span>
                        <span className="block text-xl font-bold text-gray-900">
                            {new Date(nextAppointment.scheduledAt).getDate()}
                        </span>
                     </div>
                     <div>
                        <h4 className="font-semibold text-gray-900">{nextAppointment.type}</h4>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Clock size={14} className="mr-1" />
                          {new Date(nextAppointment.scheduledAt).toLocaleTimeString('es-DO', {hour: '2-digit', minute: '2-digit'})}
                        </div>
                     </div>
                  </div>
                  <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-100 mb-4">
                    Recuerda llegar 15 minutos antes de tu hora programada.
                  </p>
                </>
              ) : (
                  <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No tienes citas próximas.</p>
                      <Link to="/portal/citas" className="text-lab-600 font-bold hover:underline">Agendar ahora</Link>
                  </div>
              )}
           </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
           <div className="p-6 border-b border-gray-100 flex justify-between items-center">
             <h3 className="font-bold text-gray-800">Resultados Recientes</h3>
             <Link to="/portal/resultados" className="text-sm text-lab-600 hover:text-lab-800 font-medium">Ver todos</Link>
           </div>
           <div>
             {results.length > 0 ? (
                 results.map((item) => (
                   <div key={item.id} className="p-4 flex justify-between items-center border-b border-gray-50 hover:bg-gray-50 transition">
                      <div>
                        <p className="font-medium text-gray-900">{item.testName}</p>
                        <p className="text-xs text-gray-500">
                            {new Date(item.releasedAt).toLocaleDateString('es-DO')}
                        </p>
                      </div>
                      <Link to="/portal/resultados" className="text-lab-600 hover:bg-lab-50 p-2 rounded-full">
                        <FileText size={18} />
                      </Link>
                   </div>
                 ))
             ) : (
                <div className="p-6 text-center text-gray-500 text-sm">
                    No hay resultados disponibles recientemente.
                </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
};