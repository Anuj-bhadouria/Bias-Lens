import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Activity, 
  Fingerprint, 
  ArrowRight, 
  Binary, 
  Search, 
  LayoutPanelLeft,
  FileText,
  Briefcase,
  UploadCloud
} from 'lucide-react';

/**
 * BIASLENS: THE AUDIT SPECTRUM (HOME)
 * Concept: A digital diagnostic grid representing data distributions.
 */

const AuditBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const columns = 60;
    const dataPoints = Array.from({ length: columns }, () => ({
      height: Math.random() * 100 + 20,
      targetHeight: Math.random() * 100 + 20,
      isBiased: Math.random() > 0.92,
    }));

    let scanPos = 0;

    const draw = () => {
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      scanPos = (scanPos + 2) % canvas.height;

      dataPoints.forEach((p, i) => {
        if (Math.abs(p.height - p.targetHeight) < 1) {
          p.targetHeight = Math.random() * 150 + 20;
        }
        p.height += (p.targetHeight - p.height) * 0.05;

        const x = i * (canvas.width / columns);
        const yCenter = canvas.height / 2;

        const distToScanner = Math.abs(scanPos - yCenter);
        const isBeingScanned = distToScanner < 50;

        ctx.lineWidth = 2;
        
        if (p.isBiased && isBeingScanned) {
          ctx.strokeStyle = '#f87171'; // Red
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#f87171';
          ctx.beginPath();
          ctx.moveTo(x, yCenter - p.height * 1.5);
          ctx.lineTo(x, yCenter + p.height * 1.5);
          ctx.stroke();
        } else {
          ctx.strokeStyle = isBeingScanned ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)';
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.moveTo(x, yCenter - p.height);
          ctx.lineTo(x, yCenter + p.height);
          ctx.stroke();
        }
      });

      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(255,255,255,0.2)';
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanPos);
      ctx.lineTo(canvas.width, scanPos);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 opacity-60 pointer-events-none" />;
};

const Home = () => {
  const auditCases = [
    { id: "compas", name: "COMPAS v2", score: 34, risk: "CRITICAL", color: "#f87171" },
    { id: "adult", name: "Income-Predict", score: 52, risk: "MODERATE", color: "#fbbf24" },
    { id: "healthcare", name: "HealthAlloc-1", score: 28, risk: "CRITICAL", color: "#f87171" }
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-white selection:text-black font-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@800&family=Space+Grotesk:wght@500&display=swap');
        .font-headline { font-family: 'Manrope', sans-serif; letter-spacing: -0.03em; line-height: 0.85; }
        .font-label { font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.14em; text-transform: uppercase; }
        .glass { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px); }
        .glow-text { text-shadow: 0 0 30px rgba(255,255,255,0.3); }
        
        .scanline-hover { position: relative; overflow: hidden; }
        .scanline-hover::after {
          content: "";
          position: absolute;
          top: -100%; left: 0; width: 100%; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: none;
        }
        .scanline-hover:hover::after {
          animation: scan 2s linear infinite;
        }
        @keyframes scan {
          0% { top: -5%; }
          100% { top: 105%; }
        }
      `}</style>

      <AuditBackground />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-10 py-10 bg-[#080808]/40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
          <Binary className="w-6 h-6 text-white" />
          <div className="text-xl font-headline font-800 tracking-tighter">BIASLENS</div>
        </div>
        <div className="hidden md:flex gap-12 text-[10px] font-label text-[#888] font-bold">
          <Link to="/upload" className="hover:text-white transition-colors">Audit Node</Link>
          <Link to="/text" className="hover:text-white transition-colors">Text Analysis</Link>
          <Link to="/jobs" className="hover:text-white transition-colors">Jobs Explorer</Link>
        </div>
        <Link to="/upload" className="bg-white text-black px-8 py-3 rounded-full text-[10px] font-label font-bold hover:bg-[#888] transition-all">
          Secure Audit
        </Link>
      </nav>

      {/* Hero */}
      <header className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 border border-white/10 rounded-full mb-12 bg-black/50 backdrop-blur-xl">
             <div className="w-1.5 h-1.5 bg-[#f87171] rounded-full animate-pulse" />
             <span className="font-label text-[9px] text-[#888]">Monitoring Algorithmic Skew in Real-Time</span>
          </div>

          <h1 className="text-6xl md:text-[140px] font-headline font-800 mb-12 glow-text">
            Audit the <br /> Invisible.
          </h1>

          <p className="text-[#888] text-xl md:text-2xl max-w-3xl mx-auto mb-16 font-light leading-relaxed tracking-tight">
            BiasLens provides the infrastructure to scan, identify, and mitigate bias 
            within AI decision-making layers. Transparent. Verifiable. Necessary.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/upload" className="bg-white text-black px-14 py-5 rounded-full font-bold text-[12px] font-label hover:scale-105 transition-transform">
              Run Infrastructure Audit
            </Link>
            <a href="#ledger" className="glass px-14 py-5 rounded-full font-bold text-[12px] font-label hover:bg-white/5 transition-colors">
              Explore Open Ledger
            </a>
          </div>
        </motion.div>
      </header>

      {/* Core Features */}
      <section className="py-40 px-10 max-w-[1600px] mx-auto relative z-10">
        <div className="grid lg:grid-cols-3 gap-5">
          <Link to="/text" className="glass scanline-hover p-16 rounded-[48px] flex flex-col justify-between min-h-[400px] group transition-all hover:bg-white/[0.05]">
            <FileText className="w-10 h-10 mb-10 text-[#888] group-hover:text-white transition-opacity" />
            <div>
              <h3 className="text-3xl font-headline font-800 mb-4 uppercase">Text Bias</h3>
              <p className="text-[#888] text-lg leading-relaxed">Analyze job descriptions, legal policies, and prompts for latent linguistic bias.</p>
            </div>
          </Link>
          <Link to="/jobs" className="glass scanline-hover p-16 rounded-[48px] flex flex-col justify-between min-h-[400px] group transition-all hover:bg-white/[0.05]">
            <Briefcase className="w-10 h-10 mb-10 text-[#888] group-hover:text-white transition-opacity" />
            <div>
              <h3 className="text-3xl font-headline font-800 mb-4 uppercase">Jobs Engine</h3>
              <p className="text-[#888] text-lg leading-relaxed">Scrape and audit live job postings to ensure inclusive hiring across the industry.</p>
            </div>
          </Link>
          <Link to="/upload" className="glass scanline-hover p-16 rounded-[48px] flex flex-col justify-between min-h-[400px] group transition-all hover:bg-white/[0.05]">
            <UploadCloud className="w-10 h-10 mb-10 text-[#888] group-hover:text-white transition-opacity" />
            <div>
              <h3 className="text-3xl font-headline font-800 mb-4 uppercase">Node Upload</h3>
              <p className="text-[#888] text-lg leading-relaxed">Upload your own datasets to generate a FairRank cryptographic accountability report.</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Audit Cases Ledger */}
      <section id="ledger" className="py-40 px-10 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-10 px-4">
          <div>
            <span className="font-label text-[10px] text-[#555] block mb-4">Live Verification Feed</span>
            <h2 className="text-6xl font-headline font-800 tracking-tighter">Public Audits</h2>
          </div>
          <p className="max-w-sm text-[#555] text-sm leading-relaxed font-body">Every audit is logged on a public immutable ledger to ensure accountability for high-impact AI systems.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 font-body">
          {auditCases.map((c) => (
            <div key={c.id} className="glass scanline-hover p-12 rounded-[56px] group relative overflow-hidden">
              <div className="flex justify-between items-start mb-20">
                <h3 className="text-3xl font-headline font-800">{c.name}</h3>
                <div 
                  className="px-4 py-1.5 rounded-full text-[9px] font-label font-bold border"
                  style={{ color: c.color, borderColor: `${c.color}44`, backgroundColor: `${c.color}22` }}
                >
                  {c.risk}
                </div>
              </div>
              <div className="mb-12">
                <div className="text-sm font-label text-[#555] mb-4 uppercase">FairRank Score</div>
                <div className="text-5xl font-headline font-800 tracking-tighter">{c.score}</div>
              </div>
              <Link to={`/audit/${c.id}`} className="flex items-center gap-3 text-[11px] font-label font-bold text-[#888] group-hover:text-white transition-all">
                Full Evidence <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-10 border-t border-white/5 relative z-10 bg-[#080808]">
        <div className="max-w-7xl mx-auto flex flex-col md:row justify-between gap-20">
          <div>
            <div className="text-2xl font-headline font-800 mb-6 uppercase tracking-tighter">BiasLens</div>
            <p className="text-[#555] text-[10px] font-label max-w-[200px] leading-relaxed">The programmable layer for algorithmic equity. Secure. Open. Fair.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-[10px] font-label text-[#555] font-bold">
            <a href="#ledger" className="hover:text-white transition-colors">Ledger</a>
            <a href="https://github.com" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Whitepaper</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-40 pt-10 border-t border-white/5 text-[9px] font-label text-[#222] flex justify-between">
          <span>© 2024 BIASLENS NEURAL SYSTEMS</span>
          <span className="hidden md:block tracking-[0.5em]">NON-BIASED / VERIFIED</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;