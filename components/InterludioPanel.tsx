
import React, { useState } from 'react';
import { 
  FileSignature, 
  User, 
  MapPin, 
  Building2, 
  Calendar, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  Trash2,
  ChevronDown
} from 'lucide-react';

const InterludioPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [formData, setFormData] = useState({
    ci: '',
    nombre_cliente: '',
    agente: '',
    institucion: '',
    ciudad: '',
    fecha_firma: '',
    diligencia: '',
    cuota: '',
    total: '',
    posible_cobro: '',
    firma: '',
    honorario: '',
    cese: ''
  });

  const agentesPredefinidos = ['Leidy', 'Javier', 'Ivana', 'Gabriela', 'Nicol', 'Liz'];
  const opcionesFirma = ['SI', 'NO'];
  const opcionesCese = ['PENDIENTE', 'PROCESADO', 'APLICADO'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLimpiar = () => {
    setFormData({
      ci: '',
      nombre_cliente: '',
      agente: '',
      institucion: '',
      ciudad: '',
      fecha_firma: '',
      diligencia: '',
      cuota: '',
      total: '',
      posible_cobro: '',
      firma: '',
      honorario: '',
      cese: ''
    });
    setStatus(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validar campos obligatorios según la imagen (*)
    const obligatorios = ['ci', 'nombre_cliente', 'agente', 'institucion', 'ciudad', 'fecha_firma', 'firma', 'cese'];
    const faltantes = obligatorios.filter(field => !formData[field as keyof typeof formData]);

    if (faltantes.length > 0) {
      setStatus({ type: 'error', message: 'Por favor complete todos los campos obligatorios (*)' });
      return;
    }

    setLoading(true);
    setStatus(null);

    // Simulación de guardado
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus({ type: 'success', message: '¡Firma guardada correctamente!' });
      // Opcional: limpiar después de guardar
      // handleLimpiar();
    } catch (err) {
      setStatus({ type: 'error', message: 'Error al intentar guardar la firma.' });
    } finally {
      setLoading(false);
    }
  };

  const Label = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block ml-1">
      {children} {required && <span className="text-[#f0b86a]">*</span>}
    </label>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      <div className="bg-[#121212] rounded-[2.5rem] border border-white/5 shadow-2xl p-10 relative overflow-hidden">
        {/* Header con el color de la imagen */}
        <div className="mb-10">
          <h2 className="text-2xl font-black text-[#f0b86a] tracking-tight">Cargar Nueva Firma</h2>
          <div className="h-1 w-20 bg-[#f0b86a] mt-2 rounded-full opacity-50"></div>
        </div>

        {status && (
          <div className={`mb-8 p-6 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 ${status.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
            <span className="text-xs font-bold uppercase tracking-widest">{status.message}</span>
          </div>
        )}

        <form onSubmit={handleGuardar} className="space-y-10">
          {/* Fila 1: C.I, Nombre, Agente, Institución, Ciudad */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-1">
              <Label required>C.I</Label>
              <input type="text" name="ci" value={formData.ci} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
            </div>
            <div className="md:col-span-1">
              <Label required>Nombre Cliente</Label>
              <input type="text" name="nombre_cliente" value={formData.nombre_cliente} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
            </div>
            <div className="md:col-span-1">
              <Label required>Agente</Label>
              <div className="relative">
                <select name="agente" value={formData.agente} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all appearance-none font-bold">
                  <option value="">Seleccionar...</option>
                  {agentesPredefinidos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
              </div>
            </div>
            <div className="md:col-span-1">
              <Label required>Institución</Label>
              <input type="text" name="institucion" value={formData.institucion} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
            </div>
            <div className="md:col-span-1">
              <Label required>Ciudad</Label>
              <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
            </div>
          </div>

          {/* Fila 2: Fecha Firma, Diligencia, Cuota, Total, Posible Cobro */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-1">
              <Label required>Fecha de Firma</Label>
              <input type="date" name="fecha_firma" value={formData.fecha_firma} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
            </div>
            <div className="md:col-span-1">
              <Label>Diligencia</Label>
              <input type="date" name="diligencia" value={formData.diligencia} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
            </div>
            <div className="md:col-span-1">
              <Label>Cuota</Label>
              <input type="text" name="cuota" value={formData.cuota} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
            </div>
            <div className="md:col-span-1">
              <Label>Total</Label>
              <input type="text" name="total" value={formData.total} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
            </div>
            <div className="md:col-span-1">
              <Label>Posible Cobro</Label>
              <input type="text" name="posible_cobro" value={formData.posible_cobro} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
            </div>
          </div>

          {/* Fila 3: Firma, Honorario, Cese */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-1">
              <Label required>Firma</Label>
              <div className="relative">
                <select name="firma" value={formData.firma} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all appearance-none font-bold">
                  <option value="">Seleccionar...</option>
                  {opcionesFirma.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
              </div>
            </div>
            <div className="md:col-span-1">
              <Label>Honorario</Label>
              <input type="text" name="honorario" value={formData.honorario} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
            </div>
            <div className="md:col-span-1">
              <Label required>Cese</Label>
              <div className="relative">
                <select name="cese" value={formData.cese} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all appearance-none font-bold">
                  <option value="">Seleccionar...</option>
                  {opcionesCese.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={handleLimpiar}
              className="bg-black border border-white/10 hover:bg-white/5 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Limpiar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-[#f0b86a] hover:bg-[#e0a85a] text-black px-10 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#f0b86a]/10 flex items-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Firma'}
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#f0b86a]/20 to-transparent"></div>
      </div>

      <div className="flex items-center gap-4 bg-purple-500/5 border border-purple-500/10 p-6 rounded-3xl">
        <ShieldCheck size={24} className="text-purple-500/50" />
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed">
          Los registros cargados en este módulo están protegidos y son almacenados en la base de datos maestra de administración estratégica.
        </p>
      </div>
    </div>
  );
};

export default InterludioPanel;
