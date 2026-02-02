
import React, { useState } from 'react';
import { 
  PlusCircle, 
  User, 
  Phone, 
  Briefcase, 
  Calendar, 
  UserCheck, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

/**
 * Endpoint de Google Apps Script vinculado a la hoja central.
 */
const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwc6JuLxd3w27SJNFrokuxGdRiFgF8qBN_JA1kpGeFvU1-39clJ1VzRWINmwzEqlFd2/exec';

const CargarPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [formData, setFormData] = useState({
    ci: '',
    contacto: '',
    rubro: '',
    fecha: new Date().toISOString().split('T')[0],
    agente: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.ci || !formData.contacto || !formData.rubro || !formData.fecha || !formData.agente) {
      setStatus({ type: 'error', message: 'Todos los campos son obligatorios.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Normalización de datos
      const payload = {
        ci: formData.ci.trim(),
        contacto: formData.contacto.trim(),
        rubro: formData.rubro.trim().toUpperCase(),
        fecha: formData.fecha,
        agente: formData.agente.trim().toUpperCase()
      };

      // Envío de datos al Web App de Google (Apps Script)
      // Usamos no-cors para evitar problemas de redirección de Google si el script no maneja OPTIONS correctamente
      await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Debido a 'no-cors', no podemos leer la respuesta, pero si no hay error de red, asumimos éxito
      setStatus({ type: 'success', message: 'Cliente cargado correctamente en la base central.' });
      
      // Limpiar formulario
      setFormData({
        ci: '',
        contacto: '',
        rubro: '',
        fecha: new Date().toISOString().split('T')[0],
        agente: ''
      });

    } catch (err) {
      console.error('Error uploading to Sheets:', err);
      setStatus({ type: 'error', message: 'Error al cargar en Google Sheets. Intente nuevamente.' });
    } finally {
      setLoading(false);
      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => {
        setStatus(current => current?.type === 'success' ? null : current);
      }, 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-[#1c1c1c] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-white/5 bg-gradient-to-r from-purple-600/10 to-transparent">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20">
              <PlusCircle size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Carga de Prospectos</h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Base de Datos Centralizada • Administrador</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">CI / Documento</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="text"
                  name="ci"
                  value={formData.ci}
                  onChange={handleChange}
                  placeholder="Ej: 4.123.456"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre / Contacto</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors">
                  <Phone size={18} />
                </div>
                <input 
                  type="text"
                  name="contacto"
                  value={formData.contacto}
                  onChange={handleChange}
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Rubro de Interés</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors">
                  <Briefcase size={18} />
                </div>
                <select 
                  name="rubro"
                  value={formData.rubro}
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-purple-500 transition-all font-medium appearance-none"
                >
                  <option value="">Seleccione rubro...</option>
                  <option value="Inmobiliaria">Inmobiliaria</option>
                  <option value="Automotriz">Automotriz</option>
                  <option value="Seguros">Seguros</option>
                  <option value="Financiero">Financiero</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha de Registro</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors">
                  <Calendar size={18} />
                </div>
                <input 
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Agente Asignado</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors">
                  <UserCheck size={18} />
                </div>
                <input 
                  type="text"
                  name="agente"
                  value={formData.agente}
                  onChange={handleChange}
                  placeholder="Nombre del Agente"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {status && (
            <div className={`flex items-center gap-3 p-5 rounded-2xl border animate-in slide-in-from-top-2 duration-300 ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <span className="text-xs font-black uppercase tracking-widest">{status.message}</span>
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-purple-600/20 flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <PlusCircle size={20} />
                  Guardar en Google Sheets
                </>
              )}
            </button>
          </div>
        </form>

        <div className="p-8 bg-black/20 text-center">
           <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
             * Los datos se normalizarán automáticamente antes de guardarse.
           </p>
        </div>
      </div>
    </div>
  );
};

export default CargarPanel;
