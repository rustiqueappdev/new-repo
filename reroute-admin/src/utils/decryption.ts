import CryptoJS from 'crypto-js';

const ENCRYPTION_SECRET = process.env.REACT_APP_ENCRYPTION_SECRET;

if (!ENCRYPTION_SECRET || ENCRYPTION_SECRET.length < 32) {
  console.warn('⚠️ ENCRYPTION_SECRET not configured. Encrypted fields will show as-is.');
}

/**
 * Derive encryption key from user ID (matches mobile app logic)
 */
function deriveKey(userId: string): string {
  return CryptoJS.SHA256(userId + ENCRYPTION_SECRET).toString();
}

/**
 * Decrypt sensitive data encrypted by the mobile app
 * Uses AES-256 with user-specific keys derived from userId + ENCRYPTION_SECRET
 */
export function decryptSensitiveData(encryptedText: string, userId: string): string {
  if (!encryptedText) return '';
  if (!userId) return encryptedText;
  if (!ENCRYPTION_SECRET) return encryptedText;

  // If not encrypted, return as-is
  if (!isEncrypted(encryptedText)) return encryptedText;

  try {
    // Remove version prefix (e.g., "enc_v1_")
    const encrypted = encryptedText.replace(/^enc_v\d+_/, '');
    const key = deriveKey(userId);
    const decrypted = CryptoJS.AES.decrypt(encrypted, key);
    const plainText = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plainText) {
      console.warn('Decryption returned empty — possibly wrong key or corrupted data');
      return encryptedText;
    }

    return plainText;
  } catch (error) {
    console.warn('Decryption failed, showing raw value:', error);
    return encryptedText;
  }
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
