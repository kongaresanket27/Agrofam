const MAX_EDGE = 900;
const JPEG_QUALITY = 0.72;
const MAX_PHOTOS = 6;

export function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose a photo (jpg, png or webp)"));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not process photo"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that photo"));
    };
    img.src = url;
  });
}

export function parsePhotos(raw: unknown, fallback?: string | null): string[] {
  let list: unknown = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }
  const out = Array.isArray(list) ? list.filter((x): x is string => typeof x === "string" && x.startsWith("data:image/")) : [];
  if (!out.length && fallback?.startsWith("data:image/")) return [fallback];
  return out.slice(0, MAX_PHOTOS);
}

export { MAX_PHOTOS };
