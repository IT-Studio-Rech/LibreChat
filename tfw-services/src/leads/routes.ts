import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { listLeads, createLead, getLead, updateLead, deleteLead } from './service.js';
import { createLeadSchema, updateLeadSchema, listLeadsQuerySchema } from './schema.js';
import { ValidationError, ForbiddenError } from '../shared/errors.js';

export const leadsRoutes = Router();

// Specific routes must be registered before the /:userId wildcard to avoid shadowing.

leadsRoutes.get('/single/:leadId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await getLead(req.params.leadId, req.userId);
    res.json(lead);
  } catch (err) {
    next(err);
  }
});

leadsRoutes.patch('/single/:leadId', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = updateLeadSchema.safeParse(req.body);
  if (!parsed.success) return next(new ValidationError(parsed.error.message));

  try {
    const lead = await updateLead(req.params.leadId, req.userId, parsed.data);
    res.json(lead);
  } catch (err) {
    next(err);
  }
});

leadsRoutes.delete('/single/:leadId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteLead(req.params.leadId, req.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

leadsRoutes.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  if (req.userId !== req.params.userId) return next(new ForbiddenError());

  const parsed = listLeadsQuerySchema.safeParse(req.query);
  if (!parsed.success) return next(new ValidationError(parsed.error.message));

  try {
    const result = await listLeads(req.params.userId, parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

leadsRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) return next(new ValidationError(parsed.error.message));

  if (parsed.data.user_id !== req.userId) return next(new ForbiddenError());

  try {
    const lead = await createLead(parsed.data);
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
});
