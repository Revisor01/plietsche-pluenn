import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import * as repo from './push.repository';
import * as pushService from './push.service';

const router = Router();

const RegisterTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

const SendPushSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(300),
});

const PushSettingsSchema = z.object({
  pushEnabled: z.boolean(),
});

// POST /api/push/token — Device-Token registrieren (nur authentifizierte User)
router.post('/token', authenticateToken, async (req: Request, res: Response) => {
  const body = RegisterTokenSchema.parse(req.body);
  await repo.insertToken(req.user!.sub, req.user!.storeId, body.token, body.platform);
  res.status(201).json({ ok: true });
});

// DELETE /api/push/token — Device-Token beim Logout entfernen
router.delete('/token', authenticateToken, async (req: Request, res: Response) => {
  await repo.deleteToken(req.user!.sub);
  res.status(204).send();
});

// POST /api/push/send — Manueller Push an alle Besucher des Stores (nur Admin)
router.post('/send', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const body = SendPushSchema.parse(req.body);
    await pushService.sendToStore(req.user!.storeId, body.title, body.body);
    res.status(200).json({ sent: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Ungueltige Eingabe', details: err.issues });
      return;
    }
    console.error('Push senden fehlgeschlagen:', err);
    res.status(500).json({ error: 'Push konnte nicht gesendet werden' });
  }
});

// GET /api/push/settings — Aktuellen pushEnabled-Status des Users abrufen
router.get('/settings', authenticateToken, async (req: Request, res: Response) => {
  const enabled = await repo.getPushEnabled(req.user!.sub);
  res.json({ pushEnabled: enabled });
});

// PATCH /api/push/settings — pushEnabled fuer den eingeloggten User setzen
router.patch('/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const body = PushSettingsSchema.parse(req.body);
    await repo.setPushEnabled(req.user!.sub, body.pushEnabled);
    res.json({ pushEnabled: body.pushEnabled });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Ungueltige Eingabe', details: err.issues });
      return;
    }
    console.error('Push-Einstellungen konnten nicht gespeichert werden:', err);
    res.status(500).json({ error: 'Einstellungen konnten nicht gespeichert werden' });
  }
});

export default router;
