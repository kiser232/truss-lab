import type { Category } from "@/lib/constants";

export type Comment = {
  id: number;
  author: string;
  content: string;
  passwordHash: string;
  createdAt: string;
};

export type Post = {
  id: number;
  title: string;
  content: string;
  author: string;
  passwordHash: string;
  category: Category;
  isNotice: boolean;
  views: number;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  comments: Comment[];
  image?: string | null;
};

export type Database = {
  nextPostId: number;
  nextCommentId: number;
  posts: Post[];
  votes: Record<string, 1 | -1>;
  seen: Record<string, 1>;
};

export type PublicComment = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
};

export type PublicPost = {
  id: number;
  title: string;
  content: string;
  author: string;
  category: Category;
  isNotice: boolean;
  views: number;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  comments: PublicComment[];
  net: number;
  isConcept: boolean;
  myVote: 1 | -1 | 0;
  image: string | null;
};

export type Summary = {
  totalPosts: number;
  todayPosts: number;
  conceptCount: number;
  commentCount: number;
  examOffset: number;
};
