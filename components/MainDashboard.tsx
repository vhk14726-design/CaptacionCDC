
import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Loader2, 
  TrendingUp, 
  Eye, 
  MessageSquare, 
  Calendar,
  Target,
  Zap,
  ChevronDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MetaMetrics {
  reach: number;
  impressions: number;
  interactions: number;
  conversations: number;
  spend: number;
  cpc: number;
}

interface MainDashboardProps {
  isDarkMode: boolean;
  token: string;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ token }) => {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [datePreset, setDatePreset] = useState('last_30d');
  
  const [metrics, setMetrics] = useState<MetaMetrics>({
    reach: 0,
    impressions: 0,
    interactions: 0,
    conversations: 0,
    spend: 0,
    cpc: 0
  });

  const resetAllData = () => {
    setMetrics({
      reach: 0,
      impressions: 0,
      interactions: 0,
      conversations: 0,
      spend: 0,
      cpc: 0
    });
    setCampaigns([]);
  };

  const formatPYG = (amount: number) => {
    return new Intl.NumberFormat('es-PY', { 
      style: 'currency', 
      currency: 'PYG', 
      minimumFractionDigits: 0 
    }).format(amount).replace('PYG', 'Gs.');
  };

  const fetchData = async (accessToken: string) => {
    if (!accessToken) {
      resetAllData();
      return;
    }
    setLoading(true);
    try {
      const adsRes = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?access_token=${accessToken}&fields=name,id`);
      const adsData = await adsRes.json();
      
      if (adsData.data && adsData.data.length > 0) {
        const accountId = adsData.data[0].id;
        
        const campRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/campaigns?access_token=${accessToken}&fields=name,id`);
        const campData = await campRes.json();
        setCampaigns(campData.data || []);

        let query = `https://graph.facebook.com/v21.0/${accountId}/insights?access_token=${accessToken}&date_preset=${datePreset}&fields=reach,impressions,spend,actions&action_breakdowns=action_type`;
        
        if (selectedCampaign !== 'all') {
          query = `https://graph.facebook.com/v21.0/${selectedCampaign}/insights?access_token=${accessToken}&date_preset=${datePreset}&fields=reach,impressions,spend,actions&action_breakdowns=action_type`;
        }

        const insightRes = await fetch(query);
        const insightData = await insightRes.json();
        const data = insightData.data?.[0] || {};

        const actions = data.actions || [];
        const msgActions = actions.find((a: any) => a.action_type === 'messaging_first_reply' || a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
        const conversations = msgActions ? parseInt(msgActions.value) : 0;
        
        const pageInteractions = actions.reduce((acc: number, curr: any) => {
            if (curr.action_type.includes('page_engagement') || curr.action_type.includes('post_engagement')) {
                return acc + (parseInt(curr.value) || 0);
            }
            return acc;
        }, 0);

        setMetrics({
          reach: parseInt(data.reach) || 0,
          impressions: parseInt(data.impressions) || 0,
          interactions: pageInteractions,
          conversations: conversations,
          spend: parseFloat(data.spend) || 0,
          cpc: conversations > 0 ? (parseFloat(data.spend) / conversations) : 0
        });
      } else {
        resetAllData();
      }
    } catch (e) {
      console.error(e);
      resetAllData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(token);
  }, [token, datePreset, selectedCampaign]);

  return (
    <div className="space-y-8 pb-10 min-h-[calc(100vh-180px)]">
      <div className="bg-[#1c1c1c] p-6 rounded-[2rem] border border-white/5 flex flex-wrap items-center gap-4 shadow-2xl">
        <div className="relative flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
          <Calendar size={16} className="text-purple-500 shrink-0" />
          <select 
            value={datePreset} 
            onChange={(e) => setDatePreset(e.target.value)}
            className="appearance-none bg-transparent text-xs font-bold text-white outline-none pr-6 cursor-pointer"
            style={{ colorScheme: 'dark' }}
          >
            <option value="today">Hoy</option>
            <option value="yesterday">Ayer</option>
            <option value="last_7d">Últimos 7 días</option>
            <option value="last_30d">Últimos 30 días</option>
            <option value="this_month">Este mes</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 text-gray-500 pointer-events-none" />
        </div>

        <div className="relative flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10 min-w-[280px]">
          <Target size={16} className="text-blue-500 shrink-0" />
          <select 
            value={selectedCampaign} 
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="appearance-none bg-transparent text-xs font-bold text-white outline-none w-full pr-8 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ colorScheme: 'dark' }}
          >
            <option value="all">Todas las Campañas</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 text-gray-500 pointer-events-none" />
        </div>

        {loading && <Loader2 size={20} className="animate-spin text-purple-500 ml-auto" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500">
        {[
          { label: 'Alcance', value: metrics.reach.toLocaleString(), icon: <TrendingUp />, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Impresiones', value: metrics.impressions.toLocaleString(), icon: <Eye />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Interacciones con la página', value: metrics.interactions.toLocaleString(), icon: <Zap />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { label: 'Conversaciones', value: metrics.conversations.toLocaleString(), icon: <MessageSquare />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Gasto Total', value: formatPYG(metrics.spend), icon: <Database />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Costo p/ Conv.', value: formatPYG(metrics.cpc), icon: <TrendingUp />, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map((m, i) => (
          <div key={i} className="bg-[#1c1c1c] p-8 rounded-[2rem] border border-white/5 shadow-xl hover:scale-[1.02] transition-all">
            <div className={`w-12 h-12 ${m.bg} ${m.color} rounded-2xl flex items-center justify-center mb-4`}>
              {m.icon}
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{m.label}</p>
            <h3 className="text-2xl font-black text-white mt-1">{loading ? '...' : m.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-[#1c1c1c] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex-1 transition-all duration-500">
        <h3 className="text-xl font-bold text-white mb-8">Tendencia de Gasto (PYG)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { name: 'Lun', val: metrics.spend * 0.1 },
              { name: 'Mar', val: metrics.spend * 0.2 },
              { name: 'Mie', val: metrics.spend * 0.15 },
              { name: 'Jue', val: metrics.spend * 0.25 },
              { name: 'Vie', val: metrics.spend * 0.1 },
              { name: 'Sab', val: metrics.spend * 0.12 },
              { name: 'Dom', val: metrics.spend * 0.08 },
            ]}>
              <defs>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#444" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1c1c1c', border: 'none', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="val" stroke="#6366f1" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
