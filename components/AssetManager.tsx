
import React, { useState } from 'react';
import { Layers, Globe, Instagram, Code, Database, CheckCircle2, AlertCircle, Plus } from 'lucide-react';

const AssetManager: React.FC<{ token: string }> = ({ token }) => {
  const assets = [
    { name: 'Main Pixel (Global)', id: '8273615243', type: 'Pixel', status: 'Healthy', icon: <Code size={20} />, color: 'text-green-400' },
    { name: 'Shopify Catalog V2', id: '9928374152', type: 'Catalog', status: 'Warning', icon: <Database size={20} />, color: 'text-yellow-400' },
    { name: '@brand_official_ig', id: 'inst_882736', type: 'Instagram', status: 'Healthy', icon: <Instagram size={20} />, color: 'text-pink-400' },
    { name: 'business-domain.com', id: 'dom_112233', type: 'Domain', status: 'Verified', icon: <Globe size={20} />, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Global Asset Hub</h2>
          <p className="text-gray-500 text-sm mt-1">Conecta y monitorea tus fuentes de datos y dominios.</p>
        </div>
        <button className="bg-white text-black font-black py-4 px-8 rounded-2xl flex items-center gap-3 text-sm hover:scale-[1.02] transition-all">
          <Plus size={18} /> Add New Asset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assets.map((asset, i) => (
          <div key={i} className="bg-[#0d0d0d] p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all shadow-xl">
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center ${asset.color} group-hover:bg-white/10 transition-all`}>
                {asset.icon}
              </div>
              <div>
                <h4 className="text-lg font-black text-white group-hover:text-purple-400 transition-colors">{asset.name}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{asset.type}</span>
                  <span className="text-[10px] font-mono text-gray-500 tracking-tighter">ID: {asset.id}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${asset.status === 'Healthy' || asset.status === 'Verified' ? 'text-green-500' : 'text-yellow-500'}`}>
                {asset.status === 'Healthy' || asset.status === 'Verified' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {asset.status}
              </div>
              <button className="text-xs font-bold text-gray-600 mt-3 hover:text-white transition-colors">Config →</button>
            </div>
          </div>
        ))}
      </div>

      {/* Domain Verification Guide */}
      <div className="bg-[#161616] p-10 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1 space-y-4">
          <h3 className="text-xl font-black text-white">Aggregated Event Measurement</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Para cumplir con iOS 14.5+, debes verificar tus dominios y configurar hasta 8 eventos de conversión prioritarios. 
            Nuestro asistente de IA puede ayudarte a mapear los eventos basados en tu ROI histórico.
          </p>
          <div className="flex gap-4">
            <button className="bg-white/5 text-white font-bold py-3 px-6 rounded-xl text-xs border border-white/10 hover:bg-white/10 transition-all">
              Tutorial Config
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-xs shadow-lg shadow-blue-600/20 transition-all">
              Verify with Gemini
            </button>
          </div>
        </div>
        <div className="w-full md:w-64 aspect-square bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-[2rem] border border-white/10 flex items-center justify-center">
          <Globe size={80} className="text-blue-400 opacity-50" />
        </div>
      </div>
    </div>
  );
};

export default AssetManager;
