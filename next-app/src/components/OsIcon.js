/**
 * Platform brand marks (Windows / Linux / Apple) as monochrome SVG.
 * Color via CSS currentColor on .osSvg / parent.
 */

function WindowsIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      {/* Windows 11 style 4-pane logo */}
      <path d="M3 3h8.2v8.2H3V3zm9.8 0H21v8.2h-8.2V3zM3 12.8h8.2V21H3v-8.2zm9.8 0H21V21h-8.2v-8.2z" />
    </svg>
  );
}

function LinuxIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      {/* Simplified Tux-inspired mark — readable at small size */}
      <path d="M12 2.4c-1.7 0-3.05 1.55-3.05 3.55 0 .55.1 1.05.28 1.5C7.4 8.4 6.2 10.35 6.2 12.55c0 1.35.45 2.55 1.2 3.5-.95.7-1.55 1.85-1.55 3.15 0 1.55 1.05 2.85 2.55 3.2.45.7 1.55 1.2 3.6 1.2s3.15-.5 3.6-1.2c1.5-.35 2.55-1.65 2.55-3.2 0-1.3-.6-2.45-1.55-3.15.75-.95 1.2-2.15 1.2-3.5 0-2.2-1.2-4.15-3.03-5.1.18-.45.28-.95.28-1.5C15.05 3.95 13.7 2.4 12 2.4zm-1.65 4.05c.35 0 .65.3.65.7s-.3.7-.65.7-.65-.3-.65-.7.3-.7.65-.7zm3.3 0c.35 0 .65.3.65.7s-.3.7-.65.7-.65-.3-.65-.7.3-.7.65-.7zM9.1 11.1c.55 1.05 1.55 1.7 2.9 1.7s2.35-.65 2.9-1.7c.1-.2-.05-.45-.3-.45H9.4c-.25 0-.4.25-.3.45z" />
    </svg>
  );
}

function AppleIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      {/* Apple logo */}
      <path d="M18.71 12.32c-.02-2.12 1.73-3.14 1.81-3.19-1-1.46-2.55-1.66-3.1-1.68-1.31-.13-2.56.77-3.22.77-.67 0-1.7-.75-2.8-.73-1.44.02-2.77.84-3.51 2.13-1.5 2.6-.38 6.45 1.08 8.56.71 1.03 1.56 2.19 2.68 2.15 1.07-.04 1.48-.69 2.78-.69 1.29 0 1.66.69 2.8.67 1.16-.02 1.89-1.05 2.59-2.09.82-1.19 1.15-2.34 1.17-2.4-.03-.01-2.24-.86-2.28-3.5zM15.6 5.88c.59-.72.99-1.71.88-2.7-.85.03-1.88.57-2.49 1.28-.55.63-1.03 1.64-.9 2.6.95.07 1.92-.48 2.51-1.18z" />
    </svg>
  );
}

function PackageIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  );
}

/**
 * @param {string} [id] platform id: windows | linux | linux-deb | mac | mac-arm64 | mac-x64
 * @param {number} [size]
 * @param {string} [className]
 */
export default function OsIcon({ id, size = 20, className }) {
  const key = String(id || '').toLowerCase();
  let Icon = PackageIcon;
  let label = 'Download';

  if (key === 'windows' || key === 'win' || key.startsWith('win')) {
    Icon = WindowsIcon;
    label = 'Windows';
  } else if (key === 'linux' || key === 'linux-deb' || key.includes('linux') || key === 'deb' || key === 'appimage') {
    Icon = LinuxIcon;
    label = 'Linux';
  } else if (
    key === 'mac' ||
    key === 'macos' ||
    key.startsWith('mac') ||
    key === 'darwin' ||
    key === 'osx'
  ) {
    Icon = AppleIcon;
    label = 'macOS';
  }

  return (
    <span className={className} role="img" aria-label={label}>
      <Icon size={size} />
    </span>
  );
}

export { WindowsIcon, LinuxIcon, AppleIcon };
