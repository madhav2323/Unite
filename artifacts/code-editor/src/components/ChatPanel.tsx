import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { ChatMessage } from '@/context/WorkspaceContext';
import { format } from 'date-fns';

interface Props {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  currentUserId: string;
}

export function ChatPanel({ messages, onSendMessage, currentUserId }: Props) {
  const [val, setVal] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (val.trim()) { onSendMessage(val.trim()); setVal(''); }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <MessageSquare className="h-8 w-8 text-[#21262d]" />
            <p className="text-xs text-[#484f58] italic">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            const color = msg.color || '#00ff9c';
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-1.5 mb-1">
                  {!isMe && (
                    <span className="h-3.5 w-3.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: color }} />
                  )}
                  <span className="text-xs font-semibold" style={{ color: isMe ? '#c9d1d9' : color }}>
                    {isMe ? 'You' : msg.username}
                  </span>
                  <span className="text-[10px] text-[#484f58]">
                    {format(new Date(msg.timestamp), 'HH:mm')}
                  </span>
                </div>
                <div className={`px-3 py-1.5 rounded-2xl text-xs max-w-[88%] break-words font-mono ${
                  isMe
                    ? 'bg-[#00ff9c]/10 border border-[#00ff9c]/20 text-[#c9d1d9] rounded-tr-sm'
                    : 'bg-[#1c2128] border border-[#21262d] text-[#c9d1d9] rounded-tl-sm'
                }`}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2.5 border-t border-[#21262d] shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text" value={val} onChange={(e) => setVal(e.target.value)}
            placeholder="Message the team..."
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
            className="w-full bg-[#161b22] border border-[#21262d] focus:border-[#00ff9c]/40 rounded-full pl-4 pr-10 py-1.5 text-xs text-[#c9d1d9] placeholder-[#484f58] focus:outline-none transition-all font-mono"
          />
          <button type="submit" disabled={!val.trim()}
            className="absolute right-1.5 h-6 w-6 flex items-center justify-center rounded-full bg-[#00ff9c] text-black disabled:opacity-30 disabled:bg-[#21262d] disabled:text-[#484f58] hover:bg-[#00ff9c]/80 transition-colors">
            <Send className="h-3 w-3" />
          </button>
        </form>
      </div>
    </div>
  );
}
