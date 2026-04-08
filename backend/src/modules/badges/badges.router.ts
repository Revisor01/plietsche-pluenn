import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import * as badgesService from './badges.service';

const router = Router();

const AddLevelSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().min(1).max(10).default('🏅'),
  minPoints: z.number().int().min(0),
  sortOrder: z.number().int().min(0).default(0),
});

// GET /api/badges/my — aktuelles Level + Fortschritt (Visitor)
router.get('/my', authenticateToken, async (req: Request, res: Response) => {
  const progress = await badgesService.getBadgeProgress(req.user!.sub, req.user!.storeId);
  res.json(progress);
});

// GET /api/badges/levels — alle Level des Stores (Admin/Volunteer)
router.get('/levels', authenticateToken, requireRole('volunteer', 'admin'), async (req: Request, res: Response) => {
  const levels = await badgesService.getLevels(req.user!.storeId);
  res.json(levels);
});

// POST /api/badges/levels — neue Stufe hinzufügen (Admin)
router.post('/levels', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  const body = AddLevelSchema.parse(req.body);
  const level = await badgesService.addLevel(req.user!.storeId, body);
  res.status(201).json(level);
});

// DELETE /api/badges/levels/:id — Stufe löschen (Admin)
router.delete('/levels/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  await badgesService.deleteLevel(String(req.params.id), req.user!.storeId);
  res.status(204).send();
});

export default router;
