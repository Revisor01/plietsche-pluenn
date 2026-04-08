import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import * as scanService from './scan.service';

const router = Router();

const ScanSchema = z.object({
  qrToken: z.string().uuid(),
});

// Alle authentifizierten Rollen dürfen scannen (visitor/volunteer/admin)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const { qrToken } = ScanSchema.parse(req.body);
  const result = await scanService.scanItemQr(qrToken, req.user!.sub, req.user!.storeId);
  res.json(result);
});

export default router;
