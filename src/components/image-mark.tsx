export function ImageMark() {
  return (
    <span className="ml-1 inline-flex translate-y-px text-[#7d8b99]" title="이미지">
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true" fill="none">
        <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="5.5" cy="6.5" r="1.1" fill="currentColor" />
        <path
          d="M2.5 11.5 6 8.2l2.2 2.1 1.6-1.4 3.7 3.1"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">이미지 첨부</span>
    </span>
  );
}
