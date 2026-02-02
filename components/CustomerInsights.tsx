
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Search, 
  Loader2, 
  Calendar, 
  RefreshCw, 
  Clock, 
  Database,
  Filter,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Table as TableIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '../supabase.ts';

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwWiU0msCle-8cRWGPxO4IGilOR5sFnJgfiVy_x00QhH8kDRyPSTZVMaYtlyDJBaPiQ/exec';

interface StandardizedRecord {
  ci: string;
  contacto: string;
  rubro: string;
  fecha: string;
  agente: string;
  source?: 'sheets' | 'supabase';
}

const CustomerInsights: React.FC<{ userRole?: string | null }> = ({ userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<StandardizedRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = userRole === 'admin';

  const fetchData = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    setError(null);
    
    try {
      let combined: StandardizedRecord[] = [];

      // 1. Cargar desde Supabase (Permanente)
      if (supabase) {
        const { data: sbData, error: sbError } = await supabase
          .from('prospectos')
          .select('*')
          .order('id', { ascending: false });
        
        if (!sbError && sbData) {
          combined = sbData.map(item => ({ ...item, source: 'supabase' }));
        }
      }

      // 2. Cargar desde Google Sheets
      try {
        const res = await fetch(GOOGLE_SHEETS_URL);
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((item: any) => ({
            ci: String(item.ci || ''),
            contacto: String(item.contacto || ''),
            rubro: String(item.rubro || ''),
            fecha: String(item.fecha || ''),
            agente: String(item.agente || ''),
            source: 'sheets' as const
          }));
          combined = [...combined, ...mapped];
        }
      } catch (e) {
        console.warn("Sheets fetch failed");
      }

      setRecords(combined);
      setLastSync(new Date().toLocaleTimeString('es-PY'));
    } catch (err: any) {
      setError("Fallo en la sincronización.");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData(true);
    window.addEventListener('customer_data_updated', handleUpdate);
    return () => window.removeEventListener('customer_data_updated', handleUpdate);
  }, []);

  const metrics = useMemo(() => {
    if (records.length === 0) return { total: 0, promedio: 0, lider: 'N/A', rubrosData: [], seriesData: [] };

    const rubros: Record<string, number> = {};
    const fechas: Record<string, number> = {};
    
    records.forEach(r => {
      // Rubros
      const rubro = (r.rubro || 'OTROS').toUpperCase().trim();
      rubros[rubro] = (rubros[rubro] || 0) + 1;
      
      // Fechas para promedio y gráfico
      const fecha = r.fecha || 'Sin Fecha';
      fechas[fecha] = (fechas[fecha] || 0) + 1;
    });

    const rubroLider = Object.entries(rubros).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const totalFechas = Object.keys(fechas).length || 1;

    return {
      total: records.length,
      promedio: (records.length / totalFechas).toFixed(1),
      lider: rubroLider,
      rubrosData: Object.entries(rubros).map(([name, value]) => ({ name, value })).slice(0, 5),
      seriesData: Object.entries(fechas)
        .map(([date, value]) => ({ date, value }))
        .sort((a,b) => a.date.localeCompare(b.date))
        .slice(-7) // Últimos 7 puntos
    };
  }, [records]);

  const filtered = records.filter(r => 
    r.contacto.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.ci.includes(searchTerm) ||
    r.rubro.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-32">
      {/* Header Estilo Imagen */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic">
            Clientes
          </h2>
          <div className="flex items-center gap-4">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
              <ShieldCheck size={12} className="text-purple-500" />
              CLC CAPTACIÓN INTELLIGENCE V2.0
            </p>
            <div className="px-3 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">
                MODO {isAdmin ? 'ADMINISTRADOR' : 'COLABORADOR'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Base Centralizada */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-12">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 border border-green-500/10">
              <TableIcon size={18} />
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              BASE CENTRALIZADA
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/10 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.05)]">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Sincronización Activa</span>
            </div>
            {lastSync && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                <Clock size={10} className="text-gray-500" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{lastSync}</span>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => fetchData()}
          disabled={isSyncing}
          className="bg-[#10b981] hover:bg-[#059669] text-white px-10 py-5 rounded-[1.5rem] flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-2xl shadow-green-500/10 active:scale-95 transition-all group"
        >
          {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />}
          REFRESCAR AHORA
        </button>
      </div>

      {/* Grid de Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="bg-[#141414] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform"></div>
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-6 border border-green-500/10">
            <Users size={32} />
          </div>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Prospectos Totales</p>
          <h4 className="text-6xl font-black text-white mt-2 tracking-tighter">{metrics.total}</h4>
        </div>

        <div className="bg-[#141414] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform"></div>
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6 border border-blue-500/10">
            <TrendingUp size={32} />
          </div>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Promedio Diario</p>
          <h4 className="text-6xl font-black text-white mt-2 tracking-tighter">{metrics.promedio}</h4>
        </div>

        <div className="bg-[#141414] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform"></div>
          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-6 border border-purple-500/10">
            <Database size={32} />
          </div>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Rubro Líder</p>
          <h4 className="text-4xl font-black text-white mt-4 tracking-tighter uppercase italic truncate">{metrics.lider}</h4>
        </div>
      </div>

      {/* Grid de Análisis Visual Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <div className="bg-[#141414] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-4 mb-10">
            <Calendar size={24} className="text-blue-500" />
            <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Registros Semanales</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.seriesData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: 'none', borderRadius: '16px' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#141414] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-4 mb-10">
            <Filter size={24} className="text-purple-500" />
            <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Segmentos de Negocio</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.rubrosData}>
                <XAxis dataKey="name" hide />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0a0a0a', border: 'none', borderRadius: '16px' }}
                   itemStyle={{ color: '#a855f7', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="#a855f7" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lista Detallada de Prospectos */}
      <div className="bg-[#141414] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden mt-12">
        <div className="p-10 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
              <Search size={20} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Explorador de Registros</h3>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input 
              type="text" 
              placeholder="Filtrar por nombre, CI o rubro..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-8 text-xs text-white focus:outline-none focus:border-purple-500 transition-all w-full md:w-[400px]"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-gray-600 uppercase tracking-widest border-b border-white/5 bg-black/20">
                <th className="py-8 px-10">Status / Fuente</th>
                <th className="py-8">Identificación</th>
                <th className="py-8">Cliente</th>
                <th className="py-8">Categoría</th>
                <th className="py-8 px-10 text-right">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r, i) => (
                <tr key={i} className="group hover:bg-white/5 transition-all">
                  <td className="py-8 px-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${r.source === 'supabase' ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${r.source === 'supabase' ? 'text-purple-400' : 'text-green-500'}`}>
                        {r.source === 'supabase' ? 'DB PERMANENTE' : 'SYNC SHEETS'}
                      </span>
                    </div>
                  </td>
                  <td className="py-8">
                    <span className="text-sm font-bold text-white tracking-tight bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">{r.ci}</span>
                  </td>
                  <td className="py-8">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-300">{r.contacto}</span>
                      <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">Registrado el {r.fecha}</span>
                    </div>
                  </td>
                  <td className="py-8">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-xl bg-black/20">
                      {r.rubro}
                    </span>
                  </td>
                  <td className="py-8 px-10 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <span className="text-[11px] font-black text-purple-400 uppercase tracking-tighter">{r.agente}</span>
                       <ArrowRight size={14} className="text-gray-800 group-hover:text-purple-500 transition-colors" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-40 flex flex-col items-center justify-center opacity-30">
              <Database size={64} className="mb-6" />
              <p className="text-xs font-black uppercase tracking-widest">No se encontraron registros en la base</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
