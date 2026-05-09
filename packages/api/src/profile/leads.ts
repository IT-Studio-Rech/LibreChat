import { logger } from '@librechat/data-schemas';

const BASE_URL = process.env.TFW_SERVICES_BASE_URL ?? 'http://localhost:3001';
const SHARED_SECRET = process.env.TFW_SERVICES_SHARED_SECRET ?? '';
const TIMEOUT_MS = 1500;

export type LeadStatus = 'cold' | 'warm' | 'hot' | 'closed';
export type LeadPlatform = 'linkedin' | 'instagram' | 'other';

export interface Lead {
  id: string;
  user_id: string;
  lead_name: string;
  platform: LeadPlatform;
  status: LeadStatus;
  notes?: string;
  next_action?: string;
  next_action_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeadListResponse {
  leads: Lead[];
  nextCursor?: string;
}

export interface LeadListOptions {
  filter?: string;
  status?: LeadStatus;
  cursor?: string;
  limit?: number;
}

export interface LeadCreatePayload {
  lead_name: string;
  platform?: LeadPlatform;
  status?: LeadStatus;
  notes?: string;
  next_action?: string;
  next_action_date?: string;
}

export type LeadUpdatePayload = Partial<LeadCreatePayload>;

function buildHeaders(userId: string): HeadersInit {
  return {
    Authorization: `Bearer ${SHARED_SECRET}`,
    'X-User-Id': userId,
    'Content-Type': 'application/json',
  };
}

async function doFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function listLeads(
  userId: string,
  opts: LeadListOptions = {},
): Promise<LeadListResponse> {
  const params = new URLSearchParams();
  params.set('user_id', userId);
  if (opts.status) params.set('status', opts.status);
  if (opts.filter) params.set('filter', opts.filter);
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit != null) params.set('limit', String(opts.limit));

  const url = `${BASE_URL}/leads?${params.toString()}`;
  const response = await doFetch(url, { method: 'GET', headers: buildHeaders(userId) });

  if (!response.ok) {
    throw new Error(`[listLeads] Failed for user ${userId}: ${response.status}`);
  }

  return (await response.json()) as LeadListResponse;
}

export async function createLead(userId: string, payload: LeadCreatePayload): Promise<Lead> {
  const url = `${BASE_URL}/leads`;
  const response = await doFetch(url, {
    method: 'POST',
    headers: buildHeaders(userId),
    body: JSON.stringify({ ...payload, user_id: userId }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`[createLead] Failed for user ${userId}: ${response.status} ${text}`);
  }

  return (await response.json()) as Lead;
}

export async function getLead(userId: string, leadId: string): Promise<Lead | null> {
  const url = `${BASE_URL}/leads/${encodeURIComponent(leadId)}`;
  const response = await doFetch(url, { method: 'GET', headers: buildHeaders(userId) });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`[getLead] Failed for user ${userId}, lead ${leadId}: ${response.status}`);
  }

  return (await response.json()) as Lead;
}

export async function updateLead(
  userId: string,
  leadId: string,
  partial: LeadUpdatePayload,
): Promise<Lead> {
  const url = `${BASE_URL}/leads/${encodeURIComponent(leadId)}`;
  const response = await doFetch(url, {
    method: 'PATCH',
    headers: buildHeaders(userId),
    body: JSON.stringify(partial),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `[updateLead] Failed for user ${userId}, lead ${leadId}: ${response.status} ${text}`,
    );
  }

  return (await response.json()) as Lead;
}

export async function deleteLead(userId: string, leadId: string): Promise<void> {
  const url = `${BASE_URL}/leads/${encodeURIComponent(leadId)}`;
  const response = await doFetch(url, { method: 'DELETE', headers: buildHeaders(userId) });

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `[deleteLead] Failed for user ${userId}, lead ${leadId}: ${response.status}`,
    );
  }

  logger.info(`[deleteLead] Lead ${leadId} deleted for user ${userId} (DSGVO §17)`);
}
