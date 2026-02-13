
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Loader2, 
  RefreshCw, 
  User, 
  FilterX,
  ShieldCheck,
  ShieldQuestion,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
  Copy,
  Info,
  Scan,
  Database,
  Fingerprint,
  Zap
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
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('module_clients_unlocked') === 'true');
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ClientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyId, setVerifyId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!isUnlocked) return;
    setLoading(true);
    try {
      const allClients: ClientRecord[] = [];
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
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleVerifyCI = async () => {
    if (!verifyId) return;
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    
    // Simulación de pasos para "que se vea bonito"
    const steps = ["Iniciando protocolos...", "Conectando con GFV Node...", "Buscando hash de identidad...", "Extrayendo metadatos..."];
    
    for (const step of steps) {
        setVerifyStep(step);
        await new Promise(r => setTimeout(r, 600));
    }

    try {
      const r = await fetch("/api/cedula/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: verifyId }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.mensaje || "Identidad no encontrada");
      setVerifyResult(j.result);
    } catch (err: any) {
      setVerifyError(err.message);
    } finally {
      setVerifying(false);
      setVerifyStep("");
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

  useEffect(() => { if (isUnlocked) fetchData(); }, [isUnlocked]);

  const filtered = useMemo(() => {
    return records.filter(r => 
      r.ci.includes(searchTerm) || 
      r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.agente.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
        <div className="bg-[#0d0d0d] border border-white/5 p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="w-20 h-20 bg-purple-600/10 rounded-3xl flex items-center justify-center mx-auto border border-purple-500/20 shadow-2xl animate-bounce">
            <Lock className="text-purple-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Área Restringida</h2>
          <form onSubmit={handleUnlock} className="space-y-6">
            <input 
              type="password"
              autoFocus
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="Contraseña del módulo..."
              className={`w-full bg-black/40 border rounded-2xl py-4 px-6 text-sm text-white text-center focus:outline-none transition-all font-mono tracking-widest ${passError ? 'border-red-500 animate-shake' : 'border-white/10 focus:border-purple-500/40'}`}
            />
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl transition-all">
              Desbloquear Módulo
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Administración de Clientes</h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
            <ShieldCheck size={12} className="text-purple-500" /> Control Centralizado {new Date().getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowVerifyModal(true)} className="bg-purple-600/10 border border-purple-500/20 px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black text-purple-400 uppercase tracking-widest hover:bg-purple-600/20 transition-all shadow-lg shadow-purple-600/5 active:scale-95">
            <ShieldQuestion size={16} /> Verificador Inteligente
          </button>
          <button onClick={fetchData} disabled={loading} className="bg-[#1c1c1c] border border-white/5 px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} Sincronizar Maestro
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
          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{filtered.length} Registros</span>
        </div>
      </div>

      <div className="bg-[#0d0d0d] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/40 text-[11px] font-black text-gray-600 uppercase tracking-[0.2em] border-b border-white/5">
                <th className="py-10 px-12">ORIGEN</th>
                <th className="py-10">CI</th>
                <th className="py-10">NOMBRE</th>
                <th className="py-10">ASESOR</th>
                <th className="py-10 px-12 text-right">GESTIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((client, i) => (
                <tr key={i} className="group hover:bg-white/5 transition-all">
                  <td className="py-10 px-12">
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest ${client.source === 'EXCEL' ? 'text-purple-400 bg-purple-400/10 border-purple-400/20' : 'text-green-400 bg-green-400/10 border-green-400/20'}`}>
                      {client.source}
                    </span>
                  </td>
                  <td className="py-10 font-black text-white">{client.ci}</td>
                  <td className="py-10">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white uppercase italic">{client.nombre}</span>
                      <span className="text-[10px] text-gray-500 font-bold">{client.telefono}</span>
                    </div>
                  </td>
                  <td className="py-10 text-xs font-black text-white italic">{client.agente}</td>
                  <td className="py-10 px-12 text-right">
                    <button onClick={() => { setVerifyId(client.ci); setShowVerifyModal(true); }} className="p-3 bg-white/5 hover:bg-purple-600/20 text-gray-500 hover:text-purple-500 rounded-xl border border-white/5 transition-all">
                      <Scan size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-60 flex flex-col items-center opacity-10"><FilterX size={80} /></div>}
        </div>
      </div>

      {showVerifyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-[#080808] w-full max-w-xl rounded-[3.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-purple-600/10 to-transparent">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20 relative overflow-hidden group">
                       <ShieldCheck className="text-white relative z-10" size={28} />
                       <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                    </div>
                    <div>
                       <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Scanner GFV</h3>
                       <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Protocolo de Identidad Nacional</p>
                    </div>
                 </div>
                 <button onClick={() => { setShowVerifyModal(false); setVerifyResult(null); setVerifyId(""); setVerifyError(null); }} className="w-12 h-12 bg-white/5 hover:bg-red-500/20 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 transition-all">
                    <X size={20} />
                 </button>
              </div>

              <div className="p-10 space-y-10">
                 {!verifying && !verifyResult && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="relative">
                            <Fingerprint className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
                            <input 
                                type="text"
                                value={verifyId}
                                onChange={(e) => setVerifyId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleVerifyCI()}
                                placeholder="Ingresar Cédula..."
                                className="w-full bg-black border border-white/10 rounded-[1.5rem] py-6 pl-16 pr-6 text-2xl font-black text-white uppercase outline-none focus:border-purple-500 transition-all text-center"
                            />
                        </div>
                        <button 
                            onClick={handleVerifyCI}
                            disabled={!verifyId}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-30 shadow-xl shadow-purple-600/20"
                        >
                            Ejecutar Análisis
                        </button>
                        <div className="flex items-center gap-2 justify-center text-[10px] font-black text-gray-700 uppercase tracking-widest">
                            <Info size={12} /> Consultando base de datos gubernamental encriptada
                        </div>
                    </div>
                 )}

                 {verifying && (
                    <div className="py-20 flex flex-col items-center justify-center space-y-10 animate-in zoom-in-95">
                        <div className="relative w-40 h-40">
                            {/* Radar Animation */}
                            <div className="absolute inset-0 border-4 border-purple-500/10 rounded-full"></div>
                            <div className="absolute inset-0 border-t-4 border-purple-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-4 border-2 border-purple-500/20 rounded-full animate-pulse"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Scan size={48} className="text-purple-500 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center space-y-3">
                            <p className="text-xl font-black text-white uppercase italic tracking-tighter animate-pulse">{verifyStep}</p>
                            <div className="flex gap-1 justify-center">
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    </div>
                 )}

                 {verifyError && (
                    <div className="animate-in shake duration-300 space-y-6">
                        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2rem] flex flex-col items-center text-center gap-4">
                            <AlertCircle size={40} className="text-red-500" />
                            <h4 className="text-lg font-black text-white uppercase tracking-tighter">{verifyError}</h4>
                            <p className="text-[10px] font-bold text-gray-500 uppercase leading-relaxed">Verifica el número e intenta nuevamente. Si el error persiste, la sesión GFV podría estar vencida.</p>
                        </div>
                        <button onClick={() => { setVerifyError(null); setVerifyId(""); }} className="w-full bg-white/5 hover:bg-white/10 py-4 rounded-xl text-[10px] font-black uppercase text-white tracking-widest border border-white/10 transition-all">Reintentar</button>
                    </div>
                 )}

                 {verifyResult && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
                       <div className="bg-gradient-to-br from-[#121212] to-black p-10 rounded-[2.5rem] border border-purple-500/30 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-6 opacity-20">
                             <CheckCircle2 size={48} className="text-green-500" />
                          </div>
                          
                          <div className="space-y-10 relative z-10">
                             <div>
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-3">CIUDADANO LOCALIZADO</p>
                                <div className="flex items-center justify-between">
                                   <h4 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
                                      {verifyResult.nombre}
                                   </h4>
                                   <button onClick={() => copyToClipboard(verifyResult.nombre)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                                      <Copy size={16} className="text-purple-400" />
                                   </button>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-8">
                                <div>
                                   <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-2">IDENTIFICACIÓN</p>
                                   <p className="text-2xl font-black text-purple-400 font-mono tracking-tighter">
                                      {parseInt(verifyResult.cedula).toLocaleString()}
                                   </p>
                                </div>
                                <div>
                                   <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-2">SISTEMA ORIGEN</p>
                                   <div className="flex items-center gap-2">
                                       <Zap size={14} className="text-yellow-500" />
                                       <p className="text-lg font-black text-white italic">GFV NODE</p>
                                   </div>
                                </div>
                             </div>
                          </div>

                          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                       </div>
                       
                       <button onClick={() => { setVerifyResult(null); setVerifyId(""); }} className="w-full py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Realizar Nueva Consulta</button>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClientesPanel;
