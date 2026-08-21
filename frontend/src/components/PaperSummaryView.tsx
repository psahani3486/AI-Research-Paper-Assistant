import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Cpu, 
  Database, 
  BarChart3, 
  HelpCircle, 
  Compass, 
  Copy, 
  Check, 
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { summarizePaper, getPaperSummary } from '../services/api';
import type { Paper, PaperSummaryResponse } from '../types';

interface PaperSummaryViewProps {
  papers: Paper[];
}

export const PaperSummaryView: React.FC<PaperSummaryViewProps> = ({ papers }) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [summary, setSummary] = useState<PaperSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (papers.length > 0 && !selectedPaperId) {
      setSelectedPaperId(papers[0].id);
    }
  }, [papers]);

  useEffect(() => {
    if (selectedPaperId) {
      fetchSummary(selectedPaperId);
    }
  }, [selectedPaperId]);

  const fetchSummary = async (paperId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPaperSummary(paperId);
      setSummary(data);
    } catch (err) {
      console.log('No cached summary found, auto-generating...');
      try {
        const generatedData = await summarizePaper(paperId, false);
        setSummary(generatedData);
      } catch (genErr: unknown) {
        setError(genErr instanceof Error ? genErr.message : 'Summarization failed');
        setSummary(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (forceRefresh: boolean = false) => {
    if (!selectedPaperId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await summarizePaper(selectedPaperId, forceRefresh);
      setSummary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Summarization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    const reportText = `ACADEMIC RESEARCH PAPER SUMMARY

Title: ${currentPaper?.title || 'Research Paper'}

1. ABSTRACT SUMMARY:
${summary.abstract_summary}

2. PROBLEM STATEMENT & RESEARCH GAP:
${summary.problem}

3. PROPOSED METHODOLOGY & ARCHITECTURE:
${summary.methodology}

4. DATASETS & BENCHMARKS:
${summary.dataset}

5. KEY RESULTS & PERFORMANCE:
${summary.results}

6. LIMITATIONS & WEAKNESSES:
${summary.limitations}

7. FUTURE WORK & RESEARCH DIRECTIONS:
${summary.future_work}
`;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPaper = papers.find((p) => p.id === selectedPaperId);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold font-mono">
              7-Pillar Academic Analysis
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Structured Paper Summarization</h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Extracts 7 core academic pillars (Abstract, Problem, Methodology, Datasets, Results, Limitations, and Future Directions) using Groq LLM with persistent SQLite caching.
            </p>
          </div>

          {/* Paper Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-2 shrink-0">
            <BookOpen className="h-4 w-4 text-indigo-400 ml-2" />
            <select
              value={selectedPaperId}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none max-w-[220px] truncate cursor-pointer py-1 pr-2"
            >
              {papers.length === 0 ? (
                <option value="">No papers uploaded</option>
              ) : (
                papers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.title}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleGenerate(summary ? true : false)}
            disabled={!selectedPaperId || loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Synthesizing 7-Pillar Summary...
              </>
            ) : summary ? (
              <>
                <RefreshCw className="h-4 w-4" /> Re-Generate Summary
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" /> Generate Structured Summary
              </>
            )}
          </button>

          {summary && (
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied Report!' : 'Copy Summary Report'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto" />
          <h4 className="text-base font-bold text-white">Analyzing Academic Sections...</h4>
          <p className="text-xs text-slate-400">
            PyMuPDF context parsing + Groq LLM (groq/compound) 7-pillar JSON synthesis in progress.
          </p>
        </div>
      ) : !summary ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <FileText className="h-7 w-7" />
          </div>
          <h4 className="text-base font-bold text-white">No Summary Generated Yet</h4>
          <p className="text-xs text-slate-400">
            Click <strong>Generate Structured Summary</strong> above to extract problem, methodology, dataset, results, limitations & future work.
          </p>
          <button
            onClick={() => handleGenerate(false)}
            disabled={!selectedPaperId}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-amber-300" /> Generate Summary Now
          </button>
        </div>
      ) : (
        /* 7-Pillar Grid Dashboard */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Card 1: Abstract Summary (Indigo) */}
          <div className="md:col-span-2 bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 space-y-3 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-2 text-indigo-400">
              <FileText className="h-5 w-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. Abstract Overview</h3>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {summary.abstract_summary}
            </p>
          </div>

          {/* Card 2: Problem Statement (Rose) */}
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. Problem Statement & Research Gap</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {summary.problem}
            </p>
          </div>

          {/* Card 3: Proposed Methodology (Cyan) */}
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-cyan-400">
              <Cpu className="h-5 w-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">3. Proposed Methodology & Architecture</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {summary.methodology}
            </p>
          </div>

          {/* Card 4: Datasets & Benchmarks (Amber) */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-amber-400">
              <Database className="h-5 w-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">4. Datasets & Benchmarks</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {summary.dataset}
            </p>
          </div>

          {/* Card 5: Key Results & Performance (Emerald) */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-400">
              <BarChart3 className="h-5 w-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">5. Key Results & Performance</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {summary.results}
            </p>
          </div>

          {/* Card 6: Limitations & Weaknesses (Orange) */}
          <div className="bg-slate-900 border border-orange-500/30 rounded-3xl p-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-orange-400">
              <HelpCircle className="h-5 w-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">6. Limitations & Weaknesses</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {summary.limitations}
            </p>
          </div>

          {/* Card 7: Future Work (Purple) */}
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-purple-400">
              <Compass className="h-5 w-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">7. Future Work & Directions</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {summary.future_work}
            </p>
          </div>

        </div>
      )}
    </div>
  );
};
