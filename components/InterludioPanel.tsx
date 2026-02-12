
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Loader2, 
  RefreshCw,
  Save,
  X,
  User,
  ClipboardList,
  History,
  ShieldCheck,
  ChevronDown,
  MessageSquare,
  Briefcase,
  CreditCard,
  CheckCircle2,
  Activity,
  AlertCircle,
  Calendar as CalendarIcon,
  MapPin,
  Building2,
  FileText,
  DollarSign,
  UserCheck
} from 'lucide-react';

// URL del script de Google Sheets para Interludio (Firmas)
const INTERLUDIO_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyAn48A_IRxOyKecDbwoqB5qCcH2daFrKMZee5lYCtKx5puKa1u-HfU-e622Xo8CLIOKg/exec';

const PLAN_CUOTAS_MAP: Record<string, { cuota: string, total: string }> = {
  '1': { cuota: '2843000', total: '2843000' },
  '2': { cuota: '1500000', total: '3000000' },
  '3': { cuota: '1085000', total: '3255000' },
  '4': { cuota: '850000', total: '3400000' },
  '5': { cuota: '710000', total: '3550000' },
  '6': { cuota: '610000', total: '3660000' },
};

const InterludioPanel: React.FC = () => {
  const [activeInternalTab, setActiveInternalTab] = useState('FIRMAS');
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedExpediente, setSelectedExpediente] = useState<any | null>(null);
  const [ceseStatus, setCeseStatus] = useState('PENDIENTE');
  const [obsEdit, setObsEdit] = useState('');
  const [isSavingExp, setIsSavingExp] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allRecords, setAllRecords] = useState<any[]>([]);

  const agentesPredefinidos = [
    'ALEXANDER MACIEL', 'ANDRES OJEDA', 'ARIEL GRISSETTI', 'DELY GONZALEZ',
    'IDA RECALDE', 'IVANA VILLAMAYOR', 'JOSE LUIS TORALES', 'NOELIA ESTIGARRIBIA'
  ];

  const listaCuotas = ['1', '2', '3', '4', '5', '6'];
  const empresasPredefinidas = ['LME', 'GFV'];
  const proveedoresPredefinidos = ['CAPTACIÓN', 'PROPIO'];

  const initialFirmaState = {
    ci: '',               
    nombre_cliente: '',   
    fecha_nacimiento: '', 
    agente: '',           
    institucion: '',      
    ciudad: '',           
    fecha_firma: '',      
    diligencia: '',       
    cuotas: '',          
    total: '0',            
    fecha_posible_cobro: '',    
    firma: 'SI',            
    empresa: 'LME',          
    proveedor: 'CAPTACIÓN',
    cuota_monto: '0',
    cese: 'PENDIENTE'
  };
  const [firmaData, setFirmaData] = useState(initialFirmaState);

  const normalize = (str: string) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  };

  const getVal = (row: any, index: number) => {
    if (!row) return '';
    if (Array.isArray(row)) return String(row[index] || '').trim();
    
    // Mapeo basado en los encabezados del Excel proporcionado
    const mappingKeys = [
      "ci",                       // 0  (Col A)
      "nombre_cliente",           // 1  (Col B)
      "fecha_nacimiento",         // 2  (Col C)
      "agente",                   // 3  (Col D)
      "institucion",              // 4  (Col E)
      "ciudad",                   // 5  (Col F)
      "fecha_de_firma",           // 6  (Col G)
      "diligencia",               // 7  (Col H)
      "cuota",                    // 8  (Col I)
      "total",                    // 9  (Col J)
      "fecha_posible_cobro",      // 10 (Col K)
      "firma",                    // 11 (Col L)
      "empresa",                  // 12 (Col M)
      "proveedor",                // 13 (Col N)
      "observacion",              // 14 (Col O)
      "cese"                      // 15 (Col P)
    ];

    const key = mappingKeys[index];
    
    // Intento 1: Acceso directo por clave normalizada
    if (row[key] !== undefined) return String(row[key]).trim();

    // Intento 2: Búsqueda exhaustiva por normalización de todos los campos del objeto
    const keys = Object.keys(row);
    const targetNorm = normalize(key);
    for (const k of keys) {
      if (normalize(k) === targetNorm) return String(row[k]).trim();
    }
    
    // Intento 3: Variaciones para Fecha Posible Cobro
    if (index === 10) {
      const altKeys = ["fechaposiblecobro", "posiblecobro", "fecha_cobro"];
      for (const k of keys) {
        if (altKeys.includes(normalize(k))) return String(row[k]).trim();
      }
    }

    return '';
  };

  const formatDate = (val: any) => {
    if (!val || val === 'N/A' || val === '' || val === 'undefined' || val === '-' || val === 'null') return '-';
    try {
      if (!isNaN(val) && typeof val !== 'boolean') {
        const date = new Date(Math.round((Number(val) - 25569) * 86400 * 1000));
        return date.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      const date = new Date(val);
      if (isNaN(date.getTime())) return String(val);
      return date.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return String(val); }
  };

  const formatCurrency = (val: any) => {
    const num = parseInt(String(val).replace(/[^0-9]/g, ''));
    if (isNaN(num) || num === 0) return 'Gs. 0';
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(num).replace('PYG', 'Gs.');
  };

  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const response = await fetch(`${INTERLUDIO_SHEETS_URL}?t=${Date.now()}`);
      if (response.ok) {
        const json = await response.json();
        const data = Array.isArray(json) ? json : (json.data || []);
        const clean = data.filter((r: any) => {
          const ci = getVal(r, 0);
          return ci && normalize(ci) !== 'ci' && normalize(ci) !== 'documento';
        });
        setAllRecords([...clean].reverse());
      }
    } catch (err) { console.error(err); } finally { if (!silent) setIsSyncing(false); }
  }, []);

  useEffect(() => {
    if (activeInternalTab === 'Cobranzas' || activeInternalTab === 'FIRMAS') {
      fetchAllData(true);
    }
  }, [activeInternalTab, fetchAllData]);

  const handleOpenExpediente = (res: any) => {
    const currentCese = getVal(res, 15);
    const currentObs = getVal(res, 14);
    const status = (currentCese.toUpperCase() === 'SI' || currentCese.toUpperCase() === 'NO') ? currentCese.toUpperCase() : 'PENDIENTE';
    setSelectedExpediente(res);
    setCeseStatus(status);
    setObsEdit(currentObs);
  };

  const handleGuardarExpediente = async () => {
    if (!selectedExpediente) return;
    setIsSavingExp(true);
    try {
      const ci = getVal(selectedExpediente, 0);
      const newValue = ceseStatus.toUpperCase();
      const params = new URLSearchParams();
      params.append('action', 'save_revision');
      params.append('ci', ci);
      params.append('cese', newValue);
      params.append('observacion_cese', newValue);

      await fetch(INTERLUDIO_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: params });
      alert('¡EXPEDIENTE SINCRONIZADO!');
      setSelectedExpediente(null);
      fetchAllData(true);
    } catch (err) {
      console.error(err);
      alert('Error al sincronizar');
    } finally {
      setIsSavingExp(false);
    }
  };

  const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cuotas') {
      const plan = PLAN_CUOTAS_MAP[value];
      setFirmaData(prev => ({ 
        ...prev, 
        cuotas: value, 
        total: plan ? plan.total : '0',
        cuota_monto: plan ? plan.cuota : '0'
      }));
    } else if (name === 'diligencia' || name === 'fecha_firma') {
      let posibleCobro = firmaData.fecha_posible_cobro;
      if (value) {
        const parts = value.split('-');
        const year = parseInt(parts[0]), month = parseInt(parts[1]) - 1, day = parseInt(parts[2]);
        let targetMonth = day >= 6 ? month + 1 : month;
        let targetYear = year;
        if (targetMonth > 11) { targetMonth = 0; targetYear += 1; }
        const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
        posibleCobro = new Date(targetYear, targetMonth, Math.min(30, lastDay)).toISOString().split('T')[0];
      }
      setFirmaData(prev => ({ ...prev, [name]: value, fecha_posible_cobro: posibleCobro }));
    } else {
      setFirmaData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLimpiarFirma = () => {
    setFirmaData(initialFirmaState);
  };

  const handleGuardarFirma = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(firmaData).forEach(([k, v]) => params.append(k, String(v).trim().toUpperCase()));
      await fetch(INTERLUDIO_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: params });
      handleLimpiarFirma();
      alert('¡DATOS DE FIRMA ENVIADOS!');
      setTimeout(() => fetchAllData(true), 1500);
    } catch (err) { alert('Error'); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 relative">
      <div className="flex border-b border-white/5 mb-8 overflow-x-auto custom-scrollbar">
        {[
          { id: 'FIRMAS', icon: <ClipboardList size={14} />, label: 'Firmas' },
          { id: 'Cargar Firmas', icon: <Save size={14} />, label: 'Cargar Firmas' },
          { id: 'Cobranzas', icon: <History size={14} />, label: 'Cobranzas' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveInternalTab(tab.id)} className={`px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-3 whitespace-nowrap ${activeInternalTab === tab.id ? 'text-[#f0b86a]' : 'text-gray-500 hover:text-white'}`}>
            {tab.icon} {tab.label}
            {activeInternalTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#f0b86a]"></div>}
          </button>
        ))}
      </div>

      <div className="bg-[#0d0d0d] rounded-[2.5rem] border border-white/5 shadow-2xl p-10 relative min-h-[600px]">
        {/* VIEW: FIRMAS */}
        {activeInternalTab === 'FIRMAS' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="flex flex-col md:flex-row items-center gap-8 bg-black/40 p-10 rounded-[2.5rem] border border-white/5">
              <div className="relative flex-1 w-full"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700" size={20} /><input type="text" placeholder="FILTRAR POR C.I, NOMBRE O ASESOR..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl py-6 pl-14 pr-8 text-xs font-black text-white uppercase tracking-[0.2em] focus:border-[#f0b86a] outline-none" /></div>
              <button onClick={() => fetchAllData()} disabled={isSyncing} className="bg-white/5 hover:bg-white/10 text-white p-6 rounded-2xl border border-white/10 transition-all active:scale-90 shadow-2xl"><RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} /></button>
            </div>
            <div className="overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-4 min-w-[1300px]">
                <thead>
                  <tr className="bg-[#050505] shadow-lg">
                    <th className="py-7 px-8 rounded-l-full text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">C.I</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">NOMBRE</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">AGENTE</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">INSTITUCIÓN</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">CIUDAD</th>
                    <th className="py-7 text-right px-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">POSIBLE COBRO</th>
                    <th className="py-7 text-center px-8 rounded-r-full text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">CESE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allRecords.filter(r => JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase())).map((res, i) => {
                    const ceseVal = getVal(res, 15) || 'PENDIENTE';
                    return (
                      <tr key={i} onClick={() => handleOpenExpediente(res)} className="group hover:bg-white/5 cursor-pointer transition-all">
                        <td className="py-10 px-8 text-sm font-black text-[#f0b86a]">{getVal(res, 0)}</td>
                        <td className="py-10 text-sm font-black text-white italic uppercase tracking-tight">{getVal(res, 1)}</td>
                        <td className="py-10 text-[10px] font-black text-white/60 uppercase tracking-widest italic">{getVal(res, 3)}</td>
                        <td className="py-10 text-[10px] font-black text-gray-400 uppercase tracking-widest">{getVal(res, 4)}</td>
                        <td className="py-10 text-[10px] font-black text-gray-400 uppercase tracking-widest">{getVal(res, 5)}</td>
                        <td className="py-10 text-right px-4">
                          <span className="text-[10px] font-black text-[#f0b86a] bg-[#f0b86a]/5 px-4 py-2 rounded-xl border border-[#f0b86a]/10 group-hover:bg-[#f0b86a] group-hover:text-black transition-all">
                            {formatDate(getVal(res, 10))}
                          </span>
                        </td>
                        <td className="py-10 text-center px-8">
                          <span className={`text-[9px] font-black px-4 py-1.5 rounded-xl border uppercase tracking-[0.2em] ${ceseVal === 'SI' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ceseVal === 'NO' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                            {ceseVal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: COBRANZAS */}
        {activeInternalTab === 'Cobranzas' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-black/40 p-10 rounded-[2.5rem] border border-white/5">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20">
                  <DollarSign className="text-green-500" size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Gestión de Cobranzas</h3>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2 mt-2">
                    <CheckCircle2 size={12} className="text-green-500" /> Clientes con CESE Aprobado (SI)
                  </p>
                </div>
              </div>
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700" size={20} />
                <input type="text" placeholder="BUSCAR EN COBRANZAS..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl py-6 pl-14 pr-8 text-xs font-black text-white uppercase outline-none focus:border-green-500/40" />
              </div>
              <button onClick={() => fetchAllData()} disabled={isSyncing} className="bg-white/5 hover:bg-white/10 text-white p-6 rounded-2xl border border-white/10 transition-all active:scale-90 shadow-xl"><RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} /></button>
            </div>
            
            <div className="overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-4 min-w-[1800px]">
                <thead>
                  <tr className="bg-[#050505] shadow-lg">
                    <th className="py-7 px-8 rounded-l-full text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">C.I</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">CLIENTE</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">ASESOR</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">INSTITUCIÓN</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">CIUDAD</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">F. FIRMA</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">PLAN</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">MONTO TOTAL</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">POSIBLE COBRO</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">EMPRESA</th>
                    <th className="py-7 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">PROVEEDOR</th>
                    <th className="py-7 px-8 rounded-r-full text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">ESTADO CESE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allRecords
                    .filter(r => {
                      const matchSearch = JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase());
                      const ceseSi = getVal(r, 15).toUpperCase() === 'SI';
                      return matchSearch && ceseSi;
                    })
                    .map((res, i) => (
                    <tr key={i} onClick={() => handleOpenExpediente(res)} className="group hover:bg-white/5 cursor-pointer transition-all">
                      <td className="py-8 px-8 text-sm font-black text-[#f0b86a]">{getVal(res, 0)}</td>
                      <td className="py-8 text-sm font-black text-white uppercase italic">{getVal(res, 1)}</td>
                      <td className="py-8 text-[11px] font-black text-white/70 uppercase italic">{getVal(res, 3)}</td>
                      <td className="py-8 text-[11px] font-black text-gray-500 uppercase">{getVal(res, 4)}</td>
                      <td className="py-8 text-[11px] font-black text-gray-500 uppercase italic">{getVal(res, 5)}</td>
                      <td className="py-8 text-[11px] font-black text-gray-400">{formatDate(getVal(res, 6))}</td>
                      <td className="py-8 text-[11px] font-black text-white uppercase">{getVal(res, 8)} CUOTAS</td>
                      <td className="py-8 text-[12px] font-black text-green-500 italic">{formatCurrency(getVal(res, 9))}</td>
                      <td className="py-8 text-[11px] font-black text-white bg-white/5 px-4 rounded-xl">{formatDate(getVal(res, 10))}</td>
                      <td className="py-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">{getVal(res, 12)}</td>
                      <td className="py-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">{getVal(res, 13)}</td>
                      <td className="py-8 px-8 text-center">
                        <span className="text-[9px] font-black px-4 py-1.5 rounded-xl border uppercase tracking-widest bg-green-500/10 text-green-500 border-green-500/20 shadow-lg shadow-green-500/5">
                          {getVal(res, 15)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allRecords.filter(r => getVal(r, 15).toUpperCase() === 'SI').length === 0 && !isSyncing && (
                <div className="py-32 flex flex-col items-center justify-center opacity-30">
                  <AlertCircle size={80} className="text-gray-700" />
                  <p className="mt-8 text-2xl font-black uppercase tracking-widest italic text-gray-600">No hay expedientes con CESE SI</p>
                  <p className="mt-2 text-sm font-black text-gray-700 uppercase">Asegúrate de marcar SI en la pestaña de Firmas</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: CARGAR FIRMAS */}
        {activeInternalTab === 'Cargar Firmas' && (
          <div className="animate-in fade-in duration-500 space-y-12">
            <form onSubmit={handleGuardarFirma} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">G.I / DOCUMENTO *</label>
                  <input type="text" name="ci" value={firmaData.ci} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white focus:border-[#f0b86a]/40 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">NOMBRE CLIENTE *</label>
                  <input type="text" name="nombre_cliente" value={firmaData.nombre_cliente} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white focus:border-[#f0b86a]/40 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">FECHA NACIMIENTO</label>
                  <input type="date" name="fecha_nacimiento" value={firmaData.fecha_nacimiento} onChange={handleFirmaChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">ASESOR RESPONSABLE *</label>
                  <select name="agente" value={firmaData.agente} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none">
                    <option value="">Seleccionar...</option>
                    {agentesPredefinidos.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">INSTITUCIÓN *</label>
                  <input type="text" name="institucion" value={firmaData.institucion} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white focus:border-[#f0b86a]/40 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">CIUDAD / LOCALIDAD *</label>
                  <input type="text" name="ciudad" value={firmaData.ciudad} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white focus:border-[#f0b86a]/40 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">FECHA DE FIRMA *</label>
                  <input type="date" name="fecha_firma" value={firmaData.fecha_firma} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">FECHA DILIGENCIA</label>
                  <input type="date" name="diligencia" value={firmaData.diligencia} onChange={handleFirmaChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-[#f0b86a] uppercase">SELECCIÓN DE PLAN DE CUOTAS *</label>
                  <select name="cuotas" value={firmaData.cuotas} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none font-black uppercase">
                    <option value="">SELECCIONAR PLAN...</option>
                    {listaCuotas.map(n => <option key={n} value={n}>{n} CUOTA{Number(n) > 1 ? 'S' : ''}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#f0b86a] uppercase">FECHA POSIBLE COBRO</label>
                  <input type="date" name="fecha_posible_cobro" value={firmaData.fecha_posible_cobro} onChange={handleFirmaChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">ESTADO DE FIRMA *</label>
                  <select name="firma" value={firmaData.firma} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none">
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">EMPRESA DESTINO</label>
                  <select name="empresa" value={firmaData.empresa} onChange={handleFirmaChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none">
                    {empresasPredefinidas.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">PROVEEDOR EXTERNO</label>
                  <select name="proveedor" value={firmaData.proveedor} onChange={handleFirmaChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none">
                    {proveedoresPredefinidos.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                <div className="bg-[#050505] border border-white/5 rounded-2xl p-8 flex justify-between items-center group hover:border-[#f0b86a]/20 transition-all">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">MONTO DE CUOTA RESULTANTE</p>
                    <p className="text-[11px] font-black text-[#f0b86a] uppercase">A PAGAR</p>
                  </div>
                  <p className="text-4xl font-black text-[#f0b86a] italic">
                    {formatCurrency(firmaData.cuota_monto)}
                  </p>
                </div>
                <div className="bg-[#050505] border border-white/5 rounded-2xl p-8 flex justify-between items-center group hover:border-white/10 transition-all">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">MONTO TOTAL DE OPERACIÓN</p>
                    <p className="text-[11px] font-black text-white/40 uppercase">CAPITAL FINAL</p>
                  </div>
                  <p className="text-4xl font-black text-white italic">
                    {formatCurrency(firmaData.total)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 pt-4">
                <button type="button" onClick={handleLimpiarFirma} className="bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white py-4 px-12 rounded-lg font-black text-sm transition-all border border-white/5 active:scale-95">
                  Limpiar
                </button>
                <button type="submit" disabled={loading} className="bg-[#f0b86a] hover:bg-[#e0a85a] text-black py-4 px-12 rounded-lg font-black text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-3">
                  {loading && <Loader2 className="animate-spin" size={16} />}
                  Guardar Firma
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL EXPEDIENTE */}
        {selectedExpediente && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className={`bg-[#0a0a0a] w-full ${activeInternalTab === 'Cobranzas' ? 'max-w-md' : 'max-w-7xl'} rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[98vh]`}>
              <div className="p-10 flex justify-between items-start border-b border-white/5">
                <div>
                  <h2 className="text-4xl md:text-6xl font-black text-[#f0b86a] italic uppercase tracking-tighter leading-none">
                    {activeInternalTab === 'Cobranzas' ? 'EXPEDIENTE' : 'EXPEDIENTE CLIENTE'}
                  </h2>
                  <p className="text-[11px] font-black text-gray-600 uppercase tracking-[0.4em] mt-3">SISTEMA CLOUD VISTA COMPLETA</p>
                </div>
                <button onClick={() => setSelectedExpediente(null)} className="w-12 h-12 md:w-16 md:h-16 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all text-white border border-white/5"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                {activeInternalTab === 'Cobranzas' ? (
                  /* VISTA SIMPLIFICADA PARA COBRANZAS (SEGÚN IMAGEN DEL USUARIO) */
                  <div className="space-y-8 bg-[#0d140f] p-10 rounded-[2.5rem] border border-green-500/10 animate-in zoom-in-95">
                    <div className="flex items-center gap-4 text-green-500 border-b border-green-500/5 pb-6">
                      <CreditCard size={24} />
                      <h4 className="text-lg font-black uppercase tracking-[0.2em]">RESUMEN</h4>
                    </div>
                    <div className="space-y-10">
                      <div>
                        <p className="text-[10px] font-black text-green-500/40 uppercase mb-3 tracking-[0.3em]">TOTAL</p>
                        <p className="text-5xl font-black text-green-500 italic drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                          {formatCurrency(getVal(selectedExpediente, 9))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-green-500/40 uppercase mb-3 tracking-[0.3em]">PLAN</p>
                        <p className="text-2xl font-black text-white uppercase italic">
                          {getVal(selectedExpediente, 8)} CUOTAS
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VISTA COMPLETA PARA FIRMAS */
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                      <div className="space-y-8 bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                        <div className="flex items-center gap-4 text-[#f0b86a] border-b border-white/5 pb-4"><User size={20} /><h4 className="text-[12px] font-black uppercase tracking-widest">IDENTIFICACIÓN</h4></div>
                        <div className="space-y-6">
                          <div><p className="text-[9px] font-black text-gray-700 uppercase mb-1">NOMBRE</p><p className="text-3xl font-black text-white italic uppercase">{getVal(selectedExpediente, 1)}</p></div>
                          <div><p className="text-[9px] font-black text-gray-700 uppercase mb-1">C.I</p><p className="text-4xl font-black text-[#f0b86a]">{getVal(selectedExpediente, 0)}</p></div>
                          <div><p className="text-[9px] font-black text-gray-700 uppercase mb-1">NACIMIENTO</p><p className="text-xl font-black text-white">{formatDate(getVal(selectedExpediente, 2))}</p></div>
                        </div>
                      </div>
                      <div className="space-y-8 bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                        <div className="flex items-center gap-4 text-[#f0b86a] border-b border-white/5 pb-4"><Briefcase size={20} /><h4 className="text-[12px] font-black uppercase tracking-widest">GESTIÓN</h4></div>
                        <div className="space-y-6">
                          <div><p className="text-[9px] font-black text-gray-700 uppercase mb-1">INSTITUCIÓN</p><p className="text-xl font-black text-white uppercase">{getVal(selectedExpediente, 4)}</p></div>
                          <div><p className="text-[9px] font-black text-gray-700 uppercase mb-1">CIUDAD</p><p className="text-xl font-black text-white uppercase">{getVal(selectedExpediente, 5)}</p></div>
                          <div><p className="text-[9px] font-black text-gray-700 uppercase mb-1">AGENTE</p><p className="text-xl font-black text-[#f0b86a] italic">{getVal(selectedExpediente, 3)}</p></div>
                        </div>
                      </div>
                      <div className="space-y-8 bg-[#0d140f] p-8 rounded-[2.5rem] border border-green-500/10">
                        <div className="flex items-center gap-4 text-green-500 border-b border-green-500/5 pb-4"><CreditCard size={20} /><h4 className="text-[12px] font-black uppercase tracking-widest">RESUMEN</h4></div>
                        <div className="space-y-6">
                          <div><p className="text-[9px] font-black text-green-500/40 uppercase mb-1">TOTAL</p><p className="text-4xl font-black text-green-500">{formatCurrency(getVal(selectedExpediente, 9))}</p></div>
                          <div><p className="text-[9px] font-black text-green-500/40 uppercase mb-1">PLAN</p><p className="text-xl font-black text-white uppercase">{getVal(selectedExpediente, 8)} CUOTAS</p></div>
                          <div><p className="text-[9px] font-black text-green-500/40 uppercase mb-1">POSIBLE COBRO</p><p className="text-xl font-black text-white">{formatDate(getVal(selectedExpediente, 10))}</p></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-10 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 text-[#f0b86a]"><ShieldCheck size={24} /><h4 className="text-lg font-black uppercase tracking-tighter">GESTIÓN DE CESE</h4></div>
                        <div className="relative">
                           <select 
                             value={ceseStatus} 
                             onChange={(e) => setCeseStatus(e.target.value)}
                             className={`w-full bg-black/60 rounded-[1.5rem] border border-white/10 p-6 text-xl font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-[#f0b86a]/40 shadow-inner ${ceseStatus === 'SI' ? 'text-green-500' : ceseStatus === 'NO' ? 'text-red-500' : 'text-gray-400'}`}
                           >
                             <option value="PENDIENTE">PENDIENTE</option>
                             <option value="SI">SI (APLICADO)</option>
                             <option value="NO">NO (DENEGADO)</option>
                           </select>
                           <ChevronDown size={24} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 text-[#f0b86a]"><MessageSquare size={24} /><h4 className="text-lg font-black uppercase tracking-tighter">OBSERVACIÓN / NOTAS</h4></div>
                        <textarea 
                          value={obsEdit} 
                          onChange={(e) => setObsEdit(e.target.value)} 
                          placeholder="Sin observaciones..." 
                          className="w-full bg-black/60 rounded-[1.5rem] border border-white/10 p-6 min-h-[120px] text-lg font-bold text-white uppercase italic tracking-tighter outline-none focus:border-[#f0b86a]/40 shadow-inner" 
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleGuardarExpediente} 
                      disabled={isSavingExp} 
                      className="w-full bg-[#f0b86a] hover:bg-[#e0a85a] text-black py-10 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl flex items-center justify-center gap-5 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSavingExp ? <Loader2 className="animate-spin" /> : <Save size={24} />} SINCRONIZAR EXPEDIENTE
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterludioPanel;
