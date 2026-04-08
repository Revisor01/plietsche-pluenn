import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { statsQuerySchema, fetchStats } from './dashboard.service';

const router = Router();

router.get(
  '/stats',
  authenticateToken,
  requireRole('admin', 'volunteer'),
  async (req, res) => {
    const { from, to } = statsQuerySchema.parse(req.query);
    const storeId = req.user!.storeId;
    const stats = await fetchStats(storeId, from, to);
    res.json(stats);
  }
);

export default router;
