import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Loader2, 
  RefreshCw, 
  User, 
  Trash2, 
  Edit3, 
  MoreVertical, 
  FilterX,
  ShieldCheck,
  Phone,
  ArrowRight,
  ExternalLink,
  ShieldQuestion,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../supabase.ts';

const GOOGLE_SHEETS_CAPTACION = 'https://script.google.com/macros/s/AKfycbzffCE6i9aLH2Wmo2R64kYBxMhZmENUoJR1pHVYxbeD5OMdA-yIvqxNVGcaaL-B-v31/exec';

interface ClientRecord {
  ci: string;
  nombre: string;
  telefono: string;
  rubro: string;
  fecha: string;
  agente: string;
  source: 'CAPTACIÓN' | 'EXCEL' | 'INTERLUDIO';
}

const ClientesPanel: React.FC = () => {
  // Estado de acceso al módulo
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('module_clients_unlocked') === 'true');
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ClientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el Verificador de Cédula
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyId, setVerifyId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!isUnlocked) return;
    setLoading(true);
    try {
      const allClients: ClientRecord[] = [];

      // 1. Fetch de Captación (Google Sheets)
      const resSheet = await fetch(`${GOOGLE_SHEETS_CAPTACION}?t=${Date.now()}`);
      if (resSheet.ok) {
        const json = await resSheet.json();
        const data = Array.isArray(json) ? json : (json.data || []);
        data.forEach((item: any) => {
          if (item.ci && String(item.ci).toLowerCase() !== 'ci') {
            allClients.push({
              ci: String(item.ci),
              nombre: String(item.contacto || `CLIENTE_${item.ci}`).split('|')[0].trim(),
              telefono: String(item.telefono || 'N/A'),
              rubro: String(item.rubro).toUpperCase(),
              fecha: String(item.fecha),
              agente: String(item.agente).toUpperCase(),
              source: 'CAPTACIÓN'
            });
          }
        });
      }

      // 2. Fetch de Excel (Supabase)
      if (supabase) {
        const { data: dbItems } = await supabase.from('prospectos').select('*');
        dbItems?.forEach((item: any) => {
          allClients.push({
            ci: item.ci,
            nombre: item.contacto,
            telefono: item.telefono || 'N/A',
            rubro: item.rubro.toUpperCase(),
            fecha: item.fecha,
            agente: item.agente.toUpperCase(),
            source: 'EXCEL'
          });
        });
      }

      setRecords(allClients.sort((a, b) => b.fecha.localeCompare(a.fecha)));
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCI = async () => {
    if (!verifyId) return;
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const r = await fetch("/api/cedula/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: verifyId }),
      });
      
      const j = await r.json().catch(() => ({}));
      
      if (!r.ok || !j.ok) {
        throw new Error(j?.mensaje || `Error verificando (HTTP ${r.status})`);
      }
      
      setVerifyResult(j.result);
    } catch (err: any) {
      setVerifyError(err.message || "Error inesperado");
    } finally {
      setVerifying(false);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === 'rohitk123') {
      setIsUnlocked(true);
      sessionStorage.setItem('module_clients_unlocked', 'true');
    } else {
      setPassError(true);
      setPassInput('');
      setTimeout(() => setPassError(false), 2000);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchData();
    }
  }, [isUnlocked]);

  const filtered = useMemo(() => {
    return records.filter(r => 
      r.ci.includes(searchTerm) || 
      r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.agente.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  // Si no está desbloqueado, mostrar pantalla de bloqueo
  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
        <div className="bg-[#0d0d0d] border border-white/5 p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-600/10 transition-colors"></div>
          
          <div className="w-20 h-20 bg-purple-600/10 rounded-3xl flex items-center justify-center mx-auto border border-purple-500/20 shadow-2xl animate-bounce">
            <Lock className="text-purple-500" size={32} />
          </div>
          
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Área Restringida</h2>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Introduce la clave del módulo</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="relative group">
              <ShieldAlert className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${passError ? 'text-red-500' : 'text-gray-600 group-focus-within:text-purple-500'}`} size={18} />
              <input 
                type="password"
                autoFocus
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder="Contraseña del módulo..."
                className={`w-full bg-black/40 border rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none transition-all font-mono tracking-widest ${passError ? 'border-red-500 animate-shake' : 'border-white/10 focus:border-purple-500/40'}`}
              />
            </div>

            {passError && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest animate-pulse">Clave incorrecta</p>}

            <button 
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-purple-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              Desbloquear Módulo <ArrowRight size={16} />
            </button>
          </form>
          
          <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Nivel de Seguridad: Master Admin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Administración de Clientes</h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2 mt-2">
            <ShieldCheck size={12} className="text-purple-500" /> Control Centralizado de Registros
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowVerifyModal(true)}
            className="bg-purple-600/10 border border-purple-500/20 px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black text-purple-400 uppercase tracking-widest hover:bg-purple-600/20 transition-all active:scale-95"
          >
            <ShieldQuestion size={16} />
            Verificador GFV
          </button>
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="bg-[#1c1c1c] border border-white/5 px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Sincronizar Maestro
          </button>
        </div>
      </div>

      <div className="bg-[#0d0d0d] p-8 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700" size={20} />
          <input 
            type="text" 
            placeholder="BUSCAR POR CI, NOMBRE O ASESOR..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl py-6 pl-14 pr-6 text-xs font-black text-white uppercase tracking-widest outline-none focus:border-purple-500/40"
          />
        </div>
        <div className="px-8 py-4 bg-purple-600/10 border border-purple-500/20 rounded-2xl">
          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{filtered.length} Clientes Encontrados</span>
        </div>
      </div>

      <div className="bg-[#0d0d0d] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/40 text-[11px] font-black text-gray-600 uppercase tracking-[0.2em] border-b border-white/5">
                <th className="py-10 px-12">ORIGEN</th>
                <th className="py-10">IDENTIFICACIÓN</th>
                <th className="py-10">CONTACTO / NOMBRE</th>
                <th className="py-10">RUBRO / SECTOR</th>
                <th className="py-10">ASESOR ASIGNADO</th>
                <th className="py-10 px-12 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((client, i) => (
                <tr key={i} className="group hover:bg-white/5 transition-all">
                  <td className="py-10 px-12">
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest ${
                      client.source === 'EXCEL' ? 'text-purple-400 bg-purple-400/10 border-purple-400/20' : 
                      client.source === 'CAPTACIÓN' ? 'text-green-400 bg-green-400/10 border-green-400/20' : 
                      'text-blue-400 bg-blue-400/10 border-blue-400/20'
                    }`}>
                      {client.source}
                    </span>
                  </td>
                  <td className="py-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500">
                        <User size={18} />
                      </div>
                      <span className="text-lg font-black text-white">{client.ci}</span>
                    </div>
                  </td>
                  <td className="py-10">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white uppercase italic">{client.nombre}</span>
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-bold mt-1">
                        <Phone size={12} className="text-green-500" /> {client.telefono}
                      </div>
                    </div>
                  </td>
                  <td className="py-10 text-[10px] font-black text-gray-400 uppercase tracking-widest">{client.rubro}</td>
                  <td className="py-10">
                    <span className="text-xs font-black text-white bg-white/5 px-4 py-2 rounded-xl border border-white/5">{client.agente}</span>
                  </td>
                  <td className="py-10 px-12 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-3 bg-white/5 hover:bg-purple-600/20 hover:text-purple-400 text-gray-500 rounded-xl border border-white/5 transition-all">
                        <Edit3 size={18} />
                      </button>
                      <button className="p-3 bg-white/5 hover:bg-red-600/20 hover:text-red-400 text-gray-500 rounded-xl border border-white/5 transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="py-60 flex flex-col items-center justify-center text-gray-700">
              <FilterX size={80} className="opacity-10" />
              <p className="text-xl font-black uppercase tracking-widest mt-6">Sin resultados en la búsqueda</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DEL VERIFICADOR GFV */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-[#0d0d0d] w-full max-w-xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-purple-600/5">
                 <div className="flex items-center gap-4">
                    <ShieldCheck className="text-purple-500" size={24} />
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Verificador de Identidad</h3>
                 </div>
                 <button onClick={() => { setShowVerifyModal(false); setVerifyResult(null); setVerifyId(""); setVerifyError(null); }} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-500 transition-all border border-white/5">
                    <X size={18} />
                 </button>
              </div>

              <div className="p-10 space-y-8">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">NÚMERO DE CÉDULA A CONSULTAR</label>
                    <div className="relative group">
                       <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-purple-500 transition-colors" size={20} />
                       <input 
                         autoFocus
                         type="text"
                         value={verifyId}
                         onChange={(e) => setVerifyId(e.target.value)}
                         placeholder="Ej: 4567890"
                         className="w-full bg-black/40 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-sm font-black text-white uppercase outline-none focus:border-purple-500/40"
                       />
                    </div>
                 </div>

                 <button 
                   onClick={handleVerifyCI}
                   disabled={verifying || !verifyId}
                   className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-purple-600/20 flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-30"
                 >
                   {verifying ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={18} /> Verificar Identidad</>}
                 </button>

                 {verifyError && (
                    <div className="flex items-center gap-4 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 animate-in shake duration-300">
                       <AlertCircle size={20} />
                       <p className="text-[10px] font-black uppercase tracking-widest">{verifyError}</p>
                    </div>
                 )}

                 {verifyResult && (
                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                       <div className="flex items-center gap-3 text-green-500 border-b border-white/5 pb-2">
                          <CheckCircle2 size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Resultado: {verifyResult.status ? 'EXITOSO' : 'SIN DESTINO'}</span>
                       </div>
                       <div className="bg-black/60 rounded-3xl border border-white/5 p-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                          <pre className="text-[10px] font-mono text-gray-400 leading-relaxed break-all">
                             {JSON.stringify(verifyResult, null, 2)}
                          </pre>
                       </div>
                    </div>
                 )}
              </div>
              
              <div className="p-6 bg-black/40 text-center border-t border-white/5">
                 <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest italic">Encrypted Server-Side Request Logic (20s Timeout)</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClientesPanel;