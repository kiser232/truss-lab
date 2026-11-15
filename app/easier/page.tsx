import { Footer } from "@/components/chrome";
import { TrussPhotos } from "@/components/truss-photos";

export default function EasierPage() {
  return (
    <>
      <main className="doc wide">
        <p className="kicker">STRUCTURE</p>
        <h1>구조역학을 더 쉽게</h1>
        <p className="note">대표 사진으로 형태를 먼저 보고, 누르면 같은 종류의 다른 사진이 열립니다.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, margin: "18px 0" }}>
          <article className="doc-card">
            <svg viewBox="0 0 220 80" aria-hidden>
              <line x1="30" y1="50" x2="180" y2="50" stroke="#2a62ea" strokeWidth="6" />
              <polygon points="168,50 156,44 156,56" fill="#2a62ea" />
              <polygon points="42,50 54,44 54,56" fill="#2a62ea" />
            </svg>
            <h3>인장 +</h3>
            <p>부재가 절점을 끌어당깁니다.</p>
          </article>
          <article className="doc-card">
            <svg viewBox="0 0 220 80" aria-hidden>
              <line x1="40" y1="50" x2="180" y2="50" stroke="#e23b4a" strokeWidth="6" />
              <polygon points="48,50 62,44 62,56" fill="#e23b4a" />
              <polygon points="172,50 158,44 158,56" fill="#e23b4a" />
            </svg>
            <h3>압축 −</h3>
            <p>부재가 절점을 밖으로 밉니다.</p>
          </article>
        </div>
        <TrussPhotos />
      </main>
      <Footer />
    </>
  );
}
