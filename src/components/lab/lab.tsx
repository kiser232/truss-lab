"use client";

import { useState } from "react";
import { Calculator } from "./calculator";
import { Lesson } from "./lesson";
import { Practice } from "./practice";

type Mode = "calc" | "practice";

const MODES: Record<Mode, { label: string; copy: string }> = {
  calc: {
    label: "트러스 계산기",
    copy: "절점과 부재를 자유롭게 놓고 축력을 확인합니다. 절점을 놓을 때 격자가 나타납니다.",
  },
  practice: {
    label: "실습",
    copy: "단계마다 주어진 예산 안에서 트러스를 설계합니다. 배경은 미션에 맞추거나 직접 고를 수 있습니다.",
  },
};

export function Lab() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [opened, setOpened] = useState<{ calc: boolean; practice: boolean }>({ calc: false, practice: false });
  const [lesson, setLesson] = useState(false);

  function open(next: Mode) {
    setOpened((current) => ({ ...current, [next]: true }));
    setMode(next);
  }

  return (
    <div className="lab">
      {mode === null ? (
        <Gate onOpen={open} />
      ) : (
        <>
          <header className="topbar">
            <div className="brand">
              <p className="kicker">건축구조 · 모형 실습실</p>
              <h1>{MODES[mode].label}</h1>
              <p>{MODES[mode].copy}</p>
            </div>
            <div className="mode-switch">
              <button type="button" onClick={() => setMode(null)}>
                처음으로
              </button>
              <button type="button" className="text-button" onClick={() => setLesson(true)}>
                절점법 수업
              </button>
            </div>
          </header>
        </>
      )}
      {opened.calc ? (
        <div hidden={mode !== "calc"}>
          <Calculator />
        </div>
      ) : null}
      {opened.practice ? (
        <div hidden={mode !== "practice"}>
          <Practice />
        </div>
      ) : null}
      {mode !== null ? (
        <footer className="colophon">
          격자 한 칸은 1m, 힘은 N인 교육용 모형입니다. 인장은 파랑, 압축은 적색입니다. 부재가 허용축력을 넘기면 파괴되고, 견디면 커서를 올린 부재의 축력이 나타납니다.
        </footer>
      ) : null}
      <Lesson open={lesson} onClose={() => setLesson(false)} />
    </div>
  );
}

function Gate({ onOpen }: { onOpen: (mode: Mode) => void }) {
  return (
    <section className="gate">
      <div className="brand">
        <p className="kicker">건축구조 · 모형 실습실</p>
        <h1>트러스 실습실</h1>
        <p>들어갈 화면을 고르세요.</p>
      </div>
      <div className="gate-choices">
        <button type="button" className="gate-card" onClick={() => onOpen("calc")}>
          <GateTruss />
          <span className="kicker">01</span>
          <strong>트러스 계산기</strong>
          <span>절점을 놓고 부재를 이어 축력과 파괴를 확인합니다.</span>
        </button>
        <button type="button" className="gate-card" onClick={() => onOpen("practice")}>
          <GateSpan />
          <span className="kicker">02</span>
          <strong>실습</strong>
          <span>예산 안에서 단계별 미션 트러스를 설계합니다.</span>
        </button>
      </div>
    </section>
  );
}

function GateTruss() {
  return (
    <svg className="gate-art" viewBox="0 0 220 96" aria-hidden="true">
      <path d="M18 78 H202" />
      <path d="M18 78 L110 22 L202 78" />
      <path d="M110 22 V78" />
      <circle cx="18" cy="78" r="4" />
      <circle cx="110" cy="78" r="4" />
      <circle cx="202" cy="78" r="4" />
      <circle cx="110" cy="22" r="4" />
    </svg>
  );
}

function GateSpan() {
  return (
    <svg className="gate-art gate-span" viewBox="0 0 220 96" aria-hidden="true">
      <path d="M0 70 C40 78 70 88 90 96 L0 96 Z" className="gate-bank" />
      <path d="M220 70 C180 78 150 88 130 96 L220 96 Z" className="gate-bank" />
      <path d="M78 92 C110 80 140 92 168 84" className="gate-water" />
      <path d="M24 62 H196" />
      <path d="M24 62 L70 28 H150 L196 62" />
      <path d="M70 28 V62 M150 28 V62" />
    </svg>
  );
}
