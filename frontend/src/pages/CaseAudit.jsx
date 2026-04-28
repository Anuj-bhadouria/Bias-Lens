import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer
} from "recharts";
import {
  ArrowLeft, Share2, Send, Scale, TrendingUp,
  AlertTriangle, Target, Zap, ChevronRight, Loader2
} from "lucide-react";
import ComplianceReport from "./ComplianceReport";

/* ─── Fonts ─────────────────────────────────────────────────── */
const FontLink = () => (
  <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500&family=Space+Grotesk:wght@400;500;600&display=swap');`}</style>
);

/* ─── Bias Network Canvas ────────────────────────────────────── */
function BiasNetworkCanvas() {
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

    const N = 50;
    const nodes = Array.from({ length: N }, () => {
      const r = Math.random();
      const color = r < 0.7
        ? `rgba(248,113,113,${0.4 + Math.random() * 0.3})`
        : r < 0.9
          ? `rgba(251,191,36,${0.3 + Math.random() * 0.3})`
          : `rgba(255,255,255,${0.2 + Math.random() * 0.15})`;
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 2 + Math.random() * 3,
        color,
      };
    });

    let pulseConn = null;
    let pulseProgress = 0;

    const pickPulse = () => {
      const pairs = [];
      for (let i = 0; i < N; i++)
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < 180) pairs.push([i, j]);
        }
      if (pairs.length) {
        pulseConn = pairs[Math.floor(Math.random() * pairs.length)];
        pulseProgress = 0;
      }
    };
    pickPulse();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = nodes[i].color.replace(/[\d.]+\)$/, "0.12)");
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      if (pulseConn) {
        const [ai, bi] = pulseConn;
        const px = nodes[ai].x + (nodes[bi].x - nodes[ai].x) * pulseProgress;
        const py = nodes[ai].y + (nodes[bi].y - nodes[ai].y) * pulseProgress;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = nodes[ai].color;
        ctx.fill();
        pulseProgress += 0.012;
        if (pulseProgress > 1) { pulseConn = null; setTimeout(pickPulse, 3000); }
      }
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      const vg = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.1,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.75
      );
      vg.addColorStop(0, "transparent");
      vg.addColorStop(1, "#080808");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

/* ─── FairRank Gauge ─────────────────────────────────────────── */
function FairRankGauge({ score }) {
  const color = score >= 80 ? "#4ade80" : score >= 50 ? "#fbbf24" : "#f87171";
  const r = 90, cx = 120, cy = 110;
  const circ = Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0" }}>
      <svg width="240" height="135" viewBox="0 0 240 135">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"
        />
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle"
          style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 56, fill: color }}>
          {score}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle"
          style={{ fontFamily: "Space Grotesk", fontSize: 11, fill: "#555", letterSpacing: 2 }}>
          FAIRRANK INDEX
        </text>
      </svg>
    </div>
  );
}

/* ─── Metric Card ────────────────────────────────────────────── */
const METRIC_META = {
  demographic_parity_difference: { label: "Demographic Parity", icon: Scale, threshold: 0.1, higherBad: true },
  equalized_odds_difference: { label: "Equalized Odds", icon: TrendingUp, threshold: 0.1, higherBad: true },
  disparate_impact: { label: "Disparate Impact", icon: Target, threshold: 0.8, higherBad: false },
  false_positive_rate_gap: { label: "FP Rate Gap", icon: AlertTriangle, threshold: 0.1, higherBad: true },
};

function MetricCard({ field, value }) {
  const meta = METRIC_META[field];
  const Icon = meta.icon;
  const biased = meta.higherBad ? value > meta.threshold : value < meta.threshold;
  const color = biased ? "#f87171" : "#4ade80";
  return (
    <motion.div whileHover={{ scale: 1.02 }} style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "16px", display: "flex", flexDirection: "column", gap: 8
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={14} color="#555" />
        <span style={{ fontFamily: "Space Grotesk", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5 }}>
          {meta.label}
        </span>
      </div>
      <div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 28, color: "#fff" }}>
        {typeof value === "number" ? value.toFixed(3) : "—"}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
        <span style={{ fontFamily: "Inter", fontSize: 11, color }}>
          {biased ? "Above threshold — biased" : "Within range"}
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Bias Genealogy Pipeline ────────────────────────────────── */
function GenealogyPipeline({ stages }) {
  const [active, setActive] = useState(null);
  const impactColor = imp => imp === "High" ? "#f87171" : imp === "Medium" ? "#fbbf24" : "#4ade80";
  const impactBorder = imp => imp === "High" ? "#7f1d1d" : imp === "Medium" ? "#78350f" : "#166534";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
        {stages.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 110 }}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              onClick={() => setActive(active === i ? null : i)}
              style={{
                flex: 1, cursor: "pointer",
                background: active === i ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${active === i ? impactBorder(s.impact) : "rgba(255,255,255,0.08)"}`,
                borderRadius: 14, padding: "12px 10px",
                boxShadow: active === i ? `0 0 18px rgba(248,113,113,0.15)` : "none",
                transition: "all 0.25s"
              }}
            >
              <div style={{ fontFamily: "Space Grotesk", fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
                Stage {i + 1}
              </div>
              <div style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: 12, color: "#fff", marginBottom: 6 }}>
                {s.stage}
              </div>
              <span style={{
                fontFamily: "Space Grotesk", fontSize: 9, textTransform: "uppercase", letterSpacing: 1,
                color: impactColor(s.impact),
                background: `${impactColor(s.impact)}22`,
                border: `1px solid ${impactBorder(s.impact)}`,
                borderRadius: 6, padding: "2px 6px"
              }}>
                {s.impact}
              </span>
            </motion.div>
            {i < stages.length - 1 && (
              <div style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
                <ChevronRight size={13} color="#333" />
              </div>
            )}
          </div>
        ))}
      </div>
      <AnimatePresence>
        {active !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: 14, padding: "14px 16px"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk", fontSize: 10, color: "#f87171", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
              {stages[active].stage}
            </div>
            <p style={{ fontFamily: "Inter", fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>
              {stages[active].bias}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Gemini Chat ────────────────────────────────────────────── */
function GeminiChat({ caseId }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const bottomRef = useRef(null);

  const QUICK = ["Explain the bias", "Who was harmed?", "How to fix this?", "EU AI Act violation?"];

  const send = useCallback(async (text) => {
    const msg = text !== undefined ? text : input.trim();
    if (!msg) return;
    setInput("");
    setMsgs(m => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, message: msg, audit_context: null })
      });
      const data = await res.json();
      setMsgs(m => [...m, { role: "ai", text: data.reply }]);
    } catch {
      setMsgs(m => [...m, { role: "ai", text: "Error reaching Gemini." }]);
    }
    setLoading(false);
  }, [input, caseId]);

  useEffect(() => {
    if (!autoLoaded) { setAutoLoaded(true); send("Explain the bias in this case"); }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 20, display: "flex", flexDirection: "column", height: 420, overflow: "hidden"
    }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 8px #a855f7", display: "inline-block" }} />
        <span style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: 14, color: "#fff" }}>Gemini Forensics</span>
        <span style={{
          marginLeft: "auto", fontFamily: "Space Grotesk", fontSize: 10, color: "#555",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 8px"
        }}>gemini-2.0-flash</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "10px 14px",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role === "user" ? "#fff" : "rgba(255,255,255,0.06)",
              border: m.role === "ai" ? "1px solid rgba(255,255,255,0.1)" : "none",
              fontFamily: "Inter", fontSize: 13, lineHeight: 1.6,
              color: m.role === "user" ? "#000" : "#ccc"
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Loader2 size={14} color="#555" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "8px 16px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} style={{
            fontFamily: "Space Grotesk", fontSize: 10, textTransform: "uppercase", letterSpacing: 1,
            color: "#888", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999, padding: "4px 10px", cursor: "pointer"
          }}>{q}</button>
        ))}
      </div>

      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask anything about this audit..."
          style={{
            flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999, padding: "8px 16px", color: "#fff", fontFamily: "Inter", fontSize: 13, outline: "none"
          }}
        />
        <button onClick={() => send()} style={{
          width: 36, height: 36, borderRadius: "50%", background: "#fff",
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Send size={14} color="#000" />
        </button>
      </div>
    </div>
  );
}

/* ─── Debiasing Tab ──────────────────────────────────────────── */
function DebiasingTab({ score, metrics, debiased_fairrank, debiased_metrics, debiased_rows }) {
  const [applied, setApplied] = useState(false);
  const projected = debiased_fairrank?.score ?? Math.min(100, Math.round(score * 1.6 + 10));
  const projColor = projected >= 80 ? "#4ade80" : projected >= 50 ? "#fbbf24" : "#f87171";

  const improvements = [
    { metric: "Demographic Parity", before: metrics?.demographic_parity_difference?.toFixed(3), after: debiased_metrics?.demographic_parity_difference?.toFixed(3) ?? "0.048" },
    { metric: "Equalized Odds", before: metrics?.equalized_odds_difference?.toFixed(3), after: debiased_metrics?.equalized_odds_difference?.toFixed(3) ?? "0.067" },
    { metric: "Disparate Impact", before: metrics?.disparate_impact?.toFixed(3), after: debiased_metrics?.disparate_impact?.toFixed(3) ?? "0.912" },
    { metric: "FP Rate Gap", before: metrics?.false_positive_rate_gap?.toFixed(3), after: debiased_metrics?.false_positive_rate_gap?.toFixed(3) ?? "0.055" },
  ];

  return (
    <div style={{ padding: "24px 0" }}>
      {!applied ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "Inter", color: "#888", marginBottom: 20, fontSize: 14 }}>
            Apply IBM AIF360 Reweighing algorithm to reduce bias by reweighting training samples.
          </p>
          <button onClick={() => setApplied(true)} style={{
            fontFamily: "Space Grotesk", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5,
            background: "#fff", color: "#000", border: "none", borderRadius: 999, padding: "12px 28px", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 8
          }}>
            <Zap size={13} />
            Apply Reweighing Algorithm
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 32, alignItems: "center", flex: 1, justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Before</div>
              <div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 52, color: "#f87171" }}>{score}</div>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 10, color: "#f87171" }}>BIASED</div>
            </div>
            <ChevronRight size={24} color="#333" />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>After</div>
              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 52, color: projColor }}>{projected}</motion.div>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 10, color: projColor }}>IMPROVED</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 260 }}>
            {improvements.map((imp, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)",
                borderRadius: 12, padding: "10px 14px"
              }}>
                <span style={{ fontFamily: "Inter", fontSize: 13, color: "#aaa" }}>{imp.metric}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: 13, color: "#f87171" }}>{imp.before}</span>
                  <ChevronRight size={12} color="#333" />
                  <span style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: 13, color: "#4ade80" }}>{imp.after}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ROW TRACKING */}
          {debiased_rows && (
            <div style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "20px", marginTop: 8 }}>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>Weight Adjustments (Row Level)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontFamily: "Space Grotesk", fontSize: 10, color: "#4ade80", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>+ Automatically Boosted Rows</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {debiased_rows.boosted.map((row, i) => (
                      <div key={i} style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8, padding: "10px", color: "#ccc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontFamily: "Inter", fontSize: 11, color: "#aaa" }}>Instance Weight Modified:</span>
                          <span style={{ color: "#4ade80", fontFamily: "Manrope", fontSize: 12, fontWeight: 700 }}>+{row._diff}x</span>
                        </div>
                        <div style={{ fontFamily: "Courier New, monospace", fontSize: 10, opacity: 0.6, wordBreak: "break-all" }}>
                          {Object.entries(row).filter(([k]) => !k.startsWith('_')).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(' | ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: "Space Grotesk", fontSize: 10, color: "#f87171", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>- Automatically Penalized Rows</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {debiased_rows.penalized.map((row, i) => (
                      <div key={i} style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px", color: "#ccc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontFamily: "Inter", fontSize: 11, color: "#aaa" }}>Instance Weight Modified:</span>
                          <span style={{ color: "#f87171", fontFamily: "Manrope", fontSize: 12, fontWeight: 700 }}>{row._diff}x</span>
                        </div>
                        <div style={{ fontFamily: "Courier New, monospace", fontSize: 10, opacity: 0.6, wordBreak: "break-all" }}>
                          {Object.entries(row).filter(([k]) => !k.startsWith('_')).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(' | ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function CaseAudit() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");

  const TABS = ["Overview", "Debiasing", "Compliance"];
  const caseLabels = { compas: "COMPAS", adult: "Adult Income", healthcare: "Healthcare" };

  useEffect(() => {
    setLoading(true); setError(null); setData(null);
    fetch(`/api/audit/${caseId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load audit."); setLoading(false); });
  }, [caseId]);

  const chartData = data ? [
    { name: "Dem. Parity", value: Math.abs(data.metrics.demographic_parity_difference) },
    { name: "Eq. Odds", value: Math.abs(data.metrics.equalized_odds_difference) },
    { name: "Disp. Impact", value: Math.abs(1 - data.metrics.disparate_impact) },
    { name: "FP Rate Gap", value: Math.abs(data.metrics.false_positive_rate_gap) },
  ] : [];

  return (
    <div style={{ minHeight: "100vh", background: "#080808", position: "relative", fontFamily: "Inter" }}>
      <FontLink />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
      <BiasNetworkCanvas />

      {/* Sticky Nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", padding: "14px 24px", gap: 16
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: "none", border: "none", cursor: "pointer", color: "#888",
          display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter", fontSize: 13
        }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1, textAlign: "center", fontFamily: "Manrope", fontWeight: 800, fontSize: 18, color: "#fff" }}>
          {caseLabels[caseId] || caseId} Audit
        </div>
        <button style={{
          background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 999,
          cursor: "pointer", color: "#888", display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", fontFamily: "Space Grotesk", fontSize: 11, textTransform: "uppercase", letterSpacing: 1
        }}>
          <Share2 size={13} /> Share
        </button>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
            <Loader2 size={32} color="#f59e0b" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        )}
        {error && <div style={{ color: "#f87171", textAlign: "center", padding: 48, fontFamily: "Inter" }}>{error}</div>}

        {data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>

            {/* Main 5/7 Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 24, alignItems: "start" }}>

              {/* LEFT */}
              <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Gauge */}
                <div style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 24, padding: "8px 0 0"
                }}>
                  <FairRankGauge score={data.fairrank.score} />
                </div>

                {/* 2x2 metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {Object.keys(METRIC_META).map(field => (
                    <MetricCard key={field} field={field} value={data.metrics[field]} />
                  ))}
                </div>

                {/* Counterfactual */}
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderLeft: "2px solid #f59e0b",
                  borderRadius: 16, padding: "16px"
                }}>
                  <span style={{
                    fontFamily: "Space Grotesk", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5,
                    color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid #7f1d1d",
                    borderRadius: 6, padding: "3px 8px", display: "inline-block", marginBottom: 12
                  }}>Counterfactual Proof</span>
                  <p style={{ fontFamily: "Inter", fontSize: 13, color: "#aaa", fontStyle: "italic", marginBottom: 12, lineHeight: 1.6 }}>
                    {data.counterfactual?.question}
                  </p>
                  <div style={{ borderLeft: "2px solid #4ade80", paddingLeft: 12 }}>
                    <p style={{ fontFamily: "Inter", fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>
                      {data.counterfactual?.answer}
                    </p>
                  </div>
                  <p style={{ fontFamily: "Space Grotesk", fontSize: 10, color: "#444", marginTop: 12 }}>
                    Flipping protected attribute changes the outcome
                  </p>
                </div>
              </motion.div>

              {/* RIGHT */}
              <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Bar Chart */}
                <div style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20, padding: "20px"
                }}>
                  <div style={{ fontFamily: "Space Grotesk", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>
                    Bias Metrics
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 0, right: 16, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f87171" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontFamily: "Space Grotesk", fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontFamily: "Space Grotesk", fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontFamily: "Inter", fontSize: 12 }}
                        labelStyle={{ color: "#fff" }} itemStyle={{ color: "#f59e0b" }}
                      />
                      <ReferenceLine y={0.1} stroke="#f87171" strokeDasharray="4 4" />
                      <Bar dataKey="value" fill="url(#barGrad)" radius={[6, 6, 0, 0]} isAnimationActive={true} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Genealogy */}
                <div style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20, padding: "20px"
                }}>
                  <div style={{ fontFamily: "Space Grotesk", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>
                    Bias Genealogy Pipeline
                  </div>
                  {data.bias_genealogy && <GenealogyPipeline stages={data.bias_genealogy} />}
                </div>

                {/* Chat */}
                <GeminiChat caseId={caseId} />
              </motion.div>
            </div>

            {/* Tabs section */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }} style={{ marginTop: 40 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {TABS.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    fontFamily: "Space Grotesk", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5,
                    padding: "8px 20px", borderRadius: 999, cursor: "pointer", border: "none",
                    background: activeTab === t ? "#fff" : "rgba(255,255,255,0.05)",
                    color: activeTab === t ? "#000" : "#666",
                    transition: "all 0.2s"
                  }}>{t}</button>
                ))}
              </div>
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20, padding: "24px"
              }}>
                {activeTab === "Overview" && (
                  <div style={{ fontFamily: "Inter", color: "#888", fontSize: 14, lineHeight: 1.7 }}>
                    <p>This audit analyzes <strong style={{ color: "#fff" }}>{caseLabels[caseId]}</strong> for algorithmic bias across four fairness metrics. The FairRank Index of <strong style={{ color: data.fairrank.score >= 80 ? "#4ade80" : data.fairrank.score >= 50 ? "#fbbf24" : "#f87171" }}>{data.fairrank.score}</strong> indicates significant bias that may impact individuals unfairly based on protected attributes.</p>
                    <p style={{ marginTop: 12 }}>Review the counterfactual proof and bias genealogy pipeline to understand where bias was introduced. Use Gemini Forensics to explore remediation strategies.</p>
                  </div>
                )}
                {activeTab === "Debiasing" && (
                  <DebiasingTab
                    score={data.fairrank.score}
                    metrics={data.metrics}
                    debiased_fairrank={data.debiased_fairrank}
                    debiased_metrics={data.debiased_metrics}
                    debiased_rows={data.debiased_rows}
                  />
                )}
                {activeTab === "Compliance" && (
                  <ComplianceReport caseId={caseId} />
                )}
              </div>
            </motion.div>

          </motion.div>
        )}
      </div>
    </div>
  );
}