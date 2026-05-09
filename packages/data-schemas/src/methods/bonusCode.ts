import type { Types } from 'mongoose';
import type { IBonusCode } from '~/types/bonusCode';
import logger from '~/config/winston';

export interface BonusCodeInsert {
  code: string;
  description: string;
}

export interface ChargeAggregate {
  description: string;
  total: number;
  used: number;
  createdAt: Date;
}

export interface BonusCodeWithUser extends IBonusCode {
  usedBy?: { _id: Types.ObjectId; username?: string; name?: string; email: string } | null;
}

export function createBonusCodeMethods(mongoose: typeof import('mongoose')) {
  async function consumeBonusCode(
    code: string,
    userId: Types.ObjectId,
  ): Promise<IBonusCode | null> {
    try {
      const BonusCode = mongoose.models.BonusCode;
      return await BonusCode.findOneAndUpdate(
        { code, used: false },
        { $set: { used: true, usedBy: userId, usedAt: new Date() } },
        { new: true },
      ).lean<IBonusCode>();
    } catch (error) {
      logger.error('[consumeBonusCode] Error consuming bonus code:', error);
      return null;
    }
  }

  async function setUserBonusActivated(userId: Types.ObjectId): Promise<void> {
    try {
      const User = mongoose.models.User;
      await User.updateOne({ _id: userId }, { $set: { bonus_activated: true } });
    } catch (error) {
      logger.error('[setUserBonusActivated] Error setting bonus_activated:', error);
    }
  }

  async function insertBonusCodes(codes: BonusCodeInsert[]): Promise<IBonusCode[]> {
    const BonusCode = mongoose.models.BonusCode;
    const docs = await BonusCode.insertMany(codes, { ordered: false });
    return docs as unknown as IBonusCode[];
  }

  async function findChargesAggregated(): Promise<ChargeAggregate[]> {
    try {
      const BonusCode = mongoose.models.BonusCode;
      type AggRow = { _id: string; total: number; used: number; createdAt: Date };
      const results = await BonusCode.aggregate<AggRow>([
        {
          $group: {
            _id: '$description',
            total: { $sum: 1 },
            used: { $sum: { $cond: ['$used', 1, 0] } },
            createdAt: { $min: '$createdAt' },
          },
        },
        { $sort: { createdAt: -1 } },
      ]);
      return results.map((r: AggRow) => ({
        description: r._id,
        total: r.total,
        used: r.used,
        createdAt: r.createdAt,
      }));
    } catch (error) {
      logger.error('[findChargesAggregated] Error aggregating charges:', error);
      return [];
    }
  }

  async function findChargeDetails(description: string): Promise<BonusCodeWithUser[]> {
    try {
      const BonusCode = mongoose.models.BonusCode;
      return await BonusCode.find({ description })
        .populate('usedBy', 'username name email')
        .lean<BonusCodeWithUser[]>();
    } catch (error) {
      logger.error('[findChargeDetails] Error fetching charge details:', error);
      return [];
    }
  }

  return {
    consumeBonusCode,
    setUserBonusActivated,
    insertBonusCodes,
    findChargesAggregated,
    findChargeDetails,
  };
}

export type BonusCodeMethods = ReturnType<typeof createBonusCodeMethods>;
