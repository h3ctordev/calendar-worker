import { Env, GoogleAuthTokens } from "./types";
import {
  parseJsonResponse,
  logInfo,
  logError,
  logHttpRequest,
  LogContext,
} from "./utils";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

interface GoogleOAuthError {
  error: string;
  error_description?: string;
}

/**
 * Exchanges an authorization code for Google OAuth tokens.
 */
export async function exchangeCodeForTokens(
  env: Env,
  code: string,
): Promise<GoogleAuthTokens> {
  const context: LogContext = {
    action: "exchange_code_for_tokens",
    grantType: "authorization_code",
  };

  logInfo("Starting OAuth code exchange", {
    ...context,
    codeLength: code.length,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  });

  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  });

  try {
    const result = await requestToken(body, context);
    logInfo("OAuth code exchange successful", {
      ...context,
      hasAccessToken: !!result.access_token,
      hasRefreshToken: !!result.refresh_token,
      tokenType: result.token_type,
      expiresIn: result.expires_in,
    });
    return result;
  } catch (error) {
    logError("OAuth code exchange failed", error as Error, context);
    throw error;
  }
}

/**
 * Exchanges a refresh token for a short-lived access token.
 * This satisfies the required getAccessToken(refreshToken) helper.
 */
export async function getAccessToken(
  env: Env,
  refreshToken: string,
): Promise<GoogleAuthTokens> {
  const context: LogContext = {
    action: "refresh_access_token",
    grantType: "refresh_token",
  };

  logInfo("Starting access token refresh", {
    ...context,
    refreshTokenLength: refreshToken.length,
  });

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
  });

  try {
    const result = await requestToken(body, context);
    logInfo("Access token refresh successful", {
      ...context,
      hasAccessToken: !!result.access_token,
      hasRefreshToken: !!result.refresh_token,
      tokenType: result.token_type,
      expiresIn: result.expires_in,
    });
    return result;
  } catch (error) {
    logError("Access token refresh failed", error as Error, context);
    throw error;
  }
}

/**
 * Shared low-level token request helper that handles Google errors.
 */
async function requestToken(
  body: URLSearchParams,
  context: LogContext = {},
): Promise<GoogleAuthTokens> {
  const requestOptions: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  };

  // Log the request (body will be redacted automatically by logHttpRequest)
  logHttpRequest(GOOGLE_TOKEN_ENDPOINT, requestOptions, {
    ...context,
    bodyParams: Array.from(body.keys()).map((key) =>
      key.includes("secret") || key.includes("token")
        ? `${key}=[REDACTED]`
        : `${key}=${body.get(key)}`,
    ),
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, requestOptions);

  logInfo("Google OAuth API response received", {
    ...context,
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get("content-type"),
  });

  const payload = await parseJsonResponse<GoogleAuthTokens | GoogleOAuthError>(
    response,
    context,
  );

  if (!response.ok) {
    const errorMessage =
      "error" in payload
        ? `${payload.error}${payload.error_description ? `: ${payload.error_description}` : ""}`
        : "Unknown error response from Google OAuth";

    logError("Google OAuth request failed", new Error(errorMessage), {
      ...context,
      responseStatus: response.status,
      oauthError: "error" in payload ? payload : undefined,
    });

    throw new Error(
      `Failed to obtain Google tokens (${response.status}): ${errorMessage}`,
    );
  }

  if ("error" in payload) {
    const errorMsg = `Google OAuth error: ${payload.error}${
      payload.error_description ? ` - ${payload.error_description}` : ""
    }`;

    logError("Google OAuth returned error in payload", new Error(errorMsg), {
      ...context,
      oauthError: payload,
    });

    throw new Error(errorMsg);
  }

  if (!payload.access_token) {
    logError(
      "Google OAuth response missing access_token",
      new Error("Missing access_token"),
      {
        ...context,
        payloadKeys: Object.keys(payload),
      },
    );
    throw new Error("Google OAuth response did not include access_token");
  }

  logInfo("Google OAuth token request successful", {
    ...context,
    tokenType: payload.token_type,
    scope: payload.scope,
    expiresIn: payload.expires_in,
  });

  return payload;
}
