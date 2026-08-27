import { io, Socket } from 'socket.io-client';
import type { Message } from '@coffret/shared';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3001';

const EVENTS = ['message:new', 'message:sent', 'message:read', 'typing:update'] as const;
type SocketEvent = (typeof EVENTS)[number];

type Listener = (payload: unknown) => void;

let socket: Socket | null = null;

/**
 * Les abonnements vivent ici, pas sur l'instance Socket : le socket est
 * recréé à chaque rafraîchissement de token, et les composants déjà montés
 * doivent continuer à recevoir les événements sans se réabonner.
 */
const listeners = new Map<SocketEvent, Set<Listener>>();

function attachDispatchers(instance: Socket) {
  for (const event of EVENTS) {
    instance.on(event, (payload: unknown) => {
      listeners.get(event)?.forEach((handler) => handler(payload));
    });
  }
}

export function connectSocket(token: string): Socket {
  const currentToken = (socket?.auth as { token?: string } | undefined)?.token;
  if (socket?.connected && currentToken === token) return socket;

  // Sans ce disconnect, l'ancien socket continue de se reconnecter en fond.
  socket?.disconnect();

  socket = io(WS_URL, {
    path: '/chat',
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  attachDispatchers(socket);

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

function subscribe<T>(event: SocketEvent, handler: (payload: T) => void): () => void {
  const listener = handler as Listener;
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

export type MessageHandler = (message: Message) => void;

/** Message reçu du partenaire. */
export function onNewMessage(handler: MessageHandler): () => void {
  return subscribe('message:new', handler);
}

/** Écho de son propre message, une fois persisté côté serveur. */
export function onMessageSent(handler: MessageHandler): () => void {
  return subscribe('message:sent', handler);
}

export function onMessageRead(handler: (payload: { messageId: string; readAt: string }) => void): () => void {
  return subscribe('message:read', handler);
}

export function onTyping(handler: (payload: { userId: string; isTyping: boolean }) => void): () => void {
  return subscribe('typing:update', handler);
}

export function sendSocketMessage(content: string) {
  socket?.emit('message:send', { content, type: 'text' });
}

export function sendTyping(isTyping: boolean) {
  socket?.emit(isTyping ? 'typing:start' : 'typing:stop');
}
