
import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

interface LoginGateProps {
  onLoginSuccess: (role: 'admin' | 'user') => void;
}

const LoginGate: React.FC<LoginGateProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulamos un pequeño delay para el efecto de "procesamiento"
    setTimeout(() => {
      if (selectedRole === 'admin' && password === 'admin6969') {
        onLoginSuccess('admin');
      } else if (selectedRole === 'user' && password === 'metacdc1') {
        onLoginSuccess('user');
      } else {
        setError('Contraseña incorrecta para el rol seleccionado.');
        setIsLoading(false);
      }
    }, 800);
  };

  const Logo = () => (
    <div className="flex flex-col items-center justify-center mb-12">
      <div className="relative flex items-center justify-center font-sans">
        <span className="text-[#9333ea] font-black leading-none select-none drop-shadow-[0_0_15px_rgba(147,51,234,0.3)]" style={{ fontSize: '6rem', letterSpacing: '-0.05em' }}>C</span>
      </div>
      <div className="flex justify-between w-full max-w-[140px] px-1">
        {'CAPTACIÓN'.split('').map((char, i) => (
          <span key={i} className="text-[#9333ea] text-[10px] font-black tracking-widest leading-none">
            {char}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 animate-in zoom-in-95 duration-700">
        <Logo />

        <div className="bg-[#0d0d0d] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          {!selectedRole ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Portal de Acceso</h2>
                <p className="text-gray-500 text-xs mt-2 font-bold uppercase tracking-widest">Selecciona tu nivel de acceso</p>
              </div>

              <button 
                onClick={() => setSelectedRole('admin')}
                className="w-full flex items-center gap-6 p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-purple-500/30 transition-all group text-left"
              >
                <div className="w-14 h-14 bg-purple-600/10 text-purple-500 rounded-2xl flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <Shield size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Administrador</h3>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Gestión Total del Sistema</p>
                </div>
              </button>

              <button 
                onClick={() => setSelectedRole('user')}
                className="w-full flex items-center gap-6 p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-blue-500/30 transition-all group text-left"
              >
                <div className="w-14 h-14 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <User size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Colaborador</h3>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Visualización de Reportes</p>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <button 
                type="button"
                onClick={() => { setSelectedRole(null); setPassword(''); setError(''); }}
                className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-2 mb-6"
              >
                ← Volver a selección
              </button>

              <div className="text-center mb-8">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border ${selectedRole === 'admin' ? 'bg-purple-600/10 text-purple-500 border-purple-500/20' : 'bg-blue-600/10 text-blue-500 border-blue-500/20'}`}>
                  {selectedRole === 'admin' ? <Shield size={32} /> : <User size={32} />}
                </div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase">
                  Acceso {selectedRole === 'admin' ? 'Administrador' : 'Colaborador'}
                </h2>
                <p className="text-gray-500 text-[10px] mt-1 font-black uppercase tracking-widest">Ingresa la clave de acceso</p>
              </div>

              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500">
                  <Lock size={18} />
                </div>
                <input 
                  autoFocus
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-mono tracking-widest"
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 animate-in shake duration-300">
                  <AlertCircle size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                </div>
              )}

              <button 
                disabled={!password || isLoading}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-30 ${selectedRole === 'admin' ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'}`}
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    Desbloquear Panel
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-8 text-[9px] font-black text-gray-700 uppercase tracking-widest">
          Sistema de Inteligencia • CLC Paraguay v2.0
        </p>
      </div>
    </div>
  );
};

export default LoginGate;
