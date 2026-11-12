import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import IconTile from './IconTile';

// A single headline number: label, value, optional hint and icon. With `to`, the whole
// card links to the page behind the number.
const StatCard = ({ label, value, hint, icon, tone = 'indigo', to, className, children }) => {
  const card = (
    <Card className={cn('h-full gap-0 py-0', to && 'transition-shadow group-hover:shadow-md', className)}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {children}
        </div>
        {icon && <IconTile icon={icon} tone={tone} />}
      </CardContent>
    </Card>
  );

  if (!to) return card;
  return (
    <Link to={to} className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {card}
    </Link>
  );
};

export default StatCard;
