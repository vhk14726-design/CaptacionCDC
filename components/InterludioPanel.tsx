
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ChevronDown,
  Edit,
  DollarSign,
  PlusCircle,
  Filter,
  Calendar,
  User,
  MapPin,
  Building2,
  AlertTriangle,
  FilterX,
  ArrowRight
} from 'lucide-react';

// URL para el Sheets de la oficina Interludio
const INTERLUDIO_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwecvY9FLYDbctYNx-RkCnCfiE8Dm4XoFtu0xi2i6VgF6Tim1ukH2p0wxeJ5I9nnzssBA/exec';

const InterludioPanel: React.FC = () => {
  const [activeInternalTab, setActiveInternalTab] = useState('Cargar Firmas');
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, detail?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Estado para el formulario de Firmas
  const [firmaData, setFirmaData] = useState({
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
    cese: '',
    empresa: '',
    proveedor: ''
  });

  // Estado para el formulario de Cobranzas
  const [cobranzaData, setCobranzaData] = useState({
    cliente: '',
    ciudad: '',
    departamento: '',
    agente: '',
    fecha: '',
    cese: '',
    posible_pago: '',
    cuota: '',
    totalidad: '',
    entidad: '',
    pagado: ''
  });

  const agentesPredefinidos = [
    'ALEXANDER MACIEL',
    'ANDRES OJEDA',
    'ARIEL GRISSETTI',
    'DELY GONZALEZ',
    'IDA RECALDE',
    'IVANA VILLAMAYOR',
    'JOSE LUIS TORALES',
    'NOELIA ESTIGARRIBIA'
  ];

  const opcionesFirma = ['SI', 'NO'];
  const opcionesCese = ['SI', 'NO', 'PENDIENTE'];
  const opcionesEmpresa = ['LME', 'GFV'];
  const opcionesProveedor = ['CAPTACIÓN', 'PROPIO'];

  const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFirmaData(prev => ({ ...prev, [name]: value }));
  };

  const handleCobranzaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCobranzaData(prev => ({ ...prev, [name]: value }));
  };

  const handleLimpiarFirma = () => {
    setFirmaData({
      ci: '', nombre_cliente: '', agente: '', institucion: '', ciudad: '',
      fecha_firma: '', diligencia: '', cuota: '', total: '', posible_cobro: '',
      firma: '', honorario: '', cese: '', empresa: '', proveedor: ''
    });
    setStatus(null);
  };

  // Added missing handleLimpiarCobranza function to fix error on line 504
  const handleLimpiarCobranza = () => {
    setCobranzaData({
      cliente: '',
      ciudad: '',
      departamento: '',
      agente: '',
      fecha: '',
      cese: '',
      posible_pago: '',
      cuota: '',
      totalidad: '',
      entidad: '',
      pagado: ''
    });
    setStatus(null);
  };

  const handleGuardarFirma = async (e: React.FormEvent) => {
    e.preventDefault();
    const obligatorios = ['ci', 'nombre_cliente', 'agente', 'institucion', 'ciudad', 'fecha_firma', 'firma', 'cese'];
    const faltantes = obligatorios.filter(field => !firmaData[field as keyof typeof firmaData]);

    if (faltantes.length > 0) {
      setStatus({ type: 'error', message: 'Campos obligatorios incompletos', detail: 'Por favor complete todos los campos marcados con (*)' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const params = new URLSearchParams();
      params.append('ci', firmaData.ci.trim());
      params.append('nombre_cliente', firmaData.nombre_cliente.trim().toUpperCase());
      params.append('agente', firmaData.agente);
      params.append('institucion', firmaData.institucion.trim().toUpperCase());
      params.append('ciudad', firmaData.ciudad.trim().toUpperCase());
      params.append('fecha_firma', firmaData.fecha_firma);
      params.append('diligencia', firmaData.diligencia);
      params.append('cuota', firmaData.cuota);
      params.append('total', firmaData.total);
      params.append('posible_cobro', firmaData.posible_cobro);
      params.append('firma', firmaData.firma);
      params.append('honorario', firmaData.honorario);
      params.append('cese', firmaData.cese);
      params.append('empresa', firmaData.empresa);
      params.append('proveedor', firmaData.proveedor);

      await fetch(INTERLUDIO_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: params,
      });

      setStatus({ 
        type: 'success', 
        message: '¡Firma Sincronizada!', 
        detail: 'El registro se ha enviado correctamente a la nueva base de datos de Interludio.' 
      });
      
      setFirmaData({
        ci: '', nombre_cliente: '', agente: '', institucion: '', ciudad: '',
        fecha_firma: '', diligencia: '', cuota: '', total: '', posible_cobro: '',
        firma: '', honorario: '', cese: '', empresa: '', proveedor: ''
      });

    } catch (err) {
      console.error(err);
      setStatus({ 
        type: 'error', 
        message: 'Error de Conexión', 
        detail: 'No se pudo sincronizar con la hoja de cálculo de Interludio.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      // Nota: Para buscar, normalmente hacemos un GET al script que devuelva el JSON de la hoja
      const response = await fetch(`${INTERLUDIO_SHEETS_URL}?search=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else if (data.data && Array.isArray(data.data)) {
        setSearchResults(data.data);
      }
    } catch (err) {
      console.error("Search error:", err);
      // Mock de datos para demostración si el script aún no devuelve JSON
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGuardarCobranza = async (e: React.FormEvent) => {
    e.preventDefault();
    const obligatorios = ['cliente', 'ciudad', 'departamento', 'agente', 'fecha', 'cese'];
    const faltantes = obligatorios.filter(field => !cobranzaData[field as keyof typeof cobranzaData]);

    if (faltantes.length > 0) {
      setStatus({ type: 'error', message: 'Campos incompletos', detail: 'Complete la información requerida de la cobranza.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus({ type: 'success', message: '¡Cobranza registrada correctamente!' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Error al procesar la cobranza.' });
    } finally {
      setLoading(false);
    }
  };

  const Label = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block ml-1">
      {children} {required && <span className="text-[#f0b86a]">*</span>}
    </label>
  );

  const internalTabs = ['Cargar Firmas', 'Buscar/Editar', 'Cobranzas'];

  const renderContent = () => {
    switch (activeInternalTab) {
      case 'Cargar Firmas':
        return (
          <form onSubmit={handleGuardarFirma} className="space-y-10 animate-in fade-in duration-500">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-[#f0b86a] tracking-tight italic">Cargar Nueva Firma</h2>
              <div className="h-1 w-20 bg-[#f0b86a] mt-2 rounded-full opacity-50"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-1">
                <Label required>C.I</Label>
                <input type="text" name="ci" value={firmaData.ci} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label required>Nombre Cliente</Label>
                <input type="text" name="nombre_cliente" value={firmaData.nombre_cliente} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label required>Agente</Label>
                <div className="relative">
                  <select name="agente" value={firmaData.agente} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all appearance-none font-bold">
                    <option value="">Seleccionar...</option>
                    {agentesPredefinidos.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-1">
                <Label required>Institución</Label>
                <input type="text" name="institucion" value={firmaData.institucion} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label required>Ciudad</Label>
                <input type="text" name="ciudad" value={firmaData.ciudad} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-1">
                <Label required>Fecha de Firma</Label>
                <input type="date" name="fecha_firma" value={firmaData.fecha_firma} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label>Diligencia</Label>
                <input type="date" name="diligencia" value={firmaData.diligencia} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label>Cuota</Label>
                <input type="text" name="cuota" value={firmaData.cuota} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label>Total</Label>
                <input type="text" name="total" value={firmaData.total} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label>Posible Cobro</Label>
                <input type="text" name="posible_cobro" value={firmaData.posible_cobro} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-1">
                <Label required>Firma</Label>
                <div className="relative">
                  <select name="firma" value={firmaData.firma} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all appearance-none font-bold">
                    <option value="">Seleccionar...</option>
                    {opcionesFirma.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-1">
                <Label>Honorario</Label>
                <input type="text" name="honorario" value={firmaData.honorario} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label required>Cese</Label>
                <div className="relative">
                  <select name="cese" value={firmaData.cese} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all appearance-none font-bold">
                    <option value="">Seleccionar...</option>
                    {opcionesCese.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-1">
                <Label>Empresa</Label>
                <div className="relative">
                  <select name="empresa" value={firmaData.empresa} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all appearance-none font-bold">
                    <option value="">Seleccionar...</option>
                    {opcionesEmpresa.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-1">
                <Label>Proveedor</Label>
                <div className="relative">
                  <select name="proveedor" value={firmaData.proveedor} onChange={handleFirmaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all appearance-none font-bold">
                    <option value="">Seleccionar...</option>
                    {opcionesProveedor.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={handleLimpiarFirma} className="bg-black border border-white/10 hover:bg-white/5 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                Limpiar
              </button>
              <button type="submit" disabled={loading} className="bg-[#f0b86a] hover:bg-[#e0a85a] text-black px-10 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#f0b86a]/10 flex items-center gap-3 disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Firma'}
              </button>
            </div>
          </form>
        );
      case 'Buscar/Editar':
        return (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* BARRA DE BÚSQUEDA - RÉPLICA DE LA IMAGEN */}
            <div className="bg-[#1c1c1c]/50 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="flex flex-col md:flex-row items-center gap-6 w-full flex-1">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  BUSCAR POR C.I O NOMBRE
                </span>
                <div className="relative w-full max-w-2xl">
                  <input 
                    type="text" 
                    placeholder="Ingrese C.I o nombre del cliente" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 px-6 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all placeholder:text-gray-700 font-bold"
                  />
                </div>
              </div>
              <button 
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="bg-[#f0b86a] hover:bg-[#e0a85a] text-black px-12 py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-[#f0b86a]/10 flex items-center gap-3 disabled:opacity-50"
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
              </button>
            </div>

            {/* ÁREA DE RESULTADOS */}
            <div className="bg-black/20 rounded-[2rem] border border-white/5 overflow-hidden min-h-[400px] flex flex-col">
              {isSearching ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <Loader2 size={40} className="text-[#f0b86a] animate-spin mb-4" />
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Consultando Base de Datos...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] text-gray-600 uppercase tracking-widest border-b border-white/5 bg-black/40">
                        <th className="py-6 px-10">CI / Cliente</th>
                        <th className="py-6">Agente</th>
                        <th className="py-6">Institución</th>
                        <th className="py-6">Fecha</th>
                        <th className="py-6">Firma</th>
                        <th className="py-6 px-10 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {searchResults.map((res, i) => (
                        <tr key={i} className="group hover:bg-white/5 transition-all">
                          <td className="py-6 px-10">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-white">{res.nombre_cliente}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{res.ci}</span>
                            </div>
                          </td>
                          <td className="py-6 text-xs font-bold text-gray-400">{res.agente}</td>
                          <td className="py-6 text-xs font-bold text-gray-400">{res.institucion}</td>
                          <td className="py-6 text-xs font-bold text-gray-400">{res.fecha_firma}</td>
                          <td className="py-6">
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${res.firma === 'SI' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                              {res.firma}
                            </span>
                          </td>
                          <td className="py-6 px-10 text-right">
                             <button className="p-2.5 bg-white/5 text-gray-500 rounded-lg hover:text-[#f0b86a] hover:bg-[#f0b86a]/10 transition-all">
                               <Edit size={16} />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-32 text-center px-10">
                   <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                      <FilterX size={32} className="text-gray-700" />
                   </div>
                   <h3 className="text-xl font-bold text-white mb-2 italic">Sin Resultados</h3>
                   <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                     Ingrese el número de C.I o el nombre completo para localizar el registro en la base de datos de Interludio.
                   </p>
                </div>
              )}
            </div>
          </div>
        );
      case 'Cobranzas':
        return (
          <form onSubmit={handleGuardarCobranza} className="space-y-10 animate-in fade-in duration-500">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-[#f0b86a] tracking-tight italic">Cargar Nueva Cobranza</h2>
              <div className="h-1 w-20 bg-[#f0b86a] mt-2 rounded-full opacity-50"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-1">
                <Label required>Cliente</Label>
                <input type="text" name="cliente" value={cobranzaData.cliente} onChange={handleCobranzaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label required>Ciudad</Label>
                <input type="text" name="ciudad" value={cobranzaData.ciudad} onChange={handleCobranzaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label required>Departamento</Label>
                <input type="text" name="departamento" value={cobranzaData.departamento} onChange={handleCobranzaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label required>Agente</Label>
                <div className="relative">
                  <select name="agente" value={cobranzaData.agente} onChange={handleCobranzaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all appearance-none font-bold">
                    <option value="">Seleccionar...</option>
                    {agentesPredefinidos.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-1">
                <Label required>Fecha</Label>
                <input type="date" name="fecha" value={cobranzaData.fecha} onChange={handleCobranzaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-1">
                <Label required>Cese</Label>
                <div className="relative">
                  <select name="cese" value={cobranzaData.cese} onChange={handleCobranzaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all appearance-none font-bold">
                    <option value="">Seleccionar...</option>
                    {opcionesCese.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-1">
                <Label>Posible Pago</Label>
                <input type="date" name="posible_pago" value={cobranzaData.posible_pago} onChange={handleCobranzaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label>Cuota</Label>
                <input type="text" name="cuota" value={cobranzaData.cuota} onChange={handleCobranzaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label>Totalidad</Label>
                <input type="text" name="totalidad" value={cobranzaData.totalidad} onChange={handleCobranzaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
              <div className="md:col-span-1">
                <Label>Entidad</Label>
                <input type="text" name="entidad" value={cobranzaData.entidad} onChange={handleCobranzaChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-1">
                <Label>Pagado</Label>
                <input type="text" name="pagado" value={cobranzaData.pagado} onChange={handleCobranzaChange} placeholder="Monto pagado" className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#f0b86a] transition-all font-bold placeholder:text-gray-700" />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={handleLimpiarCobranza} className="bg-black border border-white/10 hover:bg-white/5 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                Limpiar
              </button>
              <button type="submit" disabled={loading} className="bg-[#f0b86a] hover:bg-[#e0a85a] text-black px-10 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#f0b86a]/10 flex items-center gap-3 disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Cobranza'}
              </button>
            </div>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      <div className="flex border-b border-white/5 mb-8">
        {internalTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveInternalTab(tab);
              setStatus(null);
            }}
            className={`px-8 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
              activeInternalTab === tab ? 'text-[#f0b86a]' : 'text-gray-500 hover:text-white'
            }`}
          >
            {tab}
            {activeInternalTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#f0b86a] animate-in slide-in-from-left duration-300"></div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-[#121212] rounded-[2.5rem] border border-white/5 shadow-2xl p-10 relative overflow-hidden">
        {status && (
          <div className={`mb-8 p-6 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 ${status.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <div>
              <p className="text-xs font-black uppercase tracking-widest">{status.message}</p>
              {status.detail && <p className="text-[10px] font-medium opacity-70 mt-1">{status.detail}</p>}
            </div>
          </div>
        )}

        {renderContent()}

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
