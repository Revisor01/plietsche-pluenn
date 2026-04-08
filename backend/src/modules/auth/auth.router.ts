import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';

const router = Router();

const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  storeId: z.string().uuid(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Express 5: async Fehler propagieren automatisch — kein try/catch nötig
router.post('/register', async (req: Request, res: Response) => {
  const body = RegisterSchema.parse(req.body);
  const result = await authService.register(body);
  res.status(201).json(result);
});

router.post('/login', async (req: Request, res: Response) => {
  const body = LoginSchema.parse(req.body);
  const result = await authService.login(body);
  res.json(result);
});

export default router;
