"use client";

import { useState } from "react";
import { forgetWrong, type WrongNote } from "@/lib/memory";

export function WrongBook({ notes, onChange }: { notes: WrongNote[]; onChange: () => void }) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  if (notes.length === 0) {
    return (
      <div className="panel" style={{ padding: 18 }}>
        <p className="note" style={{ margin: 0 }}>
          아직 틀린 문제가 없습니다. 퀴즈와 기출에서 놓치면 여기에 모입니다.
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {notes.map((note) => {
        const mine = picked[note.key];
        const revealed = mine !== undefined;
        const good = mine === note.answer;
        return (
          <article key={note.key} className="post">
            <div className="row-tools">
              <span className="badge">{note.source}</span>
              <span className="note">{new Date(note.at).toLocaleDateString("ko-KR")}</span>
              <button
                type="button"
                className="quiet-btn"
                onClick={() => {
                  forgetWrong(note.key);
                  onChange();
                }}
              >
                지우기
              </button>
            </div>
            <h3>{note.prompt}</h3>
            <p className="note">지난 답 {note.picked}</p>
            {note.choices.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {note.choices.map((choice) => {
                  const cls = !revealed ? "" : choice === note.answer ? "good" : mine === choice ? "bad" : "";
                  return (
                    <button
                      key={choice}
                      type="button"
                      className={`quiz-option ${cls}`}
                      disabled={revealed}
                      onClick={() => {
                        setPicked((prev) => ({ ...prev, [note.key]: choice }));
                        if (choice === note.answer) {
                          forgetWrong(note.key);
                          onChange();
                        }
                      }}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {revealed ? <p style={{ fontWeight: 800, color: good ? "#157a3a" : "#be123c" }}>{good ? "맞아서 노트에서 뺐습니다." : `정답 ${note.answer}`}</p> : null}
          </article>
        );
      })}
    </div>
  );
}
