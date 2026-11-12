import { cn } from '@/lib/utils';
import { TONE_TILE } from './tones';

// Rounded square holding a lucide icon, tinted by tone.
const IconTile = ({ icon: Icon, tone = 'indigo', size = 'md', className }) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex shrink-0 items-center justify-center rounded-lg',
      size === 'sm' ? 'size-8 [&_svg]:size-4' : 'size-10 [&_svg]:size-5',
      TONE_TILE[tone] || TONE_TILE.indigo,
      className,
    )}
  >
    <Icon />
  </span>
);

export default IconTile;
