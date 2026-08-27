import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { verifyToken, type AuthPayload } from '../middleware/auth.js';
import { getPartnerId } from '../services/partner.js';
import { mapMessage } from '../routes/chat.js';

const sendSchema = z.object({
  content: z.string().min(1).max(5000),
  type: z.enum(['text', 'image', 'video', 'voice', 'ephemeral']).default('text'),
});

const readSchema = z.object({ messageId: z.string().uuid() });

/**
 * Socket.IO ne capture pas les rejets des handlers async : sans ce garde-fou,
 * une erreur SQL sur un simple « typing:start » fait tomber le process.
 */
function on<T>(socket: Socket, event: string, handler: (payload: T) => Promise<void>) {
  socket.on(event, (payload: T) => {
    handler(payload).catch((err: Error) => {
      console.error(`socket ${event}:`, err);
      socket.emit('error:handled', { event, message: 'Action impossible' });
    });
  });
}

export function setupChatSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));
    try {
      socket.data.user = verifyToken(token, 'access');
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthPayload;
    socket.join(user.userId);

    on(socket, 'message:send', async (raw: unknown) => {
      const parsed = sendSchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit('error:handled', { event: 'message:send', message: 'Message invalide' });
        return;
      }

      const partnerId = await getPartnerId(user.userId);
      if (!partnerId) return;

      const result = await query(
        `INSERT INTO messages (sender_id, receiver_id, content, type, is_ephemeral)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [user.userId, partnerId, parsed.data.content, parsed.data.type, parsed.data.type === 'ephemeral'],
      );

      const message = mapMessage(result.rows[0]);
      io.to(partnerId).emit('message:new', message);
      socket.emit('message:sent', message);
    });

    on(socket, 'message:read', async (raw: unknown) => {
      const parsed = readSchema.safeParse(raw);
      if (!parsed.success) return;

      const result = await query(
        `UPDATE messages SET is_read = TRUE, read_at = NOW()
         WHERE id = $1 AND receiver_id = $2 AND is_read = FALSE
         RETURNING *`,
        [parsed.data.messageId, user.userId],
      );
      if (result.rows.length === 0) return;

      const row = result.rows[0];
      io.to(row.sender_id).emit('message:read', { messageId: row.id, readAt: row.read_at });
    });

    on(socket, 'typing:start', async () => {
      const partnerId = await getPartnerId(user.userId);
      if (partnerId) io.to(partnerId).emit('typing:update', { userId: user.userId, isTyping: true });
    });

    on(socket, 'typing:stop', async () => {
      const partnerId = await getPartnerId(user.userId);
      if (partnerId) io.to(partnerId).emit('typing:update', { userId: user.userId, isTyping: false });
    });
  });
}
