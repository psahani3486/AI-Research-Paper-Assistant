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
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)] flex items-center gap-1 font-mono">
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
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--bg-element)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center gap-1 font-mono">
            <Layers className="h-3 w-3" /> Chunked
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--bg-element)] text-[var(--text-muted)] border border-[var(--border-subtle)] font-mono">
            Uploaded
          </span>
        );
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-border)] rounded-xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-xs">
      
      {/* Top Section */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-text)] shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          {getStatusBadge(paper.status)}
        </div>

        <div>
          <h4 
            onClick={() => onSelect(paper)}
            className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-text)] cursor-pointer transition-colors line-clamp-2 leading-snug"
          >
            {paper.title}
          </h4>
          <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1 truncate">{paper.filename}</p>
        </div>
      </div>

      {/* Metadata & Actions */}
      <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <div className="text-[10px] font-mono text-[var(--text-secondary)] flex items-center gap-1.5">
          <span>{paper.pages} {paper.pages === 1 ? 'Page' : 'Pages'}</span>
          {paper.chunks_count > 0 && <span>• {paper.chunks_count} chunks</span>}
        </div>

        <div className="flex items-center gap-1">
          {onOpenChat && (
            <button
              onClick={() => onOpenChat(paper)}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-text)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
              title="Chat with paper"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          )}

          {onViewPDF && (
            <button
              onClick={() => onViewPDF(paper)}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-text)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
              title="Read PDF in-app"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={() => downloadResearchDossier(paper.id)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-text)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
            title="Download Research Dossier (.md)"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onSelect(paper)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
            title="Inspect Paper Details"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onDelete(paper.id)}
            className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
            title="Delete paper"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
