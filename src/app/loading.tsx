export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <p className="sr-only">게시판을 불러오는 중입니다.</p>
      <div className="h-40 animate-pulse rounded-md border border-[#d3dde4] bg-white" />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="h-96 animate-pulse rounded-md border border-[#d3dde4] bg-white" />
        <div className="h-64 animate-pulse rounded-md border border-[#d3dde4] bg-white" />
      </div>
    </div>
  );
}
