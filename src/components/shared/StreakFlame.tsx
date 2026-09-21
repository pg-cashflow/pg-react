import React, { useEffect, useState } from "react";

export default function StreakFlame({ streak = 0, maxStreak = 24, size = 88 }: { streak?: number; maxStreak?: number; size?: number }) {
  const [display, setDisplay] = useState(0);
  const fill = Math.min(1, streak / Math.max(1, maxStreak));

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(streak);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 800;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * streak));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [streak]);

  const W = 64;
  const H = 80;
  const fillH = H * fill;
  const uid = React.useId().replace(/:/g, "");
  const flamePath = "M32 4 C 40 20, 56 28, 56 48 A 24 24 0 1 1 8 48 C 8 28, 24 20, 32 4 Z";
  const innerPath = "M32 24 C 37 36, 47 40, 47 53 A 15 15 0 1 1 17 53 C 17 40, 27 36, 32 24 Z";

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <div className="pg-flame-flicker" style={{ width: size, height: size * (H / W) }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden>
          <defs>
            <linearGradient id={`pg-flame-${uid}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#B87D12" />
              <stop offset="100%" stopColor="#E8A324" />
            </linearGradient>
            <clipPath id={`pg-clip-${uid}`}>
              <rect x="0" y={H - fillH} width={W} height={fillH} rx="6" />
            </clipPath>
          </defs>
          <path d={flamePath} fill="none" stroke="rgba(232,163,36,0.28)" strokeWidth="2" />
          <path d={flamePath} fill={`url(#pg-flame-${uid})`} clipPath={`url(#pg-clip-${uid})`} />
          <path d={innerPath} fill="rgba(255,255,255,0.32)" clipPath={`url(#pg-clip-${uid})`} />
        </svg>
      </div>
      <div className="t-display mt-1 text-accent">{display}</div>
    </div>
  );
}
