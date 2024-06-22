import "dotenv/config";
import md5 from "md5";
import { randomBytes } from "node:crypto";

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
  return randomBytes(16).toString("hex") + md5(uuid);
}
