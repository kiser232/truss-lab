export type Shot = { src: string; place: string; credit: string };

export type TrussType = {
  id: string;
  name: string;
  note: string;
  shots: Shot[];
};

const sheet = "사진 자료";

export const TRUSS_TYPES: TrussType[] = [
  {
    id: "warren",
    name: "워런",
    note: "삼각형만 반복합니다. 수직재 없이 사재가 잇달아 만납니다.",
    shots: [
      { src: "/gallery/sheet/warren-a.jpg", place: "워런 트러스 다리", credit: sheet },
      { src: "/gallery/sheet/warren-b.jpg", place: "평행현 워런. 열차가 트러스 안을 지납니다.", credit: sheet },
      { src: "/gallery/sheet/warren-2.jpg", place: "보행교의 워런 트러스", credit: sheet },
      { src: "/gallery/sheet/warren-diagram.jpg", place: "워런 뼈대", credit: sheet },
    ],
  },
  {
    id: "howe",
    name: "하우",
    note: "사재가 가운데를 향해 올라갑니다. 수직재가 패널을 나눕니다.",
    shots: [
      { src: "/gallery/sheet/howe-1.jpg", place: "하우 트러스 다리", credit: sheet },
      { src: "/gallery/sheet/howe-2.jpg", place: "강 위의 하우 트러스", credit: sheet },
      { src: "/gallery/sheet/howe-diagram.jpg", place: "하우 뼈대", credit: sheet },
    ],
  },
  {
    id: "pratt",
    name: "프랫",
    note: "사재가 가운데를 향해 내려갑니다. 자료집에는 렌트 트러스로 적혀 있습니다.",
    shots: [
      { src: "/gallery/sheet/pratt-a.jpg", place: "프랫 트러스 다리", credit: sheet },
      { src: "/gallery/sheet/pratt-b.jpg", place: "철도 프랫 트러스", credit: sheet },
      { src: "/gallery/sheet/pratt-diagram.jpg", place: "프랫 뼈대", credit: sheet },
    ],
  },
  {
    id: "other",
    name: "그 외",
    note: "더블 워런, 격자, 아치형, 지붕의 공간 트러스입니다.",
    shots: [
      { src: "/gallery/sheet/other-1.jpg", place: "사재가 겹친 격자 트러스", credit: sheet },
      { src: "/gallery/sheet/other-2.jpg", place: "더블 워런에 가까운 강재 트러스", credit: sheet },
      { src: "/gallery/sheet/other-3.jpg", place: "나무 트러스", credit: sheet },
      { src: "/gallery/sheet/other-4.jpg", place: "지붕을 받친 공간 트러스", credit: sheet },
      { src: "/gallery/sheet/other-5.jpg", place: "역사의 아치 지붕", credit: sheet },
      { src: "/gallery/sheet/other-6.jpg", place: "수직재가 있는 평행현 트러스", credit: sheet },
      { src: "/gallery/sheet/other-7.jpg", place: "활처럼 휜 상현재", credit: sheet },
    ],
  },
];

export const SEED_TIPS: { id: string; title: string; body: string }[] = [
  { id: "seed-reaction", title: "반력부터", body: "부재로 들어가기 전에 전체 ΣFx, ΣFy, ΣM. 모멘트는 핀 절점에서 잡으면 그 점의 반력이 사라집니다." },
  { id: "seed-joint", title: "절점 고르기", body: "미지 부재가 2개 이하인 절점만. 공간 트러스는 3개 이하. 식을 세운 뒤 다음 절점으로." },
  { id: "seed-sign", title: "부호", body: "부재가 절점을 당기면 +, 밀면 −. 그림의 화살은 절점이 부재에 주는 힘이라 축력과 반대 방향입니다." },
  { id: "seed-zero", title: "제로 부재", body: "하중도 지점도 없는 절점에서 부재가 둘이고 한 직선이 아니면, 둘 다 축력 0입니다." },
  { id: "seed-cable", title: "케이블", body: "압축 허용은 0. 하중 위치에 따라 부호가 바뀌면 나무나 강관처럼 양쪽이 되는 재료." },
  { id: "seed-web", title: "사재 방향", body: "프랫은 사재가 경간 중앙으로 내려가고, 하우는 올라갑니다. 방향만 봐도 인장 자리를 가늠할 수 있습니다." },
  { id: "seed-grid", title: "격자", body: "휠이나 +/−. 0.5m에서 0.25, 0.1, 0.05m. 빈 곳을 끌면 기본 화면 밖까지 절점을 놓습니다." },
  { id: "seed-space", title: "3D", body: "바닥은 x·z, 높이는 y. 빈 곳을 끌면 회전, Shift는 이동. 볼 지점이 x·y·z를 막고, 정정은 m+r=3j." },
  { id: "seed-assume", title: "인장으로 가정", body: "절점에서 부재가 당기는 방향을 +로 두고 풉니다. 답이 음수면 압축입니다. 기출의 N1, N2도 같은 부호입니다." },
  { id: "seed-section", title: "단면으로 한 부재", body: "자르면 부재가 세 개 이하인 곳에서 ΣM. 모멘트 중심을 잘 고르면 한 부재만 남습니다. 2021 a부재는 반력×3 + a×높이 = 0." },
];
