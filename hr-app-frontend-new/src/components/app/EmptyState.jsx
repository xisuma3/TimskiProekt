import { Inbox } from 'lucide-react';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

// "Nothing here" block. `children` are optional actions (buttons) under the text.
const EmptyState = ({ icon: Icon = Inbox, title, description, children, className }) => (
  <Empty className={cn('border border-dashed', className)}>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <Icon />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      {description && <EmptyDescription>{description}</EmptyDescription>}
    </EmptyHeader>
    {children && <EmptyContent className="flex-row justify-center">{children}</EmptyContent>}
  </Empty>
);

export default EmptyState;
