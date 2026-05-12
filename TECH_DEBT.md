# GasFlow Technical Debt Tracker

Last updated: 2026-05-11

## Purpose

This file preserves intentionally deferred engineering and security work for humans and AI agents. Do not treat these items as accidental omissions. Use this tracker before changing auth, MySQL store typing, CI/CD, logging, deployment, generated artifacts, or production hardening.

## AI Retrieval Summary

- Auth tokens are still persisted in browser `localStorage`; this was intentionally not redesigned during the security hardening PR.
- TypeScript coverage is intentionally scoped; the MySQL adapter now has a central `mysql2` result cast and is included in typecheck, but domain-level row typing still needs follow-up work.
- Generated media/output folders and internal AI/dev folders must stay out of Git unless a future release-policy PR explicitly promotes curated artifacts.
- CI/CD, monitoring, deployment readiness, and logging/PII masking should be added before production go-live.

## Deferred Decisions

- `localStorage` token handling is accepted only as an interim implementation. Future auth work should migrate to a stronger session model.
- MySQL TypeScript typing was initially scoped out to avoid a risky data-layer refactor inside a quality-check PR; the adapter now has baseline coverage, while narrower row/result models remain deferred.
- Generated output folders such as `gasflow-ad-hyperframes/` and `gasflow-intro-video/` are local artifacts and should not be committed.
- Internal folders such as `docs/`, `second brain/`, and `AGENTS.md` are intentionally kept out of public Git history unless Smart explicitly approves a sanitized public handoff.

## Debt Items

### 1. LocalStorage Auth Token Migration

- Description: The web admin persists API bearer tokens in browser `localStorage` through `AUTH_TOKEN_KEY`.
- Current risk: If a browser session is compromised by XSS or a shared device, the bearer token can be read until it expires or is invalidated.
- Why deferred: The security hardening PR was scoped to production-safe defaults and avoided an auth architecture redesign.
- Recommended future PR scope: Move to an HTTP-only secure cookie or a short-lived access token plus refresh/session pattern; review CSRF, SameSite, logout, password reset invalidation, and session expiration.
- Estimated complexity: Large.

### 2. Auth Session Architecture Review

- Description: Sessions currently live in the Node process and are validated through bearer tokens.
- Current risk: Sessions do not naturally survive process restarts or horizontal scaling, and session policy is coupled to one server process.
- Why deferred: The current app is still a local/single-server deployment candidate, and redesigning sessions would touch backend, frontend, and deployment.
- Recommended future PR scope: Add persistent sessions or signed cookie sessions, rotation, server-side invalidation, and an admin session audit view.
- Estimated complexity: Large.

### 3. MySQL Adapter Type Hardening

- Description: `backend/store/store-mysql.js` uses `mysql2/promise`. TypeScript sees query results as broad unions such as `QueryResult`, `ResultSetHeader`, and row arrays.
- Current risk: The adapter is now covered by TypeScript, but row objects are still broad records, so domain field mistakes can still slip through.
- Why deferred: Narrow row models require carefully annotating many existing query shapes without changing persistence behavior.
- Recommended future PR scope: Add domain-specific row/result typedefs for high-risk flows such as orders, payments, goods receipts, stock movements, and user auth; replace broad row casts incrementally.
- Estimated complexity: Medium.

### 4. TypeScript Coverage Gaps

- Description: TypeScript `checkJs` coverage should expand beyond selected utility/script files.
- Current risk: Large UI and store files can still regress through shape mismatches that only runtime tests catch.
- Why deferred: Enabling strict checks across the whole JS codebase would require broad annotations and refactors unrelated to the quality-check PR.
- Recommended future PR scope: Add JSDoc typedefs for key domain models, cover store adapters incrementally, and consider migrating stable modules to `.ts`.
- Estimated complexity: Medium.

### 5. GitHub Actions CI/CD

- Description: Quality scripts can run locally but are not yet enforced by GitHub Actions on pull requests.
- Current risk: PRs can merge without automated lint, typecheck, test, and build verification.
- Why deferred: The first safe push and quality-check work focused on local repo readiness before adding hosted CI.
- Recommended future PR scope: Add `.github/workflows/ci.yml` running `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` on PRs to `main`.
- Estimated complexity: Small.

### 6. Monitoring And PII-Safe Logging

- Description: Logging is basic and does not yet have a central masking/redaction policy.
- Current risk: Future debugging logs could accidentally expose customer phone numbers, addresses, emails, license plates, tokens, reset links, or passwords.
- Why deferred: The current hardening PR only masked production 500 responses and did not redesign observability.
- Recommended future PR scope: Add a logging utility with structured levels, PII masking, token redaction, production-safe error IDs, and guidelines for API/store logs.
- Estimated complexity: Medium.

### 7. Deployment Readiness Guards

- Description: Production depends on several environment variables such as `APP_BASE_URL`, `CORS_ALLOWED_ORIGINS`, SMTP config, and default admin password policy.
- Current risk: A production deployment can be misconfigured if required environment variables are missing or inconsistent.
- Why deferred: Initial hardening added safer defaults but did not build a full readiness gate.
- Recommended future PR scope: Add startup validation for production-only config, a deployment checklist, health details that do not leak secrets, and clear fail-fast messages.
- Estimated complexity: Medium.

### 8. Backup Restore And Disaster Recovery

- Description: Backup export exists, but restore/import validation and recovery runbooks need follow-up.
- Current risk: A backup file may exist but still be difficult to restore safely during an outage or machine migration.
- Why deferred: Backup export was prioritized first to prevent data loss before building restore UX.
- Recommended future PR scope: Add restore dry-run validation, sample restore script, schema/version checks, and a human runbook.
- Estimated complexity: Medium.

### 9. Generated Artifact Policy

- Description: Generated videos, decks, PDFs, and local output folders are intentionally excluded from Git.
- Current risk: Large or private generated files can bloat the repository or leak internal planning material if committed.
- Why deferred: Public Git hygiene was prioritized over building an artifact release workflow.
- Recommended future PR scope: Define artifact promotion rules, public-safe samples, storage location, and naming conventions for generated outputs.
- Estimated complexity: Small.

### 10. Internal Documentation Publication Policy

- Description: `docs/`, `second brain/`, and `AGENTS.md` are internal working materials and are not currently public repo assets.
- Current risk: Internal notes can contain private workflow context, customer-specific preferences, or non-public planning details.
- Why deferred: The first GitHub push focused on application source code, not a public documentation package.
- Recommended future PR scope: Create a sanitized public `README.md` and separate public developer docs while keeping private memory files out of Git.
- Estimated complexity: Small.

## GitHub Issue Drafts

### Issue Draft: Harden mysql2 TypeScript Typing

- Title: Add domain row typings for MySQL adapter
- Body:
  - Problem: `backend/store/store-mysql.js` is included in TypeScript coverage, but many rows are still typed as broad records.
  - Scope: Add domain-specific typedefs for row arrays, single-row reads, inserts, updates, and transaction blocks in the highest-risk flows.
  - Acceptance: `npm run typecheck` continues to include `backend/store/store-mysql.js` and catches field-shape mistakes in selected domain flows.
- Labels: `technical-debt`, `typescript`, `database`

### Issue Draft: Migrate Auth Tokens Away From localStorage

- Title: Migrate web auth tokens away from localStorage
- Body:
  - Problem: `localStorage` bearer tokens are simple but expose more risk if XSS or shared-device access occurs.
  - Scope: Design secure cookie/session or access/refresh-token architecture, update login/logout/password-reset invalidation, and verify CSRF/session behavior.
  - Acceptance: Web admin no longer stores bearer tokens in `localStorage`; logout and password reset invalidate active sessions.
- Labels: `security`, `auth`, `architecture`

### Issue Draft: Add GitHub Actions CI/CD

- Title: Add GitHub Actions quality check workflow
- Body:
  - Problem: Local quality scripts are not enforced automatically for pull requests.
  - Scope: Add CI workflow for install, lint, typecheck, test, and build on pull requests to `main`.
  - Acceptance: PR checks run automatically and fail on broken scripts or build errors.
- Labels: `ci`, `quality`, `automation`

### Issue Draft: Add PII-Safe Monitoring And Logging

- Title: Add PII-safe logging and monitoring guardrails
- Body:
  - Problem: Future logs could expose sensitive customer/user data without a central masking policy.
  - Scope: Add a logging helper, mask phone/email/address/license/token/reset-link fields, add production error IDs, and document logging rules.
  - Acceptance: API/store logs use the helper and avoid raw PII/secrets in production.
- Labels: `security`, `observability`, `privacy`

### Issue Draft: Add Production Deployment Safety Checks

- Title: Add production deployment readiness checks
- Body:
  - Problem: Production behavior depends on required env vars and safe defaults that are easy to misconfigure.
  - Scope: Validate `APP_BASE_URL`, `CORS_ALLOWED_ORIGINS`, SMTP settings, admin defaults, storage engine config, and backup readiness at startup.
  - Acceptance: Misconfigured production startup fails safely with clear non-secret messages.
- Labels: `deployment`, `security`, `operations`

## Suggested Next PR Order

1. GitHub Actions CI/CD because it is small and protects every later PR.
2. MySQL TypeScript typing because it improves confidence in the largest persistence layer.
3. localStorage token migration because it is the largest security architecture change.
4. PII-safe logging and production deployment readiness before external go-live.
