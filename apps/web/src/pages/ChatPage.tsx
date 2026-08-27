import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Send } from 'lucide-react';
import type { Message, LovePhrase } from '@coffret/shared';
import { api } from '../lib/api';
import {
  onMessageRead,
  onMessageSent,
  onNewMessage,
  onTyping,
  sendSocketMessage,
  sendTyping,
} from '../lib/socket';
import { useAuthStore } from '../stores/authStore';

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [phrases, setPhrases] = useState<LovePhrase[]>([]);
  const [input, setInput] = useState('');
  const [showPhrases, setShowPhrases] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le serveur peut renvoyer le même message par deux canaux (REST + socket) :
  // on dédoublonne sur l'id plutôt que d'empiler aveuglément.
  const upsert = useCallback((incoming: Message) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === incoming.id);
      if (index === -1) return [...prev, incoming];
      const next = [...prev];
      next[index] = incoming;
      return next;
    });
  }, []);

  useEffect(() => {
    api.getMessages().then(setMessages).catch(console.error);
    api.getPhrases().then(setPhrases).catch(console.error);
  }, []);

  useEffect(() => {
    const unsubs = [
      onNewMessage((msg) => {
        upsert(msg);
        if (msg.receiverId === user?.id) {
          api.markMessageRead(msg.id).catch(() => {});
        }
      }),
      // Sans cet abonnement, ses propres messages n'apparaissaient qu'après rechargement.
      onMessageSent(upsert),
      onMessageRead(({ messageId, readAt }) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isRead: true, readAt } : m)),
        );
      }),
      onTyping(({ userId, isTyping }) => {
        if (userId !== user?.id) setPartnerTyping(isTyping);
      }),
    ];

    return () => unsubs.forEach((off) => off());
  }, [user?.id, upsert]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  useEffect(() => () => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  }, []);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages],
  );

  const notifyTyping = () => {
    sendTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(false), 2000);
  };

  const send = () => {
    const content = input.trim();
    if (!content) return;
    sendSocketMessage(content);
    setInput('');
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    sendTyping(false);
  };

  const sendPhrase = (content: string) => {
    sendSocketMessage(content);
    setShowPhrases(false);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <h1 className="font-display text-2xl font-semibold text-copper-gold">Chat secret</h1>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-2">
        {sorted.map((msg) => {
          const isMine = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMine
                    ? 'rounded-br-sm border border-copper-gold bg-cream'
                    : 'rounded-bl-sm border border-cream bg-powder-rose'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <div className="mt-1 flex items-center justify-end gap-1">
                  <span className="text-[10px] opacity-50">
                    {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMine && (
                    <Heart
                      size={12}
                      className={msg.isRead ? 'fill-copper-gold text-copper-gold' : 'text-gray-300'}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {partnerTyping && (
          <p className="pl-2 text-xs italic text-gray-400">En train d'écrire…</p>
        )}
        <div ref={bottomRef} />
      </div>

      {showPhrases && (
        <div className="mb-2 max-h-32 overflow-y-auto rounded-xl border border-copper-gold/30 bg-white p-2">
          {phrases.map((p) => (
            <button
              key={p.id}
              onClick={() => sendPhrase(p.content)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-powder-rose/30"
            >
              {p.content}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-copper-gold/30 bg-white p-2">
        <button
          onClick={() => setShowPhrases(!showPhrases)}
          className="rounded-xl p-2 text-copper-gold hover:bg-powder-rose/30"
          title="Phrases douces"
        >
          <Heart size={20} />
        </button>
        <input
          className="flex-1 bg-transparent px-2 py-2 outline-none"
          placeholder="Écrire un message…"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            notifyTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={send} className="rounded-xl bg-copper-gold p-2 text-white hover:opacity-90">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
