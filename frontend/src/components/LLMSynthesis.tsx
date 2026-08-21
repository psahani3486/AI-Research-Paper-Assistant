import React, { useState } from 'react';
import { Zap, Loader2, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { queryGroqRAG } from '../services/api';
import type { Paper, RAGQueryResponse, RAGSourceSchema } from '../types';

interface LLMSynthesisProps {
  papers: Paper[];
}

export const LLMSynthesis: React.FC<LLMSynthesisProps> = ({ papers }) => {
  const [query, setQuery] = useState('What is the core methodology proposed in the uploaded research paper?');
  const [topK, setTopK] = useState(3);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('all');

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RAGQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!response && query) {
      handleQuery();
    }
  }, []);

  const handleQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await queryGroqRAG(
        query,
        topK,
        selectedPaperId === 'all' ? undefined : selectedPaperId
      );
      setResponse(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'LLM synthesis failed. The API may be rate-limited — please try again in a few minutes.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'What is the core methodology proposed in the uploaded research paper?',
    'What dataset was used and what accuracy scores were achieved?',
    'What limitations or future directions do the authors mention?'
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-bold font-mono">
            LLM Question Answering
          </span>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber-400" /> Groq LPU
          </span>
        </div>

        <h2 className="text-2xl font-extrabold text-white tracking-tight">Grounded Q&A Engine</h2>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Ask any question about your uploaded papers. Answers are grounded in retrieved context with mandatory inline page citations <code>[Paper, Page X]</code>.
        </p>

        {/* Sample Queries */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold mr-1">Try:</span>
          {sampleQuestions.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(sq);
                setTimeout(() => handleQuery(), 100);
              }}
              className="text-[11px] bg-slate-800/90 hover:bg-amber-600/30 text-slate-300 hover:text-amber-200 border border-slate-700/80 hover:border-amber-500/40 px-3 py-1 rounded-full transition-all text-left"
            >
              "{sq.slice(0, 45)}..."
            </button>
          ))}
        </div>
      </div>

      {/* Query Form */}
      <form onSubmit={handleQuery} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row gap-3">
          
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your papers..."
              className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Top-K:</span>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="bg-transparent text-amber-400 font-bold text-sm focus:outline-none cursor-pointer"
            >
              <option value={3} className="bg-slate-900 text-white">3</option>
              <option value={5} className="bg-slate-900 text-white">5</option>
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
            className="px-6 py-3 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Synthesizing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-amber-300" /> Ask
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

      {/* Answer & Performance Metrics */}
      {response && (
        <div className="space-y-6">
          
          {/* Performance Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center text-xs">
            <div>
              <span className="text-slate-500">Model</span>
              <p className="text-xs font-bold text-amber-400 mt-1 font-mono">{response.model}</p>
            </div>
            <div>
              <span className="text-slate-500">Latency</span>
              <p className="text-sm font-extrabold text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                <Zap className="h-3.5 w-3.5" /> {response.latency_ms} ms
              </p>
            </div>
            <div>
              <span className="text-slate-500">Tokens</span>
              <p className="text-sm font-bold text-indigo-400 mt-0.5">{response.total_tokens}</p>
            </div>
            <div>
              <span className="text-slate-500">Sources</span>
              <p className="text-sm font-bold text-cyan-400 mt-0.5">{response.sources.length} cited</p>
            </div>
          </div>

          {/* Answer */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Answer</h3>
                  <p className="text-[11px] text-slate-400">Grounded in retrieved context</p>
                </div>
              </div>

              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-full flex items-center gap-1 font-mono">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </span>
            </div>

            <div className="text-sm text-slate-100 leading-relaxed font-sans space-y-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 selection:bg-amber-500 selection:text-white">
              {response.answer.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-wrap">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Citations */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Sources ({response.sources.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {response.sources.map((src: RAGSourceSchema, idx: number) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 truncate max-w-[200px]">
                      {src.paper_name}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[11px]">
                      Page {src.page_number}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono line-clamp-2">
                    "{src.text_snippet}"
                  </p>

                  <div className="text-[10px] text-emerald-400 font-mono">
                    Confidence: {src.similarity_percentage}%
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
