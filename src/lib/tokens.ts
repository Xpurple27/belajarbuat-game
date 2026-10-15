import { createHash, randomBytes } from "node:crypto";

export function createOpaqueToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string | null | undefined, expectedHash: string): boolean {
  if (!token) return false;
  return hashToken(token) === expectedHash;
}
