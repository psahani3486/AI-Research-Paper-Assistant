import React, { useState } from 'react';
import { Layers, Loader2, Sparkles, ShieldCheck, Database, FileText, CheckCircle2 } from 'lucide-react';
import { assembleRAGPipeline } from '../services/api';
import type { Paper, RAGAssemblyResponse, RAGSourceSchema } from '../types';

interface RAGInspectorProps {
  papers: Paper[];
}

export const RAGInspector: React.FC<RAGInspectorProps> = ({ papers }) => {
  const [query, setQuery] = useState('Summarize the core methodology and linear cross-attention module.');
  const [topK, setTopK] = useState(3);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('all');

  const [loading, setLoading] = useState(false);
  const [pipelinePayload, setPipelinePayload] = useState<RAGAssemblyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!pipelinePayload && query) {
      handleAssemble();
    }
  }, []);

  const handleAssemble = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await assembleRAGPipeline(
        query,
        topK,
        selectedPaperId === 'all' ? undefined : selectedPaperId
      );
      setPipelinePayload(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'RAG assembly failed.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    'Summarize the core methodology and linear cross-attention module.',
    'What accuracy benchmarks were achieved on ImageNet-1k?',
    'What are the computational complexity differences O(N) vs O(N^2)?'
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold font-mono">
            RAG Pipeline
          </span>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Anti-Hallucination
          </span>
        </div>

        <h2 className="text-2xl font-extrabold text-white tracking-tight">RAG Context Inspector</h2>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Inspect the full RAG pipeline: vector retrieval hits, anti-hallucination system prompt, structured context blocks, and the assembled payload sent to the LLM.
        </p>

        {/* Sample Queries Chips */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold mr-1">Try:</span>
          {sampleQueries.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(sq);
                setTimeout(() => handleAssemble(), 100);
              }}
              className="text-[11px] bg-slate-800/90 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-200 border border-slate-700/80 hover:border-emerald-500/40 px-3 py-1 rounded-full transition-all text-left"
            >
              "{sq.slice(0, 45)}..."
            </button>
          ))}
        </div>
      </div>

      {/* RAG Controls Form */}
      <form onSubmit={handleAssemble} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row gap-3">
          
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter question to test RAG Context Assembly..."
              className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Context Hits:</span>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="bg-transparent text-emerald-400 font-bold text-sm focus:outline-none cursor-pointer"
            >
              <option value={3} className="bg-slate-900 text-white">Top 3 Hits</option>
              <option value={5} className="bg-slate-900 text-white">Top 5 Hits</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2">
            <select
              value={selectedPaperId}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none max-w-[150px] truncate cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Papers</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white truncate">
                  {p.title.slice(0, 25)}...
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Assembling...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4" /> Assemble RAG Context
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* RAG Payload Visualizer */}
      {pipelinePayload && (
        <div className="space-y-6">
          
          {/* Pipeline 3-Step Flow Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                <span>1. Retrieval Hits</span>
                <Database className="h-4 w-4" />
              </div>
              <p className="text-xs text-slate-300 font-semibold">
                Retrieved {pipelinePayload.sources_count} chunks from ChromaDB
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>2. Anti-Hallucination Rules</span>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-xs text-slate-300 font-semibold">
                Strict Grounding + Fallback + Citation Enforcement
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                <span>3. Prompt Assembly</span>
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-xs text-slate-300 font-semibold">
                Ready for LLM inference
              </p>
            </div>
          </div>

          {/* System Prompt Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Constructed System Prompt (Anti-Hallucination Rules)
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono">
                System Persona
              </span>
            </div>
            <pre className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800/80 whitespace-pre-wrap selection:bg-emerald-500 selection:text-white">
              {pipelinePayload.system_prompt}
            </pre>
          </div>

          {/* Context Window & User Prompt Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <FileText className="h-4 w-4" /> User Prompt & Grounded Context Window
              </h3>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full font-mono">
                Context Payload
              </span>
            </div>
            <pre className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800/80 whitespace-pre-wrap selection:bg-cyan-500 selection:text-white">
              {pipelinePayload.user_prompt}
            </pre>
          </div>

          {/* Sources Citation List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Extracted Citation Metadata ({pipelinePayload.sources_count} Sources)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pipelinePayload.sources.map((src: RAGSourceSchema, idx: number) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-300 truncate max-w-[200px]">
                      {src.paper_name}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[11px]">
                      Page {src.page_number}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono line-clamp-2">
                    "{src.text_snippet}"
                  </p>

                  <div className="text-[10px] text-emerald-400 font-mono">
                    Match Confidence: {src.similarity_percentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
