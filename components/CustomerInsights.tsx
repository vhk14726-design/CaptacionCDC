
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  TrendingUp, 
  Briefcase,
  Search,
  ArrowUpRight,
  CalendarDays,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Calendar
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
import * as XLSX from 'xlsx';

interface StandardizedRecord {
  Fecha: string;
  Rubro: string;
  Cliente: string;
}

interface CustomerInsightsProps {
  userRole?: 'admin' | 'user' | null;
}

const CustomerInsights: React.FC<CustomerInsightsProps> = ({ userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<StandardizedRecord[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos de localStorage al iniciar
  useEffect(() => {
    const savedData = localStorage.getItem('clc_customer_db_v2');
    if (savedData) {
      setRecords(JSON.parse(savedData));
    }
  }, []);

  // Lógica de Analítica Dinámica
  const analytics = useMemo(() => {
    if (records.length === 0) {
      return {
        total: 0,
        avg: 0,
        rubros: [],
        chartData: [],
        totalDays: 0
      };
    }

    const total = records.length;
    const rubroCount: Record<string, number> = {};
    const dateCount: Record<string, number> = {};

    records.forEach(r => {
      const rubro = (r.Rubro || 'SIN ESPECIFICAR').trim().toUpperCase();
      const fecha = (r.Fecha || 'SIN FECHA').trim();
      
      rubroCount[rubro] = (rubroCount[rubro] || 0) + 1;
      dateCount[fecha] = (dateCount[fecha] || 0) + 1;
    });

    // Ordenar rubros por volumen
    const rubros = Object.entries(rubroCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Preparar datos para el gráfico (ordenados por fecha)
    const chartData = Object.entries(dateCount)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => {
        // Intento de ordenamiento cronológico simple
        return a.day.localeCompare(b.day, undefined, { numeric: true });
      });

    const totalDays = chartData.length;
    const avg = total / (totalDays || 1);

    return { total, avg, rubros, chartData, totalDays };
  }, [records]);

  // Función para encontrar la columna correcta ignorando mayúsculas/minúsculas y formatos
  const findColumnKey = (row: any, candidates: string[]) => {
    const keys = Object.keys(row);
    return keys.find(k => 
      candidates.some(c => 
        k.toLowerCase().trim() === c.toLowerCase().trim() ||
        k.toLowerCase().replace(/ /g, '_') === c.toLowerCase().replace(/ /g, '_')
      )
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userRole !== 'admin') {
      setImportStatus({ type: 'error', message: 'Acceso denegado: Requiere Administrador.' });
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          throw new Error('El archivo está vacío.');
        }

        // Mapeo flexible de columnas
        const sample = jsonData[0];
        const fechaKey = findColumnKey(sample, ['fecha_de_carga', 'fecha de carga', 'fecha']);
        const rubroKey = findColumnKey(sample, ['rubro', 'segmento']);
        const clienteKey = findColumnKey(sample, ['ci_cliente', 'ci cliente', 'cliente', 'documento']);

        if (!fechaKey || !rubroKey) {
          throw new Error('No se detectaron las columnas requeridas: "fecha_de_carga" y "rubro".');
        }

        const cleanedData: StandardizedRecord[] = jsonData.map(item => {
          let rawDate = item[fechaKey];
          let formattedDate = '';
          
          if (rawDate instanceof Date) {
            formattedDate = rawDate.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' });
          } else {
            formattedDate = String(rawDate);
          }

          return {
            Fecha: formattedDate,
            Rubro: String(item[rubroKey] || 'N/A'),
            Cliente: String(item[clienteKey] || 'N/A')
          };
        });

        localStorage.setItem('clc_customer_db_v2', JSON.stringify(cleanedData));
        setRecords(cleanedData);
        setImportStatus({ type: 'success', message: `Base de datos actualizada: ${cleanedData.length} registros.` });
      } catch (err: any) {
        setImportStatus({ type: 'error', message: err.message || 'Error al procesar Excel.' });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleReset = () => {
    if (confirm('¿Eliminar todos los datos cargados?')) {
      localStorage.removeItem('clc_customer_db_v2');
      setRecords([]);
      setImportStatus(null);
    }
  };

  const filteredRubros = analytics.rubros.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = userRole === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Analítica de Excel</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium italic">Inteligencia basada en ci_cliente, rubro y fecha_de_carga.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isAdmin && (
            <div className="flex items-center gap-3">
              <input type="file" ref={fileInputRef} accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20 active:scale-95 disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                Subir Reporte
              </button>
              {records.length > 0 && (
                <button onClick={handleReset} className="bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 p-3 rounded-2xl border border-white/5 transition-all">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          )}
          <div className="bg-[#1c1c1c] border border-white/5 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
             <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">DB Local: {analytics.total} Clientes</span>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {importStatus && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300 ${importStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          {importStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-black uppercase tracking-widest">{importStatus.message}</span>
          <button onClick={() => setImportStatus(null)} className="ml-auto text-[10px] opacity-50">Cerrar</button>
        </div>
      )}

      {/* Indicadores Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#9333ea]/20 to-transparent p-10 rounded-[2.5rem] border border-[#9333ea]/20 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <Users size={48} className="text-[#9333ea] mb-6 opacity-40" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Total Clientes</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">{analytics.total}</h2>
            <div className="mt-4 text-green-500 font-black text-[10px] uppercase tracking-widest bg-green-500/5 px-3 py-1 rounded-full border border-green-500/10 w-fit">
              Carga Detectada
            </div>
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between shadow-2xl">
          <TrendingUp size={48} className="text-blue-500 mb-6 opacity-40" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Promedio Diario</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">{analytics.avg.toFixed(1)}</h2>
            <p className="text-[10px] text-gray-600 mt-4 font-black uppercase tracking-[0.2em]">Cargas por día registrado</p>
          </div>
        </div>

        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between shadow-2xl">
          <CalendarDays size={48} className="text-emerald-500 mb-6 opacity-40" />
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Días Activos</p>
            <h2 className="text-6xl font-black text-white mt-1 leading-none tracking-tighter">{analytics.totalDays}</h2>
            <p className="text-[10px] text-gray-600 mt-4 font-black uppercase tracking-[0.2em]">Fechas únicas en Excel</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Gráfico de Tendencia */}
        <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 uppercase tracking-tighter italic">
            <Calendar size={24} className="text-[#9333ea]" /> Clientes por Fecha
          </h3>
          <div className="h-[350px] w-full">
            {records.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 900}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 900}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '16px' }}
                    cursor={{fill: '#ffffff05'}}
                  />
                  <Bar dataKey="count" fill="#9333ea" radius={[8, 8, 0, 0]} barSize={25}>
                      {analytics.chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === analytics.chartData.length - 1 ? '#9333ea' : '#9333ea40'} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-700">
                <FileSpreadsheet size={48} className="mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Sube un Excel para ver la tendencia</p>
              </div>
            )}
          </div>
        </div>

        {/* Segmentación de Rubros */}
        <div className="bg-[#1c1c1c] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic">
              <Briefcase size={24} className="text-[#9333ea]" /> Segmentación por Rubro
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
            {filteredRubros.map((rubro, i) => {
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
                              <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: `${perc}%` }}></div>
                           </div>
                           <span className="text-[10px] font-black text-gray-600">{perc}%</span>
                        </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="text-lg font-black text-white font-mono">{rubro.count}</span>
                      <span className="text-[9px] font-black text-gray-700 block uppercase tracking-tighter">CASOS</span>
                   </div>
                </div>
              );
            })}
            {filteredRubros.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                <p className="text-xs font-black uppercase tracking-widest">Sin datos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
