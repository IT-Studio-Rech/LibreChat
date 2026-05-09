import { Types } from 'mongoose';
import { Lead } from './model.js';
import type { ILead } from './model.js';
import type { CreateLeadBody, UpdateLeadBody, ListLeadsQuery } from './schema.js';
import { NotFoundError, ForbiddenError } from '../shared/errors.js';

export interface LeadListResult {
  leads: ILead[];
  nextCursor: string | null;
}

export async function listLeads(userId: string, query: ListLeadsQuery): Promise<LeadListResult> {
  const filter: Record<string, unknown> = { user_id: userId };

  if (query.filter === 'due') {
    filter['next_action_date'] = { $lte: new Date() };
  }

  if (query.status) {
    filter['status'] = query.status;
  }

  if (query.cursor) {
    filter['_id'] = { $gt: new Types.ObjectId(query.cursor) };
  }

  const leads = await Lead.find(filter)
    .sort({ _id: 1 })
    .limit(query.limit + 1)
    .lean();

  const hasMore = leads.length > query.limit;
  const page = hasMore ? leads.slice(0, query.limit) : leads;
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return { leads: page as ILead[], nextCursor };
}

export async function createLead(data: CreateLeadBody): Promise<ILead> {
  const lead = await Lead.create(data);
  return lead.toObject() as ILead;
}

export async function getLead(leadId: string, userId: string): Promise<ILead> {
  const lead = await Lead.findById(leadId).lean();
  if (!lead) throw new NotFoundError(`Lead ${leadId} not found`);
  if (lead.user_id !== userId) throw new ForbiddenError();
  return lead as ILead;
}

export async function updateLead(leadId: string, userId: string, partial: UpdateLeadBody): Promise<ILead> {
  const lead = await Lead.findById(leadId).lean();
  if (!lead) throw new NotFoundError(`Lead ${leadId} not found`);
  if (lead.user_id !== userId) throw new ForbiddenError();

  const updated = await Lead.findByIdAndUpdate(
    leadId,
    { ...partial, updated_at: new Date() },
    { new: true, lean: true },
  );
  return updated as ILead;
}

export async function deleteLead(leadId: string, userId: string): Promise<void> {
  const lead = await Lead.findById(leadId).lean();
  if (!lead) throw new NotFoundError(`Lead ${leadId} not found`);
  if (lead.user_id !== userId) throw new ForbiddenError();
  await Lead.findByIdAndDelete(leadId);
}
