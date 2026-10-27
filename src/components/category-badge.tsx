import { Badge } from "@/components/ui/badge";
import type { Category } from "@/lib/constants";
import { cn } from "cn";

const styles: Record<Category, string> = {
  공지: "bg-[#fff4d6] text-[#8a6200]",
  응원: "bg-[#e5f6ee] text-[#1f6b4a]",
  정보: "bg-[#e7f0fa] text-[#1a4f86]",
  질문: "bg-[#f3eefe] text-[#6941a3]",
  후기: "bg-[#fff1e4] text-[#b45309]",
  잡담: "bg-[#eef1f4] text-[#52606d]",
};

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <Badge
      variant="secondary"
      className={cn("h-5 rounded-sm px-1.5 text-[11px] font-medium", styles[category])}
    >
      {category}
    </Badge>
  );
}
