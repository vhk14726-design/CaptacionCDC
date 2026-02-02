
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
  AlertCircle,
  Filter,
  User,
  ArrowRight,
  ExternalLink,
  ShieldAlert
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

// URL Proporcionada por el usuario
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwWiU0msCle-8cRWGPxO4IGilOR5sFnJgfiVy_x00QhH8kDRyPSTZVMaYtlyDJBaPiQ/exec';

interface StandardizedRecord {
  ci: string;
  contacto: string;
  rubro: string;
  fecha: string;
  agente: string;
}

interface CustomerInsightsProps {
  userRole?: 'admin' | 'user' | null;
}

const CustomerInsights: React.FC<CustomerInsightsProps> = ({ userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<StandardizedRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<{message: string, type: string} | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    setError(null);
    
    try {
      // Usamos un fetch simple. Google Apps Script maneja redirecciones 302.
      const response = await fetch(GOOGLE_SHEETS_URL);
      
      if (!response.ok) {
        throw new Error(`Error de servidor: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      if (Array.isArray(rawData)) {
        // Mapeo flexible para asegurar que las claves coincidan sin importar mayúsculas/minúsculas
        const mappedData = rawData.map((item: any) => {
          const findKey = (name: string) => {
            return Object.keys(item).find(k => k.toLowerCase() === name.toLowerCase()) || name;
          };

          return {
            ci: String(item[findKey('ci')] || ''),
            contacto: String(item[findKey('contacto')] || ''),
            rubro: String(item[findKey('rubro')] || ''),
            fecha: String(item[findKey('fecha')] || ''),
            agente: String(item[findKey('agente')] || '')
          };
        });

        setRecords(mappedData);
        setLastSync(new Date().toLocaleTimeString('es-PY'));
      } else {
        throw new Error('La respuesta de Google Sheets no es un listado válido.');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError({ 
        message: 'No se pudo conectar con Google Sheets. Si el error persiste, verifica que el script esté publicado como "Cualquier persona".',
        type: 'network'
      });
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    // Refresco automático cada 2 minutos
    const interval = setInterval(() => fetchData(true), 120000);
    return () => clearInterval(interval);
  }, []);

  const analytics = useMemo(() => {
    if (records.length === 0) return { total: 0, avg: 0, rubros: [], chartData: [] };
    
    const total = records.length;
    const rubroCount: Record<string, number> = {};
    const dateCount: Record<string, number> = {};

    records.forEach(r => {
      const rubro = (r.rubro || 'OTROS').toUpperCase().trim();
      const fecha = (r.fecha || 'Sin fecha').trim();
      rubroCount[rubro] = (rubroCount[rubro] || 0) + 1;
      dateCount[fecha] = (dateCount[fecha] || 0) + 1;
    });

    const rubros = Object.entries(rubroCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
      
    const chartData = Object.entries(dateCount)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-7);

    return { 
      total, 
      avg: total / (Object.keys(dateCount).length || 1), 
      rubros, 
      chartData 
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      r.contacto.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.ci.includes(searchTerm) ||
      r.agente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.rubro.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
             <FileSpreadsheet className="text-green-500" size={32} />
             Base Centralizada
          </h2>
          <div className="flex items-center gap-3 mt-1">
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-green-500/10 border-green-500/10 text-green-500">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-[9px] font-black uppercase tracking-widest">Sincronización Activa</span>
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
          Refrescar Ahora
        </button>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 mb-10">
          <div className="p-8 bg-red-500/10 border-b border-red-500/10 flex items-center justify-between">
            <div className="flex items-center gap-4 text-red-500">
              <ShieldAlert size={28} />
              <h3 className="text-xl font-black uppercase italic tracking-tight">Error de Sincronización</h3>
            </div>
            <a 
              href={GOOGLE_SHEETS_URL} 
              target="_blank" 
              className="flex items-center gap-2 text-[10px] font-black text-white bg-red-600 px-4 py-2.5 rounded-xl hover:bg-red-700 transition-all uppercase tracking-widest shadow-lg shadow-red-600/20"
            >
              PROBAR ACCESO <ExternalLink size={12} />
            </a>
          </div>
          <div className="p-8 space-y-4">
            <p className="text-sm text-gray-300 font-medium italic">{error.message}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Causa:</p>
                <p className="text-xs text-gray-500 leading-relaxed">El navegador bloqueó la conexión. Esto ocurre si el script de Google no tiene permisos públicos.</p>
              </div>
              <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Solución:</p>
                <p className="text-xs text-gray-500 leading-relaxed">Ve a tu Apps Script, haz clic en <strong>Implementar > Nueva Implementación</strong> y pon "Quién tiene acceso" en <strong>Cualquier persona</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1c1c1c] p-8 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <Users size={32} className="text-green-500 mb-4 opacity-50" />
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Prospectos Totales</p>
          <h3 className="text-4xl font-black text-white mt-1">{isSyncing ? '...' : analytics.total}</h3>
        </div>
        
        <div className="bg-[#1c1c1c] p-8 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <TrendingUp size={32} className="text-blue-500 mb-4 opacity-50" />
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Promedio Diario</p>
          <h3 className="text-4xl font-black text-white mt-1">{isSyncing ? '...' : analytics.avg.toFixed(1)}</h3>
        </div>

        <div className="bg-[#1c1c1c] p-8 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <Database size={32} className="text-purple-500 mb-4 opacity-50" />
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Rubro Líder</p>
          <h3 className="text-xl font-black text-white mt-1 uppercase truncate">{isSyncing ? '...' : (analytics.rubros[0]?.name || 'N/A')}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#1c1c1c] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col">
          <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 uppercase italic">
            <Calendar className="text-blue-500" size={24} /> Registros Semanales
          </h3>
          <div className="h-[250px] w-full">
            {records.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 800}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10}} />
                  <Tooltip 
                    cursor={{fill: '#ffffff05'}}
                    contentStyle={{ backgroundColor: '#0a0a0a', border: 'none', borderRadius: '16px', padding: '12px' }} 
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-700 text-[10px] font-black uppercase tracking-widest italic">Cargando visualizaciones...</div>
            )}
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
          <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 uppercase italic">
            <Filter className="text-purple-500" size={24} /> Segmentos de Negocio
          </h3>
          <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-4">
            {analytics.rubros.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 group hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-[10px] font-black text-purple-400 border border-purple-500/20">
                    {i + 1}
                  </div>
                  <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{r.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-white">{r.count}</span>
                  <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full" 
                      style={{ width: `${(r.count / analytics.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#1c1c1c] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-white/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/10">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Registro Completo</h3>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Base de datos unificada desde Sheets</p>
            </div>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar CI, Cliente o Agente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-xs text-white focus:outline-none focus:border-green-500 transition-all w-full md:w-80"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {isSyncing && records.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-600">
               <Loader2 className="animate-spin mb-4" size={40} />
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Conectando con base central...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-700">
               <Database size={48} className="mb-4 opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">No hay datos registrados</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-white/5 bg-black/20">
                  <th className="py-6 px-10">Cliente / Documento</th>
                  <th className="py-6 px-10">Rubro</th>
                  <th className="py-6 px-10 text-center">Fecha</th>
                  <th className="py-6 px-10 text-right">Agente Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRecords.map((r, i) => (
                  <tr key={i} className="group hover:bg-white/5 transition-all">
                    <td className="py-6 px-10">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-green-500 group-hover:bg-green-500/10 transition-all">
                            <User size={16} />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block tracking-tight">{r.contacto || 'N/A'}</span>
                            <span className="text-[10px] text-gray-600 font-mono tracking-tighter uppercase">CI: {r.ci || '---'}</span>
                          </div>
                       </div>
                    </td>
                    <td className="py-6 px-10">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 group-hover:border-blue-500/30 transition-all">
                         {r.rubro || 'OTROS'}
                       </span>
                    </td>
                    <td className="py-6 px-10 text-center">
                       <span className="text-xs font-bold text-gray-500 flex items-center justify-center gap-2">
                         <Calendar size={12} className="opacity-40" /> {r.fecha || '---'}
                       </span>
                    </td>
                    <td className="py-6 px-10 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.15em] bg-green-500/5 px-3 py-1.5 rounded-lg border border-green-500/10">
                           {r.agente || 'SISTEMA'}
                         </span>
                         <ArrowRight size={12} className="text-gray-800 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
