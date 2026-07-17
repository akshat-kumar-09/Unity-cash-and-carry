import crypto from "crypto"

// Reversible at-rest encryption for short-lived secrets we must persist (e.g. a generated
// temp password between account registration and admin approval) but must not sit in the
// DB as plaintext. Keyed off NEXTAUTH_SECRET so no extra env var is required.
const ALGORITHM = "aes-256-gcm"

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET must be set to encrypt/decrypt stored secrets")
  }
  return crypto.scryptSync(secret, "unity-secret-salt", 32)
}

/** Returns `iv:authTag:ciphertext`, all hex-encoded. */
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`
}

export function decryptSecret(payload: string): string {
  const [ivHex, authTagHex, ciphertextHex] = payload.split(":")
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Malformed encrypted payload")
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ])
  return plaintext.toString("utf8")
}
