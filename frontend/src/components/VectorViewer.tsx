import React, { useState, useEffect } from 'react';
import { Cpu, Loader2, RefreshCw, Copy, Check, Sparkles, Binary } from 'lucide-react';
import { generatePaperEmbeddings } from '../services/api';
import type { Paper, EmbeddingResult } from '../types';

interface VectorViewerProps {
  paper: Paper;
  onClose: () => void;
}

export const VectorViewer: React.FC<VectorViewerProps> = ({ paper, onClose }) => {
  const [result, setResult] = useState<EmbeddingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const fetchEmbeddings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generatePaperEmbeddings(paper.id);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate vector embeddings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmbeddings();
  }, [paper.id]);

  const handleCopyVector = (vector: number[], idx: number) => {
    navigator.clipboard.writeText(JSON.stringify(vector));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate max-w-md">{paper.title}</h3>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                  Vector Inspector
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
              <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
              <p className="text-sm text-slate-300 font-medium">Generating 384-dimensional dense vector embeddings with sentence-transformers...</p>
              <p className="text-xs text-slate-500">Model: all-MiniLM-L6-v2 (Normalized Cosine Space)</p>
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
                  <span className="text-slate-500">Embedding Model</span>
                  <p className="text-sm font-bold text-cyan-400 mt-0.5 font-mono">{result.embedding_model}</p>
                </div>
                <div>
                  <span className="text-slate-500">Vector Dimensions</span>
                  <p className="text-sm font-bold text-indigo-400 mt-0.5">{result.dimensions} Floats</p>
                </div>
                <div>
                  <span className="text-slate-500">Total Vectors</span>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">{result.total_embeddings}</p>
                </div>
                <div>
                  <span className="text-slate-500">Normalization</span>
                  <p className="text-xs font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
                    <Sparkles className="h-3 w-3" /> L2 Normalized
                  </p>
                </div>
              </div>

              {/* Header Bar */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">
                  Showing <strong className="text-white">{result.items.length}</strong> vector embeddings
                </span>
                <button
                  onClick={fetchEmbeddings}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-generate Vectors
                </button>
              </div>

              {/* Vector Item Cards Scrollable Grid */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {result.items.map((item) => (
                  <div
                    key={item.chunk_index}
                    className="bg-slate-950 border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-4 space-y-3 transition-all group"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold rounded-lg font-mono flex items-center gap-1">
                          <Binary className="h-3.5 w-3.5" /> Vector #{item.chunk_index}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[11px] font-medium rounded-lg">
                          Page {item.page_number}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {item.vector_dimensions} dimensions
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopyVector(item.sample_vector, item.chunk_index)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg flex items-center gap-1 transition-colors"
                      >
                        {copiedIdx === item.chunk_index ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy Sample
                          </>
                        )}
                      </button>
                    </div>

                    {/* Vector Array Preview */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">
                        Vector Preview (First 5 of 384 dimensions):
                      </div>
                      <div className="font-mono text-xs text-cyan-300 tracking-wide font-semibold">
                        [{item.sample_vector.join(', ')}, ...]
                      </div>
                    </div>

                    {/* Text Snippet */}
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase mb-0.5">Associated Text Chunk:</div>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono">
                        "{item.text_snippet}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 text-center text-xs text-slate-500">
          Sentence-Transformers Engine (all-MiniLM-L6-v2) • 384-dimensional dense vector space for Cosine similarity indexing
        </div>
      </div>
    </div>
  );
};
