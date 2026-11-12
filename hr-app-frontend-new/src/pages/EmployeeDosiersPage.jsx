import { useState, useEffect } from 'react';
import { AlertCircle, IdCard, Pencil, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '../components/app/ConfirmDialog';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import DataPage from '../components/DataPage';
import EmployeeDossierModal from '../components/EmployeeDossierModal';
import { authenticatedFetch, hasRole, isAdmin } from '../services/authService';
import { readErrorMessage } from '../services/apiError';
import { API_URLS } from '../config/api';

const EmployeeDosiersPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingDossier, setEditingDossier] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dossierToDelete, setDossierToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  // Bumped after a save or delete so DataPage refetches instead of reloading the page.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    // Only admins need employee list for dossier management
    if (isAdmin()) {
      authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL())
        .then(response => response.json())
        .then(data => setEmployees(data))
        .catch(err => console.error('Failed to fetch employees:', err));
    }
  }, []);

  const handleAddClick = () => {
    setEditingDossier(null);
    setShowModal(true);
  };

  const handleEditClick = (dossier) => {
    setEditingDossier(dossier);
    setShowModal(true);
  };

  const handleDeleteClick = (dossier) => {
    setDossierToDelete(dossier);
    setShowDeleteModal(true);
  };

  const closeDelete = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setDossierToDelete(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await authenticatedFetch(
        API_URLS.EMPLOYEE_DOSSIERS.DELETE(dossierToDelete.dossierID),
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to delete dossier'));
      }

      setShowDeleteModal(false);
      setDossierToDelete(null);
      refresh();
    } catch (error) {
      console.error('Delete error:', error);
      // Keep the dialog open so the reason is read where the action was taken.
      setDeleteError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const renderDossierCard = (dossier) => {
    const name = isAdmin() ? dossier.employeeName : 'My Dossier';
    // Admin only - edit and delete buttons. Decided here rather than with
    // RoleBasedContent so a non-admin's card has no empty action row.
    const canManage = hasRole('Admin');
    return (
      <ItemCard
        icon={IdCard}
        tone="sky"
        title={name}
        subtitle={`${dossier.employmentType} Employee`}
        actions={canManage ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleEditClick(dossier)}
              aria-label={`Edit dossier for ${name}`}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => handleDeleteClick(dossier)}
              aria-label={`Delete dossier for ${name}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </>
        ) : null}
      >
        <MetaList
          items={[
            {
              label: 'Birth Date',
              value: dossier.birthDate ? new Date(dossier.birthDate).toLocaleDateString() : null,
              fallback: 'Not specified',
            },
            { label: 'Address', value: dossier.address, fallback: 'Not specified' },
            { label: 'Emergency Contact', value: dossier.emergencyContact, fallback: 'Not specified' },
            { label: 'Employment Type', value: dossier.employmentType },
          ]}
        />
      </ItemCard>
    );
  };

  return (
    <>
      <DataPage
        refreshKey={refreshKey}
        title={isAdmin() ? "Employee Dossiers" : "My Dossier"}
        apiEndpoint={isAdmin() ? API_URLS.EMPLOYEE_DOSSIERS.GET_ALL() : API_URLS.EMPLOYEE_DOSSIERS.GET_MY_DOSSIER()}
        searchFields={isAdmin() ? ['employeeName', 'employmentType', 'address'] : ['employmentType', 'address']}
        personFilter={{ label: 'Employee', field: 'employeeName' }}
        subtitle={isAdmin() ? 'Personal and employment details for every employee.' : 'Your personal and employment details on file.'}
        emptyIcon={IdCard}
        renderCard={renderDossierCard}
        searchPlaceholder={isAdmin() ? "Search employee dossiers..." : "Search my dossier..."}
        // An employee has at most one dossier: nothing to search or lay out differently.
        showToolbar={isAdmin()}
        emptyTitle={isAdmin() ? null : 'No dossier yet'}
        emptyDescription={isAdmin() ? null : 'HR hasn’t set up your dossier. Contact HR to have it created.'}
        showAddButton={isAdmin()}
        onAddClick={handleAddClick}
      />

      <EmployeeDossierModal
        show={showModal}
        onHide={() => setShowModal(false)}
        dossier={editingDossier}
        onSave={refresh}
        employees={employees}
      />

      <ConfirmDialog
        open={showDeleteModal}
        onOpenChange={(open) => { if (!open) closeDelete(); }}
        busy={deleting}
        title="Confirm Delete"
        description={`Are you sure you want to delete the dossier for ${dossierToDelete?.employeeName}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
      >
        {deleteError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}
      </ConfirmDialog>
    </>
  );
};

export default EmployeeDosiersPage;
