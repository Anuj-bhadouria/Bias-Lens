import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanText, AlertTriangle, CheckCircle, RefreshCcw, Sparkles } from 'lucide-react';

const TextBias = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/analyze/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score > 0.7) return 'bg-red-500';
    if (score > 0.3) return 'bg-amber-500';
    return 'bg-green-500';
  };

  // Helper to highlight words in the original text
  const HighlightedText = ({ original, words }) => {
    if (!words || words.length === 0) return <span>{original}</span>;
    const regex = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = original.split(regex);

    return (
      <p className="leading-relaxed text-white/80">
        {parts.map((part, i) => 
          words.some(w => w.toLowerCase() === part.toLowerCase()) ? (
            <span key={i} className="bg-red-500/20 text-red-400 border-b border-red-500/50 px-0.5 rounded-sm">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="font-manrope text-5xl font-extrabold mb-4"
          >
            Text Bias Analyzer
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-[#888] text-lg font-inter"
          >
            Paste any text — job posting, policy, document — and detect hidden linguistic bias.
          </motion.p>
        </header>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* LEFT PANEL: Input */}
          <section className="space-y-6">
            <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-3xl p-1 overflow-hidden focus-within:border-white/20 transition-colors">
              <textarea 
                className="w-full min-h-[400px] bg-transparent p-8 text-lg font-inter resize-none focus:outline-none placeholder:text-white/10"
                placeholder="Paste job description or any text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="absolute bottom-6 right-8 text-[10px] font-space tracking-widest text-[#444] uppercase">
                {text.length} Characters
              </div>
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="w-full bg-white text-black py-5 rounded-full font-space font-bold tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCcw className="animate-spin" size={20} /> : <ScanText size={20} />}
              {loading ? "Analyzing Context..." : "Analyze Text"}
            </button>
          </section>

          {/* RIGHT PANEL: Results */}
          <section className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-3xl p-12"
                >
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-white/20">
                    <ScanText size={32} />
                  </div>
                  <p className="font-space text-xs tracking-[0.2em] text-[#555] uppercase">Waiting for input</p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Verdict Card */}
                  <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <p className="font-space text-[10px] tracking-widest text-[#555] uppercase mb-2">Analysis Verdict</p>
                        <div className={`flex items-center gap-2 font-space text-2xl font-bold tracking-tight ${result.is_biased ? 'text-red-400' : 'text-green-400'}`}>
                          {result.is_biased ? <AlertTriangle size={24}/> : <CheckCircle size={24}/>}
                          {result.is_biased ? 'BIASED' : 'CLEAN'}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-space text-[10px] tracking-widest text-[#555] uppercase mb-2">Severity</p>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          result.severity === 'High' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                        }`}>
                          {result.severity}
                        </span>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="mb-8">
                      <div className="flex justify-between text-[10px] font-space tracking-widest text-[#555] uppercase mb-3">
                        <span>Bias Intensity</span>
                        <span>{(result.bias_score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} animate={{ width: `${result.bias_score * 100}%` }}
                          className={`h-full ${getScoreColor(result.bias_score)}`}
                        />
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {result.categories.map((cat, i) => (
                        <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-space uppercase tracking-wider text-white/60">
                          {cat}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-4">
                       <h4 className="font-space text-[10px] tracking-widest text-[#555] uppercase">Detected Markers</h4>
                       <div className="flex flex-wrap gap-2">
                         {result.biased_words.map((word, i) => (
                           <span key={i} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                             {word}
                           </span>
                         ))}
                       </div>
                    </div>
                  </div>

                  {/* Highlighting Card */}
                  <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8">
                    <h4 className="font-space text-[10px] tracking-widest text-[#555] uppercase mb-6">Highlighted Analysis</h4>
                    <HighlightedText original={text} words={result.biased_words} />
                  </div>

                  {/* Debiased Suggestion */}
                  <div className="bg-green-500/[0.02] border border-green-500/20 rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
                    <h4 className="font-space text-[10px] tracking-widest text-green-500 uppercase mb-4 flex items-center gap-2">
                      <Sparkles size={12} /> Suggested Neutral Alternative
                    </h4>
                    <p className="text-white/90 text-sm leading-relaxed italic">
                      {result.debiased_text}
                    </p>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TextBias;