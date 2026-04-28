import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  Activity, 
  GitBranch, 
  HelpCircle,
  Terminal
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/**
 * SHARED COMPONENT: FairRankBadge
 */
const FairRankBadge = ({ score }) => {
  const getStyles = (s) => {
    if (s >= 80) return "text-[#4ade80] bg-[#14532d] border-[#166534]";
    if (s >= 50) return "text-[#fbbf24] bg-[#451a03] border-[#78350f]";
    return "text-[#f87171] bg-[#450a0a] border-[#7f1d1d]";
  };

  return (
    <div className={`px-4 py-1 rounded-full border text-[10px] font-label font-bold ${getStyles(score)}`}>
      FAIRRANK: {score}/100
    </div>
  );
};

/**
 * SHARED COMPONENT: FairRankGauge
 */
const FairRankGauge = ({ score }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = (s) => {
    if (s >= 80) return "#4ade80";
    if (s >= 50) return "#fbbf24";
    return "#f87171";
  };

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="96" cy="96" r={radius}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="12"
          fill="transparent"
        />
        <motion.circle
          cx="96" cy="96" r={radius}
          stroke={getColor(score)}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-headline font-800 tracking-tighter">{score}</span>
        <span className="text-[9px] font-label text-[#555]">SCORE</span>
      </div>
    </div>
  );
};

/**
 * SHARED COMPONENT: MetricCard
 */
const MetricCard = ({ label, value, threshold, type = "diff" }) => {
  // Simple logic: for diffs, closer to 0 is better. For DI, closer to 1 is better.
  const isHealthy = type === "di" 
    ? (value >= 0.8 && value <= 1.2) 
    : Math.abs(value) < 0.1;

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-label text-[#888]">{label}</span>
        {isHealthy ? (
          <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-[#f87171]" />
        )}
      </div>
      <div className="text-2xl font-headline font-800 mb-1">
        {typeof value === 'number' ? value.toFixed(3) : value}
      </div>
      <div className="text-[9px] font-label text-[#555]">TARGET: {threshold}</div>
    </div>
  );
};

const CaseAudit = () => {
  const { caseId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "I am Gemini. I have analyzed the weights of this model. Ask me about the bias genealogy or counterfactual impacts." }
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/audit/${caseId}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Audit fetch failed", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [caseId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    try {
      const response = await fetch('http://localhost:8000/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, message: input })
      });
      const reader = response.body.getReader();
      // Simple non-streaming fallback for prototype if needed, 
      // but logic assumes backend sends { response }
      const resData = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: resData.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error communicating with Gemini." }]);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="font-label text-white">
        INITIALIZING AUDIT ENGINE...
      </motion.div>
    </div>
  );

  if (!data) return <div className="p-20 text-white font-label">CASE_NOT_FOUND</div>;

  const chartData = [
    { name: 'DPD', value: data.metrics.demographic_parity_difference, threshold: 0.1 },
    { name: 'EOD', value: data.metrics.equalized_odds_difference, threshold: 0.1 },
    { name: 'DI', value: data.metrics.disparate_impact, threshold: 0.8 },
    { name: 'FPRG', value: data.metrics.false_positive_rate_gap, threshold: 0.1 },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white p-6 md:p-12 font-body">
      {/* Header Bar */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-16 gap-6"
      >
        <div className="flex items-center gap-6">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <span className="font-label text-[10px] text-[#555] block mb-1">AUDIT_REPORT / {data.case_id}</span>
            <h1 className="text-4xl font-headline font-800">{data.name}</h1>
          </div>
        </div>
        <FairRankBadge score={data.fairrank_score} />
      </motion.header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mb-24">
        
        {/* Left Col: Gauge & Metrics */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 space-y-8"
        >
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-12">
            <FairRankGauge score={data.fairrank_score} />
            <div className="flex-1">
              <h2 className="text-xl font-headline font-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#888]" />
                Fairness Equilibrium
              </h2>
              <p className="text-[#888] text-sm leading-relaxed mb-6">
                The FairRank score is an aggregate of demographic parity, odds equilibrium, and disparate impact. 
                Values below 50 indicate systemic algorithmic failure requiring immediate remediation.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="DEMO_PARITY" value={data.metrics.demographic_parity_difference} threshold="<0.1" />
                <MetricCard label="EQU_ODDS" value={data.metrics.equalized_odds_difference} threshold="<0.1" />
                <MetricCard label="DISP_IMPACT" value={data.metrics.disparate_impact} threshold="0.8-1.2" type="di" />
                <MetricCard label="FPR_GAP" value={data.metrics.false_positive_rate_gap} threshold="<0.1" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h3 className="font-label text-[10px] text-[#555] mb-8 uppercase tracking-widest">Metric Distribution vs Safe Thresholds</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Math.abs(entry.value) > entry.threshold && entry.name !== 'DI' ? '#f87171' : '#ffffff'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Counterfactual */}
          <div className="bg-white/5 border border-[#166534]/30 rounded-3xl p-8 border-l-4 border-l-[#4ade80]">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#14532d] rounded-lg">
                <HelpCircle className="w-5 h-5 text-[#4ade80]" />
              </div>
              <div>
                <h3 className="font-label text-[10px] text-[#4ade80] mb-2">COUNTERFACTUAL_ANALYSIS</h3>
                <p className="text-lg font-headline font-800 mb-2 italic">"{data.counterfactual.question}"</p>
                <p className="text-white/70 text-sm leading-relaxed">{data.counterfactual.answer}</p>
                <div className="mt-4 text-[10px] font-label text-[#555]">Impact Magnitude: {data.counterfactual.magnitude}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Col: Genealogy */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 space-y-8"
        >
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-headline font-800 mb-8 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#888]" />
              Bias Genealogy
            </h3>
            <div className="relative border-l border-white/10 ml-2 pl-8 space-y-12">
              {data.bias_genealogy.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[41px] top-0 w-4 h-4 bg-[#080808] border-2 border-white/20 rounded-full" />
                  <span className="font-label text-[10px] text-[#555] block mb-1">{item.stage}</span>
                  <h4 className="text-sm font-bold text-white mb-2">{item.bias}</h4>
                  <p className="text-xs text-[#888] leading-relaxed">{item.impact}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gemini Chat Context (Muted) */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
             <div className="flex items-center gap-2 text-[10px] font-label text-[#555] mb-4">
                <Terminal className="w-3 h-3" />
                SYSTEM_CONTEXT
             </div>
             <p className="text-[11px] leading-relaxed text-[#888] italic">
               {data.gemini_context}
             </p>
          </div>
        </motion.div>
      </main>

      {/* Gemini Chat Floating UI */}
      <section className="max-w-4xl mx-auto fixed bottom-6 left-6 right-6 z-40">
        <div className="glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#4ade80]" />
              <span className="font-label text-[10px] font-bold">GEMINI_AUDIT_ASSISTANT</span>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <div className="w-2 h-2 rounded-full bg-white/10" />
            </div>
          </div>
          
          <div className="h-48 overflow-y-auto p-6 space-y-4 font-body text-sm scrollbar-hide">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.role === 'user' 
                  ? 'bg-white text-black font-bold' 
                  : 'bg-white/5 border border-white/10 text-white'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about model discrepancies..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-body px-2"
            />
            <button type="submit" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default CaseAudit;