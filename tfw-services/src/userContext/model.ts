import { Schema, model } from 'mongoose';

export interface IUserContext {
  user_id: string;
  icp_json?: Record<string, unknown>;
  coaching_step?: string;
  onboarding?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

const userContextSchema = new Schema<IUserContext>(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    icp_json: { type: Schema.Types.Mixed },
    coaching_step: { type: String },
    onboarding: { type: Schema.Types.Mixed },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const UserContext = model<IUserContext>('UserContext', userContextSchema);
