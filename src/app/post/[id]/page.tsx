import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { MissingPost } from "@/components/missing-post";
import { CategoryBadge } from "@/components/category-badge";
import { CommentSection } from "@/components/comment-section";
import { DeletePostForm } from "@/components/delete-post-form";
import { VoteBar } from "@/components/vote-bar";
import { formatDateTime } from "@/lib/time";
import { getPost } from "@/lib/store";

type PostPageProps = {
  params: Promise<{ id: string }>;
};

async function loadPost(id: string, recordView: boolean) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) return null;
  const jar = await cookies();
  const voterId = jar.get("wj_vid")?.value;
  return getPost(numericId, voterId, recordView);
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await loadPost(id, false);
  if (!post) return { title: "글을 찾을 수 없습니다" };
  return {
    title: post.title,
    description: post.content.replace(/\s+/g, " ").slice(0, 140),
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const post = await loadPost(id, true);
  if (!post) return <MissingPost />;

  return (
    <article className="mx-auto max-w-3xl space-y-3">
      <header className="rounded-md border border-[#d3dde4] bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={post.category} />
          {post.isConcept ? <span className="text-xs font-semibold text-[#c5362b]">개념</span> : null}
          <span className="text-xs text-[#8b97a3]">No.{post.id}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold leading-snug text-[#1c2430] sm:text-2xl">{post.title}</h1>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6b7680]">
          <span>
            글쓴이 <span className="font-medium text-[#243140]">{post.author}</span>
          </span>
          <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
          <span>조회 {post.views.toLocaleString("ko-KR")}</span>
          <span>추천 {post.upvotes.toLocaleString("ko-KR")}</span>
        </p>
      </header>
      <div className="rounded-md border border-[#d3dde4] bg-white px-4 py-6 sm:px-6">
        <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#243140]">{post.content}</p>
        {post.image ? (
          <figure className="mt-5">
            <a href={post.image} target="_blank" rel="noopener noreferrer">
              {/* Uploads keep their original size and animation, so this is a plain image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image}
                alt={`${post.title} 첨부 이미지`}
                className="max-h-[36rem] w-auto max-w-full rounded-md border border-[#e6edf2] bg-[#f6f8fa]"
              />
            </a>
          </figure>
        ) : null}
      </div>
      <div className="rounded-md border border-[#d3dde4] bg-white px-4 py-4 sm:px-6">
        {post.isNotice ? (
          <p className="text-sm text-[#6b7680]">공지는 추천과 수정, 삭제가 닫혀 있습니다.</p>
        ) : (
          <div className="space-y-4">
            <VoteBar
              postId={post.id}
              upvotes={post.upvotes}
              downvotes={post.downvotes}
              myVote={post.myVote}
            />
            <div className="flex flex-col gap-3 border-t border-[#eef2f5] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <DeletePostForm postId={post.id} />
              <Link href={`/post/${post.id}/edit`} className="text-sm font-medium text-[#1a4f86] hover:underline">
                수정
              </Link>
            </div>
          </div>
        )}
        <div className="mt-4 flex gap-3 text-sm">
          <Link href="/" className="text-[#1a4f86] hover:underline">
            목록
          </Link>
          <Link href="/write" className="text-[#1a4f86] hover:underline">
            글쓰기
          </Link>
        </div>
      </div>
      <CommentSection
        postId={post.id}
        comments={post.comments.map((comment) => ({
          ...comment,
          createdLabel: formatDateTime(comment.createdAt),
        }))}
      />
    </article>
  );
}
