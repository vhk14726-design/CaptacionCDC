
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Briefcase,
  Search,
  CalendarDays,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  RefreshCw,
  Clock,
  CloudIcon,
  Server,
  Database
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
import { createClient } from '@supabase/supabase-js';

// Inicialización de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://qhexfrvlefnxwjtoshhl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_8T1c0D57VXBjtfPuIg9FLg_ne34-pZw';
const supabase = createClient(supabaseUrl, supabaseKey);

interface StandardizedRecord {
  fecha: string;
  rubro: string;
  cliente: string;
}

const CustomerInsights: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<StandardizedRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Consulta los datos desde Supabase
  const fetchData = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('fecha, rubro, cliente')
        .order('id', { ascending: false });

      if (error) throw error;

      setRecords(data || []);
      const now = new Date();
      setLastSync(now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      if (!silent) {
        setStatus({ type: 'success', message: `Sincronizado: ${data?.length || 0} registros obtenidos de la nube.` });
        setTimeout(() => setStatus(null), 3000);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setStatus({ type: 'error', message: 'Error al conectar con la base central.' });
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    // Auto-refresh cada 5 minutos
    const interval = setInterval(() => fetchData(true), 300000);
    return () => clearInterval(interval);
  }, []);

  const analytics = useMemo(() => {
    if (records.length === 0) return { total: 0, avg: 0, rubros: [], chartData: [], totalDays: 0 };
    const total = records.length;
    const rubroCount: Record<string, number> = {};
    const dateCount: Record<string, number> = {};

    records.forEach(r => {
      const rubro = (r.rubro || 'N/A').trim().toUpperCase();
      const fecha = (r.fecha || 'N/A').trim();
      rubroCount[rubro] = (rubroCount[rubro] || 0) + 1;
      dateCount[fecha] = (dateCount[fecha] || 0) + 1;
    });

    const rubros = Object.entries(rubroCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
      
    const chartData = Object.entries(dateCount)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => {
        // Ordenar por fecha DD/MM (asumiendo este formato)
        const [d1, m1] = a.day.split('/').map(Number);
        const [d2, m2] = b.day.split('/').map(Number);
        return (m1 * 100 + d1) - (m2 * 100 + d2);
      });

    return { total, avg: total / (chartData.length || 1), rubros, chartData, totalDays: chartData.length };
  }, [records]);

  const filteredRubros = useMemo(() => {
    return analytics.rubros.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [analytics.rubros, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
             <Database className="text-purple-500" size={32} />
             Analítica en Tiempo Real
          </h2>
          <div className="flex items-center gap-3 mt-1">
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-green-500/10 border-green-500/10 text-green-500">
               <CloudIcon size={10} />
               <span className="text-[9px] font-black uppercase tracking-widest">
                 Conectado a Google Sheets
               </span>
             </div>
             {lastSync && (
               <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest bg-purple-500/5 px-2 py-0.5 rounded-full border border-purple-500/10 flex items-center gap-1">
                 <Clock size={10} /> ÚLTIMA SYNC: {lastSync}
               </span>
             )}
          </div>
        </div>
        
        <button 
          onClick={() => fetchData()}
          disabled={isSyncing}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-30 border border-purple-500/30 group"
        >
          {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" size={16} />}
          Actualizar Ahora
        </button>
      </div>

      {status && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300 ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-black uppercase tracking-widest">{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
          <Users size={48} className="text-[#9333ea] mb-6 opacity-40 group-hover:scale-110 transition-transform" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Total Clientes Captados</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">
              {isSyncing ? '...' : analytics.total}
            </h2>
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between shadow-2xl group relative overflow-hidden">
          <TrendingUp size={48} className="text-blue-500 mb-6 opacity-40 group-hover:scale-110 transition-transform" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Promedio Diario</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">
              {isSyncing ? '...' : analytics.avg.toFixed(1)}
            </h2>
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between shadow-2xl group relative overflow-hidden">
          <CalendarDays size={48} className="text-emerald-500 mb-6 opacity-40 group-hover:scale-110 transition-transform" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Días de Actividad</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">
              {isSyncing ? '...' : analytics.totalDays}
            </h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 uppercase tracking-tighter italic">
            <Calendar size={24} className="text-[#9333ea]" /> Historial de Captación
          </h3>
          <div className="h-[350px] w-full">
            {records.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 900}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 900}} />
                  <Tooltip cursor={{fill: 'white', opacity: 0.05}} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '16px' }} />
                  <Bar dataKey="count" fill="#9333ea" radius={[8, 8, 0, 0]} barSize={25}>
                      {analytics.chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === analytics.chartData.length - 1 ? '#9333ea' : '#9333ea30'} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-700">
                <Server size={48} className="mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Sin datos en la nube</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic">
              <Briefcase size={24} className="text-[#9333ea]" /> Rubros Principales
            </h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input 
                type="text" 
                placeholder="Filtrar rubro..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/40 border border-white/5 rounded-full py-2 pl-9 pr-4 text-[10px] font-black text-white focus:outline-none w-36"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {records.length > 0 ? filteredRubros.map((rubro, i) => {
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
                              <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400" style={{ width: `${perc}%` }}></div>
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
            }) : (
              <div className="h-full flex items-center justify-center py-20 opacity-30 italic font-black uppercase text-[10px] tracking-widest">
                Esperando datos de Sheets...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
