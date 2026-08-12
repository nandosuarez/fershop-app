import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, storedKey] = storedHash.split(":");
  if (!salt || !storedKey) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer;
  const storedKeyBuffer = Buffer.from(storedKey, "hex");
  return (
    storedKeyBuffer.length === derivedKey.length &&
    timingSafeEqual(storedKeyBuffer, derivedKey)
  );
}
