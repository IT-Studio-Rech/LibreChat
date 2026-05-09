import type { Types } from 'mongoose';

export interface IBonusCode {
  _id: Types.ObjectId;
  code: string;
  used: boolean;
  usedBy?: Types.ObjectId;
  usedAt?: Date;
  description: string;
  createdAt: Date;
}
