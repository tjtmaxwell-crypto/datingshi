export function WorksheetPlaceholder() {
  return (
    <figure className="overflow-hidden rounded-3xl border border-[#ead9c0] bg-[#fffdf8]">
      <svg viewBox="0 0 360 210" className="h-auto w-full" role="img" aria-label="作业照片示意，没有上传真实图片">
        <rect width="360" height="210" fill="#FFF9F0" />
        <rect x="28" y="22" width="304" height="166" rx="12" fill="#fff" stroke="#E7D3B0" />
        <path d="M48 62h180M48 92h220M48 122h200M48 152h150" stroke="#F0E2CC" strokeWidth="2" />
        <text x="48" y="58" fill="#C4B09A" fontSize="14">
          练习
        </text>
        <text x="48" y="118" fill="#8A6A52" fontSize="20" fontFamily="serif">
          5x − 3 = 2x + 9
        </text>
        <rect x="214" y="36" width="92" height="28" rx="14" fill="#F8E7C6" />
        <text x="228" y="55" fill="#8A5A12" fontSize="13">
          示意照片
        </text>
      </svg>
      <figcaption className="px-4 py-2 text-xs text-[#8A6A52]">没有接上真实相机，这张只是占位。</figcaption>
    </figure>
  );
}
