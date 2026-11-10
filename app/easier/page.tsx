import { Footer } from "@/components/chrome";

const TYPES = [
  { name: "와렌", note: "수직재 없음. 삼각형 반복. 사재는 인·압이 번갈아.", path: "M20 70 H180 M20 70 L60 28 H140 L180 70 M60 28 L100 70 M140 28 L100 70" },
  { name: "프랫", note: "사재가 중앙으로 내려감. 사재 인장, 수직재 압축이 되기 쉬움.", path: "M20 78 H190 M20 28 H190 M20 28 V78 M70 28 V78 M120 28 V78 M170 28 V78 M190 28 V78 M20 28 L70 78 M190 28 L120 78" },
  { name: "하우", note: "사재가 중앙으로 올라감. 프랫과 경사만 반대.", path: "M20 78 H190 M20 28 H190 M20 28 V78 M70 28 V78 M120 28 V78 M170 28 V78 M190 28 V78 M70 28 L20 78 M120 28 L190 78" },
  { name: "킹포스트", note: "마루 수직재 하나. 작은 지붕. 수직재는 종종 인장.", path: "M20 78 H180 L100 24 Z M100 24 V78" },
];

export default function EasierPage() {
  return (
    <>
      <main className="doc">
        <p className="kicker">STRUCTURE</p>
        <h1>구조역학을 더 쉽게</h1>
        <p className="note">이름은 부재가 만나는 방식으로 읽습니다.</p>
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
        <div className="doc-grid">
          {TYPES.map((type) => (
            <article key={type.name} className="doc-card">
              <svg viewBox="0 0 210 100" aria-hidden>
                <path d={type.path} fill="none" stroke="#172033" strokeWidth="3" strokeLinejoin="round" />
              </svg>
              <h3>{type.name}</h3>
              <p>{type.note}</p>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
