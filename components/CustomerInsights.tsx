
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  RefreshCw, 
  Database,
  ShieldCheck,
  BarChart3,
  ChevronDown,
  Globe,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../supabase.ts';

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwWiU0msCle-8cRWGPxO4IGilOR5sFnJgfiVy_x00QhH8kDRyPSTZVMaYtlyDJBaPiQ/exec';

// Colores exactos de la referencia visual
const CHART_COLORS = [
  '#9333ea', // MEC (Púrpura)
  '#3b82f6', // SALUD (Azul)
  '#ec4899', // POLICIA (Rosa)
  '#10b981', // MILITAR (Verde)
  '#f59e0b', // FFAA (Naranja)
  '#6366f1', // IPS (Indigo)
  '#8b5cf6', // UNA (Violeta)
  '#d946ef'  // JUBILADA (Fucsia)
];

interface StandardizedRecord {
  ci: string;
  contacto: string;
  rubro: string;
  fecha: string;
  agente: string;
  source?: 'sheets' | 'supabase';
}

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
            if (cleanCI) uniqueRecordsMap.set(cleanCI, { ...item, source: 'supabase' });
          });
        }
      }
      try {
        const res = await fetch(GOOGLE_SHEETS_URL);
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const cleanCI = String(item.ci || '').trim();
            if (cleanCI && !uniqueRecordsMap.has(cleanCI)) {
              uniqueRecordsMap.set(cleanCI, {
                ci: cleanCI,
                contacto: String(item.contacto || ''),
                rubro: String(item.rubro || ''),
                fecha: String(item.fecha || ''),
                agente: String(item.agente || ''),
                source: 'sheets'
              });
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
      return matchText && recordDate.getFullYear() === targetYear && (recordDate.getMonth() + 1) === targetMonth;
    });
  }, [records, searchTerm, selectedMonth]);

  const metrics = useMemo(() => {
    const dailyCounts: Record<string, number> = {};
    const rubros: Record<string, number> = {};
    if (selectedMonth !== 'all') {
      const [year, monthStr] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, monthStr, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        dailyCounts[`${year}-${String(monthStr).padStart(2, '0')}-${String(d).padStart(2, '0')}`] = 0;
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
    const seriesData = Object.entries(dailyCounts).map(([date, value]) => ({
      date,
      dayLabel: selectedMonth === 'all' ? date.split('-').slice(1).reverse().join('/') : parseInt(date.split('-')[2]),
      value
    })).sort((a,b) => a.date.localeCompare(b.date));
    const uniqueDays = Object.keys(dailyCounts).length || 1;
    const sortedRubros = Object.entries(rubros).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    return {
      total: filtered.length,
      promedio: (filtered.length / uniqueDays).toFixed(1),
      lider: sortedRubros[0]?.name || 'N/A',
      rubrosData: sortedRubros.map(item => ({
        ...item,
        percent: (item.value / (sortedRubros[0]?.value || 1)) * 100
      })).slice(0, 8),
      seriesData: selectedMonth === 'all' ? seriesData.slice(-30) : seriesData
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
      {/* Header Clientes */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-7xl font-black text-white tracking-tighter uppercase italic">Clientes</h2>
          <div className="flex items-center gap-4">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
              <ShieldCheck size={12} className="text-purple-500" /> CENTRALIZED DATA CORE
            </p>
            <div className="px-4 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                {records.length} TOTAL REGISTROS IDENTIFICADOS
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           <div className="relative min-w-[280px]">
             <Globe size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-500 z-10" />
             <select 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="bg-[#121212] border border-white/5 rounded-2xl py-4 pl-14 pr-10 text-[11px] font-black text-white uppercase tracking-widest appearance-none cursor-pointer focus:outline-none focus:border-purple-500 transition-all w-full"
             >
               <option value="all">🌐 TODOS LOS TIEMPOS</option>
               <optgroup label="Filtrado Mensual (2025)">
                 {monthOptions.map(m => (
                   <option key={m.value} value={`2025-${m.value}`}>{m.label}</option>
                 ))}
               </optgroup>
             </select>
             <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
           </div>
           <button 
            onClick={() => fetchData()}
            disabled={isSyncing}
            className="bg-[#10b981] hover:bg-[#059669] text-white px-10 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 group"
          >
            {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />}
            SINCRO
          </button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: selectedMonth === 'all' ? 'Total Histórico' : 'Clientes en Periodo', val: metrics.total, color: 'text-green-500', bg: 'bg-green-500/5' },
          { label: 'Promedio Ingesta Diaria', val: metrics.promedio, color: 'text-blue-500', bg: 'bg-blue-500/5' },
          { label: 'Rubro Predominante', val: metrics.lider, color: 'text-purple-500', bg: 'bg-purple-500/5' }
        ].map((m, i) => (
          <div key={i} className="bg-[#121212] p-12 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className={`absolute top-0 right-0 w-32 h-32 ${m.bg} rounded-full -mr-16 -mt-16 opacity-50`}></div>
            <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.3em] mb-4">{m.label}</p>
            <h4 className={`text-7xl font-black ${m.color} tracking-tighter truncate uppercase italic`}>{m.val}</h4>
          </div>
        ))}
      </div>

      {/* Gráficos de Referencia Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ÚLTIMA ACTIVIDAD (Gráfico de área suave) */}
        <div className="bg-[#0c0c0c] p-12 rounded-[3.5rem] border border-white/5 shadow-2xl h-[600px] relative overflow-hidden flex flex-col">
          <div className="flex items-center gap-6 mb-20 relative z-10">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center">
              <BarChart3 size={28} className="text-blue-500" />
            </div>
            <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter">ÚLTIMA ACTIVIDAD</h3>
          </div>
          
          <div className="flex-1 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.seriesData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff03" />
                <XAxis 
                  dataKey="dayLabel" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#444', fontSize: 11, fontWeight: 900}} 
                  dy={20}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#444', fontSize: 11, fontWeight: 900}} 
                />
                <Tooltip 
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#121212] p-5 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{payload[0].payload.date}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-blue-500">CARGA:</span>
                            <span className="text-sm font-black text-white">{payload[0].value} <span className="text-[10px] text-gray-600 italic">Leads</span></span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={6} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  animationDuration={2000} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SEGMENTOS POR RUBRO (Gráfico de Dona y Barras) */}
        <div className="bg-[#0c0c0c] p-12 rounded-[3.5rem] border border-white/5 shadow-2xl h-[600px] flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-6 mb-12 relative z-10">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl border border-purple-500/20 flex items-center justify-center">
              <PieChartIcon size={28} className="text-purple-500" />
            </div>
            <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter">SEGMENTOS POR RUBRO</h3>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 flex-1 relative z-10">
            {/* Gráfico de Dona Central */}
            <div className="w-full lg:w-1/2 h-[350px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.rubrosData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={135}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {metrics.rubrosData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121212', border: 'none', borderRadius: '20px' }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest mb-1">TOTAL</span>
                 <span className="text-5xl font-black text-white tracking-tighter">{metrics.total}</span>
              </div>
            </div>

            {/* Listado de Barras de Progreso Lateral */}
            <div className="w-full lg:w-1/2 overflow-y-auto custom-scrollbar pr-4 space-y-6 max-h-[400px]">
              {metrics.rubrosData.map((rubro, idx) => (
                <div key={idx} className="space-y-2 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                      <span className="text-[12px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">
                        {rubro.name}
                      </span>
                    </div>
                    <span className="text-sm font-black text-white">{rubro.value}</span>
                  </div>
                  <div className="relative h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${rubro.percent}%`, 
                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                        boxShadow: `0 0 15px ${CHART_COLORS[idx % CHART_COLORS.length]}40`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Buscador de Tabla con Diseño mejorado */}
      <div className="bg-[#121212] p-10 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
        <div className="flex items-center gap-6 w-full md:w-auto">
           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500">
             <Search size={24} />
           </div>
           <input 
             type="text"
             placeholder="BUSCAR POR NOMBRE, CI O RUBRO EN LA BASE DE DATOS..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="bg-transparent text-sm text-white font-bold uppercase tracking-widest focus:outline-none w-full md:w-[600px] placeholder:text-gray-800"
           />
        </div>
        <div className="px-8 py-3 bg-white/5 rounded-2xl border border-white/5">
          <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
            {filtered.length} RESULTADOS FILTRADOS
          </span>
        </div>
      </div>

      {/* Tabla Centralizada */}
      <div className="bg-[#121212] rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] text-gray-700 uppercase tracking-widest border-b border-white/5 bg-black/30">
                <th className="py-10 px-12">ESTADO / ORIGEN</th>
                <th className="py-10">DOCUMENTO IDENTIDAD</th>
                <th className="py-10">CONTACTO / NOMBRE</th>
                <th className="py-10">CATEGORÍA</th>
                <th className="py-10 px-12 text-right">AGENTE ASIGNADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.slice(0, 100).map((r) => (
                <tr key={r.ci} className="group hover:bg-white/5 transition-all">
                  <td className="py-10 px-12">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${r.source === 'supabase' ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${r.source === 'supabase' ? 'text-purple-400' : 'text-green-500'}`}>
                        {r.source === 'supabase' ? 'DATABASE CORE' : 'CLOUD SYNC'}
                      </span>
                    </div>
                  </td>
                  <td className="py-10 font-bold text-white tracking-tighter text-lg">{r.ci}</td>
                  <td className="py-10">
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-gray-300 group-hover:text-white transition-colors">{r.contacto}</span>
                      <span className="text-[10px] text-gray-700 font-black uppercase tracking-widest mt-2 italic">{r.fecha}</span>
                    </div>
                  </td>
                  <td className="py-10">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] bg-white/5 px-4 py-2 rounded-xl border border-white/10 group-hover:border-purple-500/20 group-hover:text-purple-300 transition-all">
                      {r.rubro}
                    </span>
                  </td>
                  <td className="py-10 px-12 text-right font-black text-white uppercase text-[12px] italic tracking-tight">
                    {r.agente}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-60 text-center opacity-10 flex flex-col items-center">
              <Database size={80} className="mb-6" />
              <p className="text-xl font-black uppercase tracking-[0.5em]">Sin registros que mostrar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
