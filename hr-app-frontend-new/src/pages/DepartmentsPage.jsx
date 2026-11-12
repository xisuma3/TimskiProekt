import { useState } from 'react';
import { Building2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '../components/app/ConfirmDialog';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import StatusBadge from '../components/app/StatusBadge';
import DataPage from '../components/DataPage';
import DepartmentModal from '../components/DepartmentModal';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const DepartmentsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

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

  const handleDeleteConfirm = async () => {
    try {
      const response = await authenticatedFetch(
        API_URLS.DEPARTMENTS.DELETE(departmentToDelete.departmentID),
        { method: 'DELETE' }
      );

      if (response.ok) {
        window.location.reload();
      } else {
        throw new Error('Failed to delete department');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete department');
    } finally {
      setShowDeleteModal(false);
      setDepartmentToDelete(null);
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
        onSave={() => window.location.reload()}
      />

      <ConfirmDialog
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Confirm Delete"
        description={`Are you sure you want to delete department "${departmentToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export default DepartmentsPage;
