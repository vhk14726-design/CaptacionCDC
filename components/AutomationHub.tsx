
import React, { useState } from 'react';
import { Zap, PlayCircle, Settings2, Trash2, Plus, Clock, ShieldCheck } from 'lucide-react';

const AutomationHub: React.FC<{ token: string }> = ({ token }) => {
  const [rules, setRules] = useState([
    { id: 1, name: 'CPA Protector (Hard Stop)', condition: 'CPA > $25', action: 'Pause Campaign', status: true },
    { id: 2, name: 'Scaling Profits (Auto-Bump)', condition: 'ROAS > 5x', action: 'Increase Budget 20%', status: true },
    { id: 3, name: 'Night Watch (Reduce Gasto)', condition: 'Hora > 22:00', action: 'Lower Bid 15%', status: false },
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Automation Engine</h2>
          <p className="text-gray-500 text-sm mt-1">Configura centinelas que cuiden tu inversión 24/7 sin intervención humana.</p>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 text-white font-black py-4 px-8 rounded-2xl flex items-center gap-3 text-sm shadow-xl shadow-purple-600/20 transition-all">
          <Plus size={18} /> New AI Rule
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-[#0d0d0d] p-8 rounded-[2rem] border border-white/5 flex flex-wrap items-center justify-between group hover:border-purple-500/30 transition-all">
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${rule.status ? 'bg-purple-600/20 text-purple-400 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-white/5 text-gray-600'}`}>
                <Zap size={24} fill={rule.status ? 'currentColor' : 'none'} />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">{rule.name}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">IF: {rule.condition}</span>
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest bg-purple-500/5 px-3 py-1 rounded-full border border-purple-500/10">THEN: {rule.action}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Rule Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={rule.status} className="sr-only peer" onChange={() => {}} />
                  <div className="w-12 h-6 bg-[#161616] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white"></div>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 bg-white/5 text-gray-500 rounded-xl hover:bg-white/10 hover:text-white transition-all"><Settings2 size={18} /></button>
                <button className="p-3 bg-red-500/5 text-red-500/50 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] p-8 rounded-[2.5rem] border border-white/5">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
            <Clock size={20} className="text-purple-500" /> Recent Action Logs
          </h3>
          <div className="space-y-4">
            {[
              { time: '10:45 AM', event: 'Rule [CPA Protector] Triggered', detail: 'Paused Campaign 92837' },
              { time: '09:20 AM', event: 'Budget Adjusted by AI', detail: '+15% Daily Spend on Sales_Summer' },
              { time: '02:00 AM', event: 'Night Watch Active', detail: 'Bid caps applied across 4 accounts' },
            ].map((log, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                <span className="text-[10px] font-black text-gray-500 whitespace-nowrap">{log.time}</span>
                <div>
                  <p className="text-xs font-bold text-white tracking-tight">{log.event}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{log.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0d0d0d] p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-center text-center space-y-6 relative overflow-hidden">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>
           <ShieldCheck size={64} className="text-blue-500/30 mx-auto" />
           <h3 className="text-2xl font-black text-white">Fail-Safe Protocol</h3>
           <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
             Nuestro sistema de automatización verifica el estado de Meta cada 5 minutos. Si hay una caída de API, las reglas se suspenden para evitar errores de gasto.
           </p>
           <button className="text-xs font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors">Ver Política de Seguridad →</button>
        </div>
      </div>
    </div>
  );
};

export default AutomationHub;
