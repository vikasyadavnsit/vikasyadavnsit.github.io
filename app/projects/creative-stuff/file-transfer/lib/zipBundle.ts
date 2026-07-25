// Multi-file support without touching the chunk/manifest protocol: bundle
// everything into one compressed zip and transfer that as "the file". A
// single selected file passes through untouched so the common case keeps
// today's exact filename/mimetype/download behavior.

import JSZip from "jszip";

export async function bundleFiles(files: File[]): Promise<File> {
  if (files.length === 0) throw new Error("No files selected.");
  if (files.length === 1) return files[0];

  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, await file.arrayBuffer());
  }
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return new File([blob], `${files.length}-files.zip`, { type: "application/zip" });
}
