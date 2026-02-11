
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle,
  RefreshCw,
  Database,
  ListFilter,
  TableProperties,
  ArrowRight,
  Eraser,
  Save,
  CalendarDays,
  MapPin,
  X,
  User,
  Building2,
  Wallet,
  Briefcase,
  Tag,
  Phone,
  FileText
} from 'lucide-react';

// URL Actualizada proporcionada por el usuario
const INTERLUDIO_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxqh9VioDclWyKfanEaM4OYa4PgTZlGQ9AO5c5j6YIu0ppOgiKeBKyrih_rAfEaY8oSKA/exec';

const InterludioPanel: React.FC = () => {
  const [activeInternalTab, setActiveInternalTab] = useState('FIRMAS');
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, detail?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const initialFirmaState = {
    ci: '',               
    nombre_cliente: '',   
    fecha_nacimiento: '', 
    agente: '',           
    institucion: '',      
    ciudad: '',           
    fecha_firma: '',      
    diligencia: '',       
    cuota: '',            
    total: '',            
    posible_cobro: '',    
    firma: '',            
    empresa: '',          
    proveedor: ''         
  };

  const [firmaData, setFirmaData] = useState(initialFirmaState);

  const agentesPredefinidos = [
    'ALEXANDER MACIEL', 'ANDRES OJEDA', 'ARIEL GRISSETTI', 'DELY GONZALEZ',
    'IDA RECALDE', 'IVANA VILLAMAYOR', 'JOSE LUIS TORALES', 'NOELIA ESTIGARRIBIA'
  ];

  const empresasPredefinidas = ['LME', 'GFV'];
  const proveedoresPredefinidos = ['CAPTACIÓN', 'PROPIO'];

  const handleLimpiar = () => {
    setFirmaData(initialFirmaState);
    setStatus(null);
  };

  // Función para formatear fechas ISO o strings de fecha de Sheets
  const formatDateValue = (val: any) => {
    if (!val || val === 'N/A' || val === '') return 'N/A';
    
    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return String(val);
      
      // Usamos UTC para evitar desfases de zona horaria que cambian el día
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      return String(val);
    }
  };

  // Normalización ultra-robusta para los encabezados de Google Sheets
  const normalizeKey = (key: string) => {
    if (!key) return '';
    return key.toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[^a-z0-9]/g, '');      // Quitar puntos y espacios
  };

  const getFlexibleValue = (row: any, ...aliases: string[]) => {
    if (!row) return 'N/A';
    const keys = Object.keys(row);
    
    for (const alias of aliases) {
      const target = normalizeKey(alias);
      
      const exactKey = keys.find(k => normalizeKey(k) === target);
      if (exactKey && row[exactKey] !== undefined && row[exactKey] !== null && String(row[exactKey]).trim() !== "") {
        return String(row[exactKey]);
      }

      const partialKey = keys.find(k => {
        const normK = normalizeKey(k);
        return normK.includes(target) || target.includes(normK);
      });
      if (partialKey && row[partialKey] !== undefined && row[partialKey] !== null && String(row[partialKey]).trim() !== "") {
        return String(row[partialKey]);
      }
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
      
      let dataArray = Array.isArray(jsonResponse) ? jsonResponse : (jsonResponse.data || jsonResponse.records || []);
      
      dataArray = dataArray.filter((row: any) => {
        return Object.values(row).some(v => v !== null && v !== "" && String(v).trim() !== "");
      });

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
    return allRecords.filter(r => {
      return JSON.stringify(Object.values(r)).toLowerCase().includes(query);
    });
  }, [allRecords, searchQuery]);

  const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFirmaData(prev => ({ ...prev, [name]: value }));
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

      setStatus({ 
        type: 'success', 
        message: '¡REGISTRO ENVIADO!', 
        detail: 'Sincronizado con éxito. Los datos aparecerán en la tabla en unos segundos.' 
      });
      
      setFirmaData(initialFirmaState);
      setTimeout(() => fetchAllData(true), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: 'ERROR DE CONEXIÓN', detail: 'Verifica el despliegue del script de Google.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 relative">
      {/* Panel de Detalles (Ficha Completa) */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="w-full max-w-3xl bg-[#0a0a0a] h-full border-l border-white/10 p-16 overflow-y-auto animate-in slide-in-from-right duration-500 shadow-[-30px_0_60px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-start mb-20">
              <div>
                <h3 className="text-5xl font-black text-[#f0b86a] italic uppercase tracking-tighter leading-none">Expediente</h3>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mt-3">Interludio Cloud Management System</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-5 bg-white/5 rounded-full hover:bg-white/10 hover:rotate-90 transition-all">
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
                    <p className="text-[9px] font-black text-gray-600 uppercase">C.I / Documento</p>
                    <p className="text-3xl font-black text-white group-hover:text-[#f0b86a] transition-colors">{getFlexibleValue(selectedRecord, 'ci', 'c.i', 'documento')}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-600 uppercase">Nombre Completo</p>
                    <p className="text-xl font-black text-white italic uppercase tracking-tight">{getFlexibleValue(selectedRecord, 'nombre_cliente', 'nombrecliente', 'cliente')}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-600 uppercase">Fecha Nacimiento</p>
                    <p className="text-sm font-bold text-gray-400">{formatDateValue(getFlexibleValue(selectedRecord, 'fecha_nacimiento', 'nacimiento'))}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <MapPin size={16} className="text-gray-500" />
                    <p className="text-sm font-bold text-white uppercase">{getFlexibleValue(selectedRecord, 'ciudad')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-[#f0b86a]">
                    <Building2 size={18} />
                    <label className="text-[11px] font-black uppercase tracking-widest">Institución y Asesor</label>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-600 uppercase">Entidad / Banco</p>
                    <p className="text-sm font-black text-white uppercase">{getFlexibleValue(selectedRecord, 'institucion', 'entidad')}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-600 uppercase">Asesor a Cargo</p>
                    <p className="text-sm font-black text-[#f0b86a] uppercase">{getFlexibleValue(selectedRecord, 'agente', 'asesor')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-green-500">
                    <Wallet size={18} />
                    <label className="text-[11px] font-black uppercase tracking-widest">Montos y Operación</label>
                  </div>
                  <div className="bg-green-500/5 p-8 rounded-[2.5rem] border border-green-500/10 shadow-lg shadow-green-500/5">
                    <p className="text-[10px] font-black text-green-500/60 uppercase mb-2">Cuota Mensual Proyectada</p>
                    <p className="text-4xl font-black text-green-500 tracking-tighter">{formatCurrency(getFlexibleValue(selectedRecord, 'cuota'))}</p>
                  </div>
                  <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                    <p className="text-[10px] font-black text-gray-600 uppercase mb-2">Total Operación</p>
                    <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(getFlexibleValue(selectedRecord, 'total'))}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-[#f0b86a]">
                    <CalendarDays size={18} />
                    <label className="text-[11px] font-black uppercase tracking-widest">Cronograma de Firma</label>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                      <span className="text-[10px] font-black text-gray-500 uppercase">Fecha Firma</span>
                      <span className="text-xs font-black text-white">{formatDateValue(getFlexibleValue(selectedRecord, 'fecha_firma', 'fecha'))}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                      <span className="text-[10px] font-black text-gray-500 uppercase">Diligencia</span>
                      <span className="text-xs font-black text-white">{formatDateValue(getFlexibleValue(selectedRecord, 'diligencia'))}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-[#f0b86a]/20">
                      <span className="text-[10px] font-black text-[#f0b86a] uppercase">Posible Cobro</span>
                      <span className="text-xs font-black text-white">{formatDateValue(getFlexibleValue(selectedRecord, 'posible_cobro'))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-20 pt-10 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white/5 rounded-3xl">
                <p className="text-[9px] font-black text-gray-600 uppercase mb-3">Estado Documento</p>
                <span className={`px-6 py-2 rounded-full text-[10px] font-black border tracking-[0.2em] ${String(getFlexibleValue(selectedRecord, 'firma')).toUpperCase().includes('SI') ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  FIRMA: {getFlexibleValue(selectedRecord, 'firma')}
                </span>
              </div>
              <div className="text-center p-6 bg-white/5 rounded-3xl">
                <p className="text-[9px] font-black text-gray-600 uppercase mb-3">Empresa</p>
                <div className="flex items-center justify-center gap-3 text-xs font-black text-white uppercase"><Briefcase size={14} className="text-gray-600" /> {getFlexibleValue(selectedRecord, 'empresa')}</div>
              </div>
              <div className="text-center p-6 bg-white/5 rounded-3xl">
                <p className="text-[9px] font-black text-gray-600 uppercase mb-3">Proveedor</p>
                <div className="flex items-center justify-center gap-3 text-xs font-black text-white uppercase"><Tag size={14} className="text-gray-600" /> {getFlexibleValue(selectedRecord, 'proveedor')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Principales */}
      <div className="flex border-b border-white/5 mb-8 overflow-x-auto custom-scrollbar">
        {[
          { id: 'FIRMAS', icon: <FileText size={14} /> },
          { id: 'Cargar Firmas', icon: <Save size={14} /> },
          { id: 'Cobranzas', icon: <Database size={14} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveInternalTab(tab.id)}
            className={`px-12 py-6 text-[11px] font-black uppercase tracking-[0.25em] transition-all relative flex items-center gap-3 whitespace-nowrap ${
              activeInternalTab === tab.id ? 'text-[#f0b86a]' : 'text-gray-500 hover:text-white'
            }`}
          >
            {tab.icon} {tab.id}
            {activeInternalTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#f0b86a] animate-in slide-in-from-left duration-300"></div>}
          </button>
        ))}
      </div>

      <div className="bg-[#0d0d0d] rounded-[2.5rem] border border-white/5 shadow-2xl p-12 relative overflow-hidden">
        {status && (
          <div className={`mb-12 p-6 rounded-2xl flex items-center gap-5 animate-in zoom-in-95 ${status.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest">{status.message}</p>
              {status.detail && <p className="text-[10px] font-medium opacity-60 mt-1">{status.detail}</p>}
            </div>
            <button onClick={() => setStatus(null)} className="opacity-40 hover:opacity-100 transition-opacity"><ArrowRight size={18} /></button>
          </div>
        )}

        {activeInternalTab === 'Cargar Firmas' && (
          <form onSubmit={handleGuardarFirma} className="space-y-12 animate-in fade-in">
             <div className="flex justify-between items-center border-b border-white/5 pb-8">
              <div>
                <h2 className="text-4xl font-black text-[#f0b86a] italic uppercase tracking-tighter leading-none">Nueva Carga</h2>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-2">Mapeo de datos para Columnas A-N</p>
              </div>
              <div className="px-6 py-3 bg-[#f0b86a]/5 border border-[#f0b86a]/10 rounded-2xl flex items-center gap-3">
                 <ShieldCheck size={16} className="text-[#f0b86a]" />
                 <span className="text-[10px] font-black text-[#f0b86a] uppercase tracking-widest">Sincronización Segura</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">C.I / Documento *</label>
                <input type="text" name="ci" value={firmaData.ci} onChange={handleFirmaChange} required className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white focus:border-[#f0b86a]/50 transition-all shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Nombre Cliente *</label>
                <input type="text" name="nombre_cliente" value={firmaData.nombre_cliente} onChange={handleFirmaChange} required className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white focus:border-[#f0b86a]/50 transition-all shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Fecha Nacimiento</label>
                <input type="date" name="fecha_nacimiento" value={firmaData.fecha_nacimiento} onChange={handleFirmaChange} className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white focus:border-[#f0b86a]/50 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Asesor Responsable *</label>
                <select name="agente" value={firmaData.agente} onChange={handleFirmaChange} required className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white appearance-none cursor-pointer">
                  <option value="">Seleccionar...</option>
                  {agentesPredefinidos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Institución *</label>
                <input type="text" name="institucion" value={firmaData.institucion} onChange={handleFirmaChange} required className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white focus:border-[#f0b86a]/50 transition-all shadow-inner" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Ciudad / Localidad *</label>
                <input type="text" name="ciudad" value={firmaData.ciudad} onChange={handleFirmaChange} required className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Fecha de Firma *</label>
                <input type="date" name="fecha_firma" value={firmaData.fecha_firma} onChange={handleFirmaChange} required className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Fecha Diligencia</label>
                <input type="date" name="diligencia" value={firmaData.diligencia} onChange={handleFirmaChange} className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Monto Cuota (Gs)</label>
                <input type="text" name="cuota" value={firmaData.cuota} onChange={handleFirmaChange} placeholder="Gs. 0" className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Monto Total (Gs)</label>
                <input type="text" name="total" value={firmaData.total} onChange={handleFirmaChange} placeholder="Gs. 0" className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Fecha Posible Cobro</label>
                <input type="date" name="posible_cobro" value={firmaData.posible_cobro} onChange={handleFirmaChange} className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Estado de Firma *</label>
                <select name="firma" value={firmaData.firma} onChange={handleFirmaChange} required className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white appearance-none cursor-pointer">
                  <option value="">Seleccionar...</option>
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Empresa Destino</label>
                <select name="empresa" value={firmaData.empresa} onChange={handleFirmaChange} className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white appearance-none cursor-pointer">
                  <option value="">Seleccionar...</option>
                  {empresasPredefinidas.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Proveedor Externo</label>
                <select name="proveedor" value={firmaData.proveedor} onChange={handleFirmaChange} className="w-full bg-[#080808] border border-white/5 rounded-xl py-4 px-5 text-sm text-white appearance-none cursor-pointer">
                  <option value="">Seleccionar...</option>
                  {proveedoresPredefinidos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-6 pt-12 border-t border-white/5">
              <button type="button" onClick={handleLimpiar} className="bg-black border border-white/5 hover:bg-white/5 text-white px-14 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 shadow-xl"><Eraser size={18} /> Limpiar Todo</button>
              <button type="submit" disabled={loading} className="bg-[#f0b86a] hover:bg-[#e0a85a] text-black px-20 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl flex items-center gap-3 disabled:opacity-30 active:scale-95 transition-all">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Guardar en Sheets</>}</button>
            </div>
          </form>
        )}

        {activeInternalTab === 'FIRMAS' && (
          <div className="space-y-10 animate-in fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-black/40 p-10 rounded-[3rem] border border-white/5 shadow-inner">
              <div className="relative w-full md:w-3/4">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-700" size={24} />
                <input 
                  type="text" 
                  placeholder="FILTRAR POR CI, NOMBRE, ASESOR, BANCO O CIUDAD..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-xs font-black text-white uppercase tracking-[0.15em] focus:outline-none focus:border-[#f0b86a] placeholder:text-gray-800 shadow-2xl"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="px-8 py-5 bg-[#f0b86a]/5 rounded-3xl border border-[#f0b86a]/10 text-[11px] font-black text-[#f0b86a] uppercase tracking-widest flex items-center gap-3 shadow-lg">
                  <ListFilter size={16} /> {filteredRecords.length} REGISTROS
                </div>
                <button onClick={() => fetchAllData()} disabled={isSyncing} className="bg-white/5 hover:bg-white/10 text-white p-6 rounded-3xl border border-white/10 transition-all active:scale-90 shadow-2xl"><RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} /></button>
              </div>
            </div>

            <div className="bg-black/20 rounded-[3.5rem] border border-white/5 overflow-hidden min-h-[550px] flex flex-col shadow-inner relative">
              {filteredRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[11px] text-gray-700 uppercase tracking-[0.4em] border-b border-white/5 bg-black/50">
                        <th className="py-10 px-12">CI</th>
                        <th className="py-10">Nombre</th>
                        <th className="py-10">F. Nacimiento</th>
                        <th className="py-10">Institución</th>
                        <th className="py-10">Agente</th>
                        <th className="py-10 px-12 text-right">Posible Cobro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRecords.map((res, i) => (
                        <tr key={i} onClick={() => setSelectedRecord(res)} className="group hover:bg-white/5 transition-all cursor-pointer">
                          <td className="py-10 px-12">
                            <span className="text-sm font-black text-white group-hover:text-[#f0b86a] transition-colors">{getFlexibleValue(res, 'ci', 'c.i', 'documento')}</span>
                          </td>
                          <td className="py-10">
                            <span className="text-base font-black text-white group-hover:tracking-wider transition-all uppercase italic tracking-tighter">{getFlexibleValue(res, 'nombre_cliente', 'nombrecliente', 'cliente')}</span>
                          </td>
                          <td className="py-10">
                             <span className="text-xs font-bold text-gray-400">{formatDateValue(getFlexibleValue(res, 'fecha_nacimiento', 'nacimiento'))}</span>
                          </td>
                          <td className="py-10">
                             <span className="text-[10px] font-black text-gray-700 italic uppercase tracking-widest">{getFlexibleValue(res, 'institucion', 'entidad', 'banco')}</span>
                          </td>
                          <td className="py-10">
                             <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{getFlexibleValue(res, 'agente', 'asesor')}</span>
                          </td>
                          <td className="py-10 px-12 text-right">
                             <div className="flex items-center justify-end gap-3">
                               <span className="text-[11px] font-black text-[#f0b86a] bg-[#f0b86a]/5 px-4 py-2 rounded-xl border border-[#f0b86a]/10 group-hover:bg-[#f0b86a]/10 transition-all">
                                 {formatDateValue(getFlexibleValue(res, 'posible_cobro', 'fecha_posible_cobro'))}
                               </span>
                               <ArrowRight size={16} className="text-gray-700 group-hover:text-white transition-colors" />
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-48 text-center px-16">
                   <div className="w-28 h-28 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/5 mb-10 shadow-inner group overflow-hidden">
                     {isSyncing ? <Loader2 size={48} className="text-gray-800 animate-spin" /> : <TableProperties size={48} className="text-gray-800 group-hover:scale-110 transition-transform" />}
                   </div>
                   <h3 className="text-3xl font-black text-white mb-4 italic uppercase tracking-tighter">{isSyncing ? 'Sincronizando...' : 'Sin Registros Coincidentes'}</h3>
                   <p className="text-[10px] text-gray-600 max-w-sm mx-auto leading-relaxed font-black uppercase tracking-[0.4em]">
                     Verifica que tu script de Google Sheets esté desplegado y que existan datos en el periodo actual.
                   </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeInternalTab === 'Cobranzas' && (
          <div className="py-56 text-center animate-in zoom-in-95">
             <div className="w-36 h-36 bg-white/5 rounded-[3.5rem] border border-white/5 flex items-center justify-center mx-auto mb-12 shadow-2xl relative">
                <div className="absolute inset-0 bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>
                <Database size={64} className="text-gray-800 relative z-10" />
             </div>
             <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">Proyección de Cobros</h2>
             <p className="text-[#f0b86a] text-[11px] font-black uppercase tracking-[0.6em] mt-8 opacity-60">Módulo Analítico en Desarrollo 2026</p>
          </div>
        )}

        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#f0b86a]/10 to-transparent"></div>
      </div>
    </div>
  );
};

export default InterludioPanel;
