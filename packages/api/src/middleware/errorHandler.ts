import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route introuvable' } });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  // Les tests provoquent volontairement des erreurs : on ne pollue pas leur sortie.
  if (config.nodeEnv !== 'test') console.error(err);

  // En production, ne jamais renvoyer le message brut (fuite de détails Postgres).
  const message = config.nodeEnv === 'production' ? 'Erreur interne' : err.message || 'Erreur interne';
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
}
