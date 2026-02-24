'use client';

import { CloudMachineProvider } from '../workspace/context/cloud-machine-context';
import { ClaudeCodeProvider } from '../workspace/context/claude-code-context';
import { CodeView } from './components/code-view';

export default function CodePage() {
  return (
    <CloudMachineProvider>
      <ClaudeCodeProvider>
        <CodeView />
      </ClaudeCodeProvider>
    </CloudMachineProvider>
  );
}
