import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

// Yes/no confirmation for destructive or irreversible actions. `onConfirm` may be async;
// the dialog stays open (and shows `busyLabel`) until the caller closes it via `open`.
const ConfirmDialog = ({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  children,
  confirmLabel = 'Delete',
  busyLabel = 'Deleting…',
  cancelLabel = 'Cancel',
  destructive = true,
  busy = false,
  onConfirm,
}) => (
  <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
      </AlertDialogHeader>
      {children}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction asChild>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={busy}
            onClick={(event) => {
              // Keep the dialog open while the action runs; the caller closes it.
              event.preventDefault();
              onConfirm();
            }}
          >
            {busy && <Spinner />}
            {busy ? busyLabel : confirmLabel}
          </Button>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ConfirmDialog;
