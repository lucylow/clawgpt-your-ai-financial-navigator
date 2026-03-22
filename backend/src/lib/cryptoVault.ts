import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const KEY_LEN = 32;

function getKeyFromEnv(): Buffer {
  const hex = process.env.BACKEND_ENCRYPTION_KEY_HEX;
  if (!hex || hex.length !== KEY_LEN * 2) {
    throw new Error(
      "BACKEND_ENCRYPTION_KEY_HEX must be set to a 64-character hex string (32 bytes) for AES-256-GCM.",
    );
  }
  return Buffer.from(hex, "hex");
}

/** Derive a secondary key for tests or optional pepper (not used by default). */
export function deriveKeyFromPassword(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LEN);
}

export interface EncryptedBlob {
  iv: string;
  tag: string;
  ciphertext: string;
}

export function encryptUtf8(plain: string): EncryptedBlob {
  const key = getKeyFromEnv();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    ciphertext: enc.toString("hex"),
  };
}

export function decryptUtf8(blob: EncryptedBlob): string {
  const key = getKeyFromEnv();
  const iv = Buffer.from(blob.iv, "hex");
  const tag = Buffer.from(blob.tag, "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(Buffer.from(blob.ciphertext, "hex")), decipher.final()]);
  return dec.toString("utf8");
}

export function serializeVault(blob: EncryptedBlob): string {
  return JSON.stringify(blob);
}

export function parseVault(raw: string): EncryptedBlob {
  const o = JSON.parse(raw) as EncryptedBlob;
  if (!o.iv || !o.tag || !o.ciphertext) throw new Error("Invalid vault payload");
  return o;
}
