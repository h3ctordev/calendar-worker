import {
  getTodayEvents,
  getWeekEvents,
  googleCalendarListRequest,
} from "./calendar";
import { exchangeCodeForTokens, getAccessToken } from "./oauth";
import { getUserFromKV, saveUserToKV } from "./users";
import { Env } from "./types";
import {
  DEFAULT_TIMEZONE,
  buildGoogleOAuthUrl,
  errorResponse,
  getUserId,
  jsonResponse,
  redirectResponse,
  logInfo,
  logError,
  LogContext,
} from "./utils";

type RouteHandler = (request: Request, env: Env) => Promise<Response>;

const ROUTES: Record<string, RouteHandler> = {
  "/": handleRoot,
  "/auth/google": handleAuthGoogle,
  "/auth/callback": handleAuthCallback,
  "/calendar/list": handleCalendarList,
  "/calendar/today": (request, env) =>
    handleCalendarRange("today", request, env),
  "/calendar/week": (request, env) => handleCalendarRange("week", request, env),
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    const path = normalizePathname(url.pathname);
    const userId = getUserId(request);

    const context: LogContext = {
      requestId,
      userId,
      method: request.method,
      path,
      userAgent: request.headers.get("user-agent") || undefined,
    };

    logInfo("Incoming request", context);

    try {
      if (request.method !== "GET") {
        logError(
          "Method not allowed",
          new Error(`Unsupported method: ${request.method}`),
          context,
        );
        return errorResponse(
          "Method not allowed. Only GET is supported.",
          405,
          {
            allow: "GET",
          },
        );
      }

      const handler = ROUTES[path];

      if (!handler) {
        logError(
          "Route not found",
          new Error(`No handler for path: ${path}`),
          context,
        );
        return errorResponse("Not found", 404, { path });
      }

      logInfo("Route handler found, processing request", {
        ...context,
        handlerFound: true,
      });

      const response = await handler(request, env);

      logInfo("Request completed successfully", {
        ...context,
        responseStatus: response.status,
        responseStatusText: response.statusText,
      });

      return response;
    } catch (error) {
      logError("Unexpected error processing request", error as Error, context);
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
  logInfo("Serving root endpoint");

  return jsonResponse({
    service: "OpenClaw ↔ Google Calendar bridge",
    endpoints: [
      "GET /auth/google",
      "GET /auth/callback",
      "GET /calendar/list",
      "GET /calendar/today",
      "GET /calendar/week",
    ],
    authentication: "Provide x-user-id header for calendar endpoints.",
    features: [
      "Multi-calendar support - fetches events from all accessible calendars",
      "Verbose logging for debugging",
      "OAuth 2.0 with offline access",
    ],
  });
}

async function handleAuthGoogle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id");

  const context: LogContext = {
    action: "google_auth_initiate",
    userId: userId || undefined,
    requestUrl: url.toString(),
  };

  logInfo("Starting Google OAuth flow", context);

  if (!userId) {
    logError(
      "Missing user_id parameter",
      new Error("user_id query parameter required"),
      context,
    );
    return errorResponse("Missing user_id query parameter.", 400);
  }

  const state = userId;

  try {
    const oauthUrl = buildGoogleOAuthUrl(env, state, userId);

    logInfo("Google OAuth URL generated, redirecting user", {
      ...context,
      redirectUrl: oauthUrl,
      state,
    });

    return redirectResponse(oauthUrl, 302);
  } catch (error) {
    logError("Failed to generate OAuth URL", error as Error, context);
    throw error;
  }
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

  const context: LogContext = {
    action: "google_auth_callback",
    userId: userId || undefined,
    hasCode: !!code,
    state: state || undefined,
  };

  logInfo("Processing Google OAuth callback", context);

  if (!code) {
    logError(
      "Missing authorization code",
      new Error("OAuth callback missing code parameter"),
      context,
    );
    return errorResponse("Missing `code` query parameter.", 400);
  }

  if (!userId) {
    logError(
      "Missing user identifier",
      new Error("No user_id found in callback"),
      context,
    );
    return errorResponse(
      "Missing user identifier. Provide ?user_id=... in the callback URL.",
      400,
    );
  }

  try {
    logInfo("Exchanging authorization code for tokens", {
      ...context,
      codeLength: code.length,
    });

    const tokens = await exchangeCodeForTokens(env, code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      logError(
        "Missing refresh token",
        new Error("Google OAuth response missing refresh_token"),
        {
          ...context,
          tokenResponse: {
            hasAccessToken: !!tokens.access_token,
            tokenType: tokens.token_type,
            scope: tokens.scope,
          },
        },
      );
      return errorResponse(
        "Google did not return a refresh_token. Ensure `access_type=offline` and `prompt=consent` were used.",
        400,
      );
    }

    logInfo("Saving user data to KV", {
      ...context,
      hasRefreshToken: !!refreshToken,
    });

    await saveUserToKV(env, userId, {
      refresh_token: refreshToken,
      provider: "google",
      timezone: DEFAULT_TIMEZONE,
      created_at: new Date().toISOString(),
    });

    logInfo("Google OAuth flow completed successfully", {
      ...context,
      timezone: DEFAULT_TIMEZONE,
    });

    return jsonResponse({
      message: "Google account linked successfully.",
      user_id: userId,
      provider: "google",
    });
  } catch (error) {
    logError("OAuth callback processing failed", error as Error, context);
    throw error;
  }
}

async function handleCalendarList(
  request: Request,
  env: Env,
): Promise<Response> {
  const userId = getUserId(request);

  const context: LogContext = {
    action: "get_calendar_list",
    userId: userId || undefined,
  };

  logInfo("Processing calendar list request", context);

  if (!userId) {
    logError(
      "Missing user ID header",
      new Error("x-user-id header required"),
      context,
    );
    return errorResponse("Missing x-user-id header.", 401);
  }

  try {
    logInfo("Fetching user from KV store", context);

    const user = await getUserFromKV(env, userId);

    if (!user) {
      logError(
        "User not found in KV",
        new Error(`User ${userId} not found`),
        context,
      );
      return errorResponse("User not found in KV.", 404, { user_id: userId });
    }

    logInfo("User found, fetching access token", {
      ...context,
      userTimezone: user.timezone,
      provider: user.provider,
    });

    const tokens = await getAccessToken(env, user.refresh_token);

    logInfo("Access token obtained, fetching calendar list", {
      ...context,
      hasAccessToken: !!tokens.access_token,
    });

    const calendarList = await googleCalendarListRequest(
      tokens.access_token,
      context,
    );

    logInfo("Calendar list retrieved successfully", {
      ...context,
      calendarCount: calendarList.items.length,
    });

    return jsonResponse({
      user_id: userId,
      timezone: user.timezone,
      total_calendars: calendarList.items.length,
      calendars: calendarList.items.map((cal) => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        timezone: cal.timeZone,
        access_role: cal.accessRole,
        primary: cal.primary,
        color: {
          background: cal.backgroundColor,
          foreground: cal.foregroundColor,
        },
        selected: cal.selected,
      })),
    });
  } catch (error) {
    logError("Calendar list request failed", error as Error, context);
    throw error;
  }
}

async function handleCalendarRange(
  range: "today" | "week",
  request: Request,
  env: Env,
): Promise<Response> {
  const userId = getUserId(request);

  const context: LogContext = {
    action: `get_${range}_events`,
    userId: userId || undefined,
    range,
  };

  logInfo("Processing calendar range request", context);

  if (!userId) {
    logError(
      "Missing user ID header",
      new Error("x-user-id header required"),
      context,
    );
    return errorResponse("Missing x-user-id header.", 401);
  }

  try {
    logInfo("Fetching user from KV store", context);

    const user = await getUserFromKV(env, userId);

    if (!user) {
      logError(
        "User not found in KV",
        new Error(`User ${userId} not found`),
        context,
      );
      return errorResponse("User not found in KV.", 404, { user_id: userId });
    }

    logInfo("User found, fetching calendar events", {
      ...context,
      userTimezone: user.timezone,
      provider: user.provider,
    });

    const result =
      range === "today"
        ? await getTodayEvents(env, user.refresh_token, user.timezone, userId)
        : await getWeekEvents(env, user.refresh_token, user.timezone, userId);

    logInfo("Calendar events retrieved successfully", {
      ...context,
      eventCount: result.events.length,
      timeframe: result.timeframe,
      timezone: user.timezone,
    });

    return jsonResponse({
      timeframe: result.timeframe,
      window: result.window,
      user_id: userId,
      timezone: user.timezone,
      total_calendars: result.totalCalendars,
      total_events: result.totalEvents,
      calendars: result.calendars.map((cal) => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary,
        access_role: cal.accessRole,
      })),
      events: result.events.map((event) => ({
        id: event.id,
        calendar_id: event.calendarId,
        calendar_name: event.calendarSummary,
        calendar_color: event.calendarColor,
        summary: event.summary,
        description: event.description,
        location: event.location,
        html_link: event.htmlLink,
        status: event.status,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        organizer: event.organizer,
        creator: event.creator,
      })),
    });
  } catch (error) {
    logError("Calendar range request failed", error as Error, context);
    throw error;
  }
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
