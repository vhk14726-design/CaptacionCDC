
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw,
  Database,
  Eraser,
  Save,
  X,
  User,
  Building2,
  FileText,
  MessageSquare,
  Calendar,
  TableProperties,
  ArrowRight,
  ClipboardList,
  Fingerprint
} from 'lucide-react';

const INTERLUDIO_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxq-2osTNIhZQY9DMooCKYeRkBQlnHULr_fA9jCVrvgOiJR6yP1G2i7BG0qZgu5E0nw8Q/exec';

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
  const [loadingRevision, setLoadingRevision] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, detail?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const [editObs, setEditObs] = useState('');

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
    cuota: '',            
    total: '',            
    posible_cobro: '',    
    firma: '',            
    empresa: '',          
    proveedor: '',
    observacion_cese: ''  
  };

  const [firmaData, setFirmaData] = useState(initialFirmaState);

  const agentesPredefinidos = [
    'ALEXANDER MACIEL', 'ANDRES OJEDA', 'ARIEL GRISSETTI', 'DELY GONZALEZ',
    'IDA RECALDE', 'IVANA VILLAMAYOR', 'JOSE LUIS TORALES', 'NOELIA ESTIGARRIBIA'
  ];

  const empresasPredefinidas = ['LME', 'GFV'];
  const proveedoresPredefinidos = ['CAPTACIÓN', 'PROPIO'];
  const listaCuotas = [1, 2, 3, 4, 5, 6];

  const handleLimpiar = () => {
    setFirmaData(initialFirmaState);
    setStatus(null);
  };

  const formatDateValue = (val: any) => {
    if (!val || val === 'N/A' || val === '') return 'N/A';
    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return String(val);
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) { return String(val); }
  };

  const normalizeKey = (key: string) => {
    if (!key) return '';
    return key.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '');      
  };

  const getFlexibleValue = (row: any, ...aliases: string[]) => {
    if (!row) return 'N/A';
    const keys = Object.keys(row);
    
    // Intento 1: Coincidencia exacta o normalizada
    for (const alias of aliases) {
      const target = normalizeKey(alias);
      const exactKey = keys.find(k => normalizeKey(k) === target);
      if (exactKey && row[exactKey] !== undefined && row[exactKey] !== null && String(row[exactKey]).trim() !== "") {
        return String(row[exactKey]);
      }
    }

    // Intento 2: Búsqueda por palabra clave (especial para observaciones y firmas)
    const combinedAliases = aliases.join(' ').toLowerCase();
    if (combinedAliases.includes('observ')) {
      const obsKey = keys.find(k => k.toLowerCase().includes('observ') || k.toLowerCase().includes('obs'));
      if (obsKey) return String(row[obsKey]);
    }
    
    if (combinedAliases.includes('firma')) {
      // Evitamos confundir con "fecha_firma" buscando una columna que sea exactamente "firma" o similar corto
      const fKey = keys.find(k => {
        const nk = normalizeKey(k);
        return nk === 'firma' || nk === 'estadofirma';
      });
      if (fKey) return String(row[fKey]);
    }

    return 'N/A';
  };

  const formatCurrency = (val: any) => {
    if (!val || val === 'N/A') return 'Gs. 0';
    const cleanVal = String(val).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanVal);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(num).replace('PYG', 'Gs.');
  };

  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const response = await fetch(`${INTERLUDIO_SHEETS_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const jsonResponse = await response.json();
      let dataArray = Array.isArray(jsonResponse) ? jsonResponse : (jsonResponse.data || []);
      setAllRecords(dataArray.reverse());
    } catch (err: any) {
      console.error("Fetch Error:", err);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData(true);
  }, [fetchAllData]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return allRecords;
    return allRecords.filter(r => JSON.stringify(Object.values(r)).toLowerCase().includes(query));
  }, [allRecords, searchQuery]);

  const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cuotas') {
      const plan = PLAN_CUOTAS_MAP[value];
      setFirmaData(prev => ({ 
        ...prev, 
        cuotas: value,
        cuota: plan ? plan.cuota : '',
        total: plan ? plan.total : ''
      }));
    } 
    else if (name === 'diligencia') {
      let posibleCobro = '';
      if (value) {
        const dateParts = value.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        let targetMonth = day >= 6 ? month + 1 : month;
        let targetYear = year;
        if (targetMonth > 11) { targetMonth = 0; targetYear += 1; }
        const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const finalDay = Math.min(30, lastDayOfMonth);
        posibleCobro = new Date(targetYear, targetMonth, finalDay).toISOString().split('T')[0];
      }
      setFirmaData(prev => ({ ...prev, diligencia: value, posible_cobro: posibleCobro }));
    }
    else {
      setFirmaData(prev => ({ ...prev, [name]: value }));
    }
  };

  const openExpediente = (res: any) => {
    setSelectedRecord(res);
    const obs = getFlexibleValue(res, 'observacion', 'observacion_cese', 'obs', 'observacion_', 'observacin');
    setEditObs(obs === 'N/A' ? '' : obs);
  };

  const handleGuardarFirma = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const params = new URLSearchParams();
      Object.entries(firmaData).forEach(([key, val]) => {
        params.append(key, String(val).trim().toUpperCase());
      });

      await fetch(INTERLUDIO_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: params,
      });

      setStatus({ type: 'success', message: '¡REGISTRO ENVIADO!', detail: 'Sincronizado con éxito en la base central.' });
      setFirmaData(initialFirmaState);
      setTimeout(() => fetchAllData(true), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: 'ERROR DE CONEXIÓN', detail: 'No se pudo guardar el registro.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarRevision = async () => {
    if (!selectedRecord) return;
    setLoadingRevision(true);
    
    try {
      const params = new URLSearchParams();
      params.append('action', 'save_revision');
      params.append('ci', getFlexibleValue(selectedRecord, 'ci', 'c_i', 'documento'));
      params.append('observacion_cese', editObs.toUpperCase());

      await fetch(INTERLUDIO_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: params,
      });

      setSelectedRecord(null);
      setStatus({ type: 'success', message: '¡EXPEDIENTE ACTUALIZADO!', detail: 'La observación se guardó correctamente en la columna O.' });
      setTimeout(() => fetchAllData(true), 2000);
    } catch (err) {
      setStatus({ type: 'error', message: 'ERROR AL GUARDAR', detail: 'Intente nuevamente.' });
    } finally {
      setLoadingRevision(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 relative">
      {/* Expediente Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="w-full max-w-3xl bg-[#0a0a0a] h-full border-l border-white/10 p-16 overflow-y-auto animate-in slide-in-from-right duration-500 shadow-[-30px_0_60px_rgba(0,0,0,0.8)] relative">
            
            <div className="flex justify-between items-start mb-20">
              <div>
                <h3 className="text-5xl font-black text-[#f0b86a] italic uppercase tracking-tighter leading-none">Expediente</h3>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mt-3">Interludio Cloud Management</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-5 bg-white/5 rounded-full hover:bg-white/10 transition-all">
                <X size={28} className="text-white" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-[#f0b86a]">
                    <User size={18} />
                    <label className="text-[11px] font-black uppercase tracking-widest">Información del Cliente</label>
                  </div>
                  <div className="space-y-2 group">
                    <p className="text-[9px] font-black text-gray-600 uppercase">Documento</p>
                    <p className="text-3xl font-black text-white">{getFlexibleValue(selectedRecord, 'ci', 'c_i')}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-600 uppercase">Nombre</p>
                    <p className="text-xl font-black text-white italic uppercase">{getFlexibleValue(selectedRecord, 'nombre_cliente', 'nombrecliente', 'nombre')}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-[#f0b86a]">
                    <Building2 size={18} />
                    <label className="text-[11px] font-black uppercase tracking-widest">Institución</label>
                  </div>
                  <p className="text-sm font-black text-white uppercase">{getFlexibleValue(selectedRecord, 'institucion', 'institucin', 'institucion_')}</p>
                  <p className="text-[10px] font-bold text-gray-500">Agente: {getFlexibleValue(selectedRecord, 'agente')}</p>
                </div>
              </div>

              <div className="space-y-12">
                <div className="bg-green-500/5 p-8 rounded-[2.5rem] border border-green-500/10 shadow-lg">
                  <p className="text-[10px] font-black text-green-500/60 uppercase mb-2">Monto Operación</p>
                  <p className="text-4xl font-black text-green-500 tracking-tighter">{formatCurrency(getFlexibleValue(selectedRecord, 'total'))}</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black text-gray-500 uppercase">Estado Firma</span>
                    <span className={`text-xs font-black uppercase ${getFlexibleValue(selectedRecord, 'firma').toUpperCase() === 'SI' ? 'text-green-500' : 'text-red-500'}`}>
                      {getFlexibleValue(selectedRecord, 'firma')}
                    </span>
                  </div>
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black text-gray-500 uppercase">Fecha Firma</span>
                    <span className="text-xs font-black text-white">{formatDateValue(getFlexibleValue(selectedRecord, 'fecha_firma'))}</span>
                  </div>
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-[#f0b86a]/20">
                    <span className="text-[9px] font-black text-[#f0b86a] uppercase">Cobro</span>
                    <span className="text-xs font-black text-white">{formatDateValue(getFlexibleValue(selectedRecord, 'posible_cobro', 'fechaposiblecobro', 'fecha_posible_cobro'))}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-20 pt-10 border-t border-white/10">
              <div className="flex items-center gap-3 text-[#f0b86a] mb-8">
                <MessageSquare size={22} />
                <label className="text-xs font-black uppercase tracking-[0.25em]">Observación / Notas (Columna O)</label>
              </div>
              <div className="space-y-8">
                <textarea 
                  value={editObs} 
                  onChange={(e) => setEditObs(e.target.value)}
                  placeholder="Ingrese las observaciones del expediente aquí..."
                  className="w-full bg-[#080808] border border-white/5 rounded-[3rem] p-10 text-sm text-white h-64 focus:outline-none focus:border-[#f0b86a]/50 resize-none font-bold placeholder:text-gray-800 transition-all shadow-2xl"
                />
                <button 
                  onClick={handleGuardarRevision}
                  disabled={loadingRevision}
                  className="w-full bg-[#f0b86a] hover:bg-[#e0a85a] text-black py-8 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 disabled:opacity-30 shadow-2xl active:scale-95"
                >
                  {loadingRevision ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> Guardar Observación en Sheets</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex border-b border-white/5 mb-8">
        {[
          { id: 'FIRMAS', icon: <ClipboardList size={14} /> },
          { id: 'Cargar Firmas', icon: <Save size={14} /> },
          { id: 'Cobranzas', icon: <Database size={14} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveInternalTab(tab.id)}
            className={`px-12 py-6 text-[11px] font-black uppercase tracking-[0.25em] transition-all relative flex items-center gap-3 ${
              activeInternalTab === tab.id ? 'text-[#f0b86a]' : 'text-gray-500 hover:text-white'
            }`}
          >
            {tab.icon} {tab.id}
            {activeInternalTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#f0b86a]"></div>}
          </button>
        ))}
      </div>

      <div className="bg-[#0d0d0d] rounded-[2.5rem] border border-white/5 shadow-2xl p-12 relative overflow-hidden">
        {status && (
          <div className={`mb-12 p-6 rounded-2xl flex items-center gap-5 ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {status.type === 'success' ? <CheckCircle2 size={24} /> : <X size={24} />}
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest">{status.message}</p>
              <p className="text-[10px] opacity-60 mt-1">{status.detail}</p>
            </div>
            <button onClick={() => setStatus(null)} className="opacity-40 hover:opacity-100 transition-opacity"><ArrowRight size={18} /></button>
          </div>
        )}

        {activeInternalTab === 'Cargar Firmas' && (
          <div className="animate-in fade-in">
            <header className="flex justify-between items-center mb-16">
              <div>
                <h2 className="text-5xl font-black text-[#f0b86a] italic uppercase tracking-tighter leading-none">NUEVA CARGA</h2>
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mt-3">MAPEO DE DATOS PARA COLUMNAS A-N</p>
              </div>
              <div className="px-6 py-3 bg-[#0d0d0d] border border-[#f0b86a]/20 rounded-2xl flex items-center gap-3 shadow-xl">
                <ShieldCheck size={18} className="text-[#f0b86a]" />
                <span className="text-[10px] font-black text-[#f0b86a] uppercase tracking-[0.2em]">SINCRONIZACIÓN SEGURA</span>
              </div>
            </header>

            <form onSubmit={handleGuardarFirma} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">C.I / Documento *</label>
                  <input type="text" name="ci" value={firmaData.ci} onChange={handleFirmaChange} required className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white focus:border-[#f0b86a]/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Nombre Cliente *</label>
                  <input type="text" name="nombre_cliente" value={firmaData.nombre_cliente} onChange={handleFirmaChange} required className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white focus:border-[#f0b86a]/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Fecha Nacimiento</label>
                  <div className="relative group">
                    <input type="date" name="fecha_nacimiento" value={firmaData.fecha_nacimiento} onChange={handleFirmaChange} className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white focus:border-[#f0b86a]/40" />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Asesor Responsable *</label>
                  <select name="agente" value={firmaData.agente} onChange={handleFirmaChange} required className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white appearance-none cursor-pointer">
                    <option value="">Seleccionar...</option>
                    {agentesPredefinidos.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Institución *</label>
                  <input type="text" name="institucion" value={firmaData.institucion} onChange={handleFirmaChange} required className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white focus:border-[#f0b86a]/40" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Ciudad / Localidad *</label>
                  <input type="text" name="ciudad" value={firmaData.ciudad} onChange={handleFirmaChange} required className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white focus:border-[#f0b86a]/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Fecha de Firma *</label>
                  <div className="relative group">
                    <input type="date" name="fecha_firma" value={firmaData.fecha_firma} onChange={handleFirmaChange} required className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white" />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Fecha Diligencia</label>
                  <div className="relative group">
                    <input type="date" name="diligencia" value={firmaData.diligencia} onChange={handleFirmaChange} className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white" />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[9px] font-black text-[#f0b86a] uppercase tracking-widest ml-1">Selección de Plan de Cuotas *</label>
                  <select name="cuotas" value={firmaData.cuotas} onChange={handleFirmaChange} required className="w-full bg-black border border-[#f0b86a]/20 rounded-xl py-4 px-5 text-sm text-white font-black cursor-pointer">
                    <option value="">SELECCIONAR PLAN...</option>
                    {listaCuotas.map(n => <option key={n} value={n}>{n} CUOTA{n > 1 ? 'S' : ''}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Fecha Posible Cobro</label>
                  <div className="relative group">
                    <input type="date" name="posible_cobro" value={firmaData.posible_cobro} onChange={handleFirmaChange} className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-[#f0b86a] font-black" />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Estado de Firma *</label>
                  <select name="firma" value={firmaData.firma} onChange={handleFirmaChange} required className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white cursor-pointer appearance-none">
                    <option value="">Seleccionar...</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Empresa Destino</label>
                  <select name="empresa" value={firmaData.empresa} onChange={handleFirmaChange} className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white cursor-pointer appearance-none">
                    <option value="">Seleccionar...</option>
                    {empresasPredefinidas.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Proveedor Externo</label>
                  <select name="proveedor" value={firmaData.proveedor} onChange={handleFirmaChange} className="w-full bg-black border border-white/5 rounded-xl py-4 px-5 text-sm text-white cursor-pointer appearance-none">
                    <option value="">Seleccionar...</option>
                    {proveedoresPredefinidos.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Sección de Resultados Movida Abajo */}
              <div className="bg-[#080808] p-8 rounded-[2rem] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Monto de Cuota Resultante</label>
                  <div className="bg-black/60 border border-white/5 rounded-2xl py-6 px-8 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase">A Pagar</span>
                    <span className="text-2xl font-black text-[#f0b86a] tracking-tight">{firmaData.cuota ? formatCurrency(firmaData.cuota) : 'Gs. 0'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Monto Total de Operación</label>
                  <div className="bg-black/60 border border-white/5 rounded-2xl py-6 px-8 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase">Capital Final</span>
                    <span className="text-2xl font-black text-white tracking-tight">{firmaData.total ? formatCurrency(firmaData.total) : 'Gs. 0'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-6 pt-12 border-t border-white/5">
                <button type="button" onClick={handleLimpiar} className="bg-black border border-white/5 hover:bg-white/5 text-white px-12 py-6 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95">
                  <Eraser size={18} /> LIMPIAR TODO
                </button>
                <button type="submit" disabled={loading} className="bg-[#f0b86a] hover:bg-[#e0a85a] text-black px-24 py-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-3 active:scale-95 transition-all">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> GUARDAR EN SHEETS</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeInternalTab === 'FIRMAS' && (
          <div className="space-y-10 animate-in fade-in">
            <div className="flex flex-col md:flex-row items-center gap-8 bg-black/40 p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
              <div className="relative flex-1">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700" size={20} />
                <input 
                  type="text" 
                  placeholder="FILTRAR POR C.I, NOMBRE O ASESOR..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl py-6 pl-14 pr-8 text-xs font-black text-white uppercase tracking-[0.2em] focus:outline-none focus:border-[#f0b86a]"
                />
              </div>
              <button onClick={() => fetchAllData()} disabled={isSyncing} className="bg-white/5 hover:bg-white/10 text-white p-6 rounded-2xl border border-white/10 transition-all active:scale-90 shadow-2xl">
                <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="bg-black/20 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-700 uppercase tracking-[0.4em] border-b border-white/5 bg-black/50">
                    <th className="py-8 px-10">C.I</th>
                    <th className="py-8">NOMBRE</th>
                    <th className="py-8">F. NACIMIENTO</th>
                    <th className="py-8">INSTITUCIÓN</th>
                    <th className="py-8">AGENTE</th>
                    <th className="py-8 text-right px-10">POSIBLE COBRO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRecords.length > 0 ? filteredRecords.map((res, i) => (
                    <tr key={i} onClick={() => openExpediente(res)} className="group hover:bg-white/5 cursor-pointer transition-all">
                      <td className="py-8 px-10 text-sm font-black text-[#f0b86a] group-hover:text-white transition-colors">{getFlexibleValue(res, 'ci', 'c_i', 'documento')}</td>
                      <td className="py-8 text-sm font-black text-white italic uppercase tracking-tight">{getFlexibleValue(res, 'nombre_cliente', 'nombrecliente', 'nombre')}</td>
                      <td className="py-8 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{formatDateValue(getFlexibleValue(res, 'fecha_nacimiento', 'fechanacimiento', 'f_nacimiento'))}</td>
                      <td className="py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">{getFlexibleValue(res, 'institucion', 'institucin', 'institucion_')}</td>
                      <td className="py-8 text-[10px] font-black text-gray-500 uppercase tracking-widest">{getFlexibleValue(res, 'agente', 'vendedor', 'asesor')}</td>
                      <td className="py-8 text-right px-10">
                        <div className="inline-block px-4 py-2 rounded-xl bg-[#f0b86a]/5 border border-[#f0b86a]/10 group-hover:bg-[#f0b86a]/20 transition-all">
                          <span className="text-[10px] font-black text-[#f0b86a] uppercase">
                            {formatDateValue(getFlexibleValue(res, 'posible_cobro', 'fechaposiblecobro', 'fecha_posible_cobro'))}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="py-24 text-center opacity-20">
                         <TableProperties size={48} className="mx-auto mb-4" />
                         <p className="text-xs font-black uppercase tracking-widest">No hay registros disponibles</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeInternalTab === 'Cobranzas' && (
          <div className="py-56 text-center animate-in zoom-in-95">
             <Database size={64} className="text-gray-800 mx-auto mb-10" />
             <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Módulo de Cobranzas</h2>
             <p className="text-[#f0b86a] text-[10px] font-black uppercase tracking-[0.5em] mt-6 opacity-60">YA ESTOY LABURANDO EN ESTO</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterludioPanel;
