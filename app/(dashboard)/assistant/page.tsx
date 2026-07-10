'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthProvider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * AI Assistant — Full-page conversational AI for health data queries.
 * Context-aware: scoped to user's role and centre.
 */
export default function AIAssistantPage() {
  const { profile } = useAuth();
  const isStaff = profile?.role === 'Centre_Staff';
  const isHindi = profile?.languagePreference === 'hi';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: isHindi
        ? (isStaff
          ? 'नमस्ते! मैं आपका AI स्वास्थ्य सहायक हूँ। मुझसे दवा स्टॉक, बिस्तर उपलब्धता, रोगी फुटफॉल, या अपने केंद्र के बारे में कुछ भी पूछें।'
          : 'नमस्ते! मैं आपका AI स्वास्थ्य सहायक हूँ। किसी भी केंद्र के प्रदर्शन, स्टॉक स्तर, बिस्तर उपलब्धता, स्टाफिंग, या जिला स्वास्थ्य स्थिति के बारे में पूछें।')
        : (isStaff
          ? `Hi! I'm your AI Health Assistant for ${profile?.centreId ? 'your centre' : 'your district'}. Ask me about medicine stock, bed availability, patient footfall, or anything else about your centre.`
          : "Hi! I'm your AI Health Assistant. Ask me about any centre's performance, stock levels, bed availability, staffing, or overall district health status."),
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const districtId = profile?.districtId ?? '';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
    inputRef.current?.focus();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          districtId,
          role: profile?.role ?? 'Centre_Staff',
          centreId: profile?.centreId ?? null,
          language: profile?.languagePreference ?? 'en',
        }),
      });

      let aiContent: string;
      if (!response.ok) {
        aiContent = "I'm having trouble connecting right now. Please try again in a moment.";
      } else {
        const data = await response.json();
        aiContent = data.response || "I couldn't generate a response. Please try rephrasing.";
      }

      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, couldn't process your request. Check your connection and try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** Render simple markdown: bold, bullets, headers */
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Process inline bold **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      });

      // Headers
      if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h4>;
      if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-2 mb-1">{line.slice(3)}</h3>;

      // Bullet points
      if (line.match(/^[\s]*[-•*]\s/)) {
        const content = line.replace(/^[\s]*[-•*]\s/, '');
        const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
        const contentParts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>;
          return <span key={j}>{part}</span>;
        });
        return <div key={i} className="flex gap-1.5" style={{ paddingLeft: `${Math.min(indent, 4) * 4}px` }}><span className="text-gray-400 shrink-0">•</span><span>{contentParts}</span></div>;
      }

      // Numbered lists
      if (line.match(/^\d+\.\s/)) {
        const num = line.match(/^(\d+)\./)?.[1];
        const content = line.replace(/^\d+\.\s/, '');
        const contentParts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>;
          return <span key={j}>{part}</span>;
        });
        return <div key={i} className="flex gap-1.5"><span className="text-indigo-500 font-medium shrink-0">{num}.</span><span>{contentParts}</span></div>;
      }

      // Empty line = spacing
      if (line.trim() === '') return <div key={i} className="h-2" />;

      // Normal line with bold support
      return <div key={i}>{rendered}</div>;
    });
  };

  // Suggested questions based on role and language
  const suggestions = isHindi
    ? (isStaff
      ? ['कौन सी दवाएं कम हैं?', 'आज कितने मरीज़ आए?', 'मेरे लिए कोई निर्देश?']
      : ['कौन सा केंद्र अंडरपरफॉर्म कर रहा है?', 'बिस्तर उपलब्धता दिखाएं', 'स्टॉक-आउट का जोखिम'])
    : (isStaff
      ? ['What medicines are low?', 'How many patients today?', 'Any directives for me?']
      : ['Which centre is underperforming?', 'Show bed availability', 'Stock-out risks this week']);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-lg">🤖</span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{isHindi ? 'AI स्वास्थ्य सहायक' : 'AI Health Assistant'}</h1>
            <p className="text-xs text-gray-500">
              {isHindi
                ? (isStaff ? 'अपने केंद्र के बारे में पूछें — स्टॉक, बिस्तर, रोगी, निर्देश' : 'किसी भी केंद्र या पूरे जिले के बारे में पूछें')
                : (isStaff
                  ? 'Ask about your centre — stock, beds, patients, directives'
                  : 'Ask about any centre or the full district — analytics, predictions, staffing')}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">🎤 Voice</span>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full">EN/HI</span>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-full">🤖 Agentic</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
              }`}
            >
              {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
              {msg.role === 'assistant' && msg.id !== 'welcome' && (
                <button
                  onClick={(e) => {
                    const btn = e.currentTarget;
                    if (window.speechSynthesis.speaking) {
                      window.speechSynthesis.cancel();
                      btn.textContent = '🔊 Read aloud';
                      return;
                    }
                    // Clean text: remove emojis, markdown symbols, keep only readable content
                    const cleanText = msg.content
                      .replace(/[*#•🛏️💊👨‍⚕️👥⚠️✅💡📋📊🔴⏰🎤🤖]/g, '')
                      .replace(/\n+/g, '. ')
                      .slice(0, 500); // Limit to 500 chars to prevent endless reading
                    const utterance = new SpeechSynthesisUtterance(cleanText);
                    utterance.lang = cleanText.match(/[\u0900-\u097F]/) ? 'hi-IN' : 'en-IN';
                    utterance.rate = 0.95;
                    btn.textContent = '⏹️ Stop';
                    utterance.onend = () => { btn.textContent = '🔊 Read aloud'; };
                    window.speechSynthesis.speak(utterance);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full hover:bg-indigo-100 transition-colors"
                  title="Read aloud / Stop"
                >
                  🔊 Read aloud
                </button>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <span className="inline-flex gap-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions — show only when no messages sent yet */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 bg-white border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">{isHindi ? 'पूछकर देखें:' : 'Try asking:'}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full hover:bg-indigo-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Voice Input Button */}
          <button
            onClick={() => {
              if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                alert('Voice input not supported in this browser. Use Chrome.');
                return;
              }
              const SpeechRecognitionClass = (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; interimResults: boolean; onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null; start: () => void }; SpeechRecognition?: new () => { lang: string; interimResults: boolean; onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null; start: () => void } }).webkitSpeechRecognition || (window as unknown as { SpeechRecognition: new () => { lang: string; interimResults: boolean; onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null; start: () => void } }).SpeechRecognition;
              const recognition = new SpeechRecognitionClass();
              recognition.lang = profile?.languagePreference === 'hi' ? 'hi-IN' : 'en-IN';
              recognition.interimResults = false;
              recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                inputRef.current?.focus();
              };
              recognition.start();
            }}
            className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            title="Voice input (Hindi/English)"
            aria-label="Voice input"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isHindi ? 'कुछ भी पूछें — टाइप करें या आवाज़ का उपयोग करें...' : 'Ask anything — type or use voice (Hindi/English)...'}
            className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          {isHindi ? '🎤 आवाज़: हिंदी और अंग्रेज़ी • 🤖 AI प्रतिक्रियाएं केवल सलाहकारी हैं' : '🎤 Voice: Hindi & English supported • 🤖 AI responses are advisory only'}
        </p>
      </div>
    </div>
  );
}
