/**
 * Emerald SVG brand mark — stroke + fill use currentColor
 * (set color via CSS on the element / className).
 */
export default function LogoMark({ className, size = 28, title = 'JS Compiler' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Frame */}
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="7.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* J */}
      <path
        d="M11.25 9.5v8.1c0 1.85-.95 2.85-2.65 2.85-.75 0-1.4-.18-1.85-.48l.42-1.45c.32.18.72.32 1.18.32.72 0 1.15-.4 1.15-1.4V9.5h1.75z"
        fill="currentColor"
      />
      {/* S */}
      <path
        d="M14.35 20.55c.88.48 1.95.78 3.15.78 1.72 0 2.82-.85 2.82-2.1 0-1.15-.65-1.78-2.3-2.35l-.78-.28c-.88-.3-1.25-.6-1.25-1.15 0-.55.5-.98 1.32-.98.72 0 1.42.25 2 .62l.55-1.48c-.7-.42-1.6-.68-2.6-.68-1.7 0-2.85.95-2.85 2.2 0 1.18.7 1.85 2.25 2.38l.78.28c.95.32 1.3.65 1.3 1.22 0 .65-.55 1.08-1.48 1.08-.85 0-1.7-.32-2.38-.8l-.53 1.46z"
        fill="currentColor"
      />
    </svg>
  );
}
