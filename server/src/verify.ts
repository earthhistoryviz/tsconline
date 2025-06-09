import "dotenv/config";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { assertRecaptchaResponse } from "./types";

/**
 * Verifies the given Recaptcha token. The token is sent to Google's Recaptcha API for verification.
 * @param token The token to verify
 * @param action The expected action to verify
 * @returns The score of the token. Values closer to 1.0 indicate that the token is likely valid, while values closer to 0.0 indicate that the token is likely invalid.
 */
export async function checkRecaptchaToken(token: string, action: string): Promise<number> {
  try {
    if (process.env.NODE_ENV !== "production" && !process.env.RECAPTCHA_SECRET_KEY) return 1.0;

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`;
    const httpResponse = await fetch(url, { method: "POST" });

    if (httpResponse.ok) {
      const data = await httpResponse.json();
      assertRecaptchaResponse(data);

      if (!data.success) {
        throw new Error("Recaptcha verification failed");
      }

      if (data.action !== action) {
        throw new Error(`Recaptcha action mismatch: expected "${action}", got "${data.action}"`);
      }

      return data.score;
    }

    throw new Error("Network response was not ok");
  } catch (error) {
    console.error("Recaptcha error:", error);
    throw new Error("Recaptcha failed");
  }
}

/**
 * Generates a token for the given UUID. The token is encrypted using AES-256-CBC.
 * @param uuid The UUID to generate a token for
 * @returns The generated token
 */
export function generateToken(uuid: string): string {
  return randomBytes(16).toString("hex") + encrypt(uuid);
}

/**
 * Encrypts the data using AES-256-CBC. The key and IV are read from the environment variables AES_SECRET_KEY and AES_IV. If these are not set, random keys are generated.
 * @param data The data to encrypt
 * @returns The encrypted data
 */
export function encrypt(data: string): string {
  // Ensure that the key is 32 bytes (256 bits)
  const key = process.env.AES_SECRET_KEY ? Buffer.from(process.env.AES_SECRET_KEY, "hex") : randomBytes(32);
  // Ensure that the IV is 16 bytes (128 bits)
  const iv = process.env.AES_IV ? Buffer.from(process.env.AES_IV, "hex") : randomBytes(16);
  const aesCipher = createCipheriv("aes-256-cbc", key, iv);
  return aesCipher.update(data, "utf8", "hex") + aesCipher.final("hex");
}

/**
 * Decrypts the data using AES-256-CBC. The key and IV are read from the environment variables AES_SECRET_KEY and AES_IV. If these are not set, this function will throw an error.
 * @param data The data to decrypt
 * @throws If the AES_SECRET_KEY or AES_IV environment variables are not set
 * @returns The decrypted data
 */
export function decrypt(data: string): string {
  if (!process.env.AES_SECRET_KEY || !process.env.AES_IV) throw new Error("Token secret key or IV not set");
  // Ensure that the key is 32 bytes (256 bits)
  const key = Buffer.from(process.env.AES_SECRET_KEY, "hex");
  // Ensure that the IV is 16 bytes (128 bits)
  const iv = Buffer.from(process.env.AES_IV, "hex");
  const aesDecipher = createDecipheriv("aes-256-cbc", key, iv);
  return aesDecipher.update(data, "hex", "utf8") + aesDecipher.final("utf8");
}
