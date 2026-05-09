import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getICP, upsertICP, updateICP, deleteICP } from './service.js';
import { createUserContextSchema, updateUserContextSchema } from './schema.js';
import { ValidationError, ForbiddenError } from '../shared/errors.js';

export const userContextRoutes = Router();

userContextRoutes.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  if (req.userId !== req.params.userId) return next(new ForbiddenError());
  try {
    const doc = await getICP(req.params.userId);
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

userContextRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = createUserContextSchema.safeParse(req.body);
  if (!parsed.success) return next(new ValidationError(parsed.error.message));

  if (parsed.data.user_id !== req.userId) return next(new ForbiddenError());

  try {
    const doc = await upsertICP(parsed.data);
    res.status(200).json(doc);
  } catch (err) {
    next(err);
  }
});

userContextRoutes.put('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  if (req.userId !== req.params.userId) return next(new ForbiddenError());

  const parsed = updateUserContextSchema.safeParse(req.body);
  if (!parsed.success) return next(new ValidationError(parsed.error.message));

  try {
    const doc = await updateICP(req.params.userId, parsed.data);
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

userContextRoutes.delete('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  if (req.userId !== req.params.userId) return next(new ForbiddenError());
  try {
    await deleteICP(req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
