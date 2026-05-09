import 'dotenv/config';
import express from 'express';
import { connectDB } from './shared/db.js';
import { authMiddleware } from './shared/auth.js';
import { errorHandler } from './shared/errors.js';
import { logger } from './shared/logger.js';
import { userContextRoutes } from './userContext/routes.js';
import { leadsRoutes } from './leads/routes.js';

await connectDB();

const app = express();

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(authMiddleware);
app.use('/icp', userContextRoutes);
app.use('/leads', leadsRoutes);
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => logger.info(`tfw-services listening on :${port}`));
