# Changelog

All notable changes to this project will be documented in this file.

The format follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and adheres to Conventional Commits for describing updates.

## [2.1.0] - 2024-03-15
### Added
- Event creation endpoint `POST /calendar/events` with full validation
- Support for 20+ event types (meeting, standup, vacation, deadline, etc.)
- Recurring event creation with RRULE patterns (RFC5545 compliant)
- Calendar permission validation (requires writer/owner access)
- Comprehensive input validation (dates, emails, field lengths, formats)
- Event enrichment with calendar metadata and worker version tracking
- Bruno test collection for event creation scenarios including error cases
- Detailed API documentation with examples and troubleshooting guides

### Enhanced
- Robust error handling with specific error types and detailed validation messages
- Logging system extended to track event creation attempts and outcomes
- Type system expanded with event creation interfaces and validation structures
- Security validations to prevent data leaks in error responses

### Documentation
- Complete rewrite of event creation specifications following IEEE 1016 standards
- Software Design Documents (SDD) now comply with formal architectural documentation requirements
- All technical documentation translated to Spanish following project language policy
- C4 model diagrams (Context and Component levels) added using Mermaid
- Separation of functional vs non-functional requirements in formal specification
- Risk analysis and architectural trade-offs formally documented
- API examples separated from formal SDD into dedicated practical guide
- Added `.wranglerignore` for deployment optimization excluding documentation files

## [2.0.0] - 2024-03-10
### Added
- Multi-calendar support: all calendar endpoints now fetch events from all accessible calendars
- New `/calendar/list` endpoint to view all available calendars for a user
- Comprehensive verbose logging system for debugging API calls and responses
- Structured logging with request IDs, user context, and HTTP request/response details
- Calendar event enrichment with source calendar information (ID, name, color)
- Support for shared calendars, subscribed calendars, and calendar permissions
- Parallel calendar fetching for improved performance
- Automatic redaction of sensitive information in logs (tokens, secrets, authorization headers)

### Changed
- **BREAKING**: Calendar endpoints now return events from all accessible calendars instead of just primary
- **BREAKING**: Event objects now include `calendar_id`, `calendar_name`, and `calendar_color` fields
- **BREAKING**: Calendar responses now include `total_calendars`, `total_events`, and `calendars` array
- OAuth scope requirements remain the same but now provide access to all user calendars
- Error handling improved with detailed logging context
- Event sorting now occurs globally across all calendars by start time

### Enhanced
- All Google API calls now include verbose request/response logging
- KV operations include detailed logging for user storage/retrieval
- OAuth flow includes comprehensive logging for token exchange and refresh
- Response times and payload sizes logged for performance monitoring

## [1.0.0] - 2024-03-05
### Added
- Bruno collection and comprehensive testing guides for API endpoint validation
- Enhanced documentation guidelines and comprehensive development guides
- Wrangler secret handling guide for secure deployment
- Account ID discovery tips for deployment configuration
- Development variables sample file and documentation guidance

### Changed
- Updated redirect URI configuration to use calendar-worker domain
- Improved documentation structure with comprehensive guides

### Fixed
- Enhanced deployment documentation with better guidance for account setup

## [0.1.0] - 2024-06-06
### Added
- Initial Cloudflare Worker bridging OpenClaw and Google Calendar with OAuth 2.0 and KV-backed persistence.
- Core modules (`index`, `oauth`, `calendar`, `users`, `utils`, `types`) implemented in TypeScript ES modules.
- Spanish documentación set: SDD (`docs/system-design.md`), endpoint specs (`docs/specs/**`), local testing and deployment guides (`docs/guides/**`).
- `copilot-instructions.md` outlining contributor expectations, tooling (pnpm + Wrangler), and commit conventions.
- `docs/curl-examples.md` and Bruno collection under `docs/bruno/` for standardized endpoint testing.