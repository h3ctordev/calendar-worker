import { Env } from "./types";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

export const DEFAULT_TIMEZONE = "America/Santiago";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
  offsetMinutes: number;
}

export interface DateRange {
  timeMin: string;
  timeMax: string;
  label: "today" | "week";
}

/**
 * Creates a JSON response with consistent headers.
 */
export function jsonResponse<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  });
}

/**
 * Creates an HTTP redirect response with consistent semantics.
 */
export function redirectResponse(location: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: location,
    },
  });
}

/**
 * Builds a standardized error payload and response.
 */
export function errorResponse(
  message: string,
  status = 500,
  details?: Record<string, unknown>,
): Response {
  const payload = {
    error: {
      message,
      ...(details ? { details } : {}),
    },
  };
  return jsonResponse(payload, status);
}

/**
 * Extracts and normalizes the user identifier from the incoming request.
 */
export function getUserId(request: Request): string | null {
  const userId =
    request.headers.get("x-user-id") ?? request.headers.get("X-User-Id");
  const trimmed = userId?.trim();
  return trimmed?.length ? trimmed : null;
}

/**
 * Serializes query parameters, omitting undefined or null values.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.append(key, String(value));
  });
  return search.toString();
}

/**
 * Builds a full URL with optional query parameters.
 */
export function buildUrl(
  baseUrl: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
): string {
  const url = new URL(baseUrl);
  const query = buildQueryString(params);
  if (query) {
    url.search = query;
  }
  return url.toString();
}

/**
 * Generates the Google OAuth authorization URL using shared environment credentials.
 */
export function buildGoogleOAuthUrl(
  env: Env,
  state?: string,
  userId?: string,
): string {
  const params: Record<string, string> = {
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
  };

  if (state) {
    params.state = state;
  }

  if (userId) {
    params.login_hint = userId;
  }

  return buildUrl("https://accounts.google.com/o/oauth2/v2/auth", params);
}

/**
 * Creates an RFC3339 date range covering today or the current week in a given timezone.
 */
export function getDateRange(
  range: "today" | "week",
  timeZone = DEFAULT_TIMEZONE,
): DateRange {
  const now = new Date();
  const zoned = getZonedDateParts(now, timeZone);

  const todayStart = new Date(
    Date.UTC(zoned.year, zoned.month - 1, zoned.day) -
      zoned.offsetMinutes * 60_000,
  );

  if (range === "today") {
    const todayEnd = new Date(todayStart.getTime() + DAY_IN_MS);
    return {
      label: "today",
      timeMin: todayStart.toISOString(),
      timeMax: todayEnd.toISOString(),
    };
  }

  const daysFromMonday = (zoned.weekday + 6) % 7;
  const weekStart = new Date(todayStart.getTime() - daysFromMonday * DAY_IN_MS);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_IN_MS);

  return {
    label: "week",
    timeMin: weekStart.toISOString(),
    timeMax: weekEnd.toISOString(),
  };
}

/**
 * Safely parses JSON responses, throwing a descriptive error on failure.
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON: ${text || (error as Error).message}`,
    );
  }
}

/**
 * Internal helper to extract timezone-aware parts from a Date instance.
 */
function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const bag: Record<string, string> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    bag[part.type] = part.value;
  }

  const offsetMinutes = parseGmtOffset(bag.timeZoneName);
  const weekday = WEEKDAY_INDEX[bag.weekday ?? "Sun"] ?? 0;

  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday,
    offsetMinutes,
  };
}

/**
 * Parses offsets formatted as GMT+/-hh[:mm] into minutes.
 */
function parseGmtOffset(value?: string): number {
  if (!value) return 0;
  const match = value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  return sign * (hours * 60 + minutes);
}
