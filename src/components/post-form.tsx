"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, type UserCategory } from "@/lib/constants";
import { createPostAction, updatePostAction, type FormState } from "@/lib/actions";

type Initial = {
  author: string;
  category: UserCategory;
  title: string;
  content: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "등록 중…" : label}
    </Button>
  );
}

export function PostForm({
  mode,
  postId,
  initial,
}: {
  mode: "create" | "edit";
  postId?: number;
  initial?: Initial;
}) {
  const action = mode === "create" ? createPostAction : updatePostAction;
  const [state, formAction] = useActionState(action, null as FormState);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="postId" value={postId} /> : null}
      {state?.message ? (
        <p role="alert" className="rounded-md bg-[#fff1f0] px-3 py-2 text-sm text-[#c5362b]">
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="author">닉네임</Label>
          <Input
            id="author"
            name="author"
            required
            maxLength={12}
            autoComplete="nickname"
            defaultValue={initial?.author}
            placeholder="12자 이내"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={4}
            maxLength={20}
            autoComplete="new-password"
            placeholder="수정·삭제용"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">말머리</Label>
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? "응원"}
            className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="title">제목</Label>
          <span className="text-xs text-[#8b97a3]">{title.length}/80</span>
        </div>
        <Input
          id="title"
          name="title"
          required
          maxLength={80}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="제목을 입력해 주세요"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="content">내용</Label>
          <span className="text-xs text-[#8b97a3]">{content.length}/5000</span>
        </div>
        <Textarea
          id="content"
          name="content"
          required
          maxLength={5000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={12}
          placeholder="응원이나 막판 정보를 적어 주세요. 개인정보와 비방은 빼 주세요."
          className="min-h-56 bg-white text-sm leading-6"
        />
      </div>
      <p className="text-xs leading-5 text-[#6b7680]">
        비밀번호는 이 글을 고치거나 지울 때만 확인합니다. 서버에는 암호화해서 저장합니다.
      </p>
      <div className="flex items-center gap-2">
        <SubmitButton label={mode === "create" ? "등록" : "수정"} />
        <Link
          href={mode === "edit" && postId ? `/post/${postId}` : "/"}
          className="inline-flex h-8 items-center rounded-lg px-3 text-sm text-[#52606d] hover:bg-[#eef3f6]"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
