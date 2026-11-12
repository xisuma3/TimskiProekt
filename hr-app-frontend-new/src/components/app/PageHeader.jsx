import { cn } from '@/lib/utils';

// Page title block for pages that don't use DataPage (which renders its own).
const PageHeader = ({ title, description, actions, id, className }) => (
  <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
    <div className="min-w-0">
      <h1 id={id} className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

// Heading for a section within a page.
export const SectionTitle = ({ as: Tag = 'h2', className, children }) => (
  <Tag className={cn('mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground', className)}>{children}</Tag>
);

export default PageHeader;
