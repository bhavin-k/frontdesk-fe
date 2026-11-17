# Frontdesk

Frontdesk is a Next.js dashboard for managing job openings, collecting CVs, and reviewing candidates. The frontend uses Better Auth for sign-in. The companion FastAPI service and worker handle recruitment workflows, including CV processing.

## Run locally

The commands below use Node.js 26 and npm. For the companion backend, install Python 3.13, uv, and Docker Desktop.

If you have the full Frontdesk checkout, run the following in its root. Leave the backend terminal running while you work.

```powershell
cd backend
uv sync --frozen
cd ..
node scripts/dev.mjs backend
```

This starts FastAPI at `http://127.0.0.1:8000`, starts the worker, and prepares a dedicated PostgreSQL database on port 55439. The launcher uses fake providers by default and writes the database URL and auth secret to its ignored `frontend/.env.local`. You can check the API at [its readiness endpoint](http://127.0.0.1:8000/health/ready).

In a second terminal, open this frontend folder. If you cloned it separately, copy `.env.example` to `.env.local` and fill in the values below. In the full checkout, reuse the file the launcher created and add the API URL and provider mode if they are missing.

| Setting | Local value |
| --- | --- |
| `APP_BASE_URL` | `http://localhost:3100`. Use this origin in your browser. |
| `RECRUITMENT_API_BASE_URL` | `http://127.0.0.1:8000`, or the server-side URL of your companion API. |
| `RECRUITMENT_AUTH_DATABASE_URL` | Use the launcher's URL or ask the backend operator for the restricted `recruitment_auth` connection. Better Auth and FastAPI must use the same database, with Alembic migrations applied by the backend. |
| `BETTER_AUTH_SECRET` | Use the launcher's secret. For a new local configuration, generate one with the command in `.env.example`. |
| `RECRUITMENT_PROVIDER_MODE` | Use `fake` for the default local stack. Match the mode of the API and worker. |

```powershell
npm ci
npm run dev
```

Open [localhost:3100](http://localhost:3100), create an account and add a business. Use fictional CVs from `tests/e2e/fixtures/` to try the local workflow. If your team already runs the companion services, use its API and auth database settings instead of starting a second stack.

If sign-in fails, check that PostgreSQL is reachable and the URL uses the restricted auth role. If sign-in works but dashboard requests fail, check API readiness and confirm both services use the same database. If CVs stay pending, check the worker. Keep ports 3100, 8000 and 55439 free for the default local stack.

## Folder structure

| Path | Contents |
| --- | --- |
| `src/app/` | Next.js pages, layouts, auth and API route handlers |
| `src/features/` | Dashboard, openings, candidate review, and intake UI |
| `src/components/` | Shared UI primitives, layout, and tables |
| `src/hooks/` | Shared React hooks |
| `src/lib/` | Auth, allowlisted FastAPI forwarding, and utilities |
| `public/locales/en/` | English interface text |
| `tests/` | Unit, PostgreSQL integration, and browser tests with fictional fixtures |
| `scripts/` | Local database and test utilities |
| `vendor/` | [LobbyStack UI provenance](vendor/lobbystack-ui.json) and [MIT notice](vendor/LobbyStack-MIT.txt) |

The browser sends an HttpOnly session cookie to Next.js. Next.js forwards the validated session to allowlisted FastAPI endpoints. FastAPI enforces business membership and database row-level security. Keep database credentials, provider secrets, and bearer tokens on the server.

## Enable Google sign-in

Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local` and restart Next.js. In the Google OAuth web client, register `http://localhost:3100/api/auth/callback/google` for local sign-in. For a hosted app, register the same path at its HTTPS `APP_BASE_URL`.

If you already use a password, sign in first and choose **Link Google** under **Settings → Account**. Use a Google account with the same email. Gmail CV intake uses a separate integration and callback, `/api/recruitment/oauth/gmail/callback`.

## Verify changes

Run these commands from the frontend folder. They work without the companion services.

```powershell
npm run lint
npm run typecheck
npm test
$env:NEXT_BUILD_DIR = '.next-build'
npm run build
Remove-Item Env:NEXT_BUILD_DIR
```

For the integration and browser suites, start Docker and run `uv sync --frozen` in the companion backend first. The scripts look for `../backend` by default. In a separate checkout, set `FRONTDESK_BACKEND_DIR` to the backend folder that contains `alembic.ini`.

```powershell
$env:FRONTDESK_BACKEND_DIR = 'C:\path\to\Frontdesk\backend' # Separate checkout only
npm run db:test
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Set `PLAYWRIGHT_CHANNEL=chrome` in your shell if you want to use an installed Chrome. Tests use a dedicated database on port 55440 and fake providers. Playwright starts its own Next.js server, API, and worker on ports 3102 and 8102. Use one copy of the test stack at a time. If you switch checkouts on the same machine, use the checkout that created the test database or provision a fresh test stack on another machine.

## Prepare the GitHub repository

Use this folder as the repository root. Include `package-lock.json`, `.env.example`, tests, fictional fixtures, and the vendor notice. Keep `.env.local`, `.env.test.local`, `.local/`, dependencies, and generated output out of Git. The included `.gitignore` covers these files when the frontend lives on its own.
