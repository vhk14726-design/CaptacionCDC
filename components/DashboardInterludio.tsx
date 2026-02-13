
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  TrendingUp, 
  Wallet, 
  Award, 
  Loader2, 
  RefreshCw, 
  FilterX, 
  ChevronDown,
  Layers,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';

const INTERLUDIO_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxq-2osTNIhZQY9DMooCKYeRkBQlnHULr_fA9jCVrvgOiJR6yP1G2i7BG0qZgu5E0nw8Q/exec';
const COBRANZAS_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwBlmwbYGwT9HIC0xRT4ZCOLBuPMDGrK3BeyVeHH-f50QhEKeQiZBOrDJCcp-4rd1kZ/exec';

const MONTHS = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

const COLORS = ['#f0b86a', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#6366f1', '#14b8a6', '#f59e0b'];

interface UnifiedRecord {
  origen: 'FIRMA' | 'COBRANZA';
  id: string;
  nombre: string;
  agente: string;
  ciudad: string;
  institucion: string;
  fecha: Date | null;
  montoTotal: number;
  montoPagado: number;
  cese: string;
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

const DashboardInterludio: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [unifiedData, setUnifiedData] = useState<UnifiedRecord[]>([]);
  const [filters, setFilters] = useState({
    agente: 'all',
    ciudad: 'all',
    mes: 'all',
    institucion: 'all'
  });

  const normalize = (str: string) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const getVal = (row: any, targets: string[]) => {
    if (!row) return '';
    const keys = Object.keys(row);
    for (const key of keys) {
      const normKey = normalize(key).replace(/\s+/g, '');
      if (targets.some(t => normalize(t).replace(/\s+/g, '') === normKey)) return String(row[key] || '').trim();
    }
    return '';
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout para evitar el 10s de la plataforma

    try {
      const [resFirmas, resCobranzas] = await Promise.all([
        fetch(`${INTERLUDIO_SHEETS_URL}?t=${Date.now()}`, { signal: controller.signal }),
        fetch(`${COBRANZAS_SHEETS_URL}?t=${Date.now()}`, { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);

      let consolidated: UnifiedRecord[] = [];

      if (resFirmas.ok) {
        const json = await resFirmas.json();
        const raw = Array.isArray(json) ? json : (json.data || []);
        raw.forEach((r: any) => {
          const ci = getVal(r, ["ci", "documento", "c_i"]);
          if (ci && normalize(ci) !== 'ci') {
            consolidated.push({
              origen: 'FIRMA',
              id: ci,
              nombre: getVal(r, ["nombre_cliente", "nombre"]),
              agente: getVal(r, ["agente", "vendedor"]).toUpperCase(),
              ciudad: getVal(r, ["ciudad", "localidad"]).toUpperCase(),
              institucion: getVal(r, ["institucion", "entidad"]).toUpperCase(),
              fecha: parseFlexibleDate(getVal(r, ["fecha_firma", "fecha"])),
              montoTotal: parseInt(getVal(r, ["total", "monto_total"]).replace(/[^0-9]/g, '')) || 0,
              montoPagado: 0,
              cese: 'PENDIENTE'
            });
          }
        });
      }

      if (resCobranzas.ok) {
        const json = await resCobranzas.json();
        const raw = Array.isArray(json) ? json : (json.data || []);
        raw.forEach((r: any) => {
          const cliente = getVal(r, ["cliente", "nombre"]);
          if (cliente && normalize(cliente) !== 'cliente') {
            consolidated.push({
              origen: 'COBRANZA',
              id: cliente,
              nombre: cliente,
              agente: getVal(r, ["agente"]).toUpperCase(),
              ciudad: getVal(r, ["ciudad"]).toUpperCase(),
              institucion: getVal(r, ["entidad", "departamento", "institucion"]).toUpperCase(),
              fecha: parseFlexibleDate(getVal(r, ["fecha", "fecha_cobro"])),
              montoTotal: parseInt(getVal(r, ["totalidad", "total"]).replace(/[^0-9]/g, '')) || 0,
              montoPagado: parseInt(getVal(r, ["pagado", "monto_pagado"]).replace(/[^0-9]/g, '')) || 0,
              cese: getVal(r, ["cese"]).toUpperCase() || 'PENDIENTE'
            });
          }
        });
      }

      setUnifiedData(consolidated);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn("Dashboard Interludio: La petición excedió el tiempo límite (9s)");
      } else {
        console.error("Error Dashboard Interludio Sync:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filterOptions = useMemo(() => {
    const agentes = new Set<string>();
    const ciudades = new Set<string>();
    const instituciones = new Set<string>();

    unifiedData.forEach(r => {
      if (r.agente) agentes.add(r.agente);
      if (r.ciudad) ciudades.add(r.ciudad);
      if (r.institucion) instituciones.add(r.institucion);
    });

    return {
      agentes: Array.from(agentes).sort(),
      ciudades: Array.from(ciudades).sort(),
      instituciones: Array.from(instituciones).sort(),
      meses: MONTHS
    };
  }, [unifiedData]);

  const filteredData = useMemo(() => {
    return unifiedData.filter(r => {
      const agenteMatch = filters.agente === 'all' || r.agente === filters.agente;
      const ciudadMatch = filters.ciudad === 'all' || r.ciudad === filters.ciudad;
      const instMatch = filters.institucion === 'all' || r.institucion === filters.institucion;
      
      let mesMatch = true;
      if (filters.mes !== 'all' && r.fecha) {
        mesMatch = MONTHS[r.fecha.getMonth()] === filters.mes;
      } else if (filters.mes !== 'all' && !r.fecha) {
        mesMatch = false;
      }
      
      return agenteMatch && ciudadMatch && instMatch && mesMatch;
    });
  }, [unifiedData, filters]);

  const metrics = useMemo(() => {
    let totalGeneral = 0;
    let posibleCobro = 0;
    
    const agenteMap: Record<string, number> = {};
    const ciudadMap: Record<string, number> = {};
    const instMap: Record<string, number> = {};
    const ceseMap: Record<string, number> = { 'APLICADO': 0, 'PENDIENTE': 0 };
    const dateMap: Record<string, number> = {};
    let totalPagado = 0;

    filteredData.forEach(r => {
      totalGeneral += r.montoTotal;
      totalPagado += r.montoPagado;
      
      if (r.origen === 'FIRMA') {
        posibleCobro += r.montoTotal;
      } else {
        posibleCobro += r.montoPagado;
      }

      // Agentes
      agenteMap[r.agente] = (agenteMap[r.agente] || 0) + r.montoTotal;
      // Ciudades
      ciudadMap[r.ciudad] = (ciudadMap[r.ciudad] || 0) + r.montoTotal;
      // Instituciones
      instMap[r.institucion] = (instMap[r.institucion] || 0) + 1;
      // Cese
      const status = r.cese.includes('SI') || r.cese.includes('APLICADO') ? 'APLICADO' : 'PENDIENTE';
      ceseMap[status]++;
      // Fechas
      if (r.fecha) {
        const dStr = r.fecha.toISOString().split('T')[0];
        dateMap[dStr] = (dateMap[dStr] || 0) + 1;
      }
    });

    return {
      totalClientes: filteredData.length,
      totalGeneral,
      posibleCobro,
      honorarios: totalGeneral * 0.24,
      chartAgente: Object.entries(agenteMap).map(([name, val]) => ({ name, val })).sort((a,b) => b.val - a.val).slice(0, 10),
      chartCiudad: Object.entries(ciudadMap).map(([name, val]) => ({ name, val })).sort((a,b) => b.val - a.val).slice(0, 10),
      chartInst: Object.entries(instMap).map(([name, value]) => ({ name, value })),
      chartCese: Object.entries(ceseMap).map(([name, value]) => ({ name, value })),
      chartDaily: Object.entries(dateMap).sort((a,b) => a[0].localeCompare(b[0])).map(([name, val]) => ({ name: name.split('-').reverse().slice(0,2).join('/'), val })),
      chartCobrado: [
        { name: 'Total Cobrado', value: totalPagado },
        { name: 'Pendiente de Cobro', value: Math.max(0, totalGeneral - totalPagado) }
      ]
    };
  }, [filteredData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { 
      style: 'currency', 
      currency: 'PYG', 
      minimumFractionDigits: 0 
    }).format(val).replace('PYG', 'Gs. ');
  };

  const formatYAxis = (val: number) => {
    if (val >= 1000000) return `Gs. ${(val / 1000000).toFixed(0)}M`;
    if (val >= 1000) return `Gs. ${(val / 1000).toFixed(0)}k`;
    return `Gs. ${val}`;
  };

  const handleReset = () => {
    setFilters({ agente: 'all', ciudad: 'all', mes: 'all', institucion: 'all' });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121212] p-8 rounded-[2.5rem] border border-white/5">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-purple-600/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
             <Layers className="text-purple-500" size={32} />
          </div>
          <div>
            <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Inteligencia Interludio</h4>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2 mt-1">
              <CheckCircle2 size={12} className="text-green-500" /> Firmas + Cobranzas Sincronizadas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 flex flex-col items-end">
              <span className="text-[9px] font-black text-gray-600 uppercase">Muestra Total</span>
              <span className="text-sm font-black text-white">{unifiedData.length} Registros</span>
           </div>
           <button onClick={fetchData} className="p-4 bg-white/5 hover:bg-white/10 rounded-xl text-white border border-white/5 transition-all">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      <div className="bg-[#121212] p-8 rounded-[2rem] border border-white/5 shadow-2xl flex flex-wrap items-end gap-6">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">AGENTE</label>
          <div className="relative">
            <select 
              value={filters.agente}
              onChange={(e) => setFilters(prev => ({ ...prev, agente: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-xs font-bold text-white uppercase outline-none appearance-none cursor-pointer focus:border-purple-500/40"
            >
              <option value="all">Todos los Agentes</option>
              {filterOptions.agentes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">CIUDAD</label>
          <div className="relative">
            <select 
              value={filters.ciudad}
              onChange={(e) => setFilters(prev => ({ ...prev, ciudad: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-xs font-bold text-white uppercase outline-none appearance-none cursor-pointer focus:border-purple-500/40"
            >
              <option value="all">Todas las Ciudades</option>
              {filterOptions.ciudades.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">MES</label>
          <div className="relative">
            <select 
              value={filters.mes}
              onChange={(e) => setFilters(prev => ({ ...prev, mes: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-xs font-bold text-white uppercase outline-none appearance-none cursor-pointer focus:border-purple-500/40"
            >
              <option value="all">Todos los Meses</option>
              {filterOptions.meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">INSTITUCIÓN</label>
          <div className="relative">
            <select 
              value={filters.institucion}
              onChange={(e) => setFilters(prev => ({ ...prev, institucion: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-xs font-bold text-white uppercase outline-none appearance-none cursor-pointer focus:border-purple-500/40"
            >
              <option value="all">Todas las Instituciones</option>
              {filterOptions.instituciones.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          </div>
        </div>

        <button 
          onClick={handleReset}
          className="bg-[#f0b86a] hover:bg-[#e0a85a] text-black font-black text-[10px] px-8 py-4 rounded-xl uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2"
        >
          <FilterX size={16} /> Limpiar Filtros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-[#121212] p-10 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-white/10 transition-all">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">TOTAL CLIENTES</p>
          <h3 className="text-7xl font-black text-white italic leading-none tracking-tighter">
            {loading ? <Loader2 className="animate-spin inline text-gray-800" /> : metrics.totalClientes}
          </h3>
          <p className="text-[10px] font-bold text-gray-600 uppercase mt-6 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Firmas + Cobranzas
          </p>
        </div>

        <div className="bg-[#121212] p-10 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-[#f0b86a]/20 transition-all">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">TOTAL GENERAL</p>
          <h3 className="text-3xl font-black text-[#f0b86a] italic leading-none">{loading ? '...' : formatCurrency(metrics.totalGeneral)}</h3>
          <p className="text-[10px] font-bold text-gray-600 uppercase mt-6">Volumen de Cartera</p>
        </div>

        <div className="bg-[#121212] p-10 rounded-[2.5rem] border border-[#f0b86a]/40 shadow-xl group hover:bg-[#f0b86a]/5 transition-all">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">POSIBLE COBRO</p>
          <h3 className="text-3xl font-black text-[#f0b86a] italic leading-none">{loading ? '...' : formatCurrency(metrics.posibleCobro)}</h3>
          <p className="text-[10px] font-bold text-gray-600 uppercase mt-6">Flujo Proyectado</p>
        </div>

        <div className="bg-[#121212] p-10 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-[#f0b86a]/20 transition-all">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">HONORARIOS (24%)</p>
          <h3 className="text-3xl font-black text-[#f0b86a] italic leading-none">{loading ? '...' : formatCurrency(metrics.honorarios)}</h3>
          <p className="text-[10px] font-bold text-gray-600 uppercase mt-6">Estimación de Comisiones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="bg-[#121212] p-10 rounded-[2.5rem] border border-white/5 shadow-xl h-[500px] flex flex-col">
          <h3 className="text-xl font-black text-white uppercase italic mb-8 flex items-center gap-4">
            <BarChart3 className="text-[#f0b86a]" size={20} /> POR AGENTE
          </h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartAgente}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#333" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#444" fontSize={9} tickFormatter={formatYAxis} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Asignado"]}
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #ffffff10', borderRadius: '16px' }}
                  itemStyle={{ color: '#f0b86a', fontWeight: 'bold' }}
                />
                <Bar dataKey="val" fill="#f0b86a" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#121212] p-10 rounded-[2.5rem] border border-white/5 shadow-xl h-[500px] flex flex-col">
          <h3 className="text-xl font-black text-white uppercase italic mb-8 flex items-center gap-4">
            <BarChart3 className="text-white" size={20} /> POR CIUDAD
          </h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartCiudad}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#333" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#444" fontSize={9} tickFormatter={formatYAxis} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Monto Total"]}
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #ffffff10', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Bar dataKey="val" fill="#ffffff20" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#121212] p-10 rounded-[2.5rem] border border-white/5 shadow-xl h-[500px] flex flex-col">
          <h3 className="text-xl font-black text-white uppercase italic mb-8 flex items-center gap-4">
            <PieChartIcon className="text-[#f0b86a]" size={20} /> POR INSTITUCIÓN
          </h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={metrics.chartInst} 
                  innerRadius="60%" 
                  outerRadius="90%" 
                  paddingAngle={5} 
                  dataKey="value" 
                  nameKey="name" 
                  stroke="none"
                >
                  {metrics.chartInst.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121212', border: 'none', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 pb-2">
            {metrics.chartInst.map((item, i) => (
              <div key={i} className="flex items-center gap-2 transition-opacity hover:opacity-100">
                <div className="w-6 h-2 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#121212] p-10 rounded-[2.5rem] border border-white/5 shadow-xl h-[500px] flex flex-col">
          <h3 className="text-xl font-black text-white uppercase italic mb-8 flex items-center gap-4">
            <PieChartIcon className="text-red-500" size={20} /> ESTADO CESE
          </h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.chartCese} cx="50%" cy="50%" outerRadius={120} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#ef4444" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121212', border: 'none', borderRadius: '16px' }} 
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#121212] p-10 rounded-[2.5rem] border border-white/5 shadow-xl h-[500px] flex flex-col">
          <h3 className="text-xl font-black text-white uppercase italic mb-8 flex items-center gap-4">
            <Activity className="text-[#f0b86a]" size={20} /> ACTIVIDAD DIARIA
          </h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.chartDaily}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f0b86a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f0b86a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#333" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #ffffff10', borderRadius: '16px' }}
                />
                <Area type="monotone" dataKey="val" stroke="#f0b86a" fillOpacity={1} fill="url(#colorDaily)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#121212] p-10 rounded-[2.5rem] border border-white/5 shadow-xl h-[500px] flex flex-col">
          <h3 className="text-xl font-black text-white uppercase italic mb-8 flex items-center gap-4">
            <PieChartIcon className="text-green-500" size={20} /> COBRADO VS PENDIENTE
          </h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.chartCobrado} innerRadius="70%" outerRadius="95%" paddingAngle={0} dataKey="value" stroke="none">
                  <Cell fill="#10b981" />
                  <Cell fill="#f0b86a" />
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#121212', border: 'none', borderRadius: '16px' }} 
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Balance</span>
              <span className="text-lg font-black text-white">{((metrics.chartCobrado[0].value / (metrics.totalGeneral || 1)) * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
              Pendiente de Cobro : {formatCurrency(metrics.chartCobrado[1].value)}
            </p>
          </div>
        </div>

      </div>

      {!loading && filteredData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
          <FilterX size={64} className="text-gray-800" />
          <p className="mt-8 text-lg font-black text-gray-600 uppercase tracking-[0.2em]">Sin registros para esta selección</p>
          <button onClick={handleReset} className="mt-6 text-[#f0b86a] text-xs font-black uppercase tracking-[0.3em] hover:text-[#f0b86a]/60 transition-colors">Volver a ver todo</button>
        </div>
      )}
    </div>
  );
};

export default DashboardInterludio;