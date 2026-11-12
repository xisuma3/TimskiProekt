// Colour tones shared by icon tiles, status badges and stat cards, so "amber" means the
// same thing on every page and in both themes. success/warning/destructive/primary come
// from the shadcn tokens in index.css; sky and violet are plain Tailwind palettes.
export const TONE_TILE = {
  indigo: 'bg-primary/10 text-primary',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  green: 'bg-success/15 text-success',
  amber: 'bg-warning/15 text-warning',
  red: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};

// Badge tones. Leave statuses map onto these through STATUS_TONE.
export const BADGE_TONE = {
  primary: 'border-primary/20 bg-primary/10 text-primary',
  success: 'border-success/25 bg-success/15 text-success',
  warning: 'border-warning/25 bg-warning/15 text-warning',
  danger: 'border-destructive/20 bg-destructive/10 text-destructive',
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  violet: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  muted: 'border-border bg-muted text-muted-foreground',
};

export const STATUS_TONE = {
  Approved: 'success',
  Pending: 'warning',
  Rejected: 'danger',
};
