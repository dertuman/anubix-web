# Anubix Landing Page

---

## Colour System

### Light Mode
| Token              | Value                          | Description                |
|--------------------|--------------------------------|----------------------------|
| Background         | `hsl(36 33% 97%)` (#faf8f5)   | Warm off-white             |
| Foreground         | `hsl(0 0% 10%)`               | Near-black text            |
| Card               | `hsl(36 33% 97%)`             | Same as background         |
| Primary            | `hsl(160 60% 42%)`            | Emerald green              |
| Primary foreground | `hsl(0 0% 100%)`              | White on primary           |
| Primary muted      | `hsl(160 60% 42% / 0.12)`     | Subtle emerald tint        |
| Secondary / Muted  | `hsl(0 0% 93%)`               | Light grey                 |
| Muted foreground   | `hsl(0 0% 40%)`               | Mid grey text              |
| Border / Input     | `hsl(0 0% 82%)`               | Light grey border          |
| Ring               | `hsl(160 60% 42%)`            | Emerald focus ring         |
| Destructive        | `hsl(350 80% 46%)`            | Red                        |
| Success            | `hsl(142 71% 45%)`            | Green                      |
| Warning            | `hsl(38 92% 50%)`             | Amber                      |
| Info               | `hsl(217 91% 60%)`            | Blue                       |

### Dark Mode
| Token              | Value                          | Description                |
|--------------------|--------------------------------|----------------------------|
| Background         | `hsl(0 0% 7%)` (#121212)      | Near-black                 |
| Foreground         | `hsl(0 0% 98%)`               | Near-white text            |
| Card               | `hsl(0 0% 7%)`                | Same as background         |
| Primary            | `hsl(160 55% 44%)`            | Slightly brighter emerald  |
| Primary foreground | `hsl(0 0% 98%)`               | Near-white on primary      |
| Primary muted      | `hsl(160 55% 44% / 0.15)`     | Subtle emerald tint        |
| Secondary / Muted  | `hsl(240 3.7% 15.9%)`         | Dark zinc grey             |
| Muted foreground   | `hsl(240 5% 64.9%)`           | Muted lavender-grey text   |
| Border / Input     | `hsl(240 3.7% 15.9%)`         | Dark zinc border           |
| Ring               | `hsl(160 55% 44%)`            | Emerald focus ring         |
| Destructive        | `hsl(350 75% 42%)`            | Slightly muted red         |
| Success            | `hsl(142 71% 45%)`            | Green (same)               |
| Warning            | `hsl(38 92% 50%)`             | Amber (same)               |
| Info               | `hsl(217 91% 60%)`            | Blue (same)                |

### Design Notes
- **Border radius:** `0.625rem` (10px)
- **Font weight:** Body 400, headings 500
- **Brand colour:** Emerald green across both modes, slightly adjusted for contrast
- **Radial gradients:** Each section uses a subtle `radial-gradient` with `primary-muted` for depth (opacity 20–30%)
- **Cards:** Same background as page, distinguished by border + hover state (`border-primary/20`, `bg-primary-muted`)
- **Prompt box:** Animated border glow using primary colour gradient

---

## Hero

**Your complete AI workspace. From any device.**

Think with the best models. Build and ship without a desktop.

[Prompt box: "What do you want to build?"]

or try the AI chat free →

Chat free. Code from €10/mo. You own everything you build.

---

## Who it's for

**Built for builders.**

### Developers
Want Claude Code anywhere? Run it in the cloud. Access from your phone, tablet, or laptop. No local setup.

### Vibe coders & founders
Outgrown Bolt and Lovable? This is what's next. A real dev environment you can talk to, from any device.

---

## Built with Anubix

**We use Anubix to build Anubix.**

Not as a gimmick. Because it's the fastest way to ship.

[Demo video]

---

## Platform

**Everything you need to ship.**

A real dev environment you talk to. Code, preview, chat, and connect — all from one place.

### Claude Code on mobile
Claude Code running in the cloud. Fully responsive. Code from your phone, tablet, or laptop.

### VM with live preview
Every project runs in a real VM. See your changes live as the agent builds.

### Chat with the best models
Claude, GPT, and Gemini in one place. Text, images, audio, and files.

### Tunnel to local
Connect your local machine for free. Great for trying Anubix or advanced workflows.

[Start building — €10/mo →]

---

## Under the hood

**Everything runs in the cloud. That's the difference.**

AI coding tools make trade-offs. Here's how they compare.

|               | Simple builders    | Developer tools      | **Anubix**            |
|---------------|--------------------|----------------------|-----------------------|
| Architecture  | Browser sandbox    | Local machine        | **Cloud VPS**         |
| Scope         | Single-file focus  | Full environment     | **Full environment**  |
| Devices       | Any device         | Desktop only         | **Any device**        |
| Complexity    | Limited            | Unlimited            | **Unlimited**         |
| Interface     | Conversational     | Terminal / IDE       | **Conversational**    |
| Models        | One model          | One model (usually)  | **Claude, GPT, Gemini** |

---

## Pricing

**Simple pricing. No surprises.**

### Chat — Free
Chat with Claude, GPT, and Gemini in one place.
- Access to Claude, GPT, and Gemini
- Text, image, audio, and file support
- Switch models mid-conversation
- No credit card required

[Start with Chat free →]

### Code — €10/mo *(Most popular)*
Unlock your cloud dev environment.
- Full cloud VPS with agents, terminal, and file system
- Access from any device
- One-click deploy to Vercel and GitHub
- Bring your own API key (Claude, OpenAI, etc.)
- No lock-in. Cancel anytime.

[Unlock Code - €10/mo →]

### Bring your own key — Your costs
Already paying for Claude Max, OpenAI, or others?
- Connect your existing API keys
- Use your subscriptions through Anubix
- We provide the cloud infrastructure
- You control your costs completely

[Get started →]

---

## FAQ

**Questions & answers**

**How is this different from Bolt or Lovable?**
Bolt and Lovable run in browser sandboxes. They're great for landing pages and simple apps, but they hit a ceiling fast. Anubix runs a full coding agent in a cloud VPS with real file system access, terminal commands, and multi-file awareness. It handles the complexity that sandbox tools can't.

**How is this different from Cursor or Claude Code?**
Cursor and Claude Code are powerful developer tools, but they require a desktop and a certain level of technical knowledge. Anubix gives you that same infrastructure through a conversational interface. And because everything runs in the cloud, you can access it from any device, including your phone.

**Can I really code from my phone?**
Yes. The coding agent runs in the cloud. Your phone is just the interface. The experience is the same on every device because the compute isn't on your machine.

**Why does Code cost €10?**
When you unlock Code, we spin up a real cloud computer for you. That's actual infrastructure, not a browser sandbox. €10 gets you in the door. After that, you bring your own API key or top up credits as you go. No monthly fees. For context, Cursor costs $20/month and Bolt Pro costs $25/month.

**What AI models can I use?**
Claude, GPT, and Gemini — the three most capable models available. Chat with text, images, audio, and files. Switch between them mid-conversation with one tap.

**Do I own my code?**
100%. Push to GitHub, deploy to Vercel, download the files. Nothing is locked in.

**What if I already pay for Claude or ChatGPT?**
Bring your own API keys. You pay your model provider directly. We provide the cloud infrastructure.

**Is this for developers?**
Anubix is for anyone who builds with AI. Whether you're a vibe coder who's outgrown the simple tools or a developer who wants a cloud-native environment they can access from anywhere. If you can describe what you want to build, you can use Anubix.

---

## CTA

**You've outgrown the sandbox. This is what's next.**

A real dev environment. The best AI models. Any device. Yours.

[Start with Chat free →] [Unlock Code - €10/mo →]

Less than the cost of one month of any other tool.
