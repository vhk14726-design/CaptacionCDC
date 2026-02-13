
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.tsx';
import MainDashboard from './components/MainDashboard.tsx';
import CampaignsPanel from './components/CampaignsPanel.tsx';
import ReportsCenter from './components/ReportsCenter.tsx';
import CustomerInsights from './components/CustomerInsights.tsx';
import CargarPanel from './components/CargarPanel.tsx';
import ExcelImportPanel from './components/ExcelImportPanel.tsx';
import InterludioPanel from './components/InterludioPanel.tsx';
import DashboardInterludio from './components/DashboardInterludio.tsx';
import ClientesPanel from './components/ClientesPanel.tsx';
import LoginGate from './components/LoginGate.tsx';
import { ShieldCheck, AlertCircle, Lock, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Informe');
  const [isDarkMode] = useState(true);
  
  // Token hardcodeado solicitado por el usuario
  const FIXED_META_TOKEN = 'EAAZAsu2v6u10BQrUfHJVdylbvSt9q527Uwa1UWvzmNuhHpOQVZC00fxRTKHZBYt31zhomYFYOlAo5voto2poFILo457sgmAU5QZAXwFxAwE3BWCCCybeBqyikjy4CXTu4BEwNlZBse7QNzHa0cgfZCZCuNkcgZCZAZAiIpUNejJ2tq3rDUvjg8Q0RKCv2CRbMJg48biSFE';
  const [metaToken] = useState(FIXED_META_TOKEN);
  
  // Estado de Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);

  useEffect(() => {
    const auth = sessionStorage.getItem('auth_session');
    const role = sessionStorage.getItem('auth_role');
    if (auth === 'true' && role) {
      setIsAuthenticated(true);
      setUserRole(role as 'admin' | 'user');
    }
  }, []);

  const handleLoginSuccess = (role: 'admin' | 'user') => {
    setIsAuthenticated(true);
    setUserRole(role);
    sessionStorage.setItem('auth_session', 'true');
    sessionStorage.setItem('auth_role', role);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setUserRole(null);
    window.location.reload();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Informe':
        return <MainDashboard isDarkMode={isDarkMode} token={metaToken} />;
      case 'Dashboard Captación':
        return <CustomerInsights userRole={userRole} />;
      case 'Dashboard Interludio':
        return <DashboardInterludio />;
      case 'Captación':
        return userRole === 'admin' ? <CargarPanel /> : <MainDashboard isDarkMode={isDarkMode} token={metaToken} />;
      case 'Interludio':
        return userRole === 'admin' ? <InterludioPanel /> : <MainDashboard isDarkMode={isDarkMode} token={metaToken} />;
      case 'Importar':
        return <ExcelImportPanel userRole={userRole} />;
      case 'Campañas':
        return <CampaignsPanel token={metaToken} />;
      case 'Reportes':
        return <ReportsCenter token={metaToken} />;
      case 'Clientes':
        return userRole === 'admin' ? <ClientesPanel /> : <MainDashboard isDarkMode={isDarkMode} token={metaToken} />;
      default:
        return <MainDashboard isDarkMode={isDarkMode} token={metaToken} />;
    }
  };

  if (!isAuthenticated) {
    return <LoginGate onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'dark bg-[#080808] text-white' : 'bg-gray-50 text-gray-900'} font-sans animate-in fade-in duration-1000`}>
      <Sidebar 
        isDarkMode={isDarkMode} 
        toggleDarkMode={() => {}} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        onUnlink={() => {}} 
        userRole={userRole}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-16 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-4">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
              {activeTab}
            </h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3 flex items-center gap-2">
              <ShieldCheck size={14} className={`transition-colors ${userRole === 'admin' ? 'text-purple-500' : 'text-blue-500'}`} /> 
              make by rohit krause <span className="text-gray-700">|</span> 
              <span className={userRole === 'admin' ? 'text-purple-400' : 'text-blue-400'}>
                {userRole === 'admin' ? ' Modo Administrador' : ' Modo Colaborador'}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-[#121212] px-5 py-2.5 rounded-2xl border border-white/5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Meta Engine Online
              </span>
            </div>
          </div>
        </header>

        <div className="max-w-[1600px] mx-auto">
          {renderContent()}
        </div>

        <footer className="mt-24 border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-4 opacity-30 group hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <Lock size={12} /> SSL Encrypted
             </div>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <AlertCircle size={12} /> Compliance Certified
             </div>
          </div>
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            © 2025 make by rohit krause • {userRole?.toUpperCase()} ACCESS
          </p>
        </footer>
      </main>
    </div>
  );
};

export default App;
