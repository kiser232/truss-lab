export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageExt = "jpg" | "png" | "gif" | "webp";

export type ImageChange =
  | { kind: "keep" }
  | { kind: "clear" }
  | { kind: "replace"; bytes: Buffer; ext: ImageExt };

const NAME_RE = /^[a-f0-9]{32}\.(jpg|png|gif|webp)$/;

const CONTENT_TYPES: Record<ImageExt, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export function isSafeImageName(name: string): boolean {
  return NAME_RE.test(name);
}

export function imageUrl(name: string | null | undefined): string | null {
  if (!name || !isSafeImageName(name)) return null;
  return `/uploads/${name}`;
}

export function imageContentType(name: string): string | null {
  const ext = name.slice(name.lastIndexOf(".") + 1);
  if (ext === "jpg" || ext === "png" || ext === "gif" || ext === "webp") {
    return CONTENT_TYPES[ext];
  }
  return null;
}

export function sniffImage(bytes: Uint8Array): ImageExt | null {
  if (bytes.length < 12 || bytes.length > MAX_IMAGE_BYTES) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "gif";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}
