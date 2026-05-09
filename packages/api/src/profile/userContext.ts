import { logger } from '@librechat/data-schemas';

const BASE_URL = process.env.TFW_SERVICES_BASE_URL ?? 'http://localhost:3001';
const SHARED_SECRET = process.env.TFW_SERVICES_SHARED_SECRET ?? '';
const TIMEOUT_MS = 1500;

export interface ICPRecord {
  user_id: string;
  icp_json: Record<string, string> | string | null;
  coaching_step?: string;
  updated_at?: string;
}

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

export async function getICP(userId: string): Promise<ICPRecord | null> {
  const url = `${BASE_URL}/icp/${encodeURIComponent(userId)}`;
  const response = await doFetch(url, {
    method: 'GET',
    headers: buildHeaders(userId),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`[getICP] Unexpected status ${response.status} for user ${userId}`);
  }

  return (await response.json()) as ICPRecord;
}

export interface ICPUpsertPayload {
  icp_json: Record<string, string> | string;
  coaching_step?: string;
}

export async function upsertICP(userId: string, payload: ICPUpsertPayload): Promise<ICPRecord> {
  const url = `${BASE_URL}/icp`;
  const response = await doFetch(url, {
    method: 'POST',
    headers: buildHeaders(userId),
    body: JSON.stringify({ user_id: userId, ...payload }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`[upsertICP] Failed for user ${userId}: ${response.status} ${text}`);
  }

  return (await response.json()) as ICPRecord;
}

export async function updateICP(
  userId: string,
  partial: Partial<ICPUpsertPayload>,
): Promise<ICPRecord> {
  const url = `${BASE_URL}/icp/${encodeURIComponent(userId)}`;
  const response = await doFetch(url, {
    method: 'PUT',
    headers: buildHeaders(userId),
    body: JSON.stringify(partial),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`[updateICP] Failed for user ${userId}: ${response.status} ${text}`);
  }

  return (await response.json()) as ICPRecord;
}

export async function deleteICP(userId: string): Promise<void> {
  const url = `${BASE_URL}/icp/${encodeURIComponent(userId)}`;
  const response = await doFetch(url, {
    method: 'DELETE',
    headers: buildHeaders(userId),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`[deleteICP] Failed for user ${userId}: ${response.status}`);
  }

  logger.info(`[deleteICP] ICP deleted for user ${userId} (DSGVO §17)`);
}
