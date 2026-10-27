"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { commentAction, deleteCommentAction, type FormState } from "@/lib/actions";
import type { PublicComment } from "@/lib/types";

function CommentSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "등록 중…" : "댓글 등록"}
    </Button>
  );
}

function CommentForm({ postId }: { postId: number }) {
  const [state, formAction] = useActionState(commentAction, null as FormState);
  return (
    <form action={formAction} className="space-y-3 border-t border-[#e6edf2] px-4 py-4">
      <input type="hidden" name="postId" value={postId} />
      {state?.message ? (
        <p role="alert" className="text-sm text-[#c5362b]">
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="comment-author">닉네임</Label>
          <Input id="comment-author" name="author" required maxLength={12} autoComplete="nickname" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comment-password">비밀번호</Label>
          <Input
            id="comment-password"
            name="password"
            type="password"
            required
            minLength={4}
            maxLength={20}
            autoComplete="new-password"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="comment-content">댓글</Label>
        <Textarea id="comment-content" name="content" required maxLength={300} rows={3} className="bg-white" />
      </div>
      <CommentSubmit />
    </form>
  );
}

function CommentItem({
  postId,
  comment,
  createdLabel,
}: {
  postId: number;
  comment: PublicComment;
  createdLabel: string;
}) {
  const [state, formAction] = useActionState(deleteCommentAction, null as FormState);
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-medium text-[#14372c]">{comment.author}</span>
        <time className="text-[11px] text-[#8b97a3]" dateTime={comment.createdAt}>
          {createdLabel}
        </time>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#243140]">{comment.content}</p>
      <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="commentId" value={comment.id} />
        <label className="sr-only" htmlFor={`comment-delete-${comment.id}`}>
          {comment.author} 댓글 삭제 비밀번호
        </label>
        <Input
          id={`comment-delete-${comment.id}`}
          name="password"
          type="password"
          required
          minLength={4}
          maxLength={20}
          autoComplete="new-password"
          placeholder="삭제 비밀번호"
          className="h-7 w-32 bg-white text-xs"
        />
        <Button type="submit" variant="ghost" size="xs">
          삭제
        </Button>
        {state?.message ? (
          <p role="alert" className="text-xs text-[#c5362b]">
            {state.message}
          </p>
        ) : null}
      </form>
    </li>
  );
}

export function CommentSection({
  postId,
  comments,
}: {
  postId: number;
  comments: Array<PublicComment & { createdLabel: string }>;
}) {
  return (
    <section id="comments" className="scroll-mt-4 overflow-hidden rounded-md border border-[#d3dde4] bg-white">
      <h2 className="border-b border-[#e6edf2] px-4 py-3 text-sm font-semibold text-[#14372c]">
        댓글 {comments.length.toLocaleString("ko-KR")}
      </h2>
      {comments.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[#6b7680]">아직 댓글이 없습니다. 한 줄 응원을 남겨 주세요.</p>
      ) : (
        <ul className="divide-y divide-[#f0f3f6]">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              postId={postId}
              comment={comment}
              createdLabel={comment.createdLabel}
            />
          ))}
        </ul>
      )}
      <CommentForm key={comments.length} postId={postId} />
    </section>
  );
}
