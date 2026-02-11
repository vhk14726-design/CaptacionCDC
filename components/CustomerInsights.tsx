
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
  TrendingUp,
} from 'lucide-react';
import { 
  XAxis, 
  YAxis,
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  CartesianGrid as ReCartesianGrid,
  PieChart,
  Pie
} from 'recharts';
import { supabase } from '../supabase.ts';

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzffCE6i9aLH2Wmo2R64kYBxMhZmENUoJR1pHVYxbeD5OMdA-yIvqxNVGcaaL-B-v31/exec';

const LOGO_PURPLE = '#9333ea';
const LOGO_PURPLE_DARK = '#4c1d95';
const CHART_COLORS = [LOGO_PURPLE, '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#d946ef'];

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

const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const candleColor = isUp ? LOGO_PURPLE : LOGO_PURPLE_DARK;
  const scale = height / Math.max(Math.abs(open - close), 0.1);
  const highY = y - (high - Math.max(open, close)) * scale;
  const lowY = y + height + (Math.min(open, close) - low) * scale;

  return (
    <g>
      <line x1={x + width / 2} y1={highY} x2={x + width / 2} y2={lowY} stroke={candleColor} strokeWidth={2} strokeOpacity={isUp ? 0.8 : 0.4} />
      <rect x={x} y={y} width={width} height={Math.max(height, 2)} fill={candleColor} fillOpacity={isUp ? 1 : 0.6} rx={2} />
    </g>
  );
};

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
  const [selectedMonth, setSelectedMonth] = useState('all');

  const DISPLAY_YEAR = 2026;

  const fetchData = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const uniqueRecordsMap = new Map<string, StandardizedRecord>();

      const sheetRes = await fetch(`${GOOGLE_SHEETS_URL}?t=${Date.now()}`);
      const rawSheet = await sheetRes.json();
      const sheetItems = Array.isArray(rawSheet) ? rawSheet : (rawSheet.data || []);
      
      sheetItems.forEach((item: any) => {
        const ci = String(item.ci || item[0] || '').trim();
        const dObj = parseFlexibleDate(item.fecha || item[3]);
        if (ci && dObj && dObj.getFullYear() === DISPLAY_YEAR) {
          uniqueRecordsMap.set(`${ci}-${item.agente}`, {
            ci,
            contacto: String(item.contacto || ''),
            rubro: String(item.rubro || '').toUpperCase(),
            fecha: item.fecha || item[3],
            agente: String(item.agente || '').toUpperCase(),
            source: 'sheets'
          });
        }
      });

      if (supabase) {
        const { data: dbItems } = await supabase.from('prospectos').select('*');
        dbItems?.forEach((item: any) => {
          const dObj = parseFlexibleDate(item.fecha);
          if (item.ci && dObj && dObj.getFullYear() === DISPLAY_YEAR) {
            uniqueRecordsMap.set(`db-${item.ci}-${item.agente}`, {
              ci: item.ci,
              contacto: item.contacto,
              rubro: item.rubro.toUpperCase(),
              fecha: item.fecha,
              agente: item.agente.toUpperCase(),
              source: 'supabase'
            });
          }
        });
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

  const availableMonthsList = useMemo(() => {
    const list = [];
    for (let i = 0; i < 12; i++) {
      list.push({ value: `${DISPLAY_YEAR}-${String(i + 1).padStart(2, '0')}`, label: MONTH_NAMES[i] });
    }
    return list;
  }, []);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const search = searchTerm.toLowerCase().trim();
      const matchText = !search || r.contacto.toLowerCase().includes(search) || r.ci.includes(search) || r.rubro.toLowerCase().includes(search);
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
      rubros[r.rubro] = (rubros[r.rubro] || 0) + 1;
      const d = parseFlexibleDate(r.fecha);
      if (d) {
        const key = d.toISOString().split('T')[0];
        daily[key] = (daily[key] || 0) + 1;
      }
    });
    const sortedDates = Object.entries(daily).sort((a,b) => a[0].localeCompare(b[0]));
    const candlestickData = sortedDates.map(([date, value], idx) => ({
      date,
      label: date.split('-').reverse().slice(0, 2).join('/'),
      open: idx > 0 ? sortedDates[idx-1][1] : value * 0.8,
      close: value,
      high: value + 2,
      low: Math.max(0, value - 2),
      value
    }));

    return {
      total: filtered.length,
      rubrosData: Object.entries(rubros).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8),
      seriesData: candlestickData.slice(-20)
    };
  }, [filtered]);

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Dashboard Captación</h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2 mt-2">
            <ShieldCheck size={12} className="text-purple-500" /> GESTIÓN {DISPLAY_YEAR}
          </p>
        </div>
        <div className="flex items-center gap-4">
           <select 
             value={selectedMonth} 
             onChange={(e) => setSelectedMonth(e.target.value)}
             className="bg-[#121212] border border-white/5 rounded-2xl py-4 px-6 text-[11px] font-black text-white uppercase tracking-widest focus:outline-none focus:border-purple-500 cursor-pointer"
           >
             <option value="all">📅 GESTIÓN COMPLETA {DISPLAY_YEAR}</option>
             {availableMonthsList.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
           </select>
           <button onClick={() => fetchData()} disabled={isSyncing} className="bg-[#10b981] hover:bg-[#059669] text-white px-10 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
             {isSyncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} SINCRO
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#121212] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl h-[500px] flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-purple-500/10 transition-colors"></div>
          <h3 className="text-2xl font-black text-white uppercase italic mb-8 flex items-center gap-4 relative z-10">
            <Activity size={20} className="text-[#9333ea]" /> RENDIMIENTO {DISPLAY_YEAR}
          </h3>
          <div className="flex-1 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={metrics.seriesData}>
                <ReCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="label" stroke="#333" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #ffffff10', borderRadius: '16px', padding: '12px' }}
                  itemStyle={{ color: '#ffffff', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', fontFamily: 'Plus Jakarta Sans' }}
                  labelStyle={{ color: LOGO_PURPLE, fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar name="Clientes Cargados" dataKey="close" shape={<CandlestickShape />} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#121212] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl h-[500px] flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-purple-500/10 transition-colors"></div>
          <h3 className="text-2xl font-black text-white uppercase italic mb-8 flex items-center gap-4 relative z-10">
            <PieChartIcon size={20} className="text-purple-500" /> SECTORES DOMINANTES
          </h3>
          <div className="flex-1 flex flex-col md:flex-row items-center gap-8 relative z-10">
             <div className="w-full md:w-1/2 h-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={metrics.rubrosData} innerRadius="60%" outerRadius="90%" paddingAngle={5} dataKey="value" stroke="none">
                      {metrics.rubrosData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-gray-600 uppercase">CLIENTES</span>
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
           <input type="text" placeholder="BUSCAR EN GESTIÓN ACTUAL..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm text-white font-black uppercase tracking-widest focus:outline-none w-full md:w-[500px] placeholder:text-gray-800" />
        </div>
        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-6 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
          <TrendingUp size={12} className="text-green-500" /> {filtered.length} RESULTADOS
        </div>
      </div>

      <div className="bg-[#121212] rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] text-gray-700 uppercase tracking-[0.2em] border-b border-white/5 bg-black/20">
                <th className="py-10 px-12">ORIGEN</th>
                <th className="py-10">CI CLIENTE</th>
                <th className="py-10">RUBRO</th>
                <th className="py-10">ASESOR</th>
                <th className="py-10 px-12 text-right">FECHA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r, i) => (
                <tr key={i} className="group hover:bg-white/5 transition-all">
                  <td className="py-10 px-12">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${r.source === 'supabase' ? 'text-purple-500 bg-purple-500/10 border-purple-500/20' : 'text-blue-500 bg-blue-500/10 border-blue-500/20'}`}>
                      {r.source === 'supabase' ? 'EXCEL' : 'DIRECTO'}
                    </span>
                  </td>
                  <td className="py-10 text-lg font-black text-white">{r.ci}</td>
                  <td className="py-10 text-[10px] font-black text-gray-400 uppercase tracking-widest">{r.rubro}</td>
                  <td className="py-10 text-sm font-black text-white italic">{r.agente}</td>
                  <td className="py-10 px-12 text-right text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    {formatDisplayDate(r.fecha)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-60 flex flex-col items-center opacity-20"><FilterX size={80} /><p className="text-xl font-black uppercase tracking-widest mt-6">Sin datos para {DISPLAY_YEAR}</p></div>}
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
