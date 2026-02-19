import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error('Server encryption is not configured. Please contact the administrator.');
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext: string): { encryptedKey: string; iv: string; authTag: string } {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return {
    encryptedKey: encrypted,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decrypt(data: { encryptedKey: string; iv: string; authTag: string }): string {
  const key = getKey();
  const iv = Buffer.from(data.iv, 'base64');
  const authTag = Buffer.from(data.authTag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encryptedKey, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
