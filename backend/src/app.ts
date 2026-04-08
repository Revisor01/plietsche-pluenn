import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ZodError } from 'zod';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Platzhalter für Auth-Router — Plan 03 fügt ihn hier ein:
// import authRouter from './modules/auth/auth.router';
// app.use('/api/auth', authRouter);

// Globaler Error Handler (Express 5)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', issues: err.issues });
    return;
  }
  if (err instanceof Error) {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
  res.status(500).json({ error: 'Unknown error' });
});

export default app;
