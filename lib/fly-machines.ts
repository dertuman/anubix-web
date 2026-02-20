/**
 * Fly.io Machines API client — server-side only.
 *
 * Used by /api/cloud/* routes to create/manage Fly.io machines.
 * The FLY_API_TOKEN is never exposed to the browser.
 */

const FLY_API_BASE = 'https://api.machines.dev/v1';

function getToken(): string {
  const token = process.env.FLY_API_TOKEN;
  if (!token) throw new Error('FLY_API_TOKEN is not set');
  return token;
}

function getOrgSlug(): string {
  return process.env.FLY_ORG_SLUG || 'personal';
}

function getBridgeImage(): string {
  const image = process.env.BRIDGE_DOCKER_IMAGE;
  if (!image) throw new Error('BRIDGE_DOCKER_IMAGE is not set');
  return image;
}

// ── Helpers ──────────────────────────────────────────────────

async function flyFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${FLY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

async function flyFetchOk(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await flyFetch(path, options);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Fly API ${options.method || 'GET'} ${path} failed (${res.status}): ${body}`);
  }
  return res;
}

/**
 * Retry a Fly.io API call on transient failures (5xx, network errors).
 * Fly.io's Machines API occasionally returns 500/503 during high load.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on 5xx or network errors, not 4xx
      const is5xx = lastError.message.includes('(5');
      const isNetwork = lastError.message.includes('fetch failed') || lastError.message.includes('ECONNREFUSED');
      if (!is5xx && !isNetwork) throw lastError;
      if (i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}

// ── Apps ─────────────────────────────────────────────────────

export async function createFlyApp(appName: string): Promise<void> {
  await withRetry(() =>
    flyFetchOk('/apps', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName, org_slug: getOrgSlug() }),
    }),
  );
}

export async function destroyFlyApp(appName: string): Promise<void> {
  await flyFetchOk(`/apps/${appName}`, { method: 'DELETE' });
}

// ── Volumes ──────────────────────────────────────────────────

export interface FlyVolume {
  id: string;
  name: string;
  region: string;
  size_gb: number;
  state: string;
}

export async function createFlyVolume(
  appName: string,
  region: string,
  sizeGb: number = 1,
): Promise<FlyVolume> {
  const res = await withRetry(() =>
    flyFetchOk(`/apps/${appName}/volumes`, {
      method: 'POST',
      body: JSON.stringify({ name: 'workspace_data', region, size_gb: sizeGb }),
    }),
  );
  return res.json();
}

export async function destroyFlyVolume(appName: string, volumeId: string): Promise<void> {
  // Volumes are deleted when the app is deleted, but we can be explicit
  await flyFetch(`/apps/${appName}/volumes/${volumeId}`, { method: 'DELETE' });
}

// ── Machines ─────────────────────────────────────────────────

export interface FlyMachine {
  id: string;
  name: string;
  state: string;
  region: string;
  config: Record<string, unknown>;
}

export interface CreateMachineOptions {
  bridgeApiKey: string;
  claudeMode: 'cli' | 'sdk';
  claudeAuthJson?: string;      // for cli mode
  anthropicApiKey?: string;     // for sdk mode
  volumeId: string;
  templateName?: string;
  gitRepoUrl?: string;
  region?: string;
  memoryMb?: number;
}

export async function createFlyMachine(
  appName: string,
  options: CreateMachineOptions,
): Promise<FlyMachine> {
  const {
    bridgeApiKey,
    claudeMode,
    claudeAuthJson,
    anthropicApiKey,
    volumeId,
    templateName,
    gitRepoUrl,
    region,
    memoryMb = 512,
  } = options;

  const env: Record<string, string> = {
    BRIDGE_API_KEY: bridgeApiKey,
    CLAUDE_MODE: claudeMode,
    PORT: '8080',
    REPOS_BASE_PATH: '/workspace',
    NODE_ENV: 'production',
    PREVIEW_FALLBACK_PORT: '3000',
  };

  // Claude auth — inject the appropriate credential
  if (claudeMode === 'cli' && claudeAuthJson) {
    env.CLAUDE_AUTH_JSON = claudeAuthJson;
  }
  if (claudeMode === 'sdk' && anthropicApiKey) {
    env.ANTHROPIC_API_KEY = anthropicApiKey;
  }

  // Optional template / git clone
  if (templateName) env.TEMPLATE_NAME = templateName;
  if (gitRepoUrl) env.GIT_REPO_URL = gitRepoUrl;

  const body = {
    region: region || undefined,
    config: {
      image: getBridgeImage(),
      env,
      services: [
        {
          ports: [
            { port: 443, handlers: ['tls', 'http'] },
            { port: 80, handlers: ['http'] },
          ],
          protocol: 'tcp',
          internal_port: 8080,
          force_instance_key: null,
          // Auto-stop when idle (no HTTP/WS traffic for ~5 min) to save cost.
          // Auto-start when traffic arrives again — seamless to the user.
          autostart: true,
          autostop: 'stop',
          min_machines_running: 0,
        },
      ],
      mounts: [
        {
          volume: volumeId,
          path: '/workspace',
        },
      ],
      guest: {
        cpu_kind: 'shared',
        cpus: 1,
        memory_mb: memoryMb,
      },
      checks: {
        bridge_health: {
          type: 'http',
          port: 8080,
          method: 'GET',
          path: '/api/health',
          interval: '30s',
          timeout: '5s',
          headers: [{ name: 'x-api-key', values: [bridgeApiKey] }],
        },
      },
    },
  };

  const res = await withRetry(() =>
    flyFetchOk(`/apps/${appName}/machines`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
  return res.json();
}

export async function startFlyMachine(appName: string, machineId: string): Promise<void> {
  await flyFetchOk(`/apps/${appName}/machines/${machineId}/start`, { method: 'POST' });
}

export async function stopFlyMachine(appName: string, machineId: string): Promise<void> {
  await flyFetchOk(`/apps/${appName}/machines/${machineId}/stop`, { method: 'POST' });
}

export async function destroyFlyMachine(appName: string, machineId: string): Promise<void> {
  await flyFetchOk(`/apps/${appName}/machines/${machineId}?force=true`, { method: 'DELETE' });
}

export async function getMachineStatus(appName: string, machineId: string): Promise<FlyMachine> {
  const res = await flyFetchOk(`/apps/${appName}/machines/${machineId}`);
  return res.json();
}

/**
 * Block until the machine reaches the desired state.
 * Uses Fly.io's long-poll wait endpoint (server holds the connection).
 */
export async function waitForMachineState(
  appName: string,
  machineId: string,
  targetState: string,
  timeoutSeconds: number = 30,
): Promise<void> {
  const res = await flyFetch(
    `/apps/${appName}/machines/${machineId}/wait?state=${targetState}&timeout=${timeoutSeconds}`,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Machine did not reach state "${targetState}" within ${timeoutSeconds}s: ${body}`);
  }
}

// ── Health check ─────────────────────────────────────────────

/**
 * Poll the bridge health endpoint until it responds OK.
 * Fly.io DNS can take a few seconds after machine starts.
 */
export async function waitForBridgeHealth(
  bridgeUrl: string,
  bridgeApiKey: string,
  maxAttempts: number = 15,
  delayMs: number = 2000,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${bridgeUrl}/api/health`, {
        headers: { 'x-api-key': bridgeApiKey },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return;
    } catch {
      // DNS not ready or connection refused — keep trying
    }
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Bridge at ${bridgeUrl} did not become healthy after ${maxAttempts} attempts`);
}

// ── Cleanup helpers ──────────────────────────────────────────

/**
 * Best-effort teardown of all Fly.io resources for a given app.
 * Swallows errors so callers can always clean up as much as possible.
 */
export async function teardownFlyResources(
  appName: string,
  machineId?: string | null,
): Promise<void> {
  // Stop + destroy machine
  if (machineId) {
    try { await stopFlyMachine(appName, machineId); } catch { /* ignore */ }
    try { await destroyFlyMachine(appName, machineId); } catch { /* ignore */ }
  }
  // Destroy the app (also deletes volumes)
  try { await destroyFlyApp(appName); } catch { /* ignore */ }
}
