import Link from "next/link";
import { Footer } from "@/components/chrome";

const STEPS = [
  { n: "1", title: "축력만", body: "핀 절점. 휨 없음. 당기면 +, 누르면 −." },
  { n: "2", title: "정정", body: "m + r = 2j 이면 절점법으로 하나가 정해집니다." },
  { n: "3", title: "순서", body: "전체 ΣF, ΣM으로 반력. 그다음 미지 부재가 2개 이하인 절점." },
  { n: "4", title: "자재", body: "케이블은 압 0. 부호가 바뀌면 양쪽 허용이 있는 재료." },
  { n: "5", title: "숫자", body: "한 칸 1m. 힘의 단위는 N. 허용을 넘으면 파괴." },
];

export default function GuidePage() {
  return (
    <>
      <main className="doc">
        <p className="kicker">GUIDE</p>
        <h1>절점법, 다섯 줄</h1>
        <p className="note">계산기에서 단계를 누르면 그 절점만 켜집니다.</p>
        <div className="doc-grid">
          {STEPS.map((step) => (
            <article key={step.n} className="doc-card">
              <span className="badge">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
          <article className="doc-card">
            <span className="badge">우클릭</span>
            <h3>자재 고르기</h3>
            <p>부재를 잇는 도중 우클릭. 비용은 길이 × /m.</p>
            <p style={{ marginTop: 10 }}>
              <Link href="/lab" className="cta primary" style={{ display: "inline-flex", width: "auto" }}>
                계산기로
              </Link>
            </p>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
