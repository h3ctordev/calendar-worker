# Calendar Worker – OpenClaw ↔ Google Calendar Bridge

This project is a Cloudflare Worker that exposes HTTP endpoints for OpenClaw to act as a multi-user bridge to Google Calendar. It handles OAuth 2.0 authentication, securely stores refresh tokens in Cloudflare KV, and exposes calendar endpoints scoped to each user via the `x-user-id` header.

## Features

- Cloudflare Workers runtime (ES Modules / TypeScript).
- Google OAuth 2.0 authorization with offline access.
- Multi-user credential storage powered by Cloudflare KV.
- Timezone-aware queries (default `America/Santiago`).
- Ready-to-use endpoints for OpenClaw tool integrations.
- Native fetch usage—no additional HTTP frameworks.
- Fully typed and documented code structure.

## Project Structure

```
src/
  index.ts        # Router & request handlers
  oauth.ts        # Google OAuth helpers
  calendar.ts     # Calendar API utilities
  users.ts        # KV persistence helpers
  utils.ts        # Shared utilities (responses, dates, etc.)
  types.ts        # Shared TypeScript interfaces
wrangler.toml     # Cloudflare Worker configuration
package.json      # Scripts & dev dependencies
tsconfig.json     # TypeScript configuration
README.md         # Project usage guide
```

## Prerequisites

1. Cloudflare account with Workers and KV enabled.
2. Google Cloud project with OAuth consent screen and credentials configured.
3. Node.js 18+ (for development tooling).

## Setup

1. **Clone the repository** and install dependencies:

   ```shell
   npm install
   ```

2. **Create a Google OAuth client** (Web application):
   - Authorized redirect URI: `https://<your-worker-domain>/auth/callback`
   - Scope: `https://www.googleapis.com/auth/calendar`
   - Access type: `offline`
   - Prompt: `consent`

3. **Configure Wrangler** via `wrangler.toml`:
   - Replace `YOUR_ACCOUNT_ID` with your Cloudflare account ID.
   - Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.
   - Create a KV namespace and replace `YOUR_KV_NAMESPACE_ID` with its ID.

4. **Authenticate Wrangler**:

   ```shell
   npx wrangler login
   ```

## Development & Deployment

- **Local development** (opens a tunnel + mock KV):

  ```shell
  npm run dev
  ```

- **Deploy to Cloudflare**:

  ```shell
  npm run deploy
  ```

## Endpoints

| Method | Path               | Description                                            | Auth                        |
|--------|--------------------|--------------------------------------------------------|-----------------------------|
| GET    | `/`                | Health/info payload                                    | None                        |
| GET    | `/auth/google`     | Starts OAuth flow (requires `?user_id=`)               | Query `user_id`             |
| GET    | `/auth/callback`   | Handles Google redirect, stores refresh token          | Query `user_id` or header   |
| GET    | `/calendar/today`  | Returns today’s events for the identified user         | Header `x-user-id`          |
| GET    | `/calendar/week`   | Returns current week’s events for the identified user  | Header `x-user-id`          |

### Authentication Flow

1. OpenClaw (or another client) calls `/auth/google?user_id=<USER_ID>`.
2. User consents on Google’s OAuth screen.
3. Google redirects to `/auth/callback` with `code`. The worker exchanges it for tokens and stores the `refresh_token` in KV under the provided `user_id`.
4. Subsequent calendar calls use `x-user-id` to fetch credentials and query Google Calendar.

### Calendar Responses

All calendar responses follow this shape:

```json
{
  "timeframe": "today" | "week",
  "window": {
    "label": "today",
    "timeMin": "ISO8601",
    "timeMax": "ISO8601"
  },
  "user_id": "abc123",
  "timezone": "America/Santiago",
  "events": [ /* Google Calendar events array */ ]
}
```

Errors return a standardized payload:

```json
{
  "error": {
    "message": "Missing x-user-id header.",
    "details": { "user_id": "abc123" }
  }
}
```

## Using as an OpenClaw Tool

1. Register the Worker URL as an HTTP tool in OpenClaw.
2. Expose the following operations:
   - `GET /calendar/today`
   - `GET /calendar/week`
3. Ensure OpenClaw includes the end-user identifier via `x-user-id` when calling the calendar endpoints.
4. Provide a one-time auth initiation step that directs the user to `/auth/google?user_id=<USER_ID>`.

## Security Notes

- The worker never exposes `GOOGLE_CLIENT_SECRET`.
- Each user’s credentials are isolated by `user_id`.
- Endpoints reject requests lacking `x-user-id` (401) or unknown users (404).
- All code and comments are in English for consistency.

## Troubleshooting

- **Missing refresh token:** Ensure the OAuth request uses `access_type=offline` and `prompt=consent`.
- **User not found:** Verify the user completed the OAuth flow and their KV entry exists.
- **Clock skew issues:** Google Calendar queries rely on Worker runtime time; ensure timezone configuration matches expectations.

---

Happy building! If you need customizations (additional calendar operations, different storage, etc.), extend the modular files under `src/` and redeploy via Wrangler.