
import React, { useState } from 'react';
import { 
  PlusCircle, 
  User, 
  Briefcase, 
  Calendar, 
  UserCheck, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpCircle,
  ShieldCheck,
  Edit3,
  Phone
} from 'lucide-react';

// URL Proporcionada por el usuario (Nueva Implementación)
const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzffCE6i9aLH2Wmo2R64kYBxMhZmENUoJR1pHVYxbeD5OMdA-yIvqxNVGcaaL-B-v31/exec';

const CargarPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, detail?: string } | null>(null);
  const [otroRubro, setOtroRubro] = useState('');
  
  const [formData, setFormData] = useState({
    ci: '',
    telefono: '',
    rubro: '',
    fecha: new Date().toISOString().split('T')[0],
    agente: ''
  });

  const rubrosPredefinidos = [
    'MEC',
    'SALUD',
    'POLICIA',
    'MILITAR',
    'FFAA',
    'IPS',
    'UNA',
    'JUBILADO/A'
  ];

  // Agentes exclusivos de Captación según la imagen proporcionada
  const agentesPredefinidos = [
    'Leidy',
    'Javier',
    'Ivana',
    'Gabriela',
    'Nicol',
    'Liz'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'rubro' && value !== 'OTROS') {
      setOtroRubro('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalRubro = formData.rubro === 'OTROS' ? otroRubro : formData.rubro;

    if (!formData.ci || !formData.telefono || !finalRubro || !formData.fecha || !formData.agente) {
      setStatus({ type: 'error', message: 'Campos incompletos', detail: 'Todos los campos incluyendo el teléfono son obligatorios.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const fullPhone = formData.telefono.trim();
      const params = new URLSearchParams();
      params.append('ci', formData.ci.trim());
      params.append('contacto', `CLIENTE_${formData.ci.trim()} | TEL: ${fullPhone}`);
      params.append('telefono', fullPhone);
      params.append('rubro', finalRubro.trim().toUpperCase());
      params.append('fecha', formData.fecha);
      params.append('agente', formData.agente.trim().toUpperCase());

      await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: params,
      });

      window.dispatchEvent(new CustomEvent('customer_data_updated'));
      
      setStatus({ 
        type: 'success', 
        message: '¡Registro Exitoso!',
        detail: 'Los datos se han sincronizado correctamente con la base de Google Sheets.'
      });
      
      setFormData({
        ci: '',
        telefono: '',
        rubro: '',
        fecha: new Date().toISOString().split('T')[0],
        agente: ''
      });
      setOtroRubro('');

    } catch (err: any) {
      console.error('Upload error:', err);
      setStatus({ 
        type: 'error', 
        message: 'Error de Sincronización',
        detail: 'No se pudo conectar con la base de datos de Google Sheets.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-[#1c1c1c] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-white/5 bg-gradient-to-r from-green-600/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20">
              <PlusCircle size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Captación de Clientes</h2>
              <div className="flex items-center gap-2 mt-1">
                <FileSpreadsheet size={12} className="text-green-500" />
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">Google Sheets Direct Sync v2.5</p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
            <ShieldCheck size={20} className="text-green-500" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Canal de Datos Seguro</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          {status?.type === 'error' && (
            <div className="flex items-center gap-4 p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-red-500 animate-in zoom-in-95">
              <AlertTriangle size={24} />
              <div>
                <p className="text-sm font-black uppercase tracking-widest">{status.message}</p>
                <p className="text-xs font-medium opacity-80 mt-1">{status.detail}</p>
              </div>
            </div>
          )}

          {status?.type === 'success' && (
            <div className="flex items-center gap-4 p-6 bg-green-500/10 border border-green-500/20 rounded-[2rem] text-green-500 animate-in slide-in-from-top-4 shadow-lg shadow-green-500/5">
              <CheckCircle2 size={24} />
              <div>
                <p className="text-sm font-black uppercase tracking-widest">{status.message}</p>
                <p className="text-xs font-medium opacity-80 mt-1">{status.detail}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Documento / CI</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-green-500 transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="text"
                  name="ci"
                  value={formData.ci}
                  onChange={handleChange}
                  placeholder="Ej: 5.123.456"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-green-500 transition-all placeholder:text-gray-700 font-bold"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Número de Teléfono</label>
              <div className="relative group flex">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-green-500 transition-colors z-10">
                  <Phone size={18} />
                </div>
                <input 
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+]/g, ''); 
                    setFormData(prev => ({ ...prev, telefono: val }));
                  }}
                  placeholder="Ej: 0981123456"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-green-500 transition-all placeholder:text-gray-800 font-bold"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Agente Responsable</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-green-500 transition-colors">
                  <UserCheck size={18} />
                </div>
                <select 
                  name="agente"
                  value={formData.agente}
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-10 text-sm text-white focus:outline-none focus:border-green-500 transition-all appearance-none cursor-pointer font-bold"
                >
                  <option value="">Seleccione agente...</option>
                  {agentesPredefinidos.map(agente => (
                    <option key={agente} value={agente}>{agente}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <ArrowUpCircle size={16} className="rotate-180" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Rubro de Interés</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-green-500 transition-colors">
                  <Briefcase size={18} />
                </div>
                <select 
                  name="rubro"
                  value={formData.rubro}
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-10 text-sm text-white focus:outline-none focus:border-green-500 transition-all appearance-none cursor-pointer font-bold"
                >
                  <option value="">Seleccione rubro...</option>
                  {rubrosPredefinidos.map(rubro => (
                    <option key={rubro} value={rubro}>{rubro}</option>
                  ))}
                  <option value="OTROS">OTROS (Ingresar manual)</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <ArrowUpCircle size={16} className="rotate-180" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha del Registro</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-green-500 transition-colors">
                  <Calendar size={18} />
                </div>
                <input 
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-green-500 transition-all cursor-pointer font-bold"
                />
              </div>
            </div>

            {formData.rubro === 'OTROS' && (
              <div className="md:col-span-2 space-y-3 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">Especificar Rubro Manual</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-500">
                    <Edit3 size={18} />
                  </div>
                  <input 
                    type="text"
                    value={otroRubro}
                    onChange={(e) => setOtroRubro(e.target.value)}
                    placeholder="Escriba el rubro aquí..."
                    className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-purple-500 transition-all placeholder:text-gray-700 font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-green-600/20 flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <ArrowUpCircle size={20} className="group-hover:translate-y-[-2px] transition-transform" /> 
                  Sincronizar con Google Sheets
                </>
              )}
            </button>
          </div>
        </form>

        <div className="p-8 bg-black/20 text-center border-t border-white/5">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">
            Base de Datos Centralizada • Registro único por asesor
          </p>
        </div>
      </div>
    </div>
  );
};

export default CargarPanel;
