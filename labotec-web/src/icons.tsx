import React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
  label?: string;
  glyph?: string;
};

function createIcon(glyph: string, label: string) {
  return ({ size = 24, className, title, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title || label}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="12"
        fill="currentColor"
        dominantBaseline="middle"
      >
        {glyph}
      </text>
    </svg>
  );
}

export const MapPin = createIcon('📍', 'Location');
export const Phone = createIcon('☎️', 'Phone');
export const Mail = createIcon('✉️', 'Mail');
export const Clock = createIcon('⏰', 'Clock');
export const Menu = createIcon('☰', 'Menu');
export const X = createIcon('✖️', 'Close');
export const ArrowRight = createIcon('➜', 'Arrow Right');
export const ShieldCheck = createIcon('🛡️', 'Shield');
export const Microscope = createIcon('🔬', 'Microscope');
export const Award = createIcon('🏅', 'Award');
export const CheckCircle2 = createIcon('✔️', 'Check');
export const Search = createIcon('🔍', 'Search');
export const FlaskConical = createIcon('⚗️', 'Flask');
export const Lock = createIcon('🔒', 'Lock');
export const User = createIcon('👤', 'User');
export const AlertCircle = createIcon('⚠️', 'Alert');
export const DollarSign = createIcon('💲', 'Dollar');
export const FileText = createIcon('📄', 'File');
export const CreditCard = createIcon('💳', 'Credit Card');
export const CheckCircle = createIcon('✅', 'Check');
export const Download = createIcon('⬇️', 'Download');
export const Filter = createIcon('⛃', 'Filter');
export const Calendar = createIcon('📅', 'Calendar');
export const UserPlus = createIcon('➕', 'Add User');
export const Users = createIcon('👥', 'Users');
export const Loader2 = createIcon('⏳', 'Loading');
export const Beaker = createIcon('🧪', 'Beaker');
export const TrendingUp = createIcon('📈', 'Trending Up');
export const Settings = createIcon('⚙️', 'Settings');
export const Trash2 = createIcon('🗑️', 'Delete');
export const Edit = createIcon('✏️', 'Edit');
export const Plus = createIcon('＋', 'Plus');
export const Upload = createIcon('⬆️', 'Upload');
export const Activity = createIcon('📊', 'Activity');
export const LayoutDashboard = createIcon('📋', 'Dashboard');
export const LogOut = createIcon('🚪', 'Logout');
export const ChevronLeft = createIcon('◀️', 'Back');
export const Bell = createIcon('🔔', 'Notifications');
