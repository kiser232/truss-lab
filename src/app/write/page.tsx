import type { Metadata } from "next";
import { PostForm } from "@/components/post-form";

export const metadata: Metadata = {
  title: "글쓰기",
};

export default function WritePage() {
  return (
    <section className="mx-auto max-w-3xl rounded-md border border-[#d3dde4] bg-white px-4 py-5 sm:px-6">
      <h1 className="font-display text-3xl text-[#14372c]">글쓰기</h1>
      <p className="mt-1 mb-5 text-sm text-[#6b7680]">
        응원, 정보, 질문, 후기, 잡담을 올릴 수 있습니다. 공지는 갤에서 미리 등록해 둡니다.
      </p>
      <PostForm mode="create" />
    </section>
  );
}
