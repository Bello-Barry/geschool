export function SectionDivider() {
  return (
    <div className="relative h-24" aria-hidden="true">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 96"
        preserveAspectRatio="none"
        fill="hsl(var(--primary))"
        opacity={0.03}
      >
        <path d="M0,48 C300,96 600,0 900,48 C1050,72 1125,84 1200,60 L1200,96 L0,96 Z" />
      </svg>
    </div>
  );
}
