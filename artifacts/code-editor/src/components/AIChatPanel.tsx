import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, User, Loader2, Trash2, Copy, Check } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Props {
  openFileCode?: string;
  openFileLanguage?: string;
  openFileName?: string | null;
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative mt-2 mb-2 rounded overflow-hidden border border-[#21262d]">
      <div className="flex items-center justify-between bg-[#161b22] px-3 py-1 text-[10px] text-[#8b949e]">
        <span className="font-mono">{lang || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1 hover:text-[#c9d1d9] transition-colors">
          {copied ? <Check className="h-3 w-3 text-[#00ff9c]" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="bg-[#0d1117] text-[#c9d1d9] text-xs font-mono p-3 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

function renderContent(content: string) {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      parts.push(
        <span key={key++} className="whitespace-pre-wrap text-[#c9d1d9]">
          {text}
        </span>
      );
    }
    parts.push(<CodeBlock key={key++} lang={match[1]} code={match[2].trimEnd()} />);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key={key++} className="whitespace-pre-wrap text-[#c9d1d9]">
        {content.slice(lastIndex)}
      </span>
    );
  }

  return parts;
}

export function AIChatPanel({ openFileCode, openFileLanguage, openFileName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${BASE}api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          code: openFileCode,
          language: openFileLanguage,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { reply: string };

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ Failed to get a response. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, openFileCode, openFileLanguage, BASE]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#21262d] bg-[#161b22] shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-[#00ff9c]" />
          <span className="text-xs font-semibold text-[#c9d1d9]">AI Assistant</span>
          {openFileName && (
            <span className="text-[10px] text-[#484f58] font-mono bg-[#0d1117] px-1.5 py-0.5 rounded">
              {openFileName}
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-1 rounded hover:bg-[#21262d] text-[#484f58] hover:text-red-400 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="h-12 w-12 rounded-2xl bg-[#00ff9c]/10 border border-[#00ff9c]/20 flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-[#00ff9c]" />
            </div>
            <p className="text-sm font-medium text-[#8b949e] mb-1">AI Code Assistant</p>
            <p className="text-xs text-[#484f58] max-w-[220px]">
              Ask about your code, get explanations, fix bugs, or generate new code.
            </p>
            <div className="mt-4 space-y-2 w-full max-w-[240px]">
              {[
                'Explain this code',
                'Find bugs in my code',
                'How can I optimize this?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="w-full text-left text-xs text-[#8b949e] bg-[#161b22] border border-[#21262d] hover:border-[#00ff9c]/30 hover:text-[#c9d1d9] px-3 py-2 rounded transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center ${
              msg.role === 'user'
                ? 'bg-[#00ff9c]/20 text-[#00ff9c]'
                : 'bg-[#161b22] border border-[#21262d] text-[#8b949e]'
            }`}>
              {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#00ff9c]/10 border border-[#00ff9c]/20 text-[#c9d1d9]'
                : 'bg-[#161b22] border border-[#21262d] text-[#c9d1d9]'
            }`}>
              {renderContent(msg.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center bg-[#161b22] border border-[#21262d] text-[#8b949e]">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-[#161b22] border border-[#21262d] rounded-lg px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 text-[#00ff9c] animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 py-3 border-t border-[#21262d] bg-[#161b22]">
        <div className="flex items-end gap-2 bg-[#0d1117] border border-[#21262d] focus-within:border-[#00ff9c]/40 rounded-lg px-3 py-2 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your code... (Enter to send, Shift+Enter for newline)"
            rows={1}
            style={{ resize: 'none' }}
            className="flex-1 bg-transparent text-xs text-[#c9d1d9] placeholder-[#484f58] outline-none leading-relaxed max-h-24 overflow-y-auto"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 96) + 'px';
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="shrink-0 h-6 w-6 rounded flex items-center justify-center bg-[#00ff9c] hover:bg-[#00ff9c]/80 text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
        <p className="text-[10px] text-[#21262d] mt-1.5 text-right">Powered by OpenAI · Replit AI Credits</p>
      </div>
    </div>
  );
}
