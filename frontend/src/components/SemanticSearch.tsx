import React, { useState } from 'react';
import { Search, Loader2, Sparkles, Filter, FileText, CheckCircle2 } from 'lucide-react';
import { searchPapers } from '../services/api';
import type { Paper, SearchResponse } from '../types';

interface SemanticSearchProps {
  papers: Paper[];
}

export const SemanticSearch: React.FC<SemanticSearchProps> = ({ papers }) => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(3);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('all');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await searchPapers(
        query,
        topK,
        selectedPaperId === 'all' ? undefined : selectedPaperId
      );
      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Semantic search failed.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    'What architecture or model is proposed in this paper?',
    'What dataset was used for evaluation and experiments?',
    'What are the main results, accuracy scores, or benchmarks?',
    'What are the limitations or future work mentioned?'
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/50 via-slate-900 to-cyan-900/30 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-3 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold font-mono">
            Semantic Search
          </span>
          <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full font-bold">
            Cosine Similarity
          </span>
        </div>

        <h2 className="text-2xl font-extrabold text-white tracking-tight">Semantic Search</h2>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Enter any natural-language query. It is encoded into a 384-d vector and matched against indexed paper chunks via cosine similarity.
        </p>

        {/* Sample Queries Chips */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold mr-1">Try:</span>
          {sampleQueries.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(sq);
                setTimeout(() => handleSearch(), 100);
              }}
              className="text-[11px] bg-slate-800/90 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700/80 hover:border-indigo-500/40 px-3 py-1 rounded-full transition-all text-left"
            >
              "{sq.slice(0, 45)}..."
            </button>
          ))}
        </div>
      </div>

      {/* Search Controls Form */}
      <form onSubmit={handleSearch} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row gap-3">
          
          {/* Query Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about the uploaded research papers..."
              className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Top-K Selector */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Top-K Hits:</span>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="bg-transparent text-indigo-400 font-bold text-sm focus:outline-none cursor-pointer"
            >
              <option value={3} className="bg-slate-900 text-white">Top 3 Chunks</option>
              <option value={5} className="bg-slate-900 text-white">Top 5 Chunks</option>
              <option value={10} className="bg-slate-900 text-white">Top 10 Chunks</option>
            </select>
          </div>

          {/* Filter Paper Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedPaperId}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none max-w-[160px] truncate cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Indexed Papers</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white truncate">
                  {p.title.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Vectorizing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Search Vector DB
              </>
            )}
          </button>
        </div>
      </form>

      {/* Results Display */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs px-2">
            <span className="text-slate-400 font-medium">
              Found <strong className="text-white">{results.total_results}</strong> relevant context chunks for query: <em className="text-indigo-300 font-serif">"{results.query}"</em>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Engine: ChromaDB HNSW Cosine Index
            </span>
          </div>

          {results.results.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-sm">
              No matching vectors found. Make sure your paper is indexed in the vector database.
            </div>
          ) : (
            <div className="space-y-4">
              {results.results.map((res) => (
                <div
                  key={res.rank}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 space-y-3 shadow-lg transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                        #{res.rank}
                      </span>
                      <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-full flex items-center gap-1 font-mono">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {res.similarity_percentage}% Match
                      </span>
                      <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-indigo-400" /> Page {res.page_number}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 font-semibold truncate max-w-xs">
                      {res.paper_name}
                    </span>
                  </div>

                  {/* Chunk Text */}
                  <p className="text-sm text-slate-200 leading-relaxed font-mono whitespace-pre-wrap bg-slate-950 p-4 rounded-2xl border border-slate-800/80 selection:bg-indigo-500 selection:text-white">
                    {res.text}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                    <span>Chunk Index: #{res.chunk_index}</span>
                    <span>Cosine Distance: {(1.0 - res.similarity_score).toFixed(4)} (Sim Score: {res.similarity_score})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
