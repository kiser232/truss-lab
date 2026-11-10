"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/guide", label: "학습 가이드" },
  { href: "/easier", label: "구조역학을 더 쉽게" },
];

function isCurrent(path: string, href: string) {
  const normalize = (value: string) => (value.length > 1 ? value.replace(/\/+$/, "") : value);
  return normalize(path) === normalize(href);
}

export function Header() {
  const path = usePathname();
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="트러스 랩 홈">
        <span className="brand-mark" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M9 2.2 L16 15.2 H2 Z" fill="white" />
          </svg>
        </span>
        <span className="brand-name">트러스 랩</span>
        <span className="brand-en">TRUSS LAB</span>
      </Link>
      <nav className="nav">
        {LINKS.map((link, index) => (
          <span key={link.href} style={{ display: "contents" }}>
            {index === 2 ? <i className="split" /> : null}
            <Link href={link.href} className={isCurrent(path, link.href) ? "active" : ""}>
              {link.label}
            </Link>
          </span>
        ))}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="wrap site-footer">
      <strong>TRUSS LAB</strong>
      <span>이해에서 설계로, 한 걸음씩.</span>
      <span>구조역학 학습을 위한 트러스 탐구 공간</span>
    </footer>
  );
}
