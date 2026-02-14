
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
  ArrowRightCircle,
  BadgeCheck,
  Wallet,
  CreditCard,
  Layout,
  TrendingDown,
  Scan,
  Zap,
  CheckCircle2,
  AlertCircle,
  Calendar,
  IdCard
} from 'lucide-react';

const INTERLUDIO_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx7zaAIKjgfvsSNJ9W0L84dAkByePgVdEPiiJEWODW4IMSgBfgxFhSbmg1VEoHB7bgGqA/exec';

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
  
  const [pagoCuota, setPagoCuota] = useState('1');
  const [pagoMonto, setPagoMonto] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allRecords, setAllRecords] = useState<any[]>([]);

  // Estados del Auto-Scanner
  const [isAutoVerifying, setIsAutoVerifying] = useState(false);
  const [autoVerifyStatus, setAutoVerifyStatus] = useState<'success' | 'error' | null>(null);

  const agentesPredefinidos = [
    'ALEXANDER MACIEL', 'ANDRES OJEDA', 'ARIEL GRISSETTI', 'DELY GONZALEZ',
    'IDA RECALDE', 'IVANA VILLAMAYOR', 'JOSE LUIS TORALES', 'NOELIA ESTIGARRIBIA',
    'ROBERTO RODAS', 'GABRIELA MOREL', 'LIZ DELGADO', 'CLOTILDE TORRES',
    'SONIA ESPINOLA', 'SONIA FARIÑA'
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
    cese: 'PENDIENTE',
    observacion: ''
  };
  const [firmaData, setFirmaData] = useState(initialFirmaState);

  const normalize = (str: string) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  };

  const getVal = (row: any, index: number) => {
    if (!row) return '';
    if (Array.isArray(row)) return String(row[index] || '').trim();
    
    const mappingKeys = [
      "ci", "nombre_cliente", "fecha_nacimiento", "agente", "institucion", 
      "ciudad", "fecha_de_firma", "diligencia", "cuota", "total", 
      "fecha_posible_cobro", "firma", "empresa", "proveedor", "observacion", 
      "cese", "cuota_pag", "pagado"
    ];

    const key = mappingKeys[index];
    if (row[key] !== undefined) return String(row[key]).trim();

    const keys = Object.keys(row);
    const targetNorm = normalize(key);
    for (const k of keys) {
      if (normalize(k) === targetNorm) return String(row[k]).trim();
    }
    return '';
  };

  const formatDate = (val: any) => {
    if (!val || val === 'N/A' || val === '') return '-';
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
        const json = await response.ok ? await response.json() : [];
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
    const relevantTabs = ['Cobranzas', 'FIRMAS', 'Pagado'];
    if (relevantTabs.includes(activeInternalTab)) {
      fetchAllData(true);
    }
  }, [activeInternalTab, fetchAllData]);

  // Función Maestra de Auto-Verificación
  const handleAutoVerifyCI = async () => {
    if (!firmaData.ci || isAutoVerifying) return;
    setIsAutoVerifying(true);
    setAutoVerifyStatus(null);
    try {
      const r = await fetch("/api/cedula/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: firmaData.ci }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.mensaje);

      // Formatear fecha para el input date (DD/MM/YYYY -> YYYY-MM-DD)
      let formattedDate = "";
      if (j.result.fecha_nacimiento && j.result.fecha_nacimiento.includes('/')) {
        const [d, m, y] = j.result.fecha_nacimiento.split('/');
        formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      // Estirar datos al formulario: Nombres + Apellidos y Fecha
      setFirmaData(prev => ({
        ...prev,
        nombre_cliente: `${j.result.nombres} ${j.result.apellidos}`.toUpperCase(),
        fecha_nacimiento: formattedDate
      }));
      setAutoVerifyStatus('success');
    } catch (err) {
      setAutoVerifyStatus('error');
    } finally {
      setIsAutoVerifying(false);
    }
  };

  const handleOpenExpediente = (res: any) => {
    const currentCese = getVal(res, 15);
    const currentObs = getVal(res, 14);
    const status = (currentCese.toUpperCase() === 'SI' || currentCese.toUpperCase() === 'NO') ? currentCese.toUpperCase() : 'PENDIENTE';
    setSelectedExpediente(res);
    setCeseStatus(status);
    setObsEdit(currentObs);
    setPagoCuota('1');
    setPagoMonto('');
  };

  const handleGuardarExpediente = async () => {
    if (!selectedExpediente) return;
    setIsSavingExp(true);
    try {
      const ci = getVal(selectedExpediente, 0);
      const params = new URLSearchParams();
      if (activeInternalTab === 'Cobranzas' || activeInternalTab === 'Pagado') {
        const cuotasActuales = parseInt(getVal(selectedExpediente, 16).replace(/\D/g, '')) || 0;
        const montoActual = parseInt(getVal(selectedExpediente, 17).replace(/\D/g, '')) || 0;
        const nuevasCuotas = parseInt(pagoCuota) || 0;
        const nuevoMontoCargado = parseInt(pagoMonto.replace(/\./g, '')) || 0;
        const totalCuotas = cuotasActuales + nuevasCuotas;
        const totalMonto = montoActual + nuevoMontoCargado;
        params.append('action', 'save_payment');
        params.append('ci', ci);
        params.append('cuota_pagada', String(totalCuotas));
        params.append('monto_pagado', String(totalMonto).replace(/\B(?=(\d{3})+(?!\d))/g, ".")); 
      } else {
        params.append('action', 'save_revision');
        params.append('ci', ci);
        params.append('cese', ceseStatus.toUpperCase());
        params.append('observacion', obsEdit.toUpperCase());
      }
      await fetch(INTERLUDIO_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: params });
      alert('¡SINCRONIZACIÓN EXITOSA!');
      setSelectedExpediente(null);
      fetchAllData(true);
    } catch (err) { alert('Error al sincronizar'); } finally { setIsSavingExp(false); }
  };

  const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleGuardarFirma = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(firmaData).forEach(([k, v]) => params.append(k, String(v).trim().toUpperCase()));
      await fetch(INTERLUDIO_SHEETS_URL, { method: 'POST', mode: 'no-cors', body: params });
      setFirmaData(initialFirmaState);
      setAutoVerifyStatus(null);
      alert('¡FIRMA REGISTRADA CON ÉXITO!');
      setTimeout(() => fetchAllData(true), 1500);
    } catch (err) { alert('Error al registrar firma'); } finally { setLoading(false); }
  };

  const handleMontoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val === "") { setPagoMonto(""); return; }
    const formatted = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setPagoMonto(formatted);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 relative">
      <div className="flex border-b border-white/5 mb-8 overflow-x-auto custom-scrollbar">
        {[
          { id: 'FIRMAS', icon: <ClipboardList size={14} />, label: 'Firmas' },
          { id: 'Cargar Firmas', icon: <Save size={14} />, label: 'Cargar Firmas' },
          { id: 'Cobranzas', icon: <History size={14} />, label: 'Cobranzas' },
          { id: 'Pagado', icon: <BadgeCheck size={14} />, label: 'Pagado' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveInternalTab(tab.id)} className={`px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-3 whitespace-nowrap ${activeInternalTab === tab.id ? 'text-[#f0b86a]' : 'text-gray-500 hover:text-white'}`}>
            {tab.icon} {tab.label}
            {activeInternalTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#f0b86a]"></div>}
          </button>
        ))}
      </div>

      <div className="bg-[#0d0d0d] rounded-[2.5rem] border border-white/5 shadow-2xl p-10 relative min-h-[600px]">
        {(activeInternalTab === 'FIRMAS' || activeInternalTab === 'Cobranzas' || activeInternalTab === 'Pagado') && (
           <div className="space-y-10 animate-in fade-in">
              <div className="flex flex-col md:flex-row items-center gap-8 bg-black/40 p-10 rounded-[2.5rem] border border-white/5">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700" size={20} />
                  <input type="text" placeholder="BUSCAR REGISTRO..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl py-6 pl-14 pr-8 text-xs font-black text-white uppercase outline-none focus:border-[#f0b86a]" />
                </div>
                <button onClick={() => fetchAllData()} disabled={isSyncing} className="bg-white/5 hover:bg-white/10 text-white p-6 rounded-2xl border border-white/10 transition-all active:scale-90"><RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} /></button>
              </div>
              
              <div className="overflow-hidden overflow-x-auto custom-scrollbar">
                <table className={`w-full text-left border-separate border-spacing-y-4 ${activeInternalTab === 'FIRMAS' ? 'min-w-[1200px]' : 'min-w-[2800px]'}`}>
                  <thead>
                    <tr className="bg-[#050505] shadow-lg text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      <th className="py-7 px-8 rounded-l-full whitespace-nowrap">C.I</th>
                      <th className="py-7 whitespace-nowrap">Nombre</th>
                      {activeInternalTab !== 'FIRMAS' && <th className="py-7 whitespace-nowrap">F. Nacimiento</th>}
                      <th className="py-7 whitespace-nowrap">Agente</th>
                      <th className="py-7 whitespace-nowrap">Institución</th>
                      <th className="py-7 whitespace-nowrap">Ciudad</th>
                      {activeInternalTab !== 'FIRMAS' && (
                        <>
                          <th className="py-7 whitespace-nowrap">F. Firma</th>
                          <th className="py-7 whitespace-nowrap">Diligencia</th>
                          <th className="py-7 whitespace-nowrap">Plan</th>
                          <th className="py-7 whitespace-nowrap">Total</th>
                        </>
                      )}
                      <th className="py-7 whitespace-nowrap">Posible Cobro</th>
                      {activeInternalTab !== 'FIRMAS' && (
                        <>
                          <th className="py-7 whitespace-nowrap">Firma</th>
                          <th className="py-7 whitespace-nowrap">Empresa</th>
                          <th className="py-7 whitespace-nowrap">Proveedor</th>
                          <th className="py-7 whitespace-nowrap">OBSERVACIÓN</th>
                        </>
                      )}
                      <th className="py-7 px-8 rounded-r-full whitespace-nowrap">CESE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRecords
                      .filter(r => {
                        const match = JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase());
                        const cuotasPagadas = parseInt(getVal(r, 16).replace(/\D/g, '')) || 0;
                        const ceseSi = getVal(r, 15).toUpperCase() === 'SI';
                        if (activeInternalTab === 'Cobranzas') return match && ceseSi && cuotasPagadas === 0;
                        if (activeInternalTab === 'Pagado') return match && cuotasPagadas > 0;
                        return match;
                      })
                      .map((res, i) => (
                      <tr key={i} onClick={() => handleOpenExpediente(res)} className="group hover:bg-white/5 cursor-pointer transition-all">
                        <td className="py-8 px-8 text-sm font-black text-[#f0b86a] whitespace-nowrap">{getVal(res, 0)}</td>
                        <td className="py-8 text-sm font-black text-white uppercase italic whitespace-nowrap">{getVal(res, 1)}</td>
                        {activeInternalTab !== 'FIRMAS' && <td className="py-8 text-[11px] font-black text-white/50 whitespace-nowrap">{formatDate(getVal(res, 2))}</td>}
                        <td className="py-8 text-[11px] font-black text-white/50 uppercase whitespace-nowrap">{getVal(res, 3)}</td>
                        <td className="py-8 text-[11px] font-black text-gray-500 uppercase whitespace-nowrap">{getVal(res, 4)}</td>
                        <td className="py-8 text-[11px] font-black text-gray-500 uppercase whitespace-nowrap">{getVal(res, 5)}</td>
                        {activeInternalTab !== 'FIRMAS' && (
                          <>
                            <td className="py-8 text-[11px] font-black text-white/50 whitespace-nowrap">{formatDate(getVal(res, 6))}</td>
                            <td className="py-8 text-[11px] font-black text-white/50 whitespace-nowrap">{formatDate(getVal(res, 7))}</td>
                            <td className="py-8 text-sm font-black text-white whitespace-nowrap italic">{getVal(res, 8)} CUOTAS</td>
                            <td className="py-8 text-sm font-black text-[#f0b86a] whitespace-nowrap">{formatCurrency(getVal(res, 9))}</td>
                          </>
                        )}
                        <td className="py-8 text-[11px] font-black text-white/50 whitespace-nowrap">{formatDate(getVal(res, 10))}</td>
                        {activeInternalTab !== 'FIRMAS' && (
                          <>
                            <td className="py-8 text-[11px] font-black uppercase whitespace-nowrap">
                              <span className={`px-4 py-1.5 rounded-full ${getVal(res, 11).toUpperCase() === 'SI' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {getVal(res, 11)}
                              </span>
                            </td>
                            <td className="py-8 text-[11px] font-black text-gray-500 uppercase whitespace-nowrap">{getVal(res, 12)}</td>
                            <td className="py-8 text-[11px] font-black text-gray-500 uppercase whitespace-nowrap">{getVal(res, 13)}</td>
                            <td className="py-8 text-[11px] font-black text-gray-600 uppercase max-w-xs truncate">{getVal(res, 14)}</td>
                          </>
                        )}
                        <td className={`py-8 px-8 text-[11px] font-black whitespace-nowrap ${activeInternalTab === 'FIRMAS' ? '' : 'text-right'}`}>
                          <span className={`px-4 py-1.5 rounded-full ${getVal(res, 15).toUpperCase() === 'SI' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-400'}`}>
                            {getVal(res, 15)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {activeInternalTab === 'Cargar Firmas' && (
          <div className="animate-in fade-in duration-500 space-y-12">
            <form onSubmit={handleGuardarFirma} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">G.I / DOCUMENTO *</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      name="ci" 
                      value={firmaData.ci} 
                      onChange={handleFirmaChange} 
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAutoVerifyCI())}
                      required 
                      className={`w-full bg-[#0a0a0a] border rounded-lg py-3.5 pl-4 pr-12 text-sm text-white focus:border-[#f0b86a]/40 outline-none transition-all ${autoVerifyStatus === 'error' ? 'border-red-500/50' : autoVerifyStatus === 'success' ? 'border-green-500/50' : 'border-white/10'}`} 
                    />
                    <button 
                      type="button"
                      onClick={handleAutoVerifyCI}
                      disabled={!firmaData.ci || isAutoVerifying}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-[#f0b86a]/20 rounded-md transition-all text-gray-500 hover:text-[#f0b86a] disabled:opacity-30"
                    >
                      {isAutoVerifying ? <Loader2 className="animate-spin" size={14} /> : <Scan size={14} />}
                    </button>
                  </div>
                  {autoVerifyStatus === 'success' && <p className="text-[8px] font-black text-green-500 uppercase ml-1 animate-pulse flex items-center gap-1"><CheckCircle2 size={10}/> Datos estirados</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">NOMBRE CLIENTE *</label>
                  <input type="text" name="nombre_cliente" value={firmaData.nombre_cliente} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white focus:border-[#f0b86a]/40 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">FECHA NACIMIENTO</label>
                  <input type="date" name="fecha_nacimiento" value={firmaData.fecha_nacimiento} onChange={handleFirmaChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">CIUDAD / LOCALIDAD *</label>
                  <input type="text" name="ciudad" value={firmaData.ciudad} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white focus:border-[#f0b86a]/40 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">FECHA DE FIRMA *</label>
                  <input type="date" name="fecha_firma" value={firmaData.fecha_firma} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase">FECHA DILIGENCIA</label>
                  <input type="date" name="diligencia" value={firmaData.diligencia} onChange={handleFirmaChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#f0b86a] uppercase">SELECCIÓN DE PLAN *</label>
                  <select name="cuotas" value={firmaData.cuotas} onChange={handleFirmaChange} required className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none font-black uppercase">
                    <option value="">SELECCIONAR PLAN...</option>
                    {listaCuotas.map(n => <option key={n} value={n}>{n} CUOTA{Number(n) > 1 ? 'S' : ''}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#f0b86a] uppercase">POSIBLE COBRO</label>
                  <input type="date" name="fecha_posible_cobro" value={firmaData.fecha_posible_cobro} onChange={handleFirmaChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3.5 px-4 text-sm text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">CUOTA MENSUAL</p>
                    <p className="text-[11px] font-black text-[#f0b86a] uppercase">MONTO ESTIMADO</p>
                  </div>
                  <p className="text-4xl font-black text-[#f0b86a] italic">{formatCurrency(firmaData.cuota_monto)}</p>
                </div>
                <div className="bg-[#050505] border border-white/5 rounded-2xl p-8 flex justify-between items-center group hover:border-white/10 transition-all">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">TOTAL OPERACIÓN</p>
                    <p className="text-[11px] font-black text-white/40 uppercase">CAPITAL FINAL</p>
                  </div>
                  <p className="text-4xl font-black text-white italic">{formatCurrency(firmaData.total)}</p>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 pt-4">
                <button type="button" onClick={() => { setFirmaData(initialFirmaState); setAutoVerifyStatus(null); }} className="bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white py-4 px-12 rounded-lg font-black text-sm transition-all border border-white/5 active:scale-95">Limpiar</button>
                <button type="submit" disabled={loading} className="bg-[#f0b86a] hover:bg-[#e0a85a] text-black py-4 px-12 rounded-lg font-black text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-3">
                  {loading && <Loader2 className="animate-spin" size={16} />} Guardar Firma
                </button>
              </div>
            </form>
          </div>
        )}

        {selectedExpediente && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className={`bg-[#050505] w-full ${(activeInternalTab === 'Cobranzas' || activeInternalTab === 'Pagado') ? 'max-w-2xl' : 'max-w-7xl'} rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[98vh]`}>
              <div className="p-10 flex justify-between items-start border-b border-white/5">
                <div>
                  <h2 className="text-5xl font-black text-[#f0b86a] italic uppercase tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(240,184,106,0.3)]">EXPEDIENTE</h2>
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mt-3">MODALIDAD: {activeInternalTab.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedExpediente(null)} className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all text-white border border-white/10 shadow-xl"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                {(activeInternalTab === 'Cobranzas' || activeInternalTab === 'Pagado') ? (
                  <div className="space-y-12 animate-in zoom-in-95">
                    <div className="bg-[#0a120d] p-10 rounded-[2.5rem] border border-green-500/10 shadow-2xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                       <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                          <CreditCard className="text-[#10b981]" size={28} />
                          <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">RESUMEN</h3>
                       </div>
                       <div className="space-y-10">
                          <div>
                             <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">TOTAL</p>
                             <p className="text-6xl font-black text-[#10b981] italic tracking-tighter drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">{formatCurrency(getVal(selectedExpediente, 9))}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                             <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">PLAN</p>
                                <p className="text-3xl font-black text-white italic uppercase tracking-widest">{getVal(selectedExpediente, 8)} CUOTAS</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">FALTANTE</p>
                                <p className="text-3xl font-black text-red-500 italic uppercase tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">{formatCurrency(Math.max(0, (parseInt(getVal(selectedExpediente, 9).replace(/\D/g, '')) || 0) - (parseInt(getVal(selectedExpediente, 17).replace(/\D/g, '')) || 0)))}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-3">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">CUOTAS PAGADAS</p>
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#f0b86a]/10 rounded-xl"><History size={20} className="text-[#f0b86a]" /></div>
                            <p className="text-3xl font-black text-white">{getVal(selectedExpediente, 16) || '0'}</p>
                          </div>
                      </div>
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-3">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">MONTO TOTAL COBRADO</p>
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-xl"><Wallet size={20} className="text-green-500" /></div>
                            <p className="text-2xl font-black text-white">{formatCurrency(getVal(selectedExpediente, 17))}</p>
                          </div>
                      </div>
                    </div>
                    <div className="bg-[#0a0a0a] p-10 rounded-[2.5rem] border border-white/5 space-y-10 shadow-inner">
                       <div className="space-y-4">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">NUEVA CUOTA A REGISTRAR</label>
                         <div className="relative group">
                            <select value={pagoCuota} onChange={(e) => setPagoCuota(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl p-7 text-2xl font-black text-white uppercase outline-none appearance-none cursor-pointer focus:border-[#f0b86a]/40 shadow-inner">
                                {[1, 2, 3, 4, 5, 6].map(num => <option key={num} value={String(num)}>{num} CUOTA</option>)}
                            </select>
                            <ChevronDown size={24} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none" />
                         </div>
                       </div>
                       <div className="space-y-4">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">NUEVO MONTO A COBRAR (GS)</label>
                         <input type="text" value={pagoMonto} onChange={handleMontoInput} placeholder="0" className="w-full bg-black border border-white/10 rounded-2xl py-7 px-8 text-3xl font-black text-white outline-none focus:border-[#10b981]/40 shadow-inner" />
                       </div>
                       <button onClick={handleGuardarExpediente} disabled={isSavingExp || !pagoMonto} className="w-full bg-[#10b981] hover:bg-[#0ea876] text-white py-9 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(16,185,129,0.2)] flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-20">
                         {isSavingExp ? <Loader2 className="animate-spin" /> : <ArrowRightCircle size={24} />} REGISTRAR Y SUMAR COBRO
                       </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 text-[#f0b86a]"><User size={20} /><h4 className="text-[10px] font-black uppercase tracking-widest">Identificación</h4></div>
                        <p className="text-3xl font-black text-white uppercase italic">{getVal(selectedExpediente, 1)}</p>
                        <p className="text-[10px] font-black text-gray-500 tracking-[0.3em]">C.I: {getVal(selectedExpediente, 0)}</p>
                      </div>
                      <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 text-[#f0b86a]"><Briefcase size={20} /><h4 className="text-[10px] font-black uppercase tracking-widest">Procedencia</h4></div>
                        <p className="text-xl font-black text-white uppercase italic">{getVal(selectedExpediente, 4)}</p>
                        <p className="text-[10px] font-black text-gray-500 tracking-[0.3em]">{getVal(selectedExpediente, 5)}</p>
                      </div>
                      <div className="bg-[#0d140f] p-8 rounded-[2.5rem] border border-green-500/10 space-y-4 text-center">
                        <p className="text-[9px] font-black text-green-500/40 uppercase tracking-widest">Cartera de Operación</p>
                        <p className="text-4xl font-black text-green-500 italic drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">{formatCurrency(getVal(selectedExpediente, 9))}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 text-[#f0b86a]"><ShieldCheck size={24} /><h4 className="text-xl font-black uppercase italic tracking-tighter">Estado de Cese</h4></div>
                        <div className="relative">
                            <select value={ceseStatus} onChange={(e) => setCeseStatus(e.target.value)} className={`w-full bg-black/60 rounded-[1.5rem] border border-white/10 p-7 text-xl font-black uppercase tracking-widest outline-none appearance-none cursor-pointer ${ceseStatus === 'SI' ? 'text-green-500' : 'text-gray-400'}`}>
                                <option value="PENDIENTE">PENDIENTE</option>
                                <option value="SI">SI (APLICADO)</option>
                                <option value="NO">NO (DENEGADO)</option>
                            </select>
                            <ChevronDown size={24} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 text-[#f0b86a]"><MessageSquare size={24} /><h4 className="text-xl font-black uppercase italic tracking-tighter">Observación Maestro</h4></div>
                        <textarea value={obsEdit} onChange={(e) => setObsEdit(e.target.value)} placeholder="Añadir notas del expediente..." className="w-full bg-black/60 rounded-[1.5rem] border border-white/10 p-7 min-h-[150px] text-lg font-bold text-white uppercase italic tracking-tighter outline-none focus:border-[#f0b86a] shadow-inner" />
                      </div>
                    </div>
                    <button onClick={handleGuardarExpediente} disabled={isSavingExp} className="w-full bg-[#f0b86a] hover:bg-[#e0a85a] text-black py-10 rounded-[2.5rem] font-black uppercase tracking-[0.5em] shadow-2xl flex items-center justify-center gap-5 transition-all active:scale-[0.98]">
                      {isSavingExp ? <Loader2 className="animate-spin" /> : <Save size={24} />} SINCRONIZAR EXPEDIENTE MAESTRO
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
