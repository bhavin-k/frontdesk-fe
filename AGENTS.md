<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Contribute to Frontdesk

- Read [the frontend README](README.md) for local setup and verification.
- Keep routes and server handlers in `src/app/`, feature UI in `src/features/`, and shared UI in `src/components/`. Reuse the existing theme tokens and primitives.
- Route authenticated requests through the allowlisted server bridge in `src/lib/recruitment/`. Keep session tokens and provider credentials server-side. Scope query keys by account and business and clear recruitment data when switching businesses.
- Update English copy in `public/locales/en/`. Keep tests and fictional fixtures in `tests/`. Run lint, type checking, and the tests relevant to your change.
- Preserve the [LobbyStack MIT notice](vendor/LobbyStack-MIT.txt) and [UI provenance manifest](vendor/lobbystack-ui.json).
