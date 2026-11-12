import { useState, useEffect } from 'react';
import { AlertCircle, LogOut, Pencil, Trash2, TriangleAlert, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '../components/app/ConfirmDialog';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import DataPage from '../components/DataPage';
import EmployeeModal from '../components/EmployeeModal';
import { authenticatedFetch } from '../services/authService';
import { readErrorMessage } from '../services/apiError';
import { API_URLS } from '../config/api';

// ItemCard's tile takes an icon component; a person gets their initials instead. One
// component per set of letters, cached so a re-render doesn't remount the tile.
const initialsIcons = new Map();
const initialsIcon = (emp) => {
  const letters = `${(emp.firstName || '?').charAt(0)}${(emp.lastName || '').charAt(0)}`.toUpperCase();
  if (!initialsIcons.has(letters)) {
    const Initials = () => <span className="text-sm font-semibold">{letters}</span>;
    initialsIcons.set(letters, Initials);
  }
  return initialsIcons.get(letters);
};

// An icon-only card action whose meaning needs a word of explanation.
const ExplainedAction = ({ tip, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent>{tip}</TooltipContent>
  </Tooltip>
);

const EmployeesPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [employeeToErase, setEmployeeToErase] = useState(null);
  const [eraseConfirmText, setEraseConfirmText] = useState('');
  const [eraseError, setEraseError] = useState(null);
  // Audit details the API requires for every erasure.
  const [eraseRequestedBy, setEraseRequestedBy] = useState('');
  const [eraseReceivedAt, setEraseReceivedAt] = useState('');
  const [eraseReason, setEraseReason] = useState('');
  const [erasing, setErasing] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [retireError, setRetireError] = useState(null);
  // Bumped after a save, retire or erase so DataPage refetches instead of reloading the page.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((key) => key + 1);

  // Fetch departments for the dropdown
  useEffect(() => {
    authenticatedFetch(API_URLS.DEPARTMENTS.GET_ALL())
      .then(response => response.json())
      .then(data => setDepartments(data))
      .catch(err => console.error('Failed to fetch departments:', err));
  }, []);

  const handleAddClick = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleEditClick = (employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const closeRetire = () => {
    if (retiring) return;
    setShowDeleteModal(false);
    setEmployeeToDelete(null);
    setRetireError(null);
  };

  const handleDeleteConfirm = async () => {
    setRetiring(true);
    setRetireError(null);
    try {
      const response = await authenticatedFetch(
        API_URLS.EMPLOYEES.DELETE(employeeToDelete.employeeID),
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to retire employee'));
      }

      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      refresh();
    } catch (error) {
      console.error('Retire error:', error);
      // Keep the dialog open so the reason is read where the action was taken.
      setRetireError(error.message);
    } finally {
      setRetiring(false);
    }
  };

  // GDPR erasure. Separate from retiring on purpose: it destroys personal data and
  // cannot be undone, so it asks the admin to type the name.
  const handleEraseConfirm = async () => {
    const expected = `${employeeToErase.firstName} ${employeeToErase.lastName}`;
    if (eraseConfirmText.trim() !== expected) {
      setEraseError(`Type "${expected}" exactly to confirm.`);
      return;
    }

    if (!eraseRequestedBy.trim() || !eraseReason.trim()) {
      setEraseError('Say who requested the erasure and why.');
      return;
    }

    setEraseError(null);
    setErasing(true);
    try {
      const response = await authenticatedFetch(
        API_URLS.EMPLOYEES.ERASE(employeeToErase.employeeID),
        {
          method: 'POST',
          body: JSON.stringify({
            requestedBy: eraseRequestedBy.trim(),
            reason: eraseReason.trim(),
            requestReceivedAt: eraseReceivedAt || null,
          }),
        }
      );

      if (response.ok) {
        setEmployeeToErase(null);
        refresh();
        return;
      }

      // 400 for missing details / no linked employee record; 409 when not retired yet,
      // already erased, or erasing yourself.
      setEraseError(await readErrorMessage(response, 'Failed to erase employee'));
    } catch (error) {
      setEraseError(error.message);
    } finally {
      setErasing(false);
    }
  };

  const openErase = (emp) => {
    setEmployeeToErase(emp);
    setEraseConfirmText('');
    setEraseRequestedBy('');
    setEraseReceivedAt('');
    setEraseReason('');
    setEraseError(null);
  };

  const today = new Date().toISOString().slice(0, 10);
  const eraseNameMatches = Boolean(employeeToErase)
    && eraseConfirmText.trim() === `${employeeToErase.firstName} ${employeeToErase.lastName}`;
  const eraseReady = eraseNameMatches && eraseRequestedBy.trim() !== '' && eraseReason.trim() !== '';


  const renderEmployeeCard = (emp) => (
    <ItemCard
      icon={initialsIcon(emp)}
      tone="indigo"
      title={`${emp.firstName} ${emp.lastName}`}
      subtitle={`${emp.position} · ${emp.departmentName || emp.name || 'No Department'}`}
      actions={(
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleEditClick(emp)}
            aria-label={`Edit ${emp.firstName} ${emp.lastName}`}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <ExplainedAction tip="Retire — hides them but keeps their records">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-warning hover:bg-warning/10 hover:text-warning"
              onClick={() => handleDeleteClick(emp)}
              aria-label={`Retire ${emp.firstName} ${emp.lastName}`}
            >
              <LogOut aria-hidden="true" />
            </Button>
          </ExplainedAction>
          <ExplainedAction tip="Erase personal data — irreversible">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => openErase(emp)}
              aria-label={`Erase personal data of ${emp.firstName} ${emp.lastName}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </ExplainedAction>
        </>
      )}
    >
      <MetaList
        items={[
          { label: 'Email', value: emp.email },
          { label: 'Hire Date', value: new Date(emp.hireDate).toLocaleDateString() },
          { label: 'Manager', value: emp.managerName },
          { label: 'Mentor', value: emp.mentorName },
        ]}
      />
    </ItemCard>
  );

  const eraseName = `${employeeToErase?.firstName ?? ''} ${employeeToErase?.lastName ?? ''}`.trim();

  return (
    <>
      <DataPage
        refreshKey={refreshKey}
        title="Employee Directory"
        apiEndpoint={API_URLS.EMPLOYEES.GET_ALL()}
        searchFields={['firstName', 'lastName', 'email', 'departmentName']}
        dateFilter={{ label: 'Hired', field: 'hireDate' }}
        personFilter={{ label: 'Manager', field: 'managerName', emptyLabel: 'No manager' }}
        renderCard={renderEmployeeCard}
        subtitle="Everyone currently employed, with their team and reporting line."
        emptyIcon={Users}
        searchPlaceholder="Search employees..."
        showAddButton={true}
        onAddClick={handleAddClick}
      />

      {/* Add/Edit Modal */}
      <EmployeeModal
        show={showModal}
        onHide={() => setShowModal(false)}
        employee={editingEmployee}
        onSave={refresh}
        departments={departments}
      />

      {/* Retire confirmation */}
      <ConfirmDialog
        open={showDeleteModal}
        onOpenChange={(open) => { if (!open) closeRetire(); }}
        busy={retiring}
        busyLabel="Retiring…"
        title="Retire Employee"
        description={`Retire ${employeeToDelete?.firstName} ${employeeToDelete?.lastName}?`}
        confirmLabel="Retire"
        destructive={false}
        onConfirm={handleDeleteConfirm}
      >
        <p className="text-sm text-muted-foreground">
          They are removed from listings, but their leave decisions, asset custody and
          generated documents are kept. This can be undone.
        </p>
        {retireError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{retireError}</AlertDescription>
          </Alert>
        )}
      </ConfirmDialog>

      {/* GDPR erasure — deliberately harder to trigger than retiring */}
      <Dialog open={Boolean(employeeToErase)} onOpenChange={(open) => { if (!open) setEmployeeToErase(null); }}>
        <DialogContent className="sm:max-w-lg">
          <form
            className="grid gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              handleEraseConfirm();
            }}
          >
            <DialogHeader>
              <DialogTitle>Erase Personal Data</DialogTitle>
              <DialogDescription>
                This permanently destroys the personal data of{' '}
                <strong className="font-semibold text-foreground">{eraseName}</strong>:
                their name, email, login, dossier, and the body of every document generated
                for them.
              </DialogDescription>
            </DialogHeader>

            {eraseError && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{eraseError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Their leave decisions and asset custody are <strong className="font-semibold text-foreground">kept</strong> in
                anonymised form — those record what the company did and what happened to company property.
              </p>
              <p className="flex items-center gap-2 font-semibold text-destructive">
                <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                This cannot be undone.
              </p>
            </div>

            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="erase-requested-by">Requested by *</FieldLabel>
                <Input
                  id="erase-requested-by"
                  value={eraseRequestedBy}
                  maxLength={200}
                  onChange={(e) => setEraseRequestedBy(e.target.value)}
                />
                <FieldDescription>Who asked — e.g. the employee by email, their solicitor.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="erase-received-at">Request received</FieldLabel>
                <Input
                  id="erase-received-at"
                  type="date"
                  max={today}
                  value={eraseReceivedAt}
                  onChange={(e) => setEraseReceivedAt(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="erase-reason">Reason *</FieldLabel>
                <Textarea
                  id="erase-reason"
                  rows={2}
                  maxLength={1000}
                  value={eraseReason}
                  onChange={(e) => setEraseReason(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="erase-confirm-name">
                  <span>
                    Type{' '}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{eraseName}</code>
                    {' '}to confirm
                  </span>
                </FieldLabel>
                <Input
                  id="erase-confirm-name"
                  value={eraseConfirmText}
                  onChange={(e) => setEraseConfirmText(e.target.value)}
                />
              </Field>
            </FieldGroup>

            <p className="text-xs text-muted-foreground">
              This creates a permanent audit record naming you as the person who performed the erasure.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmployeeToErase(null)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={!eraseReady || erasing}>
                {erasing && <Spinner />}
                {erasing ? 'Erasing…' : 'Erase permanently'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeesPage;
