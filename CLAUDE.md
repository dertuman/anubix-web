# CLAUDE.md

## CRITICAL — READ BEFORE DOING ANYTHING

- **NEVER run `npm run build`** — the user runs a dev server. Building will interfere with it.
- Reuse this checkout on port 3000 if healthy; otherwise start it under the local development server policy below.
- **NEVER run `next build`** — same reason.
- There is NO reason to build. Do NOT attempt it "just to check." Do NOT suggest it.

## Verification

After making changes, verify correctness using ONLY these commands:

1. `npm run lint` — check for linting errors
2. `npm run tsc` — check for TypeScript errors

That's it. Nothing else. No building.

## Local development servers (user preference, 2026-11-11)

- Start or find this repository's dev server with
  `~/Documents/GitHub/scripts/dev up`, run from this checkout, and review on
  the URL it prints. Never start a server by hand or choose a port yourself.
  This is standing authorization; do not ask again.
- The script reuses a server already serving this checkout, so every agent
  on this project shares one. A new server gets port 3000 when it is free and
  the next free port (3001, 3002) when another project is in use there.
- Never stop another project's dev server yourself. The script stops only
  servers no agent is using. `dev up --main` moves this repository onto 3000
  and stops the dev server there: use it only when the user asks for 3000 or
  a login callback is registered for 3000.
- If the script reports that 3000 is held by something that is not a dev
  server, report that rather than killing it.
- Verify the server responds and check the change there yourself. This does
  not authorize production builds, deployments, commits, pushes, or unrelated
  tests and data changes.
