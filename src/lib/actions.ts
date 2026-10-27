"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  addComment,
  castVote,
  createPost,
  deleteComment,
  deletePost,
  updatePost,
} from "@/lib/store";
import {
  isMessage,
  parseCategory,
  parseComment,
  parseContent,
  parseNickname,
  parsePassword,
  parseTitle,
} from "@/lib/validators";

export type FormState = { message: string } | null;

function refreshPost(id: number) {
  revalidatePath("/");
  revalidatePath(`/post/${id}`);
  revalidatePath(`/post/${id}/edit`);
}

function readWriteFields(formData: FormData) {
  const author = parseNickname(formData.get("author"));
  if (isMessage(author)) return author;
  const password = parsePassword(formData.get("password"));
  if (isMessage(password)) return password;
  const title = parseTitle(formData.get("title"));
  if (isMessage(title)) return title;
  const content = parseContent(formData.get("content"));
  if (isMessage(content)) return content;
  const category = parseCategory(formData.get("category"));
  if (isMessage(category)) return category;
  return { author, password, title, content, category };
}

export async function createPostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const fields = readWriteFields(formData);
  if (isMessage(fields)) return fields;
  const id = await createPost(fields);
  revalidatePath("/");
  redirect(`/post/${id}`);
}

export async function updatePostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = Number(formData.get("postId"));
  if (!Number.isInteger(id)) return { message: "글을 찾을 수 없습니다." };
  const fields = readWriteFields(formData);
  if (isMessage(fields)) return fields;
  const result = await updatePost(id, fields);
  if (!result.ok) return { message: result.message };
  refreshPost(id);
  redirect(`/post/${id}`);
}

export async function deletePostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = Number(formData.get("postId"));
  const password = parsePassword(formData.get("password"));
  if (!Number.isInteger(id)) return { message: "글을 찾을 수 없습니다." };
  if (isMessage(password)) return password;
  const result = await deletePost(id, password);
  if (!result.ok) return { message: result.message };
  revalidatePath("/");
  redirect("/");
}

export async function commentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const postId = Number(formData.get("postId"));
  const author = parseNickname(formData.get("author"));
  if (isMessage(author)) return author;
  const password = parsePassword(formData.get("password"));
  if (isMessage(password)) return password;
  const content = parseComment(formData.get("content"));
  if (isMessage(content)) return content;
  if (!Number.isInteger(postId)) return { message: "글을 찾을 수 없습니다." };
  const result = await addComment(postId, { author, password, content });
  if (!result.ok) return { message: result.message };
  refreshPost(postId);
  redirect(`/post/${postId}#comments`);
}

export async function deleteCommentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const postId = Number(formData.get("postId"));
  const commentId = Number(formData.get("commentId"));
  const password = parsePassword(formData.get("password"));
  if (!Number.isInteger(postId) || !Number.isInteger(commentId)) {
    return { message: "댓글을 찾을 수 없습니다." };
  }
  if (isMessage(password)) return password;
  const result = await deleteComment(postId, commentId, password);
  if (!result.ok) return { message: result.message };
  refreshPost(postId);
  redirect(`/post/${postId}#comments`);
}

export async function voteAction(formData: FormData) {
  const postId = Number(formData.get("postId"));
  const value = Number(formData.get("value"));
  if (!Number.isInteger(postId) || (value !== 1 && value !== -1)) return;
  const jar = await cookies();
  const voterId = jar.get("wj_vid")?.value;
  if (!voterId) return;
  await castVote(postId, voterId, value);
  refreshPost(postId);
}
