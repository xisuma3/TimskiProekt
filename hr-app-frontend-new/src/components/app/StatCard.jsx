import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import IconTile from './IconTile';

// A single headline number: label, value, optional hint and icon.
const StatCard = ({ label, value, hint, icon, tone = 'indigo', className, children }) => (
  <Card className={cn('gap-0 py-0', className)}>
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

export default StatCard;
