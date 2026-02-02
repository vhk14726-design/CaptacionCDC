
import React, { useState, useMemo } from 'react';
import { 
  FileUp, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  Database, 
  BarChart3, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Table,
  PieChart as PieChartIcon,
  Search,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface ExcelData {
  ci: string;
  rubro: string;
  fecha: string;
}

const ExcelImportPanel: React.FC = () => {
  const [data, setData] = useState<ExcelData[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          throw new Error("El archivo Excel está vacío.");
        }

        // Mapeo flexible de columnas solicitado
        const normalizedData: ExcelData[] = json.map((row: any) => {
          const findValue = (possibleKeys: string[]) => {
            const key = Object.keys(row).find(k => 
              possibleKeys.includes(k.toLowerCase().trim())
            );
            return key ? String(row[key]) : 'N/A';
          };

          return {
            ci: findValue(['ci_cliente', 'ci', 'documento', 'cedula']),
            rubro: findValue(['rubro', 'categoria', 'interes']),
            fecha: findValue(['fecha_de_carga', 'fecha', 'dia'])
          };
        });

        setData(normalizedData);
      } catch (err: any) {
        setError(err.message || "Error al procesar el archivo Excel.");
        setData([]);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setError("Error al leer el archivo.");
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  // Cálculos de métricas solicitados
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const totalClientes = data.length;
    
    // Agrupación por Fecha
    const dateGroups: Record<string, number> = {};
    data.forEach(item => {
      const d = item.fecha;
      dateGroups[d] = (dateGroups[d] || 0) + 1;
    });

    const uniqueDatesCount = Object.keys(dateGroups).length;
    const promedioDiario = totalClientes / (uniqueDatesCount || 1);

    const clientesPorFecha = Object.entries(dateGroups)
      .map(([fecha, count]) => ({ fecha, count }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Agrupación por Rubro
    const rubroGroups: Record<string, number> = {};
    data.forEach(item => {
      const r = item.rubro.toUpperCase().trim();
      rubroGroups[r] = (rubroGroups[r] || 0) + 1;
    });

    const clientesPorRubro = Object.entries(rubroGroups)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalClientes,
      promedioDiario,
      clientesPorFecha,
      clientesPorRubro
    };
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
             <FileSpreadsheet className="text-purple-500" size={32} />
             Analizador Excel
          </h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Procesa archivos manuales con columnas personalizadas</p>
        </div>
      </div>

      {/* Zona de Carga */}
      <div className="bg-[#1c1c1c] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden p-10 relative">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] py-16 hover:border-purple-500/30 transition-all group bg-black/20">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="w-20 h-20 bg-purple-600/10 rounded-3xl flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform shadow-xl shadow-purple-600/10">
            <FileUp size={40} />
          </div>
          <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
            {fileName || "Seleccionar Archivo Excel"}
          </h3>
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-3">
            Formatos soportados: .xlsx, .xls • Mapeo automático de columnas
          </p>
          
          <div className="flex gap-4 mt-8">
            {['ci_cliente', 'rubro', 'fecha_de_carga'].map(col => (
              <span key={col} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {col}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 animate-in shake duration-300">
            <AlertCircle size={18} />
            <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
          </div>
        )}
      </div>

      {stats && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
          {/* Métricas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 shadow-xl flex items-center gap-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/10">
                <Users size={32} />
              </div>
              <div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Total Clientes Procesados</p>
                <h4 className="text-5xl font-black text-white mt-1">{stats.totalClientes}</h4>
              </div>
            </div>

            <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 shadow-xl flex items-center gap-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/10">
                <TrendingUp size={32} />
              </div>
              <div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Promedio de Carga Diaria</p>
                <h4 className="text-5xl font-black text-white mt-1">{stats.promedioDiario.toFixed(1)}</h4>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Clientes por Fecha */}
            <div className="bg-[#1c1c1c] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col">
              <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 uppercase italic">
                <Calendar className="text-blue-500" size={24} /> Clientes por Fecha de Carga
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.clientesPorFecha}>
                    <defs>
                      <linearGradient id="colorCarga" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10, fontWeight: 800}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: 'none', borderRadius: '16px', padding: '12px' }} 
                    />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCarga)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Segmentación por Rubro */}
            <div className="bg-[#1c1c1c] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
              <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3 uppercase italic">
                <PieChartIcon className="text-purple-500" size={24} /> Segmentación por Rubro
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
                {stats.clientesPorRubro.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5 group hover:border-purple-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-[10px] font-black text-purple-400 border border-purple-500/20">
                        {i + 1}
                      </div>
                      <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-black text-white">{r.count}</span>
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                          style={{ width: `${(r.count / stats.totalClientes) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla de Vista Previa */}
          <div className="bg-[#1c1c1c] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-purple-500/5 to-transparent flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/10">
                <Table size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Datos Mapeados</h3>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Vista previa de los primeros 50 registros procesados</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-600 uppercase tracking-widest border-b border-white/5 bg-black/30">
                    <th className="py-6 px-10">Documento (ci_cliente)</th>
                    <th className="py-6">Rubro Detectado</th>
                    <th className="py-6 px-10 text-right">Fecha de Carga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-all group">
                      <td className="py-6 px-10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-600 group-hover:text-purple-500 transition-colors">
                            <Database size={14} />
                          </div>
                          <span className="text-sm font-bold text-white tracking-tight">{row.ci}</span>
                        </div>
                      </td>
                      <td className="py-6">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          {row.rubro}
                        </span>
                      </td>
                      <td className="py-6 px-10 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs font-bold text-gray-500">
                          {row.fecha}
                          <ArrowRight size={12} className="text-gray-800" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > 50 && (
              <div className="p-6 text-center border-t border-white/5 bg-black/20">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">
                  Mostrando 50 de {data.length} registros cargados satisfactoriamente
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guía de Ayuda */}
      {!stats && !isProcessing && (
        <div className="bg-purple-600/5 border border-purple-600/10 p-10 rounded-[3rem] text-center max-w-2xl mx-auto space-y-6">
           <AlertCircle size={48} className="text-purple-500/30 mx-auto" />
           <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Instrucciones de Carga</h3>
           <p className="text-sm text-gray-500 leading-relaxed italic">
             "Asegúrese de que su archivo Excel contenga las columnas requeridas. El sistema las detectará automáticamente sin importar el orden o el uso de mayúsculas."
           </p>
           <div className="flex justify-center gap-8">
              <div className="text-center">
                 <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Columna A</p>
                 <p className="text-xs font-bold text-white">ci_cliente</p>
              </div>
              <div className="text-center">
                 <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Columna B</p>
                 <p className="text-xs font-bold text-white">rubro</p>
              </div>
              <div className="text-center">
                 <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Columna C</p>
                 <p className="text-xs font-bold text-white">fecha_de_carga</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ExcelImportPanel;
