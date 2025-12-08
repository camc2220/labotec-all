import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle, Clock, Search, UserPlus, Users, Loader2, Filter, FileText, FlaskConical, User as UserIcon } from '../../../icons';
import { staffService } from '../../../services/staffService';
import { Appointment, LabOrder, LabTestService, User } from '../../../types';
import { Modal } from '../../../components/Modal';

export const ReceptionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'pacientes' | 'ordenes'>('agenda');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recepción</h1>
          <p className="text-gray-500">Gestión integral de laboratorio</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200 w-fit">
          <button onClick={() => setActiveTab('agenda')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'agenda' ? 'bg-lab-100 text-lab-800' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Calendar size={16} className="inline mr-2"/>Agenda
          </button>
          <button onClick={() => setActiveTab('pacientes')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'pacientes' ? 'bg-lab-100 text-lab-800' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Users size={16} className="inline mr-2"/>Pacientes
          </button>
          <button onClick={() => setActiveTab('ordenes')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'ordenes' ? 'bg-lab-100 text-lab-800' : 'text-gray-600 hover:bg-gray-50'}`}>
              <FlaskConical size={16} className="inline mr-2"/>Órdenes Lab
          </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
          {activeTab === 'agenda' && <AgendaTab />}
          {activeTab === 'pacientes' && <PatientsTab />}
          {activeTab === 'ordenes' && <LabOrdersTab />}
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS (Tabs) ---

const AgendaTab = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        status: ''
    });

    const load = async () => {
        setLoading(true);
        try {
            // Using backend filtering: from/to + status
            const data = await staffService.getAppointments({
                from: filters.date ? `${filters.date}T00:00:00` : undefined,
                to: filters.date ? `${filters.date}T23:59:59` : undefined,
                status: filters.status || undefined,
                pageSize: 50
            });
            setAppointments(data.items || []);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [filters]);

    const handleStatusChange = async (appt: Appointment, status: string) => {
        if(confirm(`¿Cambiar estado a ${status}?`)) {
            await staffService.updateAppointmentStatus(appt.id, status, appt);
            load();
        }
    };

    return (
        <div className="p-6">
            <div className="flex gap-4 mb-6 items-end">
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Fecha</label>
                    <input type="date" className="block w-full border rounded-md p-2 mt-1" 
                        value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Estado</label>
                    <select className="block w-full border rounded-md p-2 mt-1"
                        value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                        <option value="">Todos</option>
                        <option value="Scheduled">Programada</option>
                        <option value="CheckedIn">En Espera</option>
                        <option value="Completed">Completada</option>
                        <option value="Cancelled">Cancelada</option>
                    </select>
                </div>
                <button onClick={load} className="mb-0.5 px-4 py-2 bg-lab-600 text-white rounded hover:bg-lab-700">Actualizar</button>
            </div>

            {loading ? <div className="text-center p-10"><Loader2 className="animate-spin mx-auto"/></div> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {appointments.map(a => (
                                <tr key={a.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-700">
                                        {new Date(a.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </td>
                                    <td className="px-6 py-4">{a.patientName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{a.type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            a.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                                            a.status === 'CheckedIn' ? 'bg-yellow-100 text-yellow-800' :
                                            a.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                                        }`}>{a.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {a.status === 'Scheduled' && (
                                            <button onClick={() => handleStatusChange(a, 'CheckedIn')} className="text-green-600 hover:underline text-sm font-medium">Check-In</button>
                                        )}
                                        {a.status === 'CheckedIn' && (
                                            <button onClick={() => handleStatusChange(a, 'Completed')} className="text-blue-600 hover:underline text-sm font-medium ml-2">Completar</button>
                                        )}
                                        {a.status !== 'Cancelled' && a.status !== 'Completed' && (
                                            <button onClick={() => handleStatusChange(a, 'Cancelled')} className="text-red-600 hover:underline text-sm font-medium ml-2">Cancelar</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {appointments.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-500">No hay citas para este filtro.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const PatientsTab = () => {
    const [patients, setPatients] = useState<any[]>([]); // Using 'any' to match generic list response which might include patient specific fields
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPatient, setNewPatient] = useState({ fullName: '', documentId: '', email: '', phone: '', birthDate: '' });

    const load = async () => {
        const data = await staffService.searchPatients(search);
        setPatients(data.items || []);
    };

    useEffect(() => { load(); }, [search]);

    const handleCreateUser = async (patientId: string) => {
        if(!confirm("¿Generar usuario y contraseña automáticos para este paciente?")) return;
        try {
            const res = await staffService.createUserForPatient(patientId);
            alert(`Usuario Creado:\nUser: ${res.userName}\nPass: ${res.password}`);
            load(); // Reload to update status
        } catch(e: any) {
            alert(e.response?.data?.message || "Error creando usuario");
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await staffService.registerPatient(newPatient);
            setIsModalOpen(false);
            setNewPatient({ fullName: '', documentId: '', email: '', phone: '', birthDate: '' });
            alert("Paciente registrado.");
            load();
        } catch(e) { alert("Error registrando paciente"); }
    }

    return (
        <div className="p-6">
            <div className="flex justify-between mb-4">
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 text-gray-400" size={18}/>
                    <input type="text" placeholder="Buscar por nombre o cédula..." 
                        className="pl-8 pr-4 py-2 border rounded w-full"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-lab-800 text-white px-4 py-2 rounded hover:bg-lab-900 flex items-center gap-2">
                    <UserPlus size={18}/> Nuevo Paciente
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {patients.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 font-medium">{p.fullName}</td>
                                <td className="px-6 py-4 text-gray-500">{p.documentId}</td>
                                <td className="px-6 py-4 text-sm">{p.email}<br/>{p.phone}</td>
                                <td className="px-6 py-4 text-right">
                                    {!p.userId ? (
                                        <button onClick={() => handleCreateUser(p.id)} className="text-blue-600 hover:underline text-sm flex items-center gap-1 ml-auto">
                                            <UserIcon size={14}/> Crear Usuario
                                        </button>
                                    ) : (
                                        <span className="text-green-600 text-xs flex items-center gap-1 justify-end"><CheckCircle size={12}/> Usuario Activo</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Paciente">
                <form onSubmit={handleRegister} className="space-y-4">
                    <input placeholder="Nombre Completo" required className="w-full border p-2 rounded" value={newPatient.fullName} onChange={e => setNewPatient({...newPatient, fullName: e.target.value})} />
                    <input placeholder="Cédula / Documento" required className="w-full border p-2 rounded" value={newPatient.documentId} onChange={e => setNewPatient({...newPatient, documentId: e.target.value})} />
                    <input type="date" className="w-full border p-2 rounded" value={newPatient.birthDate} onChange={e => setNewPatient({...newPatient, birthDate: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="email" placeholder="Email" className="w-full border p-2 rounded" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} />
                        <input type="tel" placeholder="Teléfono" className="w-full border p-2 rounded" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-lab-800 text-white py-2 rounded">Guardar</button>
                </form>
            </Modal>
        </div>
    )
}

const LabOrdersTab = () => {
    const [orders, setOrders] = useState<LabOrder[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    // Create Order State
    const [patients, setPatients] = useState<User[]>([]);
    const [tests, setTests] = useState<LabTestService[]>([]);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [notes, setNotes] = useState('');

    const load = async () => {
        const data = await staffService.getLabOrders();
        setOrders(data.items || []);
    };

    useEffect(() => { load(); }, []);

    const initCreate = async () => {
        // Fetch resources for dropdowns
        const [pData, tData] = await Promise.all([
            staffService.searchPatients(''),
            staffService.getActiveTests()
        ]);
        setPatients(pData.items || []);
        setTests(tData.items || []);
        setIsCreateOpen(true);
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await staffService.createLabOrder({
                patientId: selectedPatient,
                testIds: selectedTests,
                notes
            });
            alert("Orden creada exitosamente.");
            setIsCreateOpen(false);
            load();
        } catch(e) { alert("Error creando orden."); }
    }

    const toggleTest = (id: string) => {
        if(selectedTests.includes(id)) setSelectedTests(prev => prev.filter(x => x !== id));
        else setSelectedTests(prev => [...prev, id]);
    }

    return (
        <div className="p-6">
            <div className="flex justify-between mb-4">
                <h3 className="font-bold text-gray-700">Órdenes Recientes</h3>
                <button onClick={initCreate} className="bg-lab-600 text-white px-3 py-2 rounded hover:bg-lab-700 flex gap-2 items-center">
                    <FlaskConical size={18} /> Nueva Orden
                </button>
            </div>
            
            <div className="space-y-4">
                {orders.map(o => (
                    <div key={o.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-gray-800">{o.patientName}</h4>
                                <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</p>
                            </div>
                            <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded uppercase font-bold">{o.status}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {o.items.map(item => (
                                <span key={item.id} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100">
                                    {item.testName}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Crear Orden de Laboratorio">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Paciente</label>
                        <select className="w-full border p-2 rounded" required value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>
                            <option value="">Seleccionar...</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.id.substring(0,4)})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Pruebas</label>
                        <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                            {tests.map(t => (
                                <div key={t.id} className="flex items-center gap-2">
                                    <input type="checkbox" checked={selectedTests.includes(t.id)} onChange={() => toggleTest(t.id)} />
                                    <span className="text-sm">{t.name} (RD$ {t.defaultPrice})</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{selectedTests.length} seleccionadas</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Notas</label>
                        <textarea className="w-full border p-2 rounded" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    <button type="submit" className="w-full bg-lab-800 text-white py-2 rounded font-bold">Crear Orden</button>
                </form>
            </Modal>
        </div>
    );
}
