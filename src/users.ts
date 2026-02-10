import { Env, StoredUser } from "./types";

const USER_KEY_PREFIX = "user:";

/**
 * Normalizes user identifiers and produces the KV key.
 */
export function buildUserKey(userId: string): string {
  const normalized = userId?.trim();
  if (!normalized) {
    throw new Error("User ID is required");
  }
  return `${USER_KEY_PREFIX}${normalized}`;
}

/**
 * Retrieves a stored user from KV, handling JSON parsing errors explicitly.
 */
export async function getUserFromKV(env: Env, userId: string): Promise<StoredUser | null> {
  const key = buildUserKey(userId);
  const raw = await env.USERS_KV.get(key);
  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw) as StoredUser;
    validateStoredUser(data);
    return data;
  } catch (error) {
    throw new Error(
      `Failed to parse user data for ${userId}: ${(error as Error).message ?? "Unknown error"}`
    );
  }
}

/**
 * Persists user credentials in KV.
 */
export async function saveUserToKV(env: Env, userId: string, payload: StoredUser): Promise<void> {
  const key = buildUserKey(userId);
  validateStoredUser(payload);
  const record: StoredUser = {
    refresh_token: payload.refresh_token,
    provider: payload.provider,
    timezone: payload.timezone,
    created_at: payload.created_at ?? new Date().toISOString(),
  };
  await env.USERS_KV.put(key, JSON.stringify(record));
}

/**
 * Ensures required fields exist before storing or returning user data.
 */
function validateStoredUser(data: StoredUser): void {
  if (!data.refresh_token) {
    throw new Error("Missing refresh_token in user record");
  }
  if (data.provider !== "google") {
    throw new Error("Unsupported provider");
  }
  if (!data.timezone) {
    throw new Error("Missing timezone in user record");
  }
  if (!data.created_at) {
    throw new Error("Missing created_at in user record");
  }
}
