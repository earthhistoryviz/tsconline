
export async function fetchFileFromUrl(url: string): Promise<[ArrayBuffer, string | null]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return [arrayBuffer, response.headers.get("content-type")];
}

export function getImageFileExtension(mimeType: string): string {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/jpg") return ".jpg";
  throw new Error(`Invalid image mime type: ${mimeType}`);
}