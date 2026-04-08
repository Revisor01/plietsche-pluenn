import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ZodError } from 'zod';
import authRouter from './modules/auth/auth.router';
import itemsRouter from './modules/items/items.router';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);

// Globaler Error Handler (Express 5)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', issues: err.issues });
    return;
  }
  if (err instanceof Error) {
    const statusCode = (err as any).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      res.status(statusCode).json({ error: err.message });
      return;
    }
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
  res.status(500).json({ error: 'Unknown error' });
});

export default app;
