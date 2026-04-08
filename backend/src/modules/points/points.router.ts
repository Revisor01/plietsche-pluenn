import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import * as pointsService from './points.service';
import { upsertStoreSettings } from './points.repository';

const router = Router();

const PatchSettingsSchema = z.object({
  pointsPerScan: z.number().int().min(0).max(1000).optional(),
  pointsPerCheckin: z.number().int().min(0).max(1000).optional(),
  pointsPerItem: z.number().int().min(0).max(100).optional(),
  maxItemsPerCheckin: z.number().int().min(1).max(100).optional(),
});

router.get('/balance', authenticateToken, async (req: Request, res: Response) => {
  const result = await pointsService.getBalance(req.user!.sub);
  res.json(result);
});

router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  const result = await pointsService.getHistory(req.user!.sub, req.user!.storeId);
  res.json(result);
});

router.patch(
  '/settings',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const data = PatchSettingsSchema.parse(req.body);
    await upsertStoreSettings(req.user!.storeId, data);
    res.json({ ok: true });
  },
);

export default router;
