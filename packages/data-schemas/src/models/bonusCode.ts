import bonusCodeSchema from '~/schema/bonusCode';
import type { IBonusCode } from '~/types/bonusCode';

export function createBonusCodeModel(mongoose: typeof import('mongoose')) {
  return mongoose.models.BonusCode || mongoose.model<IBonusCode>('BonusCode', bonusCodeSchema);
}
