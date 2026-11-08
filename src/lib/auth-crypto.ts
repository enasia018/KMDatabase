import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
  type ScryptOptions,
} from 'crypto';

const SCRYPT_COST = 1 << 15;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const KEY_LENGTH = 64;

function deriveKey(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await deriveKey(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  }) as Buffer;
  return `scrypt$${SCRYPT_COST}$${SCRYPT_BLOCK_SIZE}$${SCRYPT_PARALLELIZATION}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, saltText, keyText, extra] = encoded.split('$');
  if (algorithm !== 'scrypt' || !cost || !blockSize || !parallelization || !saltText || !keyText || extra) {
    return false;
  }
  const n = Number(cost);
  const r = Number(blockSize);
  const p = Number(parallelization);
  if (n !== SCRYPT_COST || r !== SCRYPT_BLOCK_SIZE || p !== SCRYPT_PARALLELIZATION) return false;

  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(keyText, 'base64url');
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
    const actual = await deriveKey(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    }) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
