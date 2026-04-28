import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, MapPin, AlertTriangle, CheckCircle, Minus, ArrowLeft, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Bias Network Canvas ──────────────────────────────────────────────────────
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
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 2 + Math.random() * 3,
      color: Math.random() < 0.7 ? 'rgba(248,113,113,0.6)' : Math.random() < 0.67 ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.3)',
    }));

    let pulses = [];
    const spawnPulse = () => {
      const a = Math.floor(Math.random() * N);
      let b = Math.floor(Math.random() * N);
      while (b === a) b = Math.floor(Math.random() * N);
      pulses.push({ a, b, t: 0, color: nodes[a].color });
    };
    const pulseInterval = setInterval(spawnPulse, 3000);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = nodes[i].color.replace(/[\d.]+\)$/, '0.12)');
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      pulses = pulses.filter(p => p.t <= 1);
      pulses.forEach(p => {
        p.t += 0.012;
        const ax = nodes[p.a].x, ay = nodes[p.a].y;
        const bx = nodes[p.b].x, by = nodes[p.b].y;
        const x = ax + (bx - ax) * p.t, y = ay + (by - ay) * p.t;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, '1)');
        ctx.fill();
      });
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); clearInterval(pulseInterval); window.removeEventListener('resize', resize); };
  }, []);
  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 65% 55% at 50% 50%, transparent 20%, #080808 90%)', zIndex: 1, pointerEvents: 'none' }} />
    </>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: 'us', label: 'US' }, { code: 'gb', label: 'GB' },
  { code: 'in', label: 'IN' }, { code: 'au', label: 'AU' },
  { code: 'ca', label: 'CA' }, { code: 'de', label: 'DE' },
];

const SEVERITY = {
  HIGH:   { bg: 'bg-[#450a0a]', text: 'text-[#f87171]', border: 'border-[#7f1d1d]', icon: AlertTriangle },
  MEDIUM: { bg: 'bg-[#451a03]', text: 'text-[#fbbf24]', border: 'border-[#78350f]', icon: Minus },
  NONE:   { bg: 'bg-[#14532d]', text: 'text-[#4ade80]', border: 'border-[#166534]', icon: CheckCircle },
};

const getSeverity = (score) => score >= 0.6 ? 'HIGH' : score >= 0.3 ? 'MEDIUM' : 'NONE';

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-48 bg-white/10 rounded" />
        <div className="h-6 w-16 bg-white/10 rounded-full" />
      </div>
      <div className="h-3 w-32 bg-white/10 rounded" />
      <div className="h-2 w-full bg-white/10 rounded-full" />
      <div className="flex gap-2">
        {[1,2,3].map(i => <div key={i} className="h-5 w-14 bg-white/10 rounded-full" />)}
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = '#fff' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-4 text-center"
    >
      <div className="font-['Manrope'] font-extrabold text-3xl" style={{ color }}>{value}</div>
      <div className="font-['Space_Grotesk'] text-xs uppercase tracking-wider text-[#888] mt-1">{label}</div>
    </motion.div>
  );
}

// ── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, index }) {
  const [open, setOpen] = useState(false);
  const sev = getSeverity(job.bias_score ?? 0);
  const S = SEVERITY[sev];
  const SIcon = S.icon;
  const score = Math.round((job.bias_score ?? 0) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden"
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-['Manrope'] font-bold text-white text-base leading-tight truncate">
              {job.title ?? 'Untitled Role'}
            </div>
            <div className="font-['Inter'] text-[#888] text-sm mt-0.5">
              {job.company ?? 'Unknown Company'}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-['Space_Grotesk'] uppercase tracking-wider shrink-0 ${S.bg} ${S.text} ${S.border}`}>
            <SIcon size={11} />
            {sev}
          </div>
        </div>

        {/* Location */}
        {job.location && (
          <div className="flex items-center gap-1 mt-2 text-[#666] text-xs font-['Inter']">
            <MapPin size={11} />
            {job.location}
          </div>
        )}

        {/* Score bar */}
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <span className="font-['Space_Grotesk'] text-xs text-[#888] uppercase tracking-wider">Bias Score</span>
            <span className={`font-['Manrope'] font-bold text-sm ${S.text}`}>{score}/100</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: sev === 'HIGH' ? '#f87171' : sev === 'MEDIUM' ? '#fbbf24' : '#4ade80' }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 + 0.2 }}
            />
          </div>
        </div>

        {/* Flagged words */}
        {job.biased_words?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.biased_words.slice(0, 6).map(w => (
              <span key={w} className="px-2.5 py-0.5 rounded-full bg-[#450a0a] border border-[#7f1d1d] text-[#f87171] text-xs font-['Space_Grotesk']">
                {w}
              </span>
            ))}
            {job.biased_words.length > 6 && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-[#888] text-xs font-['Space_Grotesk']">
                +{job.biased_words.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setOpen(v => !v)}
          className="mt-4 flex items-center gap-1 text-[#888] hover:text-white text-xs font-['Space_Grotesk'] uppercase tracking-wider transition-colors"
        >
          {open ? <><ChevronUp size={13} /> Hide description</> : <><ChevronDown size={13} /> Full description</>}
        </button>
      </div>

      {/* Expandable description */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/[0.06] pt-4">
              <p className="font-['Inter'] text-[#888] text-sm leading-relaxed whitespace-pre-wrap">
                {job.description ?? 'No description available.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 font-['Inter'] text-sm text-white">
      <div className="text-[#888] text-xs mb-0.5 font-['Space_Grotesk'] uppercase tracking-wider">Bias Score</div>
      <div className="font-['Manrope'] font-bold text-amber-400">{Math.round(payload[0].value * 100)}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JobsBias() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('us');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState(null);
  const [sort, setSort] = useState('bias'); // 'bias' | 'recent'
  const [error, setError] = useState(null);

  const scan = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setJobs(null);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/jobs/bias?query=${encodeURIComponent(query)}&country=${country}&n=10`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : data.jobs ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') scan(); };

  const sorted = jobs ? [...jobs].sort((a, b) =>
    sort === 'bias' ? (b.bias_score ?? 0) - (a.bias_score ?? 0) : 0
  ) : [];

  const top5 = jobs
    ? [...jobs].sort((a, b) => (b.bias_score ?? 0) - (a.bias_score ?? 0)).slice(0, 5).map(j => ({
        name: (j.title ?? 'Role').split(' ').slice(0, 3).join(' '),
        score: j.bias_score ?? 0,
      }))
    : [];

  const biasedCount = jobs ? jobs.filter(j => getSeverity(j.bias_score ?? 0) !== 'NONE').length : 0;
  const biasRate = jobs && jobs.length ? Math.round((biasedCount / jobs.length) * 100) : 0;
  const avgScore = jobs && jobs.length ? Math.round(jobs.reduce((a, j) => a + (j.bias_score ?? 0), 0) / jobs.length * 100) : 0;

  const AMBER_GRADIENT = [
    { offset: '0%', stopColor: '#F59E0B' },
    { offset: '100%', stopColor: '#ef4444' },
  ];

  return (
    <div style={{ background: '#080808', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <BiasNetwork />

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.06]" style={{ backdropFilter: 'blur(12px)', background: 'rgba(8,8,8,0.7)' }}>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#888] hover:text-white transition-colors font-['Space_Grotesk'] text-sm uppercase tracking-wider">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-amber-400" />
          <span className="font-['Manrope'] font-bold text-white text-sm tracking-tight">Jobs Bias Scanner</span>
        </div>
        <div className="w-20" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 mb-6">
            <AlertTriangle size={13} className="text-amber-400" />
            <span className="font-['Space_Grotesk'] text-xs uppercase tracking-widest text-amber-400">Live Job Bias Scan</span>
          </div>
          <h1 className="font-['Manrope'] font-extrabold text-5xl text-white leading-tight mb-3">
            Who are they <span className="text-amber-400">really</span> hiring?
          </h1>
          <p className="font-['Inter'] text-[#888] text-base max-w-xl mx-auto">
            Scan live job listings for discriminatory language, coded bias, and exclusionary patterns — before they reach a candidate.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex gap-3 mb-10"
        >
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. software engineer"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white placeholder-[#444] font-['Inter'] text-sm focus:outline-none focus:border-amber-400/50 focus:bg-white/[0.05] transition-all"
            />
          </div>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white font-['Space_Grotesk'] text-sm focus:outline-none focus:border-amber-400/50 transition-all appearance-none cursor-pointer"
          >
            {COUNTRIES.map(c => <option key={c.code} value={c.code} style={{ background: '#111' }}>{c.label}</option>)}
          </select>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={scan}
            disabled={loading || !query.trim()}
            className="px-8 py-3.5 rounded-2xl bg-white text-black font-['Space_Grotesk'] text-xs uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Scanning…' : 'Scan Jobs'}
          </motion.button>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[#450a0a] border border-[#7f1d1d] text-[#f87171] font-['Inter'] text-sm">
            Error: {error}
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} />)}
          </div>
        )}

        {/* Results */}
        {jobs && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>

            {/* Stat row */}
            <div className="flex gap-4 mb-8">
              <StatCard label="Total Scanned" value={jobs.length} />
              <StatCard label="Biased" value={biasedCount} color="#f87171" />
              <StatCard label="Bias Rate" value={`${biasRate}%`} color="#fbbf24" />
              <StatCard label="Avg Score" value={avgScore} color={avgScore >= 60 ? '#f87171' : avgScore >= 30 ? '#fbbf24' : '#4ade80'} />
            </div>

            {/* Top 5 chart */}
            {top5.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6 mb-8"
              >
                <div className="font-['Space_Grotesk'] text-xs uppercase tracking-widest text-[#888] mb-5">Top 5 Most Biased Listings</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={top5} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" domain={[0, 1]} tick={{ fill: '#555', fontSize: 10, fontFamily: 'Inter' }} tickLine={false} axisLine={false} tickFormatter={v => Math.round(v * 100)} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#888', fontSize: 11, fontFamily: 'Inter' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="score" fill="url(#barGrad)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Sort toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="font-['Space_Grotesk'] text-xs uppercase tracking-widest text-[#888]">
                {sorted.length} listing{sorted.length !== 1 ? 's' : ''} found
              </div>
              <div className="flex gap-2">
                {['bias', 'recent'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-4 py-1.5 rounded-full text-xs font-['Space_Grotesk'] uppercase tracking-wider border transition-all ${sort === s ? 'bg-white text-black border-white' : 'border-white/20 text-[#888] hover:bg-white/5'}`}
                  >
                    {s === 'bias' ? 'Most Biased' : 'Most Recent'}
                  </button>
                ))}
              </div>
            </div>

            {/* Job cards */}
            <div className="space-y-4">
              {sorted.map((job, i) => <JobCard key={job.id ?? i} job={job} index={i} />)}
            </div>

            {sorted.length === 0 && (
              <div className="text-center py-16 text-[#555] font-['Inter'] text-sm">
                No jobs returned. Try a different query.
              </div>
            )}
          </motion.div>
        )}

        {/* Empty state */}
        {!jobs && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-[#333]" />
            </div>
            <div className="font-['Manrope'] font-bold text-[#333] text-lg">Enter a job title to begin scanning</div>
            <div className="font-['Inter'] text-[#444] text-sm mt-2">We'll analyze live listings for bias patterns</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}