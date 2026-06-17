import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Upload,
  Sparkles,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Mail,
  Share2,
  TreePine,
  RotateCcw,
  BadgeAlert,
  ArrowRight,
  Info
} from "lucide-react";

import { type ClassificationResult, type DashboardStats as StatsType } from "./types";
import CanvasBackground from "./components/CanvasBackground";
import DashboardStats from "./components/DashboardStats";
import EcoGuide from "./components/EcoGuide";

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Local clock state
  const [currentTime, setCurrentTime] = useState<string>("");

  // Stats state (holds current counts)
  const [stats, setStats] = useState<StatsType>({
    wasteClassified: 124500,
    recyclableItems: 82300,
    tonsDiverted: 45.6,
    carbonReduced: 18200
  });

  // AI Classification states
  const [itemNameInput, setItemNameInput] = useState<string>("");
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [isFallbackResult, setIsFallbackResult] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Preset triggers for rich exploratory sandbox
  const presets = [
    { name: "Plastic Water Bottle", desc: "PET drink packaging" },
    { name: "Apple Core Scraps", desc: "Compostable wet organic food" },
    { name: "AA Lithium Battery", desc: "Corrosive chemical cell" },
    { name: "Shattered LED Lightbulb", desc: "Hazardous electronic part" }
  ];

  // Contact form submission mock
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactSuccess, setContactSuccess] = useState<boolean>(false);

  // Synchronize local time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize document theme class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Fetch initial/refreshed statistics from the Express server on start
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (e) {
      console.warn("Could not connect to live stats backend, using persisted state instead.", e);
    }
  };

  // Convert uploaded image file to standard Base64 DataUrl with dynamic compression
  const handleFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Dynamic resizing setup - Maximum width or height of 800px
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to highly optimized JPEG image with 0.8 quality fraction
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setBase64Image(compressedDataUrl);
          setImageName(file.name);
          setErrorMsg(null);
        } else {
          // Fallback if 2d context initialization failed
          setBase64Image(reader.result as string);
          setImageName(file.name);
          setErrorMsg(null);
        }
      };
      img.onerror = () => {
        setErrorMsg("Failed to decode uploaded image structure.");
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      setErrorMsg("Error reading uploaded image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearImage = () => {
    setBase64Image(null);
    setImageName(null);
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Handle classification process API request
  const handleClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemNameInput.trim() && !base64Image) {
      setErrorMsg("Please provide a name or upload an image of the waste item.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);
    setIsFallbackResult(false);

    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemNameInput,
          image: base64Image
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process classification request.");
      }

      if (data.success && data.result) {
        setResult(data.result);
        setIsFallbackResult(!!data.isFallback);
        // Refresh stats on successful classification to fetch updated numbers from the backend
        fetchStats();
      } else {
        throw new Error("Unable to segregate item.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Preset click helper
  const selectPreset = (itemText: string) => {
    setItemNameInput(itemText);
    setErrorMsg(null);
  };

  return (
    <div className="relative min-h-screen flex flex-col pt-16 font-sans bg-emerald-50 text-on-surface transition-all duration-300 dark:bg-[#06160e] dark:text-[#d4e7d9]">
      {/* Dynamic WebGL Shader background */}
      <div className="fixed inset-0 overflow-hidden z-0">
        <CanvasBackground isDark={isDark} />
      </div>

      {/* Header Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/75 dark:bg-[#031109]/75 backdrop-blur-xl border-b border-emerald-500/15 dark:border-emerald-400/10 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center px-4 md:px-10 h-16 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <TreePine className="w-6 h-6 text-emerald-600 dark:text-primary animate-pulse" />
            <span className="font-display font-extrabold text-xl tracking-tight text-emerald-800 dark:text-primary">
              EcoSort <span className="text-emerald-500 dark:text-emerald-300">AI</span>
            </span>
          </div>

          <nav className="hidden md:flex gap-8 items-center text-sm font-medium">
            <a href="#hero" className="text-emerald-800/80 dark:text-[#bbcabf] hover:text-[#006c49] dark:hover:text-primary transition-all">Home</a>
            <a href="#analysis" className="text-emerald-800/80 dark:text-[#bbcabf] hover:text-[#006c49] dark:hover:text-primary transition-all">AI Classifier</a>
            <a href="#education" className="text-emerald-800/80 dark:text-[#bbcabf] hover:text-[#006c49] dark:hover:text-primary transition-all">Eco-Guide</a>
            <a href="#stats-deck" className="text-emerald-800/80 dark:text-[#bbcabf] hover:text-[#006c49] dark:hover:text-primary transition-all">Impact Live</a>
            <a href="#sdg-framework" className="text-emerald-800/80 dark:text-[#bbcabf] hover:text-[#006c49] dark:hover:text-primary transition-all">SDG 12</a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Live Clock HUD */}
            {currentTime && (
              <span className="hidden sm:inline-block font-mono text-[11px] tracking-wider py-1 px-3.5 rounded-full bg-emerald-100/60 text-emerald-800 border border-emerald-500/10 dark:bg-emerald-950/40 dark:text-emerald-300">
                {currentTime}
              </span>
            )}
            {/* Theme Toggle Trigger */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl bg-white dark:bg-emerald-950/40 border border-emerald-500/15 dark:border-emerald-400/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/70 transition-all text-emerald-700 dark:text-emerald-300"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              id="theme-toggle-btn"
            >
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="relative z-10 grow">
        
        {/* HERO SECTION */}
        <section id="hero" className="max-w-7xl mx-auto px-4 md:px-10 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-primary" />
            AI-DRIVEN ECOLOGICAL ANALYSIS
          </div>

          <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-on-surface dark:text-white max-w-4xl mx-auto leading-tight mb-6">
            AI-Powered <span className="text-[#10b981] dark:text-primary">Waste Segregation</span> Companion
          </h1>

          <p className="text-base md:text-lg text-on-surface-variant dark:text-emerald-100/70 max-w-2xl mx-auto leading-relaxed mb-10 font-light">
            Empower your home or enterprise toward zero landfill goals. Take a snapshot or input items, and let our multi-modal intelligence instruct you on circular classification, eco-impact, and guidelines.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#analysis"
              className="w-full sm:w-auto text-center px-8 py-3.5 rounded-xl font-bold bg-[#10b981] text-white hover:bg-emerald-600 transition-all hover:scale-[1.02] shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95"
            >
              Examine Waste Now
            </a>
            <a
              href="#education"
              className="w-full sm:w-auto text-center px-8 py-3.5 rounded-xl font-bold bg-white/80 dark:bg-emerald-950/30 border border-emerald-500/10 dark:border-emerald-400/15 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all hover:scale-[1.02] active:scale-95"
            >
              Browse Sorting Guide
            </a>
          </div>
        </section>

        {/* CLASSIFICATION WORKBENCH AND RESULT SECTION */}
        <section id="analysis" className="max-w-7xl mx-auto px-4 md:px-10 py-10">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* Classify Form Column */}
            <div className="lg:col-span-7 glass-card p-6 md:p-10 rounded-3xl border border-emerald-500/10 dark:border-emerald-400/10 flex flex-col gap-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-on-surface dark:text-white tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-primary text-2xl">center_focus_strong</span>
                  Analyze New Item
                </h2>
                <p className="text-xs text-on-surface-variant dark:text-emerald-100/60 mt-1 font-light">
                  Type a standard item name or drag & drop high-resolution photos to run multi-modal AI classification.
                </p>
              </div>

              {/* Warning HUD for missing API Keys (Informed to user gracefully) */}
              {!import.meta.env.VITE_GEMINI_API_KEY && (
                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-500/20 text-orange-850 dark:text-orange-300 flex items-start gap-3 text-xs leading-relaxed">
                  {/* <Info className="w-4.5 h-4.5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Sandbox API Environment Note:</span> Make sure your Gemini Key is attached inside AI Studio’s <span className="font-semibold">Secrets</span> panel under <code className="bg-orange-100 dark:bg-orange-950/45 px-1 rounded font-mono">GEMINI_API_KEY</code> to enable production-grade waste audits.
                  </div> */}
                </div>
              )}

              <form onSubmit={handleClassify} className="space-y-6">
                
                {/* Text descriptor input field */}
                <div>
                  <label htmlFor="item-name" className="block text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-2">
                    Waste Material / Name Description
                  </label>
                  <input
                    id="item-name"
                    type="text"
                    value={itemNameInput}
                    onChange={(e) => setItemNameInput(e.target.value)}
                    placeholder="e.g., Polyethylene bottle, stale vegetable peels, lead-acid battery..."
                    className="w-full bg-emerald-50/20 dark:bg-emerald-950/20 border border-emerald-500/10 dark:border-emerald-400/10 focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] rounded-xl px-4 py-3 text-sm transition-all focus:outline-none placeholder:text-emerald-800/40 dark:placeholder:text-[#bbcabf]/30"
                  />
                </div>

                {/* File/Image Upload area */}
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-2">
                    Visual Evidence Capture (Optional)
                  </label>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 md:p-8 cursor-pointer transition-all ${
                      isDragging
                        ? "border-[#10b981] bg-emerald-500/10"
                        : "border-emerald-500/15 dark:border-emerald-400/15 hover:border-[#10b981] hover:bg-emerald-500/5 dark:hover:bg-emerald-950/20"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      id="image-file-input"
                    />

                    {/* Previews based on base64 data state */}
                    {base64Image ? (
                      <div className="relative flex flex-col items-center gap-3 w-full max-w-xs text-center z-10 p-2">
                        <img
                          src={base64Image}
                          alt="Waste preview snippet"
                          className="w-32 h-32 object-contain rounded-lg border border-emerald-500/10 shadow-sm"
                        />
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 truncate max-w-[200px]">
                            {imageName || "Captured image"}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearImage();
                            }}
                            className="text-[10px] text-red-500 hover:text-red-400 transition-colors underline font-medium"
                          >
                            Remove photo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-emerald-800 dark:text-[#bbcabf]">
                          Drag & drop photos or <span className="text-[#10b981] underline">browse</span>
                        </p>
                        <p className="text-[10px] text-on-surface-variant dark:text-emerald-100/60 mt-1">
                          Supports JPG, PNG, WEBP (Max 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preset Sandbox selector */}
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-2">
                    Inspect Sandbox Presets
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectPreset(p.name)}
                        className="text-left p-2 rounded-xl bg-white/70 dark:bg-emerald-950/20 border border-emerald-500/10 dark:border-emerald-400/10 hover:border-[#10b981] dark:hover:border-primary hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{p.name}</p>
                        <p className="text-[9px] text-on-surface-variant dark:text-emerald-100/60 truncate">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-500/20 text-red-700 dark:text-red-300 rounded-xl text-xs flex gap-2 items-center">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Classify Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#10b981] dark:bg-primary text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all disabled:opacity-50 select-none flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 duration-200"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      Classifying with EcoSort AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4.5 h-4.5" />
                      Audit with AI Segregation
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* AI Results Column */}
            <div className="lg:col-span-5 flex flex-col h-full justify-stretch">
              {result ? (
                <div className="glass-card p-6 md:p-10 rounded-3xl border-2 border-emerald-500/20 dark:border-primary/20 flex flex-col gap-6 animate-fade-in animate-duration-500 self-stretch">
                  
                  {isFallbackResult && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 text-amber-850 dark:text-amber-300 text-[11px] flex items-start gap-2 leading-relaxed">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Resilient Fallback Mode:</span> Local analytical heuristics were applied due to temporary upstream AI model demand spikes. Feel free to re-submit in a few seconds!
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`inline-block px-3 py-1 text-[10px] font-mono tracking-wider font-bold rounded-full uppercase mb-2 ${
                        result.category === "Dry Waste"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-500/20"
                          : result.category === "Wet Waste"
                          ? "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-500/20"
                          : result.category === "E-Waste"
                          ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-500/20"
                          : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-500/20"
                      }`}>
                        {result.category}
                      </span>
                      <h3 className="font-display text-2xl font-extrabold text-on-surface dark:text-white leading-tight">
                        {result.itemName}
                      </h3>
                    </div>
                    <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
                  </div>

                  <div className="space-y-5">
                    
                    {/* Confidence percentage bar */}
                    <div>
                      <div className="flex justify-between font-mono text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                        <span>CONFIDENCE FACTOR</span>
                        <span>{result.confidenceScore}%</span>
                      </div>
                      <div className="h-2 w-full bg-emerald-100 dark:bg-emerald-950/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-[#10b981] rounded-full transition-all duration-1000"
                          style={{ width: `${result.confidenceScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Ecological save score / circular index */}
                    <div>
                      <div className="flex justify-between font-mono text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                        <span>ECO IMPACT RATING</span>
                        <span>{result.ecoImpactScore}/100</span>
                      </div>
                      <div className="h-2 w-full bg-emerald-100 dark:bg-emerald-950/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#10b981] to-teal-400 rounded-full transition-all duration-1000"
                          style={{ width: `${result.ecoImpactScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-2">
                      <div className="p-4 rounded-2xl bg-white/70 dark:bg-emerald-950/30 border border-emerald-500/5 dark:border-emerald-400/5 flex flex-col gap-1">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold">
                          RECOMMENDED DISPOSAL ROUTE
                        </span>
                        <p className="text-sm text-on-surface dark:text-white leading-relaxed">
                          {result.recommendation}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/70 dark:bg-emerald-950/30 border border-emerald-500/5 dark:border-emerald-400/5 flex flex-col gap-1">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold">
                          CIRCULAR SUSTAINABILITY TIP
                        </span>
                        <p className="text-sm text-on-surface dark:text-white leading-relaxed italic">
                          {result.sustainabilityTip}
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Reset/Discard triggers */}
                  <div className="pt-2 border-t border-emerald-500/5 flex justify-between items-center">
                    <p className="text-[10px] text-on-surface-variant dark:text-emerald-100/55">
                      Stat incremented synchronously.
                    </p>
                    <button
                      onClick={() => {
                        setResult(null);
                        setItemNameInput("");
                        clearImage();
                      }}
                      className="text-xs font-semibold text-emerald-600 dark:text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Classify another
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-8 md:p-12 rounded-3xl border border-emerald-500/10 dark:border-emerald-400/10 flex flex-col items-center justify-center text-center gap-4 h-full min-h-[380px] self-stretch">
                  <div className="w-16 h-16 rounded-full bg-emerald-100/60 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-on-surface dark:text-white">
                      Awaiting Circular Analysis
                    </h3>
                    <p className="text-xs text-on-surface-variant dark:text-emerald-100/60 max-w-sm mt-1.5 leading-relaxed font-light">
                      Please enter a material name descriptor or snap a picture on the left panel to trigger comprehensive AI waste assessment.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* COMPREHENSIVE REUSABLE EDUCATIONAL COMPANION SECTION */}
        <section className="py-20 px-4 md:px-10 bg-white/40 dark:bg-[#031109]/30 backdrop-blur-sm">
          <EcoGuide />
        </section>

        {/* COMMITMENT TO UN SDG 12 FRAMEWORK HERO */}
        <section id="sdg-framework" className="max-w-7xl mx-auto px-4 md:px-10 py-20">
          <div className="glass-card rounded-[2.5rem] overflow-hidden grid lg:grid-cols-2 items-stretch border border-emerald-500/10 dark:border-emerald-400/10">
            {/* Environmental visual graphic panel with referral info */}
            <div className="relative min-h-[300px] lg:min-h-auto flex items-center justify-center bg-emerald-900/40 p-10 animate-fade-in">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950 to-emerald-800/10 mix-blend-multiply opacity-90 z-0" />
              <img
                src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1440&auto=format&fit=crop"
                alt="Preserved serene environment"
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60 z-0"
                referrerPolicy="no-referrer"
              />
              <div className="relative z-10 text-center max-w-md text-white flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-6xl text-primary font-bold">eco</span>
                <p className="font-display text-2xl font-black italic tracking-wide">
                  "Ensure sustainable consumption and production patterns."
                </p>
                <div className="px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-emerald-500/20 border border-emerald-400/20 text-emerald-200">
                  UN SDG 12 Indicator
                </div>
              </div>
            </div>

            {/* SDG Content Context */}
            <div className="p-8 md:p-12 flex flex-col justify-center gap-6">
              <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300 font-bold font-mono text-xs tracking-wider uppercase">
                <GlobeIcon className="w-4 h-4" />
                Global Circular Framework
              </div>

              <h2 className="font-display text-3xl font-extrabold text-on-surface dark:text-white leading-tight tracking-tight">
                Empowering Responsible Production
              </h2>

              <p className="text-sm text-on-surface-variant dark:text-emerald-100/70 leading-relaxed font-light">
                Our technology leverages state-of-the-art multi-modal AI models to dismantle the barriers of recycling ambiguity. By identifying precise waste streams automatically, we enable micro-actions that reduce aggregate municipal carbon output significantly.
              </p>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-emerald-500/5">
                <div>
                  <p className="text-4xl font-extrabold font-display text-emerald-600 dark:text-primary">
                    85%
                  </p>
                  <p className="font-mono text-[9px] font-bold text-on-surface-variant dark:text-emerald-100/60 uppercase tracking-widest mt-1">
                    Ideal Diversion Target
                  </p>
                </div>
                <div>
                  <p className="text-4xl font-extrabold font-display text-emerald-600 dark:text-primary">
                    2030
                  </p>
                  <p className="font-mono text-[9px] font-bold text-on-surface-variant dark:text-emerald-100/60 uppercase tracking-widest mt-1">
                    Vision Alignment Year
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS DASHBOARD DISPLAY SECTION */}
        <section id="stats-deck" className="py-20 px-4 md:px-10 bg-emerald-100/10 dark:bg-[#031109]/10 border-t border-emerald-500/5 dark:border-emerald-400/5">
          <div className="max-w-7xl mx-auto w-full text-center md:text-left flex flex-col gap-10">
            <div className="text-center">
              <h2 className="font-display text-3xl font-extrabold text-on-surface dark:text-white tracking-tight">
                Live Real-time Global Impact
              </h2>
              <p className="text-sm text-on-surface-variant dark:text-emerald-100/60 mt-2 font-light">
                Every AI query translates directly to sustainable landfill diversion indices. Watch our global audit scale live below.
              </p>
            </div>

            <DashboardStats stats={stats} />
          </div>
        </section>

        {/* FEEDBACK & NEWSLETTER ENGAGEMENT SECTION */}
        <section className="max-w-7xl mx-auto px-4 md:px-10 py-20 text-center">
          <div className="max-w-2xl mx-auto glass-card p-8 md:p-12 rounded-3xl border border-emerald-500/10 dark:border-emerald-400/10">
            <span className="material-symbols-outlined text-emerald-600 dark:text-primary text-4xl mb-4">mail</span>
            
            <h2 className="font-display text-2xl font-bold text-on-surface dark:text-white tracking-tight mb-2">
              Stay Informed on Circular Ecology
            </h2>
            <p className="text-xs text-on-surface-variant dark:text-emerald-100/60 max-w-sm mx-auto mb-6 leading-relaxed font-light">
              Receive bi-weekly reports detailing smart packaging, global municipal zero-waste mandates, and newly classification models releases.
            </p>

            {contactSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs max-w-md mx-auto">
                <p className="font-bold">Thank you for subscribing!</p>
                <p className="text-[10px] mt-1 font-light">We have logged your email of interest for EcoSort AI updates.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (contactEmail.trim().length > 3) setContactSuccess(true);
                }}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-grow bg-emerald-50/20 dark:bg-emerald-950/20 border border-emerald-500/10 dark:border-emerald-400/10 focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] rounded-xl px-4 py-3 text-xs placeholder:text-emerald-800/40 dark:placeholder:text-[#bbcabf]/30 text-center sm:text-left focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-600 dark:bg-primary dark:hover:bg-emerald-400 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  Join Circle
                </button>
              </form>
            )}
          </div>
        </section>

      </main>

      {/* Footer Block */}
      <footer className="bg-white/90 dark:bg-[#031109]/90 border-t border-emerald-500/15 dark:border-emerald-400/10 py-12 px-4 md:px-10 transition-all duration-300 relative z-10 text-on-surface-variant dark:text-emerald-100/50">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8 text-center">
          <div className="flex items-center gap-2">
            <TreePine className="w-5 h-5 text-emerald-600 dark:text-primary animate-pulse" />
            <span className="font-display font-bold text-lg tracking-tight text-emerald-800 dark:text-primary">
              EcoSort AI
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs font-semibold">
            <a href="#hero" className="hover:text-emerald-600 dark:hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#hero" className="hover:text-emerald-600 dark:hover:text-primary transition-colors">Terms and Services</a>
            <a href="#hero" className="hover:text-emerald-600 dark:hover:text-primary transition-colors">Eco Reports</a>
            <a href="#hero" className="hover:text-emerald-600 dark:hover:text-primary transition-colors">Integrations Platform</a>
          </div>

          <p className="text-[10px] max-w-md mx-auto leading-relaxed font-light opacity-75">
            © {new Date().getFullYear()} EcoSort AI – Environmental Intelligence framework for a Greener Planet. Harnessing server-side machine learning to optimize domestic and enterprise circular loop efficiencies.
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("App link copied to dashboard clipboard!");
              }}
              className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/10 dark:border-emerald-400/10 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-all text-emerald-800 dark:text-emerald-200 cursor-pointer"
              title="Share EcoSort App"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <a
              href="mailto:jaiswalshourya360@gmail.com"
              className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/10 dark:border-emerald-400/10 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-all text-emerald-800 dark:text-emerald-200"
              title="Mail Support Desk"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Custom simple icon indicators
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253"
      />
    </svg>
  );
}
