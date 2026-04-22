import { createHash, randomBytes } from 'crypto';

/**
 * Generate a random install token for a local bridge.
 * 32 bytes = 64 hex chars. Plain text is shown to the user once and pasted
 * into the bridge's .env as ANUBIX_INSTALL_TOKEN. We only store the hash.
 */
export function generateInstallToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a random bridge API key. Clients send this as x-api-key when
 * talking to the bridge. Encrypted at rest in bridge_configs.api_key_encrypted.
 */
export function generateBridgeApiKey(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash the install token (sha256, hex). Used for DB lookup when the bridge
 * calls /api/bridge-register. Constant-length hex makes the column trivially
 * indexable.
 */
export function hashInstallToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
