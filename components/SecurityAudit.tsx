
import React from 'react';
import { ShieldAlert, Key, Fingerprint, History, Server, CheckCircle2, Lock } from 'lucide-react';

const SecurityAudit: React.FC<{ token: string }> = ({ token }) => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white">Security & Audit Control</h2>
          <p className="text-gray-500 text-sm mt-1">Monitoreo de integridad del sistema y control de acceso maestro.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-green-500/10 border border-green-500/20 px-6 py-4 rounded-[1.5rem] flex items-center gap-4">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <CheckCircle2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Token Integrity</p>
              <p className="text-sm font-black text-green-500 uppercase">Valid Access</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Token Status Card */}
        <div className="xl:col-span-2 bg-[#0d0d0d] p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-purple-600/10 text-purple-500 rounded-xl">
              <Key size={24} />
            </div>
            <h3 className="text-xl font-black text-white">Meta API Token Meta-Data</h3>
          </div>
          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Expiration Date</p>
                <p className="text-sm font-bold text-white tracking-tight">Dec 24, 2025 (Permanent)</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Scope Permissions</p>
                <p className="text-sm font-bold text-purple-400 tracking-tight">ads_read, ads_management, pages_read</p>
              </div>
            </div>
            <div className="p-5 bg-[#161616] rounded-2xl border border-white/5 font-mono text-[10px] text-gray-500 break-all leading-relaxed">
              {token.substring(0, 10)}...[ENCRYPTED_SHA256]...{token.substring(token.length - 10)}
            </div>
            <button className="bg-white text-black font-black py-4 px-10 rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-white/5">
              Rotate Security Token
            </button>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-[#0d0d0d] p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center justify-center space-y-6">
          <div className="w-24 h-24 bg-blue-600/5 rounded-[2rem] border border-blue-500/20 flex items-center justify-center animate-pulse shadow-2xl shadow-blue-600/10">
            <Server size={40} className="text-blue-500" />
          </div>
          <h3 className="text-xl font-black text-white">Cloud Infrastructure</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><span className="w-2 h-2 bg-green-500 rounded-full"></span> n8n Engine: Online</div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><span className="w-2 h-2 bg-green-500 rounded-full"></span> PostgreSQL: Synced</div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Webhooks: Active</div>
          </div>
        </div>
      </div>

      {/* Access Logs */}
      <div className="bg-[#0d0d0d] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/5 text-gray-400 rounded-xl">
              <History size={20} />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">System Audit Log</h3>
          </div>
          <button className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20">
            Download Immutable CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-white/5">
                <th className="py-6 px-10">Timestamp</th>
                <th className="py-6">User / Actor</th>
                <th className="py-6">Action Performed</th>
                <th className="py-6">Module</th>
                <th className="py-6 px-10 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { time: '2025-05-24 14:30:12', user: 'Admin_Boss', action: 'Modified Budget [Sales_Summer]', module: 'Campaigns', status: 'SUCCESS' },
                { time: '2025-05-24 14:15:05', user: 'AI_Gemini_Agent', action: 'Auto-Pause [CPA_Warning]', module: 'Automation', status: 'SUCCESS' },
                { time: '2025-05-24 12:00:00', user: 'System_Cron', action: 'Daily Report Generation', module: 'Reporting', status: 'SUCCESS' },
                { time: '2025-05-24 09:12:44', user: 'Analyst_User', action: 'Download Performance Data', module: 'Analytics', status: 'SUCCESS' },
              ].map((log, i) => (
                <tr key={i} className="hover:bg-white/5 transition-all text-xs font-bold">
                  <td className="py-6 px-10 text-gray-500 font-mono tracking-tighter">{log.time}</td>
                  <td className="py-6 text-white tracking-tight">{log.user}</td>
                  <td className="py-6 text-gray-400 font-medium">{log.action}</td>
                  <td className="py-6 text-purple-400 uppercase tracking-widest text-[9px]">{log.module}</td>
                  <td className="py-6 px-10 text-right">
                    <span className="text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 tracking-widest text-[9px]">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SecurityAudit;
