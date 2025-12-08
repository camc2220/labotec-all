import React, { useEffect, useState } from 'react';
import { Download, FileText, Search } from '../../icons';
import { patientService } from '../../services/patientService';
import { LabResult } from '../../types';

export const Results: React.FC = () => {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await patientService.getMyResults(1, 50); // Get last 50
        setResults(data.items || []);
      } catch (error) {
        console.error("Error fetching results", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleDownload = async (id: string, fileName: string) => {
    try {
      // Get the Signed URL (SAS or Direct)
      const url = await patientService.getPdfUrl(id);
      
      if (!url) {
        alert("El documento no está disponible.");
        return;
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      // Note: If using Azure SAS, 'download' attribute might be ignored by browser if CORS/Headers aren't perfect, 
      // but it opens in new tab usually.
      link.target = '_blank'; 
      link.download = `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading PDF", error);
      alert("Error al descargar el archivo.");
    }
  };

  const filteredResults = results.filter(r => 
    r.testName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Mis Resultados</h1>
        
        <div className="relative">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
           <input 
             type="text" 
             placeholder="Buscar resultado..." 
             className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lab-500 outline-none w-full sm:w-64"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
             <div className="p-12 text-center text-gray-500">Cargando resultados...</div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Análisis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resultado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.length > 0 ? filteredResults.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(result.releasedAt).toLocaleDateString('es-DO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-2">
                    <FileText size={16} className="text-lab-500" />
                    {result.testName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {result.resultValue} <span className="text-gray-400 text-xs">{result.unit}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {result.pdfUrl ? (
                        <button 
                            onClick={() => handleDownload(result.id, result.testName)}
                            className="text-lab-600 hover:text-lab-900 inline-flex items-center gap-1 hover:underline"
                        >
                        <Download size={16} /> Descargar PDF
                        </button>
                    ) : (
                        <span className="text-gray-400 text-xs italic">PDF Pendiente</span>
                    )}
                  </td>
                </tr>
              )) : (
                  <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                          No se encontraron resultados.
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