"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-md border border-[#d3dde4] bg-white px-6 py-12 text-center">
      <h1 className="font-display text-3xl text-[#14372c]">게시판을 불러오지 못했습니다</h1>
      <p className="mt-2 text-sm text-[#52606d]">잠시 뒤 다시 시도해 주세요.</p>
      <Button type="button" className="mt-5" onClick={() => reset()}>
        다시 시도
      </Button>
    </div>
  );
}
