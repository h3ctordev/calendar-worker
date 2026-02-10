import { Env, GoogleAuthTokens } from "./types";
import { parseJsonResponse } from "./utils";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

interface GoogleOAuthError {
  error: string;
  error_description?: string;
}

/**
 * Exchanges an authorization code for Google OAuth tokens.
 */
export async function exchangeCodeForTokens(env: Env, code: string): Promise<GoogleAuthTokens> {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  });

  return await requestToken(body);
}

/**
 * Exchanges a refresh token for a short-lived access token.
 * This satisfies the required getAccessToken(refreshToken) helper.
 */
export async function getAccessToken(env: Env, refreshToken: string): Promise<GoogleAuthTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
  });

  return await requestToken(body);
}

/**
 * Shared low-level token request helper that handles Google errors.
 */
async function requestToken(body: URLSearchParams): Promise<GoogleAuthTokens> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await parseJsonResponse<GoogleAuthTokens | GoogleOAuthError>(response);

  if (!response.ok) {
    const errorMessage =
      "error" in payload
        ? `${payload.error}${payload.error_description ? `: ${payload.error_description}` : ""}`
        : "Unknown error response from Google OAuth";
    throw new Error(`Failed to obtain Google tokens (${response.status}): ${errorMessage}`);
  }

  if ("error" in payload) {
    throw new Error(
      `Google OAuth error: ${payload.error}${
        payload.error_description ? ` - ${payload.error_description}` : ""
      }`
    );
  }

  if (!payload.access_token) {
    throw new Error("Google OAuth response did not include access_token");
  }

  return payload;
}
