import "dotenv/config";
import { createCipheriv, randomBytes } from "node:crypto";

export async function checkRecaptchaToken(token: string): Promise<number> {
  try {
    if (process.env.NODE_ENV != "production" && !process.env.RECAPTCHA_SECRET_KEY) return 1.0;
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      { method: "POST" }
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error("Recaptcha failed");
    }
    return data.score;
  } catch (error) {
    console.error("Recaptcha error:", error);
    throw new Error("Recaptcha failed");
  }
}

export function generateToken(uuid: string): string {
  // Ensure that the key is 32 bytes (256 bits)
  const key = process.env.TOKEN_SECRET_KEY ? Buffer.from(process.env.TOKEN_SECRET_KEY, "hex") : randomBytes(32);

  // Ensure that the IV is 16 bytes (128 bits)
  const iv = process.env.TOKEN_IV ? Buffer.from(process.env.TOKEN_IV, "hex") : randomBytes(16);
  const aesCipher = createCipheriv("aes-256-cbc", key, iv);
  return randomBytes(16).toString("hex") + aesCipher.update(uuid, "utf8", "hex");
}
