import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, TextSearch, BarChart3, ArrowRight } from 'lucide-react';

const Home = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const streaks = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      width: Math.random() * 1.2 + 0.3,
      length: Math.random() * 150 + 50,
      speed: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.22 + 0.08,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      streaks.forEach((s) => {
        ctx.beginPath();
        const gradient = ctx.createLinearGradient(s.x, s.y, s.x + s.length, s.y - s.length);
        gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${s.opacity})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = s.width;
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.length, s.y - s.length);
        ctx.stroke();

        s.x += s.speed;
        s.y -= s.speed;

        if (s.x > canvas.width || s.y < 0) {
          s.x = Math.random() * canvas.width - 200;
          s.y = canvas.height + 200;
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <div className="relative min-h-screen bg-[#080808] text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-md bg-[#080808]/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-manrope text-2xl font-extrabold tracking-tighter">BiasLens</div>
          <div className="hidden md:flex items-center gap-8 text-[#888] text-sm font-medium">
            {['Cases', 'Features', 'Upload', 'Text Analysis', 'Jobs'].map((item) => (
              <Link 
                key={item} 
                to={item === 'Cases' ? '/' : `/${item.toLowerCase().replace(' ', '')}`} 
                className="hover:text-white transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
          <Link to="/upload">
            <button className="bg-white text-black px-6 py-2.5 rounded-full font-space text-xs tracking-widest uppercase hover:bg-neutral-200 transition-colors">
              Audit Now
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center pt-20">
        <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
        <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent,#080808)]" />
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-20 text-center max-w-4xl px-6"
        >
          <motion.span variants={itemVariants} className="inline-block border border-white/20 px-4 py-1 rounded-full font-space text-[10px] tracking-[0.3em] text-white/60 mb-8">
            THE AI ACCOUNTABILITY LAYER
          </motion.span>
          <motion.h1 variants={itemVariants} className="font-manrope text-5xl md:text-8xl leading-[1.1] mb-8">
            Every AI that decides about people deserves an audit.
          </motion.h1>
          <motion.p variants={itemVariants} className="text-[#888] text-lg md:text-xl max-w-2xl mx-auto mb-12 font-inter">
            BiasLens quantifies, explains, and exposes bias in AI systems to ensure algorithmic justice for everyone.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link to="/upload" className="w-full md:w-auto bg-white text-black px-10 py-4 rounded-full font-space text-sm tracking-widest uppercase font-bold hover:scale-105 transition-transform">
              Start Auditing
            </Link>
            <button className="w-full md:w-auto border border-white/25 px-10 py-4 rounded-full font-space text-sm tracking-widest uppercase hover:bg-white/5 transition-colors">
              Explore Cases
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section className="relative z-20 py-32 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <ShieldCheck />, title: "Structured Bias", desc: "Industry-standard AIF360 fairness metrics for tabular datasets." },
            { icon: <TextSearch />, title: "Text Analysis", desc: "Detect gender, racial, and ageist bias in language models and postings." },
            { icon: <BarChart3 />, title: "FairRank Score", desc: "A unified 0-100 accountability score for rapid risk assessment." }
          ].map((feat, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm p-8 rounded-3xl hover:border-white/20 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 text-amber-500 group-hover:scale-110 transition-transform">
                {feat.icon}
              </div>
              <h3 className="font-manrope text-xl font-bold mb-3">{feat.title}</h3>
              <p className="text-[#888] text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Case Studies */}
      <section className="relative z-20 py-32 max-w-7xl mx-auto px-6 border-t border-white/5">
        <div className="mb-16">
          <span className="font-space text-xs tracking-widest text-[#555] uppercase">Real systems. Real harm. Measured.</span>
          <h2 className="font-manrope text-4xl mt-4">Audited Benchmarks</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { id: 'compas', name: 'COMPAS', sub: 'Criminal Recidivism', score: 34, color: 'red', desc: 'Black defendants flagged at nearly 2x the rate of white defendants.' },
            { id: 'adult', name: 'Adult Income', sub: 'Census Model', score: 52, color: 'amber', desc: 'Gender pay gap encoded in training data, penalizing female profiles.' },
            { id: 'healthcare', name: 'Healthcare', sub: 'Care Allocation', score: 28, color: 'red', desc: 'Black patients systematically underserved by resource allocation logic.' }
          ].map((c) => (
            <Link to={`/audit/${c.id}`} key={c.id} className="bg-white/[0.03] border border-white/[0.08] rounded-3xl overflow-hidden group hover:bg-white/[0.05] transition-all">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="font-space text-[10px] text-[#555] tracking-widest uppercase mb-1">{c.sub}</p>
                    <h4 className="font-manrope text-2xl font-bold">{c.name}</h4>
                  </div>
                  <div className={`px-3 py-1 rounded-lg font-manrope font-extrabold text-sm border 
                    ${c.color === 'red' ? 'bg-[#450a0a] text-[#f87171] border-[#7f1d1d]' : 'bg-[#451a03] text-[#fbbf24] border-[#78350f]'}`}>
                    {c.score}
                  </div>
                </div>
                <p className="text-[#888] text-sm mb-8 leading-relaxed italic">"{c.desc}"</p>
                <div className="flex items-center gap-2 text-xs font-space tracking-wider uppercase group-hover:text-amber-500 transition-colors">
                  Audit Analysis <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      
      <footer className="py-20 text-center border-t border-white/5">
         <p className="font-space text-[10px] tracking-[0.4em] text-white/20 uppercase">BiasLens © 2024 Accountability Platform</p>
      </footer>
    </div>
  );
};

export default Home;