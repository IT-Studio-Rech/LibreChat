import { LRUCache } from 'lru-cache';
import { logger } from '@librechat/data-schemas';

const BASE_URL = process.env.TFW_SERVICES_BASE_URL ?? 'http://localhost:3001';
const SHARED_SECRET = process.env.TFW_SERVICES_SHARED_SECRET;

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 1000;

const icpCache = new LRUCache<string, string>({ max: CACHE_MAX, ttl: CACHE_TTL_MS });

interface ICPResponse {
  user_id: string;
  icp_json: Record<string, string> | string | null;
  coaching_step?: string;
  updated_at?: string;
}

function formatICP(icpJson: Record<string, string> | string | null | undefined): string | null {
  if (icpJson == null || icpJson === '') {
    return null;
  }
  if (typeof icpJson === 'string') {
    return icpJson;
  }
  const keys = Object.keys(icpJson);
  if (keys.length === 0) {
    return null;
  }
  return keys.map((key) => `## ${key}\n${icpJson[key]}`).join('\n\n');
}

/** Fetch and cache the ICP context for a user. Returns null on any failure. */
export async function fetchUserICP(userId: string): Promise<string | null> {
  const cached = icpCache.get(userId);
  if (cached !== undefined) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 500);

  try {
    const url = `${BASE_URL}/icp/${encodeURIComponent(userId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SHARED_SECRET ?? ''}`,
        'X-User-Id': userId,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      logger.warn(`[fetchUserICP] No ICP found for user ${userId} (404)`);
      return null;
    }

    if (!response.ok) {
      logger.warn(`[fetchUserICP] Unexpected status ${response.status} for user ${userId}`);
      return null;
    }

    const data = (await response.json()) as ICPResponse;
    const formatted = formatICP(data.icp_json);
    if (formatted != null) {
      icpCache.set(userId, formatted);
    }
    return formatted;
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'));
    logger.warn(
      `[fetchUserICP] ${isTimeout ? 'Timeout' : 'Network error'} fetching ICP for user ${userId}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Invalidate the cached ICP for a user (e.g. after an ICP update). */
export function invalidateUserICP(userId: string): void {
  icpCache.delete(userId);
}
