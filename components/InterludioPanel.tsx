
import React from 'react';
import { Layers, Sparkles, ShieldCheck, Zap } from 'lucide-react';

const InterludioPanel: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
            <Layers className="text-purple-500" /> Interludio
          </h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Módulo de gestión administrativa exclusiva</p>
        </div>
        
        <div className="px-6 py-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center gap-3">
          <ShieldCheck size={16} className="text-purple-400" />
          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Acceso Nivel 1 - Administrador</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-[#121212] border-2 border-dashed border-white/5 rounded-[3.5rem] p-32 text-center relative overflow-hidden group hover:border-purple-500/20 transition-all">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/5 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-500">
               <Sparkles size={40} className="text-purple-500/50" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Módulo Interludio</h3>
            <p className="text-gray-600 text-sm mt-4 max-w-sm mx-auto leading-relaxed font-medium italic">
              Este espacio está reservado para futuras implementaciones de gestión estratégica. 
              Actualmente se encuentra en fase de diseño técnico.
            </p>
            
            <div className="mt-12 flex items-center gap-3 bg-black/40 px-6 py-2 rounded-full border border-white/5">
              <Zap size={12} className="text-yellow-500 animate-pulse" />
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Desarrollo en curso por Rohit Krause</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterludioPanel;
