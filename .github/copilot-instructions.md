# Copilot Instructions

## Repository Overview
- Cloudflare Worker bridging OpenClaw and Google Calendar.
- Runtime: TypeScript ES modules targeting Workers.
- Persistence: Cloudflare KV (`USERS_KV`).
- OAuth 2.0 with Google (offline access) and Calendar API integration.
- All API code, comments, and runtime strings must be in English.
- Documentation under `docs/` and endpoint specs must be written in Spanish.

## Tooling & Commands
- Package manager: `pnpm`.
- Install dependencies: `pnpm install`.
- Local dev (worker & tunnel): `pnpm dev`.
- Remote dev (edge execution): `pnpm dlx wrangler dev --remote`.
- Deploy: `pnpm deploy` (wraps `pnpm dlx wrangler deploy`).
- Wrangler authentication: `pnpm dlx wrangler login`.
- KV namespaces/operations: always via `pnpm dlx wrangler ...`.

## Architecture Constraints
- No server frameworks (Express, Hono, etc.).
- Use native `fetch` and manual routing in `src/index.ts`.
- Helper modules: `oauth.ts`, `calendar.ts`, `users.ts`, `utils.ts`, `types.ts`.
- Required helper functions (already implemented): `getAccessToken`, `getUserFromKV`, `saveUserToKV`, `googleCalendarRequest`.

## Auth & Data Requirements
- OAuth scopes: `https://www.googleapis.com/auth/calendar`, `access_type=offline`, `prompt=consent`.
- `x-user-id` header is mandatory for calendar endpoints.
- KV schema: `{ refresh_token, provider: "google", timezone: "America/Santiago", created_at }`.
- Timezone calculations default to `America/Santiago` but should honor per-user values if ever extended.

## Documentation Rules
- Specs and guides (`docs/**`) must be authored in Spanish.
- Technical instructions outside docs (e.g., comments, code) remain in English.

## Commit & PR Guidelines
- Follow Conventional Commits (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
- Mention relevant scope (e.g., `docs(guides): ...`, `feat(oauth): ...`) when appropriate.
- Keep commits atomic and descriptive; avoid mixing unrelated changes.

## Quality Expectations
- Maintain strong typing via TypeScript interfaces in `src/types.ts`.
- Handle errors with JSON responses (`errorResponse`) and never leak secrets.
- Provide consistent responses for success/error (JSON or redirects as specified).
- Update or add tests/docs whenever behavior changes (currently documentation-driven).

Use this document as the authoritative reference when generating code, docs, or commit messages for this project.