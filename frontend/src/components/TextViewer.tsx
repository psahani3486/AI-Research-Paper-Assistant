import React, { useState, useEffect } from 'react';
import { FileText, Loader2, ChevronLeft, ChevronRight, Copy, Check, Search, Sparkles } from 'lucide-react';
import { extractPaperText } from '../services/api';
import type { Paper, ExtractionResult } from '../types';

interface TextViewerProps {
  paper: Paper;
  onClose: () => void;
}

export const TextViewer: React.FC<TextViewerProps> = ({ paper, onClose }) => {
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchExtraction = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await extractPaperText(paper.id);
        setExtraction(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to extract text from PDF.');
      } finally {
        setLoading(false);
      }
    };
    fetchExtraction();
  }, [paper.id]);

  const currentPageData = extraction?.pages.find((p) => p.page_number === activePage);

  const handleCopy = () => {
    if (currentPageData?.text) {
      navigator.clipboard.writeText(currentPageData.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate max-w-md">{paper.title}</h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                  Extracted Text Inspection
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">{paper.filename}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
          
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-16">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-300 font-medium">Extracting and cleaning text with PyMuPDF...</p>
              <p className="text-xs text-slate-500">Fixing hyphenated line breaks & normalizing whitespace</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-rose-400 text-sm p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              {error}
            </div>
          ) : extraction ? (
            <>
              {/* Summary Bar */}
              <div className="grid grid-cols-4 gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 text-center text-xs">
                <div>
                  <span className="text-slate-500">Total Pages</span>
                  <p className="text-sm font-bold text-indigo-400 mt-0.5">{extraction.total_pages}</p>
                </div>
                <div>
                  <span className="text-slate-500">Total Words</span>
                  <p className="text-sm font-bold text-cyan-400 mt-0.5">{extraction.total_words.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500">Characters</span>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">{extraction.total_characters.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500">Cleaner Status</span>
                  <p className="text-xs font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
                    <Sparkles className="h-3 w-3" /> Academic Cleaned
                  </p>
                </div>
              </div>

              {/* Page Controls & Search */}
              <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                <div className="flex items-center gap-2">
                  <button
                    disabled={activePage <= 1}
                    onClick={() => setActivePage((prev) => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-200">
                    Page <strong className="text-indigo-400">{activePage}</strong> of {extraction.total_pages}
                  </span>
                  <button
                    disabled={activePage >= extraction.total_pages}
                    onClick={() => setActivePage((prev) => Math.min(extraction.total_pages, prev + 1))}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter page text..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    onClick={handleCopy}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy Page
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Page Text Viewer Area */}
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
                {currentPageData ? (
                  currentPageData.text ? (
                    currentPageData.text
                  ) : (
                    <span className="text-slate-500 italic">[No text extracted on this page - Scanned image or empty page]</span>
                  )
                ) : (
                  <span className="text-slate-500 italic">Select a page to inspect.</span>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 text-center text-xs text-slate-500">
          PyMuPDF Page Extraction Engine • Rejoined line hyphens & cleaned layout artifacts
        </div>
      </div>
    </div>
  );
};
