'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useClaudeCodeContext } from '../context/claude-code-context';
import { useCloudMachineContext } from '../context/cloud-machine-context';
import { useEnvironmentDialog } from '../context/environment-dialog-context';
import { useWorkspace } from '../context/workspace-context';
import { useBridgeConfig } from '@/hooks/useBridgeConfig';
import { usePreferredEnvironment } from '@/hooks/usePreferredEnvironment';
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
  const { status, connect, disconnect, connectionHealth, connectionError } = useClaudeCodeContext();
  const cloudMachine = useCloudMachineContext();
  const { showEnvironmentDialog } = useEnvironmentDialog();
  const { isDemoMode, isDemoPreview, incrementDemoPromptCount } = useWorkspace();
  const bridgeConfig = useBridgeConfig();
  const { preferred } = usePreferredEnvironment();

  // Effective preference: explicit pick wins. If none, fall back to whichever
  // environment is already set up (so existing users aren't forced into the
  // picker). If both exist and no preference, default to cloud (pre-existing
  // behavior).
  const effectivePreferred: 'local' | 'cloud' | null =
    preferred
    ?? (bridgeConfig.config?.hasInstallToken ? 'local' : null)
    ?? (cloudMachine.machine ? 'cloud' : null);

  // Target = the bridge we want to be connected to, period. No auto-switching
  // based on what's reachable — if the user picked local and it's offline,
  // the UI shows that and waits. Explicit choice, explicit state.
  const target = useMemo(() => {
    if (effectivePreferred === 'local') {
      if (bridgeConfig.config?.bridgeUrl && bridgeConfig.config.apiKey) {
        return {
          source: 'local' as const,
          bridgeUrl: bridgeConfig.config.bridgeUrl,
          bridgeApiKey: bridgeConfig.config.apiKey,
        };
      }
      return null;
    }
    if (effectivePreferred === 'cloud') {
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
    }
    return null;
  }, [effectivePreferred, bridgeConfig.config, cloudMachine.machine]);

  // Poll bridge_configs whenever local is preferred AND we're not actually
  // connected to it (WebSocket health = 'connected'). When the WebSocket is
  // alive the connection itself proves the bridge is reachable, so polling
  // would be redundant. When it's down, we need to keep polling so lastSeenAt
  // in the UI doesn't go artificially stale.
  useEffect(() => {
    const shouldPoll = effectivePreferred === 'local' && connectionHealth !== 'connected';
    if (shouldPoll) {
      bridgeConfig.startPolling();
      return bridgeConfig.stopPolling;
    }
    bridgeConfig.stopPolling();
  }, [effectivePreferred, connectionHealth, bridgeConfig]);

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

  // Auto-switch: track the URL we last asked the pool to connect to. When the
  // resolved target's URL differs (user picked a different env, or local
  // bridge came online while we were on cloud), tear down the old connection
  // so the auto-connect effect below takes us to the new target.
  const lastRequestedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      (status === 'connected' || status === 'connecting') &&
      lastRequestedUrlRef.current &&
      target &&
      target.bridgeUrl !== lastRequestedUrlRef.current
    ) {
      disconnect();
      lastRequestedUrlRef.current = null;
    }
    if (status === 'disconnected') {
      lastRequestedUrlRef.current = null;
    }
  }, [status, target, disconnect]);

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
        lastRequestedUrlRef.current = bridgeUrl;
        connect(bridgeUrl, bridgeApiKey);
      }, delay);
    }

    return clearRetryTimer;
  }, [isSignedIn, isDemoPreview, status, target, cloudMachine.isWorking, connect, clearRetryTimer]);

  // Show environment picker only when the user hasn't chosen or set up
  // anything. If they've picked local (even if offline) or have a cloud
  // machine, stay quiet — they already decided.
  useEffect(() => {
    if (
      isSignedIn &&
      !isDemoPreview &&
      status === 'disconnected' &&
      !cloudMachine.isLoading &&
      !bridgeConfig.isLoading &&
      effectivePreferred === null
    ) {
      const timer = setTimeout(() => {
        showEnvironmentDialog();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, isDemoPreview, status, cloudMachine.isLoading, bridgeConfig.isLoading, effectivePreferred, showEnvironmentDialog]);


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
