// components/requests/MessageTrail.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Send, Check, CheckCheck, MessageSquare } from 'lucide-react';

function formatDate(dateString?: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusIcon({ status }: { status?: string }) {
  if (status === 'read') {
    return <CheckCheck className="w-3.5 h-3.5 text-primary" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
  }
  return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  sender_avatar?: string;
  is_requestor: boolean;
  timestamp: string;
  status: string;
}

interface MessageTrailProps {
  trail: Message[];
  requestId: string;
  currentUserId: string;
}

export default function MessageTrail({ trail, requestId, currentUserId }: MessageTrailProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const messages: Message[] = (Array.isArray(trail) ? trail : []) as Message[];
  const hasMessages = messages && messages.length > 0;

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const text = input.trim();
    setInput('');
    setIsSending(true);

    try {
      const encodedId = encodeURIComponent(requestId);
      const res = await fetch(`/api/requests/${encodedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error('Failed to send');
      }

      router.refresh();
    } catch (err) {
      setInput(text);
      console.error('Send message error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col" style={{ maxHeight: '400px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2 sidebar-scrollbar" style={{ maxHeight: '320px' }}>
        {!hasMessages ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start the conversation below</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            const name = msg.sender_name || 'Unknown User';
            const initial = name.charAt(0).toUpperCase();
            
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                    {msg.sender_avatar ? (
                      <img src={msg.sender_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-primary">{initial}</span>
                      </div>
                    )}
                    <span className="text-xs font-medium text-foreground">{name}</span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? 'hero-gradient rounded-br-md'
                        : 'glass-card !p-3 rounded-bl-md'
                    }`}
                  >
                    {msg.message}
                  </div>

                  {/* Time + status */}
                  <div className={`flex items-center gap-1.5 mt-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] text-muted-foreground">{formatDate(msg.timestamp)}</span>
                    {isMine && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/30 mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 input-field py-2 text-sm"
          disabled={isSending}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-ambient"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
