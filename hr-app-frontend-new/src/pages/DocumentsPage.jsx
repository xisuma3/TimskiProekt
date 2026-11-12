import { ArrowRight, FileCheck, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ItemCard from '../components/app/ItemCard';
import PageHeader from '../components/app/PageHeader';

const SECTIONS = [
  {
    to: '/document-templates',
    icon: FileText,
    tone: 'indigo',
    title: 'Document Templates',
    text: 'Create and manage HTML templates with placeholders for employee, asset and system data.',
    action: 'Manage Templates',
  },
  {
    to: '/generated-documents',
    icon: FileCheck,
    tone: 'green',
    title: 'Generated Documents',
    text: 'View and print documents generated from templates, filled with each employee’s data.',
    action: 'View Documents',
  },
];

const DocumentsPage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Document Management"
        description="Manage document templates and generate personalized documents for employees."
      />

      {/* Each whole card is the click target: the button's ::after stretches over it. The
          button's press nudge (translate) is switched off, because a translated button
          would become the ::after's containing block mid-click and shrink it. */}
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <ItemCard
            key={s.to}
            icon={s.icon}
            tone={s.tone}
            title={s.title}
            className="relative"
            actions={(
              <Button
                variant="outline"
                className="after:absolute after:inset-0 active:not-aria-[haspopup]:translate-none"
                onClick={() => navigate(s.to)}
              >
                {s.action}
                <ArrowRight aria-hidden="true" />
              </Button>
            )}
          >
            <p className="text-sm text-muted-foreground">{s.text}</p>
          </ItemCard>
        ))}
      </div>
    </div>
  );
};

export default DocumentsPage;
