import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  Trash2, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { sendChatMessage, getChatHistory, clearChatHistory } from '../services/api';
import type { Paper, ChatMessageSchema, RAGSourceSchema } from '../types';

interface ChatInterfaceProps {
  papers: Paper[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ papers }) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageSchema[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Set default selected paper if available
  useEffect(() => {
    if (papers.length > 0 && !selectedPaperId) {
      setSelectedPaperId(papers[0].id);
    }
  }, [papers]);

  // Fetch chat history when paper changes
  useEffect(() => {
    if (selectedPaperId) {
      fetchHistory(selectedPaperId);
    }
  }, [selectedPaperId]);

  // Auto-scroll to bottom of chat thread
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchHistory = async (paperId: string) => {
    setHistoryLoading(true);
    try {
      const res = await getChatHistory(paperId);
      setMessages(res.messages);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !selectedPaperId || loading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    // Optimistic UI update: append user message immediately
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

  const starterPrompts = [
    'What is the core methodology and innovation of this paper?',
    'What dataset was used and what accuracy benchmark was achieved?',
    'What are the limitations or future research directions mentioned?'
  ];

  const currentPaper = papers.find((p) => p.id === selectedPaperId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl h-[82vh] flex flex-col shadow-2xl overflow-hidden">
      
      {/* Top Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        
        {/* Paper Selector */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-semibold">Active Paper:</label>
              <select
                value={selectedPaperId}
                onChange={(e) => setSelectedPaperId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[280px] sm:max-w-xs truncate cursor-pointer"
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
            </div>
            {currentPaper && (
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Status: <span className="text-emerald-400 capitalize">{currentPaper.status}</span> • {currentPaper.chunks_count || 0} Chunks
              </p>
            )}
          </div>
        </div>

        {/* Clear Chat Action */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              title="Clear Chat History"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Thread
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages Thread Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-950/60">
        
        {historyLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs space-y-2">
            <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
            <span>Loading conversation thread from SQLite DB...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-4 py-8">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MessageSquare className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Start Interactive Research Chat</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ask multi-turn follow-up questions. Answers are powered by ChromaDB RAG retrieval and Groq LLaMA-3 with inline page citations.
              </p>
            </div>

            {/* Starter Prompt Cards */}
            <div className="w-full space-y-2 pt-2">
              {starterPrompts.map((sp, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputMessage(sp);
                  }}
                  className="w-full text-left bg-slate-900 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 p-3 rounded-2xl text-xs text-slate-300 transition-all flex items-center justify-between group"
                >
                  <span>"{sp}"</span>
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* AI Avatar */}
              {msg.role === 'assistant' && (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 shrink-0 shadow-md mt-1">
                  <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Bot className="h-4 w-4 text-amber-400" />
                  </div>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 space-y-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm shadow-lg shadow-indigo-600/20 font-medium'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm shadow-lg'
                }`}
              >
                <p className="whitespace-pre-wrap font-sans text-xs">
                  {msg.message}
                </p>

                {/* Collapsible Source Citations Panel for AI Messages */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => toggleSources(idx)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 focus:outline-none"
                    >
                      <FileText className="h-3 w-3" />
                      <span>{msg.sources.length} Cited Sources</span>
                      {expandedSources[idx] ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {expandedSources[idx] && (
                      <div className="mt-2 space-y-2 font-mono text-[11px]">
                        {msg.sources.map((src: RAGSourceSchema, sIdx: number) => (
                          <div key={sIdx} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-slate-300 font-bold">
                              <span className="truncate max-w-[180px]">{src.paper_name}</span>
                              <span className="text-amber-400 font-normal">Page {src.page_number}</span>
                            </div>
                            <p className="text-slate-400 line-clamp-2 text-[10px]">
                              "{src.text_snippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator for AI Response */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 shrink-0 shadow-md">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Bot className="h-4 w-4 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl rounded-tl-sm p-4 text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
              <span>Retrieving ChromaDB vectors & generating response via Groq LLaMA-3...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              selectedPaperId 
                ? "Ask a question about this research paper..." 
                : "Please select a paper above to start chatting"
            }
            disabled={!selectedPaperId || loading}
            className="flex-1 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-all"
          />

          <button
            type="submit"
            disabled={!selectedPaperId || !inputMessage.trim() || loading}
            className="h-10 w-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
