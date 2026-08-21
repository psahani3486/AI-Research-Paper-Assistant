import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Loader2, 
  AlertCircle, 
  HelpCircle, 
  Lightbulb, 
  Copy, 
  Check, 
  BookOpen
} from 'lucide-react';
import { detectResearchGaps } from '../services/api';
import type { Paper, ResearchGapResponse, ProjectIdeaSchema } from '../types';

interface ResearchGapViewProps {
  papers: Paper[];
}

export const ResearchGapView: React.FC<ResearchGapViewProps> = ({ papers }) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [gaps, setGaps] = useState<ResearchGapResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (papers.length > 0 && !selectedPaperId) {
      setSelectedPaperId(papers[0].id);
    }
  }, [papers]);

  useEffect(() => {
    if (selectedPaperId) {
      handleDetectGapsForPaper(selectedPaperId);
    }
  }, [selectedPaperId]);

  const handleDetectGapsForPaper = async (paperId: string) => {
    if (!paperId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await detectResearchGaps(paperId);
      setGaps(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Research Gap detection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectGaps = () => handleDetectGapsForPaper(selectedPaperId);

  const handleCopy = () => {
    if (!gaps) return;
    const report = `RESEARCH GAP ANALYSIS & THESIS PROPOSALS

Paper: ${gaps.paper_title}

1. EXPLICIT GAPS (Acknowledged by Authors):
${gaps.explicit_gaps.map((g, idx) => `  ${idx + 1}. ${g}`).join('\n')}

2. INFERRED GAPS (Critically Derived):
${gaps.inferred_gaps.map((g, idx) => `  ${idx + 1}. ${g}`).join('\n')}

3. SUGGESTED B.TECH / THESIS PROJECT PROPOSALS:
${gaps.potential_research_ideas.map((idea: ProjectIdeaSchema, idx: number) => `
  Idea #${idx + 1}: ${idea.title}
  - Description: ${idea.description}
  - Gap Solved: ${idea.target_gap_addressed}
`).join('\n')}
`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-950 via-slate-900 to-indigo-950 border border-orange-500/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 px-3 py-1 rounded-full font-bold font-mono">
              Research Gap Detection
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Explicit vs Inferred Gap Analysis</h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Analyzes research papers to categorize <strong>Explicit Gaps</strong> (limitations admitted by authors), <strong>Inferred Gaps</strong> (unaddressed domain gaps), and generates <strong>actionable thesis project proposals</strong>.
            </p>
          </div>

          {/* Paper Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-2 shrink-0">
            <BookOpen className="h-4 w-4 text-orange-400 ml-2" />
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

        {/* Action Controls */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={handleDetectGaps}
            disabled={!selectedPaperId || loading}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-indigo-600 hover:from-orange-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-orange-600/30 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Detecting Gaps & Generating Ideas...
              </>
            ) : (
              <>
                <Compass className="h-4 w-4 text-amber-300" /> Detect Research Gaps & Thesis Ideas
              </>
            )}
          </button>

          {gaps && (
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied Gap Report!' : 'Copy Gap Analysis Report'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* Results Inspector */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <Loader2 className="h-8 w-8 text-orange-400 animate-spin mx-auto" />
          <h4 className="text-base font-bold text-white">Analyzing Research Gaps...</h4>
          <p className="text-xs text-slate-400">
            Categorizing Explicit vs Inferred Gaps and synthesizing B.Tech Project Proposals via Groq LLM.
          </p>
        </div>
      ) : !gaps ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="h-14 w-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mx-auto">
            <Compass className="h-7 w-7" />
          </div>
          <h4 className="text-base font-bold text-white">No Research Gap Analysis Performed</h4>
          <p className="text-xs text-slate-400">
            Click <strong>Detect Research Gaps & Thesis Ideas</strong> above to analyze limitations and discover novel project proposals.
          </p>
          <button
            onClick={handleDetectGaps}
            disabled={!selectedPaperId}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-600/30 inline-flex items-center gap-2"
          >
            <Compass className="h-4 w-4 text-amber-300" /> Analyze Paper Gaps Now
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Panel 1: Explicit Gaps (Orange) */}
            <div className="bg-slate-900 border border-orange-500/30 rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 text-orange-400">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. Explicit Gaps (Author Acknowledged)</h3>
              </div>

              <div className="space-y-2">
                {gaps.explicit_gaps.map((gap, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 leading-relaxed font-sans flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 font-mono">
                      #{idx + 1}
                    </span>
                    <p>{gap}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Inferred Gaps (Purple) */}
            <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 text-purple-400">
                <HelpCircle className="h-5 w-5" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. Inferred Gaps (Critically Derived)</h3>
              </div>

              <div className="space-y-2">
                {gaps.inferred_gaps.map((gap, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 leading-relaxed font-sans flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 font-mono">
                      #{idx + 1}
                    </span>
                    <p>{gap}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Panel 3: Actionable BTP / Thesis Proposals (Amber) */}
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Lightbulb className="h-6 w-6" />
                <div>
                  <h3 className="text-base font-bold text-white">Actionable Project Proposals</h3>
                  <p className="text-xs text-slate-400">3 concrete research project titles designed to solve the discovered gaps</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gaps.potential_research_ideas.map((idea: ProjectIdeaSchema, idx: number) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold rounded-full font-mono inline-block">
                      Proposal #{idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-white leading-snug">{idea.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{idea.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Target Gap Solved:</span>
                    <p className="text-[11px] text-amber-400 font-mono mt-0.5">{idea.target_gap_addressed}</p>
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
