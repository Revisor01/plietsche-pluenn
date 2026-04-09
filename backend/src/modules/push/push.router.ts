import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import * as repo from './push.repository';

const router = Router();

const RegisterTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

// POST /api/push/token — Device-Token registrieren (nur authentifizierte User)
router.post('/token', authenticateToken, async (req: Request, res: Response) => {
  const body = RegisterTokenSchema.parse(req.body);
  await repo.insertToken(req.user!.sub, req.user!.storeId, body.token, body.platform);
  res.status(201).json({ ok: true });
});

// DELETE /api/push/token — Device-Token beim Logout entfernen
router.delete('/token', authenticateToken, async (req: Request, res: Response) => {
  await repo.deleteToken(req.user!.sub);
  res.status(204).send();
});

export default router;
