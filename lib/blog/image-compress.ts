import { MAX_FILE_SIZE_BYTES } from "./file-utils";

interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  mime?: "image/webp" | "image/jpeg";
}

/**
 * Downscale + re-encode an image entirely in the browser (Canvas API, no dependency)
 * and return a base64 data URI. Images are stored inline in Realtime Database, so this
 * is what keeps large photos under MAX_FILE_SIZE_BYTES and shrinks the DB payload.
 */
export function compressImage(file: File, opts: CompressOptions = {}): Promise<string> {
  const { maxDimension = 1600, quality = 0.82, mime = "image/webp" } = opts;

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const targetW = Math.round(width * scale);
      const targetH = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas is not supported in this browser."));
        return;
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // WebP gives the smallest payload; fall back to JPEG if the browser can't encode it.
      let dataUrl = canvas.toDataURL(mime, quality);
      if (mime === "image/webp" && !dataUrl.startsWith("data:image/webp")) {
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`"${file.name}" could not be read as an image.`));
    };

    img.src = objectUrl;
  });
}

/** Approximate byte size of a base64 data URI's payload. */
export function dataUriByteSize(dataUri: string): number {
  const commaIdx = dataUri.indexOf(",");
  const b64 = commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
  return Math.floor((b64.length * 3) / 4);
}

/**
 * Compress an image file and guarantee the result fits the DB cap, retrying at lower
 * quality/size if needed. Throws a friendly error if it still won't fit.
 */
export async function compressImageToLimit(file: File): Promise<string> {
  const attempts: CompressOptions[] = [
    { maxDimension: 1600, quality: 0.82 },
    { maxDimension: 1280, quality: 0.72 },
    { maxDimension: 1024, quality: 0.62 },
    { maxDimension: 800, quality: 0.55 },
  ];

  let last = "";
  for (const opt of attempts) {
    last = await compressImage(file, opt);
    if (dataUriByteSize(last) <= MAX_FILE_SIZE_BYTES) return last;
  }
  if (last && dataUriByteSize(last) <= MAX_FILE_SIZE_BYTES) return last;
  throw new Error(
    `"${file.name}" is too large to embed even after compression. Try a smaller image.`
  );
}
