import { getTodayEvents, getWeekEvents } from "./calendar";
import { exchangeCodeForTokens } from "./oauth";
import { getUserFromKV, saveUserToKV } from "./users";
import { Env } from "./types";
import {
  DEFAULT_TIMEZONE,
  buildGoogleOAuthUrl,
  errorResponse,
  getUserId,
  jsonResponse,
  redirectResponse,
} from "./utils";

type RouteHandler = (request: Request, env: Env) => Promise<Response>;

const ROUTES: Record<string, RouteHandler> = {
  "/": handleRoot,
  "/auth/google": handleAuthGoogle,
  "/auth/callback": handleAuthCallback,
  "/calendar/today": (request, env) =>
    handleCalendarRange("today", request, env),
  "/calendar/week": (request, env) => handleCalendarRange("week", request, env),
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method !== "GET") {
        return errorResponse(
          "Method not allowed. Only GET is supported.",
          405,
          {
            allow: "GET",
          },
        );
      }

      const path = normalizePathname(new URL(request.url).pathname);
      const handler = ROUTES[path];

      if (!handler) {
        return errorResponse("Not found", 404, { path });
      }

      return await handler(request, env);
    } catch (error) {
      return errorResponse(
        "Unexpected error while processing the request.",
        500,
        {
          message: (error as Error).message,
        },
      );
    }
  },
};

async function handleRoot(): Promise<Response> {
  return jsonResponse({
    service: "OpenClaw ↔ Google Calendar bridge",
    endpoints: [
      "GET /auth/google",
      "GET /auth/callback",
      "GET /calendar/today",
      "GET /calendar/week",
    ],
    authentication: "Provide x-user-id header for calendar endpoints.",
  });
}

async function handleAuthGoogle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id");

  if (!userId) {
    return errorResponse("Missing user_id query parameter.", 400);
  }

  const state = userId;

  const oauthUrl = buildGoogleOAuthUrl(env, state, userId);
  return redirectResponse(oauthUrl, 302);
}

async function handleAuthCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? undefined;
  const userId =
    url.searchParams.get("user_id") ?? getUserId(request) ?? state ?? undefined;

  if (!code) {
    return errorResponse("Missing `code` query parameter.", 400);
  }

  if (!userId) {
    return errorResponse(
      "Missing user identifier. Provide ?user_id=... in the callback URL.",
      400,
    );
  }

  const tokens = await exchangeCodeForTokens(env, code);
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    return errorResponse(
      "Google did not return a refresh_token. Ensure `access_type=offline` and `prompt=consent` were used.",
      400,
    );
  }

  await saveUserToKV(env, userId, {
    refresh_token: refreshToken,
    provider: "google",
    timezone: DEFAULT_TIMEZONE,
    created_at: new Date().toISOString(),
  });

  return jsonResponse({
    message: "Google account linked successfully.",
    user_id: userId,
    provider: "google",
  });
}

async function handleCalendarRange(
  range: "today" | "week",
  request: Request,
  env: Env,
): Promise<Response> {
  const userId = getUserId(request);

  if (!userId) {
    return errorResponse("Missing x-user-id header.", 401);
  }

  const user = await getUserFromKV(env, userId);

  if (!user) {
    return errorResponse("User not found in KV.", 404, { user_id: userId });
  }

  const result =
    range === "today"
      ? await getTodayEvents(env, user.refresh_token, user.timezone)
      : await getWeekEvents(env, user.refresh_token, user.timezone);

  return jsonResponse({
    timeframe: result.timeframe,
    window: result.window,
    user_id: userId,
    timezone: user.timezone,
    events: result.events,
  });
}

function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return "/";
  }

  const trimmed = pathname.endsWith("/")
    ? pathname.slice(0, pathname.length - 1)
    : pathname;

  return trimmed || "/";
}
