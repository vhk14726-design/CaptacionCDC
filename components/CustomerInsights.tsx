
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
  PieChart as PieChartIcon,
  Phone,
  User,
  Calendar,
  Briefcase,
  UserCheck,
  TrendingUp,
  Activity
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
  telefono?: string;
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
            if (cleanCI) {
              let phone = item.telefono || '';
              if (!phone && item.contacto?.includes('TEL:')) {
                phone = item.contacto.split('TEL:')[1].trim();
              }
              uniqueRecordsMap.set(cleanCI, { ...item, telefono: phone, source: 'supabase' });
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
            if (cleanCI && !uniqueRecordsMap.has(cleanCI)) {
              let phone = item.telefono || '';
              if (!phone && item.contacto?.includes('TEL:')) {
                phone = item.contacto.split('TEL:')[1].trim();
              }
              uniqueRecordsMap.set(cleanCI, {
                ci: cleanCI,
                contacto: String(item.contacto || ''),
                telefono: phone,
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
      const matchText = (r.contacto || '').toLowerCase().includes(search) || 
                       (r.ci || '').includes(searchTerm) ||
                       (r.telefono || '').includes(searchTerm) ||
                       (r.rubro || '').toLowerCase().includes(search) ||
                       (r.agente || '').toLowerCase().includes(search);
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

    const sortedRubros = Object.entries(rubros).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    
    return {
      total: filtered.length,
      lider: sortedRubros[0]?.name || 'N/A',
      rubrosData: sortedRubros.map(item => ({
        ...item,
        percent: (item.value / (filtered.length || 1)) * 100
      })).slice(0, 8),
      seriesData: selectedMonth === 'all' ? seriesData.slice(-15) : seriesData
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

      {/* Seccion de Graficas (Arriba) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Gráfico 1: Última Actividad */}
        <div className="bg-[#121212] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col h-[550px]">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/5">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tight uppercase italic">Última Actividad</h3>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Tendencia de Ingreso de Datos</p>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.seriesData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="dayLabel" 
                  stroke="#444" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  fontWeight="bold"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121212', border: 'none', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  strokeWidth={4} 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Segmentos por Rubro */}
        <div className="bg-[#121212] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col h-[550px]">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-lg shadow-purple-500/5">
              <PieChartIcon size={24} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tight uppercase italic">Segmentos por Rubro</h3>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Distribución de Cartera</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 flex-1 min-h-0 overflow-hidden">
            <div className="h-full w-full md:w-1/2 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.rubrosData}
                    innerRadius="60%"
                    outerRadius="95%"
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {metrics.rubrosData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#121212', border: 'none', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">TOTAL</span>
                <span className="text-5xl font-black text-white">{metrics.total}</span>
              </div>
            </div>
            <div className="w-full md:w-1/2 space-y-4 overflow-y-auto custom-scrollbar pr-2 max-h-[350px]">
              {metrics.rubrosData.map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                      <span className="text-[11px] font-black text-white uppercase tracking-widest">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-gray-500">{item.value}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ 
                        width: `${item.percent}%`, 
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length] 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Buscador de Tabla */}
      <div className="bg-[#121212] p-10 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl mt-12">
        <div className="flex items-center gap-6 w-full md:w-auto">
           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500">
             <Search size={24} />
           </div>
           <input 
             type="text"
             placeholder="BUSCAR POR CI, TELÉFONO, RUBRO O AGENTE..."
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
                <th className="py-10 px-12">ORIGEN</th>
                <th className="py-10">CI / DOCUMENTO</th>
                <th className="py-10">TELÉFONO</th>
                <th className="py-10">RUBRO / INTERÉS</th>
                <th className="py-10">AGENTE RESPONSABLE</th>
                <th className="py-10 px-12 text-right">FECHA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.slice(0, 100).map((r) => (
                <tr key={r.ci} className="group hover:bg-white/5 transition-all">
                  <td className="py-10 px-12">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${r.source === 'supabase' ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`}></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${r.source === 'supabase' ? 'text-purple-400' : 'text-green-500'}`}>
                        {r.source === 'supabase' ? 'DATABASE' : 'SHEETS'}
                      </span>
                    </div>
                  </td>
                  <td className="py-10">
                    <div className="flex items-center gap-3">
                      <User size={14} className="text-gray-600" />
                      <span className="font-bold text-white tracking-tighter text-lg">{r.ci}</span>
                    </div>
                  </td>
                  <td className="py-10">
                    <div className="flex items-center gap-3 text-green-500">
                      <Phone size={14} />
                      <span className="text-base font-black tracking-tight">{r.telefono || 'SIN TELÉFONO'}</span>
                    </div>
                  </td>
                  <td className="py-10">
                    <div className="flex items-center gap-3">
                      <Briefcase size={14} className="text-gray-600" />
                      <span className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] bg-white/5 px-4 py-2 rounded-xl border border-white/10 group-hover:border-purple-500/20 transition-all">
                        {r.rubro}
                      </span>
                    </div>
                  </td>
                  <td className="py-10">
                    <div className="flex items-center gap-3">
                      <UserCheck size={14} className="text-purple-500" />
                      <span className="text-[12px] font-black text-white uppercase italic tracking-tight">
                        {r.agente}
                      </span>
                    </div>
                  </td>
                  <td className="py-10 px-12 text-right">
                    <div className="flex items-center justify-end gap-3 text-gray-500">
                      <Calendar size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{r.fecha}</span>
                    </div>
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
