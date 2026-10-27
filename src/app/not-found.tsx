import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-md border border-[#d3dde4] bg-white px-6 py-12 text-center">
      <h1 className="font-display text-3xl text-[#14372c]">글을 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-[#52606d]">삭제되었거나 주소가 잘못되었습니다.</p>
      <Link href="/" className="mt-5 inline-block text-sm font-medium text-[#1a4f86] underline">
        목록으로
      </Link>
    </div>
  );
}
