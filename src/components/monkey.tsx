export function MonkeyKing({
  className = "h-16 w-16",
  mood = "hello",
}: {
  className?: string;
  mood?: "hello" | "think" | "cheer" | "oops";
}) {
  const mouth = {
    hello: "M46 88c6 8 22 8 28 0",
    think: "M50 90h20",
    cheer: "M44 84c8 14 28 14 36 0",
    oops: "M48 94c6-8 22-8 28 0",
  }[mood];

  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="孙悟空">
      <ellipse cx="60" cy="108" rx="26" ry="7" fill="#E7C48A" />
      <circle cx="26" cy="64" r="13" fill="#F0C27A" />
      <circle cx="94" cy="64" r="13" fill="#F0C27A" />
      <circle cx="26" cy="64" r="7" fill="#F8D7A4" />
      <circle cx="94" cy="64" r="7" fill="#F8D7A4" />
      <circle cx="60" cy="66" r="34" fill="#F6C98A" />
      <path d="M28 50c8-24 56-24 64 0" fill="none" stroke="#E3A008" strokeWidth="8" strokeLinecap="round" />
      <circle cx="60" cy="42" r="5" fill="#D3542C" />
      <path d="M42 58c4-5 10-5 14 0M64 58c4-5 10-5 14 0" fill="none" stroke="#8A5A32" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="68" r="3.4" fill="#2C2118" />
      <circle cx="74" cy="68" r="3.4" fill="#2C2118" />
      <circle cx="49" cy="67" r="1" fill="#fff" />
      <circle cx="75" cy="67" r="1" fill="#fff" />
      <path d={mouth} fill="none" stroke="#8A3A22" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
