import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import * as itemsService from './items.service';

const router = Router();

const CreateItemSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1),
  size: z.string().optional(),
  condition: z.string().optional(),
  color: z.string().optional(),
});

const ListItemsSchema = z.object({
  category: z.string().optional(),
  status: z.enum(['active', 'taken']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const ShowcaseSchema = z.object({ isShowcase: z.boolean() });

// GET /api/items/showcase — Visitor-zugänglich (nur authenticateToken, kein requireRole)
// MUSS vor /:id registriert sein, sonst matcht "showcase" als :id-Parameter
router.get('/showcase', authenticateToken, async (req: Request, res: Response) => {
  const result = await itemsService.getShowcaseItems(req.user!.storeId);
  res.json(result);
});

// PATCH /api/items/:id/showcase — nur Volunteer/Admin
router.patch(
  '/:id/showcase',
  authenticateToken,
  requireRole('volunteer', 'admin'),
  async (req: Request, res: Response) => {
    const { isShowcase } = ShowcaseSchema.parse(req.body);
    const item = await itemsService.setShowcase(String(req.params.id), req.user!.storeId, isShowcase);
    if (!item) {
      res.status(404).json({ error: 'Item nicht gefunden' });
      return;
    }
    res.json(item);
  },
);

// Express 5: async Fehler propagieren automatisch — kein try/catch nötig
router.post(
  '/',
  authenticateToken,
  requireRole('volunteer', 'admin'),
  async (req: Request, res: Response) => {
    const body = CreateItemSchema.parse(req.body);
    const item = await itemsService.createItem(body, req.user!.storeId);
    res.status(201).json(item);
  },
);

router.get(
  '/',
  authenticateToken,
  requireRole('volunteer', 'admin'),
  async (req: Request, res: Response) => {
    const filters = ListItemsSchema.parse(req.query);
    const result = await itemsService.listItems(req.user!.storeId, filters);
    res.json(result);
  },
);

router.get(
  '/:id/qr',
  authenticateToken,
  requireRole('volunteer', 'admin'),
  async (req: Request, res: Response) => {
    const itemId = String(req.params.id);
    const png = await itemsService.getItemQrPng(itemId, req.user!.storeId);
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="qr-${itemId}.png"`);
    res.send(png);
  },
);

export default router;
