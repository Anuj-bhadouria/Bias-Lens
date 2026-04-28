import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, ScanSearch, FileText, BarChart3, Shield, ChevronDown } from "lucide-react";

// ── Canvas light streaks background ──────────────────────────────────────────
function LightStreaksCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const NUM = 60;
    const streaks = Array.from({ length: NUM }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      len: 80 + Math.random() * 220,
      speed: 0.18 + Math.random() * 0.55,
      width: 0.3 + Math.random() * 1.2,
      opacity: 0.06 + Math.random() * 0.22,
      life: Math.random(),
      lifeDir: Math.random() > 0.5 ? 1 : -1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      streaks.forEach((s) => {
        s.life += s.lifeDir * 0.004;
        if (s.life >= 1 || s.life <= 0) {
          s.lifeDir *= -1;
          if (s.life <= 0) {
            s.x = Math.random() * canvas.width;
            s.y = canvas.height + 50;
          }
        }
        s.x -= s.speed * 0.5;
        s.y -= s.speed;
        if (s.y < -s.len) {
          s.y = canvas.height + s.len;
          s.x = Math.random() * canvas.width;
        }

        const alpha = s.opacity * Math.sin(s.life * Math.PI);
        const grad = ctx.createLinearGradient(
          s.x, s.y, s.x - s.len * 0.4, s.y - s.len
        );
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.len * 0.4, s.y - s.len);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width;
        ctx.stroke();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ── FairRank badge ────────────────────────────────────────────────────────────
function FairRankBadge({ score }) {
  const cfg =
    score < 50
      ? { bg: "bg-red-950/60", text: "text-red-400", border: "border-red-900" }
      : score < 80
        ? { bg: "bg-amber-950/60", text: "text-amber-400", border: "border-amber-900" }
        : { bg: "bg-green-950/60", text: "text-green-400", border: "border-green-900" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
      style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.05em" }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.text.replace("text-", "bg-")}`} />
      FAIRRANK {score}
    </span>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
        ? "bg-black/60 backdrop-blur-xl border-b border-white/5"
        : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/">
          <span
            className="text-white text-xl tracking-tight"
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}
          >
            Bias<span className="text-amber-400">Lens</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "Cases", to: "/#cases" },
            { label: "Features", to: "/#features" },
            { label: "Upload", to: "/upload" },
            { label: "Text Analysis", to: "/text" },
            { label: "Jobs", to: "/jobs" },
          ].map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="text-sm text-[#888] hover:text-white transition-colors duration-200"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <Link to="/audit/compas">
          <button
            className="bg-white text-black text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-amber-400 transition-colors duration-200"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.08em" }}
          >
            AUDIT NOW
          </button>
        </Link>
      </div>
    </nav>
  );
}

// ── CASES data ────────────────────────────────────────────────────────────────
const CASES = [
  {
    id: "compas",
    tag: "CRIMINAL JUSTICE",
    name: "COMPAS Algorithm",
    score: 34,
    desc: "Black defendants flagged at nearly 2× the rate of white defendants with identical criminal histories.",
    year: "2016",
  },
  {
    id: "adult",
    tag: "CENSUS MODEL",
    name: "Adult Income",
    score: 52,
    desc: "Gender pay gap systematically encoded in training data — women predicted lower income despite equal qualifications.",
    year: "2019",
  },
  {
    id: "healthcare",
    tag: "CARE ALLOCATION",
    name: "Healthcare AI",
    score: 28,
    desc: "Black patients systematically undertreated — algorithm routed fewer resources despite higher medical need.",
    year: "2019",
  },
];

const FEATURES = [
  {
    icon: BarChart3,
    title: "Structured Bias",
    desc: "AIF360-powered fairness metrics across demographic parity, equalized odds, and disparate impact.",
  },
  {
    icon: FileText,
    title: "Text Analysis",
    desc: "DBias NLP engine detects bias in job postings, policies, and written content — word by word.",
  },
  {
    icon: Shield,
    title: "FairRank Score",
    desc: "Our 0–100 accountability index. One number that tells the whole story of a model's bias profile.",
  },
];

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((data) => {
        const mappedCases = (data.cases || []).map(c => ({
          ...c,
          desc: c.description,
          year: c.id === 'compas' ? '2016' : c.id === 'adult' ? '1996' : '2019'
        }));
        setCases(mappedCases);
      })
      .catch((err) => {
        console.error("Failed to load cases", err);
      });
  }, []);


  const fadeUp = {
    hidden: { opacity: 0, y: 32 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@400;500&family=Space+Grotesk:wght@500;600&display=swap');
      `}</style>

      <Nav />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <LightStreaksCanvas />

        {/* Radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, #080808 100%)",
            zIndex: 1,
          }}
        />

        {/* Amber glow behind content */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(245,158,11,0.04) 0%, transparent 70%)",
            zIndex: 1,
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center gap-6">
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 text-[10px] text-[#888]"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.18em" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              THE AI ACCOUNTABILITY LAYER
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-5xl md:text-7xl lg:text-[88px] leading-[0.95] tracking-tighter text-white"
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}
          >
            Every AI that decides
            <br />
            <span className="text-amber-400">about people</span>
            <br />
            deserves an audit.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-[#888] text-lg md:text-xl max-w-xl leading-relaxed"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            BiasLens quantifies, explains, and exposes discrimination in AI systems —
            before they impact real people.
          </motion.p>

          {/* Buttons */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-wrap gap-3 justify-center mt-2"
          >
            <Link to="/audit/compas">
              <button
                className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-7 py-3.5 rounded-full hover:bg-amber-400 transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.08em" }}
              >
                START AUDITING <ArrowRight size={14} />
              </button>
            </Link>
            <a href="#cases">
              <button
                className="flex items-center gap-2 border border-white/25 text-white text-xs font-semibold px-7 py-3.5 rounded-full hover:border-white/50 hover:bg-white/5 transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.08em" }}
              >
                EXPLORE CASES
              </button>
            </a>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={5}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <ChevronDown size={20} className="text-white/20" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-4"
        >
          <h2
            className="text-4xl md:text-5xl text-white leading-tight tracking-tighter"
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}
          >
            The full spectrum
            <br />
            <span className="text-[#555]">of bias detection.</span>
          </h2>
          <p
            className="text-[#555] text-sm max-w-xs"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            From structured tabular data to raw text — BiasLens covers every surface where AI discrimination hides.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="rounded-3xl bg-white/[0.03] border border-white/[0.08] p-8 backdrop-blur-sm group hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-6 group-hover:bg-amber-400/20 transition-colors">
                <f.icon size={18} className="text-amber-400" />
              </div>
              <h3
                className="text-white text-lg mb-2"
                style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700 }}
              >
                {f.title}
              </h3>
              <p
                className="text-[#555] text-sm leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ── CASES ── */}
      <section id="cases" className="max-w-7xl mx-auto px-6 py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <p
            className="text-[#555] text-xs mb-3 tracking-widest"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.2em" }}
          >
            DOCUMENTED CASES
          </p>
          <h2
            className="text-4xl md:text-5xl text-white leading-tight tracking-tighter"
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}
          >
            Real systems.
            <br />
            <span className="text-[#555]">Real harm. Measured.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {cases.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
            >
              <Link to={`/audit/${c.id}`}>
                <div className="group rounded-3xl bg-white/[0.03] border border-white/[0.08] p-7 backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-300 cursor-pointer h-full flex flex-col justify-between gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span
                        className="text-[10px] text-[#555] tracking-widest"
                        style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.18em" }}
                      >
                        {c.tag}
                      </span>
                      <span
                        className="text-[10px] text-[#333]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {c.year}
                      </span>
                    </div>
                    <h3
                      className="text-white text-xl mb-3 leading-tight"
                      style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}
                    >
                      {c.name}
                    </h3>
                    <p
                      className="text-[#555] text-sm leading-relaxed"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {c.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <FairRankBadge score={c.score} />
                    <span
                      className="text-xs text-[#444] group-hover:text-white group-hover:translate-x-1 transition-all duration-200 flex items-center gap-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      AUDIT <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="max-w-7xl mx-auto px-6 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="rounded-3xl bg-white/[0.03] border border-white/[0.08] p-12 md:p-16 text-center relative overflow-hidden"
        >
          {/* Subtle amber glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 60% at 50% 100%, rgba(245,158,11,0.05) 0%, transparent 70%)",
            }}
          />
          <div className="relative z-10">
            <p
              className="text-[10px] text-[#555] tracking-widest mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.2em" }}
            >
              UPLOAD YOUR OWN
            </p>
            <h2
              className="text-4xl md:text-5xl text-white mb-4 tracking-tighter leading-tight"
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}
            >
              Audit your AI
              <br />
              <span className="text-amber-400">before it ships.</span>
            </h2>
            <p
              className="text-[#555] text-base mb-8 max-w-md mx-auto"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Upload your dataset or model predictions. Get a FairRank score, bias breakdown, and compliance report in seconds.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/upload">
                <button
                  className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-7 py-3.5 rounded-full hover:bg-amber-400 transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.08em" }}
                >
                  <ScanSearch size={14} /> UPLOAD DATASET
                </button>
              </Link>
              <Link to="/text">
                <button
                  className="flex items-center gap-2 border border-white/25 text-white text-xs font-semibold px-7 py-3.5 rounded-full hover:border-white/50 hover:bg-white/5 transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.08em" }}
                >
                  ANALYZE TEXT
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span
            className="text-white text-base"
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}
          >
            Bias<span className="text-amber-400">Lens</span>
          </span>
          <p
            className="text-[#333] text-xs"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            BECAUSE EVERY AI THAT DECIDES ABOUT PEOPLE DESERVES AN AUDIT
          </p>
          <p
            className="text-[#333] text-xs"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            GDG Solution Challenge 2026
          </p>
        </div>
      </footer>
    </div>
  );
}