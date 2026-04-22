'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useClaudeCodeContext } from '../context/claude-code-context';
import { useCloudMachineContext } from '../context/cloud-machine-context';
import { useEnvironmentDialog } from '../context/environment-dialog-context';
import { useWorkspace } from '../context/workspace-context';
import { useBridgeConfig } from '@/hooks/useBridgeConfig';
import { CodeView } from '../../code/components/code-view';
import { ModeToggle } from './mode-toggle';
import { DemoPreviewOverlay } from './demo-preview-overlay';
import { MOCK_MESSAGES, MOCK_SESSION } from '@/lib/demo-data';

/** Bridge is considered "online" if it heartbeated within this window. */
const LOCAL_BRIDGE_ONLINE_WINDOW_MS = 2 * 60 * 1000;

function isRecent(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return !Number.isNaN(t) && Date.now() - t < LOCAL_BRIDGE_ONLINE_WINDOW_MS;
}

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
  const bridgeConfig = useBridgeConfig();

  // Resolve which environment to connect to. Local wins over cloud when
  // configured — we don't want to auto-boot a cloud machine behind the user's
  // back if they've set up a laptop bridge.
  const target = useMemo(() => {
    const localOnline =
      !!bridgeConfig.config?.bridgeUrl &&
      !!bridgeConfig.config.apiKey &&
      isRecent(bridgeConfig.config.lastSeenAt);

    if (localOnline && bridgeConfig.config?.bridgeUrl) {
      return {
        source: 'local' as const,
        bridgeUrl: bridgeConfig.config.bridgeUrl,
        bridgeApiKey: bridgeConfig.config.apiKey,
      };
    }
    if (
      cloudMachine.machine?.status === 'running' &&
      cloudMachine.machine.bridgeUrl &&
      cloudMachine.machine.bridgeApiKey
    ) {
      return {
        source: 'cloud' as const,
        bridgeUrl: cloudMachine.machine.bridgeUrl,
        bridgeApiKey: cloudMachine.machine.bridgeApiKey,
      };
    }
    return null;
  }, [bridgeConfig.config, cloudMachine.machine]);

  /** User has a local bridge configured (install token issued), regardless of
   *  whether it's currently online — the workspace should wait for it rather
   *  than pop the environment picker. */
  const hasLocalEnvironment = !!bridgeConfig.config?.hasInstallToken;

  // Keep polling while we have a local bridge that isn't reporting in yet, so
  // the UI flips to "connected" as soon as the user's laptop comes back online.
  useEffect(() => {
    if (hasLocalEnvironment && target?.source !== 'local') {
      bridgeConfig.startPolling();
      return bridgeConfig.stopPolling;
    }
    bridgeConfig.stopPolling();
  }, [hasLocalEnvironment, target?.source, bridgeConfig]);

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

  // Reset retry counter when: target URL changes, cloud machine transitions to
  // running, or we see an unexpected disconnect while a target is available.
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    let shouldReset = false;

    // Target URL changed (new machine provisioned, local bridge came online, or switched source)
    const url = target?.bridgeUrl ?? null;
    if (url !== activeUrlRef.current) {
      activeUrlRef.current = url;
      shouldReset = true;
    }

    // Cloud machine transitioned to running from stopped/starting
    const currentMachineStatus = cloudMachine.machine?.status ?? null;
    const prevMachine = prevMachineStatusRef.current;
    prevMachineStatusRef.current = currentMachineStatus;
    if (
      currentMachineStatus === 'running' &&
      (prevMachine === 'stopped' || prevMachine === 'starting' || prevMachine === 'suspended')
    ) {
      shouldReset = true;
    }

    // Unexpected disconnect while we still have a target (bridge crash)
    const prevConn = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prevConn === 'connected' && status === 'disconnected' && target) {
      shouldReset = true;
    }

    if (shouldReset) {
      attemptCountRef.current = 0;
      clearRetryTimer();
    }
  }, [target, cloudMachine.machine?.status, status, clearRetryTimer]);

  // Refresh cloud machine status when a cloud target fails
  // Detects Fly auto-stop so UI can show "Environment Suspended" with Resume button
  useEffect(() => {
    if (
      target?.source === 'cloud' &&
      cloudMachine.machine?.status === 'running' &&
      (connectionHealth === 'failed' || connectionError)
    ) {
      cloudMachine.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionHealth, connectionError, target?.source]);

  // Refresh local bridge state when a local target fails — laptop may have
  // gone to sleep, so we need to notice `last_seen_at` going stale.
  useEffect(() => {
    if (
      target?.source === 'local' &&
      (connectionHealth === 'failed' || connectionError)
    ) {
      bridgeConfig.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionHealth, connectionError, target?.source]);

  // Auto-connect with limited retries and exponential backoff.
  // Skip in demo preview mode and during cloud stop/start transitions.
  useEffect(() => {
    if (
      isSignedIn &&
      !isDemoPreview &&
      status === 'disconnected' &&
      !cloudMachine.isWorking &&
      target &&
      attemptCountRef.current < MAX_AUTO_CONNECT_ATTEMPTS &&
      !retryTimerRef.current
    ) {
      const attempt = attemptCountRef.current;
      const delay = attempt === 0 ? 0 : BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);

      const { bridgeUrl, bridgeApiKey } = target;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        attemptCountRef.current += 1;
        connect(bridgeUrl, bridgeApiKey);
      }, delay);
    }

    return clearRetryTimer;
  }, [isSignedIn, isDemoPreview, status, target, cloudMachine.isWorking, connect, clearRetryTimer]);

  // Show environment dialog only when the user has picked NEITHER a cloud
  // machine NOR a local bridge. If a local bridge is configured but offline,
  // we stay quiet and let the polling bring it back.
  useEffect(() => {
    if (
      isSignedIn &&
      !isDemoPreview &&
      status === 'disconnected' &&
      !cloudMachine.machine &&
      !cloudMachine.isLoading &&
      !hasLocalEnvironment &&
      !bridgeConfig.isLoading
    ) {
      const timer = setTimeout(() => {
        showEnvironmentDialog();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, isDemoPreview, status, cloudMachine.machine, cloudMachine.isLoading, hasLocalEnvironment, bridgeConfig.isLoading, showEnvironmentDialog]);


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
