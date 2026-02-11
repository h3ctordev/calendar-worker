# Changelog

All notable changes to this project will be documented in this file.

The format follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and adheres to Conventional Commits for describing updates.

## [0.1.0] - 2024-06-06
### Added
- Initial Cloudflare Worker bridging OpenClaw and Google Calendar with OAuth 2.0 and KV-backed persistence.
- Core modules (`index`, `oauth`, `calendar`, `users`, `utils`, `types`) implemented in TypeScript ES modules.
- Spanish documentación set: SDD (`docs/system-design.md`), endpoint specs (`docs/specs/**`), local testing and deployment guides (`docs/guides/**`).
- `copilot-instructions.md` outlining contributor expectations, tooling (pnpm + Wrangler), and commit conventions.
- `docs/curl-examples.md` and Bruno collection under `docs/bruno/` for standardized endpoint testing.