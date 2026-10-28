"use client";

import { useState } from "react";
import { Calculator } from "./calculator";
import { Lesson } from "./lesson";
import { Practice } from "./practice";
import { QuizMode } from "./quiz-mode";

type Mode = "calc" | "practice" | "quiz";

const MODES: Array<{ id: Mode; label: string; copy: string }> = [
  { id: "calc", label: "트러스 계산기", copy: "격자에 절점을 놓고 부재와 하중을 올려 축력을 봅니다." },
  { id: "practice", label: "실습", copy: "제한된 비용 안에서 단계별 트러스를 설계합니다." },
  { id: "quiz", label: "퀴즈", copy: "재료, 트러스 형식, 인장·압축 부재를 무작위로 묻습니다." },
];

export function Lab() {
  const [mode, setMode] = useState<Mode>("calc");
  const [lesson, setLesson] = useState(false);
  return (
    <div className="lab">
      <header className="topbar">
        <div className="brand">
          <p className="kicker">건축구조 · 모형 실습실</p>
          <h1>트러스 실습실</h1>
          <p>절점에만 하중이 실리는 평면 트러스를 만들고, 절점법으로 축력을 읽습니다.</p>
        </div>
        <div className="mode-switch" role="tablist">
          {MODES.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} className={mode === item.id ? "on" : ""} onClick={() => setMode(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <div className="mode-copy">
        <span>{MODES.find((item) => item.id === mode)?.copy}</span>
        <button type="button" className="text-button" onClick={() => setLesson(true)}>
          절점법 수업
        </button>
      </div>
      {mode === "calc" ? <Calculator /> : null}
      {mode === "practice" ? <Practice /> : null}
      {mode === "quiz" ? <QuizMode /> : null}
      <footer className="colophon">
        격자 한 칸은 1m, 힘은 N인 교육용 모형입니다. 인장은 파랑, 압축은 적색입니다. 부재가 허용축력을 넘기면 파괴되고, 견디면 커서를 올린 부재의 축력이 나타납니다.
      </footer>
      <Lesson open={lesson} onClose={() => setLesson(false)} />
    </div>
  );
}
