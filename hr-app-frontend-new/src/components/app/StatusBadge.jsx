import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BADGE_TONE, STATUS_TONE } from './tones';

// A coloured pill. Pass `tone` (primary | success | warning | danger | info | violet | muted)
// or `status` (a leave status: Approved / Pending / Rejected) to pick the colour.
const StatusBadge = ({ tone, status, className, children }) => {
  const resolved = tone || STATUS_TONE[status] || 'muted';
  return (
    <Badge variant="outline" className={cn('font-medium', BADGE_TONE[resolved] || BADGE_TONE.muted, className)}>
      {children ?? status}
    </Badge>
  );
};

export default StatusBadge;
