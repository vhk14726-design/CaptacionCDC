
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface RightPanelProps {
  token?: string;
}

const RightPanel: React.FC<RightPanelProps> = ({ token }) => {
  const [profile, setProfile] = useState({ 
    name: localStorage.getItem('meta_account_name') || 'Cuenta Meta Business', 
    pic: 'https://ui-avatars.com/api/?name=Meta+User&background=6366f1&color=fff', 
    role: 'Gestor Comercial',
    loading: false
  });

  const fetchProfile = async (accessToken: string) => {
    if (!accessToken) return;
    setProfile(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${accessToken}&fields=name,picture.type(large)`);
      const data = await res.json();
      if (data.name) {
        setProfile({
          name: data.name,
          pic: data.picture?.data?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=6366f1&color=fff`,
          role: 'Administrador de Meta Ads',
          loading: false
        });
        localStorage.setItem('meta_account_name', data.name);
        window.dispatchEvent(new Event('meta_data_updated'));
      }
    } catch (e) {
      console.error("RightPanel profile fetch error", e);
      setProfile(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (token) fetchProfile(token);
    
    const handleUpdate = () => {
      const storedName = localStorage.getItem('meta_account_name');
      if (storedName && storedName !== profile.name) {
        setProfile(prev => ({ ...prev, name: storedName }));
      }
    };
    window.addEventListener('meta_data_updated', handleUpdate);
    return () => window.removeEventListener('meta_data_updated', handleUpdate);
  }, [token]);

  return (
    <div className="flex flex-col h-full items-center justify-start pt-12">
      {/* Profile Section */}
      <div className="flex flex-col items-center text-center w-full px-8">
        <div className="relative group">
          <div className="absolute inset-0 bg-purple-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          {profile.loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full z-10 backdrop-blur-sm">
              <Loader2 className="animate-spin text-white" />
            </div>
          )}
          <img 
            src={profile.pic} 
            alt="Profile" 
            className="w-36 h-36 rounded-[3rem] border-4 border-[#1c1c1c] p-1.5 object-cover shadow-2xl relative z-10 transition-transform group-hover:scale-105 duration-500"
          />
          <div className="absolute bottom-3 right-3 w-8 h-8 bg-green-500 border-4 border-[#080808] rounded-2xl z-20 flex items-center justify-center shadow-lg">
             <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <h3 className="text-2xl font-black mt-8 text-white tracking-tight leading-tight">{profile.name}</h3>
        <p className="text-purple-500 text-[10px] font-black mt-2 uppercase tracking-[0.3em]">{profile.role}</p>
        
        <div className="mt-12 w-full p-6 bg-white/5 rounded-[2rem] border border-white/5 text-center italic">
           <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Resumen de Cuenta</p>
           <p className="text-xs text-gray-400 mt-2 leading-relaxed">Panel de control optimizado para visualización de activos de Meta Business Suite.</p>
        </div>
      </div>

      <div className="mt-auto w-full p-8">
        <div className="bg-gradient-to-br from-[#161616] to-transparent p-6 rounded-[2rem] border border-white/5 text-center">
           <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">Health Status</p>
           <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Meta API Gateway Live</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
