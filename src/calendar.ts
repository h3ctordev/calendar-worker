import { getAccessToken } from "./oauth";
import { Env, GoogleCalendarEvent, GoogleCalendarEventsResponse } from "./types";
import { DEFAULT_TIMEZONE, DateRange, getDateRange, parseJsonResponse } from "./utils";

const GOOGLE_CALENDAR_EVENTS_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

interface GoogleCalendarApiError {
  error: {
    code: number;
    message: string;
    errors?: Array<{
      message: string;
      domain: string;
      reason: string;
    }>;
    status?: string;
  };
}

export interface CalendarRequestParams {
  timeMin: string;
  timeMax: string;
  timeZone?: string;
  singleEvents?: boolean;
  orderBy?: "startTime" | "updated";
  maxResults?: number;
  pageToken?: string;
}

export interface CalendarEventsResult {
  timeframe: "today" | "week";
  window: DateRange;
  events: GoogleCalendarEvent[];
  raw: GoogleCalendarEventsResponse;
}

/**
 * Performs a Google Calendar API request using a bearer access token.
 */
export async function googleCalendarRequest(
  accessToken: string,
  params: CalendarRequestParams
): Promise<GoogleCalendarEventsResponse> {
  if (!params.timeMin || !params.timeMax) {
    throw new Error("Both timeMin and timeMax parameters are required");
  }

  const search = new URLSearchParams({
    timeMin: params.timeMin,
    timeMax: params.timeMax,
    singleEvents: String(params.singleEvents ?? true),
    orderBy: params.orderBy ?? "startTime",
    maxResults: String(params.maxResults ?? 250),
  });

  if (params.timeZone ?? DEFAULT_TIMEZONE) {
    search.set("timeZone", params.timeZone ?? DEFAULT_TIMEZONE);
  }

  if (params.pageToken) {
    search.set("pageToken", params.pageToken);
  }

  const url = `${GOOGLE_CALENDAR_EVENTS_ENDPOINT}?${search.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
  });

  const payload = await parseJsonResponse<
    GoogleCalendarEventsResponse | GoogleCalendarApiError
  >(response);

  if (!response.ok) {
    const message =
      "error" in payload
        ? `${payload.error.message} (code: ${payload.error.code})`
        : `Unexpected Google Calendar response (${response.status})`;
    throw new Error(`Google Calendar request failed: ${message}`);
  }

  if ("error" in payload) {
    throw new Error(
      `Google Calendar returned an error: ${payload.error.message} (code: ${payload.error.code})`
    );
  }

  return payload;
}

/**
 * Retrieves today's events for the authenticated user.
 */
export async function getTodayEvents(
  env: Env,
  refreshToken: string,
  timeZone = DEFAULT_TIMEZONE
): Promise<CalendarEventsResult> {
  return fetchEventsForRange(env, refreshToken, "today", timeZone);
}

/**
 * Retrieves the current week's events for the authenticated user.
 */
export async function getWeekEvents(
  env: Env,
  refreshToken: string,
  timeZone = DEFAULT_TIMEZONE
): Promise<CalendarEventsResult> {
  return fetchEventsForRange(env, refreshToken, "week", timeZone);
}

/**
 * Shared range-based event fetcher that exchanges refresh tokens for access tokens.
 */
async function fetchEventsForRange(
  env: Env,
  refreshToken: string,
  label: "today" | "week",
  timeZone: string
): Promise<CalendarEventsResult> {
  const window = getDateRange(label, timeZone);
  const tokens = await getAccessToken(env, refreshToken);
  const raw = await googleCalendarRequest(tokens.access_token, {
    timeMin: window.timeMin,
    timeMax: window.timeMax,
    timeZone,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 500,
  });

  return {
    timeframe: label,
    window,
    events: raw.items ?? [],
    raw,
  };
}
