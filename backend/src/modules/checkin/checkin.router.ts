import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import * as checkinService from './checkin.service';

const router = Router();

const CheckInSchema = z.object({
  doorToken: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  itemCount: z.number().int().min(0).max(10),
});

// POST /api/checkin — alle authentifizierten Rollen
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const { doorToken, lat, lng, itemCount } = CheckInSchema.parse(req.body);
  const result = await checkinService.processCheckin(
    req.user!.sub,
    req.user!.storeId,
    doorToken,
    { lat, lng },
    itemCount,
  );
  res.json(result);
});

// GET /api/checkin/door-qr — Admin-only, gibt aktuellen HMAC-Token als PNG zurück
router.get(
  '/door-qr',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const token = checkinService.getCurrentDoorToken(req.user!.storeId);
    const png = await QRCode.toBuffer(token, { type: 'png', width: 400, margin: 2 });
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', 'attachment; filename="door-qr.png"');
    res.send(png);
  },
);

export default router;
