import { getAccessToken } from "./oauth";
import {
  Env,
  GoogleCalendarEvent,
  GoogleCalendarEventsResponse,
  GoogleCalendarListResponse,
  GoogleCalendarListEntry,
  CalendarEventWithSource,
} from "./types";
import {
  DEFAULT_TIMEZONE,
  DateRange,
  getDateRange,
  parseJsonResponse,
  logInfo,
  logError,
  logHttpRequest,
  LogContext,
} from "./utils";

const GOOGLE_CALENDAR_LIST_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/users/me/calendarList";
const GOOGLE_CALENDAR_EVENTS_BASE =
  "https://www.googleapis.com/calendar/v3/calendars";

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
  events: CalendarEventWithSource[];
  calendars: GoogleCalendarListEntry[];
  totalCalendars: number;
  totalEvents: number;
}

/**
 * Fetches the list of calendars for the authenticated user.
 */
export async function googleCalendarListRequest(
  accessToken: string,
  context: LogContext = {},
): Promise<GoogleCalendarListResponse> {
  logInfo("Starting Google Calendar List API request", {
    ...context,
    action: "fetch_calendar_list",
  });

  const requestOptions: RequestInit = {
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
  };

  // Log the request details
  logHttpRequest(GOOGLE_CALENDAR_LIST_ENDPOINT, requestOptions, {
    ...context,
    endpoint: "calendar_list",
  });

  const response = await fetch(GOOGLE_CALENDAR_LIST_ENDPOINT, requestOptions);

  logInfo("Google Calendar List API response received", {
    ...context,
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get("content-type"),
  });

  const payload = await parseJsonResponse<GoogleCalendarListResponse>(
    response,
    {
      ...context,
      endpoint: "calendar_list",
    },
  );

  if (!response.ok) {
    const message = `Unexpected Google Calendar List response (${response.status})`;
    logError("Google Calendar List API request failed", new Error(message), {
      ...context,
      responseStatus: response.status,
      url: GOOGLE_CALENDAR_LIST_ENDPOINT,
    });
    throw new Error(`Google Calendar List request failed: ${message}`);
  }

  // Log successful response details
  logInfo("Google Calendar List API request successful", {
    ...context,
    calendarCount: payload.items?.length || 0,
    hasNextPageToken: !!payload.nextPageToken,
  });

  return payload;
}

/**
 * Fetches events from all accessible calendars for the given time range.
 */
export async function getAllCalendarEvents(
  accessToken: string,
  params: CalendarRequestParams,
  context: LogContext = {},
): Promise<{
  events: CalendarEventWithSource[];
  calendars: GoogleCalendarListEntry[];
}> {
  logInfo("Starting multi-calendar events fetch", {
    ...context,
    action: "fetch_all_calendar_events",
  });

  // First, get the list of calendars
  const calendarListResponse = await googleCalendarListRequest(
    accessToken,
    context,
  );

  const calendars = calendarListResponse.items.filter(
    (calendar) =>
      calendar.accessRole === "reader" ||
      calendar.accessRole === "writer" ||
      calendar.accessRole === "owner",
  );

  logInfo("Fetching events from accessible calendars", {
    ...context,
    totalCalendars: calendars.length,
    calendarIds: calendars.map((cal) => cal.id),
  });

  const allEvents: CalendarEventWithSource[] = [];
  const errors: Array<{ calendarId: string; error: string }> = [];

  // Fetch events from each calendar in parallel
  const eventPromises = calendars.map(async (calendar) => {
    try {
      logInfo("Fetching events from calendar", {
        ...context,
        calendarId: calendar.id,
        calendarSummary: calendar.summary,
      });

      const eventsResponse = await googleCalendarRequest(
        accessToken,
        calendar.id,
        params,
        {
          ...context,
          calendarId: calendar.id,
          calendarSummary: calendar.summary,
        },
      );

      return eventsResponse.items.map(
        (event): CalendarEventWithSource => ({
          ...event,
          calendarId: calendar.id,
          calendarSummary: calendar.summary,
          calendarColor: calendar.backgroundColor,
        }),
      );
    } catch (error) {
      const errorMsg = (error as Error).message;
      logError("Failed to fetch events from calendar", error as Error, {
        ...context,
        calendarId: calendar.id,
        calendarSummary: calendar.summary,
      });

      errors.push({
        calendarId: calendar.id,
        error: errorMsg,
      });

      return [];
    }
  });

  const calendarEvents = await Promise.all(eventPromises);

  // Flatten all events
  calendarEvents.forEach((events) => {
    allEvents.push(...events);
  });

  // Sort events by start time
  allEvents.sort((a, b) => {
    const aStart = a.start.dateTime || a.start.date || "";
    const bStart = b.start.dateTime || b.start.date || "";
    return aStart.localeCompare(bStart);
  });

  logInfo("Multi-calendar events fetch completed", {
    ...context,
    totalEvents: allEvents.length,
    successfulCalendars: calendars.length - errors.length,
    failedCalendars: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });

  return {
    events: allEvents,
    calendars,
  };
}

/**
 * Performs a Google Calendar API request for a specific calendar using a bearer access token.
 */
export async function googleCalendarRequest(
  accessToken: string,
  calendarId: string,
  params: CalendarRequestParams,
  context: LogContext = {},
): Promise<GoogleCalendarEventsResponse> {
  if (!params.timeMin || !params.timeMax) {
    const error = new Error("Both timeMin and timeMax parameters are required");
    logError("Invalid calendar request parameters", error, {
      ...context,
      params: {
        ...params,
        timeMin: !!params.timeMin,
        timeMax: !!params.timeMax,
      },
    });
    throw error;
  }

  logInfo("Starting Google Calendar API request", {
    ...context,
    action: "fetch_calendar_events",
    calendarId,
    timeRange: {
      start: params.timeMin,
      end: params.timeMax,
      timezone: params.timeZone || DEFAULT_TIMEZONE,
    },
    requestParams: {
      singleEvents: params.singleEvents ?? true,
      orderBy: params.orderBy ?? "startTime",
      maxResults: params.maxResults ?? 250,
      hasPageToken: !!params.pageToken,
    },
  });

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

  const url = `${GOOGLE_CALENDAR_EVENTS_BASE}/${encodeURIComponent(calendarId)}/events?${search.toString()}`;

  const requestOptions: RequestInit = {
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
  };

  // Log the request details
  logHttpRequest(url, requestOptions, {
    ...context,
    endpoint: "calendar_events",
    calendarId,
    queryParams: Object.fromEntries(search.entries()),
  });

  const response = await fetch(url, requestOptions);

  logInfo("Google Calendar API response received", {
    ...context,
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get("content-type"),
    cacheControl: response.headers.get("cache-control"),
  });

  const payload = await parseJsonResponse<
    GoogleCalendarEventsResponse | GoogleCalendarApiError
  >(response, {
    ...context,
    endpoint: "calendar_events",
  });

  if (!response.ok) {
    const message =
      "error" in payload
        ? `${payload.error.message} (code: ${payload.error.code})`
        : `Unexpected Google Calendar response (${response.status})`;

    logError("Google Calendar API request failed", new Error(message), {
      ...context,
      responseStatus: response.status,
      calendarError: "error" in payload ? payload.error : undefined,
      url,
    });

    throw new Error(`Google Calendar request failed: ${message}`);
  }

  if ("error" in payload) {
    const errorMsg = `Google Calendar returned an error: ${payload.error.message} (code: ${payload.error.code})`;

    logError(
      "Google Calendar API returned error in payload",
      new Error(errorMsg),
      {
        ...context,
        calendarError: payload.error,
        url,
      },
    );

    throw new Error(errorMsg);
  }

  // Log successful response details
  logInfo("Google Calendar API request successful", {
    ...context,
    eventCount: payload.items?.length || 0,
    hasNextPageToken: !!payload.nextPageToken,
    timeZone: payload.timeZone,
    summary: payload.summary,
    accessRole: payload.accessRole,
    updated: payload.updated,
  });

  return payload;
}

/**
 * Retrieves today's events for the authenticated user.
 */
export async function getTodayEvents(
  env: Env,
  refreshToken: string,
  timeZone = DEFAULT_TIMEZONE,
  userId?: string,
): Promise<CalendarEventsResult> {
  const context: LogContext = {
    action: "get_today_events",
    userId,
    timeZone,
  };

  logInfo("Starting today events retrieval", context);

  try {
    const result = await fetchEventsForRange(
      env,
      refreshToken,
      "today",
      timeZone,
      context,
    );
    logInfo("Today events retrieval successful", {
      ...context,
      eventCount: result.events.length,
      timeRange: result.window,
    });
    return result;
  } catch (error) {
    logError("Today events retrieval failed", error as Error, context);
    throw error;
  }
}

/**
 * Retrieves the current week's events for the authenticated user.
 */
export async function getWeekEvents(
  env: Env,
  refreshToken: string,
  timeZone = DEFAULT_TIMEZONE,
  userId?: string,
): Promise<CalendarEventsResult> {
  const context: LogContext = {
    action: "get_week_events",
    userId,
    timeZone,
  };

  logInfo("Starting week events retrieval", context);

  try {
    const result = await fetchEventsForRange(
      env,
      refreshToken,
      "week",
      timeZone,
      context,
    );
    logInfo("Week events retrieval successful", {
      ...context,
      eventCount: result.events.length,
      timeRange: result.window,
    });
    return result;
  } catch (error) {
    logError("Week events retrieval failed", error as Error, context);
    throw error;
  }
}

/**
 * Shared range-based event fetcher that exchanges refresh tokens for access tokens
 * and fetches events from all accessible calendars.
 */
async function fetchEventsForRange(
  env: Env,
  refreshToken: string,
  label: "today" | "week",
  timeZone: string,
  context: LogContext = {},
): Promise<CalendarEventsResult> {
  logInfo("Starting events fetch for range", {
    ...context,
    label,
    timeZone,
  });

  const window = getDateRange(label, timeZone);

  logInfo("Date range calculated", {
    ...context,
    dateRange: window,
  });

  try {
    const tokens = await getAccessToken(env, refreshToken);

    logInfo("Access token obtained, fetching calendar events", {
      ...context,
      hasAccessToken: !!tokens.access_token,
      tokenType: tokens.token_type,
    });

    const { events, calendars } = await getAllCalendarEvents(
      tokens.access_token,
      {
        timeMin: window.timeMin,
        timeMax: window.timeMax,
        timeZone,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 500,
      },
      {
        ...context,
        timeframe: label,
      },
    );

    const result = {
      timeframe: label,
      window,
      events,
      calendars,
      totalCalendars: calendars.length,
      totalEvents: events.length,
    };

    logInfo("Events fetch for range completed", {
      ...context,
      resultSummary: {
        timeframe: result.timeframe,
        eventCount: result.events.length,
        calendarCount: result.calendars.length,
        calendarsIncluded: result.calendars.map((cal) => ({
          id: cal.id,
          summary: cal.summary,
          primary: cal.primary,
        })),
      },
    });

    return result;
  } catch (error) {
    logError("Events fetch for range failed", error as Error, {
      ...context,
      label,
      timeZone,
      dateRange: window,
    });
    throw error;
  }
}
