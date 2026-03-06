import clsx from 'clsx';
import { KolTier, PlatformName } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gray' | 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'yellow' | 'pink';
  size?: 'sm' | 'md';
}

const VARIANT_CLASS = {
  gray:   'bg-gray-800 text-gray-300 ring-gray-700',
  green:  'bg-green-900/40 text-green-400 ring-green-700/50',
  blue:   'bg-blue-900/40 text-blue-400 ring-blue-700/50',
  purple: 'bg-purple-900/40 text-purple-400 ring-purple-700/50',
  orange: 'bg-orange-900/40 text-orange-400 ring-orange-700/50',
  red:    'bg-red-900/40 text-red-400 ring-red-700/50',
  yellow: 'bg-yellow-900/40 text-yellow-400 ring-yellow-700/50',
  pink:   'bg-pink-900/40 text-pink-400 ring-pink-700/50',
};

export function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        VARIANT_CLASS[variant],
      )}
    >
      {children}
    </span>
  );
}

// ─── Tier Badge ───────────────────────────────────────────────────────────────

const TIER_VARIANT: Record<KolTier, BadgeProps['variant']> = {
  [KolTier.NANO]:  'gray',
  [KolTier.MICRO]: 'green',
  [KolTier.MID]:   'blue',
  [KolTier.MACRO]: 'purple',
  [KolTier.MEGA]:  'orange',
};

export function TierBadge({ tier }: { tier?: KolTier }) {
  if (!tier) return <span className="text-gray-400 text-xs">—</span>;
  return <Badge variant={TIER_VARIANT[tier]}>{tier}</Badge>;
}

// ─── Platform Badge ────────────────────────────────────────────────────────────

const PLATFORM_VARIANT: Record<PlatformName, BadgeProps['variant']> = {
  [PlatformName.INSTAGRAM]:   'pink',
  [PlatformName.TIKTOK]:      'gray',
  [PlatformName.YOUTUBE]:     'red',
  [PlatformName.XIAOHONGSHU]: 'red',
  [PlatformName.WEIBO]:       'blue',
};

export function PlatformBadge({ platform }: { platform: PlatformName }) {
  return (
    <Badge variant={PLATFORM_VARIANT[platform]}>{platform}</Badge>
  );
}

// ─── Blacklisted Badge ─────────────────────────────────────────────────────────

export function BlacklistedBadge() {
  return (
    <Badge variant="red">
      <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524L13.477 14.89zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
      </svg>
      Blacklisted
    </Badge>
  );
}
