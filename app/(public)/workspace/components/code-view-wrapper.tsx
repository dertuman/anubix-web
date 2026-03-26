'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useClaudeCodeContext } from '../context/claude-code-context';
import { useCloudMachineContext } from '../context/cloud-machine-context';
import { useEnvironmentDialog } from '../context/environment-dialog-context';
import { useWorkspace } from '../context/workspace-context';
import { CodeView } from '../../code/components/code-view';
import { ModeToggle } from './mode-toggle';
import { DemoPreviewOverlay } from './demo-preview-overlay';
import { MOCK_MESSAGES, MOCK_SESSION } from '@/lib/demo-data';

const MAX_AUTO_CONNECT_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 3000;

/**
 * Wrapper for CodeView in workspace context
 * Always shows the workspace UI, handles connection in background
 */
export function CodeViewWrapper() {
  const { isSignedIn } = useAuth();
  const { status, connect, connectionHealth } = useClaudeCodeContext();
  const cloudMachine = useCloudMachineContext();
  const { showEnvironmentDialog } = useEnvironmentDialog();
  const { isDemoMode, isDemoPreview, incrementDemoPromptCount } = useWorkspace();

  const attemptCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUrlRef = useRef<string | null>(null);
  const prevMachineStatusRef = useRef<string | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // Reset attempt counter when machine URL changes (new machine provisioned)
  useEffect(() => {
    const url = cloudMachine.machine?.bridgeUrl ?? null;
    if (url !== activeUrlRef.current) {
      activeUrlRef.current = url;
      attemptCountRef.current = 0;
      clearRetryTimer();
    }
  }, [cloudMachine.machine?.bridgeUrl, clearRetryTimer]);

  // Reset retry counter when machine transitions from stopped/starting → running
  // (URL doesn't change on resume, so the URL-change reset doesn't fire)
  useEffect(() => {
    const currentStatus = cloudMachine.machine?.status ?? null;
    const prev = prevMachineStatusRef.current;
    prevMachineStatusRef.current = currentStatus;

    if (
      currentStatus === 'running' &&
      (prev === 'stopped' || prev === 'starting' || prev === 'suspended')
    ) {
      attemptCountRef.current = 0;
      clearRetryTimer();
    }
  }, [cloudMachine.machine?.status, clearRetryTimer]);

  // Refresh machine status when WebSocket connection fails
  // If the machine actually stopped (Fly auto-suspend), machine.status updates to 'stopped'
  // and the UI shows "Environment suspended" with Resume.
  useEffect(() => {
    if (connectionHealth === 'failed' && cloudMachine.machine?.status === 'running') {
      cloudMachine.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionHealth]);

  // Reset retry counter on unexpected disconnect (bridge crash while machine is running)
  // Gives a fresh set of auto-connect attempts
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (
      prev === 'connected' &&
      status === 'disconnected' &&
      cloudMachine.machine?.status === 'running'
    ) {
      attemptCountRef.current = 0;
      clearRetryTimer();
    }
  }, [status, cloudMachine.machine?.status, clearRetryTimer]);

  // Auto-connect with limited retries and exponential backoff
  // Skip auto-connect in demo preview mode and during stop/start transitions
  useEffect(() => {
    if (
      isSignedIn &&
      !isDemoPreview &&
      status === 'disconnected' &&
      !cloudMachine.isWorking &&
      cloudMachine.machine?.status === 'running' &&
      cloudMachine.machine.bridgeUrl &&
      cloudMachine.machine.bridgeApiKey &&
      attemptCountRef.current < MAX_AUTO_CONNECT_ATTEMPTS &&
      !retryTimerRef.current
    ) {
      const attempt = attemptCountRef.current;
      const delay = attempt === 0 ? 0 : BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);

      const { bridgeUrl, bridgeApiKey } = cloudMachine.machine;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        attemptCountRef.current += 1;
        connect(bridgeUrl, bridgeApiKey);
      }, delay);
    }

    return clearRetryTimer;
  }, [isSignedIn, isDemoPreview, status, cloudMachine.machine, cloudMachine.isWorking, connect, clearRetryTimer]);

  // Show environment dialog for authenticated users without environment
  // Skip in demo preview mode
  useEffect(() => {
    if (
      isSignedIn &&
      !isDemoPreview &&
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
  }, [isSignedIn, isDemoPreview, status, cloudMachine.machine, cloudMachine.isLoading, showEnvironmentDialog]);


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

  // Render CodeView with demo preview mode if applicable
  if (isDemoPreview) {
    return (
      <div className="relative h-full">
        <CodeView
          modeToggle={<ModeToggle variant="sidebar" />}
          onPromptSent={handlePromptSent}
          demoPreviewMode={true}
          mockMessages={MOCK_MESSAGES}
          mockSession={MOCK_SESSION}
        />
        <DemoPreviewOverlay />
      </div>
    );
  }

  // Always render the full CodeView workspace for authenticated users
  return <CodeView modeToggle={<ModeToggle variant="sidebar" />} onPromptSent={handlePromptSent} />;
}
