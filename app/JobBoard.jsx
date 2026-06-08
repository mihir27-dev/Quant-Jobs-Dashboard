"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Clock,
  ExternalLink,
  Sparkles,
  X,
  Check,
  Loader2,
  Copy,
  ChevronRight,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  Building,
  CheckCircle,
  Briefcase,
  AlertTriangle,
  Sun,
  Moon,
  Upload,
  Plus,
  Trash,
  FileText,
} from "lucide-react";
import { useJobFilters } from "@/hooks/useJobFilters";
import { filterJobs, TIERS, ROLES, LOCATIONS, LANGUAGES } from "@/lib/filtering";
import { scoreJob } from "@/lib/match";

import { JOBS } from "@/lib/sampleJobs";

/* candidate profile — feeds match scoring */
const INITIAL_PROFILE = {
  fullName: "Alex Quant",
  roles: ["Researcher", "Trader"],
  languages: ["Python", "C++", "OCaml"],
  skills: ["Statistical Arbitrage", "Machine Learning"],
  locations: ["NYC", "London"],
  summary:
    "MS in Statistics, 3 years building systematic equity signals in Python/C++, comfortable with stat-arb and applied ML.",
};

function parseResumeText(text) {
  const normalized = text.toLowerCase();
  
  // 1. Languages
  const languages = [];
  if (/\bc\+\+|\bcpp\b/i.test(normalized)) languages.push("C++");
  if (/\bpython\b/i.test(normalized)) languages.push("Python");
  if (/\brust\b/i.test(normalized)) languages.push("Rust");
  if (/\bocaml\b/i.test(normalized)) languages.push("OCaml");
  
  // Default fallback if no languages found
  if (languages.length === 0) languages.push("Python");

  // 2. Skills
  const skills = [];
  if (/statistical arbitrage|stat arb/i.test(normalized)) skills.push("Statistical Arbitrage");
  if (/machine learning|deep learning|\bml\b/i.test(normalized)) skills.push("Machine Learning");
  if (/low.?latency|hft|high.?frequency/i.test(normalized)) skills.push("Low Latency");
  if (/market making/i.test(normalized)) skills.push("Market Making");

  // 3. Locations
  const locations = [];
  if (/new york|nyc|manhattan/i.test(normalized)) locations.push("NYC");
  if (/london/i.test(normalized)) locations.push("London");
  if (/chicago/i.test(normalized)) locations.push("Chicago");
  if (/singapore/i.test(normalized)) locations.push("Singapore");
  if (/hong kong/i.test(normalized)) locations.push("Hong Kong");
  
  // Default fallback if no locations found
  if (locations.length === 0) locations.push("NYC");

  // 4. Roles
  const roles = [];
  if (/researcher|scientist|quant analyst/i.test(normalized)) roles.push("Researcher");
  if (/trader|trading/i.test(normalized)) roles.push("Trader");
  if (/developer|engineer|swe|software/i.test(normalized)) roles.push("Developer");
  if (/data scientist/i.test(normalized)) roles.push("Data Scientist");

  // Default fallback if no roles found
  if (roles.length === 0) roles.push("Developer");

  // Generate summary
  const summary = `Uploaded profile: ${roles.join("/")} with skills in ${skills.length > 0 ? skills.join(", ") : "quant finance"} and proficiency in ${languages.join(", ")}.`;

  return {
    fullName: "Uploaded Resume Profile",
    roles,
    languages,
    skills,
    locations,
    summary,
  };
}

const STATUSES = ["Saved", "Applied", "Interviewing", "Offer", "Rejected"];
const STORE_KEY = "applications:v2";
const TIER_STYLES = {
  SSS: "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 ring-1 ring-amber-600/30 font-extrabold",
  SS: "bg-slate-900 dark:bg-slate-850 text-white dark:text-slate-200 border border-slate-800 dark:border-slate-700 font-semibold",
  S: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-1 ring-slate-300 dark:ring-slate-700 font-medium",
};
const STATUS_STYLES = {
  Saved: "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800",
  Applied: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40",
  Interviewing: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 animate-pulse",
  Offer: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 font-bold",
  Rejected: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30",
};

function ApplyAssistant({ job, profile, initialLetter, onClose, onSave, theme }) {
  const [letter, setLetter] = useState(initialLetter || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, profile }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.text) throw new Error("empty");
      setLetter(data.text);
    } catch (e) {
      setError("Couldn't generate right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:rounded-2xl border transition-all ${
        theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
      } animate-slide-up`}>
        <div className={`flex items-start justify-between border-b p-4 ${
          theme === "dark" ? "border-slate-800 bg-slate-950/30 text-white" : "border-slate-100 bg-slate-50/50 text-slate-900"
        }`}>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold">
              <Sparkles size={16} className="text-emerald-600 animate-spin-slow" /> Apply Assistant
            </div>
            <p className={`mt-1 text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-505"}`}>
              {job.title} · <span className="font-semibold">{job.firm}</span>
            </p>
          </div>
          <button onClick={onClose} className={`rounded-full p-1.5 transition-colors ${
            theme === "dark" ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
          }`}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Tailored cover letter
            </span>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-all hover:scale-[1.02] shadow-sm shadow-emerald-600/10"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {letter ? "Regenerate" : "Generate Draft"}
            </button>
          </div>

          {error && (
            <p className="rounded-md bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <textarea
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            placeholder="Click Generate to write a tailored cover letter using your MS Statistics background, coding profile, and domain experience. You can edit this freely afterward."
            className={`h-64 w-full resize-none rounded-xl border p-4 text-sm leading-relaxed outline-none transition-all ${
              theme === "dark"
                ? "border-slate-800 bg-slate-950/50 text-slate-300 focus:border-emerald-500 focus:bg-slate-950 focus:ring-2 focus:ring-emerald-500/10"
                : "border-slate-200 bg-slate-50/50 text-slate-705 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
            }`}
          />
          <div className="flex items-start gap-1.5 text-slate-400 dark:text-slate-500">
            <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed">
              Always review before sending. Ensure that data references match your official resume details.
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2 border-t p-4 ${
          theme === "dark" ? "border-slate-800 bg-slate-950/30" : "border-slate-100 bg-slate-50/30"
        }`}>
          <button
            onClick={copy}
            disabled={!letter}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
              theme === "dark"
                ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-550 hover:border-slate-300 disabled:opacity-50"
            }`}
          >
            {copied ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={() => {
              onSave(letter);
              onClose();
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              theme === "dark"
                ? "bg-slate-800 text-slate-300 hover:bg-slate-750"
                : "bg-slate-100 text-slate-705 hover:bg-slate-200"
            }`}
          >
            Save draft
          </button>
          <a
            href={ensureAbsoluteUrl(job.applyUrl)}
            target="_blank"
            rel="noreferrer"
            className={`ml-auto flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              theme === "dark"
                ? "bg-slate-100 text-slate-950 hover:bg-white"
                : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md"
            }`}
          >
            Open application <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

const isBackupFirm = (firmName) => {
  if (!firmName) return false;
  const name = firmName.toLowerCase();
  return (
    name.includes("nk securities") ||
    name.includes("graviton") ||
    name.includes("alphagrep") ||
    name.includes("aqr") ||
    name.includes("deshaw") ||
    name.includes("d. e. shaw") ||
    name.includes("d.e. shaw") ||
    name.includes("jpmc") ||
    name.includes("jpmorgan") ||
    name.includes("gs") ||
    name.includes("goldman sachs")
  );
};

const ensureAbsoluteUrl = (url) => {
  if (!url) return "#";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  // normalize.ts handles standard fallbacks, so just prefix with https://
  if (trimmed.startsWith("/")) {
    return `https://${trimmed.substring(1)}`;
  }
  return `https://${trimmed}`;
};

/* ------------------------------ main component --------------------- */
export default function QuantJobFinderV2({ initialJobs }) {
  const { filters, toggle, setQuery, setSort, clearAll } = useJobFilters();
  const [apps, setApps] = useState({}); // jobId -> {status, coverLetter, updatedAt}
  const [loaded, setLoaded] = useState(false);
  const [assistJob, setAssistJob] = useState(null);
  
  // Track selected job. Default to null, will set to first matched on load.
  const [selectedJobId, setSelectedJobId] = useState(null);

  // CV Analysis State
  const [cvAnalysisMap, setCvAnalysisMap] = useState({});
  const [isAnalyzingCV, setIsAnalyzingCV] = useState(false);

  const analyzeCV = async (job) => {
    setIsAnalyzingCV(true);
    try {
      const res = await fetch("/api/cv-scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, job }),
      });
      const data = await res.json();
      if (!data.error) {
        setCvAnalysisMap(prev => ({ ...prev, [job.id]: data }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingCV(false);
    }
  };
  
  // Mobile search drawer/sidebar toggle state
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Dynamic profile and theme states
  const [theme, setTheme] = useState("dark");
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pastedText, setPastedText] = useState("");
  
  // Cyber-terminal state
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hideBackups, setHideBackups] = useState(true);

  // Fallback to sample data if no initial jobs are passed
  const jobsList = useMemo(() => {
    return initialJobs && initialJobs.length > 0 ? initialJobs : JOBS;
  }, [initialJobs]);

  const availableFirms = useMemo(() => {
    const list = jobsList.map((j) => j.firm);
    const unique = Array.from(new Set(list));
    if (hideBackups) {
      return unique.filter((f) => !isBackupFirm(f)).sort();
    }
    return unique.sort();
  }, [jobsList, hideBackups]);

  // Load persisted applications from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setApps(JSON.parse(raw));
    } catch {
      /* first run: no key yet */
    } finally {
      setLoaded(true);
    }
  }, []);

  function persist(next) {
    setApps(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* non-fatal in demo */
    }
  }

  function setStatus(jobId, status) {
    const next = { ...apps };
    if (!status) delete next[jobId];
    else next[jobId] = { ...(next[jobId] || {}), status, updatedAt: new Date().toISOString() };
    persist(next);
  }

  function saveLetter(jobId, coverLetter) {
    const next = { ...apps };
    next[jobId] = { ...(next[jobId] || {}), coverLetter, updatedAt: new Date().toISOString() };
    persist(next);
  }

  // Score and Filter Jobs
  const ranked = useMemo(() => {
    // 1. Calculate match scores for all jobs based on dynamic profile state
    const scored = jobsList.map((j) => {
      const match = scoreJob(j, profile);
      return { ...j, match };
    });
    
    // 2. Filter out backups if toggle is active
    let preFiltered = scored;
    if (hideBackups) {
      preFiltered = scored.filter((j) => !isBackupFirm(j.firm));
    }
    
    // 3. Filter jobs using the lib filter utility
    const filtered = filterJobs(preFiltered, filters);

    if (filters.sort === "match") {
      return [...filtered].sort((a, b) => b.match.score - a.match.score);
    }
    return filtered;
  }, [jobsList, filters, profile, hideBackups]);

  // Set default selected job
  useEffect(() => {
    if (ranked.length > 0 && !selectedJobId) {
      setSelectedJobId(ranked[0].id);
    }
  }, [ranked, selectedJobId]);

  // Get currently selected job details
  const selectedJob = useMemo(() => {
    return ranked.find((j) => j.id === selectedJobId) || null;
  }, [ranked, selectedJobId]);

  // Pipeline count summary
  const pipeline = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    Object.values(apps).forEach((a) => a.status && counts[a.status]++);
    return counts;
  }, [apps]);

  // Debounced input search state
  const [localSearch, setLocalSearch] = useState(filters.q);
  useEffect(() => {
    setLocalSearch(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(localSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, setQuery]);

  const activeFiltersCount = useMemo(() => {
    return (
      filters.tiers.length +
      filters.firms.length +
          filters.roles.length +
          filters.locations.length +
          filters.languages.length +
          (filters.q.trim() ? 1 : 0)
        );
      }, [filters]);
    
      function renderResumeMatcher() {
        return (
          <div className={`border rounded-xl p-3.5 space-y-3 relative overflow-hidden transition-all ${
            theme === "dark" 
              ? "bg-slate-900/85 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
              : "bg-slate-50 border-slate-200/80 shadow-sm"
          }`}>
            {/* Glow indicator at top corner for 2050 design */}
            {theme === "dark" && (
              <div className="absolute top-0 right-0 w-12 h-[1px] bg-gradient-to-r from-transparent to-emerald-400" />
            )}
            
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-400 dark:text-emerald-450 font-mono">
                <FileText size={12} className="text-emerald-500" /> 
                {isScanning ? "NEURAL PORT SCANNING..." : "NEURAL DATA PORT // CV"}
              </h4>
              {profile.fullName !== "Alex Quant" && !isScanning && (
                <button
                  onClick={() => {
                    setProfile(INITIAL_PROFILE);
                    setPastedText("");
                  }}
                  className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors font-mono"
                >
                  [RESET]
                </button>
              )}
            </div>
            
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (isScanning) return;
                const file = e.dataTransfer.files[0];
                if (file) {
                  setIsScanning(true);
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    if (evt.target?.result) {
                      const parsed = parseResumeText(evt.target.result);
                      setTimeout(() => {
                        setProfile(parsed);
                        setIsScanning(false);
                      }, 1200);
                    } else {
                      setIsScanning(false);
                    }
                  };
                  reader.readAsText(file);
                }
              }}
              className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-all group relative overflow-hidden ${
                theme === "dark" 
                  ? `${isDragging ? "border-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "border-slate-800 bg-slate-950/80 hover:border-emerald-500/50"}` 
                  : `${isDragging ? "border-cyan-500 bg-cyan-50" : "border-slate-300 bg-white hover:border-emerald-550"}`
              }`}
            >
              {isScanning && (
                <div className="absolute inset-0 bg-emerald-950/10 pointer-events-none z-10 flex flex-col justify-center items-center">
                  {/* Green sweeping laser line */}
                  <div className="absolute inset-x-0 h-[2px] bg-emerald-400 shadow-[0_0_8px_#10b981] top-0 animate-[scan-sweep_1.2s_ease-in-out_infinite]" />
                  <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                </div>
              )}
              
              <input
                type="file"
                accept=".txt,.md"
                disabled={isScanning}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIsScanning(true);
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      if (evt.target?.result) {
                        const parsed = parseResumeText(evt.target.result);
                        setTimeout(() => {
                          setProfile(parsed);
                          setIsScanning(false);
                        }, 1200);
                      } else {
                        setIsScanning(false);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
              />
              <Upload size={18} className={`mx-auto transition-colors mb-1.5 ${
                isScanning ? "text-emerald-500 animate-bounce" : "text-slate-400 dark:text-slate-500 group-hover:text-emerald-500"
              }`} />
              
              <p className={`text-[10px] font-bold font-mono uppercase ${
                theme === "dark" 
                  ? isScanning ? "text-emerald-400" : "text-slate-300"
                  : isScanning ? "text-emerald-600" : "text-slate-700"
              }`}>
                {isScanning ? "SCANNING_VECTORS..." : "Upload Resume"}
              </p>
              <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-0.5 font-mono">
                {isScanning ? "PARSING_STRUCTURED_DATA" : "DRAG_DROP OR CLICK (.txt, .md)"}
              </p>
            </div>

            <div className="space-y-1.5 font-mono">
              <button
                onClick={() => !isScanning && setShowPasteInput(!showPasteInput)}
                disabled={isScanning}
                className="w-full text-left text-[9px] font-bold text-slate-400 dark:text-emerald-500/60 hover:text-slate-600 dark:hover:text-emerald-400 flex items-center justify-between disabled:opacity-50"
              >
                <span>[DIRECT_PASTE_TELEMETRY]</span>
                <span>{showPasteInput ? "HIDE" : "SHOW"}</span>
              </button>
              
              {showPasteInput && !isScanning && (
                <div className="space-y-1.5">
                  <textarea
                    placeholder="Paste CV text here (e.g. C++, machine learning, NYC...)"
                    className={`w-full h-20 text-[10px] p-2 rounded-lg focus:border-emerald-500 focus:outline-none transition-all ${
                      theme === "dark" 
                        ? "bg-slate-950 border-emerald-500/20 text-emerald-400 placeholder-emerald-850/60" 
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      if (pastedText.trim()) {
                        setIsScanning(true);
                        const parsed = parseResumeText(pastedText);
                        setTimeout(() => {
                          setProfile(parsed);
                          setIsScanning(false);
                          setShowPasteInput(false);
                        }, 1200);
                      }
                    }}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all hover:scale-[1.02] shadow-sm uppercase"
                  >
                    Execute Parser Signal
                  </button>
                </div>
              )}
            </div>

            <div className={`text-[10px] space-y-1 p-2 rounded-lg border border-slate-100/5 dark:border-slate-800/40 bg-slate-950/20 dark:bg-slate-950/60 font-mono ${
              theme === "dark" ? "text-slate-300" : "text-slate-750"
            }`}>
              <div className="font-bold text-slate-500 dark:text-slate-450 truncate flex justify-between">
                <span>PORT_ID: {profile.fullName.toUpperCase()}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.languages.map((l) => (
                  <span key={l} className="px-1.5 py-0.2 bg-emerald-50/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-455 rounded text-[9px] font-bold border border-emerald-100/30 dark:border-emerald-900/30">
                    {l}
                  </span>
                ))}
                {profile.skills.map((s) => (
                  <span key={s} className="px-1.5 py-0.2 bg-cyan-50/10 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-455 rounded text-[9px] font-bold border border-cyan-100/30 dark:border-cyan-900/30">
                    {s}
                  </span>
                ))}
                {profile.locations.map((loc) => (
                  <span key={loc} className="px-1.5 py-0.2 bg-amber-50/10 dark:bg-amber-950/40 text-amber-600 dark:text-amber-450 rounded text-[9px] font-bold border border-amber-100/30 dark:border-amber-900/30">
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      }
    
      return (
        <div className={`h-screen h-[100dvh] relative overflow-hidden ${
          theme === "dark" ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
        } flex flex-col font-sans antialiased transition-colors duration-300`}>

      {/* Premium Header */}
      <header className={`sticky top-0 z-30 border-b transition-all relative ${
        theme === "dark" 
          ? "border-emerald-500/15 bg-slate-950/75 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)]" 
          : "border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm"
      }`}>
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setSelectedJobId(null)}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-base font-extrabold shadow-md transition-all ${
              theme === "dark" 
                ? "bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 shadow-emerald-500/20" 
                : "bg-slate-900 text-white"
            }`}>
              Q
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className={`text-sm font-black tracking-widest font-mono uppercase transition-colors ${
                  theme === "dark" ? "text-emerald-400 glow-text-emerald" : "text-slate-900"
                }`}>
                  Q // QUANTBOARD
                </h1>
                {theme === "dark" && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <p className={`text-[9px] font-bold tracking-widest uppercase transition-colors ${
                theme === "dark" ? "text-slate-500 font-mono" : "text-slate-400"
              }`}>
                SYSTEM:v50.2 // SECURE_TERM
              </p>
            </div>
          </div>

          {/* Search bar inside header */}
          <div className="relative max-w-md w-72 lg:w-96 hidden md:block">
            <Search size={15} className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
              theme === "dark" ? "text-emerald-500/40" : "text-slate-400"
            }`} />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={theme === "dark" ? "SEARCH SYSTEM TELEMETRY..." : "Search by role or company..."}
              className={`w-full rounded-xl border py-1.5 pl-9 pr-3 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono ${
                theme === "dark"
                  ? "bg-slate-900/60 border-emerald-500/20 text-emerald-400 placeholder-emerald-800"
                  : "bg-slate-50/50 border-slate-200 text-slate-900 focus:bg-white"
              }`}
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Theme Toggle & Pipeline Summary badges */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`p-1.5 rounded-lg border transition-colors shadow-sm cursor-pointer ${
                theme === "dark"
                  ? "border-emerald-500/20 bg-slate-900 text-emerald-400 hover:bg-slate-800 hover:text-emerald-250"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-55 hover:text-slate-800"
              }`}
              title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider hidden lg:inline mr-1 font-mono">PIPELINE:</span>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <div
                    key={s}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 shadow-sm ${STATUS_STYLES[s]}`}
                  >
                    <span>{s.toUpperCase()}</span>
                    <span className={`rounded px-1 text-[9px] font-bold ${
                      theme === "dark" ? "bg-slate-950/70 text-slate-300" : "bg-white/70 text-slate-800"
                    }`}>{pipeline[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 min-h-0 flex max-w-7xl w-full mx-auto overflow-hidden relative z-10">
        {/* ==========================================
         * SIDEBAR FILTER PANEL (Desktop)
         * ==========================================*/}
        <aside className={`w-64 border-r p-5 overflow-y-auto hidden md:flex flex-col gap-6 select-none transition-all ${
          theme === "dark" ? "bg-slate-950/40 border-slate-900/60" : "bg-white border-slate-200/80"
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-900">
            <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest font-mono ${
              theme === "dark" ? "text-emerald-450 glow-text-emerald" : "text-slate-800"
            }`}>
              <Filter size={13} className="text-slate-500" /> Facet Filters
              {activeFiltersCount > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-full px-1.5 py-0.2 text-[9px] font-extrabold animate-pulse">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAll}
                className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-455 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Resume Matcher Widget */}
          {renderResumeMatcher()}

          {/* Sort Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1">
              <ArrowUpDown size={11} /> Sort Order
            </label>
            <select
              value={filters.sort}
              onChange={(e) => setSort(e.target.value)}
              className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition-all cursor-pointer font-mono ${
                theme === "dark"
                  ? "border-emerald-500/20 bg-slate-900 text-emerald-450 focus:border-emerald-500 focus:bg-slate-950"
                  : "border-slate-200 bg-slate-50 text-slate-750 focus:border-emerald-500 focus:bg-white"
              }`}
            >
              <option value="recent">Date Posted (Newest)</option>
              <option value="tier">Firm Curated Tier (SSS → S)</option>
              <option value="match">Match Score (Highest)</option>
            </select>
          </div>

          {/* experience tiers */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest font-mono">Experience Tier</h4>
            <div className="space-y-1.5">
              {TIERS.map((tier) => (
                <label key={tier} className={`flex items-center gap-2.5 text-xs font-semibold cursor-pointer ${
                  theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                }`}>
                  <input
                    type="checkbox"
                    checked={filters.tiers.includes(tier)}
                    onChange={() => toggle("tiers", tier)}
                    className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-800 text-emerald-600 focus:ring-emerald-500/30 transition-all cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono">{tier}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">
                      ({tier === "SSS" ? "Elite/Tier 1" : tier === "SS" ? "Strong/Tier 2" : "Mid/Tier 3"})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* firms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Firms</h4>
              <label className="flex items-center gap-1 text-[9px] font-bold text-slate-455 dark:text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideBackups}
                  onChange={(e) => setHideBackups(e.target.checked)}
                  className="h-2.5 w-2.5 rounded border-slate-300 dark:border-slate-850 text-emerald-600 focus:ring-emerald-500/35 transition-all cursor-pointer"
                />
                <span>HIDE BACKUPS</span>
              </label>
            </div>
            <div className={`space-y-1.5 max-h-48 overflow-y-auto pr-1 ${theme === "dark" ? "scrollbar-dark" : ""}`}>
              {availableFirms.map((firm) => (
                <label key={firm} className={`flex items-center gap-2.5 text-xs font-semibold cursor-pointer ${
                  theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                }`}>
                  <input
                    type="checkbox"
                    checked={filters.firms.includes(firm)}
                    onChange={() => toggle("firms", firm)}
                    className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-800 text-emerald-600 focus:ring-emerald-500/30 transition-all cursor-pointer"
                  />
                  <span className="font-mono">{firm}</span>
                </label>
              ))}
            </div>
          </div>

          {/* role types */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Role Type</h4>
            <div className="space-y-1.5">
              {ROLES.map((role) => (
                <label key={role} className={`flex items-center gap-2.5 text-xs font-semibold cursor-pointer ${
                  theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                }`}>
                  <input
                    type="checkbox"
                    checked={filters.roles.includes(role)}
                    onChange={() => toggle("roles", role)}
                    className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-800 text-emerald-650 focus:ring-emerald-500/30 transition-all cursor-pointer"
                  />
                  <span className="font-mono">{role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* locations */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-widest font-mono">Locations</h4>
            <div className="space-y-1.5">
              {LOCATIONS.map((loc) => (
                <label key={loc} className={`flex items-center gap-2.5 text-xs font-semibold cursor-pointer ${
                  theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                }`}>
                  <input
                    type="checkbox"
                    checked={filters.locations.includes(loc)}
                    onChange={() => toggle("locations", loc)}
                    className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-800 text-emerald-600 focus:ring-emerald-500/30 transition-all cursor-pointer"
                  />
                  <span className="font-mono">{loc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* coding languages */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Languages</h4>
            <div className="space-y-1.5">
              {LANGUAGES.map((lang) => (
                <label key={lang} className={`flex items-center gap-2.5 text-xs font-semibold cursor-pointer ${
                  theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                }`}>
                  <input
                    type="checkbox"
                    checked={filters.languages.includes(lang)}
                    onChange={() => toggle("languages", lang)}
                    className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-800 text-emerald-600 focus:ring-emerald-500/30 transition-all cursor-pointer"
                  />
                  <span className="font-mono">{lang}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* ==========================================
         * LEFT COLUMN: JOB LISTING COLUMN
         * ==========================================*/}
        <section className={`w-full md:w-80 lg:w-[380px] flex-shrink-0 border-r flex flex-col h-full overflow-hidden ${
          selectedJobId && "hidden md:flex"
        } ${
          theme === "dark" ? "bg-slate-950/30 border-slate-900/60" : "bg-slate-50 border-slate-200/85"
        }`}>
          {/* Header statistics / Mobile Filter toggle */}
          <div className={`p-4 border-b flex items-center justify-between gap-2 flex-shrink-0 ${
            theme === "dark" ? "bg-slate-950/60 border-slate-900/60" : "bg-white border-slate-200/50"
          }`}>
            <div>
              <p className={`text-xs font-bold font-mono ${theme === "dark" ? "text-emerald-400" : "text-slate-700"}`}>
                SYS_DATABASE // {ranked.length} ENTRIES
              </p>
              {activeFiltersCount > 0 && (
                <p className="text-[10px] text-slate-500 font-mono">ACTIVE_FACETS_LOADED</p>
              )}
            </div>

            {/* Mobile query search */}
            <div className="relative flex-1 md:hidden">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search..."
                className={`w-full rounded-lg border py-1 pl-8 pr-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-905 focus:bg-white"
                }`}
              />
            </div>

            {/* Mobile Filter toggle button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className={`flex md:hidden items-center gap-1 border rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                theme === "dark"
                  ? "border-emerald-500/25 bg-slate-900 text-emerald-400 hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-655 hover:bg-slate-50"
              }`}
            >
              <Filter size={13} />
              {activeFiltersCount > 0 && <span>({activeFiltersCount})</span>}
            </button>
          </div>

          {/* Main listings list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loaded && ranked.length === 0 ? (
              <div className={`text-center py-10 px-4 rounded-xl border shadow-sm ${
                theme === "dark" ? "bg-slate-950/80 border-slate-900" : "bg-white border-slate-200/60"
              }`}>
                <Briefcase className="mx-auto text-slate-350 dark:text-emerald-500/40 mb-2.5" size={32} />
                <h4 className={`text-xs font-bold font-mono ${theme === "dark" ? "text-emerald-450" : "text-slate-800"}`}>NO DATA RETURNED</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                  Broaden database queries or clear selected filter facets to retry.
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="mt-3.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              loaded &&
              ranked.map((job) => {
                const isSelected = job.id === selectedJobId;
                const app = apps[job.id];
                return (
                  <article
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.015] hover:shadow-md relative overflow-hidden ${
                      theme === "dark"
                        ? "bg-slate-955/60 border-slate-900/60 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.08)]"
                        : "bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300"
                    } ${
                      isSelected
                        ? theme === "dark"
                          ? "border-cyan-500 bg-cyan-950/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                          : "border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/10"
                        : ""
                    }`}
                  >
                    {/* Small visual indicator pips for selection on the left edge */}
                    {isSelected && theme === "dark" && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-400" />
                    )}

                    <div className="flex items-start gap-2.5 justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-bold truncate max-w-[120px] ${theme === "dark" ? "text-cyan-400 font-mono tracking-wide" : "text-slate-900"}`}>
                            {job.firm.toUpperCase()}
                          </span>
                          <span className={`rounded-md px-1.5 py-0.1 text-[9px] font-bold tracking-wide uppercase ${TIER_STYLES[job.tier]}`}>
                            {job.tier}
                          </span>
                          {/* Power pips for visual tier indication */}
                          {theme === "dark" && (
                            <div className="flex gap-0.5" title={`${job.tier} Tier`}>
                              <span className="h-1.5 w-2 rounded-sm bg-emerald-500/80 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
                              <span className={`h-1.5 w-2 rounded-sm ${job.tier === 'SSS' || job.tier === 'SS' ? 'bg-emerald-500/80 shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-slate-800'}`} />
                              <span className={`h-1.5 w-2 rounded-sm ${job.tier === 'SSS' ? 'bg-emerald-500/80 shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-slate-800'}`} />
                            </div>
                          )}
                        </div>
                        <h3 className={`mt-1.5 text-sm font-bold leading-snug line-clamp-1 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                          {job.title}
                        </h3>
                        <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono text-[10px]">
                          <MapPin size={11} className="text-slate-450 dark:text-cyan-500/30 flex-shrink-0" /> {job.location} · {job.workMode.toUpperCase()}
                        </p>
                      </div>

                      {/* Monospace telemetry matching score gauge */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          job.match.score >= 80
                            ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                            : job.match.score >= 60
                            ? "bg-amber-950/30 border-amber-500/30 text-amber-450"
                            : "bg-slate-900/50 border-slate-800 text-slate-455"
                        }`}>
                          {job.match.score}% FIT
                        </div>
                        <div className="w-12 h-1 bg-slate-800 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              job.match.score >= 80 ? "bg-emerald-500" : job.match.score >= 60 ? "bg-amber-500" : "bg-slate-500"
                            }`} 
                            style={{ width: `${job.match.score}%` }} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-900/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 font-medium flex items-center gap-1 font-mono">
                        <Clock size={10} className="text-slate-450 dark:text-cyan-500/30" /> POSTED // {job.postedDays || 2}D
                      </span>
                      {app?.status && (
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_STYLES[app.status]}`}>
                          {app.status}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* ==========================================
         * RIGHT COLUMN: JOB DETAILS VIEW PANEL
         * ==========================================*/}
        <section className={`flex-1 flex flex-col h-full overflow-hidden ${!selectedJobId && "hidden md:flex"} ${selectedJobId && "w-full"} ${
          theme === "dark" ? "bg-slate-950/30 border-l border-slate-900" : "bg-white"
        }`}>
          {selectedJob ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Back to list button (Mobile only) */}
              <div className={`p-3 border-b flex items-center gap-2 md:hidden flex-shrink-0 ${
                theme === "dark" ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50/50"
              }`}>
                <button
                  onClick={() => setSelectedJobId(null)}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    theme === "dark"
                      ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-55"
                  }`}
                >
                  <ChevronLeft size={14} /> Back to Job List
                </button>
              </div>

              {/* Detail body scroll area */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
                {/* Main Job metadata block */}
                <div className="border-b border-slate-100 dark:border-slate-900 pb-5">
                  <div className="flex items-start gap-4 justify-between flex-wrap">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold flex items-center gap-1 ${theme === "dark" ? "text-emerald-450 font-mono" : "text-slate-700"}`}>
                          <Building size={14} className="text-slate-450 dark:text-emerald-500/40" /> {selectedJob.firm.toUpperCase()}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TIER_STYLES[selectedJob.tier]}`}>
                          Tier {selectedJob.tier}
                        </span>
                      </div>
                      
                      {/* Telemetry Index String */}
                      {theme === "dark" && (
                        <p className="text-[9px] font-mono text-emerald-500/40 tracking-wider">
                          SYS_FILE // {selectedJob.firm.toUpperCase()} // REG_REF_{selectedJob.id.toUpperCase().slice(0, 8)}
                        </p>
                      )}

                      <h2 className={`text-xl md:text-2xl font-black leading-tight ${theme === "dark" ? "text-white glow-text-cyan" : "text-slate-909"}`}>
                        {selectedJob.title}
                      </h2>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1 font-mono text-[11px]"><MapPin size={13} className="text-slate-400 dark:text-emerald-500/30" /> {selectedJob.location.toUpperCase()} ({selectedJob.workMode.toUpperCase()})</span>
                        <span className="flex items-center gap-1 font-mono text-[11px]"><Clock size={13} className="text-slate-400 dark:text-emerald-500/30" /> POSTED_DAYS // {selectedJob.postedDays || 2}D</span>
                        {selectedJob.compRange && (
                          <span className={`font-mono font-bold rounded px-1.5 py-0.2 text-[11px] ${
                            theme === "dark" ? "text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.05)]" : "text-slate-800 bg-slate-100"
                          }`}>{selectedJob.compRange}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary call-to-actions */}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => setAssistJob(selectedJob)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-all hover:scale-[1.01] shadow-md shadow-emerald-600/10 cursor-pointer"
                    >
                      <Sparkles size={15} /> Apply Assistant
                    </button>
                    <button
                      onClick={() => analyzeCV(selectedJob)}
                      disabled={isAnalyzingCV}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-all hover:scale-[1.01] shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      {isAnalyzingCV ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                      {isAnalyzingCV ? "Scanning CV..." : "Scan CV for ATS Match"}
                    </button>
                    <a
                      href={ensureAbsoluteUrl(selectedJob.applyUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-bold transition-all ${
                        theme === "dark"
                          ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      Apply on Official Board <ExternalLink size={14} className="text-slate-400" />
                    </a>
                  </div>
                </div>

                {/* Interactive progression timeline */}
                <div className={`border rounded-xl p-5 space-y-4 shadow-sm ${
                  theme === "dark" ? "bg-slate-950/40 border-slate-900" : "bg-slate-50 border-slate-250/60"
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-xs font-bold uppercase tracking-widest font-mono ${theme === "dark" ? "text-slate-400" : "text-slate-450"}`}>
                      SYSTEM_PIPELINE_TRACKER
                    </h3>
                    {apps[selectedJob.id]?.status ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_STYLES[apps[selectedJob.id].status]}`}>
                        {apps[selectedJob.id].status}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                        Not Tracked
                      </span>
                    )}
                  </div>
                  
                  <div className="relative flex items-center justify-between px-2 pt-2 pb-6">
                    {/* Background track line */}
                    <div className="absolute top-6 left-5 right-5 h-[3px] bg-slate-200 dark:bg-slate-900 rounded-full z-0" />
                    
                    {/* Active timeline filled line */}
                    {(() => {
                      const currentStatus = apps[selectedJob.id]?.status;
                      const activeIndex = STATUSES.indexOf(currentStatus);
                      if (activeIndex === -1) return null;
                      const pct = (activeIndex / (STATUSES.length - 1)) * 100;
                      return (
                        <div 
                          className="absolute top-6 left-5 h-[3px] rounded-full laser-line-animated shadow-[0_0_8px_#00f0ff] transition-all duration-300 z-0" 
                          style={{ width: `calc(${pct}% - ${activeIndex === STATUSES.length - 1 ? "10px" : "0px"})` }}
                        />
                      );
                    })()}

                    {STATUSES.map((status, idx) => {
                      const currentStatus = apps[selectedJob.id]?.status;
                      const activeIndex = STATUSES.indexOf(currentStatus);
                      const isCompleted = idx <= activeIndex && activeIndex !== -1;
                      const isActive = status === currentStatus;

                      let nodeClass = "bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-900 text-slate-400 dark:text-slate-650 hover:border-slate-350 dark:hover:border-slate-800";
                      
                      if (isActive) {
                        if (status === "Offer") {
                          nodeClass = "bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)]";
                        } else if (status === "Rejected") {
                          nodeClass = "bg-rose-500 text-white border-rose-450 shadow-[0_0_15px_rgba(244,63,94,0.6)]";
                        } else if (status === "Interviewing") {
                          nodeClass = "bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse";
                        } else {
                          nodeClass = "bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)]";
                        }
                      } else if (isCompleted) {
                        nodeClass = "bg-emerald-950/40 border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
                      }

                      return (
                        <button
                          key={status}
                          onClick={() => setStatus(selectedJob.id, isActive ? "" : status)}
                          className="relative z-10 flex flex-col items-center cursor-pointer group focus:outline-none"
                        >
                          <div className={`h-8 w-8 rounded-full border flex items-center justify-center font-bold font-mono text-xs shadow-sm transition-all duration-200 group-hover:scale-110 ${nodeClass}`}>
                            {isCompleted ? <Check size={12} /> : idx + 1}
                          </div>
                          <span className={`absolute top-9 text-[10px] font-bold tracking-tight whitespace-nowrap transition-colors duration-200 font-mono ${
                            isActive 
                              ? "text-slate-900 dark:text-cyan-400 glow-text-cyan" 
                              : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-350"
                          }`}>
                            {status.toUpperCase()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Explainable Match Scoring Breakdown */}
                <div className={`border p-5 rounded-xl space-y-4 ${
                  theme === "dark" ? "bg-slate-950/40 border-slate-900" : "bg-slate-55 border-slate-200/60"
                }`}>
                  <div className="flex items-center gap-4">
                    <MatchRing score={selectedJob.match.score} theme={theme} />
                    <div>
                      <h3 className={`text-sm font-extrabold font-mono ${theme === "dark" ? "text-white glow-text-emerald" : "text-slate-900"}`}>EXPLAINABLE FIT ANALYSIS</h3>
                      <p className={`text-xs mt-0.5 leading-relaxed ${theme === "dark" ? "text-slate-450" : "text-slate-500"}`}>
                        Algorithmic match rating based on candidate nodes compared to job telemetries.
                      </p>
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t text-xs leading-relaxed ${
                    theme === "dark" ? "border-slate-900" : "border-slate-200/55"
                  }`}>
                    {/* Matches */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1 font-mono uppercase tracking-wider">
                        <CheckCircle size={14} className="text-emerald-500" /> SYSTEM MATCHES ({selectedJob.match.matched.length})
                      </h4>
                      {selectedJob.match.matched.length > 0 ? (
                        <ul className="space-y-1">
                          {selectedJob.match.matched.map((item) => (
                            <li key={item} className={`flex items-center gap-2 font-semibold border rounded px-2 py-0.8 text-[11px] w-fit font-mono ${
                              theme === "dark" 
                                ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400" 
                                : "bg-emerald-50/50 border-emerald-100 text-slate-705"
                            }`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm" /> {item.toUpperCase()}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 dark:text-slate-655 italic">No matching vectors found.</p>
                      )}
                    </div>

                    {/* Missing Gaps */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1 font-mono uppercase tracking-wider">
                        <AlertTriangle size={14} className="text-amber-500" /> TARGET GAPS ({selectedJob.match.missing.length})
                      </h4>
                      {selectedJob.match.missing.length > 0 ? (
                        <ul className="space-y-1">
                          {selectedJob.match.missing.map((item) => (
                            <li key={item} className={`flex items-center gap-2 border rounded px-2 py-0.8 text-[11px] w-fit font-mono ${
                              theme === "dark"
                                ? "bg-amber-950/20 border-amber-900/30 text-amber-400"
                                : "bg-amber-50/50 border-amber-100 text-slate-605"
                            }`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> {item.toUpperCase()}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={`font-bold border rounded px-2 py-1 text-[11px] w-fit flex items-center gap-1 font-mono ${
                          theme === "dark"
                            ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-450"
                            : "bg-emerald-50 border-emerald-100 text-emerald-700"
                        }`}>
                          <Check size={12} /> STABLE: PERFECT SIGNAL OVERLAP.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job description section */}
                {cvAnalysisMap[selectedJob.id] && (
                  <div className={`border p-5 rounded-xl space-y-4 shadow-sm ${
                    theme === "dark" ? "bg-indigo-950/20 border-indigo-900/50" : "bg-indigo-50/50 border-indigo-100"
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
                        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 60 60">
                          <circle cx="30" cy="30" r={24} fill="none" stroke="currentColor" strokeWidth="5" className={theme === "dark" ? "text-slate-800" : "text-slate-200"} />
                          <circle cx="30" cy="30" r={24} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={150.796} strokeDashoffset={150.796 - (cvAnalysisMap[selectedJob.id].atsScore / 100) * 150.796} className={cvAnalysisMap[selectedJob.id].atsScore >= 80 ? "text-emerald-500" : cvAnalysisMap[selectedJob.id].atsScore >= 60 ? "text-amber-500" : "text-rose-500"} />
                        </svg>
                        <span className={`absolute text-sm font-black tabular-nums ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{cvAnalysisMap[selectedJob.id].atsScore}</span>
                      </div>
                      <div>
                        <h3 className={`text-sm font-extrabold ${theme === "dark" ? "text-indigo-400" : "text-indigo-700"}`}>AI ATS Match Score</h3>
                        <p className={`text-xs mt-0.5 leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                          Based on a deep analysis of your CV against the job description.
                        </p>
                      </div>
                    </div>
                    
                    {cvAnalysisMap[selectedJob.id].recommendations?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Recommendations to improve your CV:</h4>
                        <ul className="space-y-1.5 text-sm list-disc pl-5">
                          {cvAnalysisMap[selectedJob.id].recommendations.map((rec, i) => (
                            <li key={i} className={theme === "dark" ? "text-slate-300" : "text-slate-700"}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {cvAnalysisMap[selectedJob.id].missingKeywords?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Missing Keywords to Add:</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {cvAnalysisMap[selectedJob.id].missingKeywords.map((kw, i) => (
                            <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded border ${theme === "dark" ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                    <Briefcase size={14} className="text-slate-400 dark:text-emerald-500/40" /> FILE_DOSSIER // J_DESCRIPTION
                  </h3>
                  <div className={`text-sm leading-relaxed whitespace-pre-line border rounded-xl p-4 md:p-5 shadow-sm font-sans relative overflow-hidden ${
                    theme === "dark" 
                      ? "bg-slate-955/40 border-emerald-500/10 text-slate-300 shadow-[0_0_15px_rgba(16,185,129,0.02)]" 
                      : "bg-white border-slate-100 text-slate-600"
                  }`.replace('slate-955', 'slate-950')}>
                    {theme === "dark" && (
                      <>
                        {/* Dossier Corner Accents */}
                        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-emerald-500/50" />
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-emerald-500/50" />
                        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-emerald-500/50" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-emerald-500/50" />
                      </>
                    )}
                    {selectedJob.description || selectedJob.snippet}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex-1 flex items-center justify-center text-slate-400 select-none ${
              theme === "dark" ? "bg-[#030508]" : "bg-slate-50/50"
            }`}>
              <div className="text-center p-6 max-w-[280px]">
                <Building size={32} className="mx-auto text-slate-350 dark:text-slate-800 mb-2" />
                <h3 className={`text-sm font-bold font-mono ${theme === "dark" ? "text-slate-450" : "text-slate-800"}`}>NO JOB FILE SELECTED</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Select an active ledger listing to fetch detail logs and resume fit metrics.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ==========================================
       * MOBILE DRAWER/OVERLAY FILTERS
       * ==========================================*/}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Overlay backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
          {/* Drawer sheet */}
          <div className={`relative z-10 w-80 max-w-full h-full flex flex-col p-5 animate-slide-left shadow-2xl overflow-y-auto gap-5 transition-all ${
            theme === "dark" ? "bg-slate-900 text-slate-100 border-l border-slate-800" : "bg-white text-slate-900"
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-1 ${
                theme === "dark" ? "text-slate-200" : "text-slate-800"
              }`}>
                <Filter size={14} className="text-slate-500" /> Filters
              </h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className={`rounded-full p-1.5 transition-colors ${
                  theme === "dark" ? "text-slate-400 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Clear All Option */}
            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  clearAll();
                  setShowMobileFilters(false);
                }}
                className={`w-full text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  theme === "dark" ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-705"
                }`}
              >
                Clear all active ({activeFiltersCount})
              </button>
            )}

            {/* Mobile Resume Matcher Widget */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Candidate Profile</label>
              {renderResumeMatcher()}
            </div>

            {/* Sort order dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sort Order</label>
              <select
                value={filters.sort}
                onChange={(e) => setSort(e.target.value)}
                className={`w-full rounded-lg border px-2 py-1.5 text-xs font-semibold outline-none cursor-pointer ${
                  theme === "dark"
                    ? "border-slate-800 bg-slate-950 text-slate-200 focus:border-emerald-500 focus:bg-slate-900"
                    : "border-slate-200 bg-slate-50 text-slate-700 focus:border-emerald-500 focus:bg-white"
                }`}
              >
                <option value="recent">Date Posted (Newest)</option>
                <option value="tier">Firm Curated Tier (SSS → S)</option>
                <option value="match">Match Score (Highest)</option>
              </select>
            </div>

            {/* Tiers Checklist */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Experience Tier</h4>
              <div className="space-y-1.5">
                {TIERS.map((tier) => (
                  <label key={tier} className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                    theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                  }`}>
                    <input
                      type="checkbox"
                      checked={filters.tiers.includes(tier)}
                      onChange={() => toggle("tiers", tier)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-800 text-emerald-600"
                    />
                    <span>{tier}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Firms Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider">Firms</h4>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideBackups}
                    onChange={(e) => setHideBackups(e.target.checked)}
                    className="h-3 w-3 rounded border-slate-300 dark:border-slate-800 text-emerald-600"
                  />
                  <span>Hide Backups</span>
                </label>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {availableFirms.map((firm) => (
                  <label key={firm} className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                    theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                  }`}>
                    <input
                      type="checkbox"
                      checked={filters.firms.includes(firm)}
                      onChange={() => toggle("firms", firm)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-800 text-emerald-600"
                    />
                    <span>{firm}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Roles Checklist */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Role Type</h4>
              <div className="space-y-1.5">
                {ROLES.map((role) => (
                  <label key={role} className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                    theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                  }`}>
                    <input
                      type="checkbox"
                      checked={filters.roles.includes(role)}
                      onChange={() => toggle("roles", role)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-800 text-emerald-600"
                    />
                    <span>{role}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Locations Checklist */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider">Locations</h4>
              <div className="space-y-1.5">
                {LOCATIONS.map((loc) => (
                  <label key={loc} className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                    theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-900"
                  }`}>
                    <input
                      type="checkbox"
                      checked={filters.locations.includes(loc)}
                      onChange={() => toggle("locations", loc)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-800 text-emerald-600"
                    />
                    <span>{loc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Languages Checklist */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider">Languages</h4>
              <div className="space-y-1.5">
                {LANGUAGES.map((lang) => (
                  <label key={lang} className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                    theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-705 hover:text-slate-900"
                  }`}>
                    <input
                      type="checkbox"
                      checked={filters.languages.includes(lang)}
                      onChange={() => toggle("languages", lang)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-800 text-emerald-600"
                    />
                    <span>{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* View results action */}
            <button
              onClick={() => setShowMobileFilters(false)}
              className="mt-auto w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Show {ranked.length} Results
            </button>
          </div>
        </div>
      )}

      {/* Apply Assistant Modal */}
      {assistJob && (
        <ApplyAssistant
          job={assistJob}
          profile={profile}
          theme={theme}
          initialLetter={apps[assistJob.id]?.coverLetter}
          onClose={() => setAssistJob(null)}
          onSave={(letter) => saveLetter(assistJob.id, letter)}
        />
      )}
    </div>
  );
}

/* ------------------------------ ring component --------------------- */
function MatchRing({ score, theme }) {
  const color = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-slate-300";
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="currentColor" strokeWidth="5" className={theme === "dark" ? "text-slate-850" : "text-slate-100"} />
        <circle cx="30" cy="30" r={r} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} className={color} />
      </svg>
      <span className={`absolute text-sm font-black tabular-nums ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{score}</span>
    </div>
  );
}
