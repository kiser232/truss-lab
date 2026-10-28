"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="simple-page">
      <div>
        <h1>화면을 불러오지 못했습니다</h1>
        <button type="button" onClick={() => reset()}>
          다시 시도
        </button>
      </div>
    </main>
  );
}
