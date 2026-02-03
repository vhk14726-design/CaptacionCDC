
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  RefreshCw, 
  Database,
  ShieldCheck,
  ChevronDown,
  Globe,
  PieChart as PieChartIcon,
  Phone,
  User,
  Calendar,
  Briefcase,
  UserCheck,
  Activity,
  AlertTriangle,
  FilterX,
  CheckCircle2
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../supabase.ts';

// URL de la implementación de Google Sheets
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzffCE6i9aLH2Wmo2R64kYBxMhZmENUoJR1pHVYxbeD5OMdA-yIvqxNVGcaaL-B-v31/exec';

const CHART_COLORS = [
  '#9333ea', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#d946ef'
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
  const yyyymmdd = strDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yyyymmdd) {
    return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
  }
  const ddmmyyyy = strDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }
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
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('all');

  const fetchData = async (silent = false) => {
    if (!silent) {
      setIsSyncing(true);
      setError(null);
    }
    try {
      const uniqueRecordsMap = new Map<string, StandardizedRecord>();
      
      // 1. Supabase (Opcional si lo usas)
      if (supabase) {
        try {
          const { data: sbData } = await supabase.from('prospectos').select('*');
          if (sbData) {
            sbData.forEach(item => {
              const ci = String(item.ci || '').trim();
              if (ci) uniqueRecordsMap.set(ci, { ...item, source: 'supabase' });
            });
          }
        } catch (e) {}
      }

      // 2. Google Sheets con Bypass de Caché
      try {
        const cacheBuster = `?t=${Date.now()}`;
        const res = await fetch(GOOGLE_SHEETS_URL + cacheBuster);
        const rawData = await res.json();
        
        const sheetItems = Array.isArray(rawData) ? rawData : (rawData.data || rawData.content || []);
        
        if (Array.isArray(sheetItems)) {
          sheetItems.forEach((item: any, idx: number) => {
            // MAPEO DINÁMICO: Soporta "Columna 1" o nombres limpios como "ci"
            const ci = String(item.ci || item['Columna 1'] || item[0] || '').trim();
            const contacto = String(item.contacto || item['Columna 2'] || item[1] || '');
            const rubro = String(item.rubro || item['Columna 3'] || item[2] || '');
            const fecha = String(item.fecha || item['Columna 4'] || item[3] || '');
            const agente = String(item.agente || item['Columna 5'] || item[4] || '');
            
            // Verificación estricta para no saltar datos reales
            if (ci && ci !== "" && !ci.toLowerCase().includes("columna") && ci.toLowerCase() !== "ci") {
              let phone = item.telefono || '';
              if (!phone && contacto.includes('TEL:')) {
                const parts = contacto.split('TEL:');
                if (parts.length > 1) phone = parts[1].trim().replace(/\s/g, '');
              }
              
              // Usamos CI + Agente como clave única para evitar duplicados si hay recargas
              const uniqueKey = `${ci}-${agente.replace(/\s/g, '')}`;
              uniqueRecordsMap.set(uniqueKey, {
                ci,
                contacto,
                telefono: phone,
                rubro: rubro.toUpperCase() || 'GENERAL',
                fecha,
                agente: agente.toUpperCase() || 'SISTEMA',
                source: 'sheets'
              });
            }
          });
        }
        setLastSync(new Date().toLocaleTimeString());
      } catch (e: any) { 
        console.error("Sheets fetch fail", e);
        if (!silent) setError("Error al conectar con Google Sheets.");
      }
      
      const finalRecords = Array.from(uniqueRecordsMap.values());
      // Ordenar por fecha descendente (asumiendo que los más nuevos están al final o tienen fecha mayor)
      finalRecords.sort((a, b) => {
        const dA = parseFlexibleDate(a.fecha)?.getTime() || 0;
        const dB = parseFlexibleDate(b.fecha)?.getTime() || 0;
        return dB - dA;
      });

      setRecords(finalRecords);
    } catch (err: any) { 
      console.error("Global sync error", err); 
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

  const filtered = useMemo(() => {
    return records.filter(r => {
      const search = searchTerm.toLowerCase().trim();
      const matchText = !search || 
                       (r.contacto || '').toLowerCase().includes(search) || 
                       (r.ci || '').includes(search) ||
                       (r.telefono || '').includes(search) ||
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
      dayLabel: date.split('-').slice(1).reverse().join('/'),
      value
    })).sort((a,b) => a.date.localeCompare(b.date));

    const sortedRubros = Object.entries(rubros).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    
    return {
      total: filtered.length,
      rubrosData: sortedRubros.map(item => ({
        ...item,
        percent: (item.value / (filtered.length || 1)) * 100
      })).slice(0, 8),
      seriesData: seriesData.slice(-15)
    };
  }, [filtered]);

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-7xl font-black text-white tracking-tighter uppercase italic">Clientes</h2>
          <div className="flex items-center gap-4">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
              <ShieldCheck size={12} className="text-purple-500" /> DATA CENTRAL SYNC
            </p>
            <div className="px-4 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                {filtered.length} REGISTROS EN LISTA
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           {lastSync && (
             <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest mr-4">
               Sincronizado: {lastSync}
             </span>
           )}
           <div className="relative min-w-[280px]">
             <Globe size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-500 z-10" />
             <select 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="bg-[#121212] border border-white/5 rounded-2xl py-4 pl-14 pr-10 text-[11px] font-black text-white uppercase tracking-widest appearance-none cursor-pointer focus:outline-none focus:border-purple-500 transition-all w-full"
             >
               <option value="all">🌐 TODOS LOS TIEMPOS</option>
               {["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"].map(m => (
                 <option key={m} value={m}>{m}</option>
               ))}
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

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex items-center gap-4 text-red-500 animate-in zoom-in-95">
          <AlertTriangle size={24} />
          <p className="text-xs font-black uppercase tracking-widest">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#121212] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col h-[550px]">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/5">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tight uppercase italic">Actividad de Carga</h3>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Historial de captación</p>
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
                <XAxis dataKey="dayLabel" stroke="#444" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                <Tooltip contentStyle={{ backgroundColor: '#121212', border: 'none', borderRadius: '16px' }} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#121212] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col h-[550px]">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-lg shadow-purple-500/5">
              <PieChartIcon size={24} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tight uppercase italic">Distribución</h3>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Rubros captados</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 flex-1 min-h-0">
            <div className="h-full w-full md:w-1/2 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.rubrosData} innerRadius="60%" outerRadius="95%" paddingAngle={5} dataKey="value" stroke="none">
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
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percent}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
             className="bg-transparent text-sm text-white font-black uppercase tracking-widest focus:outline-none w-full md:w-[600px] placeholder:text-gray-800"
           />
        </div>
        <div className="px-8 py-3 bg-white/5 rounded-2xl border border-white/5">
          <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
            {filtered.length} RESULTADOS ENCONTRADOS
          </span>
        </div>
      </div>

      <div className="bg-[#121212] rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] text-gray-700 uppercase tracking-[0.2em] border-b border-white/5 bg-black/30">
                <th className="py-10 px-12">ESTADO</th>
                <th className="py-10">DOCUMENTO</th>
                <th className="py-10">TELÉFONO</th>
                <th className="py-10">RUBRO</th>
                <th className="py-10">ASESOR</th>
                <th className="py-10 px-12 text-right">FECHA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r, idx) => (
                <tr key={`${r.ci}-${idx}`} className="group hover:bg-white/5 transition-all">
                  <td className="py-10 px-12">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${r.source === 'sheets' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${r.source === 'sheets' ? 'text-green-500' : 'text-purple-400'}`}>
                        {r.source === 'sheets' ? 'SYNC_SHEETS' : 'DB_PERSISTED'}
                      </span>
                    </div>
                  </td>
                  <td className="py-10">
                    <div className="flex items-center gap-3">
                      <User size={14} className="text-gray-600" />
                      <span className="font-bold text-white tracking-tight text-lg">{r.ci}</span>
                    </div>
                  </td>
                  <td className="py-10">
                    <div className="flex items-center gap-3 text-green-500">
                      <Phone size={14} />
                      <span className="text-base font-black tracking-tight">
                        {r.telefono || 'EN PROCESO'}
                      </span>
                    </div>
                  </td>
                  <td className="py-10">
                    <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest bg-white/5 px-6 py-2.5 rounded-2xl border border-white/10">
                      {r.rubro}
                    </span>
                  </td>
                  <td className="py-10">
                    <div className="flex items-center gap-3">
                      <UserCheck size={14} className="text-purple-500" />
                      <span className="text-[13px] font-black text-white italic tracking-tight uppercase">
                        {r.agente}
                      </span>
                    </div>
                  </td>
                  <td className="py-10 px-12 text-right">
                    <div className="flex items-center justify-end gap-3 text-gray-600">
                      <Calendar size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {formatDisplayDate(r.fecha)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filtered.length === 0 && !isSyncing && (
            <div className="py-60 text-center opacity-30 flex flex-col items-center">
              <FilterX size={80} className="mb-6 text-gray-700" />
              <p className="text-xl font-black uppercase tracking-[0.5em] text-gray-700">Base de datos sin resultados</p>
              <button onClick={() => {setSearchTerm(''); setSelectedMonth('all'); fetchData();}} className="mt-6 text-[10px] font-black text-purple-500 uppercase tracking-widest border border-purple-500/20 px-6 py-3 rounded-xl hover:bg-purple-500/10 transition-all">Limpiar y Re-Sincronizar</button>
            </div>
          )}
          
          {isSyncing && (
            <div className="py-60 text-center flex flex-col items-center">
              <Loader2 size={40} className="animate-spin text-purple-500 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 italic">Leyendo base de datos centralizada...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
