import { UserContext } from './model.js';
import type { IUserContext } from './model.js';
import type { CreateUserContextBody, UpdateUserContextBody } from './schema.js';
import { NotFoundError } from '../shared/errors.js';

export async function getICP(userId: string): Promise<IUserContext> {
  const doc = await UserContext.findOne({ user_id: userId }).lean();
  if (!doc) throw new NotFoundError(`No ICP found for user ${userId}`);
  return doc;
}

export async function upsertICP(data: CreateUserContextBody): Promise<IUserContext> {
  const now = new Date();
  const doc = await UserContext.findOneAndUpdate(
    { user_id: data.user_id },
    { ...data, updated_at: now, $setOnInsert: { created_at: now } },
    { upsert: true, new: true, lean: true },
  );
  return doc as IUserContext;
}

export async function updateICP(userId: string, partial: UpdateUserContextBody): Promise<IUserContext> {
  const doc = await UserContext.findOneAndUpdate(
    { user_id: userId },
    { ...partial, updated_at: new Date() },
    { new: true, lean: true },
  );
  if (!doc) throw new NotFoundError(`No ICP found for user ${userId}`);
  return doc;
}

export async function deleteICP(userId: string): Promise<void> {
  const result = await UserContext.deleteOne({ user_id: userId });
  if (result.deletedCount === 0) throw new NotFoundError(`No ICP found for user ${userId}`);
}
