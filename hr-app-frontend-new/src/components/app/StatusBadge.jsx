import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BADGE_TONE, STATUS_TONE } from './tones';

// A coloured pill. Pass `tone` (primary | success | warning | danger | info | violet | muted)
// or `status` (a leave status: Approved / Pending / Rejected) to pick the colour.
// Other props (title, aria-label, …) pass through to the badge.
const StatusBadge = ({ tone, status, className, children, ...props }) => {
  const resolved = tone || STATUS_TONE[status] || 'muted';
  return (
    <Badge variant="outline" className={cn('font-medium', BADGE_TONE[resolved] || BADGE_TONE.muted, className)} {...props}>
      {children ?? status}
    </Badge>
  );
};

export default StatusBadge;
