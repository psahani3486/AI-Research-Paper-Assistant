import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
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
  ShieldCheck,
  Zap,
  MessageSquare,
  Sparkles,
  Columns3,
  Compass,
  Filter,
  Download,
  Award
} from 'lucide-react';
import { 
  checkSystemHealth, 
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
import { SemanticSearch } from './components/SemanticSearch';
import { RAGInspector } from './components/RAGInspector';
import { LLMSynthesis } from './components/LLMSynthesis';
import { ChatInterface } from './components/ChatInterface';
import { PaperSummaryView } from './components/PaperSummaryView';
import { PaperComparisonView } from './components/PaperComparisonView';
import { ResearchGapView } from './components/ResearchGapView';
import { PDFViewerModal } from './components/PDFViewerModal';
import { EvaluationVivaView } from './components/EvaluationVivaView';
import type { Paper } from './types';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Paper Library state
  const [papers, setPapers] = useState<Paper[]>([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [inspectPaper, setInspectPaper] = useState<Paper | null>(null);
  const [chunkPaperObj, setChunkPaperObj] = useState<Paper | null>(null);
  const [vectorPaperObj, setVectorPaperObj] = useState<Paper | null>(null);
  const [pdfPaperObj, setPdfPaperObj] = useState<Paper | null>(null);

  // Library Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Indexing state
  const [indexingId, setIndexingId] = useState<string | null>(null);
  const [vectorStats, setVectorStats] = useState<{ total_vectors: number; collection_name: string } | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      await checkSystemHealth();
      const stats = await getVectorDBStats();
      setVectorStats(stats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backend offline');
    } finally {
      setLoading(false);
    }
  };

  const fetchPapers = async () => {
    setPapersLoading(true);
    try {
      const res = await getPapers();
      setPapers(res.papers);
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

  const handleUploadSuccess = (newPaper: Paper) => {
    setPapers((prev) => [newPaper, ...prev]);
    setActiveTab('library');
  };

  const handleDeletePaper = async (paperId: string) => {
    try {
      await deletePaper(paperId);
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
      if (selectedPaper?.id === paperId) {
        setSelectedPaper(null);
      }
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

  const [activeTab, setActiveTab] = useState<'upload' | 'library' | 'chat' | 'eval' | 'gaps' | 'summarize' | 'compare' | 'search' | 'rag' | 'llm' | 'architecture'>('upload');

  const totalPages = papers.reduce((acc, p) => acc + (p.pages || 0), 0);

  // Filtered Papers
  const filteredPapers = papers.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });



  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">AI Research Paper Assistant</h1>
              </div>
              <p className="text-xs text-slate-400">RAG-Powered Academic Intelligence System</p>
            </div>
          </div>

          {/* Backend Status & ChromaDB Vectors Badge */}
          <div className="flex items-center gap-3">
            {vectorStats && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-mono">
                <Database className="h-3.5 w-3.5 text-emerald-400" />
                <span>Vectors: <strong>{vectorStats.total_vectors}</strong></span>
              </div>
            )}

            <button 
              onClick={() => { fetchHealth(); fetchPapers(); }} 
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {loading ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                Connecting...
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                <XCircle className="h-4 w-4 text-rose-400" />
                Offline
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Online
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'library'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Library className="h-3.5 w-3.5" /> Library ({papers.length})
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Chat
            </button>

            <button
              onClick={() => setActiveTab('summarize')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'summarize'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Summary
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'compare'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" /> Compare
            </button>

            <button
              onClick={() => setActiveTab('gaps')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'gaps'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Compass className="h-3.5 w-3.5" /> Gaps
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Search className="h-3.5 w-3.5" /> Search
            </button>

            <button
              onClick={() => setActiveTab('rag')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'rag'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> RAG Pipeline
            </button>

            <button
              onClick={() => setActiveTab('llm')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'llm'
                  ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-lg shadow-amber-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Zap className="h-3.5 w-3.5" /> LLM Q&A
            </button>

            <button
              onClick={() => setActiveTab('eval')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'eval'
                  ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-lg shadow-emerald-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Award className="h-3.5 w-3.5" /> Evaluation
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Workflow className="h-3.5 w-3.5" /> Architecture
            </button>


          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
            <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              Papers: <strong className="text-white">{papers.length}</strong>
            </span>
            <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              Pages: <strong className="text-white">{totalPages}</strong>
            </span>
          </div>
        </div>

        {/* Tab 1: Upload */}
        {activeTab === 'upload' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <FileUpload onUploadSuccess={handleUploadSuccess} />

            {papers.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-400" /> Recent Uploads
                  </h4>
                  <button 
                    onClick={() => setActiveTab('library')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    View All ({papers.length}) →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {papers.slice(0, 4).map((paper) => (
                    <div 
                      key={paper.id}
                      onClick={() => setSelectedPaper(paper)}
                      className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3.5 flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 truncate">
                            {paper.title}
                          </p>
                          <p className="text-[10px] text-slate-500">{paper.pages} pages · {paper.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Library */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Library className="h-5 w-5 text-indigo-400" /> Paper Library
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {filteredPapers.length} of {papers.length} papers
                </p>
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search papers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                  <Filter className="h-3.5 w-3.5 text-slate-400 ml-2" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent text-slate-300 font-semibold focus:outline-none cursor-pointer py-1 pr-2 text-xs"
                  >
                    <option value="all" className="bg-slate-900">All</option>
                    <option value="uploaded" className="bg-slate-900">Uploaded</option>
                    <option value="chunked" className="bg-slate-900">Chunked</option>
                    <option value="embedded" className="bg-slate-900">Embedded</option>
                    <option value="indexed" className="bg-slate-900">Indexed</option>
                  </select>
                </div>

                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all shrink-0"
                >
                  <Plus className="h-4 w-4" /> Upload
                </button>
              </div>
            </div>

            {papersLoading ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                Loading...
              </div>
            ) : filteredPapers.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                  <FileText className="h-7 w-7" />
                </div>
                <h4 className="text-lg font-bold text-white">No Papers Found</h4>
                <p className="text-xs text-slate-400">
                  Try clearing your search or filter.
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPapers.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    onDelete={handleDeletePaper}
                    onSelect={(p) => setSelectedPaper(p)}
                    onViewPDF={(p) => setPdfPaperObj(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Evaluation */}
        {activeTab === 'eval' && (
          <EvaluationVivaView papers={papers} />
        )}

        {/* Chat */}
        {activeTab === 'chat' && (
          <ChatInterface papers={papers} />
        )}

        {/* Research Gaps */}
        {activeTab === 'gaps' && (
          <ResearchGapView papers={papers} />
        )}

        {/* Summarization */}
        {activeTab === 'summarize' && (
          <PaperSummaryView papers={papers} />
        )}

        {/* Comparison */}
        {activeTab === 'compare' && (
          <PaperComparisonView papers={papers} />
        )}

        {/* Semantic Search */}
        {activeTab === 'search' && (
          <SemanticSearch papers={papers} />
        )}

        {/* RAG Pipeline */}
        {activeTab === 'rag' && (
          <RAGInspector papers={papers} />
        )}

        {/* LLM Q&A */}
        {activeTab === 'llm' && (
          <LLMSynthesis papers={papers} />
        )}

        {/* Paper Detail Modal */}
        {selectedPaper && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl relative">
              <button 
                onClick={() => setSelectedPaper(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                ✕
              </button>

              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full font-bold">
                  Paper Details
                </span>
                <h3 className="text-xl font-extrabold text-white leading-tight">{selectedPaper.title}</h3>
                <p className="text-xs font-mono text-slate-400">{selectedPaper.filename}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Pages</div>
                  <div className="text-lg font-bold text-indigo-400 mt-1">{selectedPaper.pages}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Status</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1 capitalize">{selectedPaper.status}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Chunks</div>
                  <div className="text-sm font-bold text-cyan-400 mt-1">{selectedPaper.chunks_count || '0'}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => handleIndexPaper(selectedPaper.id)}
                  disabled={indexingId === selectedPaper.id}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {indexingId === selectedPaper.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Indexing...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" /> Index in Vector Database
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const p = selectedPaper;
                    setSelectedPaper(null);
                    setPdfPaperObj(p);
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Eye className="h-4 w-4" /> View PDF
                </button>

                <button
                  onClick={() => downloadResearchDossier(selectedPaper.id)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-amber-500/30"
                >
                  <Download className="h-4 w-4" /> Export Research Dossier
                </button>

                <button
                  onClick={() => {
                    const p = selectedPaper;
                    setSelectedPaper(null);
                    setVectorPaperObj(p);
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Cpu className="h-4 w-4 text-cyan-400" /> Inspect Embeddings
                </button>

                <button
                  onClick={() => {
                    const p = selectedPaper;
                    setSelectedPaper(null);
                    setChunkPaperObj(p);
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Scissors className="h-4 w-4 text-indigo-400" /> View Chunks
                </button>

                <button
                  onClick={() => {
                    const p = selectedPaper;
                    setSelectedPaper(null);
                    setInspectPaper(p);
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <FileText className="h-4 w-4 text-indigo-400" /> View Extracted Text
                </button>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedPaper(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
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

        {/* Architecture */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Upload className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-400">Ingestion</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1. Upload & Validate</h3>
                <p className="text-sm text-slate-400 mb-4">
                  PDF files are validated for integrity, stored with unique identifiers, and metadata is extracted into a relational database.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-400">Processing</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">2. Extract, Embed & Index</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Text is parsed page-by-page, chunked with overlap, encoded into 384-d vectors, and indexed in ChromaDB for fast cosine similarity retrieval.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-emerald-500/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">Synthesis</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">3. RAG Synthesis & Evaluation</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Retrieved context is assembled with anti-hallucination guardrails, synthesized via Groq LLM, and evaluated using RAG Triad metrics.
                </p>
              </div>
            </div>
          </div>
        )}


      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          AI Research Paper Assistant — RAG-Powered Academic Intelligence
        </div>
      </footer>
    </div>
  );
}
