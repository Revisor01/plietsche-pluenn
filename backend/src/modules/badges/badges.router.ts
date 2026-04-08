import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import * as badgesService from './badges.service';

const router = Router();

const AddLevelSchema = z.object({
  name: z.string().min(1).max(100),
  iconName: z.string().min(1).max(50).default('medal'),
  minPoints: z.number().int().min(0),
  sortOrder: z.number().int().min(0).default(0),
});

const CreateAchievementSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().default(''),
  iconName: z.string().min(1).max(50).default('trophy'),
  triggerType: z.enum(['items_brought', 'items_taken', 'visits', 'streak_weeks', 'season_items_brought', 'season_items_taken', 'milestone']),
  triggerValue: z.number().int().min(1),
  tier: z.enum(['bronze', 'silber', 'gold', 'custom']).default('custom'),
  season: z.enum(['fruehling', 'sommer', 'herbst', 'winter']).nullable().default(null),
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

// POST /api/badges/levels — neue Stufe hinzufuegen (Admin)
router.post('/levels', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  const body = AddLevelSchema.parse(req.body);
  const level = await badgesService.addLevel(req.user!.storeId, body);
  res.status(201).json(level);
});

// DELETE /api/badges/levels/:id — Stufe loeschen (Admin)
router.delete('/levels/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  await badgesService.deleteLevel(String(req.params.id), req.user!.storeId);
  res.status(204).send();
});

// GET /api/badges/achievements — Alle Achievements des Users mit Fortschritt (Visitor)
router.get('/achievements', authenticateToken, async (req: Request, res: Response) => {
  const data = await badgesService.getUserAchievements(req.user!.sub, req.user!.storeId);
  res.json(data);
});

// GET /api/badges/achievements/all — Alle Achievements des Stores (Admin)
router.get('/achievements/all', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  const data = await badgesService.getAchievements(req.user!.storeId);
  res.json(data);
});

// POST /api/badges/achievements/seed — Default-Badges seeden (Admin, einmalig)
router.post('/achievements/seed', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  await badgesService.seedAchievements(req.user!.storeId);
  const all = await badgesService.getAchievements(req.user!.storeId);
  res.json({ seeded: all.length, achievements: all });
});

// POST /api/badges/achievements — Neues Achievement erstellen (Admin)
router.post('/achievements', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  const body = CreateAchievementSchema.parse(req.body);
  const result = await badgesService.createAchievement(req.user!.storeId, body);
  res.status(201).json(result);
});

// PATCH /api/badges/achievements/:id — Achievement bearbeiten (Admin)
router.patch('/achievements/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  const body = CreateAchievementSchema.partial().parse(req.body);
  const result = await badgesService.updateAchievement(String(req.params.id), req.user!.storeId, body);
  res.json(result);
});

// DELETE /api/badges/achievements/:id — Achievement loeschen (Admin)
router.delete('/achievements/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  await badgesService.deleteAchievement(String(req.params.id), req.user!.storeId);
  res.status(204).send();
});

export default router;
