
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Search, 
  Loader2, 
  Calendar, 
  RefreshCw, 
  Clock, 
  FileSpreadsheet,
  Database,
  Filter,
  User,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Save,
  DatabaseZap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
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

      // 2. Cargar desde Google Sheets (Sincronización Actual)
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
        console.warn("Sheets fetch failed, using DB only");
      }

      setRecords(combined);
      setLastSync(new Date().toLocaleTimeString('es-PY'));
    } catch (err: any) {
      setError("Error al sincronizar fuentes de datos.");
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

  const analytics = useMemo(() => {
    const rubros: Record<string, number> = {};
    records.forEach(r => {
      const name = (r.rubro || 'OTROS').toUpperCase().trim();
      rubros[name] = (rubros[name] || 0) + 1;
    });
    return {
      total: records.length,
      rubros: Object.entries(rubros).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count)
    };
  }, [records]);

  const filtered = records.filter(r => 
    r.contacto.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.ci.includes(searchTerm) ||
    r.rubro.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
             <Users className="text-green-500" size={32} />
             Módulo Clientes
          </h2>
          <div className="flex items-center gap-3 mt-1">
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-green-500/10 border-green-500/10 text-green-500">
               <DatabaseZap size={10} />
               <span className="text-[9px] font-black uppercase tracking-widest">Híbrido (Sheets + DB)</span>
             </div>
             {lastSync && (
               <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                 <Clock size={10} /> {lastSync}
               </span>
             )}
          </div>
        </div>
        
        <button 
          onClick={() => fetchData()}
          disabled={isSyncing}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-30 border border-green-500/30 transition-all"
        >
          {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Sincronizar Fuentes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1c1c1c] p-6 rounded-[1.5rem] border border-white/5">
          <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Total Clientes Unificados</p>
          <h3 className="text-3xl font-black text-white mt-1">{analytics.total}</h3>
        </div>
      </div>

      <div className="bg-[#1c1c1c] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 border border-green-500/10">
              <Database size={20} />
            </div>
            <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Base de Datos Central</h3>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-xs text-white focus:outline-none focus:border-green-500 transition-all w-full md:w-80"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-gray-600 uppercase tracking-widest border-b border-white/5 bg-black/20">
                <th className="py-6 px-10">Origen</th>
                <th className="py-6">Documento</th>
                <th className="py-6">Contacto</th>
                <th className="py-6">Rubro</th>
                <th className="py-6 px-10 text-right">Agente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r, i) => (
                <tr key={i} className="group hover:bg-white/5 transition-all">
                  <td className="py-6 px-10">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase ${r.source === 'supabase' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-gray-500 bg-white/5 border-white/10'}`}>
                      {r.source === 'supabase' ? 'PERMANENTE' : 'SHEETS'}
                    </span>
                  </td>
                  <td className="py-6 text-sm font-bold text-white tracking-tight">{r.ci}</td>
                  <td className="py-6 text-xs font-medium text-gray-400">{r.contacto}</td>
                  <td className="py-6">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">
                      {r.rubro}
                    </span>
                  </td>
                  <td className="py-6 px-10 text-right">
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">{r.agente}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
