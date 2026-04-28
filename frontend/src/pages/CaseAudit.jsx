import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, SendHorizontal, AlertCircle, 
  Activity, Users, Scale, Zap, Info 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Cell 
} from 'recharts';

const CaseAudit = () => {
  const { caseId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/audit/${caseId}`);
        if (!response.ok) throw new Error("Failed to fetch audit data");
        const result = await response.json();
        setData(result);
        setMessages([{ role: 'ai', content: `Audit for ${result.name} complete. How can I help you interpret these findings?` }]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [caseId]);

  const handleSendMessage = async (msg = chatInput) => {
    if (!msg.trim()) return;
    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, message: msg, audit_context: null })
      });
      const resData = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: resData.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "Error communicating with Gemini-Bias-Engine." }]);
    }
  };

  const getScoreColor = (score) => {
    if (score < 40) return "#f87171"; // Red
    if (score < 70) return "#fbbf24"; // Amber
    return "#4ade80"; // Green
  };

  if (loading) return <div className="min-h-screen bg-[#080808] flex items-center justify-center font-space text-white tracking-widest uppercase animate-pulse">Initializing Audit Lens...</div>;
  if (error) return <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center text-white p-6">
    <AlertCircle className="text-red-500 mb-4" size={48} />
    <p className="font-manrope text-2xl mb-4">{error}</p>
    <Link to="/" className="text-amber-500 border border-amber-500/30 px-6 py-2 rounded-full uppercase text-xs font-space">Return Home</Link>
  </div>;

  const chartData = [
    { name: 'DPD', value: data.metrics.demographic_parity_difference, threshold: 0.1 },
    { name: 'EOD', value: data.metrics.equalized_odds_difference, threshold: 0.1 },
    { name: 'DI', value: data.metrics.disparate_impact, threshold: 0.8 },
    { name: 'FPRG', value: data.metrics.false_positive_rate_gap, threshold: 0.1 },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Sticky Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-md bg-[#080808]/50 h-16 flex items-center px-6 justify-between">
        <Link to="/" className="flex items-center gap-2 text-[#888] hover:text-white transition-colors">
          <ArrowLeft size={18} />
          <span className="font-space text-xs tracking-widest uppercase">Dashboard</span>
        </Link>
        <div className="font-manrope font-extrabold text-lg">{data.name} Audit Analysis</div>
        <div className="w-24" />
      </nav>

      <main className="pt-24 pb-12 px-6 max-w-[1600px] mx-auto">
        <div className="grid lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Gauge Card */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-6 left-8 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-space text-[10px] tracking-widest text-[#555] uppercase">Real-time Score</span>
              </div>
              
              <div className="relative w-64 h-32 mt-8">
                <svg className="w-full h-full" viewBox="0 0 100 50">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
                  <path 
                    d="M 10 50 A 40 40 0 0 1 90 50" 
                    fill="none" 
                    stroke={getScoreColor(data.fairrank_score)} 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray="125.6"
                    strokeDashoffset={125.6 - (125.6 * data.fairrank_score) / 100}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-end">
                  <span className="font-manrope text-6xl font-extrabold leading-none">{data.fairrank_score}</span>
                  <span className="font-space text-[10px] tracking-[0.3em] text-[#555] uppercase mt-2">FairRank Index</span>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Demographic Parity', val: data.metrics.demographic_parity_difference, icon: <Users size={16}/>, color: data.metrics.demographic_parity_difference > 0.1 ? 'bg-red-500' : 'bg-green-500' },
                { label: 'Equalized Odds', val: data.metrics.equalized_odds_difference, icon: <Scale size={16}/>, color: data.metrics.equalized_odds_difference > 0.1 ? 'bg-red-500' : 'bg-green-500' },
                { label: 'Disparate Impact', val: data.metrics.disparate_impact, icon: <Zap size={16}/>, color: data.metrics.disparate_impact < 0.8 ? 'bg-red-500' : 'bg-green-500' },
                { label: 'FPR Gap', val: data.metrics.false_positive_rate_gap, icon: <Activity size={16}/>, color: data.metrics.false_positive_rate_gap > 0.1 ? 'bg-red-500' : 'bg-green-500' }
              ].map((m, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 group hover:bg-white/[0.05] transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-amber-500">{m.icon}</div>
                    <div className={`w-1.5 h-1.5 rounded-full ${m.color}`} />
                  </div>
                  <p className="font-space text-[9px] tracking-widest text-[#555] uppercase mb-1">{m.label}</p>
                  <p className="font-manrope text-2xl font-bold">{m.val.toFixed(3)}</p>
                </div>
              ))}
            </div>

            {/* Counterfactual */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 relative">
              <div className="absolute left-0 top-6 bottom-6 w-1 bg-green-500/40 rounded-r" />
              <h4 className="font-space text-[10px] tracking-widest text-[#555] uppercase mb-4 flex items-center gap-2">
                <Info size={12}/> Counterfactual Analysis
              </h4>
              <p className="italic text-[#888] text-sm mb-3">"{data.counterfactual.question}"</p>
              <p className="text-white text-sm font-medium">{data.counterfactual.answer}</p>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Chart Area */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 h-[350px]">
              <h4 className="font-space text-[10px] tracking-widest text-[#555] uppercase mb-8">Metric Performance vs. Fairness Thresholds</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#555', fontSize: 10, fontFamily: 'Space Grotesk'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#555', fontSize: 10, fontFamily: 'Space Grotesk'}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{backgroundColor: '#080808', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                  />
                  <ReferenceLine y={0.8} stroke="#4ade80" strokeDasharray="3 3" label={{ position: 'right', value: 'DI Target', fill: '#4ade80', fontSize: 10 }} />
                  <ReferenceLine y={0.1} stroke="#f87171" strokeDasharray="3 3" label={{ position: 'right', value: 'Gap Limit', fill: '#f87171', fontSize: 10 }} />
                  <Bar dataKey="value" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* AI Chat (Mediora Style) */}
            <div className="bg-[#0c0c0c] border border-white/[0.08] rounded-3xl flex flex-col h-[400px] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="font-space text-[10px] tracking-widest uppercase text-[#888]">Gemini-Bias-Engine v1.0</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                      ? 'bg-white text-black font-medium' 
                      : 'bg-white/[0.05] text-[#ccc] border border-white/5'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-4 bg-black/40 border-t border-white/5">
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                  {["Explain the bias", "Who was harmed?", "How to fix this?"].map(chip => (
                    <button 
                      key={chip} onClick={() => handleSendMessage(chip)}
                      className="whitespace-nowrap px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-space tracking-wider uppercase text-[#888] hover:text-white hover:border-white/30 transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about model accountability..."
                    className="w-full bg-white/[0.05] border border-white/10 rounded-full py-4 pl-6 pr-14 text-sm focus:outline-none focus:border-white/30 transition-all"
                  />
                  <button 
                    onClick={() => handleSendMessage()}
                    className="absolute right-2 top-2 p-2.5 bg-white text-black rounded-full hover:scale-105 transition-transform"
                  >
                    <SendHorizontal size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bias Genealogy */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8">
              <h4 className="font-space text-[10px] tracking-widest text-[#555] uppercase mb-8">Bias Genealogy & Origins</h4>
              <div className="space-y-8 relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-white/10" />
                {data.bias_genealogy.map((item, i) => (
                  <div key={i} className="relative pl-8">
                    <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-[#080808] ${item.impact.toLowerCase() === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <p className="font-manrope font-bold text-sm mb-1">{item.stage}</p>
                    <p className="text-[#888] text-sm leading-relaxed">{item.bias}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default CaseAudit;