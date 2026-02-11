import { Env, StoredUser } from "./types";
import { logInfo, logError, LogContext } from "./utils";

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
export async function getUserFromKV(
  env: Env,
  userId: string,
): Promise<StoredUser | null> {
  const context: LogContext = {
    action: "get_user_from_kv",
    userId,
  };

  logInfo("Starting user retrieval from KV", context);

  const key = buildUserKey(userId);

  logInfo("KV key generated", {
    ...context,
    kvKey: key,
  });

  try {
    const raw = await env.USERS_KV.get(key);

    if (!raw) {
      logInfo("User not found in KV", {
        ...context,
        kvKey: key,
        found: false,
      });
      return null;
    }

    logInfo("User data found in KV, parsing", {
      ...context,
      kvKey: key,
      dataLength: raw.length,
      found: true,
    });

    const data = JSON.parse(raw) as StoredUser;
    validateStoredUser(data);

    logInfo("User retrieved and validated successfully", {
      ...context,
      provider: data.provider,
      timezone: data.timezone,
      hasRefreshToken: !!data.refresh_token,
      createdAt: data.created_at,
    });

    return data;
  } catch (error) {
    logError("Failed to retrieve or parse user data from KV", error as Error, {
      ...context,
      kvKey: key,
    });
    throw new Error(
      `Failed to parse user data for ${userId}: ${(error as Error).message ?? "Unknown error"}`,
    );
  }
}

/**
 * Persists user credentials in KV.
 */
export async function saveUserToKV(
  env: Env,
  userId: string,
  payload: StoredUser,
): Promise<void> {
  const context: LogContext = {
    action: "save_user_to_kv",
    userId,
  };

  logInfo("Starting user save to KV", {
    ...context,
    provider: payload.provider,
    timezone: payload.timezone,
    hasRefreshToken: !!payload.refresh_token,
  });

  const key = buildUserKey(userId);

  try {
    validateStoredUser(payload);

    const record: StoredUser = {
      refresh_token: payload.refresh_token,
      provider: payload.provider,
      timezone: payload.timezone,
      created_at: payload.created_at ?? new Date().toISOString(),
    };

    logInfo("User data validated, saving to KV", {
      ...context,
      kvKey: key,
      recordSize: JSON.stringify(record).length,
      createdAt: record.created_at,
    });

    await env.USERS_KV.put(key, JSON.stringify(record));

    logInfo("User saved to KV successfully", {
      ...context,
      kvKey: key,
    });
  } catch (error) {
    logError("Failed to save user to KV", error as Error, {
      ...context,
      kvKey: key,
    });
    throw error;
  }
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
