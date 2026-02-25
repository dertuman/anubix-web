'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useClaudeCodeContext } from '../context/claude-code-context';
import { useCloudMachineContext } from '../context/cloud-machine-context';
import { useEnvironmentDialog } from '../context/environment-dialog-context';
import { useWorkspace } from '../context/workspace-context';
import { CodeView } from '../../code/components/code-view';
import { ModeToggle } from './mode-toggle';

/**
 * Wrapper for CodeView in workspace context
 * Always shows the workspace UI, handles connection in background
 */
export function CodeViewWrapper() {
  const { isSignedIn } = useAuth();
  const { status, connect } = useClaudeCodeContext();
  const cloudMachine = useCloudMachineContext();
  const { showEnvironmentDialog } = useEnvironmentDialog();
  const { isDemoMode, incrementDemoPromptCount } = useWorkspace();

  // Auto-connect when machine is running
  useEffect(() => {
    if (
      isSignedIn &&
      status === 'disconnected' &&
      cloudMachine.machine?.status === 'running' &&
      cloudMachine.machine.bridgeUrl &&
      cloudMachine.machine.bridgeApiKey
    ) {
      // Attempt background connection
      connect(cloudMachine.machine.bridgeUrl, cloudMachine.machine.bridgeApiKey);

      // Connection status changes will be tracked through the status dependency
    }
  }, [isSignedIn, status, cloudMachine.machine, connect, showEnvironmentDialog]);

  // Show environment dialog for authenticated users without environment
  useEffect(() => {
    if (
      isSignedIn &&
      status === 'disconnected' &&
      !cloudMachine.machine &&
      !cloudMachine.isLoading
    ) {
      // Auto-show dialog after a brief delay to let UI settle
      const timer = setTimeout(() => {
        showEnvironmentDialog();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, status, cloudMachine.machine, cloudMachine.isLoading, showEnvironmentDialog]);


  // Listen for custom event to open environment dialog
  useEffect(() => {
    const handleOpenDialog = () => {
      showEnvironmentDialog();
    };

    window.addEventListener('open-environment-dialog', handleOpenDialog);
    return () => window.removeEventListener('open-environment-dialog', handleOpenDialog);
  }, [showEnvironmentDialog]);

  // Track demo prompts for unauthenticated users
  const handlePromptSent = () => {
    if (!isSignedIn && isDemoMode) {
      incrementDemoPromptCount();
    }
  };

  // Always render the full CodeView workspace
  return <CodeView modeToggle={<ModeToggle variant="sidebar" />} onPromptSent={handlePromptSent} />;
}
