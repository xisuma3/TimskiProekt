import { cn } from '@/lib/utils';

// A generated document rendered as white paper, in both themes: it is what gets printed
// and signed. Pass HTML that came from the API: TemplateProcessingService HTML-encodes
// substituted values and template bodies are sanitised server-side.
const DocPreview = ({ html, className, style }) => (
  <div
    className={cn(
      'prose prose-sm prose-neutral max-w-none overflow-auto rounded-lg border bg-white p-6 text-neutral-900 shadow-inner',
      className,
    )}
    style={style}
    dangerouslySetInnerHTML={{ __html: html || '' }}
  />
);

export default DocPreview;
