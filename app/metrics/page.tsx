"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, BarChart2, LayoutDashboard, Database } from "lucide-react";
import { useTheme } from "next-themes";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { JOBS } from "@/lib/sampleJobs";

export default function MetricsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [kanbanTasks, setKanbanTasks] = useState({ saved: [], applied: [], interviewing: [], offer: [], rejected: [] });

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("kanban:v1");
    if (saved) setKanbanTasks(JSON.parse(saved));
  }, []);

  if (!mounted) return null;

  // Compute metrics from sample jobs + kanban
  const totalApplied = kanbanTasks.applied.length + kanbanTasks.interviewing.length + kanbanTasks.offer.length + kanbanTasks.rejected.length;
  
  const roleData = [
    { name: "Researcher", count: JOBS.filter(j => j.role === "Researcher").length },
    { name: "Trader", count: JOBS.filter(j => j.role === "Trader").length },
    { name: "Developer", count: JOBS.filter(j => j.role === "Developer").length },
    { name: "Data Sci.", count: JOBS.filter(j => j.role === "Data Scientist").length },
  ];

  const tierData = [
    { name: "SSS Tier", value: JOBS.filter(j => j.tier === "SSS").length },
    { name: "SS Tier", value: JOBS.filter(j => j.tier === "SS").length },
    { name: "S Tier", value: JOBS.filter(j => j.tier === "S").length },
  ];

  const COLORS = ['#4f46e5', '#818cf8', '#c7d2fe'];

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">Q</div>
            <span className="hidden sm:inline">Quant Jobs</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Link href="/" className="px-3 py-1.5 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
              <LayoutDashboard size={16} /> Feed
            </Link>
            <Link href="/applications" className="px-3 py-1.5 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
              <Briefcase size={16} /> Applications
            </Link>
            <Link href="/metrics" className="px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 flex items-center gap-2">
              <BarChart2 size={16} /> Metrics
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Metrics Overview</h1>
          <p className="text-zinc-500">Track your application pipeline and market demand.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2 text-zinc-500">
              <Database size={20} />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Total Scraped</h3>
            </div>
            <p className="text-4xl font-black text-zinc-900 dark:text-white">{JOBS.length}</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2 text-indigo-600 dark:text-indigo-400">
              <Briefcase size={20} />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Total Applied</h3>
            </div>
            <p className="text-4xl font-black text-indigo-900 dark:text-indigo-100">{totalApplied}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2 text-emerald-500">
              <BarChart2 size={20} />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Interview Rate</h3>
            </div>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
              {totalApplied > 0 ? Math.round((kanbanTasks.interviewing.length / totalApplied) * 100) : 0}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm h-96">
            <h3 className="font-semibold text-lg mb-6">Market Demand by Role</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm h-96">
            <h3 className="font-semibold text-lg mb-6">Jobs by Tier</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tierData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                  {tierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
