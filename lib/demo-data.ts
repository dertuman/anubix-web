import type { BridgeSession, CodeMessage } from '@/types/code';

/**
 * Mock data for demo preview mode
 * Shows a realistic conversation of building a React todo component
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
