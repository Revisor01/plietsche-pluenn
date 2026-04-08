import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ZodError } from 'zod';
import authRouter from './modules/auth/auth.router';
import itemsRouter from './modules/items/items.router';
import storesRouter from './modules/stores/stores.router';
import scanRouter from './modules/scan/scan.router';
import checkinRouter from './modules/checkin/checkin.router';
import pointsRouter from './modules/points/points.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import campaignsRouter from './modules/campaigns/campaigns.router';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/stores', storesRouter);
app.use('/api/scan', scanRouter);
app.use('/api/checkin', checkinRouter);
app.use('/api/points', pointsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/campaigns', campaignsRouter);

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
