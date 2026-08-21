import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Search, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Award
} from 'lucide-react';
import { evaluateRAGQuery, getVivaQABank } from '../services/api';
import type { Paper, RAGTriadEvalResponse, VivaQAItemSchema } from '../types';

interface EvaluationVivaViewProps {
  papers: Paper[];
}

export const EvaluationVivaView: React.FC<EvaluationVivaViewProps> = ({ papers }) => {
  const [activeSubTab, setActiveSubTab] = useState<'eval' | 'viva'>('eval');

  // Evaluator State
  const [evalQuery, setEvalQuery] = useState('What are the main architectural contributions of this research paper?');
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [evalLoading, setEvalLoading] = useState(false);
  const [scorecard, setScorecard] = useState<RAGTriadEvalResponse | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Viva Q&A State
  const [vivaLoading, setVivaLoading] = useState(false);
  const [vivaQuestions, setVivaQuestions] = useState<VivaQAItemSchema[]>([]);
  const [vivaSearch, setVivaSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedQaId, setExpandedQaId] = useState<number | null>(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (papers.length > 0 && !selectedPaperId) {
      setSelectedPaperId(papers[0].id);
    }
  }, [papers]);

  const loadVivaBank = async () => {
    setVivaLoading(true);
    try {
      const res = await getVivaQABank();
      setVivaQuestions(res.questions);
    } catch (err) {
      console.error('Failed to load Viva Q&A:', err);
    } finally {
      setVivaLoading(false);
    }
  };

  useEffect(() => {
    loadVivaBank();
  }, []);

  const handleEvaluate = async () => {
    if (!evalQuery.trim()) return;
    setEvalLoading(true);
    setEvalError(null);

    try {
      const data = await evaluateRAGQuery(evalQuery, selectedPaperId || undefined);
      setScorecard(data);
    } catch (err: unknown) {
      setEvalError(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setEvalLoading(false);
    }
  };

  const handleCopyQa = (qa: VivaQAItemSchema) => {
    const text = `Q: ${qa.question}\n\nA: ${qa.answer}\n\nKey Points:\n${qa.key_points.map((k) => `• ${k}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedId(qa.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter Viva Questions
  const filteredViva = vivaQuestions.filter((q) => {
    const matchesSearch = q.question.toLowerCase().includes(vivaSearch.toLowerCase()) || q.answer.toLowerCase().includes(vivaSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || q.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(vivaQuestions.map((q) => q.category)));

  return (
    <div className="space-y-6">
      
      {/* Header Navigation */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold font-mono">
              Evaluation & Defense
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">RAG Triad Metrics & Viva Q&A</h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Evaluate system accuracy using the <strong>RAG Triad Framework</strong> (Context Relevance, Groundedness, Answer Relevance) and prepare for thesis defense with <strong>30+ categorized Q&A</strong>.
            </p>
          </div>

          {/* Sub-Tab Toggle Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl p-1.5 shrink-0">
            <button
              onClick={() => setActiveSubTab('eval')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'eval'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="h-4 w-4" /> RAG Triad Evaluator
            </button>

            <button
              onClick={() => setActiveSubTab('viva')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'viva'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="h-4 w-4 text-amber-300" /> Viva Prep ({vivaQuestions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tab 1: RAG Triad Evaluator */}
      {activeSubTab === 'eval' && (
        <div className="space-y-6">
          
          {/* Query Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" /> Test Query for RAG Triad Evaluation
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={evalQuery}
                onChange={(e) => setEvalQuery(e.target.value)}
                placeholder="Enter test question..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />

              <select
                value={selectedPaperId}
                onChange={(e) => setSelectedPaperId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs font-semibold rounded-2xl px-3 py-3 focus:outline-none max-w-[200px] truncate"
              >
                <option value="">All Uploaded Papers</option>
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>

              <button
                onClick={handleEvaluate}
                disabled={evalLoading || !evalQuery.trim()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 shrink-0"
              >
                {evalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                <span>Evaluate RAG Triad</span>
              </button>
            </div>
          </div>

          {evalError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-2xl">
              {evalError}
            </div>
          )}

          {/* RAG Triad Scorecard */}
          {scorecard && (
            <div className="space-y-6">
              
              {/* Gauges Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric 1: Context Relevance */}
                <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-5 space-y-2 text-center shadow-lg">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">1. Context Relevance</div>
                  <div className="text-3xl font-extrabold text-white font-mono">{scorecard.context_relevance_score}%</div>
                  <p className="text-[11px] text-slate-400">Retrieval quality from ChromaDB</p>
                </div>

                {/* Metric 2: Groundedness */}
                <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 space-y-2 text-center shadow-lg">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">2. Groundedness</div>
                  <div className="text-3xl font-extrabold text-white font-mono">{scorecard.groundedness_score}%</div>
                  <p className="text-[11px] text-slate-400">Anti-hallucination support</p>
                </div>

                {/* Metric 3: Answer Relevance */}
                <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-5 space-y-2 text-center shadow-lg">
                  <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">3. Answer Relevance</div>
                  <div className="text-3xl font-extrabold text-white font-mono">{scorecard.answer_relevance_score}%</div>
                  <p className="text-[11px] text-slate-400">Query term alignment ratio</p>
                </div>

                {/* Metric 4: Overall Triad Quality */}
                <div className="bg-gradient-to-tr from-emerald-950 to-indigo-950 border border-emerald-500/50 rounded-3xl p-5 space-y-2 text-center shadow-xl">
                  <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                    <Award className="h-3.5 w-3.5 text-amber-300" /> Overall RAG Triad
                  </div>
                  <div className="text-3xl font-extrabold text-amber-300 font-mono">{scorecard.overall_triad_score}%</div>
                  <p className="text-[11px] text-slate-300 font-semibold">Unified System Score</p>
                </div>

              </div>

              {/* Answer & Citations Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> Evaluated AI Answer Payload
                </h4>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs text-slate-200 leading-relaxed font-sans">
                  {scorecard.answer}
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retrieved Source Chunks ({scorecard.sources.length}):</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {scorecard.sources.map((src, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between text-indigo-400 font-semibold">
                          <span>{src.paper_name}</span>
                          <span className="text-emerald-400 font-mono">{src.similarity_percentage}% Match</span>
                        </div>
                        <p className="text-slate-400 line-clamp-2">{src.text_snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Sub-Tab 2: Viva Q&A Bank */}
      {activeSubTab === 'viva' && (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search viva questions or keywords..."
                value={vivaSearch}
                onChange={(e) => setVivaSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="all">All Defense Pillars ({vivaQuestions.length})</option>
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Accordion Questions List */}
          {vivaLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Loading Viva Question Bank...
            </div>
          ) : (
            <div className="space-y-3">
              {filteredViva.map((qa) => {
                const isExpanded = expandedQaId === qa.id;
                return (
                  <div
                    key={qa.id}
                    className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl overflow-hidden transition-all shadow-md"
                  >
                    <div
                      onClick={() => setExpandedQaId(isExpanded ? null : qa.id)}
                      className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                          #{qa.id}
                        </span>
                        <div>
                          <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block">
                            {qa.category}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5">{qa.question}</h4>
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-indigo-400 shrink-0 ml-2" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-500 shrink-0 ml-2" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-800/80 bg-slate-950/60">
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Detailed Defense Answer:</label>
                          <p className="text-xs text-slate-200 leading-relaxed font-sans">{qa.answer}</p>
                        </div>

                        {qa.key_points && qa.key_points.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Key Defense Points:</label>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {qa.key_points.map((kp, idx) => (
                                <li key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-300 flex items-center gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                  <span>{kp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {qa.code_snippet && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider font-mono">Code / Formula Snippet:</label>
                            <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto">
                              {qa.code_snippet}
                            </pre>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleCopyQa(qa)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            {copiedId === qa.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedId === qa.id ? 'Copied Q&A!' : 'Copy Answer'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
