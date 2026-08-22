import React, { useState } from 'react';
import { BookOpen, Sparkles, Download, Copy, Check, Loader2, FileCode, Layers } from 'lucide-react';
import type { Paper, LiteratureReviewResponse } from '../types';
import { generateLiteratureReview, exportAcademicContent } from '../services/api';

interface LiteratureReviewViewProps {
  papers: Paper[];
}

export const LiteratureReviewView: React.FC<LiteratureReviewViewProps> = ({ papers }) => {
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>(papers.map(p => p.id));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiteratureReviewResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);

  const togglePaper = (id: string) => {
    if (selectedPaperIds.includes(id)) {
      setSelectedPaperIds(selectedPaperIds.filter(item => item !== id));
    } else {
      setSelectedPaperIds([...selectedPaperIds, id]);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateLiteratureReview(selectedPaperIds);
      setResult(res);
    } catch (err) {
      console.error('Failed to generate Literature Review:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.literature_review_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: 'latex' | 'bibtex' | 'markdown' | 'json') => {
    if (!result) return;
    setExporting(true);
    try {
      const exp = await exportAcademicContent('Literature_Review', result.literature_review_markdown, format, selectedPaperIds);
      
      const blob = new Blob([exp.exported_content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Literature_Review.${format === 'latex' ? 'tex' : format === 'bibtex' ? 'bib' : format}`;
      link.click();
      URL.revokeObjectURL(url);
      setExportedFormat(format);
      setTimeout(() => setExportedFormat(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Autonomous Literature Review Generator</h2>
              <p className="text-xs text-slate-400">Synthesize multi-paper survey reports with LaTeX & BibTeX exports</p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || papers.length === 0}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Synthesize Literature Review
          </button>
        </div>

        {/* Paper Selector Checkboxes */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-indigo-400" /> Select Papers ({selectedPaperIds.length}):
          </span>
          {papers.map(p => (
            <button
              key={p.id}
              onClick={() => togglePaper(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 ${
                selectedPaperIds.includes(p.id)
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${selectedPaperIds.includes(p.id) ? 'bg-indigo-400' : 'bg-slate-600'}`} />
              <span className="truncate max-w-[180px]">{p.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generated Report Display */}
      {result && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 animate-fadeIn">
          
          {/* Action toolbar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="text-xs text-slate-400 font-mono">
              Analyzed <strong className="text-white">{result.paper_count}</strong> papers in {result.latency_ms} ms
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy MD'}
              </button>

              <button
                onClick={() => handleExport('latex')}
                disabled={exporting}
                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl text-xs font-medium border border-indigo-500/30 transition-colors flex items-center gap-1.5"
              >
                <FileCode className="h-3.5 w-3.5 text-indigo-400" />
                Export LaTeX (.tex)
              </button>

              <button
                onClick={() => handleExport('bibtex')}
                disabled={exporting}
                className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-xl text-xs font-medium border border-purple-500/30 transition-colors flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-purple-400" />
                BibTeX (.bib)
              </button>
            </div>
          </div>

          {exportedFormat && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              ✓ Exported Literature Review successfully as .{exportedFormat}
            </div>
          )}

          {/* Markdown Content */}
          <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed font-sans space-y-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 whitespace-pre-wrap font-mono text-xs">
              {result.literature_review_markdown}
            </div>
          </div>

          {/* BibTeX References Block */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <FileCode className="h-4 w-4 text-purple-400" /> BibTeX References Block
            </h4>
            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-300 overflow-x-auto whitespace-pre-wrap">
              {result.bibtex_citations}
            </pre>
          </div>

        </div>
      )}

    </div>
  );
};
