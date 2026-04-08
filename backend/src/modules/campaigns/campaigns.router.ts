import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import * as campaignsService from './campaigns.service';

const router = Router();

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  multiplier: z.number().min(1).max(10),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

const UpdateSchema = CreateSchema.partial();

// GET /api/campaigns — alle Kampagnen des Stores (Admin + Volunteer)
router.get('/', authenticateToken, requireRole('volunteer', 'admin'), async (req: Request, res: Response) => {
  const result = await campaignsService.listCampaigns(req.user!.storeId);
  res.json(result);
});

// GET /api/campaigns/active — aktive Kampagne (auch für Visitor)
router.get('/active', authenticateToken, async (req: Request, res: Response) => {
  const campaign = await campaignsService.getActiveCampaign(req.user!.storeId);
  res.json(campaign ?? null);
});

// POST /api/campaigns — nur Admin
router.post('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  const body = CreateSchema.parse(req.body);
  const campaign = await campaignsService.createCampaign(req.user!.storeId, body);
  res.status(201).json(campaign);
});

// PATCH /api/campaigns/:id — nur Admin
router.patch('/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  const body = UpdateSchema.parse(req.body);
  const campaign = await campaignsService.updateCampaign(String(req.params.id), req.user!.storeId, body);
  if (!campaign) { res.status(404).json({ error: 'Kampagne nicht gefunden' }); return; }
  res.json(campaign);
});

// DELETE /api/campaigns/:id — nur Admin
router.delete('/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  await campaignsService.deleteCampaign(String(req.params.id), req.user!.storeId);
  res.status(204).send();
});

export default router;
