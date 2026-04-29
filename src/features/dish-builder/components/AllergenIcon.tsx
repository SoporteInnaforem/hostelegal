import { useState } from 'react';
import { ALLERGEN_LABEL } from '../utils/allergens';
import type { AllergenId } from '../utils/allergens';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 'FRUTOS_DE_CASCARA' → 'FC', 'GLUTEN' → 'GL' */
function getInitials(allergen: string): string {
  const parts = allergen.split('_').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return allergen.slice(0, 2).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type AllergenIconSize = 'sm' | 'md';

interface AllergenIconProps {
  /** Allergen enum value from the backend, e.g. 'GLUTEN', 'FRUTOS_DE_CASCARA'. */
  allergen: string;
  /** sm → 24 px (tables), md → 32 px (lists). @default 'md' */
  size?: AllergenIconSize;
  className?: string;
}

const SIZE: Record<AllergenIconSize, { px: number; tw: string; fb: string }> = {
  sm: { px: 24, tw: 'w-6 h-6', fb: 'w-6 h-6 text-[8px]' },
  md: { px: 32, tw: 'w-8 h-8', fb: 'w-8 h-8 text-[10px]' },
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders `/icons/allergens/{allergen_lowercase}.png`.
 * Falls back to a styled initials badge if the image fails to load.
 */
export function AllergenIcon({ allergen, size = 'md', className = '' }: AllergenIconProps) {
  const [errored, setErrored] = useState(false);

  const label    = ALLERGEN_LABEL[allergen as AllergenId] ?? allergen;
  const src      = `/icons/allergens/${allergen.toLowerCase()}.png`;
  const initials = getInitials(allergen);
  const s        = SIZE[size];

  if (errored) {
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className={[
          'inline-flex items-center justify-center rounded-md shrink-0',
          'font-bold leading-none tracking-tight select-none',
          'bg-warning-600/20 text-warning-400 border border-warning-600/30',
          s.fb, className,
        ].join(' ')}
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={label}
      title={label}
      width={s.px}
      height={s.px}
      onError={() => setErrored(true)}
      className={['shrink-0 object-contain', s.tw, className].join(' ')}
    />
  );
}
