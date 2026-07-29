export function VertexLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Vertex logo"
    >
      <defs>
        <linearGradient id="vertex-logo-grad" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A4A7E3" />
          <stop offset="50%" stopColor="#6A4DD4" />
          <stop offset="100%" stopColor="#6E3377" />
        </linearGradient>
      </defs>
      <line x1="8" y1="8" x2="20" y2="20" stroke="url(#vertex-logo-grad)" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="8" x2="20" y2="20" stroke="url(#vertex-logo-grad)" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="32" x2="20" y2="20" stroke="url(#vertex-logo-grad)" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="32" x2="20" y2="20" stroke="url(#vertex-logo-grad)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="3.5" fill="#A4A7E3" />
      <circle cx="32" cy="8" r="3.5" fill="#6A4DD4" />
      <circle cx="8" cy="32" r="3.5" fill="#6A4DD4" />
      <circle cx="32" cy="32" r="3.5" fill="#6E3377" />
      <circle cx="20" cy="20" r="6" fill="url(#vertex-logo-grad)" />
    </svg>
  );
}
