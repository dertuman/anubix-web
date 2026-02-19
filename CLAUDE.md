# CLAUDE.md

## CRITICAL — READ BEFORE DOING ANYTHING

- **NEVER run `npm run build`** — the user runs a dev server. Building will interfere with it.
- **NEVER run `npm run dev`** — it is already running.
- **NEVER run `next build`** — same reason.
- There is NO reason to build. Do NOT attempt it "just to check." Do NOT suggest it.

## Verification

After making changes, verify correctness using ONLY these commands:

1. `npm run lint` — check for linting errors
2. `npm run tsc` — check for TypeScript errors

That's it. Nothing else. No building.
