import React from 'react';
import { 
  FileText, 
  Trash2, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  ExternalLink,
  Download,
  Eye
} from 'lucide-react';
import { downloadResearchDossier } from '../services/api';
import type { Paper } from '../types';

interface PaperCardProps {
  paper: Paper;
  onDelete: (id: string) => void;
  onSelect: (paper: Paper) => void;
  onViewPDF?: (paper: Paper) => void;
}

export const PaperCard: React.FC<PaperCardProps> = ({ 
  paper, 
  onDelete, 
  onSelect,
  onViewPDF 
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> ChromaDB Indexed
          </span>
        );
      case 'embedded':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
            <Cpu className="h-3 w-3 text-cyan-400" /> 384d Vectors
          </span>
        );
      case 'chunked':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center gap-1">
            <Layers className="h-3 w-3 text-indigo-400" /> Document Chunked
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Uploaded PDF
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 hover:border-indigo-500/50 rounded-2xl p-5 shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      
      {/* Top Section */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          {getStatusBadge(paper.status)}
        </div>

        <div>
          <h4 
            onClick={() => onSelect(paper)}
            className="font-extrabold text-sm text-white group-hover:text-indigo-300 cursor-pointer transition-colors line-clamp-2 leading-snug"
          >
            {paper.title}
          </h4>
          <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">{paper.filename}</p>
        </div>
      </div>

      {/* Metadata & Actions */}
      <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
        <div className="text-[11px] font-semibold text-slate-400">
          <span>{paper.pages} Pages</span>
          {paper.chunks_count > 0 && <span className="ml-2 text-cyan-400">• {paper.chunks_count} Chunks</span>}
        </div>

        <div className="flex items-center gap-1">
          {onViewPDF && (
            <button
              onClick={() => onViewPDF(paper)}
              className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
              title="Read PDF in-app"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => downloadResearchDossier(paper.id)}
            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
            title="Download Research Dossier (.md)"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={() => onSelect(paper)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Inspect Paper Details"
          >
            <ExternalLink className="h-4 w-4" />
          </button>

          <button
            onClick={() => onDelete(paper.id)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Delete paper"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
