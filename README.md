# Calendar Worker – OpenClaw ↔ Google Calendar Bridge

This project is a **Cloudflare Worker** that exposes HTTP endpoints for OpenClaw to act as a multi-user bridge to Google Calendar. It handles OAuth 2.0 authentication, securely stores refresh tokens in Cloudflare KV, and provides comprehensive calendar operations including **event creation**, multi-calendar support, and timezone-aware queries. The system supports 20+ event types with full validation and follows enterprise-grade architecture standards.

## 🚀 Features

### Core Functionality
- **Multi-calendar support**: Access primary, shared, and subscribed calendars
- **Event creation**: Create categorized events with full validation (20+ types)
- **OAuth 2.0 integration**: Secure authentication with offline access
- **Multi-user architecture**: KV-backed credential storage per user
- **Timezone awareness**: Default `America/Santiago` with override support
- **Enterprise logging**: Comprehensive audit trails and structured logging

### Technical Stack
- **Runtime**: Cloudflare Workers (ES Modules / TypeScript)
- **Authentication**: Google OAuth 2.0 with refresh token handling
- **Storage**: Cloudflare KV for persistent user sessions
- **Architecture**: Clean Architecture with separation of concerns
- **Documentation**: IEEE 1016 compliant Software Design Documents

## 📁 Project Structure

```
src/
  index.ts        # Router & request handlers
  oauth.ts        # Google OAuth helpers
  calendar.ts     # Calendar API utilities & event creation
  users.ts        # KV persistence helpers
  utils.ts        # Shared utilities (responses, dates, validation)
  types.ts        # Comprehensive TypeScript interfaces
docs/
  specs/          # API endpoint specifications (Spanish)
  guides/         # Development and deployment guides (Spanish)
  bruno/          # API testing collection
  *.md           # Technical documentation and SDD
wrangler.toml     # Cloudflare Worker configuration
package.json      # Scripts & dependencies (v2.1.0)
.wranglerignore   # Deployment optimization
```

## 🔧 Prerequisites

1. **Cloudflare account** with Workers and KV enabled
2. **Google Cloud project** with Calendar API and OAuth consent configured
3. **Node.js 18+** with pnpm package manager
4. **OAuth scopes**: `https://www.googleapis.com/auth/calendar` (read/write access)

## ⚡ Quick Setup

1. **Install dependencies**:
   ```shell
   pnpm install
   ```

2. **Configure Google OAuth** (Web application):
   - Authorized redirect URI: `https://calendar-worker.hectordev.workers.dev/auth/callback`
   - Required scope: `https://www.googleapis.com/auth/calendar`
   - Access type: `offline` | Prompt: `consent`

3. **Set up Cloudflare**:
   - Replace `account_id` in `wrangler.toml` with your Cloudflare account ID
   - Create KV namespace and update `id` in `wrangler.toml`
   - Authenticate: `pnpm dlx wrangler login`

4. **Configure secrets** (see `docs/guides/secrets-wrangler.md`):
   ```shell
   # For production
   pnpm dlx wrangler secret put GOOGLE_CLIENT_ID
   pnpm dlx wrangler secret put GOOGLE_CLIENT_SECRET
   
   # For local development, use .dev.vars file
   cp .dev.vars.example .dev.vars
   ```

## 🛠️ Development & Deployment

### Local Development
```shell
pnpm dev                    # Start local server with tunnel
pnpm dlx wrangler dev       # Alternative local development
```

### Production Deployment
```shell
pnpm deploy                 # Deploy to Cloudflare Workers
```

### Testing & Documentation
```shell
# API Testing
# Use Bruno collection in docs/bruno/
# Or follow curl examples in docs/curl-examples.md

# View comprehensive documentation
# docs/system-design.md - Architecture overview
# docs/specs/ - Endpoint specifications
# docs/guides/ - Development guides
```

## 📊 API Endpoints

### Authentication Endpoints
| Method | Path | Description | Authentication |
|--------|------|-------------|----------------|
| GET | `/auth/google` | Initialize OAuth flow | Query `user_id` |
| GET | `/auth/callback` | Handle OAuth callback | Query `user_id` or header |

### Calendar Read Endpoints
| Method | Path | Description | Authentication |
|--------|------|-------------|----------------|
| GET | `/` | Health check and system info | None |
| GET | `/calendar/today` | Today's events from all calendars | Header `x-user-id` |
| GET | `/calendar/week` | Current week's events | Header `x-user-id` |
| GET | `/calendar/list` | Available calendars for user | Header `x-user-id` |

### Calendar Write Endpoints
| Method | Path | Description | Authentication |
|--------|------|-------------|----------------|
| POST | `/calendar/events` | **Create new calendar event** | Header `x-user-id` |

## ✨ New in v2.1.0: Event Creation

### Supported Event Types
- **Work** (7 types): `meeting`, `presentation`, `workshop`, `conference-call`, `review`, `planning`, `standup`
- **Personal** (6 types): `appointment`, `personal`, `family`, `social`, `travel`, `vacation`
- **Project** (4 types): `deadline`, `milestone`, `launch`, `deployment`
- **Special** (4 types): `all-day`, `recurring`, `reminder`, `blocked-time`

### Event Creation Example
```json
POST /calendar/events
x-user-id: usuario123
Content-Type: application/json

{
  "calendar_id": "primary",
  "event_type": "meeting",
  "summary": "Sprint Planning Q2",
  "description": "Planning session for Q2 objectives",
  "location": "Conference Room A",
  "start": {
    "dateTime": "2024-03-20T14:00:00-03:00",
    "timeZone": "America/Santiago"
  },
  "end": {
    "dateTime": "2024-03-20T15:30:00-03:00",
    "timeZone": "America/Santiago"
  },
  "attendees": [
    { "email": "team-lead@company.com" },
    { "email": "product-owner@company.com" }
  ],
  "reminders": {
    "useDefault": false,
    "overrides": [
      { "method": "email", "minutes": 60 },
      { "method": "popup", "minutes": 15 }
    ]
  }
}
```

### Advanced Features
- **Recurring events**: RRULE pattern support (RFC5545)
- **Multi-calendar**: Target specific calendars with permission validation
- **Rich validation**: Comprehensive input validation and business rules
- **Error handling**: Detailed error responses with actionable guidance

## 🏗️ Architecture & Documentation

### Clean Architecture Implementation
- **Presentation Layer**: HTTP routing and request handling
- **Business Logic Layer**: Validation, authentication, and calendar operations
- **Data Access Layer**: Google API integration and KV storage

### Professional Documentation
- **IEEE 1016 compliant** Software Design Documents
- **C4 model diagrams** for system architecture visualization
- **Formal specifications** with risk analysis and trade-offs
- **Spanish technical documentation** following project language policy

## 🔐 Security & Compliance

### Authentication & Authorization
- OAuth 2.0 token validation for every request
- Calendar permission verification before operations
- User context isolation through `x-user-id` headers

### Data Protection
- No sensitive data stored in worker memory
- Automatic token redaction in logs
- HTTPS-only communication
- Minimal data retention in KV store

### Input Validation
- Comprehensive field validation and sanitization
- Email format validation for attendees
- Rate limiting: 1000 events per user per day
- HTML/script tag removal for security

## 📈 Monitoring & Observability

### Structured Logging
- Request/response tracking with unique IDs
- User context and calendar operation logging
- Performance metrics and error tracking
- Google API call detailed logging

### Error Handling
```json
{
  "error": {
    "message": "Invalid request data.",
    "details": {
      "validation_errors": [
        {
          "field": "event_type",
          "message": "Invalid event type. Must be one of: meeting, presentation, workshop, etc."
        }
      ]
    }
  }
}
```

## 🔄 Response Formats

### Calendar Events Response
```json
{
  "timeframe": "today" | "week",
  "window": {
    "label": "today",
    "timeMin": "2024-03-15T00:00:00-03:00",
    "timeMax": "2024-03-15T23:59:59-03:00"
  },
  "user_id": "usuario123",
  "timezone": "America/Santiago",
  "total_calendars": 3,
  "total_events": 5,
  "calendars": [
    {
      "id": "primary",
      "name": "usuario@example.com",
      "color": "#9fc6e7",
      "event_count": 3
    }
  ],
  "events": [/* Enhanced event objects with calendar info */]
}
```

### Event Creation Response
```json
{
  "id": "evento_abc123xyz",
  "status": "confirmed",
  "html_link": "https://www.google.com/calendar/event?eid=...",
  "summary": "Sprint Planning Q2",
  "start": { "dateTime": "2024-03-20T14:00:00-03:00" },
  "end": { "dateTime": "2024-03-20T15:30:00-03:00" },
  "calendar_info": {
    "calendar_id": "primary",
    "calendar_name": "usuario@example.com",
    "calendar_color": "#9fc6e7"
  },
  "event_metadata": {
    "event_type": "meeting",
    "created_by_worker": true,
    "worker_version": "2.1.0"
  }
}
```

## 🛡️ OpenClaw Integration

### Tool Configuration
1. **Register Worker URL** as HTTP tool in OpenClaw
2. **Configure endpoints**:
   - `GET /calendar/today` - Today's schedule
   - `GET /calendar/week` - Weekly overview  
   - `GET /calendar/list` - Available calendars
   - `POST /calendar/events` - Create events
3. **Set authentication**: Include `x-user-id` header in all requests
4. **Initial setup**: Direct users to `/auth/google?user_id=<USER_ID>` for OAuth

### Enhanced Capabilities
- **Multi-calendar awareness**: Access shared team calendars
- **Event creation**: Programmatically schedule meetings and tasks  
- **Rich categorization**: Use event types for better organization
- **Validation feedback**: Clear error messages for invalid requests

## 🚨 Troubleshooting

### Common Issues
- **Missing refresh token**: Ensure OAuth uses `access_type=offline` and `prompt=consent`
- **User not found**: Verify user completed OAuth flow and KV entry exists
- **Permission denied**: Check calendar write permissions for event creation
- **Validation errors**: Review event payload against documented schema
- **Rate limits**: Implement exponential backoff for Google API calls

### Debug Resources
- Check `docs/guides/` for detailed troubleshooting guides
- Use Bruno collection for systematic API testing
- Review structured logs for detailed operation tracking
- Consult SDD documentation for architecture understanding

## 📋 Version History

### [2.1.0] - 2024-03-15
- ✨ **Event creation endpoint** with 20+ event types
- 📚 **IEEE 1016 compliant documentation** with C4 diagrams
- 🔧 **Enhanced validation** and error handling
- 📁 **Deployment optimization** with .wranglerignore

### [2.0.0] - 2024-03-10
- 🗓️ **Multi-calendar support** for all endpoints
- 📊 **Comprehensive logging** system
- 🔍 **Calendar list endpoint**
- ⚡ **Performance improvements**

### [1.0.0] - 2024-03-05
- 🧪 **Bruno testing collection**
- 📖 **Enhanced documentation**
- 🔐 **Improved secret management**

## 🤝 Contributing

1. Follow **Conventional Commits** for all changes
2. Update **documentation** for any API changes
3. Test using **Bruno collection** before submitting
4. Maintain **Spanish technical documentation** standards
5. Ensure **TypeScript compliance** and proper typing

---

**Calendar Worker v2.1.0** - Enterprise-grade calendar integration with comprehensive event management capabilities. Built for reliability, security, and developer experience.

For detailed technical documentation, architecture diagrams, and implementation guides, explore the `docs/` directory.