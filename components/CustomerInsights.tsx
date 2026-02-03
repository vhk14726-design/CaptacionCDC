
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
  Table as TableIcon,
  ChevronRight,
  BarChart3,
  XCircle,
  ChevronDown,
  Globe
} from 'lucide-react';
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

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwWiU0msCle-8cRWGPxO4IGilOR5sFnJgfiVy_x00QhH8kDRyPSTZVMaYtlyDJBaPiQ/exec';

interface StandardizedRecord {
  ci: string;
  contacto: string;
  rubro: string;
  fecha: string;
  agente: string;
  source?: 'sheets' | 'supabase';
}

// PROCESADOR DE FECHAS DE ALTA PRECISIÓN
const parseFlexibleDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;

  if (!isNaN(dateVal) && typeof dateVal !== 'boolean') {
    const num = Number(dateVal);
    if (num > 30000) {
      return new Date(Math.round((num - 25569) * 86400 * 1000));
    }
  }

  const strDate = String(dateVal).trim();

  const ddmmyyyy = strDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }

  const d = new Date(strDate);
  return isNaN(d.getTime()) ? null : d;
};

const CustomerInsights: React.FC<{ userRole?: string | null }> = ({ userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<StandardizedRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Cambio: Ahora inicia en 'all' (Todos los tiempos)
  const [selectedMonth, setSelectedMonth] = useState('all');
  
  const isAdmin = userRole === 'admin';

  const fetchData = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const uniqueRecordsMap = new Map<string, StandardizedRecord>();

      if (supabase) {
        const { data: sbData, error: sbError } = await supabase
          .from('prospectos')
          .select('*')
          .order('id', { ascending: false });
        
        if (!sbError && sbData) {
          sbData.forEach(item => {
            const cleanCI = String(item.ci || '').trim();
            if (cleanCI) {
              uniqueRecordsMap.set(cleanCI, { ...item, source: 'supabase' });
            }
          });
        }
      }

      try {
        const res = await fetch(GOOGLE_SHEETS_URL);
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const cleanCI = String(item.ci || '').trim();
            if (cleanCI) {
              if (!uniqueRecordsMap.has(cleanCI)) {
                uniqueRecordsMap.set(cleanCI, {
                  ci: cleanCI,
                  contacto: String(item.contacto || ''),
                  rubro: String(item.rubro || ''),
                  fecha: String(item.fecha || ''),
                  agente: String(item.agente || ''),
                  source: 'sheets'
                });
              }
            }
          });
        }
      } catch (e) { console.warn("Sheets fetch failed"); }

      setRecords(Array.from(uniqueRecordsMap.values()));
    } catch (err: any) { console.error("Sync error", err); } finally { if (!silent) setIsSyncing(false); }
  };

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData(true);
    window.addEventListener('customer_data_updated', handleUpdate);
    return () => window.removeEventListener('customer_data_updated', handleUpdate);
  }, []);

  // FILTRADO DE DATOS
  const filtered = useMemo(() => {
    return records.filter(r => {
      const search = searchTerm.toLowerCase();
      const matchText = r.contacto.toLowerCase().includes(search) || 
                       r.ci.includes(searchTerm) ||
                       r.rubro.toLowerCase().includes(search);
      
      if (selectedMonth === 'all') return matchText;

      const [targetYear, targetMonth] = selectedMonth.split('-').map(Number);
      const recordDate = parseFlexibleDate(r.fecha);
      if (!recordDate) return matchText;

      const matchMonth = recordDate.getFullYear() === targetYear && 
                        (recordDate.getMonth() + 1) === targetMonth;
      
      return matchText && matchMonth;
    });
  }, [records, searchTerm, selectedMonth]);

  // CÁLCULO DE MÉTRICAS
  const metrics = useMemo(() => {
    const dailyCounts: Record<string, number> = {};
    const rubros: Record<string, number> = {};

    // Si es un mes específico, inicializamos todos los días del mes
    if (selectedMonth !== 'all') {
      const [year, monthStr] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, monthStr, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(monthStr).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dailyCounts[dateKey] = 0;
      }
    }

    filtered.forEach(r => {
      const rName = (r.rubro || 'OTROS').toUpperCase().trim();
      rubros[rName] = (rubros[rName] || 0) + 1;
      
      const dObj = parseFlexibleDate(r.fecha);
      if (dObj) {
        const key = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
        dailyCounts[key] = (dailyCounts[key] || 0) + 1;
      }
    });

    const seriesData = Object.entries(dailyCounts)
      .map(([date, value]) => ({
        date,
        dayLabel: selectedMonth === 'all' ? date.split('-').slice(1).reverse().join('/') : parseInt(date.split('-')[2]),
        value
      }))
      .sort((a,b) => a.date.localeCompare(b.date));

    // Para el promedio en "Todos los tiempos", usamos los días que tienen al menos un registro
    const uniqueDays = Object.keys(dailyCounts).length || 1;
    const sortedRubros = Object.entries(rubros)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);

    return {
      total: filtered.length,
      promedio: (filtered.length / uniqueDays).toFixed(1),
      lider: sortedRubros[0]?.name || 'N/A',
      rubrosData: sortedRubros.map(item => ({
        ...item,
        percent: (item.value / (sortedRubros[0]?.value || 1)) * 100
      })).slice(0, 8),
      seriesData: selectedMonth === 'all' ? seriesData.slice(-30) : seriesData // En "todos los tiempos" mostramos últimos 30 días de actividad en el gráfico para no saturar
    };
  }, [filtered, selectedMonth]);

  const monthOptions = [
    { label: 'Enero', value: '01' }, { label: 'Febrero', value: '02' }, { label: 'Marzo', value: '03' },
    { label: 'Abril', value: '04' }, { label: 'Mayo', value: '05' }, { label: 'Junio', value: '06' },
    { label: 'Julio', value: '07' }, { label: 'Agosto', value: '08' }, { label: 'Septiembre', value: '09' },
    { label: 'Octubre', value: '10' }, { label: 'Noviembre', value: '11' }, { label: 'Diciembre', value: '12' }
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic">Clientes</h2>
          <div className="flex items-center gap-4">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
              <ShieldCheck size={12} className="text-purple-500" /> BASE DE DATOS UNIFICADA
            </p>
            <div className="px-3 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">
                {records.length} TOTAL REGISTROS
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           <div className="relative min-w-[240px]">
             <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500 z-10" />
             <select 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="bg-[#141414] border border-white/5 rounded-xl py-3 pl-12 pr-10 text-[11px] font-black text-white uppercase tracking-widest appearance-none cursor-pointer focus:outline-none focus:border-purple-500 transition-all w-full"
             >
               <option value="all">🌐 TODOS LOS TIEMPOS</option>
               <optgroup label={`${new Date().getFullYear()} - Meses`}>
                 {monthOptions.map(m => (
                   <option key={m.value} value={`${new Date().getFullYear()}-${m.value}`}>{m.label}</option>
                 ))}
               </optgroup>
             </select>
             <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
           </div>

           <button 
            onClick={() => fetchData()}
            disabled={isSyncing}
            className="bg-[#10b981] hover:bg-[#059669] text-white px-8 py-3 rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 group"
          >
            {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            SINCRO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: selectedMonth === 'all' ? 'Total Histórico' : 'Clientes en Periodo', val: metrics.total, color: 'text-green-500' },
          { label: 'Promedio Ingesta', val: metrics.promedio, color: 'text-blue-500' },
          { label: 'Rubro Predominante', val: metrics.lider, color: 'text-purple-500' }
        ].map((m, i) => (
          <div key={i} className="bg-[#141414] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">{m.label}</p>
            <h4 className={`text-6xl font-black ${m.color} tracking-tighter truncate uppercase italic`}>{m.val}</h4>
          </div>
        ))}
      </div>

      <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 shadow-2xl h-[550px] relative overflow-hidden">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <BarChart3 size={24} className="text-blue-500" />
            </div>
            <h3 className="text-3xl font-black text-white uppercase italic tracking-widest">
              {selectedMonth === 'all' ? 'ÚLTIMA ACTIVIDAD' : 'CARGA POR FECHA'}
            </h3>
          </div>
          <div className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-6 py-2 rounded-full border border-blue-500/20 tracking-widest uppercase">
            {selectedMonth === 'all' ? 'VISTA GLOBAL' : 'VISTA MENSUAL'}
          </div>
        </div>
        
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.seriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
              <XAxis dataKey="dayLabel" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 900}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 900}} />
              <Tooltip 
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-white/10 shadow-2xl">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{payload[0].payload.date}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-blue-500">CARGA:</span>
                          <span className="text-sm font-black text-white">{payload[0].value} <span className="text-[10px] text-gray-600">Leads</span></span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorValue)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="pt-8 border-t border-white/5 mt-auto flex justify-between items-center opacity-40">
          <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest italic">Análisis de inyección de leads en el tiempo</span>
          <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Filtro: {selectedMonth === 'all' ? 'Global' : selectedMonth}</span>
        </div>
      </div>

      <div className="bg-[#141414] p-8 rounded-[2rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <Search size={20} className="text-gray-500" />
           <input 
             type="text"
             placeholder="Buscar por nombre, CI o rubro..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="bg-transparent text-sm text-white font-medium focus:outline-none w-full md:w-[400px]"
           />
        </div>
        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest whitespace-nowrap">
           {filtered.length} Leads Identificados
        </div>
      </div>

      <div className="bg-[#141414] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-gray-700 uppercase tracking-widest border-b border-white/5 bg-black/20">
                <th className="py-8 px-10">Origen</th>
                <th className="py-8">Documento</th>
                <th className="py-8">Contacto</th>
                <th className="py-8">Rubro</th>
                <th className="py-8 px-10 text-right">Agente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.slice(0, 100).map((r) => (
                <tr key={r.ci} className="group hover:bg-white/5 transition-all">
                  <td className="py-8 px-10">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${r.source === 'supabase' ? 'text-purple-400' : 'text-green-500'}`}>
                      {r.source === 'supabase' ? 'DB CENTRAL' : 'SHEETS'}
                    </span>
                  </td>
                  <td className="py-8 font-bold text-white tracking-tight">{r.ci}</td>
                  <td className="py-8">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-300">{r.contacto}</span>
                      <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">{r.fecha}</span>
                    </div>
                  </td>
                  <td className="py-8 text-[10px] font-black text-gray-500 uppercase">{r.rubro}</td>
                  <td className="py-8 px-10 text-right font-black text-purple-400 uppercase text-[11px] italic">{r.agente}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-40 text-center opacity-20">
              <Database size={64} className="mx-auto mb-4" />
              <p className="text-sm font-black uppercase tracking-[0.3em]">Sin registros que mostrar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
