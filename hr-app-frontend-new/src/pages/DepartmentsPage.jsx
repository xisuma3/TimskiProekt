import { useState } from 'react';
import { AlertCircle, Building2, Pencil, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '../components/app/ConfirmDialog';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import StatusBadge from '../components/app/StatusBadge';
import DataPage from '../components/DataPage';
import DepartmentModal from '../components/DepartmentModal';
import { authenticatedFetch } from '../services/authService';
import { readErrorMessage } from '../services/apiError';
import { API_URLS } from '../config/api';

const DepartmentsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  // Bumped after a save or delete so DataPage refetches instead of reloading the page.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((key) => key + 1);

  const handleAddClick = () => {
    setEditingDepartment(null);
    setShowModal(true);
  };

  const handleEditClick = (department) => {
    setEditingDepartment(department);
    setShowModal(true);
  };

  const handleDeleteClick = (department) => {
    setDepartmentToDelete(department);
    setShowDeleteModal(true);
  };

  const closeDelete = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setDepartmentToDelete(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await authenticatedFetch(
        API_URLS.DEPARTMENTS.DELETE(departmentToDelete.departmentID),
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to delete department'));
      }

      setShowDeleteModal(false);
      setDepartmentToDelete(null);
      refresh();
    } catch (error) {
      console.error('Delete error:', error);
      // Keep the dialog open so the reason is read where the action was taken.
      setDeleteError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const renderDepartmentCard = (dept) => (
    <ItemCard
      icon={Building2}
      tone="violet"
      title={dept.name}
      subtitle={dept.location || 'No location set'}
      badge={dept.employeeCount ? <StatusBadge tone="primary">{dept.employeeCount} people</StatusBadge> : null}
      actions={(
        <>
          <Button variant="ghost" size="icon-sm" onClick={() => handleEditClick(dept)} aria-label={`Edit ${dept.name}`}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => handleDeleteClick(dept)}
            aria-label={`Delete ${dept.name}`}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </>
      )}
    >
      <MetaList
        items={[
          { label: 'Description', value: dept.description, fallback: 'No description available' },
          { label: 'Manager', value: dept.managerName },
        ]}
      />
    </ItemCard>
  );

  return (
    <>
      <DataPage
        refreshKey={refreshKey}
        title="Department Directory"
        apiEndpoint={API_URLS.DEPARTMENTS.GET_ALL()}
        searchFields={['name', 'description', 'location']}
        renderCard={renderDepartmentCard}
        subtitle="Teams across the organisation and who leads them."
        emptyIcon={Building2}
        searchPlaceholder="Search departments..."
        showAddButton={true}
        onAddClick={handleAddClick}
      />

      <DepartmentModal
        show={showModal}
        onHide={() => setShowModal(false)}
        department={editingDepartment}
        onSave={refresh}
      />

      <ConfirmDialog
        open={showDeleteModal}
        onOpenChange={(open) => { if (!open) closeDelete(); }}
        busy={deleting}
        title="Confirm Delete"
        description={`Are you sure you want to delete department "${departmentToDelete?.name}"? This action cannot be undone.`}
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

export default DepartmentsPage;
