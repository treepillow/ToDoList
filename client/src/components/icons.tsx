// Small inline SVG icon set (no icon library dependency). All inherit currentColor.
import type { SVGProps } from 'react';

const Icon = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

export const FilterIcon = () => (
  <Icon>
    <path d="M2.5 4h11M4.5 8h7M6.5 12h3" />
  </Icon>
);

export const SortIcon = () => (
  <Icon>
    <path d="M5 2.5v11M2.5 11l2.5 2.5L7.5 11M11 13.5v-11M8.5 5L11 2.5 13.5 5" />
  </Icon>
);

export const CheckIcon = () => (
  <Icon>
    <path d="M3.5 8.5l3 3 6-7" />
  </Icon>
);

export const SunIcon = () => (
  <Icon>
    <circle cx="8" cy="8" r="2.75" />
    <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" />
  </Icon>
);

export const MoonIcon = () => (
  <Icon>
    <path d="M13 9.6A5.5 5.5 0 1 1 6.4 3a4.4 4.4 0 0 0 6.6 6.6Z" />
  </Icon>
);

export const PageIcon = () => (
  <Icon>
    <path d="M4 1.75h5.25L12.5 5v9.25H4z" />
    <path d="M9 1.75V5.25h3.5M6 8h4.5M6 10.5h4.5" />
  </Icon>
);

export const TasksIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="2" y="2" width="12" height="12" rx="2.5" />
    <path d="M5 8.25l2 2 4-4.5" />
  </Icon>
);

export const LockIcon = () => (
  <Icon>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1.25" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </Icon>
);

export const SidebarIcon = () => (
  <Icon>
    <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
    <path d="M6 2.75v10.5" />
  </Icon>
);

export const ChevronsLeftIcon = () => (
  <Icon>
    <path d="M8 4L4 8l4 4M12.5 4l-4 4 4 4" />
  </Icon>
);

export const ListIcon = () => (
  <Icon>
    <path d="M5.5 4h8M5.5 8h8M5.5 12h8" />
    <circle cx="2.75" cy="4" r=".4" fill="currentColor" />
    <circle cx="2.75" cy="8" r=".4" fill="currentColor" />
    <circle cx="2.75" cy="12" r=".4" fill="currentColor" />
  </Icon>
);
