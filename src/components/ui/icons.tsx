import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const BaseIcon = ({ children, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const SparklesIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M12 3l1.4 3.8L17 8.2l-3.6 1.4L12 13.5l-1.4-3.9L7 8.2l3.6-1.4L12 3z" />
    <path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z" />
    <path d="M19 13l.8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13z" />
  </BaseIcon>
);

export const SearchIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </BaseIcon>
);

export const SlidersIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 6h10" />
    <path d="M18 6h2" />
    <path d="M10 6v12" />
    <path d="M4 18h6" />
    <path d="M14 18h6" />
    <path d="M16 18V6" />
  </BaseIcon>
);

export const FlaskIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M9 3h6" />
    <path d="M10 3v5.2L5.8 16.4A3.5 3.5 0 0 0 8.8 21h6.4a3.5 3.5 0 0 0 3-4.6L14 8.2V3" />
    <path d="M8.5 15h7" />
  </BaseIcon>
);

export const BotIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <rect x="5" y="7" width="14" height="10" rx="3" />
    <path d="M12 3v4" />
    <circle cx="9.5" cy="12" r="1" />
    <circle cx="14.5" cy="12" r="1" />
    <path d="M9 17v3" />
    <path d="M15 17v3" />
  </BaseIcon>
);

export const LayersIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M12 4l8 4-8 4-8-4 8-4z" />
    <path d="M4 12l8 4 8-4" />
    <path d="M4 16l8 4 8-4" />
  </BaseIcon>
);

export const FileTextIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
    <path d="M9 9h1" />
  </BaseIcon>
);

export const ChartIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20v-11" />
  </BaseIcon>
);

export const ActivityIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </BaseIcon>
);

export const MapPinIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </BaseIcon>
);

export const UsersIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="10" cy="8" r="3" />
    <path d="M20 21v-2a3 3 0 0 0-2-2.8" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6" />
  </BaseIcon>
);

export const BuildingIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 21V7l8-4 8 4v14" />
    <path d="M9 21v-4h6v4" />
    <path d="M9 9h.01" />
    <path d="M15 9h.01" />
    <path d="M9 13h.01" />
    <path d="M15 13h.01" />
  </BaseIcon>
);

export const CalendarIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M7 3v4" />
    <path d="M17 3v4" />
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
  </BaseIcon>
);

export const MessageIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v6A3.5 3.5 0 0 1 16.5 16H10l-4.5 4v-4.5A3.5 3.5 0 0 1 4 12.5v-6z" />
  </BaseIcon>
);

export const ArrowRightIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </BaseIcon>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M19 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </BaseIcon>
);

export const ArrowUpRightIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M7 17L17 7" />
    <path d="M9 7h8v8" />
  </BaseIcon>
);

export const MenuIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h12" />
  </BaseIcon>
);

export const CloseIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </BaseIcon>
);

export const CheckCircleIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </BaseIcon>
);

export const AlertTriangleIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M12 4l8 14H4l8-14z" />
    <path d="M12 9v4.5" />
    <path d="M12 17h.01" />
  </BaseIcon>
);

export const DownloadIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M12 4v11" />
    <path d="M8 11l4 4 4-4" />
    <path d="M4 20h16" />
  </BaseIcon>
);

export const PrinterIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M7 8V4h10v4" />
    <rect x="5" y="10" width="14" height="8" rx="2" />
    <path d="M8 18v2h8v-2" />
    <path d="M17 13h.01" />
  </BaseIcon>
);
