"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, type UserCategory } from "@/lib/constants";
import { createPostAction, updatePostAction, type FormState } from "@/lib/actions";
import { MAX_IMAGE_BYTES } from "@/lib/images";

type Initial = {
  author: string;
  category: UserCategory;
  title: string;
  content: string;
  image: string | null;
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
  const [preview, setPreview] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    if (!file) {
      setPreview(null);
      setLocalMessage(null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      event.target.value = "";
      setPreview(null);
      setLocalMessage("이미지는 5MB 이하만 올릴 수 있습니다.");
      return;
    }
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    setLocalMessage(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem("image");
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (file && file.size > MAX_IMAGE_BYTES) {
      event.preventDefault();
      setLocalMessage("이미지는 5MB 이하만 올릴 수 있습니다.");
    }
  }

  const message = localMessage ?? state?.message;
  const shownImage = preview ?? initial?.image ?? null;

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-4" onSubmit={onSubmit}>
      {mode === "edit" ? <input type="hidden" name="postId" value={postId} /> : null}
      {message ? (
        <p role="alert" className="rounded-md bg-[#fff1f0] px-3 py-2 text-sm text-[#c5362b]">
          {message}
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
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={80}
          defaultValue={initial?.title}
          placeholder="제목을 입력해 주세요"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="content">내용</Label>
        <Textarea
          id="content"
          name="content"
          required
          maxLength={5000}
          defaultValue={initial?.content}
          rows={12}
          placeholder="응원이나 막판 정보를 적어 주세요. 개인정보와 비방은 빼 주세요."
          className="min-h-56 bg-white text-sm leading-6"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="image">이미지</Label>
        {shownImage ? (
          // User-picked files and animated GIFs have unknown dimensions.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownImage}
            alt={preview ? "선택한 이미지 미리보기" : "현재 글의 이미지"}
            className="max-h-64 max-w-full rounded-md border border-[#e6edf2] bg-[#f6f8fa] object-contain"
          />
        ) : null}
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
          onChange={onImageChange}
          className="block w-full text-sm text-[#243140] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e7f3ee] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#14372c]"
        />
        {mode === "edit" && initial?.image && !preview ? (
          <label className="flex items-center gap-2 text-sm text-[#243140]">
            <input type="checkbox" name="removeImage" value="1" className="size-4 accent-[#1f6b4a]" />
            현재 이미지 삭제
          </label>
        ) : null}
        <p className="text-xs leading-5 text-[#6b7680]">
          한 장만 올릴 수 있습니다. jpg, png, gif, webp, 5MB 이하.
          {mode === "edit" ? " 새 파일을 고르면 기존 이미지를 바꿉니다." : ""}
        </p>
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
