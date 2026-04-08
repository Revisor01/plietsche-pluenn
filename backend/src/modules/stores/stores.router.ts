import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import * as storesService from './stores.service';

const router = Router();

const UpdateStoreSchema = z.object({
  address: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  openingHours: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  checkinRadiusMeters: z.number().int().min(10).max(2000).optional(),
});

// Public: kein Auth nötig
router.get('/info', async (req: Request, res: Response) => {
  const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined;
  const store = await storesService.getStoreInfo(storeId);
  res.json(store);
});

// Admin-only
router.patch(
  '/info',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const body = UpdateStoreSchema.parse(req.body);
    const store = await storesService.updateStoreInfo(req.user!.storeId, body);
    res.json(store);
  },
);

export default router;
