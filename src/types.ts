export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  USERS_KV: KVNamespace;
}

export interface StoredUser {
  refresh_token: string;
  provider: "google";
  timezone: string;
  created_at: string;
}

export interface GoogleAuthTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleCalendarEventDateTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: GoogleCalendarEventDateTime;
  end: GoogleCalendarEventDateTime;
  attendees?: Array<{ email: string; responseStatus?: string }>;
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  creator?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  accessRole: "freeBusyReader" | "reader" | "writer" | "owner";
  defaultReminders?: Array<{
    method: string;
    minutes: number;
  }>;
  primary?: boolean;
}

export interface GoogleCalendarListResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  items: GoogleCalendarListEntry[];
}

export interface GoogleCalendarEventsResponse {
  kind: string;
  etag?: string;
  summary?: string;
  timeZone?: string;
  updated?: string;
  nextPageToken?: string;
  items: GoogleCalendarEvent[];
  accessRole?: string;
  defaultReminders?: Array<{
    method: string;
    minutes: number;
  }>;
}

export interface CalendarEventWithSource extends GoogleCalendarEvent {
  calendarId: string;
  calendarSummary: string;
  calendarColor?: string;
}
