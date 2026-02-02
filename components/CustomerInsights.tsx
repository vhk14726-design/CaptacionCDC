
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  TrendingUp, 
  Briefcase,
  Search,
  CalendarDays,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Calendar,
  RefreshCw,
  Clock,
  Download,
  UploadCloud,
  Globe
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';

interface StandardizedRecord {
  Fecha: string;
  Rubro: string;
  Cliente: string;
}

interface CustomerInsightsProps {
  userRole?: 'admin' | 'user' | null;
}

const CustomerInsights: React.FC<CustomerInsightsProps> = ({ userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<StandardizedRecord[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === 'admin';

  // Carga inicial
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = () => {
    const savedData = localStorage.getItem('clc_customer_db_v2');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setRecords(parsed);
      setLastSync(new Date().toLocaleTimeString());
      return parsed.length;
    }
    return 0;
  };

  // Exportar base para enviar a otros PCs
  const exportMasterBase = () => {
    if (records.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `BASE_MAESTRA_CLC_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Importar base desde otro PC
  const handleImportMaster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedRecords = JSON.parse(content);
        if (!Array.isArray(importedRecords)) throw new Error("Formato inválido");
        
        localStorage.setItem('clc_customer_db_v2', JSON.stringify(importedRecords));
        setRecords(importedRecords);
        setLastSync(new Date().toLocaleTimeString());
        setImportStatus({ type: 'success', message: 'Sincronización de dispositivo exitosa.' });
      } catch (err) {
        setImportStatus({ type: 'error', message: 'El archivo de sincronización no es válido.' });
      } finally {
        setIsSyncing(false);
        if (syncInputRef.current) syncInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSyncClick = () => {
    // Si ya hay datos, intentamos refrescar localmente
    const count = loadStoredData();
    if (count > 0) {
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
        setImportStatus({ type: 'success', message: 'Datos locales actualizados.' });
      }, 800);
    } else {
      // Si no hay datos, pedimos el archivo maestro
      syncInputRef.current?.click();
    }
  };

  // Analítica
  const analytics = useMemo(() => {
    if (records.length === 0) return { total: 0, avg: 0, rubros: [], chartData: [], totalDays: 0 };
    const total = records.length;
    const rubroCount: Record<string, number> = {};
    const dateCount: Record<string, number> = {};

    records.forEach(r => {
      const rubro = (r.Rubro || 'SIN ESPECIFICAR').trim().toUpperCase();
      const fecha = (r.Fecha || 'SIN FECHA').trim();
      rubroCount[rubro] = (rubroCount[rubro] || 0) + 1;
      dateCount[fecha] = (dateCount[fecha] || 0) + 1;
    });

    const rubros = Object.entries(rubroCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const chartData = Object.entries(dateCount).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day, undefined, { numeric: true }));
    return { total, avg: total / (chartData.length || 1), rubros, chartData, totalDays: chartData.length };
  }, [records]);

  const findColumnKey = (row: any, candidates: string[]) => {
    const keys = Object.keys(row);
    return keys.find(k => candidates.some(c => k.toLowerCase().trim() === c.toLowerCase().trim() || k.toLowerCase().replace(/ /g, '_') === c.toLowerCase().replace(/ /g, '_')));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportStatus(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
        if (jsonData.length === 0) throw new Error('Excel vacío');
        
        const sample = jsonData[0];
        const fechaKey = findColumnKey(sample, ['fecha_de_carga', 'fecha']);
        const rubroKey = findColumnKey(sample, ['rubro']);
        const clienteKey = findColumnKey(sample, ['ci_cliente', 'cliente']);

        const cleaned = jsonData.map(item => ({
          Fecha: item[fechaKey] instanceof Date ? item[fechaKey].toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' }) : String(item[fechaKey]),
          Rubro: String(item[rubroKey] || 'N/A'),
          Cliente: String(item[clienteKey] || 'N/A')
        }));

        localStorage.setItem('clc_customer_db_v2', JSON.stringify(cleaned));
        setRecords(cleaned);
        setLastSync(new Date().toLocaleTimeString());
        setImportStatus({ type: 'success', message: `Base actualizada: ${cleaned.length} registros.` });
      } catch (err: any) {
        setImportStatus({ type: 'error', message: 'Error al procesar el Excel.' });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Sistema de Sincronización Invisible */}
      <input type="file" ref={syncInputRef} accept=".json" className="hidden" onChange={handleImportMaster} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Analítica de Captación</h2>
          <div className="flex items-center gap-3 mt-1">
             <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
               <Globe size={10} className="text-blue-400" />
               <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Almacenamiento Local</span>
             </div>
             {lastSync && (
               <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest bg-purple-500/5 px-2 py-0.5 rounded-full border border-purple-500/10 flex items-center gap-1">
                 <Clock size={10} /> {lastSync}
               </span>
             )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <>
              <input type="file" ref={fileInputRef} accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                Cargar Excel
              </button>
              {records.length > 0 && (
                <button 
                  onClick={exportMasterBase}
                  className="bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all"
                >
                  <Download size={16} /> Exportar Base
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {records.length > 0 ? 'Sincronizar' : 'Cargar Archivo Maestro'}
            </button>
          )}
        </div>
      </div>

      {/* Warning para cualquier PC */}
      {!isAdmin && records.length === 0 && (
        <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-[2rem] flex items-start gap-4 animate-pulse">
           <UploadCloud size={24} className="text-blue-500 mt-1" />
           <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Sincronización Inicial Requerida</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Para ver los datos desde este dispositivo, debes subir el **Archivo Maestro (.json)** generado por el Administrador. 
                Los datos de Excel no se sincronizan automáticamente entre PCs sin un servidor central.
              </p>
           </div>
        </div>
      )}

      {/* Alertas */}
      {importStatus && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300 ${importStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          {importStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-black uppercase tracking-widest">{importStatus.message}</span>
          <button onClick={() => setImportStatus(null)} className="ml-auto text-[10px] font-black">X</button>
        </div>
      )}

      {/* Indicadores Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
          <Users size={48} className="text-[#9333ea] mb-6 opacity-40 group-hover:scale-110 transition-transform duration-500" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Total Clientes</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">{analytics.total}</h2>
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between shadow-2xl group">
          <TrendingUp size={48} className="text-blue-500 mb-6 opacity-40 group-hover:scale-110 transition-transform duration-500" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Promedio Diario</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">{analytics.avg.toFixed(1)}</h2>
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between shadow-2xl group">
          <CalendarDays size={48} className="text-emerald-500 mb-6 opacity-40 group-hover:scale-110 transition-transform duration-500" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Días Registrados</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">{analytics.totalDays}</h2>
          </div>
        </div>
      </div>

      {/* Gráficos y Tablas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 uppercase tracking-tighter italic">
            <Calendar size={24} className="text-[#9333ea]" /> Tendencia Temporal
          </h3>
          <div className="h-[350px] w-full">
            {records.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 900}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 900}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '16px' }} />
                  <Bar dataKey="count" fill="#9333ea" radius={[8, 8, 0, 0]} barSize={25}>
                      {analytics.chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === analytics.chartData.length - 1 ? '#9333ea' : '#9333ea40'} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-700">
                <FileSpreadsheet size={48} className="mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Esperando datos...</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic">
              <Briefcase size={24} className="text-[#9333ea]" /> Segmentación
            </h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input 
                type="text" 
                placeholder="Filtrar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/40 border border-white/5 rounded-full py-2 pl-9 pr-4 text-[10px] font-black text-white focus:outline-none w-36"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {analytics.rubros.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((rubro, i) => {
              const perc = ((rubro.count / (analytics.total || 1)) * 100).toFixed(1);
              return (
                <div key={i} className="bg-black/30 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#9333ea]/5 flex items-center justify-center text-[#9333ea] border border-[#9333ea]/10 font-black text-xs">
                         {i + 1}
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block tracking-tight uppercase">{rubro.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                           <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-600" style={{ width: `${perc}%` }}></div>
                           </div>
                           <span className="text-[10px] font-black text-gray-600">{perc}%</span>
                        </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="text-lg font-black text-white font-mono">{rubro.count}</span>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
