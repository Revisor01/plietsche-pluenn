import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import * as adminService from './admin.service';

const router = Router();

const CreateVolunteerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

// GET /api/admin/users — Liste aller Volunteers dieser Store
router.get(
  '/users',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const storeId = req.user!.storeId;
    const volunteers = await adminService.listVolunteers(storeId);
    res.json({ users: volunteers });
  },
);

// POST /api/admin/users — Neuen Volunteer-Account erstellen
router.post(
  '/users',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const body = CreateVolunteerSchema.parse(req.body);
    const storeId = req.user!.storeId;
    const volunteer = await adminService.createVolunteer(body, storeId);
    res.status(201).json({ user: volunteer });
  },
);

export default router;
