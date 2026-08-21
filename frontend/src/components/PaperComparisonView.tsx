import React, { useState, useEffect } from 'react';
import { 
  Columns3, 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  AlertCircle, 
  Cpu, 
  Database, 
  BarChart3, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import { comparePapers } from '../services/api';
import type { Paper, ComparisonMatrixResponse, ComparisonItemSchema } from '../types';

interface PaperComparisonViewProps {
  papers: Paper[];
}

export const PaperComparisonView: React.FC<PaperComparisonViewProps> = ({ papers }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [matrix, setMatrix] = useState<ComparisonMatrixResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (papers.length > 0 && selectedIds.length === 0) {
      const idsToSelect = papers.slice(0, 3).map((p) => p.id);
      setSelectedIds(idsToSelect);
      if (idsToSelect.length >= 2) {
        runComparison(idsToSelect);
      }
    }
  }, [papers]);

  const togglePaperSelection = (id: string) => {
    const updated = selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
    setSelectedIds(updated);
    if (updated.length >= 2) {
      runComparison(updated);
    }
  };

  const runComparison = async (paperIds: string[]) => {
    if (paperIds.length < 2) {
      setError('Please select at least 2 papers to perform comparative analysis.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await comparePapers(paperIds);
      setMatrix(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Paper comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => runComparison(selectedIds);

  const handleCopy = () => {
    if (!matrix) return;
    const report = `MULTI-PAPER COMPARATIVE RESEARCH MATRIX

Summary:
${matrix.comparative_summary}

` + matrix.compared_papers.map((p: ComparisonItemSchema, idx: number) => `
=== Paper ${idx + 1}: ${p.title} ===
- Core Problem: ${p.problem}
- Methodology: ${p.methodology}
- Datasets: ${p.dataset}
- Results: ${p.results}
- Key Strengths: ${p.strengths}
- Limitations: ${p.limitations}
`).join('\n');

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full font-bold font-mono">
            Multi-Document Comparison
          </span>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold">
            Side-by-Side Research Matrix
          </span>
        </div>

        <h2 className="text-2xl font-extrabold text-white tracking-tight">Paper Comparison Matrix</h2>
        <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
          Select 2 or more uploaded research papers to synthesize an attribute-by-attribute side-by-side comparison table (Problem, Architecture, Datasets, Metrics, Strengths, Limitations).
        </p>

        {/* Paper Selector Checkboxes */}
        <div className="pt-2 space-y-2">
          <label className="text-xs font-bold text-slate-300">Select Papers to Compare ({selectedIds.length} Selected):</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {papers.length === 0 ? (
              <p className="text-xs text-slate-400">No papers available in library.</p>
            ) : (
              papers.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePaperSelection(p.id)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 text-white font-semibold shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="truncate">{p.title}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="pt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={handleCompare}
            disabled={selectedIds.length < 2 || loading}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Synthesizing Matrix...
              </>
            ) : (
              <>
                <Columns3 className="h-4 w-4" /> Compare Selected Papers ({selectedIds.length})
              </>
            )}
          </button>

          {matrix && (
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied Matrix!' : 'Copy Comparative Report'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* Comparative Matrix Results */}
      {matrix && (
        <div className="space-y-6">
          
          {/* High-Level Synthesis Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Comparative Meta-Synthesis
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {matrix.comparative_summary}
            </p>
          </div>

          {/* Side-by-Side Comparison Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                
                {/* Table Header: Paper Titles */}
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800">
                    <th className="p-4 font-bold text-slate-400 uppercase tracking-wider w-48 shrink-0 bg-slate-950 sticky left-0 border-r border-slate-800">
                      Feature Dimension
                    </th>
                    {matrix.compared_papers.map((p: ComparisonItemSchema, idx: number) => (
                      <th key={idx} className="p-4 font-bold text-white min-w-[280px] border-r border-slate-800/60 last:border-r-0">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-[10px] font-mono font-bold">
                            #{idx + 1}
                          </span>
                          <span className="truncate">{p.title}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80">
                  
                  {/* Row 1: Problem Statement */}
                  <tr className="hover:bg-slate-900/50">
                    <td className="p-4 font-bold text-rose-400 bg-slate-950 sticky left-0 border-r border-slate-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" /> Core Problem
                    </td>
                    {matrix.compared_papers.map((p: ComparisonItemSchema, idx: number) => (
                      <td key={idx} className="p-4 text-slate-300 leading-relaxed border-r border-slate-800/60 last:border-r-0">
                        {p.problem}
                      </td>
                    ))}
                  </tr>

                  {/* Row 2: Proposed Methodology */}
                  <tr className="hover:bg-slate-900/50">
                    <td className="p-4 font-bold text-cyan-400 bg-slate-950 sticky left-0 border-r border-slate-800 flex items-center gap-2">
                      <Cpu className="h-4 w-4 shrink-0" /> Architecture / Method
                    </td>
                    {matrix.compared_papers.map((p: ComparisonItemSchema, idx: number) => (
                      <td key={idx} className="p-4 text-slate-300 leading-relaxed border-r border-slate-800/60 last:border-r-0">
                        {p.methodology}
                      </td>
                    ))}
                  </tr>

                  {/* Row 3: Datasets */}
                  <tr className="hover:bg-slate-900/50">
                    <td className="p-4 font-bold text-amber-400 bg-slate-950 sticky left-0 border-r border-slate-800 flex items-center gap-2">
                      <Database className="h-4 w-4 shrink-0" /> Datasets Evaluated
                    </td>
                    {matrix.compared_papers.map((p: ComparisonItemSchema, idx: number) => (
                      <td key={idx} className="p-4 text-slate-300 leading-relaxed border-r border-slate-800/60 last:border-r-0 font-mono text-[11px]">
                        {p.dataset}
                      </td>
                    ))}
                  </tr>

                  {/* Row 4: Results */}
                  <tr className="hover:bg-slate-900/50">
                    <td className="p-4 font-bold text-emerald-400 bg-slate-950 sticky left-0 border-r border-slate-800 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 shrink-0" /> Results & Metrics
                    </td>
                    {matrix.compared_papers.map((p: ComparisonItemSchema, idx: number) => (
                      <td key={idx} className="p-4 text-slate-300 leading-relaxed border-r border-slate-800/60 last:border-r-0">
                        {p.results}
                      </td>
                    ))}
                  </tr>

                  {/* Row 5: Strengths */}
                  <tr className="hover:bg-slate-900/50">
                    <td className="p-4 font-bold text-indigo-400 bg-slate-950 sticky left-0 border-r border-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" /> Key Strengths
                    </td>
                    {matrix.compared_papers.map((p: ComparisonItemSchema, idx: number) => (
                      <td key={idx} className="p-4 text-slate-300 leading-relaxed border-r border-slate-800/60 last:border-r-0">
                        {p.strengths}
                      </td>
                    ))}
                  </tr>

                  {/* Row 6: Limitations */}
                  <tr className="hover:bg-slate-900/50">
                    <td className="p-4 font-bold text-orange-400 bg-slate-950 sticky left-0 border-r border-slate-800 flex items-center gap-2">
                      <XCircle className="h-4 w-4 shrink-0" /> Limitations
                    </td>
                    {matrix.compared_papers.map((p: ComparisonItemSchema, idx: number) => (
                      <td key={idx} className="p-4 text-slate-300 leading-relaxed border-r border-slate-800/60 last:border-r-0">
                        {p.limitations}
                      </td>
                    ))}
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
