
import React from 'react';
import { 
  Home, 
  Target, 
  BarChart3, 
  LogOut,
  Users,
  PlusCircle,
  FileDown,
  Layers,
  LayoutDashboard,
  Contact
} from 'lucide-react';

interface SidebarProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onUnlink: () => void;
  userRole?: 'admin' | 'user' | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, userRole }) => {
  const isAdmin = userRole === 'admin';

  const menuItems = [
    { name: 'Informe', icon: <Home size={18} />, category: 'Core', show: true },
    { name: 'Dashboard Captación', icon: <Users size={18} />, category: 'Core', show: true },
    { name: 'Dashboard Interludio', icon: <LayoutDashboard size={18} />, category: 'Core', show: true },
    { name: 'Importar', icon: <FileDown size={18} />, category: 'Core', show: true },
    { name: 'Captación', icon: <PlusCircle size={18} />, category: 'Core', show: isAdmin },
    { name: 'Interludio', icon: <Layers size={18} />, category: 'Admin', show: isAdmin },
    { name: 'Campañas', icon: <Target size={18} />, category: 'Ads', show: true },
    { name: 'Reportes', icon: <BarChart3 size={18} />, category: 'Intelligence', show: true },
    { name: 'Clientes', icon: <Contact size={18} />, category: 'Admin', show: isAdmin },
  ];

  const Logo = () => (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center font-sans mb-2">
        <span className="text-[#9333ea] font-black leading-none select-none" style={{ fontSize: '5.5rem', letterSpacing: '-0.05em' }}>C</span>
      </div>
      <div className="flex justify-between w-full px-2">
        {'CAPTACIÓN'.split('').map((char, i) => (
          <span key={i} className="text-[#9333ea] text-[10px] font-black tracking-widest leading-none">
            {char}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <nav className="w-64 bg-[#0d0d0d] flex flex-col h-screen sticky top-0 border-r border-white/5 z-50 shrink-0">
      <div className="p-8 py-12 flex flex-col items-center justify-center border-b border-white/5">
        <Logo />
      </div>

      <div className="flex-1 px-4 py-8 overflow-y-auto space-y-6">
        <div>
          <p className="px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Módulos</p>
          <div className="space-y-1">
            {menuItems.filter(item => item.show).map((item) => (
              <button 
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                  activeTab === item.name 
                    ? 'text-white bg-gradient-to-r from-purple-600/20 to-transparent border-l-4 border-purple-500 shadow-lg' 
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={activeTab === item.name ? 'text-purple-400' : ''}>
                  {item.icon}
                </span>
                <span className="text-sm font-bold tracking-tight">{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Sistema</p>
          <div className="space-y-1">
            <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500/80 hover:text-red-500 hover:bg-red-500/5 transition-all">
              <LogOut size={18} />
              <span className="text-sm font-bold">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/5 bg-[#0a0a0a]">
        <div className={`bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-4 border border-white/5 ${isAdmin ? 'border-purple-500/20' : 'border-blue-500/20'}`}>
           <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Access Status</p>
           <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isAdmin ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
              <p className="text-xs font-bold text-white uppercase">{isAdmin ? 'Admin Mode' : 'User Mode'}</p>
           </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
