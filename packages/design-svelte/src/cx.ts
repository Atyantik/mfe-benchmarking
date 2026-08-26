/**
 * Class-name joiner, identical to the React design system's.
 *
 * Duplicated rather than imported so the Svelte stack has no build-time dependency on the
 * React one. What IS shared between them is the thing that must be: the token stylesheets in
 * `@mf-eval/design`, which are plain CSS and carry every colour, size and spacing value both
 * stacks render with. If those diverged the visual comparison would be meaningless.
 */
export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');

export const inputClass =
  'w-full rounded-md border border-line-strong bg-card px-3 py-2 text-[length:var(--fs-md)] ' +
  'text-ink-800 placeholder:text-ink-500 focus:border-brand-600 focus:outline-none';

export const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap';

export type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  secondary: 'border border-line-strong bg-card text-ink-800 hover:border-brand-600 hover:text-brand-700',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'bg-[var(--color-alert)] text-white hover:brightness-110',
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[length:var(--fs-sm)]',
  md: 'h-10 px-4 text-[length:var(--fs-md)]',
  lg: 'h-12 px-6 text-[length:var(--fs-base)]',
};
