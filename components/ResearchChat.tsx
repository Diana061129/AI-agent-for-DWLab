import React, { useState, useRef, useEffect } from 'react';
import { createResearchChat } from '../services/geminiService';
import { ChatMessage, UserSettings } from '../types';
import { Send, User, Bot, Loader2, Download, Trash2 } from 'lucide-react';
import { GenerateContentResponse } from '@google/genai';
import { parse } from 'marked';

interface ResearchChatProps {
  settings: UserSettings;
  username: string;
}

const ResearchChat: React.FC<ResearchChatProps> = ({ settings, username }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatSessionRef = useRef<ReturnType<typeof createResearchChat> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const storageKey = `scholarAi_${username}_chat_history`;

  useEffect(() => {
    // Load persisted messages for this user
    const savedMessages = localStorage.getItem(storageKey);
    let initialHistory: ChatMessage[] = [];
    
    if (savedMessages) {
      initialHistory = JSON.parse(savedMessages);
      setMessages(initialHistory);
    }
    
    // Initialize chat session WITH history so context is preserved
    // Filter out error messages or empty model placeholders from history initialization
    const validHistory = initialHistory.filter(m => !m.isError && m.text.trim() !== '');
    chatSessionRef.current = createResearchChat(settings, validHistory);
  }, [username, settings]); // Re-init if user or settings change

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } else {
       localStorage.setItem(storageKey, JSON.stringify([]));
    }

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, storageKey]);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await chatSessionRef.current.sendMessageStream({ message: input });
      
      let fullText = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const text = c.text || '';
        fullText += text;
        
        setMessages(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { 
            role: 'model', 
            text: fullText 
          };
          return newHistory;
        });
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "I encountered an error searching for that information. Please try again.", isError: true }]);
      // Re-initialize chat if error occurs to ensure clean state
      const validHistory = messages.filter(m => !m.isError && m.text.trim() !== '');
      chatSessionRef.current = createResearchChat(settings, validHistory);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (confirm("Clear chat history?")) {
      setMessages([]);
      localStorage.removeItem(storageKey);
      // Reset session
      chatSessionRef.current = createResearchChat(settings, []);
    }
  };

  const handleExport = (format: 'md' | 'doc') => {
    const content = messages.map(m => `**${m.role.toUpperCase()}**: ${m.text}`).join('\n\n');
    let blob: Blob;
    let filename = `Research_Chat_Export`;

    if (format === 'md') {
      blob = new Blob([content], { type: 'text/markdown' });
      filename += '.md';
    } else {
      // Simple HTML wrapper for Word export
      const htmlContent = `
        <html>
          <head><meta charset="utf-8"></head>
          <body>${messages.map(m => `<p><strong>${m.role.toUpperCase()}:</strong><br>${m.text.replace(/\n/g, '<br>')}</p>`).join('')}</body>
        </html>
      `;
      blob = new Blob([htmlContent], { type: 'application/msword' });
      filename += '.doc';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-800">Academic Assistant</h2>
          <p className="text-xs text-slate-500">Ask specific questions about principles, methods, or recent findings.</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => handleExport('md')} className="p-2 hover:bg-slate-200 rounded text-slate-600" title="Export MD"><Download className="w-4 h-4" /></button>
           <button onClick={handleClear} className="p-2 hover:bg-red-100 rounded text-red-500" title="Clear History"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
            <Bot className="w-12 h-12 mb-2" />
            <p>Start a conversation to research your topic.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}
            `}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            
            <div className={`
              max-w-[85%] md:max-w-[75%] p-4 rounded-xl text-sm leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none whitespace-pre-wrap' 
                : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200 prose prose-sm max-w-none prose-slate'}
              ${msg.isError ? 'bg-red-50 text-red-600 border-red-200' : ''}
            `}>
              {msg.role === 'user' ? (
                msg.text
              ) : (
                <div dangerouslySetInnerHTML={{ __html: parse(msg.text) as string }} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center">
                <Bot className="w-5 h-5" />
             </div>
             <div className="bg-slate-100 p-4 rounded-xl rounded-tl-none border border-slate-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                <span className="text-xs text-slate-500">Thinking...</span>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a research question..."
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchChat;