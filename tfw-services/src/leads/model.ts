import { Schema, model, Types } from 'mongoose';

export interface IChatSnippet {
  snippet: string;
  date: Date;
}

export interface ILead {
  _id: Types.ObjectId;
  user_id: string;
  lead_name: string;
  platform: 'linkedin' | 'instagram' | 'other';
  status: 'cold' | 'warm' | 'hot' | 'closed';
  notes?: string;
  next_action?: string;
  next_action_date?: Date;
  chat_snippets: IChatSnippet[];
  created_at: Date;
  updated_at: Date;
}

const chatSnippetSchema = new Schema<IChatSnippet>(
  {
    snippet: { type: String },
    date: { type: Date },
  },
  { _id: false },
);

const leadSchema = new Schema<ILead>(
  {
    user_id: { type: String, required: true, index: true },
    lead_name: { type: String, required: true },
    platform: {
      type: String,
      enum: ['linkedin', 'instagram', 'other'],
      default: 'linkedin',
    },
    status: {
      type: String,
      enum: ['cold', 'warm', 'hot', 'closed'],
      default: 'cold',
    },
    notes: { type: String },
    next_action: { type: String },
    next_action_date: { type: Date, index: true },
    chat_snippets: { type: [chatSnippetSchema], default: [] },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

leadSchema.index({ user_id: 1, next_action_date: 1 });

export const Lead = model<ILead>('Lead', leadSchema);
