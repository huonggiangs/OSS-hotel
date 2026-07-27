// Bộ icon dùng cho Sidebar — lấy đúng path SVG từ `const ICONS = {...}` trong
// bản thiết kế gốc (Hotel PMS.dc.html, dòng ~2371-2383), chuyển sang component React
// thay vì dùng dangerouslySetInnerHTML như bản gốc.
import type { SVGProps } from "react";

type IconName = "grid" | "calendar" | "bed" | "wallet" | "megaphone" | "users" | "link" | "map" | "puzzle" | "gear";

const PATHS: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </>
  ),
  bed: (
    <>
      <path d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6" />
      <path d="M3 18v2" />
      <path d="M21 18v2" />
      <path d="M3 12V7a2 2 0 012-2h4a2 2 0 012 2v3" />
    </>
  ),
  megaphone: <path d="M3 11v2a2 2 0 002 2h1l2 5h2l-1-5h4l6 4V6l-6 4H6a2 2 0 00-2 2z" />,
  wallet: (
    <>
      <path d="M3 7a2 2 0 012-2h13a1 1 0 011 1v3" />
      <path d="M3 7v11a2 2 0 002 2h14a1 1 0 001-1v-8a1 1 0 00-1-1H6a1 1 0 00-1 1v0" />
      <circle cx="16.5" cy="14" r="1.4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0113 0" />
      <circle cx="18" cy="9" r="2.4" />
      <path d="M15.7 13a5 5 0 016.3 4.8" />
    </>
  ),
  link: (
    <>
      <path d="M3 18a9 9 0 0118 0" />
      <line x1="2" y1="18" x2="22" y2="18" />
      <line x1="12" y1="9" x2="12" y2="6" />
      <circle cx="12" cy="4.2" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  map: (
    <>
      <path d="M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3z" />
      <path d="M9 4v13" />
      <path d="M15 7v13" />
    </>
  ),
  puzzle: (
    <path d="M9 3h3a1 1 0 011 1v2.2a1.8 1.8 0 003.6 0V4a1 1 0 011-1h1a2 2 0 012 2v3a1 1 0 01-1 1h-2.2a1.8 1.8 0 000 3.6H21a1 1 0 011 1v1a2 2 0 01-2 2h-3a1 1 0 01-1-1v-2.2a1.8 1.8 0 00-3.6 0V16a1 1 0 01-1 1h-1a2 2 0 01-2-2v-3a1 1 0 011-1h2.2a1.8 1.8 0 000-3.6H9a1 1 0 01-1-1V4a2 2 0 012-2z" />
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.7 7.7 0 000-3l2-1.6-2-3.4-2.4.7a7.6 7.6 0 00-2.6-1.5L14 2h-4l-.4 2.7a7.6 7.6 0 00-2.6 1.5l-2.4-.7-2 3.4 2 1.6a7.7 7.7 0 000 3l-2 1.6 2 3.4 2.4-.7a7.6 7.6 0 002.6 1.5L10 22h4l.4-2.7a7.6 7.6 0 002.6-1.5l2.4.7 2-3.4z" />
    </>
  ),
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      {PATHS[name]}
    </svg>
  );
}
