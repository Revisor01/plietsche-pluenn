import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import type { AuthUser } from '../modules/auth/auth.types';

// Erweitert Express Request um user-Feld
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authorization token required' });
    return;
  }

  // Express 5: jwt.verify wirft bei ungültigem Token → Express fängt automatisch
  const user = jwt.verify(token, config.jwtSecret) as AuthUser;
  req.user = user;
  next();
}
