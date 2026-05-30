interface ScoreBlockProps {
  home: number;
  away: number;
}

export function ScoreBlock({ home, away }: ScoreBlockProps) {
  return (
    <div className="inline-flex items-baseline gap-2 font-mono font-bold text-[22px] leading-none px-2.5 py-1 rounded-md text-foreground bg-muted">
      <span>{home}</span>
      <span className="text-muted-foreground font-normal">–</span>
      <span>{away}</span>
    </div>
  );
}
