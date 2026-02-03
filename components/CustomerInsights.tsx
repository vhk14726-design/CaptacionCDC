
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  ChevronDown, 
  PieChart as PieChartIcon, 
  Calendar, 
  UserCheck, 
  Activity, 
  FilterX,
  Clock,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { 
  XAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzffCE6i9aLH2Wmo2R64kYBxMhZmENUoJR1pHVYxbeD5OMdA-yIvqxNVGcaaL-B-v31/exec';

const CHART_COLORS = ['#9333ea', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#d946ef'];

const MONTH_NAMES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
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
    if (num > 30000) return new Date(Math.round((num - 25569) * 86400 * 1000));
  }
  const strDate = String(dateVal).trim();
  const yyyymmdd = strDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yyyymmdd) return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
  const ddmmyyyy = strDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  const d = new Date(strDate);
  return isNaN(d.getTime()) ? null : d;
};

const formatDisplayDate = (val: any) => {
  const d = parseFlexibleDate(val);
  if (!d) return String(val || 'N/A');
  return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const CustomerInsights: React.FC<{ userRole?: string | null }> = ({ userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<StandardizedRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('all');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-11

  const fetchData = async (silent = false) => {
    if (!silent) {
      setIsSyncing(true);
      setError(null);
    }
    try {
      const uniqueRecordsMap = new Map<string, StandardizedRecord>();
      
      try {
        const res = await fetch(`${GOOGLE_SHEETS_URL}?t=${Date.now()}`);
        const rawData = await res.json();
        const sheetItems = Array.isArray(rawData) ? rawData : (rawData.data || rawData.content || []);
        
        if (Array.isArray(sheetItems)) {
          sheetItems.forEach((item: any) => {
            const ci = String(item.ci || item['Columna 1'] || item[0] || '').trim();
            const fechaRaw = item.fecha || item['Columna 4'] || item[3];
            const dObj = parseFlexibleDate(fechaRaw);

            if (ci && dObj && !ci.toLowerCase().includes("columna")) {
              const recordYear = dObj.getFullYear();
              const recordMonth = dObj.getMonth(); // 0-11

              // FILTRO: Año actual hasta el mes actual inclusive
              if (recordYear === currentYear && recordMonth <= currentMonthIdx) {
                const contacto = String(item.contacto || item['Columna 2'] || item[1] || '');
                const rubro = String(item.rubro || item['Columna 3'] || item[2] || '');
                const agente = String(item.agente || item['Columna 5'] || item[4] || '');
                
                let phone = item.telefono || '';
                if (!phone && contacto.includes('TEL:')) {
                  const parts = contacto.split('TEL:');
                  if (parts.length > 1) phone = parts[1].trim().replace(/\s/g, '');
                }
                
                uniqueRecordsMap.set(`${ci}-${agente}`, {
                  ci,
                  contacto,
                  telefono: phone,
                  rubro: rubro.toUpperCase() || 'GENERAL',
                  fecha: fechaRaw,
                  agente: agente.toUpperCase() || 'SISTEMA',
                  source: 'sheets'
                });
              }
            }
          });
        }
      } catch (e) {
        console.error("Sheets Error", e);
        if (!silent) setError("Error al conectar con la base de datos.");
      }
      
      const finalData = Array.from(uniqueRecordsMap.values());
      finalData.sort((a, b) => (parseFlexibleDate(b.fecha)?.getTime() || 0) - (parseFlexibleDate(a.fecha)?.getTime() || 0));
      setRecords(finalData);
    } catch (err) {
      console.error(err);
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

  // Generar meses desde Enero hasta el Mes Actual del sistema
  const availableMonthsList = useMemo(() => {
    const list = [];
    for (let i = 0; i <= currentMonthIdx; i++) {
      list.push({
        value: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
        label: MONTH_NAMES[i]
      });
    }
    return list.reverse(); // Mostrar el más reciente primero
  }, [currentYear, currentMonthIdx]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const search = searchTerm.toLowerCase().trim();
      const matchText = !search || 
                       r.contacto.toLowerCase().includes(search) || 
                       r.ci.includes(search) ||
                       (r.telefono || '').includes(search) ||
                       r.rubro.toLowerCase().includes(search) ||
                       r.agente.toLowerCase().includes(search);
      
      if (selectedMonth === 'all') return matchText;
      const [y, m] = selectedMonth.split('-').map(Number);
      const d = parseFlexibleDate(r.fecha);
      return matchText && d?.getFullYear() === y && (d?.getMonth() + 1) === m;
    });
  }, [records, searchTerm, selectedMonth]);

  const metrics = useMemo(() => {
    const daily: Record<string, number> = {};
    const rubros: Record<string, number> = {};
    
    filtered.forEach(r => {
      const rb = r.rubro || 'OTROS';
      rubros[rb] = (rubros[rb] || 0) + 1;
      const d = parseFlexibleDate(r.fecha);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        daily[key] = (daily[key] || 0) + 1;
      }
    });

    const seriesData = Object.entries(daily).map(([date, value]) => ({
      date,
      label: date.split('-').reverse().slice(0, 2).join('/'),
      value
    })).sort((a,b) => a.date.localeCompare(b.date));

    return {
      total: filtered.length,
      rubrosData: Object.entries(rubros).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8),
      seriesData: seriesData.slice(-15)
    };
  }, [filtered]);

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Clientes</h2>
          <div className="flex items-center gap-4">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
              <ShieldCheck size={12} className="text-purple-500" /> GESTIÓN {currentYear}
            </p>
            <div className="px-4 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-2">
              <Clock size={10} className="text-purple-400" />
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                DESDE ENERO HASTA {MONTH_NAMES[currentMonthIdx]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           <div className="relative min-w-[280px]">
             <Calendar size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-500 z-10" />
             <select 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="bg-[#121212] border border-white/5 rounded-2xl py-4 pl-14 pr-10 text-[11px] font-black text-white uppercase tracking-widest appearance-none cursor-pointer focus:outline-none focus:border-purple-500 transition-all w-full"
             >
               <option value="all">📅 GESTIÓN YTD (ENE - {MONTH_NAMES[currentMonthIdx]})</option>
               {availableMonthsList.map(m => (
                 <option key={m.value} value={m.value}>{m.label}</option>
               ))}
             </select>
             <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
           </div>
           <button 
            onClick={() => fetchData()}
            disabled={isSyncing}
            className="bg-[#10b981] hover:bg-[#059669] text-white px-10 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 group"
          >
            {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            SINCRO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#121212] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl h-[500px] flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-500/10 transition-colors"></div>
          <h3 className="text-2xl font-black text-white uppercase italic mb-8 flex items-center gap-4 relative z-10">
            <Activity size={20} className="text-blue-500" /> RENDIMIENTO {currentYear}
          </h3>
          <div className="flex-1 w-full min-h-0 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.seriesData}>
                <defs>
                  <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#333" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#121212', border: 'none', borderRadius: '16px' }} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBlue)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#121212] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl h-[500px] flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-purple-500/10 transition-colors"></div>
          <h3 className="text-2xl font-black text-white uppercase italic mb-8 flex items-center gap-4 relative z-10">
            <PieChartIcon size={20} className="text-purple-500" /> SECTORES DOMINANTES
          </h3>
          <div className="flex-1 flex flex-col md:flex-row items-center gap-8 min-h-0 relative z-10">
             <div className="w-full md:w-1/2 h-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={metrics.rubrosData} innerRadius="60%" outerRadius="90%" paddingAngle={5} dataKey="value" stroke="none">
                      {metrics.rubrosData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-gray-600 uppercase">FILTRADO</span>
                  <span className="text-4xl font-black text-white">{metrics.total}</span>
                </div>
             </div>
             <div className="w-full md:w-1/2 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                {metrics.rubrosData.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-white tracking-widest">
                       <span>{item.name}</span>
                       <span className="text-gray-500">{item.value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(item.value / (metrics.total || 1)) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <div className="bg-[#121212] p-8 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-6 w-full md:w-auto">
           <Search size={24} className="text-gray-700" />
           <input 
             type="text"
             placeholder="BUSCAR EN GESTIÓN ACTUAL..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="bg-transparent text-sm text-white font-black uppercase tracking-widest focus:outline-none w-full md:w-[500px] placeholder:text-gray-800"
           />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-6 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
            <TrendingUp size={12} className="text-green-500" />
            {filtered.length} RESULTADOS
          </div>
        </div>
      </div>

      <div className="bg-[#121212] rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] text-gray-700 uppercase tracking-[0.2em] border-b border-white/5 bg-black/20">
                <th className="py-10 px-12">ESTADO</th>
                <th className="py-10">CI CLIENTE</th>
                <th className="py-10">TELÉFONO</th>
                <th className="py-10">RUBRO</th>
                <th className="py-10">ASESOR</th>
                <th className="py-10 px-12 text-right">FECHA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r, i) => (
                <tr key={i} className="group hover:bg-white/5 transition-all">
                  <td className="py-10 px-12">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">ACTIVO</span>
                    </div>
                  </td>
                  <td className="py-10 text-lg font-black text-white">{r.ci}</td>
                  <td className="py-10 text-base font-black text-green-500">{r.telefono || 'CARGANDO...'}</td>
                  <td className="py-10">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                      {r.rubro}
                    </span>
                  </td>
                  <td className="py-10">
                    <div className="flex items-center gap-2">
                      <UserCheck size={14} className="text-blue-500" />
                      <span className="text-sm font-black text-white italic">{r.agente}</span>
                    </div>
                  </td>
                  <td className="py-10 px-12 text-right text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    {formatDisplayDate(r.fecha)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filtered.length === 0 && !isSyncing && (
            <div className="py-60 flex flex-col items-center opacity-20">
              <FilterX size={80} className="mb-6" />
              <p className="text-xl font-black uppercase tracking-[0.5em]">Sin datos para {selectedMonth === 'all' ? 'este año' : 'este mes'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
