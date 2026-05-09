import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { getICP, upsertICP, updateICP, deleteICP } from './service.js';
import { NotFoundError } from '../shared/errors.js';

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

describe('userContext service', () => {
  const userId = 'user-test-001';

  it('upsertICP creates a new document', async () => {
    const doc = await upsertICP({
      user_id: userId,
      icp_json: { niche: 'coaching', audience: 'women 30-45' },
      coaching_step: 'step-1',
    });

    expect(doc.user_id).toBe(userId);
    expect(doc.icp_json).toMatchObject({ niche: 'coaching' });
    expect(doc.coaching_step).toBe('step-1');
    expect(doc.updated_at).toBeDefined();
  });

  it('getICP retrieves an existing document', async () => {
    await upsertICP({ user_id: userId, coaching_step: 'step-2' });

    const doc = await getICP(userId);
    expect(doc.user_id).toBe(userId);
    expect(doc.coaching_step).toBe('step-2');
  });

  it('getICP throws NotFoundError for unknown user', async () => {
    await expect(getICP('nonexistent-user')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('upsertICP updates an existing document', async () => {
    await upsertICP({ user_id: userId, coaching_step: 'step-1' });
    const updated = await upsertICP({ user_id: userId, coaching_step: 'step-2' });

    expect(updated.coaching_step).toBe('step-2');
  });

  it('updateICP partially updates fields', async () => {
    await upsertICP({ user_id: userId, coaching_step: 'step-1', icp_json: { niche: 'coaching' } });

    const updated = await updateICP(userId, { coaching_step: 'step-3' });
    expect(updated.coaching_step).toBe('step-3');
    expect(updated.icp_json).toMatchObject({ niche: 'coaching' });
  });

  it('updateICP throws NotFoundError for unknown user', async () => {
    await expect(updateICP('nonexistent', { coaching_step: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deleteICP removes the document', async () => {
    await upsertICP({ user_id: userId });
    await deleteICP(userId);

    await expect(getICP(userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deleteICP throws NotFoundError for unknown user', async () => {
    await expect(deleteICP('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
  });
});
