import { createHash } from 'node:crypto';

/**
 * Golomt IPPOS request/response codec.
 *
 * IMPORTANT — confirmed by decompiling PobRestLibrary.PobRestLibrary.Pos():
 * the GLMTPOS service's single operation does
 *     Convert.FromBase64String(data) → UTF8 → JsonConvert.DeserializeObject(Request)
 * and returns  ResponseMaker { data = Base64(...), responseCode, responseDesc }.
 * So the `data` param is simply Base64-of-JSON — NOT encrypted. The DLL also ships
 * RSA Encryption/Decryption helpers, but Pos() never calls them, so we don't use
 * them either. (Verified end-to-end against the shipped assembly on 2026-07-02.)
 */

/** Encode a request object as the service expects: Base64(UTF8(JSON)). */
export function encodeRequestData(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
}

/** Decode a Base64 payload (the response's inner `data`) back to a UTF-8 string. */
export function decodeData(b64: string): string {
  return Buffer.from(b64, 'base64').toString('utf8');
}

/** SHA-256 hex — mirrors PobRestLibrary.sha256Encryption, for any token/hash use. */
export function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}
