import React, { useEffect, useState } from 'react';
import { DollarSign, FileText, CreditCard, CheckCircle, Search, Download, Filter } from '../../../icons';
import { staffService } from '../../../services/staffService';
import { Invoice } from '../../../types';

export const BillingDashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Backend Filters
  const [filters, setFilters] = useState({
      paid: false,
      from: '',
      to: ''
  });

  useEffect(() => {
    loadInvoices();
  }, [filters]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await staffService.getInvoices({
          paid: filters.paid,
          from: filters.from ? `${filters.from}T00:00:00` : undefined,
          to: filters.to ? `${filters.to}T23:59:59` : undefined,
          pageSize: 50
      });
      setInvoices(data.items || []);
    } catch (error) {
      console.error("Error loading invoices", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (invoice: Invoice) => {
    if(!confirm(`¿Confirmar pago de RD$${invoice.amount}?`)) return;
    try {
        await staffService.markInvoicePaid(invoice.id, invoice);
        alert("Pago registrado.");
        loadInvoices();
    } catch(e) { alert("Error procesando pago"); }
  };

  const handleExport = async () => {
      try {
          const blob = await staffService.downloadInvoicesReport({
              paid: filters.paid,
              from: filters.from ? `${filters.from}T00:00:00` : undefined,
              to: filters.to ? `${filters.to}T23:59:59` : undefined
          });
          
          // Create URL and trigger download
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `reporte_facturas_${new Date().getTime()}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
      } catch(e) { alert("Error descargando reporte"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-500">Gestión de cobros y reportes</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm">
            <Download size={18} /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
          <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Estado</label>
              <select className="block w-40 border rounded-md p-2 mt-1" 
                value={filters.paid ? 'true' : 'false'} 
                onChange={e => setFilters({...filters, paid: e.target.value === 'true'})}>
                  <option value="false">Pendientes</option>
                  <option value="true">Pagadas</option>
              </select>
          </div>
          <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Desde</label>
              <input type="date" className="block border rounded-md p-2 mt-1" 
                value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})}/>
          </div>
          <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Hasta</label>
              <input type="date" className="block border rounded-md p-2 mt-1" 
                value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})}/>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
             <div className="p-8 text-center text-gray-500">Cargando facturas...</div>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Factura</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emisión</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {invoices.length > 0 ? invoices.map(invoice => (
                            <tr key={invoice.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {invoice.number}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {invoice.patientName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(invoice.issuedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                    RD$ {invoice.amount.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {!invoice.paid ? (
                                        <button 
                                            onClick={() => handlePayment(invoice)}
                                            className="flex items-center gap-1 ml-auto bg-lab-600 text-white px-3 py-1.5 rounded-lg hover:bg-lab-700 transition"
                                        >
                                            <CreditCard size={14} /> Cobrar
                                        </button>
                                    ) : (
                                        <span className="text-green-600 font-bold text-xs flex items-center justify-end gap-1">
                                            <CheckCircle size={14}/> PAGADO
                                        </span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No hay facturas para los filtros seleccionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};