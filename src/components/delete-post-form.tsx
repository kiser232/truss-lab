"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deletePostAction, type FormState } from "@/lib/actions";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      {pending ? "삭제 중…" : "삭제"}
    </Button>
  );
}

export function DeletePostForm({ postId }: { postId: number }) {
  const [state, formAction] = useActionState(deletePostAction, null as FormState);
  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="postId" value={postId} />
      <label className="sr-only" htmlFor={`delete-${postId}`}>
        삭제용 비밀번호
      </label>
      <Input
        id={`delete-${postId}`}
        name="password"
        type="password"
        required
        minLength={4}
        maxLength={20}
        autoComplete="new-password"
        placeholder="비밀번호"
        className="bg-white sm:w-36"
      />
      <DeleteButton />
      {state?.message ? (
        <p role="alert" className="text-sm text-[#c5362b]">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
