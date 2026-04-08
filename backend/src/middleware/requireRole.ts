import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../modules/auth/auth.types';

// WICHTIG: requireRole muss immer NACH authenticateToken in der Middleware-Chain stehen.
// Beispiel: router.get('/route', authenticateToken, requireRole('admin', 'volunteer'), handler)
export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: 'Insufficient permissions', required: roles, actual: user.role });
      return;
    }
    next();
  };
}
