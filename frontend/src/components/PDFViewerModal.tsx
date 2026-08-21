import React from 'react';
import { X, FileText, Download, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import type { Paper } from '../types';

interface PDFViewerModalProps {
  paper: Paper;
  onClose: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ paper, onClose }) => {
  const pdfUrl = `${API_BASE_URL}/papers/${paper.id}/pdf`;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate">{paper.title}</h3>
              <p className="text-xs text-slate-400 font-mono">{paper.filename} • {paper.pages} Pages</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              download={paper.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Download raw PDF"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">New Tab</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF iframe */}
        <div className="flex-1 bg-slate-950 p-2 relative">
          <iframe
            src={`${pdfUrl}#toolbar=1`}
            title={paper.title}
            className="w-full h-full rounded-2xl border border-slate-800"
          />
        </div>
      </div>
    </div>
  );
};
