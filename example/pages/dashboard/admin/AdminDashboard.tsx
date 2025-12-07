import React, { useEffect, useState } from 'react';
import { Users, Beaker, TrendingUp, Settings, Trash2, Edit, Plus, Loader2, Upload, FileText } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { staffService } from '../../../services/staffService';
import { User, UserRole, LabTestService, LabResult } from '../../../types';
import { Modal } from '../../../components/Modal';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tests' | 'results'>('overview');
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 overflow-x-auto">
           {['overview', 'users', 'tests', 'results'].map(tab => (
               <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)} 
                className={`px-4 py-2 text-sm font-medium rounded-md transition capitalize ${activeTab === tab ? 'bg-lab-100 text-lab-800' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 {tab === 'overview' ? 'Resumen' : tab === 'users' ? 'Usuarios' : tab === 'tests' ? 'Pruebas' : 'Resultados'}
               </button>
           ))}
        </div>
      </div>

      {activeTab === 'overview' && <AdminOverview />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'tests' && <TestManagement />}
      {activeTab === 'results' && <ResultsManagement />}
    </div>
  );
};

// ... Existing AdminOverview, UserManagement, TestManagement ...
const AdminOverview: React.FC = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Ingresos del Mes</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">RD$ 845,000</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-gray-500 text-sm font-medium">Pacientes Nuevos</h3>
             <p className="text-3xl font-bold text-gray-900 mt-2">142</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-gray-500 text-sm font-medium">Pruebas Realizadas</h3>
             <p className="text-3xl font-bold text-gray-900 mt-2">1,024</p>
        </div>
    </div>
);

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '', email: '', password: '', fullName: '', role: UserRole.Paciente
    });

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        try {
            const data = await adminService.getUsers(1, 100);
            setUsers(data.items || []);
        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        if(confirm("¿Eliminar usuario?")) {
            try { await adminService.deleteUser(id); loadUsers(); } 
            catch(e) { alert("Error al eliminar"); }
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await adminService.createUser(newUser);
            alert("Usuario creado exitosamente");
            setIsModalOpen(false);
            setNewUser({ username: '', email: '', password: '', fullName: '', role: UserRole.Paciente });
            loadUsers();
        } catch (error) { alert("Error al crear usuario."); } 
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Gestión de Usuarios</h3>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-lab-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-lab-700">
                    <Plus size={16} /> Nuevo Usuario
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-800">{user.role}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 ml-4"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Usuario">
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div><label className="text-sm">Nombre Completo</label><input type="text" required className="w-full p-2 border rounded" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} /></div>
                    <div><label className="text-sm">Usuario</label><input type="text" required className="w-full p-2 border rounded" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} /></div>
                    <div><label className="text-sm">Email</label><input type="email" required className="w-full p-2 border rounded" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
                    <div><label className="text-sm">Contraseña</label><input type="password" required className="w-full p-2 border rounded" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></div>
                    <div>
                        <label className="text-sm">Rol</label>
                        <select className="w-full p-2 border rounded bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                            <option value={UserRole.Paciente}>Paciente</option>
                            <option value={UserRole.Recepcion}>Recepción</option>
                            <option value={UserRole.Facturacion}>Facturación</option>
                            <option value={UserRole.Admin}>Administrador</option>
                        </select>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-lab-800 text-white py-2 rounded hover:bg-lab-900 flex justify-center">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Crear Usuario'}
                    </button>
                </form>
            </Modal>
        </div>
    );
}

const TestManagement: React.FC = () => {
    const [tests, setTests] = useState<LabTestService[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTest, setNewTest] = useState({ name: '', code: '', category: '', defaultPrice: 0, defaultUnit: '', active: true });
    
    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            const data = await adminService.getLabTests();
            setTests(Array.isArray(data) ? data : (data as any).items || []);
        } catch(e) {}
    };

    const handleCreateTest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminService.createLabTest(newTest);
            alert("Prueba creada");
            setIsModalOpen(false);
            setNewTest({ name: '', code: '', category: '', defaultPrice: 0, defaultUnit: '', active: true });
            load();
        } catch(e) { alert("Error al crear prueba"); }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Catálogo de Pruebas</h3>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-lab-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-lab-700">
                    <Plus size={16} /> Nueva Prueba
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cód</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio (RD$)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tests.map(test => (
                            <tr key={test.id}>
                                <td className="px-6 py-4 text-xs font-mono">{test.code}</td>
                                <td className="px-6 py-4 font-medium">{test.name}</td>
                                <td className="px-6 py-4 font-bold text-gray-700">RD$ {test.defaultPrice}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nueva Prueba">
                <form onSubmit={handleCreateTest} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input placeholder="Código (ej. HEMO)" required className="border p-2 rounded" value={newTest.code} onChange={e => setNewTest({...newTest, code: e.target.value})} />
                        <input placeholder="Nombre" required className="border p-2 rounded" value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Precio" required className="border p-2 rounded" value={newTest.defaultPrice} onChange={e => setNewTest({...newTest, defaultPrice: parseFloat(e.target.value)})} />
                        <input placeholder="Unidad (mg/dL)" className="border p-2 rounded" value={newTest.defaultUnit} onChange={e => setNewTest({...newTest, defaultUnit: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-lab-600 text-white py-2 rounded">Guardar</button>
                </form>
            </Modal>
        </div>
    );
}

const ResultsManagement: React.FC = () => {
    const [results, setResults] = useState<LabResult[]>([]);
    
    useEffect(() => { load(); }, []);

    const load = async () => {
        const data = await staffService.getResults({ pageSize: 50 });
        setResults(data.items || []);
    }

    const handleUpload = async (id: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if(file) {
                try {
                    await staffService.uploadResultPdf(id, file);
                    alert("PDF subido correctamente");
                    load();
                } catch(e) { alert("Error subiendo archivo"); }
            }
        };
        input.click();
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4">Gestión de Resultados</h3>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Paciente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Prueba</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">PDF</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {results.map(r => (
                        <tr key={r.id}>
                            <td className="px-6 py-4 text-sm">{new Date(r.releasedAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-medium">{r.patientName}</td>
                            <td className="px-6 py-4">{r.testName}</td>
                            <td className="px-6 py-4">
                                {r.pdfUrl ? (
                                    <span className="text-green-600 flex items-center gap-1 text-xs"><FileText size={14}/> Listo</span>
                                ) : (
                                    <button onClick={() => handleUpload(r.id)} className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                                        <Upload size={14}/> Subir PDF
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}