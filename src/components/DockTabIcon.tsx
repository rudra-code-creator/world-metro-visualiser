import type { ReactNode } from 'react';

type DockTabIconProps = {
  name: 'timeline' | 'leaderboard' | 'city' | 'layers' | 'video';
};

export function DockTabIcon({ name }: DockTabIconProps): ReactNode {
  switch (name) {
    case 'timeline':
      return (
        <svg className="bottom-dock__tab-icon" viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M12 7v5l3.5 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'leaderboard':
      return (
        <svg className="bottom-dock__tab-icon" viewBox="0 0 24 24" aria-hidden>
          <rect x="4" y="12" width="4" height="8" rx="1" fill="currentColor" opacity="0.55" />
          <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" />
          <rect x="16" y="14" width="4" height="6" rx="1" fill="currentColor" opacity="0.75" />
        </svg>
      );
    case 'city':
      return (
        <svg className="bottom-dock__tab-icon" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M5 20V9l7-4 7 4v11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M9 20v-5h6v5" fill="none" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      );
    case 'layers':
      return (
        <svg className="bottom-dock__tab-icon" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 4 3 9l9 5 9-5-9-5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="m3 14 9 5 9-5M3 9v10l9 5 9-5V9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'video':
      return (
        <svg className="bottom-dock__tab-icon" viewBox="0 0 24 24" aria-hidden>
          <rect
            x="3"
            y="6"
            width="18"
            height="12"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill="currentColor" />
        </svg>
      );
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}

export type DockTabIconName = DockTabIconProps['name'];
