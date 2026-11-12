import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// The product logo: a rounded tile with the people icon. Lives here rather than in the
// shell so public pages (landing, login) can use it without importing the sidebar.
const BrandMark = ({ className }) => (
  <span
    aria-hidden="true"
    className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground', className)}
  >
    <Users className="size-4" />
  </span>
);

export default BrandMark;
