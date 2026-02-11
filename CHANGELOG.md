# Changelog

All notable changes to this project will be documented in this file.

The format follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and adheres to Conventional Commits for describing updates.

## [1.0.0] - 2026-02-10
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