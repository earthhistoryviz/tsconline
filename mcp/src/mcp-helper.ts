
export async function fetchFileFromUrl(url: string): Promise<[ArrayBuffer, string | null]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return [arrayBuffer, response.headers.get("content-type")];
}

export function assertValidImageMimeType(mimeType: string | null): string {
  //normalize mime type
  if (!mimeType) throw new Error("Invalid image mime type: null");
  const normalizedMime = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (normalizedMime === "image/png") return "image/png";
  if (normalizedMime === "image/jpeg") return "image/jpeg";
  if (normalizedMime === "image/jpg") return "image/jpg";
  //not valid image mime type
  throw new Error(`Invalid image mime type: ${mimeType}`);
}

export function getImageFileExtension(mimeType: string): string {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/jpg") return ".jpg";
  throw new Error(`Invalid image mime type: ${mimeType}`);
}

export function assertPdfMimeType(mimeType: string | null): string {
  if (!mimeType) throw new Error("Invalid pdf mime type: null");
  const normalizedMime = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (normalizedMime === "application/pdf") return "application/pdf";
  throw new Error(`Invalid pdf mime type: ${mimeType}`);
}