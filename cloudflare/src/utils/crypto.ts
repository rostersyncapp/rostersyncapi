export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCryptoKey(keyString: string): Promise<CryptoKey> {
  let keyBytes: Uint8Array;
  
  // If it's a 64-character hex string, parse it as hex bytes
  if (keyString.length === 64 && /^[0-9a-fA-F]+$/.test(keyString)) {
    keyBytes = hexToBytes(keyString);
  } else {
    // Otherwise, hash the string using SHA-256 to get a consistent 32-byte key
    const encoder = new TextEncoder();
    const data = encoder.encode(keyString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    keyBytes = new Uint8Array(hashBuffer);
  }

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a credentials record to a hex string with a random 12-byte IV.
 */
export async function encryptCredentials(
  credentials: Record<string, string>,
  encryptionKey: string
): Promise<{ encrypted: string; iv: string }> {
  const cryptoKey = await getCryptoKey(encryptionKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = JSON.stringify(credentials);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plaintextBytes
  );

  return {
    encrypted: bytesToHex(new Uint8Array(encryptedBuffer)),
    iv: bytesToHex(iv)
  };
}

/**
 * Decrypts a credentials record from hex strings.
 */
export async function decryptCredentials(
  encryptedHex: string,
  ivHex: string,
  encryptionKey: string
): Promise<Record<string, string>> {
  const cryptoKey = await getCryptoKey(encryptionKey);
  const iv = hexToBytes(ivHex);
  const encryptedBytes = hexToBytes(encryptedHex);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBytes
  );

  const decoder = new TextDecoder();
  const decryptedText = decoder.decode(decryptedBuffer);
  return JSON.parse(decryptedText);
}
