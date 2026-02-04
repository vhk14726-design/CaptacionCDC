
import React, { useState, useMemo } from 'react';
import { 
  FileUp, 
  Users, 
  TrendingUp, 
  Database, 
  AlertCircle,
  CheckCircle2,
  Table,
  UploadCloud,
  Loader2,
  DatabaseZap,
  ExternalLink,
  Settings,
  Server,
  ServerOff
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase.ts';

interface ExcelData {
  ci: string;
  contacto: string;
  rubro: string;
  fecha: string;
  agente: string;
}

interface ExcelImportPanelProps {
  userRole?: 'admin' | 'user' | null;
}

const ExcelImportPanel: React.FC<ExcelImportPanelProps> = ({ userRole }) => {
  const [data, setData] = useState<ExcelData[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'success' | 'error' | null>(null);

  const isAdmin = userRole === 'admin';
  const isSupabaseConfigured = !!supabase;

  // Función mejorada para DD/MM/YYYY
  const formatExcelDate = (val: any) => {
    if (!val) return '';
    
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    
    const str = String(val).trim();
    // Manejar DD/MM/YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }

    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch(e) {}

    return str;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setError(null);
    setUploadStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) throw new Error("Archivo vacío.");

        const normalizedData: ExcelData[] = json.map((row: any) => {
          const findVal = (keys: string[]) => {
            const k = Object.keys(row).find(x => keys.includes(x.toLowerCase().trim()));
            return k ? row[k] : undefined;
          };

          return {
            ci: String(findVal(['ci_cliente', 'ci', 'documento']) || '').trim(),
            contacto: String(findVal(['contacto', 'nombre']) || findVal(['ci_cliente', 'ci']) || 'CLIENTE EXCEL'),
            rubro: String(findVal(['rubro', 'interes']) || 'GENERAL').toUpperCase(),
            fecha: formatExcelDate(findVal(['fecha_de_carga', 'fecha', 'dia'])),
            agente: String(findVal(['agente', 'vendedor']) || 'SISTEMA_IMPORT').toUpperCase()
          };
        });

        setData(normalizedData);
      } catch (err: any) {
        setError("Error: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePushToDatabase = async () => {
    if (!supabase || data.length === 0) return;
    setIsUploading(true);
    try {
      const { error: err } = await supabase.from('prospectos').insert(data);
      if (err) throw err;
      setUploadStatus('success');
      window.dispatchEvent(new CustomEvent('customer_data_updated'));
      setTimeout(() => { setData([]); setFileName(null); }, 3000);
    } catch (err: any) {
      setError("Error Supabase: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const stats = useMemo(() => ({
    total: data.length,
    promedio: data.length / 30 // Estimación mensual
  }), [data]);

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-white uppercase italic flex items-center gap-3">
            <DatabaseZap className="text-purple-500" /> Importar Reporte 2026
          </h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Carga masiva de registros mensuales</p>
        </div>
        {isAdmin && data.length > 0 && (
          <button onClick={handlePushToDatabase} disabled={isUploading} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl flex items-center gap-2">
            {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud />} Subir a Clientes
          </button>
        )}
      </div>

      {uploadStatus === 'success' && (
        <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-3xl text-green-500 flex items-center gap-4">
          <CheckCircle2 /> <span>Importación completada. Los datos ahora son visibles en la pestaña Clientes.</span>
        </div>
      )}

      {data.length === 0 ? (
        <div className="bg-[#121212] border-2 border-dashed border-white/5 rounded-[3rem] p-20 text-center relative hover:border-purple-500/20 transition-all cursor-pointer">
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
          <FileUp size={48} className="mx-auto text-purple-500 mb-4" />
          <h3 className="text-white font-black uppercase italic">Arrastra tu archivo de Enero</h3>
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-2">Formatos aceptados: .xlsx, .xls</p>
        </div>
      ) : (
        <div className="bg-[#121212] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/40 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                <th className="p-6 px-10">CI_CLIENTE</th>
                <th className="p-6">RUBRO</th>
                <th className="p-6 px-10 text-right">FECHA_DE_CARGA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((row, i) => (
                <tr key={i} className="text-white hover:bg-white/5 transition-colors">
                  <td className="p-6 px-10 font-bold">{row.ci}</td>
                  <td className="p-6 text-[10px] font-black uppercase text-purple-400">{row.rubro}</td>
                  <td className="p-6 px-10 text-right text-xs font-bold text-gray-400">{row.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExcelImportPanel;
