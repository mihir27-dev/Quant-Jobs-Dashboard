"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Link from "next/link";
import { Briefcase, BarChart2, LayoutDashboard, ChevronLeft } from "lucide-react";
import { useTheme } from "next-themes";

const COLUMNS = {
  saved: { id: "saved", title: "Saved" },
  applied: { id: "applied", title: "Applied" },
  interviewing: { id: "interviewing", title: "Interviewing" },
  offer: { id: "offer", title: "Offer" },
  rejected: { id: "rejected", title: "Rejected" },
};

export default function ApplicationsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState({});

  useEffect(() => {
    setMounted(true);
    // Load tasks from local storage or initialize empty
    const saved = localStorage.getItem("kanban:v1");
    if (saved) {
      setTasks(JSON.parse(saved));
    } else {
      setTasks({
        saved: [],
        applied: [],
        interviewing: [],
        offer: [],
        rejected: []
      });
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("kanban:v1", JSON.stringify(tasks));
    }
  }, [tasks, mounted]);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId !== destination.droppableId) {
      const sourceCol = [...tasks[source.droppableId]];
      const destCol = [...tasks[destination.droppableId]];
      const [removed] = sourceCol.splice(source.index, 1);
      destCol.splice(destination.index, 0, removed);
      
      setTasks(prev => ({
        ...prev,
        [source.droppableId]: sourceCol,
        [destination.droppableId]: destCol
      }));
    } else {
      const col = [...tasks[source.droppableId]];
      const [removed] = col.splice(source.index, 1);
      col.splice(destination.index, 0, removed);
      
      setTasks(prev => ({
        ...prev,
        [source.droppableId]: col
      }));
    }
  };

  if (!mounted) return null;

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
            <Link href="/applications" className="px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 flex items-center gap-2">
              <Briefcase size={16} /> Applications
            </Link>
            <Link href="/metrics" className="px-3 py-1.5 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
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

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="h-full inline-flex items-start gap-6 min-w-max">
          <DragDropContext onDragEnd={onDragEnd}>
            {Object.entries(COLUMNS).map(([columnId, column]) => {
              const columnTasks = tasks[columnId] || [];
              return (
                <div key={columnId} className="w-80 flex flex-col h-full bg-zinc-200/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="p-4 flex items-center justify-between shrink-0">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-700 dark:text-zinc-300">{column.title}</h3>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-300 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{columnTasks.length}</span>
                  </div>
                  
                  <Droppable droppableId={columnId}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 p-3 overflow-y-auto space-y-3 transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50/50 dark:bg-indigo-900/10" : ""}`}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-4 rounded-lg bg-white dark:bg-zinc-950 border transition-all ${
                                  snapshot.isDragging ? "border-indigo-500 shadow-xl scale-[1.02] rotate-1" : "border-zinc-200 dark:border-zinc-800 shadow-sm"
                                }`}
                              >
                                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">{task.firm}</div>
                                <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 leading-snug mb-3">{task.title}</h4>
                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                                  <span className="text-xs text-zinc-500">{task.locationGroup}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">{task.tier}</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}
