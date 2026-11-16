# Landing Copy Review: v4.1 → v4.2

## Methodology

This review was produced by auditing the v4.1 marketing copy against the actual
codebase — specifically the workspace page, Chat mode, Code mode, cloud machine
provisioning, setup wizard, model definitions, and i18n strings.

**Key files examined:**
- `app/(public)/workspace/` — workspace entry + mode toggle
- `app/(public)/code/components/code-view.tsx` — Code mode UI
- `app/(public)/chat/components/chat-view.tsx` — Chat mode UI
- `hooks/useClaudeCode.ts` — Claude Code SDK bridge
- `hooks/useCloudMachine.ts` — Fly.io VPS lifecycle
- `locales/en.ts` — all UI copy & marketing strings
- `lib/models/chat.ts` — available AI models
- `lib/models/code.ts` — code message types

---

## What v4.1 Gets Right

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Cloud VPS, not a sandbox | ✅ Accurate | `useCloudMachine.ts` manages Fly.io machine lifecycle (provision → start → run → stop → destroy) |
| Any device | ✅ Accurate | Responsive web workspace + separate React Native app (`anubix-native`) |
| One-click deploy | ✅ Accurate | Setup wizard step 4 pushes to GitHub + deploys to Vercel |
| Multi-model support | ✅ Accurate | Chat mode supports GPT-5/5.2, Claude Opus 4/Sonnet 4, Gemini 3 Pro/Flash, Perplexity, DALL-E, Flux |
| No laptop required | ✅ Accurate | All compute runs server-side; device is just the interface |
| "Built Anubix on Anubix" | ✅ Plausible | Self-referential claim — consistent with the product's capabilities |
| You own your code | ✅ Accurate | GitHub push + Vercel deploy = full user ownership |

---

## What v4.1 Gets Wrong or Oversells

### 1. Voice Input (Ticker Strip)
**Claim:** Voice Input listed as a feature
**Reality:** No voice input implementation found in the workspace codebase.
**Action:** Removed from ticker strip in v4.2.

### 2. "Wispr Flow-grade voice input included" (Feature 02)
**Claim:** Wispr Flow-grade voice input is included with Claude Code.
**Reality:** Not found in codebase. No voice recording, transcription, or Wispr integration.
**Action:** Removed from v4.2.

### 3. "Hundreds via OpenRouter" (Comparison Table)
**Claim:** Anubix offers hundreds of models via OpenRouter.
**Reality:** The model picker in `lib/models/chat.ts` exposes ~15 curated models across providers (OpenAI, Anthropic, Google). OpenRouter is the routing layer, but users don't see "hundreds" in the UI.
**Action:** Changed to "All major models + OpenRouter" in v4.2.

### 4. "Flat rate" pricing (Comparison Table)
**Claim:** Anubix has flat rate pricing.
**Reality:** Pricing is pay-as-you-go credits + BYOK. The $10/mo founder pricing is for infrastructure, not a flat rate for unlimited model usage.
**Action:** Changed to "Pay as you go / BYOK" in v4.2.

### 5. "Gemini 3.1" (Feature 03)
**Claim:** "Use Gemini 3.1 for deep thinking."
**Reality:** Codebase shows Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 Flash. No "3.1."
**Action:** Corrected to "Gemini 3 Pro" in v4.2.

### 6. Agent Swarms (Ticker Strip)
**Claim:** Agent Swarms listed in ticker strip alongside shipped features.
**Reality:** No swarm/orchestration code in the repo. This is roadmap only.
**Action:** Removed from ticker strip. Still present in "What's Coming" with explicit roadmap disclaimer.

---

## What v4.1 Undersells or Misses

### 1. The Dual-Mode Workspace (Chat + Code)
**The gap:** v4.1 treats Chat and Code as features #2 and #3 in a list. In reality, the toggle between Chat and Code mode IS the core product experience. It's what users interact with every single session.
**Action in v4.2:** Elevated "The Workspace" to Feature #1, describing the dual-mode toggle as the central UX.

### 2. The Real Agent Experience in Code Mode
**The gap:** v4.1 says "connect your subscription" and focuses on cost savings. The actual Code mode is far more impressive: real-time tool use visibility, approval flows for destructive actions, clarifying questions for ambiguous prompts, token cost tracking per message, session management across projects.
**Action in v4.2:** Completely rewritten Feature #2 to describe the agent experience, not just the billing model.

### 3. BYOK (Bring Your Own Keys)
**The gap:** v4.1 mentions "connect your Claude subscription" for Code mode but never mentions that Chat mode supports bringing API keys from Anthropic, OpenAI, and Google — a major cost differentiator.
**Action in v4.2:** Added BYOK to Chat mode description, ticker strip, and comparison table (as a new row).

### 4. The Setup Wizard
**The gap:** v4.1's Templates section says "skip scaffolding, start shipping." The actual product has a guided 4-step wizard: Clerk auth → Supabase database → Clerk-Supabase auth sync → GitHub + Vercel deploy. This gets users to a production-ready SaaS stack in minutes.
**Action in v4.2:** Expanded Templates to "Templates + Guided Setup" and described the full wizard flow.

### 5. The Concrete User Journey
**The gap:** v4.1's "How It Works" section is too abstract: "Open Anubix / Pick a template / Describe what you want / Deploy." It doesn't convey the real flow.
**Action in v4.2:** Expanded to 5 concrete steps matching the actual codebase flow, including the setup wizard step.

---

## Summary of Changes (v4.1 → v4.2)

| Section | Change Type | Summary |
|---------|------------|---------|
| Hero subheadline | Refined | Now mentions Chat + Code + Ship (the actual three actions) |
| Ticker strip | Corrected | Removed Voice Input, Agent Swarms. Added Chat + Code Modes, BYOK |
| Feature #1 | **New** | "The Workspace" — dual Chat/Code mode as core product |
| Feature #2 (Claude Code) | Rewritten | Describes agent experience, not billing model |
| Feature #3 (Smart Chat) | Updated | Added BYOK, corrected model names |
| Feature #4 (Virtual Computer) | Demoted | Infrastructure, not the headline feature |
| Feature #5 (Templates) | Expanded | Now includes guided setup wizard description |
| How It Works | Rewritten | 5 concrete steps matching real user flow |
| Comparison table | Corrected | Fixed "Hundreds" → "All major models + OpenRouter", "Flat rate" → "Pay as you go / BYOK", added BYOK row |
| What's Coming | Fenced | Added explicit "roadmap, not shipped" disclaimer |
| Colour tokens | No change | — |
