import { Button } from "@/components/ui/button";
import { voteAction } from "@/lib/actions";
import { cn } from "cn";

export function VoteBar({
  postId,
  upvotes,
  downvotes,
  myVote,
}: {
  postId: number;
  upvotes: number;
  downvotes: number;
  myVote: 1 | -1 | 0;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={voteAction}>
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="value" value="1" />
        <Button
          type="submit"
          variant={myVote === 1 ? "default" : "outline"}
          className={cn("min-w-28 bg-white", myVote === 1 && "bg-[#14372c] text-white")}
        >
          추천 {upvotes.toLocaleString("ko-KR")}
        </Button>
      </form>
      <form action={voteAction}>
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="value" value="-1" />
        <Button type="submit" variant="outline" className={cn("min-w-28 bg-white", myVote === -1 && "border-[#c5362b] text-[#c5362b]")}>
          비추천 {downvotes.toLocaleString("ko-KR")}
        </Button>
      </form>
    </div>
  );
}
