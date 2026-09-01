import React from 'react';
import { 
  FileText, 
  Trash2, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  ExternalLink,
  Download,
  Eye,
  MessageSquare
} from 'lucide-react';
import { downloadResearchDossier } from '../services/api';
import type { Paper } from '../types';

interface PaperCardProps {
  paper: Paper;
  onDelete: (id: string) => void;
  onSelect: (paper: Paper) => void;
  onViewPDF?: (paper: Paper) => void;
  onOpenChat?: (paper: Paper) => void;
}

export const PaperCard: React.FC<PaperCardProps> = ({ 
  paper, 
  onDelete, 
  onSelect,
  onViewPDF,
  onOpenChat
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1 font-mono">
            <CheckCircle2 className="h-3 w-3" /> Indexed
          </span>
        );
      case 'embedded':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center gap-1 font-mono">
            <Cpu className="h-3 w-3" /> Embedded
          </span>
        );
      case 'chunked':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-700/30 border border-stone-600/30 text-stone-300 flex items-center gap-1 font-mono">
            <Layers className="h-3 w-3" /> Chunked
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-800 text-stone-400 border border-stone-700 font-mono">
            Uploaded
          </span>
        );
    }
  };

  return (
    <div className="bg-[#181816] border border-[#282724] hover:border-[#3d3b36] rounded-xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-xs">
      
      {/* Top Section */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#242320] border border-[#33322e] flex items-center justify-center text-amber-400 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          {getStatusBadge(paper.status)}
        </div>

        <div>
          <h4 
            onClick={() => onSelect(paper)}
            className="font-semibold text-xs sm:text-sm text-[#faf8f5] group-hover:text-amber-400 cursor-pointer transition-colors line-clamp-2 leading-snug"
          >
            {paper.title}
          </h4>
          <p className="text-[10px] font-mono text-[#8c887e] mt-1 truncate">{paper.filename}</p>
        </div>
      </div>

      {/* Metadata & Actions */}
      <div className="pt-3 mt-3 border-t border-[#242320] flex items-center justify-between">
        <div className="text-[10px] font-mono text-[#a8a49c] flex items-center gap-1.5">
          <span>{paper.pages} {paper.pages === 1 ? 'Page' : 'Pages'}</span>
          {paper.chunks_count > 0 && <span>• {paper.chunks_count} chunks</span>}
        </div>

        <div className="flex items-center gap-1">
          {onOpenChat && (
            <button
              onClick={() => onOpenChat(paper)}
              className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-[#242320] rounded-md transition-colors"
              title="Chat with paper"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          )}

          {onViewPDF && (
            <button
              onClick={() => onViewPDF(paper)}
              className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-[#242320] rounded-md transition-colors"
              title="Read PDF in-app"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={() => downloadResearchDossier(paper.id)}
            className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-[#242320] rounded-md transition-colors"
            title="Download Research Dossier (.md)"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onSelect(paper)}
            className="p-1.5 text-stone-400 hover:text-[#ede8e1] hover:bg-[#242320] rounded-md transition-colors"
            title="Inspect Paper Details"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onDelete(paper.id)}
            className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
            title="Delete paper"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
