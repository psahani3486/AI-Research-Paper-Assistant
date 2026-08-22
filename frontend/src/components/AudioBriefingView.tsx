import React, { useState } from 'react';
import { Volume2, Play, Pause, RotateCcw, Radio, Sparkles, Loader2, UserCheck, Bot } from 'lucide-react';
import type { Paper, AudioBriefingResponse } from '../types';
import { getAudioBriefing } from '../services/api';

interface AudioBriefingViewProps {
  papers: Paper[];
}

export const AudioBriefingView: React.FC<AudioBriefingViewProps> = ({ papers }) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>(papers[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<AudioBriefingResponse | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTurnIdx, setActiveTurnIdx] = useState<number | null>(null);

  const handleGenerateScript = async () => {
    if (!selectedPaperId) return;
    setLoading(true);
    try {
      const res = await getAudioBriefing(selectedPaperId);
      setBriefing(res);
      setIsPlaying(false);
      setActiveTurnIdx(null);
    } catch (err) {
      console.error('Failed to generate Audio Briefing script:', err);
    } finally {
      setLoading(false);
    }
  };

  const playAudioScript = () => {
    if (!briefing || !window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setActiveTurnIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlaying(true);

    const speakTurn = (idx: number) => {
      if (idx >= briefing.script_turns.length) {
        setIsPlaying(false);
        setActiveTurnIdx(null);
        return;
      }

      setActiveTurnIdx(idx);
      const turn = briefing.script_turns[idx];
      const utterance = new SpeechSynthesisUtterance(turn.text);
      
      // Pitch/Rate adjustment based on speaker
      if (turn.speaker.includes('Alex')) {
        utterance.pitch = 1.1;
        utterance.rate = 1.0;
      } else {
        utterance.pitch = 0.95;
        utterance.rate = 0.98;
      }

      utterance.onend = () => speakTurn(idx + 1);
      utterance.onerror = () => speakTurn(idx + 1);

      window.speechSynthesis.speak(utterance);
    };

    speakTurn(0);
  };

  const stopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveTurnIdx(null);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">NotebookLM-Style AI Audio Podcast Briefing</h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-mono">
                  AUDIO SYNTHESIS
                </span>
              </div>
              <p className="text-xs text-slate-400">Generates 2-minute dual-speaker podcast briefings (Dr. Alex & Dr. Maya) with audio playback</p>
            </div>
          </div>

          <button
            onClick={handleGenerateScript}
            disabled={loading || !selectedPaperId}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Audio Briefing
          </button>
        </div>

        {/* Paper Selector */}
        <div className="flex items-center gap-3 pt-2">
          <label className="text-xs text-slate-400 font-medium shrink-0">Target Paper:</label>
          <select
            value={selectedPaperId}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono flex-1 max-w-md"
          >
            {papers.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audio Player & Dialogue Script Display */}
      {briefing && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 animate-fadeIn">
          
          {/* Audio Player Toolbar */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={playAudioScript}
                className={`h-11 w-11 rounded-2xl flex items-center justify-center text-white transition-all shadow-lg ${
                  isPlaying 
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' 
                    : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                }`}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>

              <div>
                <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                  <span>{briefing.paper_title}</span>
                  {isPlaying && (
                    <span className="flex items-center gap-1 text-[10px] text-purple-400">
                      <Volume2 className="h-3.5 w-3.5 animate-bounce" /> Playing turn #{ (activeTurnIdx ?? 0) + 1 }
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">Dual Speaker Podcast Dialogue • {briefing.total_turns} Dialogue Turns</div>
              </div>
            </div>

            <button
              onClick={stopAudio}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Stop Audio
            </button>
          </div>

          {/* Dialogue Turns Stream */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Radio className="h-4 w-4 text-purple-400" /> Podcast Transcript
            </h4>

            <div className="space-y-3">
              {briefing.script_turns.map((turn, idx) => {
                const isAlex = turn.speaker.includes('Alex');
                const isActive = activeTurnIdx === idx;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                      isActive 
                        ? 'bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/10 scale-[1.01]' 
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                      isAlex ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      {isAlex ? <Bot className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold font-mono ${isAlex ? 'text-indigo-300' : 'text-purple-300'}`}>
                          {turn.speaker}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Turn #{idx + 1}</span>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        {turn.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
