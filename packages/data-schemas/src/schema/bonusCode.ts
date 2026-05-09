import { Schema } from 'mongoose';
import type { IBonusCode } from '~/types/bonusCode';

const bonusCodeSchema = new Schema<IBonusCode>({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  usedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  usedAt: {
    type: Date,
  },
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default bonusCodeSchema;
