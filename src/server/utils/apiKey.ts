import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateAPIKey(): { key: string; prefix: string } {
  // Generate random 32-byte key
  const randomBytes = crypto.randomBytes(32);
  const keyBody = randomBytes.toString('hex');
  
  // Create key with prefix
  const key = `pk_live_${keyBody}`;
  const prefix = key.slice(0, 12); // "pk_live_abc..."
  
  return { key, prefix };
}

export async function hashAPIKey(key: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(key, salt);
}

export async function verifyAPIKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

export function generateNonce(): string {
  return '0x' + crypto.randomBytes(32).toString('hex');
}
