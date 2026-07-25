export const MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5MB (stored as base64 in Realtime Database)

export function fileToBase64(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Promise.reject(
      new Error(`"${file.name}" is too large (max ${(MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(1)}MB).`)
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
