"use client";

import { useState } from "react";
import { ShieldCheck, Search, Loader2, User, AlertCircle, ArrowRight } from "lucide-react";

export default function CedulaPage() {
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    if (!cedula) return;
    setLoading(true);
    setError(null);
    setResp(null);

    try {
      const r = await fetch("/api/cedula/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula }),
      });

      const j = await r.json().catch(() => ({}));
      
      if (!r.ok || !j.ok) {
        throw new Error(j?.mensaje || `Error verificando (HTTP ${r.status})`);
      }
      
      setResp(j.result);
    } catch (e: any) {
      setError(e.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans flex items-center justify-center">
      <div className="max-w-2xl w-full bg-[#0d0d0d] rounded-[3rem] border border-white/5 shadow-2xl p-10 md:p-16 space-y-10">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-purple-600/10 rounded-3xl flex items-center justify-center mx-auto border border-purple-500/20 shadow-2xl">
            <ShieldCheck className="text-purple-500" size={40} />
          </div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter">Verificador GFV</h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Consulta de Identidad Server-Side (20s)</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Número de Cédula</label>
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-purple-500 transition-colors" size={20} />
              <input
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej: 1234567"
                inputMode="numeric"
                className="w-full bg-black/40 border border-white/5 rounded-2xl py-6 pl-16 pr-6 text-sm font-black text-white uppercase outline-none focus:border-purple-500/40 transition-all"
              />
            </div>
          </div>

          <button
            onClick={buscar}
            disabled={loading || !cedula}
            className="w-full bg-white text-black py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-30 group"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Ingresar Sistema <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-4 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-500 animate-in zoom-in-95">
            <AlertCircle size={24} />
            <p className="text-xs font-black uppercase tracking-widest">{error}</p>
          </div>
        )}

        {resp && (
          <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
               <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resultado de Consulta</h4>
               <span className="text-[9px] font-black bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20">STATUS: {String(resp.status)}</span>
            </div>
            <div className="bg-black/60 rounded-3xl border border-white/5 p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
               <pre className="text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto custom-scrollbar">
                {JSON.stringify(resp, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="text-center pt-4">
           <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">CLC Paraguay Security Bridge v1.0</p>
        </div>
      </div>
    </div>
  );
}