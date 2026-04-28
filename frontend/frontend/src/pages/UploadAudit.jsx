import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';





// --- REUSABLE GAUGE COMPONENT (From CaseAudit) ---
const FairRankGauge = ({ score }) => {
  const getScoreColor = (s) => {
    if (s < 50) return '#f87171';
    if (s < 80) return '#fbbf24';
    return '#4ade80';
  };
  const color = getScoreColor(score);
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="relative flex flex-col items-center justify-center h-48 w-full">
      <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round" />
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: score / 100 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <motion.g
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ originX: "100px", originY: "100px" }}
        >
          <line x1="100" y1="100" x2="100" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="100" r="4" fill="white" />
        </motion.g>
      </svg>
      <div className="absolute bottom-2 text-center">
        <span className="font-manrope text-4xl font-extrabold">{score}</span>
        <p className="font-space text-[8px] tracking-[0.2em] text-[#888] uppercase">FairRank</p>
      </div>
    </div>
  );
};

const UploadAudit = () => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Config, 3: Loading, 4: Results
  const [file, setFile] = useState(null);
  const [config, setConfig] = useState({
    label: '',
    attribute: '',
    privileged: '',
    unprivileged: ''
  });
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setStep(2);
    } else {
      alert("Please upload a valid CSV file.");
    }
  };

  const runAudit = async () => {
    setStep(3);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', config.label);
    formData.append('attribute', config.attribute);
    formData.append('privileged', config.privileged);
    formData.append('unprivileged', config.unprivileged);

    try {
      const response = await fetch('http://localhost:8000/audit/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error("Processing failed");
      const data = await response.json();
      setResults(data);
      setStep(4);
    } catch (err) {
      setError(err.message);
      setStep(2);
    }
  };

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white font-inter py-32 px-6">
      <div className="max-w-3xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-12 text-center">
          <h1 className="font-manrope text-5xl font-extrabold tight-tracking mb-4">Audit Your Dataset</h1>
          <p className="text-[#888] text-lg">Upload a CSV and BiasLens will compute fairness metrics automatically.</p>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <motion.div 
              key="step1" {...containerVariants}
              className="border-2 border-dashed border-white/10 rounded-3xl p-20 flex flex-col items-center justify-center bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer"
              onClick={() => fileInputRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile.type === "text/csv") { setFile(droppedFile); setStep(2); }
              }}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept=".csv" />
              <div className="bg-white/5 p-6 rounded-full mb-6">
                <Upload className="text-white" size={40} />
              </div>
              <p className="text-xl font-medium mb-2">Drop your CSV here</p>
              <p className="text-[#555] font-space text-xs tracking-widest uppercase">or click to browse files</p>
            </motion.div>
          )}

          {/* STEP 2: CONFIG */}
          {step === 2 && (
            <motion.div key="step2" {...containerVariants} className="space-y-8">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText className="text-[#888]" />
                  <div>
                    <p className="text-sm font-bold">{file.name}</p>
                    <p className="text-xs text-[#555]">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button onClick={() => {setFile(null); setStep(1);}} className="text-[#555] hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-space text-[10px] tracking-widest uppercase text-[#888]">Label Column (Outcome)</label>
                  <input 
                    type="text" placeholder="e.g. is_hired" 
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 ring-white/30"
                    onChange={(e) => setConfig({...config, label: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-space text-[10px] tracking-widest uppercase text-[#888]">Sensitive Attribute</label>
                  <input 
                    type="text" placeholder="e.g. gender" 
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 ring-white/30"
                    onChange={(e) => setConfig({...config, attribute: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-space text-[10px] tracking-widest uppercase text-[#888]">Privileged Group Value</label>
                  <input 
                    type="text" placeholder="e.g. Male" 
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 ring-white/30"
                    onChange={(e) => setConfig({...config, privileged: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-space text-[10px] tracking-widest uppercase text-[#888]">Unprivileged Group Value</label>
                  <input 
                    type="text" placeholder="e.g. Female" 
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 ring-white/30"
                    onChange={(e) => setConfig({...config, unprivileged: e.target.value})}
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm flex items-center gap-2"><AlertCircle size={16}/> {error}</p>}

              <button 
                onClick={runAudit}
                className="w-full bg-white text-black py-4 rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Run Audit
              </button>
            </motion.div>
          )}

          {/* STEP 3: LOADING */}
          {step === 3 && (
            <motion.div key="step3" {...containerVariants} className="flex flex-col items-center justify-center py-20 space-y-6">
              <Loader2 className="text-white animate-spin" size={48} />
              <div className="text-center">
                <p className="text-xl font-manrope font-bold">Computing fairness metrics...</p>
                <p className="text-[#555] font-space text-xs tracking-widest uppercase mt-2">Analyzing statistical parities and bias vectors</p>
              </div>
            </motion.div>
          )}

          {/* STEP 4: RESULTS */}
          {step === 4 && results && (
            <motion.div key="step4" {...containerVariants} className="space-y-8">
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-10 flex flex-col md:flex-row items-center gap-12">
                <FairRankGauge score={results.score} />
                <div className="grid grid-cols-2 gap-4 flex-grow">
                  {[
                    { label: "Disp. Impact", val: results.metrics.di },
                    { label: "Stat. Parity", val: results.metrics.sp },
                    { label: "Eq. Odds", val: results.metrics.eo },
                    { label: "Avg Odds Diff", val: results.metrics.aod }
                  ].map((m, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                      <p className="font-space text-[8px] tracking-widest uppercase text-[#888] mb-1">{m.label}</p>
                      <p className="text-xl font-bold">{m.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* DEBIASING SUGGESTIONS */}
              <div className="space-y-4">
                <h3 className="font-manrope text-2xl font-bold flex items-center gap-2">
                  <ShieldAlert className="text-amber-500" /> Mitigation Strategies
                </h3>
                <div className="grid gap-4">
                  {results.suggestions.map((s, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.08] p-5 rounded-2xl flex gap-4">
                      <div className="bg-white/5 h-fit p-2 rounded-lg">
                        <CheckCircle2 size={18} className="text-[#888]" />
                      </div>
                      <div>
                        <p className="font-bold mb-1">{s.title}</p>
                        <p className="text-sm text-[#888] leading-relaxed">{s.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-grow border border-white/20 py-4 rounded-full font-bold hover:bg-white/5 transition-all">
                  Upload New Dataset
                </button>
                <Link to="/" className="flex-grow bg-white text-black py-4 rounded-full font-bold text-center hover:bg-white/90 transition-all">
                  Back to Dashboard
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* INFO FOOTER */}
        <div className="mt-20 pt-8 border-t border-white/5 flex items-start gap-4 text-[#444]">
          <Info size={20} className="shrink-0 mt-1" />
          <p className="text-xs leading-relaxed">
            BiasLens does not store your uploaded datasets. Files are processed in volatile memory and purged immediately after the session expires. Our audit engine uses AIF360 standards for metric calculation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadAudit;