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
  const { status, connect, connectionHealth, connectionError } = useClaudeCodeContext();
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

  // Reset retry counter when: URL changes, machine transitions to running, or unexpected disconnect
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    let shouldReset = false;

    // URL changed (new machine provisioned)
    const url = cloudMachine.machine?.bridgeUrl ?? null;
    if (url !== activeUrlRef.current) {
      activeUrlRef.current = url;
      shouldReset = true;
    }

    // Machine transitioned to running from stopped/starting
    const currentMachineStatus = cloudMachine.machine?.status ?? null;
    const prevMachine = prevMachineStatusRef.current;
    prevMachineStatusRef.current = currentMachineStatus;
    if (
      currentMachineStatus === 'running' &&
      (prevMachine === 'stopped' || prevMachine === 'starting' || prevMachine === 'suspended')
    ) {
      shouldReset = true;
    }

    // Unexpected disconnect while machine is running (bridge crash)
    const prevConn = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prevConn === 'connected' && status === 'disconnected' && currentMachineStatus === 'running') {
      shouldReset = true;
    }

    if (shouldReset) {
      attemptCountRef.current = 0;
      clearRetryTimer();
    }
  }, [cloudMachine.machine?.bridgeUrl, cloudMachine.machine?.status, status, clearRetryTimer]);

  // Refresh machine status when connection fails or connect() errors while machine is 'running'
  // Detects Fly auto-stop so UI can show "Environment Suspended" with Resume button
  useEffect(() => {
    if (
      cloudMachine.machine?.status === 'running' &&
      (connectionHealth === 'failed' || connectionError)
    ) {
      cloudMachine.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionHealth, connectionError]);

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
