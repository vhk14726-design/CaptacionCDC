
import React, { useState } from 'react';
import Sidebar from './components/Sidebar.tsx';
import MainDashboard from './components/MainDashboard.tsx';
import RightPanel from './components/RightPanel.tsx';
import CampaignsPanel from './components/CampaignsPanel.tsx';
import ReportsCenter from './components/ReportsCenter.tsx';
import CustomerInsights from './components/CustomerInsights.tsx';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Informe');
  const [isDarkMode] = useState(true);
  const [metaToken, setMetaToken] = useState(localStorage.getItem('meta_access_token') || '');

  const handleLogout = () => {
    localStorage.removeItem('meta_access_token');
    localStorage.removeItem('meta_account_name');
    setMetaToken('');
    window.location.reload();
  };

  const handleUnlink = () => {
    localStorage.removeItem('meta_access_token');
    localStorage.removeItem('meta_account_name');
    setMetaToken('');
  };

  const handleTokenChange = (newToken: string) => {
    localStorage.setItem('meta_access_token', newToken);
    setMetaToken(newToken);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Informe':
        return <MainDashboard isDarkMode={isDarkMode} token={metaToken} onTokenChange={handleTokenChange} />;
      case 'Clientes':
        return <CustomerInsights />;
      case 'Campañas':
        return <CampaignsPanel token={metaToken} />;
      case 'Reportes':
        return <ReportsCenter token={metaToken} />;
      default:
        return <MainDashboard isDarkMode={isDarkMode} token={metaToken} onTokenChange={handleTokenChange} />;
    }
  };

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'dark bg-[#080808] text-white' : 'bg-gray-50 text-gray-900'} font-sans`}>
      <Sidebar 
        isDarkMode={isDarkMode} 
        toggleDarkMode={() => {}} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        onUnlink={handleUnlink}
      />
      
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white">
              {activeTab}
            </h1>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
              <ShieldCheck size={14} className="text-purple-500" /> CLC Captación Intelligence v2.0
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
              <div className={`w-2 h-2 rounded-full ${metaToken ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {metaToken ? 'Meta API Connected' : 'Meta API Disconnected'}
              </span>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>

        <footer className="mt-20 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 opacity-30 group hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <Lock size={12} /> Secure Tunneling
             </div>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <AlertCircle size={12} /> Data Privacy Compliant
             </div>
          </div>
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            © 2025 CLC Captación • Built for Paraguay Marketing
          </p>
        </footer>
      </main>

      <aside className="w-96 bg-[#0d0d0d] border-l border-white/5 h-screen sticky top-0 hidden xl:block overflow-y-auto">
        <RightPanel token={metaToken} />
      </aside>
    </div>
  );
};

export default App;