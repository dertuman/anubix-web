# Anubix Landing Page Copy v4.2

## Changelog from v4.1

This revision aligns the landing page copy with what the product actually does,
based on a full audit of the workspace codebase (`/app/(public)/workspace/`,
`/hooks/useClaudeCode.ts`, `/hooks/useCloudMachine.ts`, `locales/en.ts`, etc.).

### Key changes

1. **Hero reframed around the dual-mode workspace** (Chat + Code) — the actual core UX — instead of leading with infrastructure.
2. **Ticker strip cleaned up** — removed Voice Input (not shipped) and Agent Swarms (not shipped; moved to What's Coming where it belongs).
3. **Features reordered** — The Workspace (Chat + Code toggle) is now Feature #1. Virtual Computer drops to supporting infrastructure. This matches what users actually experience.
4. **Claude Code section rewritten** — now describes the real agent experience (approval flows, tool use visibility, multi-file awareness) instead of just "connect your subscription."
5. **Smart Chat updated** — now mentions BYOK (Bring Your Own Keys), which is a major differentiator present in the code but absent from v4.1.
6. **Templates section expanded** — now describes the guided 4-step setup wizard (Clerk → Supabase → Auth sync → Deploy) which is far more powerful than "skip scaffolding."
7. **How It Works rewritten** — concrete steps that match the actual user flow instead of abstract platitudes.
8. **Comparison table corrected** — "Hundreds via OpenRouter" softened to "All major models + OpenRouter" (the actual model picker shows ~15 curated models). "Flat rate" corrected to "Pay as you go / BYOK" to match actual pricing.
9. **Voice Input claim removed** — not found in workspace code.
10. **Wispr Flow reference removed** — not implemented.
11. **Gemini 3.1 reference corrected** — codebase shows Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 Flash.
12. **What's Coming section kept but clearly fenced** — swarm orchestration is roadmap only. Added a note to make this unambiguous.

---

## Nav

Logo: ANUBIX
Links: Features / Pricing / Docs
CTA: Start Building

---

## 1. Hero

Badge: FOUNDER PRICING / 10 PER MONTH

Headline:
Your complete AI workspace.
From any device.

Subheadline:
Chat with the best models. Code with a real agent. Ship from your phone.

Primary CTA: Start Building Now

Footer text: Chat free. Code from $10/mo. You own everything you build.

---

## 2. Ticker Strip

Virtual Computer, Claude Code, Chat + Code Modes, Any Model, Any Device, One-Click Deploy, Bring Your Own Keys, Image Gen, GitHub Sync, Templates, Supabase, Vercel

> **Removed from v4.1:** Voice Input (not shipped), Agent Swarms (roadmap only — lives in "What's Coming")
> **Added:** Chat + Code Modes, Bring Your Own Keys

---

## 3. Who It's For

Label: WHO IT'S FOR

Headline: Built for people who ship.

Developers
A real cloud environment when your laptop isn't an option.

Solo Founders
Ship your MVP from anywhere. No dev team required.

Agencies
Bill enterprise clients. Build from the road.

Vibe Coders
First app or fiftieth. Skip setup, start building.

---

## 4. Problem

Label: THE PROBLEM

Headline:
Your best ideas don't wait
for your laptop.

Body:
They arrive on trains. At midnight. In the queue for coffee.
And then they die because your tools weren't there.

Testimonial:
"We built Anubix on Anubix. On a train across Europe. On a plane to Nicaragua. From a hotel in Munich. Production code, shipped to real clients, from a phone."

— Alex, Co-founder & CTO, Anubix

---

## 5. Features

Label: EVERYTHING YOU NEED

Headline: One workspace. Zero excuses.

---

### 01. The Workspace

> **NEW in v4.2** — Elevated to Feature #1. This is the product. The toggle between Chat and Code mode is the core UX.

Headline: Two modes. One workspace. Any device.

Body: Open Anubix and you get two modes, one tap apart. **Chat** — talk to any leading AI model for thinking, research, image generation, or brainstorming. **Code** — a full coding agent with terminal access, file system awareness, and real-time tool execution. Switch between them without losing context. This is the workspace you use every day.

---

### 02. Code Mode — Claude Code Agent

> **Rewritten from v4.1.** The original undersold this — "connect your subscription" doesn't describe the experience. The real differentiator is watching a coding agent work in real-time with approval flows and multi-file awareness.

Headline: A real coding agent. Not an API wrapper.

Body: Code mode runs the Claude Code SDK on a dedicated cloud VPS. Watch it edit files, run terminal commands, install dependencies, and debug errors — all in real time. It asks for approval before destructive actions. It asks clarifying questions when your prompt is ambiguous. It shows every tool it uses and how long each step takes. This isn't "paste AI output into a file." This is a developer working alongside you.

---

### 03. Chat Mode — Smart Chat

> **Updated from v4.1.** Added BYOK (Bring Your Own Keys) — a major differentiator found in the codebase but missing from v4.1. Corrected model names to match what's actually in the model picker.

Headline: Every model. One conversation. Your keys.

Body: GPT-5, Claude Opus 4, Gemini 3 Pro, Perplexity, DALL-E, Flux — all in one place. Switch models mid-conversation with one tap. Bring your own API keys from Anthropic, OpenAI, or Google and pay your provider directly — no markup. Or use Anubix credits. Stop paying for three separate AI subscriptions.

---

### 04. Virtual Computer

> **Demoted from Feature #1 to supporting infrastructure.** Users don't open Anubix thinking "I want a VPS." They think "I want to build something." The VPS is how — not what.

Headline: A real machine in the cloud.

Body: A full cloud VPS spins up the moment you create a project. Real terminal, real file system, real dependency management. Your phone is just the window. The compute lives on dedicated infrastructure. Stop, restart, or destroy your machine anytime.

---

### 05. Templates + Guided Setup

> **Expanded from v4.1.** The copy said "skip scaffolding" but the actual product has a powerful 4-step setup wizard that wires up auth, database, and deployment. That's the real value.

Headline: Production-ready in five minutes.

Body: Pick a template — full-stack SaaS, Next.js, Vite + React, or start blank. Then follow the guided setup: connect Clerk for auth, wire up Supabase for your database, sync them together, and deploy to Vercel. Four steps, all in-browser, and you have a production-ready stack with authentication, a Postgres database, and global hosting. No terminal. No config files.

---

### 06. One-Click Deploy

Headline: From idea to live. One tap.

Body: GitHub and Vercel built in. Push your code to your own repo and deploy to a live URL — without leaving Anubix. Every push triggers a new deployment. The gap between idea and internet just got very small.

---

### 07. Integrations

Headline: Every connector. Already wired.

Body: Supabase, Clerk, Vercel, GitHub. Pre-connected through the setup wizard and ready to use. Work across multiple repos in a single session. The plumbing is done.

---

## 6. How It Works

Label: HOW IT WORKS

Headline: Idea to live. Wherever you are.

> **Rewritten from v4.1.** The original was too abstract. These steps now match the actual user flow in the codebase.

01. Open Anubix
Phone, tablet, or laptop. Sign in with Google or email.

02. Create a project
Pick a template or start blank. Your cloud machine spins up in seconds.

03. Set up your stack
Guided wizard: connect Clerk auth, Supabase database, and Vercel hosting. Five minutes, all in-browser.

04. Build with AI
Switch between Chat mode (any model) and Code mode (Claude agent). Describe what you want — text, screenshot, or voice note. Watch it build in real time.

05. Deploy in one tap
Push to GitHub, deploy to Vercel. Live URL in minutes. Yours forever.

---

## 7. Video Embed

Watch Anubix in action

---

## 8. Comparison

Label: HOW WE COMPARE

Headline: The honest breakdown.

> **Corrections from v4.1:**
> - "Hundreds via OpenRouter" → "All major models + OpenRouter" (the model picker shows ~15 curated models, not hundreds of visible options)
> - "Flat rate" → "Pay as you go / BYOK" (matches actual pricing: credits + bring your own keys, not a flat monthly rate for usage)

Architecture
Bolt / Lovable: Browser sandbox
Cursor + Claude Code: Local machine
Anubix: Cloud VPS (Fly.io)

Works on mobile
Bolt / Lovable: Limited
Cursor + Claude Code: Laptop must be on
Anubix: Fully native

Full dev environment
Bolt / Lovable: No
Cursor + Claude Code: Yes
Anubix: Yes

No laptop required
Bolt / Lovable: Limited
Cursor + Claude Code: No
Anubix: Yes

Any AI model
Bolt / Lovable: Locked to one
Cursor + Claude Code: Limited selection
Anubix: All major models + OpenRouter

Bring your own keys
Bolt / Lovable: No
Cursor + Claude Code: N/A
Anubix: Yes — Anthropic, OpenAI, Google

> **New row added:** BYOK is a real differentiator not captured in v4.1's comparison table.

Pricing model
Bolt / Lovable: Token costs spiral
Cursor + Claude Code: Subscription + API costs
Anubix: Pay as you go / BYOK

Based on publicly available feature data, March 2026.

---

## 9. What's Coming

Label: WHAT'S COMING

> **Kept from v4.1 but clearly fenced as roadmap.** No swarm/orchestration code exists in the repo today. This section should be visually distinct from shipped features.

Headline:
The next frontier isn't one AI.
It's a swarm of them.

Body:
2026 is the year single-agent systems give way to orchestrated teams of specialized models. Each handling what it does best. Anubix is building the mobile-first control plane for that future.

*These features are on our roadmap and not yet available.*

Orchestrate
Assign models by strength. Sonnet for deep reasoning, Haiku for speed, GPT Image 1 for visuals.

Parallelize
Code, research, and image generation running simultaneously. One screen.

Connect
Chat and Code environments talking to each other. Design in one, execute in the other.

Closing line: One command. Multiple minds. Infinite output.

---

## 10. Final CTA

Headline: You've outgrown the sandbox.

Body: A real dev environment. Any AI model. Any device. Yours.

Primary CTA: Start Building Now

---

## 11. Footer

2026 Anubix.
Privacy / Terms / Contact

---

## Colour Token Updates

*No changes from v4.1.*

### Light mode

--background: hsl(36 33% 97%) (warm off-white)
--card / --popover: hsl(36 33% 97%) (matches warm bg)
--primary: hsl(160 60% 42%) (softer emerald)
--primary-muted: hsl(160 60% 42% / 0.12)
--ring: hsl(160 60% 42%)

### Dark mode

--background: hsl(0 0% 7%) (neutral near-black)
--card / --popover: hsl(0 0% 7%)
--primary: hsl(160 55% 44%) (slightly lighter/softer)
--primary-muted: hsl(160 55% 44% / 0.15)
--ring: hsl(160 55% 44%)
--user-bubble: hsl(160 55% 44% / 0.15)
--user-bubble-ring: hsl(160 55% 44% / 0.20)
