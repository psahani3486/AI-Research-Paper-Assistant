import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  RefreshCw, 
  FileText, 
  Workflow, 
  Library, 
  Upload, 
  Plus, 
  Eye, 
  Scissors, 
  Cpu, 
  Database, 
  Loader2, 
  Search, 
  MessageSquare, 
  Sparkles, 
  Columns3, 
  Compass, 
  Filter, 
  Download, 
  Settings, 
  Activity,
  PanelLeftClose,
  PanelLeft,
  Headphones
} from 'lucide-react';
import { 
  checkSystemHealthWithRetry, 
  getPapers, 
  deletePaper, 
  indexPaperInChromaDB, 
  getVectorDBStats, 
  downloadResearchDossier 
} from './services/api';
import { FileUpload } from './components/FileUpload';
import { PaperCard } from './components/PaperCard';
import { TextViewer } from './components/TextViewer';
import { ChunkViewer } from './components/ChunkViewer';
import { VectorViewer } from './components/VectorViewer';
import { ChatInterface } from './components/ChatInterface';
import { PaperSummaryView } from './components/PaperSummaryView';
import { PaperComparisonView } from './components/PaperComparisonView';
import { ResearchGapView } from './components/ResearchGapView';
import { PDFViewerModal } from './components/PDFViewerModal';
import { EvaluationVivaView } from './components/EvaluationVivaView';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { RAGInspectorModal } from './components/RAGInspectorModal';
import { LiteratureReviewView } from './components/LiteratureReviewView';
import { AudioBriefingView } from './components/AudioBriefingView';
import { ExportModal } from './components/ExportModal';
import type { Paper } from './types';

type StudioMode = 
  | 'chat' 
  | 'library' 
  | 'summarize' 
  | 'compare_review' 
  | 'gaps_viva' 
  | 'audio_briefing';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'online' | 'waking' | 'offline'>('waking');
  const [retryAttempt, setRetryAttempt] = useState(1);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [showArchitectureModal, setShowArchitectureModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTitle, setExportTitle] = useState('Academic_Report');
  const [exportContent, setExportContent] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sub-tabs for combined studios
  const [compareSubTab, setCompareSubTab] = useState<'compare' | 'lit_review'>('compare');
  const [gapsSubTab, setGapsSubTab] = useState<'gaps' | 'viva'>('gaps');

  const openExportModal = (title: string, content: string) => {
    setExportTitle(title);
    setExportContent(content);
    setShowExportModal(true);
  };
  
  // Paper Library state
  const [papers, setPapers] = useState<Paper[]>([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [inspectPaper, setInspectPaper] = useState<Paper | null>(null);
  const [chunkPaperObj, setChunkPaperObj] = useState<Paper | null>(null);
  const [vectorPaperObj, setVectorPaperObj] = useState<Paper | null>(null);
  const [pdfPaperObj, setPdfPaperObj] = useState<Paper | null>(null);

  // Active Tab / Mode
  const [activeTab, setActiveTab] = useState<StudioMode>('chat');

  // Sidebar paper search filter
  const [sidebarPaperSearch, setSidebarPaperSearch] = useState('');

  // Library Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showLibraryUpload, setShowLibraryUpload] = useState(false);

  // Indexing state
  const [indexingId, setIndexingId] = useState<string | null>(null);
  const [vectorStats, setVectorStats] = useState<{ total_vectors: number; collection_name: string } | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    setConnectionState('waking');
    setRetryAttempt(1);
    try {
      await checkSystemHealthWithRetry((attempt) => {
        setRetryAttempt(attempt);
      }, 5);
      setConnectionState('online');
      try {
        const stats = await getVectorDBStats();
        setVectorStats(stats);
      } catch (e) {
        console.warn('Vector DB stats warning:', e);
      }
    } catch (err: unknown) {
      console.error('Health check failed:', err);
      setConnectionState('offline');
      setError(err instanceof Error ? err.message : 'Backend offline');
    } finally {
      setLoading(false);
    }
  };

  const fetchPapers = async () => {
    setPapersLoading(true);
    try {
      const res = await getPapers();
      setPapers(res.papers || []);
      if (res.papers && res.papers.length > 0 && !selectedPaper) {
        setSelectedPaper(res.papers[0]);
      }
    } catch (err) {
      console.error('Failed to fetch papers:', err);
    } finally {
      setPapersLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchPapers();
  }, []);

  useEffect(() => {
    if (connectionState === 'offline') {
      const timer = setInterval(() => {
        fetchHealth();
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [connectionState]);

  const handleUploadSuccess = (newPaper: Paper) => {
    setPapers((prev) => [newPaper, ...prev]);
    setSelectedPaper(newPaper);
    setShowLibraryUpload(false);
    setActiveTab('chat');
  };

  const handleDeletePaper = async (paperId: string) => {
    try {
      await deletePaper(paperId);
      setPapers((prev) => {
        const updated = prev.filter((p) => p.id !== paperId);
        if (selectedPaper?.id === paperId) {
          setSelectedPaper(updated.length > 0 ? updated[0] : null);
        }
        return updated;
      });
      fetchHealth();
    } catch (err) {
      console.error('Failed to delete paper:', err);
    }
  };

  const handleIndexPaper = async (paperId: string) => {
    setIndexingId(paperId);
    try {
      await indexPaperInChromaDB(paperId);
      await fetchPapers();
      await fetchHealth();
      if (selectedPaper?.id === paperId) {
        setSelectedPaper((prev) => prev ? { ...prev, status: 'indexed' } : null);
      }
    } catch (err) {
      console.error('Failed to index paper:', err);
    } finally {
      setIndexingId(null);
    }
  };

  const totalPages = papers.reduce((acc, p) => acc + (p.pages || 0), 0);

  // Filtered Papers for Library
  const filteredPapers = papers.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Papers for Sidebar
  const sidebarFilteredPapers = papers.filter((p) =>
    p.title.toLowerCase().includes(sidebarPaperSearch.toLowerCase()) ||
    p.filename.toLowerCase().includes(sidebarPaperSearch.toLowerCase())
  );

  const startNewChat = () => {
    setActiveTab('chat');
  };

  const selectPaperAndChat = (paper: Paper) => {
    setSelectedPaper(paper);
    setActiveTab('chat');
  };

  // 6 Clean, High-Value Core Studio Modes
  const studioModes: { id: StudioMode; label: string; icon: any; badge?: string }[] = [
    { id: 'chat', label: 'Research Chat', icon: MessageSquare },
    { id: 'library', label: 'Paper Library', icon: Library, badge: `${papers.length}` },
    { id: 'summarize', label: 'Executive Summary', icon: Sparkles },
    { id: 'compare_review', label: 'Compare & Lit Review', icon: Columns3 },
    { id: 'gaps_viva', label: 'Research Gaps & Viva', icon: Compass },
    { id: 'audio_briefing', label: 'Audio Podcast', icon: Headphones }
  ];

  const currentModeObj = studioModes.find((m) => m.id === activeTab) || studioModes[0];

  return (
    <div className="min-h-screen bg-[#0e0e11] text-[#ececf1] flex flex-row overflow-hidden font-sans">
      
      {/* ChatGPT Sleek Left Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 bg-[#121215] border-r border-[#232327] flex flex-col justify-between transition-all duration-300 ease-in-out md:static ${
          sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Top Brand Header */}
          <div className="p-3.5 border-b border-[#232327] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h1 className="font-semibold text-xs text-[#f4f4f5] tracking-tight">ScholarGPT</h1>
                <p className="text-[10px] text-[#71717a] font-mono">Academic Workspace</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#222226] rounded-lg transition-colors md:hidden"
              title="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          {/* New Chat Action Button */}
          <div className="p-3">
            <button
              onClick={startNewChat}
              className="w-full py-2 px-3 bg-[#18181b] hover:bg-[#222226] border border-[#2e2e33] hover:border-[#3f3f46] text-[#ececf1] rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Plus className="h-3.5 w-3.5" />
                </div>
                <span>New Research Chat</span>
              </div>
              <Sparkles className="h-3 w-3 text-[#71717a] group-hover:text-emerald-400 transition-colors" />
            </button>
          </div>

          {/* Scrollable Navigation & Papers Section */}
          <div className="flex-1 overflow-y-auto px-3 space-y-5 pb-4">
            
            {/* Section 1: Studio Modes (Clean 6 options) */}
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#71717a] font-semibold">
                Research Workspace
              </div>

              {studioModes.map((mode) => {
                const IconComponent = mode.icon;
                const isActive = activeTab === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setActiveTab(mode.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#222226] text-emerald-400 font-semibold shadow-xs'
                        : 'text-[#a1a1aa] hover:text-[#ececf1] hover:bg-[#18181b]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-[#71717a]'}`} />
                      <span className="truncate">{mode.label}</span>
                    </div>
                    {mode.badge && (
                      <span className="text-[10px] bg-[#27272a] text-[#a1a1aa] px-1.5 py-0.5 rounded font-mono">
                        {mode.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Section 2: Uploaded Paper Contexts */}
            <div className="space-y-2 pt-2 border-t border-[#232327]">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] font-semibold">
                  Paper Library ({papers.length})
                </span>
                <button
                  onClick={() => {
                    setActiveTab('library');
                    setShowLibraryUpload(true);
                  }}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  + Upload
                </button>
              </div>

              {papers.length > 0 && (
                <div className="relative px-1">
                  <Search className="h-3 w-3 text-[#71717a] absolute left-3 top-2" />
                  <input
                    type="text"
                    placeholder="Filter papers..."
                    value={sidebarPaperSearch}
                    onChange={(e) => setSidebarPaperSearch(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-7 pr-2 py-1 text-[11px] text-[#ececf1] placeholder-[#71717a] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {papers.length === 0 ? (
                  <p className="text-[11px] text-[#71717a] px-2 py-1">No papers uploaded yet.</p>
                ) : sidebarFilteredPapers.length === 0 ? (
                  <p className="text-[11px] text-[#71717a] px-2 py-1">No matching papers.</p>
                ) : (
                  sidebarFilteredPapers.map((paper) => {
                    const isSelected = selectedPaper?.id === paper.id;
                    return (
                      <div
                        key={paper.id}
                        onClick={() => selectPaperAndChat(paper)}
                        className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#1e1e24] text-white border border-[#2e2e33]'
                            : 'text-[#a1a1aa] hover:text-[#ececf1] hover:bg-[#18181b]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            paper.status === 'indexed' ? 'bg-emerald-400' : 'bg-zinc-500'
                          }`} />
                          <span className="truncate text-[11px] font-medium">{paper.title}</span>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPdfPaperObj(paper);
                            }}
                            className="p-1 hover:text-emerald-400"
                            title="View PDF"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Bottom Workspace / User Profile Bar */}
          <div className="p-3 border-t border-[#232327] bg-[#101013] space-y-2">
            
            {/* Vector Stats & RAG Telemetry trigger */}
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => setShowTelemetryModal(true)}
                className="flex items-center gap-1.5 text-[11px] font-mono text-[#a1a1aa] hover:text-emerald-400 transition-colors"
                title="Open RAG Telemetry & Inspect Embeddings"
              >
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span>ChromaDB: <strong>{vectorStats?.total_vectors || 0}</strong> v</span>
              </button>

              <button
                onClick={() => setShowArchitectureModal(true)}
                className="text-[11px] text-[#71717a] hover:text-cyan-400 flex items-center gap-1 transition-colors font-mono"
                title="System Architecture Diagram"
              >
                <Workflow className="h-3 w-3" />
                <span>System</span>
              </button>

              <button
                onClick={() => openExportModal('Academic_Dossier', '# Academic Research Report\n\nGenerated by AI Research Assistant.')}
                className="text-[11px] text-[#a1a1aa] hover:text-purple-300 flex items-center gap-1 transition-colors"
                title="Export LaTeX / BibTeX / Dossier"
              >
                <Download className="h-3 w-3" />
                <span>Export</span>
              </button>
            </div>

            {/* Connection Status & Settings */}
            <div className="flex items-center justify-between pt-1 border-t border-[#1f1f23]">
              <div 
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={() => setShowApiModal(true)}
                title={error ? `Error: ${error} (Click to configure API)` : `Backend Status: ${connectionState}`}
              >
                <span className={`h-2 w-2 rounded-full ${
                  connectionState === 'online'
                    ? 'bg-emerald-400'
                    : connectionState === 'waking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-400'
                }`} />
                <span className="text-[11px] text-[#71717a] capitalize">
                  {connectionState === 'waking' ? `Waking (${retryAttempt}/5)` : connectionState}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => { fetchHealth(); fetchPapers(); }}
                  disabled={loading}
                  className="p-1 text-[#71717a] hover:text-[#ececf1] rounded transition-colors"
                  title="Refresh Connection"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                </button>

                <button
                  onClick={() => setShowApiModal(true)}
                  className="p-1 text-[#71717a] hover:text-[#ececf1] rounded transition-colors"
                  title="Configure API Endpoint"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </aside>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#0e0e11]">
        
        {/* Top Floating App Bar */}
        <header className="h-12 border-b border-[#232327] bg-[#121215]/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
          
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#222226] rounded-lg transition-colors"
              title={sidebarOpen ? "Hide sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>

            {/* Active Studio Mode Title */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#f4f4f5]">{currentModeObj.label}</span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            
            {/* Active Paper Quick Pill */}
            {selectedPaper && (
              <div 
                onClick={() => setSelectedPaper(selectedPaper)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-[#38383e] text-xs text-[#a1a1aa] cursor-pointer transition-colors max-w-[220px]"
                title="Active context paper"
              >
                <FileText className="h-3 w-3 text-emerald-400 shrink-0" />
                <span className="truncate text-[11px] font-medium text-[#ececf1]">{selectedPaper.title}</span>
              </div>
            )}

            {/* PDF View action if paper is loaded */}
            {selectedPaper && (
              <button
                onClick={() => setPdfPaperObj(selectedPaper)}
                className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-[#18181b] hover:bg-[#222226] border border-[#27272a] text-zinc-300 text-xs rounded-lg transition-colors"
                title="Read PDF"
              >
                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                <span>PDF</span>
              </button>
            )}

            {/* Quick Export Dossier Button */}
            <button
              onClick={() => openExportModal('Academic_Dossier', '# Academic Research Report\n\nGenerated by AI Research Assistant.')}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#18181b] hover:bg-[#222226] border border-[#27272a] text-zinc-300 text-xs rounded-lg transition-colors"
              title="Export Research Artifacts"
            >
              <Download className="h-3.5 w-3.5 text-purple-400" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

        </header>

        {/* Dynamic Studio Canvas Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* 1. Interactive Chat */}
          {activeTab === 'chat' && (
            <ChatInterface 
              papers={papers} 
              activePaperId={selectedPaper?.id} 
              onPaperChange={(id) => {
                const found = papers.find(p => p.id === id);
                if (found) setSelectedPaper(found);
              }}
              onOpenPDF={(paper) => setPdfPaperObj(paper)}
            />
          )}

          {/* 2. Paper Library & Upload */}
          {activeTab === 'library' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              
              {/* Optional Upload Section inside Library */}
              {showLibraryUpload && (
                <div className="relative">
                  <FileUpload onUploadSuccess={handleUploadSuccess} />
                  <button
                    onClick={() => setShowLibraryUpload(false)}
                    className="absolute top-4 right-4 text-xs text-zinc-400 hover:text-white px-2 py-1 bg-[#222226] rounded-md"
                  >
                    Hide Upload
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#f4f4f5] flex items-center gap-2">
                    <Library className="h-5 w-5 text-emerald-400" /> Academic Paper Library
                  </h2>
                  <p className="text-xs text-[#71717a] mt-0.5">
                    {filteredPapers.length} of {papers.length} documents ({totalPages} pages) indexed in vector database
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="h-3.5 w-3.5 text-[#71717a] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search papers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#ececf1] placeholder-[#71717a] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[#18181b] border border-[#27272a] rounded-lg px-2 py-1 text-xs">
                    <Filter className="h-3 w-3 text-[#71717a]" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent text-[#a1a1aa] font-medium focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="all" className="bg-[#18181b]">All</option>
                      <option value="uploaded" className="bg-[#18181b]">Uploaded</option>
                      <option value="chunked" className="bg-[#18181b]">Chunked</option>
                      <option value="embedded" className="bg-[#18181b]">Embedded</option>
                      <option value="indexed" className="bg-[#18181b]">Indexed</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setShowLibraryUpload(!showLibraryUpload)}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> {showLibraryUpload ? 'Close Upload' : 'Upload PDF'}
                  </button>
                </div>
              </div>

              {papersLoading ? (
                <div className="text-center py-16 text-zinc-500 text-xs">Loading papers...</div>
              ) : filteredPapers.length === 0 ? (
                <div className="bg-[#141417] border border-[#232327] rounded-2xl p-10 text-center space-y-3 max-w-md mx-auto">
                  <div className="h-10 w-10 rounded-xl bg-[#222226] border border-[#2c2c31] flex items-center justify-center text-emerald-400 mx-auto">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#ececf1]">No Papers Found</h4>
                  <p className="text-xs text-[#71717a]">
                    Upload a paper to extract text, generate embeddings, and start chatting.
                  </p>
                  <button
                    onClick={() => setShowLibraryUpload(true)}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-lg shadow-sm"
                  >
                    + Upload First PDF
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPapers.map((paper) => (
                    <PaperCard
                      key={paper.id}
                      paper={paper}
                      onDelete={handleDeletePaper}
                      onSelect={(p) => setSelectedPaper(p)}
                      onViewPDF={(p) => setPdfPaperObj(p)}
                      onOpenChat={(p) => selectPaperAndChat(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Executive Summary */}
          {activeTab === 'summarize' && (
            <PaperSummaryView papers={papers} />
          )}

          {/* 4. Unified Comparison & Literature Review Studio */}
          {activeTab === 'compare_review' && (
            <div className="space-y-5 max-w-6xl mx-auto">
              <div className="flex items-center justify-center sm:justify-start">
                <div className="inline-flex p-1 bg-[#141417] border border-[#27272a] rounded-xl">
                  <button
                    onClick={() => setCompareSubTab('compare')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      compareSubTab === 'compare'
                        ? 'bg-[#222226] text-emerald-400 font-semibold shadow-xs'
                        : 'text-[#a1a1aa] hover:text-[#ececf1]'
                    }`}
                  >
                    📊 Side-by-Side Comparison Matrix
                  </button>
                  <button
                    onClick={() => setCompareSubTab('lit_review')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      compareSubTab === 'lit_review'
                        ? 'bg-[#222226] text-emerald-400 font-semibold shadow-xs'
                        : 'text-[#a1a1aa] hover:text-[#ececf1]'
                    }`}
                  >
                    📖 Autonomous Literature Review
                  </button>
                </div>
              </div>

              {compareSubTab === 'compare' ? (
                <PaperComparisonView papers={papers} />
              ) : (
                <LiteratureReviewView papers={papers} />
              )}
            </div>
          )}

          {/* 5. Unified Research Gaps & Viva Prep Studio */}
          {activeTab === 'gaps_viva' && (
            <div className="space-y-5 max-w-6xl mx-auto">
              <div className="flex items-center justify-center sm:justify-start">
                <div className="inline-flex p-1 bg-[#141417] border border-[#27272a] rounded-xl">
                  <button
                    onClick={() => setGapsSubTab('gaps')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      gapsSubTab === 'gaps'
                        ? 'bg-[#222226] text-emerald-400 font-semibold shadow-xs'
                        : 'text-[#a1a1aa] hover:text-[#ececf1]'
                    }`}
                  >
                    🎯 Research Gaps & Novelty Analysis
                  </button>
                  <button
                    onClick={() => setGapsSubTab('viva')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      gapsSubTab === 'viva'
                        ? 'bg-[#222226] text-emerald-400 font-semibold shadow-xs'
                        : 'text-[#a1a1aa] hover:text-[#ececf1]'
                    }`}
                  >
                    🎓 Thesis Defense & Viva Simulator
                  </button>
                </div>
              </div>

              {gapsSubTab === 'gaps' ? (
                <ResearchGapView papers={papers} />
              ) : (
                <EvaluationVivaView papers={papers} />
              )}
            </div>
          )}

          {/* 6. Audio Podcast Briefing */}
          {activeTab === 'audio_briefing' && (
            <AudioBriefingView papers={papers} />
          )}

        </main>
      </div>

      {/* Paper Detail Modal */}
      {selectedPaper && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
            <button 
              onClick={() => setSelectedPaper(null)}
              className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-[#222226]"
            >
              ✕
            </button>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                Document Details
              </span>
              <h3 className="text-base font-bold text-[#f4f4f5] leading-snug">{selectedPaper.title}</h3>
              <p className="text-[11px] font-mono text-[#71717a]">{selectedPaper.filename}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[#0e0e11] border border-[#232327] rounded-xl p-3 text-center">
              <div>
                <div className="text-[10px] text-[#71717a] font-mono">Pages</div>
                <div className="text-sm font-bold text-white mt-0.5">{selectedPaper.pages}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#71717a] font-mono">Status</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5 capitalize">{selectedPaper.status}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#71717a] font-mono">Chunks</div>
                <div className="text-xs font-bold text-cyan-400 mt-0.5">{selectedPaper.chunks_count || '0'}</div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleIndexPaper(selectedPaper.id)}
                disabled={indexingId === selectedPaper.id}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {indexingId === selectedPaper.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Indexing in ChromaDB...
                  </>
                ) : (
                  <>
                    <Database className="h-3.5 w-3.5" /> Re-Index in ChromaDB
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const p = selectedPaper;
                    setSelectedPaper(null);
                    setPdfPaperObj(p);
                  }}
                  className="py-2 bg-[#1f1f23] hover:bg-[#28282e] text-zinc-200 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all border border-[#2c2c31]"
                >
                  <Eye className="h-3.5 w-3.5 text-emerald-400" /> View PDF
                </button>

                <button
                  onClick={() => downloadResearchDossier(selectedPaper.id)}
                  className="py-2 bg-[#1f1f23] hover:bg-[#28282e] text-zinc-200 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all border border-[#2c2c31]"
                >
                  <Download className="h-3.5 w-3.5 text-purple-400" /> Export Dossier
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    const p = selectedPaper;
                    setSelectedPaper(null);
                    setVectorPaperObj(p);
                  }}
                  className="py-1.5 bg-[#18181b] hover:bg-[#222226] text-[#a1a1aa] text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all border border-[#27272a]"
                >
                  <Cpu className="h-3 w-3 text-cyan-400" /> Vectors
                </button>

                <button
                  onClick={() => {
                    const p = selectedPaper;
                    setSelectedPaper(null);
                    setChunkPaperObj(p);
                  }}
                  className="py-1.5 bg-[#18181b] hover:bg-[#222226] text-[#a1a1aa] text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all border border-[#27272a]"
                >
                  <Scissors className="h-3 w-3 text-indigo-400" /> Chunks
                </button>

                <button
                  onClick={() => {
                    const p = selectedPaper;
                    setSelectedPaper(null);
                    setInspectPaper(p);
                  }}
                  className="py-1.5 bg-[#18181b] hover:bg-[#222226] text-[#a1a1aa] text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all border border-[#27272a]"
                >
                  <FileText className="h-3 w-3 text-emerald-400" /> Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfPaperObj && (
        <PDFViewerModal paper={pdfPaperObj} onClose={() => setPdfPaperObj(null)} />
      )}

      {/* Text Inspection Viewer */}
      {inspectPaper && (
        <TextViewer paper={inspectPaper} onClose={() => setInspectPaper(null)} />
      )}

      {/* Chunking Inspector Viewer */}
      {chunkPaperObj && (
        <ChunkViewer paper={chunkPaperObj} onClose={() => setChunkPaperObj(null)} />
      )}

      {/* Vector Embedding Viewer */}
      {vectorPaperObj && (
        <VectorViewer paper={vectorPaperObj} onClose={() => setVectorPaperObj(null)} />
      )}

      {/* API Settings Modal */}
      {showApiModal && (
        <ApiSettingsModal
          onClose={() => setShowApiModal(false)}
          onSaved={() => {
            fetchHealth();
            fetchPapers();
          }}
        />
      )}

      {/* RAG Telemetry Inspector Modal */}
      <RAGInspectorModal
        isOpen={showTelemetryModal}
        onClose={() => setShowTelemetryModal(false)}
        query="What are the key findings and methodology in the uploaded research papers?"
        sources={[
          {
            paper_name: papers[0]?.title || 'Attention Is All You Need',
            page_number: 1,
            chunk_index: 0,
            similarity_score: 0.92,
            similarity_percentage: 92.0,
            bm25_score: 4.85,
            rrf_score: 0.0322,
            text_snippet: 'The Transformer model uses multi-head self-attention mechanisms to process sequence data without recurrent or convolutional layers...'
          },
          {
            paper_name: papers[0]?.title || 'Attention Is All You Need',
            page_number: 3,
            chunk_index: 2,
            similarity_score: 0.86,
            similarity_percentage: 86.0,
            bm25_score: 3.42,
            rrf_score: 0.0298,
            text_snippet: 'Scales dot-product attention computes query vector dot products with key vectors, scaled by the square root of dimension d_k...'
          }
        ]}
      />

      {/* System Architecture Modal */}
      {showArchitectureModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowArchitectureModal(false)}
              className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-[#222226]"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded">
                Technical Specification
              </span>
              <h3 className="text-lg font-bold text-white">End-to-End RAG Architecture</h3>
              <p className="text-xs text-[#71717a]">
                Hybrid dense retrieval & Groq LLaMA-3 academic synthesis pipeline.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#0e0e11] border border-[#232327] rounded-xl p-4 space-y-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Upload className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-xs font-semibold text-white">1. Ingestion</h4>
                <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                  PDF parsed page-by-page, chunked with 500-char window and 100-char overlap.
                </p>
              </div>

              <div className="bg-[#0e0e11] border border-[#232327] rounded-xl p-4 space-y-2">
                <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Cpu className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-xs font-semibold text-white">2. ChromaDB</h4>
                <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                  all-MiniLM-L6-v2 384d dense embeddings indexed in local ChromaDB collections.
                </p>
              </div>

              <div className="bg-[#0e0e11] border border-[#232327] rounded-xl p-4 space-y-2">
                <div className="h-7 w-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-xs font-semibold text-white">3. Synthesis</h4>
                <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                  Hybrid BM25 + vector reranking synthesized via Groq LLaMA-3 with citations.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowArchitectureModal(false)}
                className="px-4 py-2 bg-[#222226] hover:bg-[#2c2c31] text-zinc-200 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={exportTitle}
        contentMarkdown={exportContent}
        papers={papers}
      />

    </div>
  );
}

