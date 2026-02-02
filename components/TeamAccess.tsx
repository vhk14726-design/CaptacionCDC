
import React, { useState } from 'react';
import { UserPlus, Shield, Mail, MoreVertical, Trash2, CheckCircle2 } from 'lucide-react';

const teamMembers = [
  { id: 1, name: 'Tu Jefe', email: 'boss@company.com', role: 'Admin (Full Access)', status: 'Active', avatar: 'https://picsum.photos/40/40?5' },
  { id: 2, name: 'Tú (Propietario)', email: 'me@business.com', role: 'Owner', status: 'Active', avatar: 'https://picsum.photos/40/40?6' },
];

const TeamAccess: React.FC = () => {
  const [email, setEmail] = useState('');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Accesos</h1>
        <p className="text-gray-400 mt-2">Configura quién tiene acceso a tu Meta Business Dashboard 24/7.</p>
      </div>

      {/* Invite Form */}
      <div className="bg-[#181818] border border-white/5 rounded-[2.5rem] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-600/10 text-purple-500 rounded-lg">
            <UserPlus size={20} />
          </div>
          <h2 className="text-xl font-semibold">Invitar Colaborador (Jefe)</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 ml-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                className="w-full bg-[#242424] border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-600/50 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400 ml-1">Rol de Acceso</label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <select className="w-full bg-[#242424] border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-600/50 appearance-none transition-all">
                <option>Administrador (Acceso Total 24/7)</option>
                <option>Editor (Solo Contenido)</option>
                <option>Analista (Solo Estadísticas)</option>
                <option>Finanzas (Solo Facturación)</option>
              </select>
            </div>
          </div>
        </div>
        
        <button className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2">
          Enviar Invitación de Acceso
        </button>
      </div>

      {/* Team List */}
      <div className="bg-[#181818] border border-white/5 rounded-[2.5rem] p-8 overflow-hidden">
        <h3 className="font-semibold text-gray-400 mb-6 uppercase tracking-wider text-xs">Personas con acceso actual</h3>
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between p-4 bg-[#242424]/50 border border-white/5 rounded-2xl group hover:bg-white/5 transition-all">
              <div className="flex items-center gap-4">
                <img src={member.avatar} alt="" className="w-12 h-12 rounded-full border border-white/10" />
                <div>
                  <h4 className="font-bold flex items-center gap-2">
                    {member.name}
                    {member.id === 1 && <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full uppercase">Acceso 24/7</span>}
                  </h4>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="hidden sm:block">
                  <p className="text-xs text-gray-500 mb-1">Rol</p>
                  <p className="text-sm font-medium">{member.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-500 hover:text-white transition-colors">
                    <MoreVertical size={20} />
                  </button>
                  {member.id !== 2 && (
                    <button className="p-2 text-red-500/50 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-purple-600/5 border border-purple-600/20 rounded-3xl p-6 flex items-start gap-4">
        <div className="p-3 bg-purple-600/10 text-purple-500 rounded-xl">
          <Shield size={24} />
        </div>
        <div>
          <h4 className="font-bold text-purple-500">Nota de Seguridad</h4>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">
            Al otorgar acceso de Administrador a tu jefe, él podrá gestionar todos los activos de Meta Business sin restricciones. 
            Asegúrate de configurar la autenticación en dos pasos para ambas cuentas para máxima protección.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeamAccess;
