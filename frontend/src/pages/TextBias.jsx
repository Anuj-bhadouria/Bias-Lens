import { useState, useRef } from "react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanText, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const FontLink = () => (
  <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500&family=Space+Grotesk:wght@400;500;600&display=swap');`}</style>
);

function BiasNetworkCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const N = 50;
    const nodes = Array.from({ length: N }, () => {
      const r = Math.random();
      const color = r < 0.7 ? `rgba(248,113,113,${0.4 + Math.random() * 0.3})`
        : r < 0.9 ? `rgba(251,191,36,${0.3 + Math.random() * 0.3})`
        : `rgba(255,255,255,${0.2 + Math.random() * 0.15})`;
      return { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, r: 2 + Math.random() * 3, color };
    });
    let pulseConn = null, pulseProgress = 0;
    const pickPulse = () => {
      const pairs = [];
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y; if (Math.sqrt(dx*dx+dy*dy) < 180) pairs.push([i,j]); }
      if (pairs.length) { pulseConn = pairs[Math.floor(Math.random() * pairs.length)]; pulseProgress = 0; }
    };
    pickPulse();
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < N; i++) for (let j = i+1; j < N; j++) { const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,dist=Math.sqrt(dx*dx+dy*dy); if(dist<180){ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[j].x,nodes[j].y);ctx.strokeStyle=nodes[i].color.replace(/[\d.]+\)$/,"0.12)");ctx.lineWidth=0.8;ctx.stroke();} }
      if (pulseConn) { const [ai,bi]=pulseConn,px=nodes[ai].x+(nodes[bi].x-nodes[ai].x)*pulseProgress,py=nodes[ai].y+(nodes[bi].y-nodes[ai].y)*pulseProgress; ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fillStyle=nodes[ai].color;ctx.fill(); pulseProgress+=0.012; if(pulseProgress>1){pulseConn=null;setTimeout(pickPulse,3000);} }
      nodes.forEach(n=>{ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fillStyle=n.color;ctx.fill();n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>canvas.width)n.vx*=-1;if(n.y<0||n.y>canvas.height)n.vy*=-1;});
      const vg=ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*0.1,canvas.width/2,canvas.height/2,canvas.height*0.75); vg.addColorStop(0,"transparent");vg.addColorStop(1,"#080808");ctx.fillStyle=vg;ctx.fillRect(0,0,canvas.width,canvas.height);
      animId=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }} />;
}

function HighlightedText({ text, biasedWords }) {
  if (!biasedWords || biasedWords.length === 0) return <span style={{ fontFamily:"Inter", fontSize:13, color:"#aaa", lineHeight:1.7 }}>{text}</span>;
  const regex = new RegExp(`\\b(${biasedWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")})\\b`, "gi");
  const parts = text.split(regex);
  return (
    <span style={{ fontFamily:"Inter", fontSize:13, color:"#aaa", lineHeight:1.7 }}>
      {parts.map((part, i) =>
        biasedWords.some(w => w.toLowerCase() === part.toLowerCase())
          ? <span key={i} style={{ background:"rgba(248,113,113,0.2)", color:"#f87171", borderRadius:4, padding:"0 3px" }}>{part}</span>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

const SAMPLES = [
  "We are looking for a young, aggressive salesman to dominate our territory. Must be able to man the booth at trade shows.",
  "Seeking a strong chairman to lead our board. He should have experience managing large teams of men.",
  "The ideal candidate is a native English speaker who fits our company culture and can hit the ground running.",
];

export default function TextBias() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("http://localhost:8000/analyze/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to reach backend.");
    }
    setLoading(false);
  };

  const scoreColor = (s) => s > 0.6 ? "#f87171" : s > 0.3 ? "#fbbf24" : "#4ade80";

  return (
    <div style={{ minHeight:"100vh", background:"#080808", position:"relative", fontFamily:"Inter" }}>
      <FontLink />
      <style>{`* { box-sizing:border-box; margin:0; padding:0; } ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}`}</style>
      <BiasNetworkCanvas />

      {/* Nav */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(24px)", borderBottom:"1px solid rgba(255,255,255,0.05)", padding:"14px 32px", display:"flex", alignItems:"center" }}>
        <span style={{ fontFamily:"Manrope", fontWeight:800, fontSize:16, color:"#fff" }}>BiasLens</span>
        <span style={{ margin:"0 12px", color:"#333" }}>/</span>
        <span style={{ fontFamily:"Space Grotesk", fontSize:12, color:"#888", textTransform:"uppercase", letterSpacing:1.5 }}>Text Analysis</span>
      </div>

      <div style={{ position:"relative", zIndex:10, maxWidth:1280, margin:"0 auto", padding:"48px 24px" }}>
        {/* Header */}
        <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7, ease:[0.22,1,0.36,1] }} style={{ marginBottom:40 }}>
          <div style={{ fontFamily:"Space Grotesk", fontSize:11, color:"#f59e0b", textTransform:"uppercase", letterSpacing:2, marginBottom:12 }}>
            Text Bias Analyzer
          </div>
          <h1 style={{ fontFamily:"Manrope", fontWeight:800, fontSize:40, color:"#fff", lineHeight:1.1, marginBottom:12 }}>
            Detect Bias in Any Text
          </h1>
          <p style={{ fontFamily:"Inter", fontSize:15, color:"#666", maxWidth:520 }}>
            Paste a job description, policy document, or article. We'll surface biased language and generate a neutral alternative.
          </p>
        </motion.div>

        {/* Two-panel layout */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, alignItems:"start" }}>

          {/* LEFT — Input */}
          <motion.div initial={{ opacity:0, y:32 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7, ease:[0.22,1,0.36,1] }}
            style={{ display:"flex", flexDirection:"column", gap:16 }}>

            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:20 }}>
              <div style={{ fontFamily:"Space Grotesk", fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:1.5, marginBottom:12 }}>Input Text</div>
              <div style={{ position:"relative" }}>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Paste a job description, policy, article, or any text to analyze for bias..."
                  style={{
                    width:"100%", minHeight:220, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:14, padding:"14px 16px", color:"#fff", fontFamily:"Inter", fontSize:13,
                    lineHeight:1.7, outline:"none", resize:"vertical", color:"#ccc"
                  }}
                />
                <div style={{ position:"absolute", bottom:10, right:14, fontFamily:"Space Grotesk", fontSize:10, color:"#444" }}>
                  {text.length} chars
                </div>
              </div>

              <button
                onClick={analyze}
                disabled={loading || !text.trim()}
                style={{
                  marginTop:14, width:"100%", padding:"12px", borderRadius:999, border:"none", cursor: loading || !text.trim() ? "not-allowed" : "pointer",
                  background: loading || !text.trim() ? "rgba(255,255,255,0.1)" : "#fff",
                  color: loading || !text.trim() ? "#444" : "#000",
                  fontFamily:"Space Grotesk", fontSize:11, textTransform:"uppercase", letterSpacing:1.5,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s"
                }}
              >
                {loading ? <><Loader2 size={13} style={{ animation:"spin 1s linear infinite" }} /> Analyzing...</> : <><ScanText size={13} /> Analyze Text</>}
              </button>
            </div>

            {/* Sample texts */}
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:20 }}>
              <div style={{ fontFamily:"Space Grotesk", fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:1.5, marginBottom:12 }}>Try a Sample</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {SAMPLES.map((s, i) => (
                  <button key={i} onClick={() => setText(s)} style={{
                    background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:12, padding:"10px 14px", cursor:"pointer", textAlign:"left",
                    fontFamily:"Inter", fontSize:12, color:"#777", lineHeight:1.5, transition:"all 0.2s"
                  }}
                  onMouseEnter={e => { e.target.style.background="rgba(255,255,255,0.06)"; e.target.style.color="#aaa"; }}
                  onMouseLeave={e => { e.target.style.background="rgba(255,255,255,0.03)"; e.target.style.color="#777"; }}
                  >
                    {s.length > 90 ? s.slice(0, 90) + "…" : s}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Results */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <AnimatePresence mode="wait">
              {!result && !loading && !error && (
                <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  style={{ background:"rgba(255,255,255,0.02)", border:"1px dashed rgba(255,255,255,0.07)", borderRadius:20, padding:48, textAlign:"center" }}>
                  <ScanText size={32} color="#222" style={{ margin:"0 auto 16px" }} />
                  <p style={{ fontFamily:"Inter", fontSize:13, color:"#444" }}>Results will appear here after analysis.</p>
                </motion.div>
              )}

              {error && (
                <motion.div key="error" initial={{ opacity:0 }} animate={{ opacity:1 }}
                  style={{ background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:20, padding:24, textAlign:"center" }}>
                  <AlertCircle size={24} color="#f87171" style={{ margin:"0 auto 12px" }} />
                  <p style={{ fontFamily:"Inter", fontSize:13, color:"#f87171" }}>{error}</p>
                </motion.div>
              )}

              {result && (
                <motion.div key="result" initial={{ opacity:0, x:24 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}
                  style={{ display:"flex", flexDirection:"column", gap:16 }}>

                  {/* Verdict + score */}
                  <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:20 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                      <span style={{
                        fontFamily:"Space Grotesk", fontSize:13, fontWeight:600, textTransform:"uppercase", letterSpacing:2,
                        color: result.is_biased ? "#f87171" : "#4ade80",
                        background: result.is_biased ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)",
                        border: `1px solid ${result.is_biased ? "#7f1d1d" : "#166534"}`,
                        borderRadius:8, padding:"6px 16px"
                      }}>
                        {result.is_biased ? "⚠ Biased" : "✓ Clean"}
                      </span>
                      <span style={{ fontFamily:"Manrope", fontWeight:800, fontSize:28, color: scoreColor(result.bias_score) }}>
                        {(result.bias_score * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Score bar */}
                    <div style={{ fontFamily:"Space Grotesk", fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>Bias Score</div>
                    <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:999, overflow:"hidden" }}>
                      <motion.div
                        initial={{ width:0 }}
                        animate={{ width:`${result.bias_score * 100}%` }}
                        transition={{ duration:1, ease:[0.22,1,0.36,1] }}
                        style={{ height:"100%", background:`linear-gradient(90deg, #f59e0b, ${scoreColor(result.bias_score)})`, borderRadius:999 }}
                      />
                    </div>
                  </div>

                  {/* Biased words */}
                  {result.biased_words?.length > 0 && (
                    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:20 }}>
                      <div style={{ fontFamily:"Space Grotesk", fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:1.5, marginBottom:12 }}>
                        Flagged Words ({result.biased_words.length})
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {result.biased_words.map((w, i) => (
                          <span key={i} style={{
                            fontFamily:"Space Grotesk", fontSize:11, color:"#f87171",
                            background:"rgba(248,113,113,0.1)", border:"1px solid #7f1d1d",
                            borderRadius:999, padding:"4px 12px"
                          }}>{w}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Original with highlights */}
                  <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:20 }}>
                    <div style={{ fontFamily:"Space Grotesk", fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:1.5, marginBottom:12 }}>
                      Original — Annotated
                    </div>
                    <HighlightedText text={text} biasedWords={result.biased_words} />
                  </div>

                  {/* Debiased */}
                  {result.debiased_text && (
                    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderLeft:"2px solid #4ade80", borderRadius:20, padding:20 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                        <CheckCircle size={14} color="#4ade80" />
                        <span style={{ fontFamily:"Space Grotesk", fontSize:10, color:"#4ade80", textTransform:"uppercase", letterSpacing:1.5 }}>
                          Debiased Version
                        </span>
                      </div>
                      <p style={{ fontFamily:"Inter", fontSize:13, color:"#aaa", lineHeight:1.7 }}>
                        {result.debiased_text}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}