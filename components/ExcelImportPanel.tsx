
import React, { useState, useMemo } from 'react';
import { 
  FileUp, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  Database, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Table,
  PieChart as PieChartIcon,
  ArrowRight,
  UploadCloud,
  Loader2,
  ShieldCheck,
  RefreshCw,
  ServerOff,
  Server,
  DatabaseZap,
  ExternalLink,
  Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area
} from 'recharts';
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

  // Función para convertir fechas de Excel (números) a string YYYY-MM-DD
  const formatExcelDate = (val: any) => {
    if (!val) return '';
    
    // Si es un número (formato de fecha serial de Excel)
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    
    // Si ya es un objeto Date
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }

    // Intentar parsear si es un string
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch(e) {}

    return String(val);
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
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Obtenemos los datos crudos para manejar los tipos de celdas manualmente si es necesario
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) throw new Error("Archivo vacío.");

        const normalizedData: ExcelData[] = json.map((row: any) => {
          const findRawValue = (possibleKeys: string[]) => {
            const key = Object.keys(row).find(k => 
              possibleKeys.includes(k.toLowerCase().trim())
            );
            return key ? row[key] : undefined;
          };

          return {
            ci: String(findRawValue(['ci_cliente', 'ci', 'documento', 'cedula']) || ''),
            contacto: String(findRawValue(['contacto', 'nombre', 'cliente']) || findRawValue(['ci_cliente', 'ci']) || 'REGISTRO EXCEL'),
            rubro: String(findRawValue(['rubro', 'categoria', 'interes']) || 'GENERAL'),
            fecha: formatExcelDate(findRawValue(['fecha_de_carga', 'fecha', 'dia'])),
            agente: String(findRawValue(['agente', 'vendedor', 'responsable']) || 'SISTEMA_IMPORT')
          };
        });

        setData(normalizedData);
      } catch (err: any) {
        setError("Error de lectura: " + err.message);
        setData([]);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePushToDatabase = async () => {
    if (!supabase) {
      setError("Falta configuración: Debes agregar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el panel de Vercel.");
      return;
    }

    if (data.length === 0) {
      setError("No hay datos cargados para subir.");
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('prospectos')
        .insert(data.map(item => ({
          ci: item.ci,
          contacto: item.contacto,
          rubro: item.rubro,
          fecha: item.fecha,
          agente: item.agente
        })));

      if (insertError) throw insertError;

      setUploadStatus('success');
      window.dispatchEvent(new CustomEvent('customer_data_updated'));
      
      setTimeout(() => {
        setData([]);
        setFileName(null);
        setUploadStatus(null);
      }, 4000);

    } catch (err: any) {
      console.error('Database Push Error:', err);
      setError("Fallo de conexión con Supabase: " + (err.message || "Verifique su tabla 'prospectos'"));
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const total = data.length;
    const dateGroups: Record<string, number> = {};
    data.forEach(item => {
      const d = (item.fecha || 'N/A').trim();
      dateGroups[d] = (dateGroups[d] || 0) + 1;
    });
    return {
      total,
      promedio: total / (Object.keys(dateGroups).length || 1),
      porFecha: Object.entries(dateGroups).map(([fecha, count]) => ({ fecha, count })).sort((a,b) => a.fecha.localeCompare(b.fecha))
    };
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
             <DatabaseZap className="text-purple-500" size={32} />
             Importar Clientes
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Base de Datos Centralizada</p>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${isSupabaseConfigured ? 'bg-green-500/10 border-green-500/20 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
               {isSupabaseConfigured ? <Server size={10} className="animate-pulse" /> : <ServerOff size={10} />}
               <span className="text-[8px] font-black uppercase tracking-widest">{isSupabaseConfigured ? 'Supabase Conectado' : 'Sin Conexión a Base de Datos'}</span>
            </div>
          </div>
        </div>

        {isAdmin && data.length > 0 && (
          <button 
            onClick={handlePushToDatabase}
            disabled={isUploading}
            className={`px-10 py-5 rounded-[1.5rem] flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 ${uploadStatus === 'success' ? 'bg-green-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
          >
            {isUploading ? <Loader2 className="animate-spin" size={18} /> : (uploadStatus === 'success' ? <CheckCircle2 size={18} /> : <UploadCloud size={18} />)}
            {uploadStatus === 'success' ? 'Sincronización Exitosa' : 'Subir a Clientes (Persistir)'}
          </button>
        )}
      </div>

      {!isSupabaseConfigured && (
        <div className="bg-[#1c1c1c] p-8 rounded-[2.5rem] border border-red-500/20 flex flex-col md:flex-row items-center gap-8 shadow-2xl animate-in zoom-in-95">
           <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 shrink-0">
             <Settings size={40} className="animate-spin duration-[4000ms]" />
           </div>
           <div className="flex-1">
             <h3 className="text-lg font-black text-white uppercase italic">Configuración Requerida</h3>
             <p className="text-xs text-gray-500 mt-2 leading-relaxed">
               Para que los datos se guarden "para siempre" en el módulo Clientes, debes conectar tu cuenta de Supabase. 
               Agrega las variables <code className="text-red-400 font-mono">VITE_SUPABASE_URL</code> y <code className="text-red-400 font-mono">VITE_SUPABASE_ANON_KEY</code> en Vercel.
             </p>
             <div className="flex items-center gap-4 mt-4">
                <a href="https://supabase.com" target="_blank" className="text-[10px] font-black text-white bg-white/5 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2 hover:bg-white/10 transition-all">
                  ABRIR SUPABASE <ExternalLink size={12} />
                </a>
             </div>
           </div>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-[2.5rem] flex items-center gap-6 text-green-500 animate-in slide-in-from-top-4 shadow-xl shadow-green-500/5">
          <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-base font-black uppercase tracking-widest italic">Datos Persistidos Correctamente</p>
            <p className="text-xs font-medium opacity-80 mt-1">Los registros han sido inyectados en la base de datos central y ahora son visibles para todos los usuarios.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex items-center gap-4 text-red-500 animate-in shake">
          <AlertCircle size={24} />
          <p className="text-[11px] font-black uppercase tracking-widest">{error}</p>
        </div>
      )}

      {data.length === 0 ? (
        <div className="bg-[#1c1c1c] rounded-[3rem] border border-white/5 shadow-2xl p-10 relative">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] py-24 hover:border-purple-500/30 transition-all group bg-black/20">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-24 h-24 bg-purple-600/10 rounded-[2rem] flex items-center justify-center text-purple-500 mb-8 group-hover:scale-110 transition-transform shadow-xl">
              <FileUp size={48} />
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Seleccionar Excel de Captación</h3>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-4">ci_cliente • rubro • fecha_de_carga</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 shadow-xl flex items-center gap-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-125"></div>
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/10">
                <Users size={32} />
              </div>
              <div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Nuevos Registros</p>
                <h4 className="text-5xl font-black text-white mt-1">{stats?.total}</h4>
              </div>
            </div>
            <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 shadow-xl flex items-center gap-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-125"></div>
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/10">
                <TrendingUp size={32} />
              </div>
              <div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Intensidad Diaria</p>
                <h4 className="text-5xl font-black text-white mt-1">{stats?.promedio.toFixed(1)}</h4>
              </div>
            </div>
          </div>

          <div className="bg-[#1c1c1c] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-white/5 bg-black/20 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-widest italic flex items-center gap-3">
                <Table size={18} className="text-purple-500" /> Previsualización de Carga
              </h3>
              <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
                {fileName}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-600 uppercase tracking-widest border-b border-white/5 bg-black/40">
                    <th className="py-6 px-10">DOCUMENTO (CI_CLIENTE)</th>
                    <th className="py-6">CONTACTO</th>
                    <th className="py-6">RUBRO ASIGNADO</th>
                    <th className="py-6 px-10 text-right">FECHA_DE_CARGA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-all group">
                      <td className="py-6 px-10 text-sm font-bold text-white tracking-tight">{row.ci}</td>
                      <td className="py-6 text-xs text-gray-500 uppercase font-medium">{row.contacto}</td>
                      <td className="py-6">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          {row.rubro}
                        </span>
                      </td>
                      <td className="py-6 px-10 text-right text-xs font-bold text-gray-600">{row.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > 50 && (
              <div className="p-8 bg-black/20 text-center border-t border-white/5">
                 <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">
                   Mostrando 50 de {data.length} registros • El resto se procesará al confirmar la carga
                 </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelImportPanel;
