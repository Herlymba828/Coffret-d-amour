import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthPayload {
  userId: string;
  role: string;
}

type TokenType = 'access' | 'refresh';

interface TokenClaims extends AuthPayload {
  type: TokenType;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Vérifie un token ET son type : un refresh token (7 jours) ne doit jamais
 * être accepté comme bearer d'accès.
 */
export function verifyToken(token: string, expected: TokenType): AuthPayload {
  const claims = jwt.verify(token, config.jwtSecret) as Partial<TokenClaims>;
  if (claims.type !== expected || !claims.userId || !claims.role) {
    throw new jwt.JsonWebTokenError('Type de token invalide');
  }
  return { userId: claims.userId, role: claims.role };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token manquant' } });
  }

  try {
    req.user = verifyToken(header.slice(7), 'access');
    next();
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token invalide ou expiré' } });
  }
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign({ ...payload, type: 'access' satisfies TokenType }, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiry as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' satisfies TokenType }, config.jwtSecret, {
    expiresIn: config.jwtRefreshExpiry as jwt.SignOptions['expiresIn'],
  });
}
