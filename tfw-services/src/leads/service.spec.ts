import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createLead, listLeads, getLead, updateLead, deleteLead } from './service.js';
import { NotFoundError, ForbiddenError } from '../shared/errors.js';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('leads service', () => {
  const userId = 'user-test-001';
  const otherUserId = 'user-test-002';

  async function seedLead(overrides: Partial<Parameters<typeof createLead>[0]> = {}) {
    return createLead({
      user_id: userId,
      lead_name: 'Jane Doe',
      platform: 'linkedin',
      status: 'cold',
      ...overrides,
    });
  }

  it('creates a lead and retrieves it', async () => {
    const lead = await seedLead({ lead_name: 'Anna Müller', status: 'warm' });

    expect(lead.lead_name).toBe('Anna Müller');
    expect(lead.status).toBe('warm');
    expect(lead.user_id).toBe(userId);
    expect(lead._id).toBeDefined();
  });

  it('listLeads returns only leads for the given user', async () => {
    await seedLead({ lead_name: 'Lead A' });
    await createLead({ user_id: otherUserId, lead_name: 'Other Lead' });

    const result = await listLeads(userId, { limit: 50 });
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].lead_name).toBe('Lead A');
    expect(result.nextCursor).toBeNull();
  });

  it('listLeads filter=due returns only overdue leads', async () => {
    const pastDate = new Date(Date.now() - 86400 * 1000);
    const futureDate = new Date(Date.now() + 86400 * 1000);

    await seedLead({ lead_name: 'Overdue', next_action_date: pastDate });
    await seedLead({ lead_name: 'Future', next_action_date: futureDate });
    await seedLead({ lead_name: 'No Date' });

    const result = await listLeads(userId, { filter: 'due', limit: 50 });
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].lead_name).toBe('Overdue');
  });

  it('listLeads filter by status', async () => {
    await seedLead({ lead_name: 'Warm Lead', status: 'warm' });
    await seedLead({ lead_name: 'Cold Lead', status: 'cold' });

    const result = await listLeads(userId, { status: 'warm', limit: 50 });
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].lead_name).toBe('Warm Lead');
  });

  it('listLeads cursor pagination', async () => {
    await seedLead({ lead_name: 'Lead 1' });
    await seedLead({ lead_name: 'Lead 2' });
    await seedLead({ lead_name: 'Lead 3' });

    const page1 = await listLeads(userId, { limit: 2 });
    expect(page1.leads).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await listLeads(userId, { limit: 2, cursor: page1.nextCursor! });
    expect(page2.leads).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();
  });

  it('getLead returns the correct lead', async () => {
    const created = await seedLead();
    const fetched = await getLead(String(created._id), userId);
    expect(fetched.lead_name).toBe(created.lead_name);
  });

  it('getLead throws ForbiddenError for wrong user', async () => {
    const created = await seedLead();
    await expect(getLead(String(created._id), otherUserId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('getLead throws NotFoundError for unknown ID', async () => {
    await expect(getLead(new mongoose.Types.ObjectId().toString(), userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updateLead modifies fields', async () => {
    const created = await seedLead({ status: 'cold' });
    const updated = await updateLead(String(created._id), userId, { status: 'hot', notes: 'Sehr interessiert' });

    expect(updated.status).toBe('hot');
    expect(updated.notes).toBe('Sehr interessiert');
  });

  it('updateLead throws ForbiddenError for wrong user', async () => {
    const created = await seedLead();
    await expect(updateLead(String(created._id), otherUserId, { status: 'hot' })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('deleteLead removes the document', async () => {
    const created = await seedLead();
    await deleteLead(String(created._id), userId);
    await expect(getLead(String(created._id), userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deleteLead throws ForbiddenError for wrong user', async () => {
    const created = await seedLead();
    await expect(deleteLead(String(created._id), otherUserId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('deleteLead throws NotFoundError for unknown ID', async () => {
    await expect(deleteLead(new mongoose.Types.ObjectId().toString(), userId)).rejects.toBeInstanceOf(NotFoundError);
  });
});
