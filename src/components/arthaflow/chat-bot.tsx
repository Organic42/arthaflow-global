"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2, Globe } from "lucide-react";

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant'; content: string}>>([
    { role: 'assistant', content: 'Hi! I am the ArthaFlow AI Assistant. How can I help you with your export journey today?' }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setError(null);

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response || "Sorry, I couldn't generate a response." }]);
      })
      .catch((err) => {
        console.error('Chat error:', err);
        setMessages(prev => [...prev, { role: 'assistant', content: "Connection interrupted. Please try again." }]);
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      {/* Floating Action Button (Holographic AI Node) */}
      <button
        onClick={() => setIsOpen(true)}
        className={`group fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-artha-gold/30 bg-navy p-0 shadow-[0_0_20px_rgba(212,168,67,0.4)] transition-all duration-500 hover:scale-110 hover:border-artha-gold hover:shadow-[0_0_40px_rgba(212,168,67,0.7)] disabled:opacity-50 ${
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
        aria-label="Open chatbot"
      >
        {/* Radar sweeping glow effect on hover */}
        <span className="absolute inset-0 bg-gradient-to-tr from-artha-gold/0 via-artha-gold/20 to-artha-gold/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
        
        {/* Subtle continuous ambient pulse */}
        <span className="absolute inset-0 animate-ping rounded-full bg-artha-gold/10 duration-1000"></span>

        <div className="relative z-10 flex h-full w-full items-center justify-center transition-transform duration-500 group-hover:scale-110">
          {loading ? (
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-artha-gold [animation-delay:-0.3s]"></span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-artha-gold [animation-delay:-0.15s]"></span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-artha-gold"></span>
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Rotating Holographic Tech Ring */}
              <div className="absolute h-[42px] w-[42px] animate-[spin_8s_linear_infinite] rounded-full border border-dashed border-artha-gold/50"></div>
              
              {/* Inner static containment ring */}
              <div className="absolute h-8 w-8 rounded-full border border-artha-gold/20"></div>
              
              {/* Glowing Core Icon */}
              <Globe size={22} strokeWidth={1.5} className="text-artha-gold drop-shadow-[0_0_12px_rgba(212,168,67,1)]" />
              
              {/* AI Sparkle */}
              <Sparkles size={12} className="absolute -bottom-1 -right-1 animate-pulse text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
            </div>
          )}
        </div>
      </button>

      {/* Floating Chat Window */}
      <div 
        className={`fixed bottom-24 right-6 z-50 flex h-[550px] w-[360px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-navy/95 shadow-2xl backdrop-blur-xl transition-all duration-300 origin-bottom-right sm:w-[400px] ${
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 pointer-events-none translate-y-8"
        }`}
      >
        {/* Glassmorphism Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-artha-gold/20 text-artha-gold shadow-[0_0_10px_rgba(212,168,67,0.2)]">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold tracking-wide text-white">ArthaFlow AI</h3>
              <p className="text-[11px] text-white/50">Always active</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex flex-1 flex-col overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex w-full animate-in fade-in slide-in-from-bottom-2 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'rounded-br-sm bg-gradient-to-br from-artha-gold to-yellow-600 text-navy font-medium' 
                    : 'rounded-bl-sm border border-white/10 bg-white/5 text-white/90'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Thinking Indicator */}
          {loading && (
            <div className="flex w-full justify-start animate-in fade-in">
              <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white/60">
                <Loader2 size={16} className="animate-spin text-artha-gold" />
                Processing data...
              </div>
            </div>
          )}

          {error && (
            <div className="flex w-full justify-center">
              <div className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[12px] text-red-400">
                {error}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 bg-white/5 p-4">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about compliance, HS codes..."
              disabled={loading}
              className="w-full rounded-full border border-white/10 bg-navy px-5 py-3.5 pr-12 text-sm text-white placeholder-white/40 shadow-inner outline-none transition-all focus:border-artha-gold/50 focus:ring-1 focus:ring-artha-gold/50 disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-artha-gold text-navy transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}