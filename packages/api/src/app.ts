import express, { type Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import albumRoutes from './routes/albums.js';
import mediaRoutes from './routes/media.js';
import chatRoutes from './routes/chat.js';
import healthRoutes from './routes/health.js';

/**
 * Construction de l'app séparée de son écoute réseau : les tests montent
 * l'app en mémoire (supertest) sans ouvrir de port ni de socket.
 */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  // Les listes d'albums et l'historique de chat sont du JSON très répétitif :
  // gzip divise la charge utile par 5 environ.
  app.use(compression());
  app.use(express.json({ limit: '256kb' }));

  app.use('/health', healthRoutes);
  app.use('/v1/auth', authRoutes);
  app.use('/v1/albums', albumRoutes);
  app.use('/v1/media', mediaRoutes);
  app.use('/v1/chat', chatRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
