import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Scissors, Copy, Check } from 'lucide-react';
import { chunkPaper } from '../services/api';
import type { Paper, ChunkingResult } from '../types';

interface ChunkViewerProps {
  paper: Paper;
  onClose: () => void;
}

export const ChunkViewer: React.FC<ChunkViewerProps> = ({ paper, onClose }) => {
  const [chunkSize, setChunkSize] = useState(800);
  const [chunkOverlap, setChunkOverlap] = useState(150);
  
  const [result, setResult] = useState<ChunkingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [filterPage, setFilterPage] = useState<number | 'all'>('all');

  const executeChunking = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chunkPaper(paper.id, chunkSize, chunkOverlap);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to chunk document.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeChunking();
  }, [paper.id]);

  const handleCopyChunk = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const filteredChunks = result?.chunks.filter(
    (c) => filterPage === 'all' || c.page_number === filterPage
  ) || [];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate max-w-md">{paper.title}</h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                  Chunking Inspector
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

        {/* Hyperparameter Controls Bar */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <label className="text-xs text-slate-400 flex items-center justify-between font-medium">
              <span>Chunk Size (Characters): <strong className="text-indigo-400">{chunkSize}</strong></span>
              <span className="text-[10px] text-slate-500">(200 - 2000)</span>
            </label>
            <input
              type="range"
              min="200"
              max="2000"
              step="50"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className="w-full mt-1.5 accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 flex items-center justify-between font-medium">
              <span>Chunk Overlap (Characters): <strong className="text-cyan-400">{chunkOverlap}</strong></span>
              <span className="text-[10px] text-slate-500">(0 - 400)</span>
            </label>
            <input
              type="range"
              min="0"
              max="400"
              step="25"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
              className="w-full mt-1.5 accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={executeChunking}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Re-chunk Document
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
          
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-16">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-300 font-medium">Splitting document into recursive overlapping chunks...</p>
              <p className="text-xs text-slate-500">Separators: Paragraphs → Sentences → Spaces</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-rose-400 text-sm p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              {error}
            </div>
          ) : result ? (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 text-center text-xs">
                <div>
                  <span className="text-slate-500">Total Chunks Created</span>
                  <p className="text-base font-extrabold text-indigo-400 mt-0.5">{result.total_chunks}</p>
                </div>
                <div>
                  <span className="text-slate-500">Chunk Size</span>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">{result.chunk_size} chars</p>
                </div>
                <div>
                  <span className="text-slate-500">Chunk Overlap</span>
                  <p className="text-sm font-bold text-cyan-400 mt-0.5">{result.chunk_overlap} chars</p>
                </div>
                <div>
                  <span className="text-slate-500">Total Words</span>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">{result.total_words.toLocaleString()}</p>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">
                  Showing <strong className="text-white">{filteredChunks.length}</strong> of {result.total_chunks} chunks
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Filter by Page:</span>
                  <select
                    value={filterPage}
                    onChange={(e) => setFilterPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Pages</option>
                    {Array.from(new Set(result.chunks.map((c) => c.page_number))).map((p) => (
                      <option key={p} value={p}>Page {p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chunks Cards Scrollable Grid */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {filteredChunks.map((chunk) => (
                  <div
                    key={chunk.chunk_index}
                    className="bg-slate-950 border border-slate-800/90 hover:border-indigo-500/40 rounded-2xl p-4 space-y-3 transition-all group"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold rounded-lg font-mono">
                          Chunk #{chunk.chunk_index}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[11px] font-medium rounded-lg">
                          Page {chunk.page_number}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Chars {chunk.start_char}–{chunk.end_char} ({chunk.char_count} chars)
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopyChunk(chunk.text, chunk.chunk_index)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg flex items-center gap-1 transition-colors"
                      >
                        {copiedIdx === chunk.chunk_index ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 text-center text-xs text-slate-500">
          Recursive Character Text Chunker • Each chunk contains page citations for 100% grounded RAG answers
        </div>
      </div>
    </div>
  );
};
