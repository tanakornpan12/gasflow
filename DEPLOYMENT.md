# GasFlow Production Deployment Readiness

This document describes the required production startup configuration for GasFlow.
Do not commit real secrets. Configure production values in the hosting platform's
environment variable settings.

## Production Startup Gate

When `NODE_ENV=production`, the app must fail fast before serving traffic if the
runtime is unsafe. Production startup requires:

- `DB_ENGINE=mysql`
- complete MySQL connection variables
- `APP_BASE_URL` using `https://`
- `CORS_ALLOWED_ORIGINS` using `https://` origins
- explicit default admin bootstrap variables
- no fallback to the local file store
- a successful MySQL health check before `server.listen`

## Required Environment Variables

### Runtime

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | Yes | Must be `production`. |
| `PORT` | Platform dependent | Usually injected by the host. |
| `APP_BASE_URL` | Yes | Public HTTPS URL, for example `https://app.example.com`. |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated HTTPS origins allowed to call the API. |
| `AUTH_SESSION_HOURS` | Recommended | Session lifetime in hours. |
| `RESET_LINK_DEBUG` | Recommended | Use `0` in production. |

### Database

| Variable | Required | Notes |
| --- | --- | --- |
| `DB_ENGINE` | Yes | Must be `mysql` in production. |
| `MYSQL_HOST` | Yes | Managed MySQL host. |
| `MYSQL_PORT` | Yes | Positive integer, commonly `3306`. |
| `MYSQL_USER` | Yes | Production DB user. |
| `MYSQL_PASSWORD` | Yes | Production DB password. |
| `MYSQL_DATABASE` | Yes | Production DB name. |

Production must use MySQL. The local JSON file store is only for development and
must never be used for production traffic.

### Initial Admin Bootstrap

| Variable | Required | Notes |
| --- | --- | --- |
| `DEFAULT_ADMIN_USERNAME` | Yes | Bootstrap admin username. |
| `DEFAULT_ADMIN_PASSWORD` | Yes | Must not be the development default. |
| `DEFAULT_ADMIN_NAME` | Yes | Display name for the bootstrap admin. |
| `DEFAULT_ADMIN_EMAIL` | Yes | Valid admin email address. |

The bootstrap admin is used only when the user table is empty, but production
still requires these variables so a fresh deployment never creates a weak default
admin account.

### Optional Forgot-Password Email

Forgot-password emails are considered enabled when any SMTP environment variable
is configured. When enabled, production requires:

| Variable | Required When Email Enabled | Notes |
| --- | --- | --- |
| `SMTP_HOST` | Yes | SMTP server host. |
| `SMTP_PORT` | Yes | Positive integer. |
| `SMTP_FROM` | Yes | Sender email address. |
| `SMTP_USER` | With `SMTP_PASSWORD` | Configure both or neither, depending on the provider. |
| `SMTP_PASSWORD` | With `SMTP_USER` | Configure both or neither. |
| `SMTP_SECURE` | Optional | Use when the provider requires implicit TLS. |
| `SMTP_STARTTLS` | Optional | Use for STARTTLS behavior. |
| `SMTP_TIMEOUT_MS` | Optional | SMTP timeout in milliseconds. |

If SMTP is not configured, the production app will not expose debug reset links.
Admins should use user management to reset passwords until SMTP is configured.

## Recommended Hosting Architecture

- Frontend and backend: run this repository as one persistent Node.js service.
- Database: use a managed MySQL 8.x database in the same region as the backend.
- Domain/DNS: use Cloudflare DNS and point `app.example.com` to the Node service.
- Secrets: store all production values in the hosting platform, never in Git.

## Staging Database Setup

Use `npm run db:setup` to apply `database/schema.sql` to the staging MySQL
database. The schema is written with `CREATE TABLE IF NOT EXISTS` and
`INSERT IGNORE` statements so the setup command can be repeated for a staging
database without dropping existing tables.
This is intended for a new or disposable staging database; it is not a full
production data migration framework.

Required environment variables:

| Variable | Notes |
| --- | --- |
| `MYSQL_HOST` | Staging MySQL host. |
| `MYSQL_PORT` | Positive integer, commonly `3306`. |
| `MYSQL_USER` | Staging DB user. |
| `MYSQL_PASSWORD` | Staging DB password. |
| `MYSQL_DATABASE` | Staging DB name. |
| `DB_SETUP_CONFIRM` | Must be `staging` so the script cannot run by accident. |

Run this only after confirming the target database is staging:

```sh
DB_SETUP_CONFIRM=staging npm run db:setup
```

For Windows PowerShell local verification, set environment variables in the
current shell before running the command:

```powershell
$env:DB_SETUP_CONFIRM = "staging"
npm run db:setup
```

Do not run this against production unless a separate production migration plan
has been reviewed and approved. Production data changes should always have an
explicit backup and rollback plan.

## Pre-Deployment Checklist

1. Create a managed MySQL database.
2. Apply `database/schema.sql` to the staging database with `npm run db:setup`.
3. Configure all required production environment variables.
4. Set `NODE_ENV=production`.
5. Start the app and confirm startup fails if a required value is missing.
6. Confirm `/api/health` reports MySQL.
7. Confirm login, stock movement, sales, finance, reports, backup, and password reset flows in staging.
8. Configure Cloudflare DNS after the staging deployment is verified.

## Do Not Do Yet

- Do not deploy with `DB_ENGINE=file`.
- Do not commit `.env` or real secrets.
- Do not use a local Docker volume as production database storage.
- Do not connect Supabase/PostgreSQL without a dedicated migration plan.
- Do not split frontend and backend domains until API base URL and CORS are deliberately designed.
- Do not buy or switch the production domain before staging passes the checklist.
