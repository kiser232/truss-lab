import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { imageContentType, isSafeImageName } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const type = imageContentType(name);
  if (!isSafeImageName(name) || !type) {
    return new Response("이미지를 찾을 수 없습니다.", { status: 404 });
  }

  const root = path.resolve(process.cwd(), "data", "uploads");
  const file = path.resolve(root, name);
  if (!file.startsWith(`${root}${path.sep}`) || !existsSync(file)) {
    return new Response("이미지를 찾을 수 없습니다.", { status: 404 });
  }

  const bytes = readFileSync(file);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
