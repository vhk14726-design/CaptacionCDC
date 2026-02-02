
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  TrendingUp, 
  Briefcase,
  Search,
  ArrowUpRight,
  CalendarDays,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2
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

interface CustomerRecord {
  Fecha: string;
  Rubro: string;
  Cliente?: string;
}

interface CustomerInsightsProps {
  userRole?: 'admin' | 'user' | null;
}

/**
 * CustomerInsights Component
 * Gestión de clientes con importación dinámica y control de roles.
 */
const CustomerInsights: React.FC<CustomerInsightsProps> = ({ userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Datos iniciales (Carga masiva Enero 2026)
  const INITIAL_MOCK_DATA = [
    { day: '12/01', count: 28 }, { day: '13/01', count: 11 }, { day: '14/01', count: 39 }, 
    { day: '15/01', count: 27 }, { day: '16/01', count: 51 }, { day: '19/01', count: 38 }, 
    { day: '20/01', count: 58 }, { day: '21/01', count: 46 }, { day: '22/01', count: 61 }, 
    { day: '23/01', count: 31 }, { day: '26/01', count: 41 }, { day: '27/01', count: 42 }, 
    { day: '29/01', count: 109 }
  ];

  // Cargar datos de localStorage al iniciar
  useEffect(() => {
    const savedData = localStorage.getItem('clc_customer_db');
    if (savedData) {
      setRecords(JSON.parse(savedData));
    } else {
      // Si no hay datos, recreamos el set inicial de 582 registros (mock simbólico)
      // En una app real, esto vendría de un fetch a /api/dashboard
    }
  }, []);

  // Procesamiento de analíticas dinámicas
  const analytics = useMemo(() => {
    if (records.length === 0) {
      // Retornar métricas del mock inicial si no hay registros cargados dinámicamente
      return {
        total: 582,
        avg: 44.7,
        rubros: [
          { name: 'EDUCACIÓN (MEC)', count: 189 },
          { name: 'SALUD PÚBLICA', count: 128 },
          { name: 'SEGURIDAD / POLICÍA', count: 98 },
          { name: 'JUSTICIA / LEGAL', count: 72 },
          { name: 'GOBIERNO MUNICIPAL', count: 29 },
          { name: 'JUBILADOS (GENÉRICO)', count: 25 },
          { name: 'FUERZAS ARMADAS (FFAA)', count: 22 },
          { name: 'EDUCACIÓN SUPERIOR (UNA)', count: 13 },
          { name: 'ENTES AUTÁRQUICOS (IPS/ANDE)', count: 6 }
        ],
        chartData: INITIAL_MOCK_DATA,
        totalDays: 13
      };
    }

    // Calcular en base a registros dinámicos
    const total = records.length;
    
    const rubroCount: Record<string, number> = {};
    const dateCount: Record<string, number> = {};

    records.forEach(r => {
      const rubro = (r.Rubro || 'SIN ESPECIFICAR').toUpperCase();
      const fecha = r.Fecha || 'N/A';
      
      rubroCount[rubro] = (rubroCount[rubro] || 0) + 1;
      dateCount[fecha] = (dateCount[fecha] || 0) + 1;
    });

    const rubros = Object.entries(rubroCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const chartData = Object.entries(dateCount)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const totalDays = chartData.length;
    const avg = total / (totalDays || 1);

    return { total, avg, rubros, chartData, totalDays };
  }, [records]);

  // Manejador de importación de Excel (Solo Admin)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userRole !== 'admin') {
      setImportStatus({ type: 'error', message: 'Acceso denegado: Se requiere rol Administrador.' });
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<CustomerRecord>(worksheet);

        // Validación básica de columnas
        if (jsonData.length > 0) {
          const first = jsonData[0];
          if (!('Fecha' in first) || !('Rubro' in first)) {
            throw new Error('El archivo no tiene el formato correcto. Columnas requeridas: Fecha, Rubro');
          }
        }

        // Limpieza de datos (Simulando guardado en DB)
        const cleanedData = jsonData.map(item => ({
          Fecha: String(item.Fecha),
          Rubro: String(item.Rubro),
          Cliente: item.Cliente ? String(item.Cliente) : undefined
        }));

        localStorage.setItem('clc_customer_db', JSON.stringify(cleanedData));
        setRecords(cleanedData);
        setImportStatus({ type: 'success', message: `Importación exitosa: ${cleanedData.length} registros cargados.` });
      } catch (err: any) {
        setImportStatus({ type: 'error', message: err.message || 'Error al procesar el archivo Excel.' });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de que deseas eliminar todos los datos importados?')) {
      localStorage.removeItem('clc_customer_db');
      setRecords([]);
      setImportStatus(null);
    }
  };

  const filteredRubros = analytics.rubros.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = userRole === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header & RBAC Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Análisis de Captación</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Dashboard de inteligencia de mercado basado en rubros y fechas.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Admin Zone: Carga de Excel */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".xlsx, .xls"
                className="hidden" 
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20 active:scale-95 disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                Cargar Excel
              </button>
              {records.length > 0 && (
                <button 
                  onClick={handleReset}
                  className="bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 p-3 rounded-2xl border border-white/5 transition-all"
                  title="Restablecer base de datos"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 bg-[#1c1c1c] border border-white/5 px-6 py-3 rounded-2xl shadow-xl">
             <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Carga Actual: {analytics.total} Registros</span>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {importStatus && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300 ${importStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          {importStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-black uppercase tracking-widest">{importStatus.message}</span>
          <button onClick={() => setImportStatus(null)} className="ml-auto text-[10px] opacity-50 hover:opacity-100">Cerrar</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#9333ea]/20 to-transparent p-10 rounded-[2.5rem] border border-[#9333ea]/20 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#9333ea]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <Users size={48} className="text-[#9333ea] mb-6 opacity-40" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Total Clientes</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">{analytics.total}</h2>
            <div className="flex items-center gap-2 mt-4 text-green-500 font-black text-[10px] uppercase tracking-widest bg-green-500/5 w-fit px-3 py-1 rounded-full border border-green-500/10">
              <ArrowUpRight size={12} /> Sync Automatizado
            </div>
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between shadow-2xl">
          <TrendingUp size={48} className="text-blue-500 mb-6 opacity-40" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Promedio Diario</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">{analytics.avg.toFixed(1)}</h2>
            <p className="text-[10px] text-gray-600 mt-4 font-black uppercase tracking-[0.2em]">Registros por día activo</p>
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between shadow-2xl lg:col-span-1 md:col-span-2">
          <CalendarDays size={48} className="text-emerald-500 mb-6 opacity-40" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Ventana Temporal</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">{analytics.totalDays}</h2>
            <p className="text-[10px] text-gray-600 mt-4 font-black uppercase tracking-[0.2em]">Jornadas de captura únicas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Serie Temporal */}
        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 uppercase tracking-tighter italic">
            <TrendingUp size={24} className="text-[#9333ea]" /> Tendencia de Captación
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 900}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '16px', padding: '12px' }}
                  cursor={{fill: '#ffffff05'}}
                  labelStyle={{ fontWeight: 'black', marginBottom: '4px', color: '#9333ea' }}
                />
                <Bar dataKey="count" fill="#9333ea" radius={[8, 8, 0, 0]} barSize={25}>
                    {analytics.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === analytics.chartData.length - 1 ? '#9333ea' : '#9333ea40'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Listado de Rubros */}
        <div className="bg-[#1c1c1c] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic">
              <Briefcase size={24} className="text-[#9333ea]" /> Segmentación por Rubro
            </h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input 
                type="text" 
                placeholder="Filtrar rubro..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/40 border border-white/5 rounded-full py-2 pl-9 pr-4 text-[10px] font-black text-white focus:outline-none focus:border-[#9333ea]/50 w-36"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {filteredRubros.map((rubro, i) => {
              const perc = ((rubro.count / analytics.total) * 100).toFixed(1);
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
                              <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full shadow-[0_0_8px_rgba(147,51,234,0.5)]" style={{ width: `${perc}%` }}></div>
                           </div>
                           <span className="text-[10px] font-black text-gray-600">{perc}%</span>
                        </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="text-lg font-black text-white font-mono">{rubro.count}</span>
                      <span className="text-[9px] font-black text-gray-700 block uppercase tracking-tighter">CLIENTES</span>
                   </div>
                </div>
              );
            })}
            {filteredRubros.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                <FileSpreadsheet size={48} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Sin datos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;