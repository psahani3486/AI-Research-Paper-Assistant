import React, { useState } from 'react';
import { X, Download, FileCode, FileText, Database, Check } from 'lucide-react';
import type { Paper } from '../types';
import { exportAcademicContent } from '../services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  contentMarkdown: string;
  papers?: Paper[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  title,
  contentMarkdown,
  papers = []
}) => {
  const [format, setFormat] = useState<'latex' | 'bibtex' | 'markdown' | 'json'>('latex');
  const [downloading, setDownloading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const paperIds = papers.map(p => p.id);
      const res = await exportAcademicContent(title, contentMarkdown, format, paperIds);

      const blob = new Blob([res.exported_content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '_')}.${format === 'latex' ? 'tex' : format === 'bibtex' ? 'bib' : format}`;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Export download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Multi-Format Academic Exporter</h3>
              <p className="text-xs text-slate-400">Export Overleaf LaTeX (.tex), BibTeX (.bib), Markdown, or JSON</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Choose Export Format:</label>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('latex')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs font-medium transition-all ${
                  format === 'latex'
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <FileCode className="h-4 w-4 text-indigo-400" />
                <div className="text-left">
                  <div className="font-bold font-mono">LaTeX (.tex)</div>
                  <div className="text-[10px] text-slate-500">Overleaf Compatible</div>
                </div>
              </button>

              <button
                onClick={() => setFormat('bibtex')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs font-medium transition-all ${
                  format === 'bibtex'
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Download className="h-4 w-4 text-purple-400" />
                <div className="text-left">
                  <div className="font-bold font-mono">BibTeX (.bib)</div>
                  <div className="text-[10px] text-slate-500">Citations File</div>
                </div>
              </button>

              <button
                onClick={() => setFormat('markdown')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs font-medium transition-all ${
                  format === 'markdown'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <FileText className="h-4 w-4 text-emerald-400" />
                <div className="text-left">
                  <div className="font-bold font-mono">Markdown (.md)</div>
                  <div className="text-[10px] text-slate-500">GitHub / Obsidian</div>
                </div>
              </button>

              <button
                onClick={() => setFormat('json')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs font-medium transition-all ${
                  format === 'json'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Database className="h-4 w-4 text-amber-400" />
                <div className="text-left">
                  <div className="font-bold font-mono">JSON (.json)</div>
                  <div className="text-[10px] text-slate-500">Raw Data API</div>
                </div>
              </button>
            </div>
          </div>

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" /> Exported successfully!
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl">
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/30 transition-colors flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Download .{format === 'latex' ? 'tex' : format === 'bibtex' ? 'bib' : format}
          </button>
        </div>

      </div>
    </div>
  );
};
