import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import IconTile from './IconTile';

// The card every DataPage list renders: icon tile, title and subtitle, an optional badge
// top-right, a body (usually a MetaList), and actions along the bottom.
const ItemCard = ({ icon, tone, title, subtitle, badge, actions, children, className }) => (
  <Card className={cn('h-full gap-0 py-0 transition-shadow hover:shadow-md', className)}>
    <CardContent className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        {icon && <IconTile icon={icon} tone={tone} />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {children && <div className="flex-1">{children}</div>}
      {actions && <div className="flex flex-wrap items-center justify-end gap-1.5 border-t pt-3">{actions}</div>}
    </CardContent>
  </Card>
);

// Label/value pairs inside a card. `items` is [{ label, value }]; falsy values are skipped
// unless `fallback` is given.
export const MetaList = ({ items, className }) => (
  <dl className={cn('grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm', className)}>
    {items
      .filter((item) => item && (item.value || item.value === 0 || item.fallback))
      .map(({ label, value, fallback }) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value || value === 0 ? value : <span className="text-muted-foreground">{fallback}</span>}</dd>
        </div>
      ))}
  </dl>
);

export default ItemCard;
