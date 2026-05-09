import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { logger } from '@librechat/data-schemas';
import type { IBonusCode, BonusCodeInsert, ChargeAggregate, BonusCodeWithUser } from '@librechat/data-schemas';

export type { BonusCodeInsert, ChargeAggregate, BonusCodeWithUser };
export type { IBonusCode as BonusCode };

export interface BonusCodeDeps {
  consumeBonusCode: (code: string, userId: Types.ObjectId) => Promise<IBonusCode | null>;
  setUserBonusActivated: (userId: Types.ObjectId) => Promise<void>;
  insertBonusCodes: (codes: BonusCodeInsert[]) => Promise<IBonusCode[]>;
  findChargesAggregated: () => Promise<ChargeAggregate[]>;
  findChargeDetails: (description: string) => Promise<BonusCodeWithUser[]>;
}

function generateCode(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(8);
  const chars = Array.from(bytes, (b: number) => alphabet[b % alphabet.length]);
  return `tfw-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}`;
}

/** Validates and atomically consumes a bonus code. Silent skip if invalid/used. */
export async function validateAndConsumeBonusCode(
  token: string,
  userId: Types.ObjectId,
  deps: BonusCodeDeps,
): Promise<{ activated: boolean }> {
  if (!token) {
    return { activated: false };
  }
  try {
    const consumed = await deps.consumeBonusCode(token, userId);
    if (!consumed) {
      return { activated: false };
    }
    await deps.setUserBonusActivated(userId);
    return { activated: true };
  } catch (error) {
    logger.error('[validateAndConsumeBonusCode] Error:', error);
    return { activated: false };
  }
}

/** Generates `count` unique bonus codes for a charge. */
export async function generateBonusCodes(
  count: number,
  description: string,
  deps: BonusCodeDeps,
): Promise<{ code: string; registration_url: string }[]> {
  const codes = Array.from({ length: count }, () => generateCode());
  const inserts: BonusCodeInsert[] = codes.map((code) => ({ code, description }));
  await deps.insertBonusCodes(inserts);
  const baseUrl = process.env.DOMAIN_CLIENT ?? 'http://localhost:3080';
  return codes.map((code) => ({
    code,
    registration_url: `${baseUrl}/register?token=${encodeURIComponent(code)}`,
  }));
}

/** Aggregates all charges for the admin charges overview. */
export async function listCharges(deps: BonusCodeDeps): Promise<ChargeAggregate[]> {
  try {
    return await deps.findChargesAggregated();
  } catch (error) {
    logger.error('[listCharges] Error:', error);
    return [];
  }
}

/** Single-charge detail: every code, used-by user, used-at date. */
export async function getChargeDetails(
  description: string,
  deps: BonusCodeDeps,
): Promise<BonusCodeWithUser[]> {
  try {
    return await deps.findChargeDetails(description);
  } catch (error) {
    logger.error('[getChargeDetails] Error:', error);
    return [];
  }
}
