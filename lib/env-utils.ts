/**
 * Shared types and utilities for environment variable handling.
 */

export interface EnvVarEntry {
  key: string;
  value: string;
}

/** Parse a .env-style string into key-value pairs */
export function parseEnvString(text: string): EnvVarEntry[] {
  const results: EnvVarEntry[] = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // Handle `export KEY=value`
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) results.push({ key, value });
  }
  return results;
}
