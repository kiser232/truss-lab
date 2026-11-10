import Link from "next/link";
import { Footer } from "@/components/chrome";

export default function HomePage() {
  return (
    <>
      <main className="wrap">
        <section className="hero">
          <div>
            <p className="kicker">THINK · BUILD · UNDERSTAND</p>
            <h1>
              구조를 이해하는,
              <br />
              가장 단단한 시작.
            </h1>
          </div>
          <div className="hero-copy">
            <h2>복잡한 트러스도 한 단계씩, 명확하게.</h2>
            <p>
              직접 계산하고, 실습으로 익히고, 퀴즈로 확인하세요.
              <br />
              나에게 맞는 방법으로 구조역학을 시작해 보세요.
            </p>
          </div>
        </section>

        <section className="cards">
          <article className="entry">
            <div className="entry-art blue">
              <span className="entry-label">ANALYZE</span>
              <span className="entry-no">01</span>
              <TrussArt />
            </div>
            <div className="entry-body">
              <h3>트러스 계산기</h3>
              <p>
                절점과 하중을 입력하고,
                <br />
                부재력과 지점 반력을 한눈에 확인하세요.
              </p>
              <Link href="/lab" className="cta primary">
                계산 시작하기 <Arrow />
              </Link>
            </div>
          </article>

          <article className="entry">
            <div className="entry-art green">
              <span className="entry-label">EXPLORE</span>
              <span className="entry-no">02</span>
              <ExploreArt />
            </div>
            <div className="entry-body">
              <h3>실습</h3>
              <p>
                직접 트러스를 설계하여 단계별 문제를 풀고,
                <br />
                자재 비용과 절점법 풀이를 확인하세요.
              </p>
              <Link href="/practice" className="cta quiet">
                실습 시작하기 <Arrow />
              </Link>
            </div>
          </article>

          <article className="entry">
            <div className="entry-art lilac">
              <span className="entry-label">CHALLENGE</span>
              <span className="entry-no">03</span>
              <QuizArt />
            </div>
            <div className="entry-body">
              <h3>퀴즈</h3>
              <p>
                배운 개념을 문제로 확인하고,
                <br />
                헷갈렸던 원리를 확실하게 다져보세요.
              </p>
              <Link href="/quiz" className="cta quiet">
                퀴즈 풀기 <Arrow />
              </Link>
            </div>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M4 9h10M10 5l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrussArt() {
  return (
    <svg viewBox="0 0 360 150" style={{ position: "absolute", inset: "36px 18px 10px" }} aria-hidden>
      {[0, 1, 2, 3, 4].map((col) => (
        <line key={`c${col}`} x1={40 + col * 70} y1="18" x2={40 + col * 70} y2="118" stroke="#d5e2f7" />
      ))}
      {[0, 1, 2].map((row) => (
        <line key={`r${row}`} x1="30" y1={28 + row * 36} x2="330" y2={28 + row * 36} stroke="#d5e2f7" />
      ))}
      <polyline points="50,96 120,48 190,48 260,96" fill="none" stroke="#2f6bff" strokeWidth="3" />
      <line x1="50" y1="96" x2="260" y2="96" stroke="#2f6bff" strokeWidth="3" />
      <line x1="120" y1="48" x2="120" y2="96" stroke="#2f6bff" strokeWidth="3" />
      <line x1="190" y1="48" x2="190" y2="96" stroke="#2f6bff" strokeWidth="3" />
      <line x1="120" y1="48" x2="190" y2="96" stroke="#2f6bff" strokeWidth="3" />
      <line x1="190" y1="48" x2="120" y2="96" stroke="#2f6bff" strokeWidth="3" />
      {[
        [50, 96],
        [120, 48],
        [190, 48],
        [260, 96],
        [120, 96],
        [190, 96],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="white" stroke="#2f6bff" strokeWidth="2.4" />
      ))}
      <polygon points="40,104 50,118 60,104" fill="#8aa4d4" />
      <polygon points="250,104 260,118 270,104" fill="#8aa4d4" />
      <line x1="155" y1="22" x2="155" y2="44" stroke="#ef8a24" strokeWidth="2.4" />
      <polygon points="155,50 150,40 160,40" fill="#ef8a24" />
      <text x="166" y="36" fontSize="12" fontWeight="700" fill="#ef8a24">
        10 kN
      </text>
    </svg>
  );
}

function ExploreArt() {
  return (
    <svg viewBox="0 0 360 150" style={{ position: "absolute", inset: "42px 24px 8px" }} aria-hidden>
      <polyline points="36,108 110,62 180,62 250,108" fill="none" stroke="#2f9a62" strokeWidth="3.2" />
      <line x1="36" y1="108" x2="250" y2="108" stroke="#2f9a62" strokeWidth="3.2" />
      <line x1="110" y1="62" x2="110" y2="108" stroke="#2f9a62" strokeWidth="3.2" />
      <line x1="180" y1="62" x2="180" y2="108" stroke="#2f9a62" strokeWidth="3.2" />
      {[
        [36, 108],
        [110, 62],
        [180, 62],
        [250, 108],
        [110, 108],
        [180, 108],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill="white" stroke="#2f9a62" strokeWidth="2.6" />
      ))}
      <rect x="168" y="28" width="92" height="28" rx="8" fill="white" />
      <text x="180" y="47" fontSize="13" fontWeight="700" fill="#1f7a45">
        하중 + 5 kN
      </text>
      <path d="M196 118 l8 16 8-4" fill="#172033" />
    </svg>
  );
}

function QuizArt() {
  return (
    <svg viewBox="0 0 360 150" style={{ position: "absolute", inset: "28px 16px 8px" }} aria-hidden>
      <rect x="28" y="18" width="304" height="118" rx="16" fill="white" />
      <text x="48" y="48" fontSize="13" fontWeight="700" fill="#66758a">
        Q. 부재가 당겨질 때 발생하는 힘은?
      </text>
      <rect x="48" y="64" width="120" height="36" rx="10" fill="#efe6fa" />
      <text x="62" y="87" fontSize="14" fontWeight="800" fill="#6d4ea8">
        ① 인장력
      </text>
      <rect x="180" y="64" width="120" height="36" rx="10" fill="#f4f6f8" />
      <text x="194" y="87" fontSize="14" fontWeight="700" fill="#8b97a8">
        ② 압축력
      </text>
    </svg>
  );
}
