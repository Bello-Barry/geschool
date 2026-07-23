export function HeroBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Gradient de base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/0.1)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsl(var(--primary)/0.06)_0%,_transparent_50%)]" />

      {/* Cercles décoratifs */}
      <svg
        className="absolute -top-40 -right-40 w-[500px] h-[500px] opacity-20"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="250" cy="250" r="200" stroke="hsl(var(--primary))" strokeWidth="2" />
        <circle cx="250" cy="250" r="140" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 8" />
        <circle cx="250" cy="250" r="80" stroke="hsl(var(--primary))" strokeWidth="1" />
      </svg>

      {/* Motif points */}
      <svg
        className="absolute bottom-20 left-10 w-32 h-32 opacity-10"
        viewBox="0 0 100 100"
        fill="hsl(var(--foreground))"
      >
        {Array.from({ length: 10 }).map((_, i) =>
          Array.from({ length: 10 }).map((_, j) => (
            <circle key={`${i}-${j}`} cx={10 + i * 8} cy={10 + j * 8} r={1} />
          ))
        )}
      </svg>

      {/* Vague décorative */}
      <svg
        className="absolute bottom-0 left-0 w-full h-24 opacity-[0.03]"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        fill="hsl(var(--primary))"
      >
        <path d="M0,60 C200,0 400,120 600,60 C800,0 1000,120 1200,60 L1200,120 L0,120 Z" />
      </svg>
    </div>
  );
}
