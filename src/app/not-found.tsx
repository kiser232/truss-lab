import Link from "next/link";

export default function NotFound() {
  return (
    <main className="simple-page">
      <div>
        <h1>없는 페이지입니다</h1>
        <Link href="/">트러스 실습실로</Link>
      </div>
    </main>
  );
}
