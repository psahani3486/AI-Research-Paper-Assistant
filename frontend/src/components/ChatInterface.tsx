import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  User as UserIcon, 
  Loader2, 
  Trash2, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  BookOpen,
  Copy,
  Check,
  ArrowUp,
  FileCheck2,
  Bookmark
} from 'lucide-react';
import { sendChatMessage, getChatHistory, clearChatHistory } from '../services/api';
import type { Paper, ChatMessageSchema, RAGSourceSchema } from '../types';

interface ChatInterfaceProps {
  papers: Paper[];
  activePaperId?: string;
  onPaperChange?: (paperId: string) => void;
  onOpenPDF?: (paper: Paper) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  papers, 
  activePaperId, 
  onPaperChange,
  onOpenPDF 
}) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>(activePaperId || '');
  const [messages, setMessages] = useState<ChatMessageSchema[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with prop when changed externally
  useEffect(() => {
    if (activePaperId && activePaperId !== selectedPaperId) {
      setSelectedPaperId(activePaperId);
    }
  }, [activePaperId]);

  // Set default selected paper if available
  useEffect(() => {
    if (papers.length > 0 && !selectedPaperId) {
      const initialId = papers[0].id;
      setSelectedPaperId(initialId);
      if (onPaperChange) onPaperChange(initialId);
    }
  }, [papers]);

  // Fetch chat history when paper changes
  useEffect(() => {
    if (selectedPaperId) {
      fetchHistory(selectedPaperId);
    } else {
      setMessages([]);
    }
  }, [selectedPaperId]);

  // Auto-scroll to bottom of chat thread
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fetchHistory = async (paperId: string) => {
    setHistoryLoading(true);
    try {
      const res = await getChatHistory(paperId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePaperSelect = (id: string) => {
    setSelectedPaperId(id);
    if (onPaperChange) onPaperChange(id);
  };

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt !== undefined ? overridePrompt : inputMessage;
    if (!textToSend.trim() || !selectedPaperId || loading) return;

    const userText = textToSend.trim();
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    // Optimistic UI update
    const tempUserMsg: ChatMessageSchema = {
      paper_id: selectedPaperId,
      role: 'user',
      message: userText
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await sendChatMessage(selectedPaperId, userText, 3);
      setMessages(res.messages);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!selectedPaperId) return;
    try {
      await clearChatHistory(selectedPaperId);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const toggleSources = (idx: number) => {
    setExpandedSources((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const starterPrompts = [
    {
      title: 'Methodology & Architecture',
      desc: 'Explain the core algorithms, models, and technical novelty.',
      prompt: 'What is the core methodology, model architecture, and innovation introduced in this paper?'
    },
    {
      title: 'Empirical Results & Benchmarks',
      desc: 'Analyze quantitative metrics, datasets, and baseline comparisons.',
      prompt: 'What datasets and experimental benchmarks were used, and what were the exact numerical performance results?'
    },
    {
      title: 'Limitations & Future Directions',
      desc: 'Identify critical constraints, edge cases, and proposed future research.',
      prompt: 'What are the main limitations, failure modes, and open research directions discussed by the authors?'
    },
    {
      title: 'Mathematical Formulations',
      desc: 'Extract key equations, loss functions, and theoretical foundations.',
      prompt: 'Explain the mathematical formulations, loss functions, and optimization objectives used in this research.'
    }
  ];

  const currentPaper = papers.find((p) => p.id === selectedPaperId);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto w-full">
      
      {/* Top Paper Header Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#282724] bg-[#181816]/90 backdrop-blur-md rounded-t-2xl">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-8 w-8 rounded-lg bg-[#242320] border border-[#302e2a] flex items-center justify-center text-amber-400 shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-[#9c988f] font-medium hidden sm:inline">Active Context:</span>
            <select
              value={selectedPaperId}
              onChange={(e) => handlePaperSelect(e.target.value)}
              className="bg-[#1c1b18] hover:bg-[#242320] border border-[#302e2a] text-[#ede8e1] text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 max-w-[260px] sm:max-w-sm truncate cursor-pointer transition-colors"
            >
              {papers.length === 0 ? (
                <option value="">No papers uploaded</option>
              ) : (
                papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.pages} Pages)
                  </option>
                ))
              )}
            </select>

            {currentPaper && (
              <span className={`hidden md:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-mono ${
                currentPaper.status === 'indexed' 
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  : 'bg-stone-800 text-stone-400 border border-stone-700'
              }`}>
                {currentPaper.status === 'indexed' ? 'Indexed in ChromaDB' : currentPaper.status}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentPaper && onOpenPDF && (
            <button
              onClick={() => onOpenPDF(currentPaper)}
              className="px-2.5 py-1 text-xs text-[#9c988f] hover:text-[#ede8e1] bg-[#1c1b18] hover:bg-[#242320] border border-[#282724] rounded-lg flex items-center gap-1.5 transition-colors"
              title="Open PDF"
            >
              <FileCheck2 className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">View PDF</span>
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="px-2.5 py-1 text-xs text-stone-400 hover:text-rose-400 bg-[#1c1b18] hover:bg-rose-500/10 border border-[#282724] hover:border-rose-500/30 rounded-lg flex items-center gap-1.5 transition-colors"
              title="Reset current conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 space-y-7 bg-[#131312]">
        
        {historyLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-400 text-sm space-y-3">
            <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
            <span className="font-mono text-xs">Loading conversation context...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-3xl mx-auto text-center space-y-9 py-8">
            <div className="space-y-3.5">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto shadow-sm transition-transform hover:scale-105">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#faf8f5] tracking-tight">
                What would you like to explore today?
              </h2>
              <p className="text-sm sm:text-[15px] text-[#9c988f] max-w-xl mx-auto leading-relaxed">
                Ask deep technical questions about your research paper. Powered by ChromaDB hybrid RAG and verified citations.
              </p>
            </div>

            {/* 4 Clean Interactive Research Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
              {starterPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  disabled={!selectedPaperId}
                  className="bg-[#181816] hover:bg-[#22211e] border border-[#2b2a26] hover:border-amber-500/40 p-5 rounded-2xl text-left transition-all duration-200 group flex flex-col justify-between space-y-2.5 shadow-xs hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-semibold text-[#faf8f5] group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </span>
                    <Sparkles className="h-4 w-4 text-[#757168] group-hover:text-amber-400 transition-colors" />
                  </div>
                  <p className="text-xs text-[#9c988f] leading-relaxed">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-4 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* AI Avatar */}
              {msg.role === 'assistant' && (
                <div className="h-9 w-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-1 shadow-xs">
                  <Bot className="h-5 w-5" />
                </div>
              )}

              {/* Message Content Container */}
              <div
                className={`group relative ${
                  msg.role === 'user'
                    ? 'bg-[#292825] text-[#ffffff] rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[85%] sm:max-w-[75%] shadow-xs font-medium text-sm sm:text-[15px] leading-relaxed'
                    : 'bg-[#181816] border border-[#282724] text-[#faf8f5] rounded-2xl rounded-tl-sm px-6 py-5 max-w-[95%] sm:max-w-[88%] space-y-4 shadow-sm'
                }`}
              >
                {/* Message Text with Larger Font & Great Line Height */}
                <div className="text-[15px] sm:text-base leading-relaxed sm:leading-[1.75] whitespace-pre-wrap font-sans text-[#faf8f5] selection:bg-amber-500 selection:text-black">
                  {msg.message}
                </div>

                {/* Collapsible Verified Citations */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="pt-3 border-t border-[#2a2926]">
                    <button
                      onClick={() => toggleSources(idx)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 focus:outline-none transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{msg.sources.length} Verified Page Citations</span>
                      {expandedSources[idx] ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {expandedSources[idx] && (
                      <div className="mt-3 space-y-2.5 font-mono text-xs">
                        {msg.sources.map((src: RAGSourceSchema, sIdx: number) => (
                          <div key={sIdx} className="bg-[#121211] border border-[#2b2a26] rounded-xl p-3.5 space-y-1.5">
                            <div className="flex items-center justify-between text-[#faf8f5] font-semibold text-xs">
                              <span className="truncate max-w-[260px] text-stone-200">{src.paper_name}</span>
                              <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[11px] border border-amber-500/25">
                                Page {src.page_number}
                              </span>
                            </div>
                            <p className="text-[#a8a49c] font-sans text-xs sm:text-[13px] leading-relaxed italic">
                              "{src.text_snippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons (Copy) for Assistant */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between pt-1.5 text-[#8c887e]">
                    <span className="text-[11px] font-mono text-stone-500">ChromaDB RAG Grounded</span>
                    <button
                      onClick={() => handleCopyMessage(msg.message, idx)}
                      className="opacity-80 group-hover:opacity-100 px-2 py-1 hover:text-[#ede8e1] hover:bg-[#242320] rounded-md transition-all text-xs flex items-center gap-1.5"
                      title="Copy message"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs text-amber-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="text-xs">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="h-9 w-9 rounded-full bg-[#292825] border border-[#383733] flex items-center justify-center text-stone-200 shrink-0 mt-1 shadow-xs">
                  <UserIcon className="h-5 w-5" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex items-start gap-4">
            <div className="h-9 w-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-1">
              <Bot className="h-5 w-5 animate-pulse" />
            </div>
            <div className="bg-[#181816] border border-[#282724] rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-[#a8a49c] flex items-center gap-3 shadow-xs">
              <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
              <span>Retrieving embeddings from ChromaDB and synthesizing response...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Floating Prompt Input Bar */}
      <div className="p-3 sm:p-5 bg-[#131312] border-t border-[#201f1c] rounded-b-2xl space-y-2">
        
        {/* Quick Suggest Chips for Delightful Interactivity */}
        {selectedPaperId && !loading && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] text-[#757168] font-mono shrink-0">Quick prompt:</span>
            {[
              { label: '⚡ Core Findings', query: 'What are the core findings, contributions, and key takeaways of this research paper?' },
              { label: '🔬 Methodology', query: 'Explain the proposed methodology, pipeline architecture, and mathematical foundations in simple terms.' },
              { label: '📊 Datasets & Results', query: 'Which datasets, benchmarks, and quantitative baseline comparisons were used in the experiments?' },
              { label: '🎯 Limitations & Gaps', query: 'What are the main limitations, unaddressed assumptions, and future research gaps noted in this paper?' }
            ].map((chip, cIdx) => (
              <button
                key={cIdx}
                onClick={() => handleSend(chip.query)}
                className="px-3 py-1 bg-[#181816] hover:bg-[#242320] border border-[#2b2a26] hover:border-amber-500/40 text-stone-300 hover:text-amber-300 rounded-full text-xs shrink-0 transition-all font-medium"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <div className="relative bg-[#181816] border border-[#2b2a26] focus-within:border-amber-500/50 rounded-2xl p-3 transition-all shadow-md flex flex-col gap-2.5">
          
          {/* Textarea with Larger, Comfortable Typing Font */}
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              selectedPaperId 
                ? "Ask anything about this research paper... (Press Enter to send, Shift + Enter for newline)" 
                : "Please select an active paper above to start chatting"
            }
            disabled={!selectedPaperId || loading}
            className="w-full bg-transparent text-[#faf8f5] placeholder-[#757168] text-sm sm:text-base resize-none focus:outline-none px-2 py-1 max-h-[180px] disabled:opacity-50 leading-relaxed"
          />

          {/* Bottom Bar inside Prompt Card */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {currentPaper && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#242320] border border-[#33322e] text-xs text-[#a8a49c]">
                  <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                  <span className="truncate max-w-[200px] sm:max-w-[320px] font-medium">{currentPaper.title}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!selectedPaperId || !inputMessage.trim() || loading}
              className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                inputMessage.trim() && !loading
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/20 font-bold hover:scale-105'
                  : 'bg-[#242320] text-[#6e6b63] cursor-not-allowed'
              }`}
              title="Send message"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
              ) : (
                <ArrowUp className="h-4.5 w-4.5 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        {/* Disclaimer Footnote */}
        <p className="text-center text-[11px] text-[#757168]">
          ScholarGPT produces verified citations based on ChromaDB vector embeddings. Always verify critical facts from the original paper.
        </p>
      </div>
    </div>
  );
};

