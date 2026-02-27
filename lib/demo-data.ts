import type { BridgeSession, CodeMessage } from '@/types/code';
import type { ChatConversation, ChatMessage } from '@/types/chat';

/**
 * Mock data for demo preview mode
 * Shows realistic conversations for both Code and Chat modes
 */

export const MOCK_SESSION: BridgeSession = {
  id: 'preview-session',
  name: 'React Todo App (Preview)',
  repoPath: '/workspace/todo-app',
  status: 'idle',
  createdAt: Date.now() - 1000 * 60 * 15, // 15 minutes ago
  lastActiveAt: Date.now(),
  mode: 'sdk',
};

export const MOCK_MESSAGES: CodeMessage[] = [
  // User request
  {
    id: 'msg-1',
    type: 'user',
    text: 'Create a React todo component with add, complete, and delete functionality. Use TypeScript and make it beautiful with Tailwind CSS.',
    ts: Date.now() - 1000 * 60 * 12,
  },

  // Assistant thinking
  {
    id: 'msg-2',
    type: 'assistant_text',
    text: "I'll create a beautiful React todo component with TypeScript and Tailwind CSS. Let me start by reading the existing project structure to understand where to place the component.",
    isComplete: true,
    ts: Date.now() - 1000 * 60 * 11.5,
  },

  // Read file
  {
    id: 'msg-3',
    type: 'tool_use',
    toolName: 'Read',
    toolInput: {
      file_path: '/workspace/todo-app/src/App.tsx',
    },
    isComplete: true,
    durationMs: 120,
    ts: Date.now() - 1000 * 60 * 11,
  },

  {
    id: 'msg-4',
    type: 'result',
    resultText: 'Successfully read App.tsx (45 lines)',
    ts: Date.now() - 1000 * 60 * 10.9,
  },

  // Assistant planning
  {
    id: 'msg-5',
    type: 'assistant_text',
    text: "Perfect! Now I'll create a comprehensive todo component with a clean interface. The component will include:\n\n• Add new todos with an input field\n• Mark todos as complete with visual feedback\n• Delete todos with a smooth animation\n• Beautiful Tailwind styling with gradient accents\n• TypeScript for type safety\n\nLet me write the component:",
    isComplete: true,
    ts: Date.now() - 1000 * 60 * 10.5,
  },

  // Write component
  {
    id: 'msg-6',
    type: 'tool_use',
    toolName: 'Write',
    toolInput: {
      file_path: '/workspace/todo-app/src/components/TodoList.tsx',
      content: '// Component code would be here...',
    },
    isComplete: true,
    durationMs: 450,
    ts: Date.now() - 1000 * 60 * 10,
  },

  {
    id: 'msg-7',
    type: 'result',
    resultText: 'Successfully created TodoList.tsx',
    ts: Date.now() - 1000 * 60 * 9.5,
  },

  // Update App.tsx
  {
    id: 'msg-8',
    type: 'assistant_text',
    text: "Now I'll integrate the component into your App.tsx:",
    isComplete: true,
    ts: Date.now() - 1000 * 60 * 9,
  },

  {
    id: 'msg-9',
    type: 'tool_use',
    toolName: 'Edit',
    toolInput: {
      file_path: '/workspace/todo-app/src/App.tsx',
      old_string: 'function App() {',
      new_string: "import { TodoList } from './components/TodoList';\n\nfunction App() {",
    },
    isComplete: true,
    durationMs: 180,
    ts: Date.now() - 1000 * 60 * 8.5,
  },

  {
    id: 'msg-10',
    type: 'result',
    resultText: 'Successfully updated App.tsx with TodoList import',
    ts: Date.now() - 1000 * 60 * 8,
  },

  // Run tests
  {
    id: 'msg-11',
    type: 'assistant_text',
    text: 'Let me verify everything works by running the development server:',
    isComplete: true,
    ts: Date.now() - 1000 * 60 * 7.5,
  },

  {
    id: 'msg-12',
    type: 'tool_use',
    toolName: 'Bash',
    toolInput: {
      command: 'npm run dev',
      description: 'Start the development server',
    },
    isComplete: true,
    durationMs: 2400,
    ts: Date.now() - 1000 * 60 * 7,
  },

  {
    id: 'msg-13',
    type: 'result',
    resultText: '✓ Development server started successfully on http://localhost:5173\n✓ No TypeScript errors\n✓ Ready for development',
    inputTokens: 2450,
    outputTokens: 890,
    duration: 4.2,
    cost: 0.0156,
    ts: Date.now() - 1000 * 60 * 5,
  },

  // Success message
  {
    id: 'msg-14',
    type: 'assistant_text',
    text: "Perfect! 🎉 I've created a beautiful React todo component with the following features:\n\n**✨ Features:**\n• Clean, modern interface with gradient accents\n• Add todos with Enter key or click\n• Toggle completion status with visual feedback\n• Delete todos with smooth animations\n• Fully typed with TypeScript\n• Responsive Tailwind CSS styling\n• Hover effects and transitions\n\n**📁 Files created:**\n• `src/components/TodoList.tsx` - Main component\n• Updated `src/App.tsx` - Integrated the component\n\nThe dev server is running at **http://localhost:5173** - you can see your todo app live!\n\nWould you like me to add any additional features like filtering, local storage persistence, or priority levels?",
    isComplete: true,
    ts: Date.now() - 1000 * 60 * 4,
  },
];

// ── Mock Chat Data ──────────────────────────────────────────────

export const MOCK_CHAT_CONVERSATION: ChatConversation = {
  id: 'preview-chat-conv',
  email: 'demo@example.com',
  title: 'Building a Landing Page',
  model: 'gemini-2.5-flash',
  message_count: 6,
  is_shared: false,
  share_id: null,
  created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  updated_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
};

export const MOCK_CHAT_CONVERSATIONS: ChatConversation[] = [
  MOCK_CHAT_CONVERSATION,
  {
    id: 'preview-chat-conv-2',
    email: 'demo@example.com',
    title: 'Debug API Authentication',
    model: 'gpt-4o',
    message_count: 4,
    is_shared: false,
    share_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'preview-chat-conv-3',
    email: 'demo@example.com',
    title: 'Explain Async/Await',
    model: 'claude-sonnet-4-20250514',
    message_count: 2,
    is_shared: false,
    share_id: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'chat-msg-1',
    conversation_id: 'preview-chat-conv',
    role: 'user',
    content: 'Help me design a modern landing page for a SaaS product. I want it to have a hero section, features grid, pricing section, and a call-to-action. Use Next.js and Tailwind CSS.',
    images: null,
    files: null,
    model: null,
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'chat-msg-2',
    conversation_id: 'preview-chat-conv',
    role: 'assistant',
    content: "Great choice! Here's a complete landing page structure for your SaaS product using Next.js and Tailwind CSS.\n\n## Hero Section\n```tsx\nexport function Hero() {\n  return (\n    <section className=\"relative overflow-hidden bg-gradient-to-b from-primary/5 to-background px-6 py-24\">\n      <div className=\"mx-auto max-w-4xl text-center\">\n        <h1 className=\"text-5xl font-bold tracking-tight\">\n          Ship faster with <span className=\"text-primary\">AI-powered</span> workflows\n        </h1>\n        <p className=\"mt-6 text-lg text-muted-foreground\">\n          Automate your development pipeline and deploy with confidence.\n        </p>\n        <div className=\"mt-10 flex justify-center gap-4\">\n          <Button size=\"lg\">Get Started Free</Button>\n          <Button size=\"lg\" variant=\"outline\">Watch Demo</Button>\n        </div>\n      </div>\n    </section>\n  );\n}\n```\n\n## Features Grid\nI recommend a 3-column grid with icons, titles, and descriptions:\n\n```tsx\nconst features = [\n  { icon: Zap, title: 'Lightning Fast', desc: 'Deploy in seconds, not minutes' },\n  { icon: Shield, title: 'Secure by Default', desc: 'Enterprise-grade security built in' },\n  { icon: BarChart, title: 'Analytics', desc: 'Real-time insights into your app' },\n];\n```\n\nThis gives you a clean, professional layout that converts well. Want me to add the pricing section next?",
    images: null,
    files: null,
    model: 'gemini-2.5-flash',
    created_at: new Date(Date.now() - 1000 * 60 * 17).toISOString(),
  },
  {
    id: 'chat-msg-3',
    conversation_id: 'preview-chat-conv',
    role: 'user',
    content: 'Yes! Add the pricing section with three tiers: Free, Pro, and Enterprise.',
    images: null,
    files: null,
    model: null,
    created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: 'chat-msg-4',
    conversation_id: 'preview-chat-conv',
    role: 'assistant',
    content: "Here's a beautiful pricing section with three tiers:\n\n```tsx\nconst plans = [\n  {\n    name: 'Free',\n    price: '$0',\n    description: 'Perfect for side projects',\n    features: ['1 project', '100 deployments/mo', 'Community support'],\n    cta: 'Start Free',\n    highlighted: false,\n  },\n  {\n    name: 'Pro',\n    price: '$29',\n    description: 'For growing teams',\n    features: ['Unlimited projects', 'Unlimited deployments', 'Priority support', 'Custom domains', 'Analytics dashboard'],\n    cta: 'Start Pro Trial',\n    highlighted: true, // Popular badge\n  },\n  {\n    name: 'Enterprise',\n    price: 'Custom',\n    description: 'For large organizations',\n    features: ['Everything in Pro', 'SSO & SAML', 'Dedicated support', 'SLA guarantee', 'Custom integrations'],\n    cta: 'Contact Sales',\n    highlighted: false,\n  },\n];\n```\n\nThe **Pro** tier has a highlighted border and a \"Most Popular\" badge to guide users toward the best-value option. Each card uses `hover:shadow-lg` for a subtle lift effect.\n\nWant me to add animations with Framer Motion or the final CTA section?",
    images: null,
    files: null,
    model: 'gemini-2.5-flash',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'chat-msg-5',
    conversation_id: 'preview-chat-conv',
    role: 'user',
    content: 'Add the CTA section and some smooth scroll animations!',
    images: null,
    files: null,
    model: null,
    created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: 'chat-msg-6',
    conversation_id: 'preview-chat-conv',
    role: 'assistant',
    content: "Here's the final CTA section with Framer Motion animations:\n\n```tsx\nimport { motion } from 'framer-motion';\n\nexport function CTA() {\n  return (\n    <motion.section\n      initial={{ opacity: 0, y: 40 }}\n      whileInView={{ opacity: 1, y: 0 }}\n      viewport={{ once: true }}\n      className=\"bg-primary/5 px-6 py-24\"\n    >\n      <div className=\"mx-auto max-w-2xl text-center\">\n        <h2 className=\"text-3xl font-bold\">\n          Ready to supercharge your workflow?\n        </h2>\n        <p className=\"mt-4 text-muted-foreground\">\n          Join 10,000+ developers shipping faster with our platform.\n        </p>\n        <Button size=\"lg\" className=\"mt-8\">\n          Get Started — It's Free\n        </Button>\n      </div>\n    </motion.section>\n  );\n}\n```\n\nFor scroll animations on all sections, wrap each one with:\n```tsx\n<motion.div\n  initial={{ opacity: 0, y: 30 }}\n  whileInView={{ opacity: 1, y: 0 }}\n  transition={{ duration: 0.6 }}\n  viewport={{ once: true, margin: '-100px' }}\n>\n  {/* Section content */}\n</motion.div>\n```\n\nYour landing page is now complete with:\n- **Hero** with gradient background\n- **Features** grid with icons\n- **Pricing** with 3 tiers and highlighted Pro plan\n- **CTA** with scroll-triggered animations\n\nAll fully responsive and accessible! Would you like me to help with anything else?",
    images: null,
    files: null,
    model: 'gemini-2.5-flash',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];
