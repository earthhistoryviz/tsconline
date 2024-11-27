import { DatapackMetadata, isUserDatapack } from "./index.js";

export function roundToDecimalPlace(value: number, decimalPlace: number) {
  const factor = Math.pow(10, decimalPlace);
  return Math.round(value * factor) / factor;
}

export function calculateAutoScale(min: number, max: number) {
  const margin = 0.1;
  const outerMargin = ((max - min) * margin) / 2;
  const lowerRange = roundToDecimalPlace(min - outerMargin, 3);
  const upperRange = roundToDecimalPlace(max + outerMargin, 3);
  const scaleStep = roundToDecimalPlace((upperRange - lowerRange) * 0.2, 3);
  const scaleStart = 0;
  return { lowerRange, upperRange, scaleStep, scaleStart };
}

// allow crypto to work in both browser and node.js
let cryptoSubtle: SubtleCrypto;
if (typeof window !== "undefined" && window.crypto?.subtle) {
  // Browser environment
  cryptoSubtle = window.crypto.subtle;
} else {
  // Node.js environment
  cryptoSubtle = globalThis.crypto.subtle;
}

export async function calculateDatapackMetadataHash(metadata: DatapackMetadata): Promise<string> {
  let input = metadata.title + metadata.type;
  if (isUserDatapack(metadata)) {
    input += metadata.uuid;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await cryptoSubtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
