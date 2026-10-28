"use client";

export function Lesson({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-back" role="presentation" onClick={onClose}>
      <article className="modal" role="dialog" aria-labelledby="lesson-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2 id="lesson-title">절점법, 다섯 줄로 시작하기</h2>
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </header>
        <section>
          <h3>1. 트러스가 가정하는 것</h3>
          <p>
            부재는 곧은 막대이고 절점은 마찰 없는 핀입니다. 하중과 반력은 절점에만 작용합니다. 그래서 부재에는 휨이 없고 축력만 있습니다. 당겨지면 인장, 눌리면 압축입니다.
          </p>
        </section>
        <section>
          <h3>2. 안정인지 정정인지</h3>
          <p>
            평면 트러스에서 절점 수 j, 부재 수 m, 반력 수 r에 대해 m + r = 2j 이면 정정입니다. 부재가 모자라면 기구가 되어 무너지고, 부재가 더 많으면 부정정이라 절점 평형만으로는 축력이 하나로 정해지지 않습니다. 이때 이 프로그램은 부재 강성 EA를 넣은 직접강성법으로 분담을 계산합니다.
          </p>
        </section>
        <section>
          <h3>3. 절점법의 순서</h3>
          <p>
            먼저 구조물 전체의 ΣFx = 0, ΣFy = 0, ΣM = 0 으로 반력을 구합니다. 그다음 미지 부재가 2개 이하인 절점을 골라 ΣFx = 0, ΣFy = 0 을 풉니다. 방금 구한 축력을 다음 절점의 기지값으로 넘깁니다. 계산기에서 트러스가 정정이면 이 순서가 해설에 그대로 나옵니다.
          </p>
        </section>
        <section>
          <h3>4. 인장재와 압축재</h3>
          <p>
            케이블과 로프는 압축 허용이 0입니다. 철근은 인장에 강하고 압축에는 좌굴합니다. 콘크리트, 벽돌, 석재는 반대입니다. 나무는 이 모형에서 인장 100N, 압축 55N이라 작은 압축재로도 쓸 수 있지만 큰 압축에는 콘크리트나 강관이 필요합니다. 이동 하중에서는 같은 부재의 부호가 바뀔 수 있으니, 포락에서 한 번이라도 압축이 되면 케이블을 쓰면 안 됩니다.
          </p>
        </section>
        <section>
          <h3>5. 숫자 읽는 법</h3>
          <p>
            격자 한 칸은 1m, 힘은 N입니다. 교육용 모형 스케일이라 실제 자동차 무게와는 다릅니다. 부재 단면이 이미 정해져 있어 허용축력(N)과 비교합니다. 실무 설계에서는 응력 σ = N / A 를 허용응력과 비교합니다.
          </p>
        </section>
      </article>
    </div>
  );
}
