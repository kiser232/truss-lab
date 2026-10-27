import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostForm } from "@/components/post-form";
import type { UserCategory } from "@/lib/constants";
import { CATEGORIES } from "@/lib/constants";
import { getPost } from "@/lib/store";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "글 수정",
};

export default async function EditPage({ params }: EditPageProps) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) notFound();
  const post = await getPost(numericId);
  if (!post || post.isNotice) notFound();
  const category = (CATEGORIES as readonly string[]).includes(post.category)
    ? (post.category as UserCategory)
    : "응원";

  return (
    <section className="mx-auto max-w-3xl rounded-md border border-[#d3dde4] bg-white px-4 py-5 sm:px-6">
      <h1 className="font-display text-3xl text-[#14372c]">글 수정</h1>
      <p className="mt-1 mb-5 text-sm text-[#6b7680]">
        글을 쓸 때 입력한 비밀번호가 맞아야 저장됩니다.
      </p>
      <PostForm
        mode="edit"
        postId={post.id}
        initial={{
          author: post.author,
          category,
          title: post.title,
          content: post.content,
        }}
      />
    </section>
  );
}
