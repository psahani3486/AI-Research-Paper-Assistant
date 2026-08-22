import React, { useState } from 'react';
import { ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import type { Paper, ProposalCriticResponse } from '../types';
import { runProposalCritic } from '../services/api';

interface ProposalCriticViewProps {
  papers: Paper[];
}

export const ProposalCriticView: React.FC<ProposalCriticViewProps> = ({ papers }) => {
  const [titleInput, setTitleInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [targetPaperId, setTargetPaperId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [critique, setCritique] = useState<ProposalCriticResponse | null>(null);

  const handleEvaluate = async () => {
    if (!titleInput.trim() || !textInput.trim()) return;
    setLoading(true);
    try {
      const res = await runProposalCritic(
        titleInput,
        textInput,
        targetPaperId === 'all' ? undefined : targetPaperId
      );
      setCritique(res);
    } catch (err) {
      console.error('Failed to run proposal critic:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Research Proposal & Methodology Critic Agent</h2>
            <p className="text-xs text-slate-400">Rigorous peer-review analysis evaluating novelty, methodology flaws, and uncredited prior literature</p>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Proposed Research Title:</label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="e.g. Hybrid Cross-Encoder RAG Architecture for Academic Paper Discovery"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Proposal Methodology & Abstract Description:</label>
            <textarea
              rows={4}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Describe your research methodology, datasets, proposed neural architecture, and expected performance benchmarks..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <label className="text-xs text-slate-400 shrink-0">Benchmark Context:</label>
              <select
                value={targetPaperId}
                onChange={(e) => setTargetPaperId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="all">All Uploaded Papers</option>
                {papers.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleEvaluate}
              disabled={loading || !titleInput.trim() || !textInput.trim()}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Critique Proposal
            </button>
          </div>
        </div>
      </div>

      {/* Evaluation Results */}
      {critique && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 animate-fadeIn">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-400 animate-ping" />
              <h3 className="text-sm font-bold text-white">Peer Review Critique for &quot;{critique.proposal_title}&quot;</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Evaluated against {critique.referenced_sources_count} literature sources ({critique.latency_ms} ms)
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 whitespace-pre-wrap font-mono text-xs text-slate-300 leading-relaxed">
            {critique.critique_markdown}
          </div>

        </div>
      )}

    </div>
  );
};
