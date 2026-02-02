
import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  spent: string;
  ctr: string;
  cpc: string;
  roas: string;
  results: string;
  startDate: string;
  endDate: string;
}

const CampaignsPanel: React.FC<{ token: string }> = ({ token }) => {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const formatPYG = (amount: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(amount).replace('PYG', 'Gs.');
  };

  const fetchCampaigns = async () => {
    if (!token) {
      setCampaigns([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?access_token=${token}&fields=id,name`);
      const accountsData = await accountsRes.json();
      
      if (!accountsData.data || accountsData.data.length === 0) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      const accountId = accountsData.data[0].id;
      const campaignsRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/campaigns?access_token=${token}&fields=name,status,start_time,stop_time,insights.date_preset(last_30d){spend,inline_link_click_ctr,cost_per_inline_link_click,reach,impressions,purchase_roas}`);
      const campaignsData = await campaignsRes.json();

      if (campaignsData.data && campaignsData.data.length > 0) {
        const fetchedCampaigns: Campaign[] = campaignsData.data.map((c: any) => {
          const insights = c.insights?.data?.[0];
          return {
            id: c.id,
            name: c.name,
            status: c.status,
            startDate: c.start_time ? new Date(c.start_time).toLocaleDateString() : 'N/A',
            endDate: c.stop_time ? new Date(c.stop_time).toLocaleDateString() : 'En curso',
            spent: formatPYG(parseFloat(insights?.spend || 0)),
            ctr: insights?.inline_link_click_ctr ? `${(parseFloat(insights.inline_link_click_ctr) * 1).toFixed(2)}%` : '0.00%',
            cpc: insights?.cost_per_inline_link_click ? formatPYG(parseFloat(insights.cost_per_inline_link_click)) : 'Gs. 0',
            roas: insights?.purchase_roas ? `${parseFloat(insights.purchase_roas[0].value).toFixed(2)}x` : '0.00x',
            results: insights?.reach ? `${parseInt(insights.reach).toLocaleString()} Alcance` : 'Sin alcance'
          };
        });
        setCampaigns(fetchedCampaigns);
      } else {
        setCampaigns([]);
      }
    } catch (e: any) {
      console.error(e);
      setError('Error de comunicación con Meta Graph API.');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [token]);

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.includes(searchTerm)
  );

  return (
    <div className="space-y-8 flex flex-col min-h-[calc(100vh-180px)] pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Administrador de Campañas</h2>
          <p className="text-gray-500 text-sm mt-1">Monitoreo real de tus anuncios en Paraguay.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchCampaigns} 
            disabled={loading || !token}
            className="bg-[#1c1c1c] hover:bg-white/5 p-4 rounded-2xl border border-white/5 transition-all text-gray-400 flex items-center gap-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} 
            Sincronizar
          </button>
        </div>
      </div>

      <div className="bg-[#0d0d0d] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl flex-1 flex flex-col">
        <div className="p-10 border-b border-white/5">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
            <input 
              type="text" 
              placeholder="Buscar campaña por nombre o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!token}
              className="w-full bg-[#161616] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium disabled:opacity-30" 
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px] flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
               <div className="text-center">
                  <Loader2 className="animate-spin text-purple-500 mx-auto" size={48} />
                  <p className="text-xs text-gray-500 mt-6 font-black uppercase tracking-[0.4em]">Consultando Meta...</p>
               </div>
            </div>
          )}

          {!token ? (
            <div className="py-40 text-center space-y-6 flex-1 flex flex-col justify-center">
               <div className="w-24 h-24 bg-[#161616] rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl">
                 <RefreshCw size={40} className="text-gray-800" />
               </div>
               <h4 className="text-2xl font-black text-white">Vincular API de Meta</h4>
               <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                 Debes configurar tu token de acceso en el Informe principal para listar tus campañas activas.
               </p>
            </div>
          ) : filteredCampaigns.length === 0 && !loading ? (
            <div className="py-40 text-center space-y-6 flex-1 flex flex-col justify-center">
               <div className="w-24 h-24 bg-[#161616] rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl">
                 <AlertTriangle size={40} className="text-gray-800" />
               </div>
               <h4 className="text-2xl font-black text-white">Sin Campañas</h4>
               <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                 No se encontraron resultados para tu búsqueda o no hay campañas en el periodo seleccionado.
               </p>
               {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{error}</p>}
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-600 uppercase tracking-widest border-b border-white/5 bg-[#0f0f0f]/50">
                  <th className="py-8 px-10">Campaña</th>
                  <th className="py-8">Estado</th>
                  <th className="py-8">Fechas</th>
                  <th className="py-8">Gasto (PYG)</th>
                  <th className="py-8 px-10">CTR / CPC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="group hover:bg-white/5 transition-all">
                    <td className="py-8 px-10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-500 border border-purple-500/10 group-hover:scale-110 transition-transform">
                          <TrendingUp size={18} />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block tracking-tight">{campaign.name}</span>
                          <span className="text-[10px] text-gray-600 font-mono">ID: {campaign.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-8">
                      <div className={`flex items-center gap-2 w-fit px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${campaign.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.1)]' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'}`}>
                        {campaign.status}
                      </div>
                    </td>
                    <td className="py-8">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{campaign.startDate}</span>
                        <span className="text-[10px] text-gray-500">al {campaign.endDate}</span>
                      </div>
                    </td>
                    <td className="py-8 text-sm font-black text-white">{campaign.spent}</td>
                    <td className="py-8 px-10">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">{campaign.ctr}</span>
                        <span className="text-[10px] text-gray-600 font-bold mt-1">CPC {campaign.cpc}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignsPanel;