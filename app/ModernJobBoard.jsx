"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
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
  Filter,
  ArrowUpDown,
  ChevronLeft,
  Building,
  Briefcase,
  Upload,
  FileText,
  AlertCircle,
  UploadCloud,
  CheckCircle2,
  LayoutDashboard,
  BarChart2,
  BookmarkPlus
} from "lucide-react";
import { useJobFilters } from "@/hooks/useJobFilters";
import { filterJobs, TIERS, ROLES, LOCATIONS, LANGUAGES } from "@/lib/filtering";
import { scoreJob } from "@/lib/match";
import { JOBS } from "@/lib/sampleJobs";

const INITIAL_PROFILE = {
  fullName: "Alex Quant",
  roles: ["Researcher", "Trader"],
  languages: ["Python", "C++", "OCaml"],
  skills: ["Statistical Arbitrage", "Machine Learning"],
  locations: ["NYC", "London"],
  summary: "MS in Statistics, 3 years building systematic equity signals in Python/C++, comfortable with stat-arb and applied ML.",
};

function parseResumeText(text) {
  const normalized = text.toLowerCase();
  const languages = [];
  if (/\bc\+\+|\bcpp\b/i.test(normalized)) languages.push("C++");
  if (/\bpython\b/i.test(normalized)) languages.push("Python");
  if (/\brust\b/i.test(normalized)) languages.push("Rust");
  if (/\bocaml\b/i.test(normalized)) languages.push("OCaml");
  if (languages.length === 0) languages.push("Python");

  const skills = [];
  if (/statistical arbitrage|stat arb/i.test(normalized)) skills.push("Statistical Arbitrage");
  if (/machine learning|deep learning|\bml\b/i.test(normalized)) skills.push("Machine Learning");
  if (/low.?latency|hft|high.?frequency/i.test(normalized)) skills.push("Low Latency");
  if (/market making/i.test(normalized)) skills.push("Market Making");

  const locations = [];
  if (/new york|nyc|manhattan/i.test(normalized)) locations.push("NYC");
  if (/london/i.test(normalized)) locations.push("London");
  if (/chicago/i.test(normalized)) locations.push("Chicago");
  if (/singapore/i.test(normalized)) locations.push("Singapore");
  if (/hong kong/i.test(normalized)) locations.push("Hong Kong");
  if (locations.length === 0) locations.push("NYC");

  const roles = [];
  if (/researcher|scientist|quant analyst/i.test(normalized)) roles.push("Researcher");
  if (/trader|trading/i.test(normalized)) roles.push("Trader");
  if (/developer|engineer|swe|software/i.test(normalized)) roles.push("Developer");
  if (/data scientist/i.test(normalized)) roles.push("Data Scientist");
  if (roles.length === 0) roles.push("Developer");

  return {
    fullName: "Uploaded Resume Profile",
    roles,
    languages,
    skills,
    locations,
    summary: `Uploaded profile: ${roles.join("/")} with skills in ${skills.length > 0 ? skills.join(", ") : "quant finance"} and proficiency in ${languages.join(", ")}.`,
  };
}

const STATUSES = ["Saved", "Applied", "Interviewing", "Offer", "Rejected"];
const STORE_KEY = "applications:v2";

const TIER_STYLES = {
  SSS: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800/60 font-semibold",
  SS: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ring-1 ring-zinc-200 dark:ring-zinc-700 font-medium",
  S: "bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium",
};

const ensureAbsoluteUrl = (url) => {
  if (!url) return "#";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `https://${trimmed.substring(1)}`;
  return `https://${trimmed}`;
};

const isBackupFirm = (firmName) => {
  if (!firmName) return false;
  const name = firmName.toLowerCase();
  return (
    name.includes("nk securities") || name.includes("graviton") || name.includes("alphagrep") ||
    name.includes("aqr") || name.includes("deshaw") || name.includes("d. e. shaw") ||
    name.includes("jpmc") || name.includes("jpmorgan") || name.includes("gs") || name.includes("goldman sachs")
  );
};

function ApplyAssistant({ job, profile, initialLetter, onClose, onSave }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Sparkles size={16} className="text-indigo-500" /> Apply Assistant
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{job.title} at {job.firm}</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Tailored Cover Letter</span>
            <button onClick={generate} disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {letter ? "Regenerate Draft" : "Generate Draft"}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">{error}</p>}
          <textarea
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            placeholder="Click generate to write a tailored cover letter..."
            className="w-full h-64 resize-none rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-sm leading-relaxed bg-transparent focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-zinc-200"
          />
        </div>

        <div className="flex items-center justify-between p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <button onClick={copy} disabled={!letter} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50">
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={() => { onSave(letter); onClose(); }} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              Save Draft
            </button>
          </div>
          <a href={ensureAbsoluteUrl(job.applyUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-5 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">
            Open Application <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ModernJobBoard({ initialJobs }) {
  const { filters, toggle, setQuery, setSort, clearAll } = useJobFilters();
  const [apps, setApps] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [assistJob, setAssistJob] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hideBackups, setHideBackups] = useState(false);
  const [cvAnalysisMap, setCvAnalysisMap] = useState({});
  const [isAnalyzingCV, setIsAnalyzingCV] = useState(false);
  const { theme, setTheme } = useTheme();

  // Load kanban tasks for status tracking globally if needed
  const [kanbanTasks, setKanbanTasks] = useState(null);
  useEffect(() => {
    const saved = localStorage.getItem("kanban:v1");
    if (saved) setKanbanTasks(JSON.parse(saved));
  }, []);

  const saveToKanban = (job) => {
    let tasks = kanbanTasks || { saved: [], applied: [], interviewing: [], offer: [], rejected: [] };
    if (!tasks.saved.find(t => t.id === job.id)) {
      tasks.saved = [job, ...tasks.saved];
      setKanbanTasks({ ...tasks });
      localStorage.setItem("kanban:v1", JSON.stringify(tasks));
      alert("Saved to Kanban Board!");
    }
  };

  const jobsList = useMemo(() => initialJobs?.length ? initialJobs : JOBS, [initialJobs]);

  const availableFirms = useMemo(() => {
    const list = jobsList.map(j => j.firm);
    const unique = Array.from(new Set(list));
    return hideBackups ? unique.filter(f => !isBackupFirm(f)).sort() : unique.sort();
  }, [jobsList, hideBackups]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setApps(JSON.parse(raw));
    } catch {} finally {
      setLoaded(true);
    }
  }, []);

  function persist(next) {
    setApps(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
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

  const analyzeCV = async (job) => {
    setIsAnalyzingCV(true);
    try {
      const res = await fetch("/api/cv-scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, job }),
      });
      const data = await res.json();
      if (!data.error) setCvAnalysisMap(prev => ({ ...prev, [job.id]: data }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingCV(false);
    }
  };

  const ranked = useMemo(() => {
    const scored = jobsList.map(j => ({ ...j, match: scoreJob(j, profile) }));
    let preFiltered = hideBackups ? scored.filter(j => !isBackupFirm(j.firm)) : scored;
    const filtered = filterJobs(preFiltered, filters);
    if (filters.sort === "match") return [...filtered].sort((a, b) => b.match.score - a.match.score);
    return filtered;
  }, [jobsList, filters, profile, hideBackups]);

  useEffect(() => {
    if (ranked.length > 0 && !selectedJobId) setSelectedJobId(ranked[0].id);
  }, [ranked, selectedJobId]);

  const selectedJob = useMemo(() => ranked.find(j => j.id === selectedJobId) || null, [ranked, selectedJobId]);

  const [localSearch, setLocalSearch] = useState(filters.q);
  useEffect(() => { setLocalSearch(filters.q); }, [filters.q]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(localSearch), 250);
    return () => clearTimeout(timer);
  }, [localSearch, setQuery]);

  const activeFiltersCount = filters.tiers.length + filters.firms.length + filters.roles.length + filters.locations.length + filters.languages.length + (filters.q.trim() ? 1 : 0);

  function renderSidebar() {
    return (
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-6 flex flex-col gap-8 overflow-y-auto hidden lg:flex shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide text-zinc-900 dark:text-zinc-100 uppercase">Filters</h2>
          {activeFiltersCount > 0 && <button onClick={clearAll} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Clear</button>}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Candidate Profile</h3>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) {
                setIsScanning(true);
                const reader = new FileReader();
                reader.onload = (evt) => {
                  if (evt.target?.result) {
                    setProfile(parseResumeText(evt.target.result));
                  }
                  setIsScanning(false);
                };
                reader.readAsText(file);
              }
            }}
            className={`relative border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'}`}
          >
            <input type="file" accept=".txt,.md" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setIsScanning(true);
                const reader = new FileReader();
                reader.onload = (evt) => {
                  if (evt.target?.result) setProfile(parseResumeText(evt.target.result));
                  setIsScanning(false);
                };
                reader.readAsText(file);
              }
            }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            <Upload className={`mx-auto mb-2 ${isScanning ? 'text-indigo-500 animate-bounce' : 'text-zinc-400'}`} size={20} />
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{isScanning ? 'Parsing...' : 'Upload CV (.txt)'}</p>
          </div>
          <p className="text-[10px] text-zinc-400 leading-tight">Match scores rely on this profile. {profile.fullName !== "Alex Quant" && <span className="text-indigo-500 font-medium">Custom profile active.</span>}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sort</h4>
            <select value={filters.sort} onChange={(e) => setSort(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="recent">Most Recent</option>
              <option value="tier">Curated Tier</option>
              <option value="match">Highest Match</option>
            </select>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tier</h4>
            <div className="space-y-1.5">
              {TIERS.map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={filters.tiers.includes(t)} onChange={() => toggle('tiers', t)} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Role</h4>
            <div className="space-y-1.5">
              {ROLES.map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={filters.roles.includes(r)} onChange={() => toggle('roles', r)} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{r}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Location</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {LOCATIONS.map(l => (
                <label key={l} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={filters.locations.includes(l)} onChange={() => toggle('locations', l)} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{l}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Firms</h4>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-500">
                <input type="checkbox" checked={hideBackups} onChange={e => setHideBackups(e.target.checked)} className="rounded border-zinc-300 text-indigo-600" />
                Hide Backups
              </label>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {availableFirms.map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={filters.firms.includes(f)} onChange={() => toggle('firms', f)} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{f}</span>
                </label>
              ))}
            </div>
          </div>

        </div>
      </aside>
    );
  }

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-indigo-500/30">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">Q</div>
            <span className="hidden sm:inline">Quant Jobs</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Link href="/" className="px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 flex items-center gap-2">
              <LayoutDashboard size={16} /> Feed
            </Link>
            <Link href="/applications" className="px-3 py-1.5 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
              <Briefcase size={16} /> Applications
            </Link>
            <Link href="/metrics" className="px-3 py-1.5 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
              <BarChart2 size={16} /> Metrics
            </Link>
          </nav>
        </div>
        
        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search roles, locations, keywords..."
              className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-full py-2 pl-10 pr-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
            {localSearch && <button onClick={() => setLocalSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"><X size={14}/></button>}
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="lg:hidden p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" onClick={() => setShowMobileFilters(true)}><Filter size={20}/></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        {renderSidebar()}
        
        <main className={`flex-1 flex flex-col md:w-[400px] lg:w-[450px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0c] relative overflow-hidden ${selectedJobId ? "hidden md:flex" : "flex"}`}>
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white/95 dark:bg-[#0a0a0c]/95 backdrop-blur-sm z-10 sticky top-0 flex justify-between items-center">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ranked.length} Results</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loaded && ranked.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-zinc-500">No jobs match your criteria.</p>
                <button onClick={clearAll} className="mt-4 text-indigo-600 text-sm font-medium hover:underline">Clear Filters</button>
              </div>
            ) : (
              loaded && ranked.map((job) => {
                const isSelected = job.id === selectedJobId;
                const status = apps[job.id]?.status;
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected 
                        ? "bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20 shadow-sm" 
                        : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide uppercase">{job.firm}</span>
                      {status && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">{status}</span>}
                    </div>
                    <h3 className={`text-base font-semibold leading-snug mb-2 ${isSelected ? "text-indigo-900 dark:text-indigo-100" : "text-zinc-900 dark:text-zinc-100"}`}>
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        <MapPin size={10} /> {job.location}
                      </span>
                      <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${TIER_STYLES[job.tier]}`}>
                        Tier {job.tier}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-medium">
                      <span className="text-zinc-500 flex items-center gap-1"><Clock size={12} /> {job.postedDays || 2}d ago</span>
                      <div className={`px-2 py-0.5 rounded flex items-center gap-1.5 ${
                        job.match.score >= 80 ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20" : 
                        job.match.score >= 60 ? "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20" : 
                        "text-zinc-500 bg-zinc-50 dark:text-zinc-400 dark:bg-zinc-800"
                      }`}>
                        <span>{job.match.score}% Fit</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
        
        <section className={`flex-1 flex-col h-full overflow-hidden bg-white dark:bg-[#0a0a0c] ${!selectedJobId ? "hidden md:flex" : "flex w-full"}`}>
          {selectedJob ? (
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="sticky top-0 bg-white/95 dark:bg-[#0a0a0c]/95 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between md:hidden z-10">
                <button onClick={() => setSelectedJobId(null)} className="text-sm font-medium text-zinc-600 flex items-center gap-1">
                  <ChevronLeft size={16} /> Back to feed
                </button>
              </div>

              <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Building size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedJob.firm}</h2>
                      <p className="text-xs text-zinc-500 flex items-center gap-1"><MapPin size={12}/> {selectedJob.location} • {selectedJob.workMode}</p>
                    </div>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight mb-6">
                    {selectedJob.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <button onClick={() => saveToKanban(selectedJob)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm">
                      <BookmarkPlus size={16} /> Save to Kanban
                    </button>
                    <button onClick={() => setAssistJob(selectedJob)} className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
                      <Sparkles size={16} className="text-amber-500" /> Draft Cover Letter
                    </button>
                    <a href={ensureAbsoluteUrl(selectedJob.applyUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                      Apply via {selectedJob.source === 'greenhouse' ? 'Greenhouse' : 'Company Site'} <ExternalLink size={16} className="text-zinc-400" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800 w-max">
                    {STATUSES.map(status => (
                      <button
                        key={status}
                        onClick={() => setStatus(selectedJob.id, apps[selectedJob.id]?.status === status ? "" : status)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                          apps[selectedJob.id]?.status === status 
                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-700" 
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <FileText size={16} />
                      </div>
                      <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">CV Scanner Analysis</h3>
                    </div>
                    {!cvAnalysisMap[selectedJob.id] && (
                      <button onClick={() => analyzeCV(selectedJob)} disabled={isAnalyzingCV} className="text-sm font-medium bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {isAnalyzingCV ? <Loader2 size={14} className="animate-spin" /> : "Run Deep Scan"}
                      </button>
                    )}
                  </div>
                  
                  {cvAnalysisMap[selectedJob.id] ? (
                    <div className="space-y-5 animate-fade-in">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-900 flex items-center justify-center relative">
                          <span className="text-xl font-black text-indigo-700 dark:text-indigo-300">{cvAnalysisMap[selectedJob.id].atsScore}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">ATS Match Score</p>
                          <p className="text-sm text-zinc-500">Based on your uploaded CV.</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        {cvAnalysisMap[selectedJob.id].missingKeywords?.length > 0 && (
                          <div className="space-y-2 bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <h4 className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-500"/> Missing Keywords</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {cvAnalysisMap[selectedJob.id].missingKeywords.map(kw => (
                                <span key={kw} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {cvAnalysisMap[selectedJob.id].recommendations?.length > 0 && (
                          <div className="space-y-2 bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <h4 className="text-xs font-semibold text-zinc-500 uppercase">Recommendations</h4>
                            <ul className="text-[13px] text-zinc-600 dark:text-zinc-300 space-y-1.5 list-disc pl-4">
                              {cvAnalysisMap[selectedJob.id].recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-indigo-700/70 dark:text-indigo-300/70">Click Run Deep Scan to evaluate your resume against this job description using AI.</p>
                  )}
                </div>

                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Job Description</h3>
                  <div className="prose prose-sm dark:prose-invert prose-zinc max-w-none whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                    {selectedJob.description || selectedJob.snippet}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center mb-4 shadow-sm">
                <Briefcase size={24} className="text-zinc-300 dark:text-zinc-600" />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">No job selected</h3>
              <p className="text-sm max-w-xs mx-auto">Select a role from the feed to view its description, analyze your CV match, and draft a cover letter.</p>
            </div>
          )}
        </section>
      </div>

      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
          <div className="relative w-80 bg-white dark:bg-zinc-950 h-full overflow-y-auto animate-slide-left p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="p-2"><X size={20}/></button>
            </div>
            {/* Minimal mobile wrapper for sidebar content */}
            {renderSidebar()}
          </div>
        </div>
      )}

      {assistJob && (
        <ApplyAssistant
          job={assistJob}
          profile={profile}
          initialLetter={apps[assistJob.id]?.coverLetter}
          onClose={() => setAssistJob(null)}
          onSave={(letter) => saveLetter(assistJob.id, letter)}
        />
      )}
    </div>
  );
}
