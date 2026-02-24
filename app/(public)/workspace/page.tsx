'use client';

import { Suspense } from 'react';
import { Loader } from '@/components/ui/loader';
import { WorkspaceProvider } from './context/workspace-context';
import { EnvironmentDialogProvider } from './context/environment-dialog-context';
import { CloudMachineProvider } from './context/cloud-machine-context';
import { ClaudeCodeProvider } from './context/claude-code-context';
import { WorkspaceView } from './components/workspace-view';

function WorkspaceContent() {
  return (
    <CloudMachineProvider>
      <ClaudeCodeProvider>
        <WorkspaceProvider>
          <EnvironmentDialogProvider>
            <WorkspaceView />
          </EnvironmentDialogProvider>
        </WorkspaceProvider>
      </ClaudeCodeProvider>
    </CloudMachineProvider>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader variant="glowing" size="large" />
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
