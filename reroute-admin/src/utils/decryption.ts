import CryptoJS from 'crypto-js';

const ENCRYPTION_SECRET = process.env.REACT_APP_ENCRYPTION_SECRET;

if (!ENCRYPTION_SECRET || ENCRYPTION_SECRET.length < 32) {
  console.warn('⚠️ ENCRYPTION_SECRET not configured. Encrypted fields will show as-is.');
}

// Fallback key used in older mobile app builds before the .env was set up
const LEGACY_FALLBACK_KEY = 'reroute-encryption-key-2024-CHANGE-IN-PRODUCTION';

/**
 * Derive encryption key from user ID (matches mobile app logic)
 * Returns a hex string that is the SHA256 of (userId + secret)
 */
function deriveKey(userId: string, secret: string): string {
  return CryptoJS.SHA256(userId + secret).toString();
}

/**
 * Attempt to decrypt using a specific secret.
 * Returns null if decryption fails or produces empty output.
 *
 * Supports two formats:
 *   enc_v1_<ciphertext>        — legacy passphrase-based AES (no explicit IV)
 *   enc_v2_<ivHex>:<ciphertext> — current format with explicit random IV and hex key
 */
function attemptDecrypt(encryptedText: string, userId: string, secret: string): string | null {
  try {
    const key = deriveKey(userId, secret);

    if (encryptedText.startsWith('enc_v2_')) {
      const payload = encryptedText.slice('enc_v2_'.length);
      const colonIdx = payload.indexOf(':');
      if (colonIdx === -1) return null;
      const ivHex = payload.slice(0, colonIdx);
      const ciphertext = payload.slice(colonIdx + 1);
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const keyParsed = CryptoJS.enc.Hex.parse(key);
      const decrypted = CryptoJS.AES.decrypt(ciphertext, keyParsed, { iv });
      const plainText = decrypted.toString(CryptoJS.enc.Utf8);
      return plainText || null;
    } else {
      // Legacy enc_v1_ — passphrase-based, no explicit IV
      const encrypted = encryptedText.replace(/^enc_v\d+_/, '');
      const decrypted = CryptoJS.AES.decrypt(encrypted, key);
      const plainText = decrypted.toString(CryptoJS.enc.Utf8);
      return plainText || null;
    }
  } catch {
    return null;
  }
}

/**
 * Decrypt sensitive data encrypted by the mobile app.
 * Tries the current ENCRYPTION_SECRET first, then the legacy fallback key
 * (used in older app builds before the .env was configured).
 */
export function decryptSensitiveData(encryptedText: string, userId: string): string {
  if (!encryptedText) return '';
  if (!userId) return encryptedText;
  if (!isEncrypted(encryptedText)) return encryptedText;

  // 1. Try with the current configured secret
  if (ENCRYPTION_SECRET) {
    const result = attemptDecrypt(encryptedText, userId, ENCRYPTION_SECRET);
    if (result) return result;
  }

  // 2. Fall back to the legacy hardcoded key used in older mobile builds
  const legacyResult = attemptDecrypt(encryptedText, userId, LEGACY_FALLBACK_KEY);
  if (legacyResult) return legacyResult;

  console.warn('Decryption failed with all known keys for userId:', userId);
  return encryptedText;
}

/**
 * Check if data is encrypted (prefixed with enc_v)
 */
export function isEncrypted(data: string): boolean {
  return data?.startsWith('enc_v') || false;
}

/**
 * Try to decrypt a field, gracefully falling back to the original value
 */
export function tryDecrypt(value: string | undefined, userId: string): string {
  if (!value) return 'N/A';
  if (!isEncrypted(value)) return value;
  return decryptSensitiveData(value, userId);
}
