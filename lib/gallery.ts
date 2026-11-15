export type Shot = { src: string; place: string; credit: string };

export type TrussType = {
  id: string;
  name: string;
  note: string;
  shots: Shot[];
};

export const TRUSS_TYPES: TrussType[] = [
  {
    id: "warren",
    name: "와렌",
    note: "수직재 없이 삼각형만 반복합니다. 사재의 인장과 압축이 번갈아 나타납니다.",
    shots: [
      { src: "/gallery/warren-bridge.jpg", place: "와렌 트러스 다리", credit: "Geograph, CC BY-SA 2.0" },
      { src: "/gallery/warren-through.jpg", place: "와렌 스루 트러스. 차도가 트러스 안을 지납니다.", credit: "HAER, Wikimedia Commons" },
    ],
  },
  {
    id: "pratt",
    name: "프랫",
    note: "사재가 경간 중앙으로 내려갑니다. 사재는 인장, 수직재는 압축인 경우가 많습니다.",
    shots: [
      { src: "/gallery/pratt-neshanic.jpg", place: "프랫 스루 트러스", credit: "Wikimedia Commons, CC BY-SA 4.0" },
      { src: "/gallery/pratt-guilford.jpg", place: "채석장 프랫 트러스", credit: "Wikimedia Commons, CC BY-SA 4.0" },
      { src: "/gallery/pratt-pony.jpg", place: "포니 프랫. 상현재가 차도보다 낮습니다.", credit: "Wikimedia Commons, CC BY-SA 3.0" },
    ],
  },
  {
    id: "howe",
    name: "하우",
    note: "사재가 중앙으로 올라갑니다. 프랫과 경사만 반대입니다.",
    shots: [
      { src: "/gallery/howe-side.jpg", place: "하우 트러스 측면", credit: "Wikimedia Commons, CC BY-SA 4.0" },
      { src: "/gallery/howe-river.jpg", place: "강 위의 하우 트러스", credit: "Public domain" },
      { src: "/gallery/howe-diagram.jpg", place: "부재 이름. 사재가 바깥 아래에서 가운데 위로.", credit: "Wikimedia Commons, CC BY-SA 4.0" },
    ],
  },
  {
    id: "king",
    name: "킹포스트",
    note: "마루의 수직재가 하나인 작은 지붕입니다. 수직재는 인장인 경우가 많습니다.",
    shots: [
      { src: "/gallery/king-cahir.jpg", place: "성 지붕의 킹포스트", credit: "Wikimedia Commons, CC BY-SA 4.0" },
      { src: "/gallery/king-barn.jpg", place: "헛간 지붕. 가운데 수직재 하나.", credit: "Geograph, CC BY-SA 2.0" },
      { src: "/gallery/king-variation.jpg", place: "킹포스트 변형", credit: "Wikimedia Commons, CC BY-SA 3.0" },
    ],
  },
  {
    id: "fink",
    name: "핑크",
    note: "지붕에서 사재가 여러 겹으로 모입니다. 긴 경간을 짧게 나눕니다.",
    shots: [
      { src: "/gallery/fink-milltown.jpg", place: "발전소 지붕의 강재 핑크 트러스", credit: "HAER, Wikimedia Commons" },
      { src: "/gallery/fink-boise.jpg", place: "리벳으로 이은 핑크 트러스", credit: "HAER, Wikimedia Commons" },
    ],
  },
  {
    id: "space",
    name: "공간 트러스",
    note: "한 평면이 아닙니다. 부재가 x·y·z로 만나 지붕이나 돔을 이룹니다.",
    shots: [
      { src: "/gallery/space-dome.jpg", place: "스페이스 프레임 돔", credit: "Wikimedia Commons, CC BY-SA 4.0" },
      { src: "/gallery/space-hall.jpg", place: "다목적 홀 지붕", credit: "Wikimedia Commons" },
      { src: "/gallery/space-hall-2.jpg", place: "격자 지붕을 아래에서", credit: "Wikimedia Commons" },
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
];
