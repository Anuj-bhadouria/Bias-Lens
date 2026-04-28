import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, FileText, Play, CheckCircle, XCircle, ChevronRight } from 'lucide-react';

function BiasNetwork() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const N = 50;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: 2 + Math.random() * 3,
      color: Math.random() < 0.7 ? 'rgba(248,113,113,0.6)' : Math.random() < 0.67 ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.3)',
    }));
    let pulses = [];
    const pi = setInterval(() => {
      const a = Math.floor(Math.random() * N);
      let b = Math.floor(Math.random() * N);
      while (b === a) b = Math.floor(Math.random() * N);
      pulses.push({ a, b, t: 0, color: nodes[a].color });
    }, 3000);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 180) {
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = nodes[i].color.replace(/[\d.]+\)$/, '0.12)'); ctx.lineWidth = 1; ctx.stroke();
        }
      }
      pulses = pulses.filter(p => p.t <= 1);
      pulses.forEach(p => {
        p.t += 0.012;
        const x = nodes[p.a].x + (nodes[p.b].x - nodes[p.a].x) * p.t;
        const y = nodes[p.a].y + (nodes[p.b].y - nodes[p.a].y) * p.t;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, '1)'); ctx.fill();
      });
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); clearInterval(pi); window.removeEventListener('resize', resize); };
  }, []);
  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 65% 55% at 50% 50%, transparent 20%, #080808 90%)', zIndex: 1, pointerEvents: 'none' }} />
    </>
  );
}

function Steps({ current }) {
  const steps = ['Upload CSV', 'Running Audit', 'Debiased Results'];
  return (
    <div className="flex items-center justify-center gap-0 mb-12">
      {steps.map((label, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-['Space_Grotesk'] font-bold border transition-all
                ${done ? 'bg-amber-400 border-amber-400 text-black' : active ? 'bg-white/[0.08] border-amber-400 text-amber-400' : 'bg-white/[0.03] border-white/10 text-[#444]'}`}>
                {done ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`text-xs font-['Space_Grotesk'] uppercase tracking-widest transition-colors ${active ? 'text-white' : done ? 'text-amber-400' : 'text-[#444]'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={`w-20 h-px mx-3 mb-5 transition-all duration-500 ${done ? 'bg-amber-400' : 'bg-white/10'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function FairRankGauge({ score }) {
  const color = score >= 80 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171';
  const bgColor = score >= 80 ? '#14532d' : score >= 50 ? '#451a03' : '#450a0a';
  const borderColor = score >= 80 ? '#166534' : score >= 50 ? '#78350f' : '#7f1d1d';
  const label = score >= 80 ? 'FAIR' : score >= 50 ? 'MODERATE BIAS' : 'HIGH BIAS';
  const half = Math.PI * 72;
  const offset = half - (score / 100) * half;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28">
        <svg viewBox="0 0 180 100" className="w-full h-full overflow-visible">
          <path d="M 18 90 A 72 72 0 0 1 162 90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
          <motion.path d="M 18 90 A 72 72 0 0 1 162 90" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={half} strokeDashoffset={half}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <motion.div className="font-['Manrope'] font-extrabold text-4xl" style={{ color }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            {score}
          </motion.div>
          <div className="font-['Space_Grotesk'] text-[10px] uppercase tracking-widest text-[#888]">FairRank</div>
        </div>
      </div>
      <div className="mt-2 px-4 py-1 rounded-full border text-xs font-['Space_Grotesk'] uppercase tracking-widest"
        style={{ background: bgColor, color, borderColor }}>{label}</div>
    </div>
  );
}

function MetricCard({ label, value, warn }) {
  const bad = warn !== null && warn !== undefined && Math.abs(value) > warn;
  return (
    <div className={`rounded-xl border p-4 ${bad ? 'bg-[#450a0a] border-[#7f1d1d]' : 'bg-white/[0.03] border-white/[0.08]'}`}>
      <div className="font-['Space_Grotesk'] text-[10px] uppercase tracking-widest text-[#888] mb-1">{label}</div>
      <div className={`font-['Manrope'] font-extrabold text-2xl ${bad ? 'text-[#f87171]' : 'text-white'}`}>
        {typeof value === 'number' ? value.toFixed(3) : value}
      </div>
    </div>
  );
}

function PillInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block font-['Space_Grotesk'] text-xs uppercase tracking-widest text-[#666] mb-2">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder-[#333] font-['Inter'] text-sm focus:outline-none focus:border-amber-400/50 focus:bg-white/[0.05] transition-all" />
    </div>
  );
}

export default function UploadAudit() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [config, setConfig] = useState({ label: '', sensitive: '', privileged: '', favorable: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runAudit = useCallback(async (attachedFile) => {
    setStep(1);
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', attachedFile);
      fd.append('label_col', 'auto');
      fd.append('protected_col', 'auto');
      fd.append('privileged_val', 'auto');
      fd.append('favorable_val', 'auto');
      fd.append('dataset_name', attachedFile.name);

      const res = await fetch('/api/audit/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `HTTP ${res.status}`);
      }
      setResult(await res.json());
      setStep(2);
    } catch (e) {
      setError(e.message);
      setStep(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0] ?? e.target.files?.[0];
    if (f?.name.endsWith('.csv')) {
      setFile(f);
      runAudit(f);
    }
  }, [runAudit]);

  const reset = () => { setStep(0); setFile(null); setResult(null); setError(null); setConfig({ label: '', sensitive: '', privileged: '', favorable: '' }); };
  const canRun = config.label && config.sensitive && config.privileged && config.favorable;

  const SUGGESTIONS = [
    'Apply Reweighing to balance training sample weights across demographic groups.',
    'Use Disparate Impact Remover to repair feature distributions before model training.',
    'Post-process predictions with Equalized Odds to calibrate error rates across groups.',
  ];

  return (
    <div style={{ background: '#080808', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <BiasNetwork />
      <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.06]"
        style={{ backdropFilter: 'blur(12px)', background: 'rgba(8,8,8,0.7)' }}>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#888] hover:text-white transition-colors font-['Space_Grotesk'] text-sm uppercase tracking-wider">
          <ArrowLeft size={14} /> Back
        </button>
        <span className="font-['Manrope'] font-bold text-white text-sm">CSV Upload Audit</span>
        <div className="w-20" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="text-center mb-10">
          <h1 className="font-['Manrope'] font-extrabold text-4xl text-white mb-3">Audit your own dataset</h1>
          <p className="font-['Inter'] text-[#888] text-sm">Upload any CSV — we'll run AIF360 fairness metrics and score it.</p>
        </motion.div>

        <Steps current={step} />

        <AnimatePresence mode="wait">

          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              {error && (
                <div className="mb-4 px-5 py-3 rounded-2xl border border-[#7f1d1d] bg-[#450a0a] text-[#f87171] font-['Inter'] text-sm flex items-center gap-2">
                  <XCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div onClick={() => fileRef.current?.click()}
                onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                className={`relative rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300 p-16 text-center
                  ${dragging ? 'border-amber-400 bg-amber-400/5' : 'border-white/[0.12] bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]'}`}>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onDrop} />
                <motion.div animate={{ y: dragging ? -6 : 0 }} transition={{ duration: 0.2 }} className="flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-all ${dragging ? 'bg-amber-400/20 border-amber-400' : 'bg-white/[0.03] border-white/[0.08]'}`}>
                    <Upload size={24} className={dragging ? 'text-amber-400' : 'text-[#444]'} />
                  </div>
                  <div>
                    <div className="font-['Manrope'] font-bold text-white text-lg mb-1">{dragging ? 'Drop it.' : 'Drop CSV here or click to browse'}</div>
                    <div className="font-['Inter'] text-[#555] text-sm">Only .csv files accepted</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <div className="flex flex-col items-center justify-center p-16 text-center border border-white/[0.08] bg-white/[0.03] rounded-3xl backdrop-blur-sm">
                <div className="w-12 h-12 border-4 border-white/[0.08] border-t-amber-400 rounded-full animate-spin mb-6" />
                <h2 className="font-['Manrope'] font-bold text-white text-xl mb-2">Analyzing CSV Automatically</h2>
                <p className="font-['Inter'] text-[#888] text-sm">Inferring schemas, measuring bias metrics, and applying AI Reweighing pipelines...</p>
              </div>
            </motion.div>
          )}

          {step === 2 && result && (
            <motion.div key="step2" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="space-y-6">
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 flex flex-col items-center gap-6">

                <div className="flex w-full justify-around items-center">
                  <div className="flex flex-col items-center">
                    <div className="font-['Space_Grotesk'] text-[#888] text-xs uppercase tracking-widest mb-4">Original Dataset</div>
                    <FairRankGauge score={result.fairrank_score ?? 0} />
                    {result.fairrank_score >= 80 ? (
                      <div className="mt-4 flex items-center gap-2 px-5 py-2 rounded-full bg-[#14532d] border border-[#166534] text-[#4ade80] font-['Space_Grotesk'] text-xs uppercase tracking-widest"><CheckCircle size={13} /> Pass</div>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 px-5 py-2 rounded-full bg-[#450a0a] border border-[#7f1d1d] text-[#f87171] font-['Space_Grotesk'] text-xs uppercase tracking-widest"><XCircle size={13} /> Fail</div>
                    )}
                  </div>

                  {result.debiased_fairrank && (
                    <>
                      <div className="w-px h-32 bg-white/[0.08] mx-4" />
                      <div className="flex flex-col items-center">
                        <div className="font-['Space_Grotesk'] text-[#4ade80] flex items-center gap-2 text-xs uppercase tracking-widest mb-4">
                          <CheckCircle size={14} /> Debiased Pipeline
                        </div>
                        <FairRankGauge score={result.debiased_fairrank?.score ?? 0} />
                        {result.debiased_fairrank.score >= 80 ? (
                          <div className="mt-4 flex items-center gap-2 px-5 py-2 rounded-full bg-[#14532d]/40 border border-[#166534] text-[#4ade80] font-['Space_Grotesk'] text-xs uppercase tracking-widest">AIF360 Reweighing Optimal</div>
                        ) : (
                          <div className="mt-4 flex items-center gap-2 px-5 py-2 rounded-full bg-[#450a0a] border border-[#7f1d1d] text-[#f87171] font-['Space_Grotesk'] text-xs uppercase tracking-widest">Persistent Bias</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Demographic Parity Diff" value={result.metrics?.demographic_parity_difference ?? 0} warn={0.1} />
                <MetricCard label="Equalized Odds Diff" value={result.metrics?.equalized_odds_difference ?? 0} warn={0.1} />
                <MetricCard label="Disparate Impact" value={result.metrics?.disparate_impact ?? 1} warn={null} />
                <MetricCard label="FP Rate Gap" value={result.metrics?.false_positive_rate_gap ?? 0} warn={0.1} />
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6">
                <div className="font-['Space_Grotesk'] text-xs uppercase tracking-widest text-[#888] mb-4">Debiasing Suggestions</div>
                <div className="space-y-3">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                      className="flex gap-3 pl-4 border-l-2 border-[#166534]">
                      <ChevronRight size={14} className="text-[#4ade80] mt-0.5 shrink-0" />
                      <p className="font-['Inter'] text-[#888] text-sm leading-relaxed">{s}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <button onClick={reset} className="w-full py-3.5 rounded-2xl border border-white/20 text-white font-['Space_Grotesk'] text-xs uppercase tracking-widest hover:bg-white/5 transition-all">
                Audit Another File
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}