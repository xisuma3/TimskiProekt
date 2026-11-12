import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeftRight, Laptop, Pencil, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '../components/app/ConfirmDialog';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import StatusBadge from '../components/app/StatusBadge';
import DataPage from '../components/DataPage';
import AssetModal from '../components/AssetModal';
import AssetCustodyModal from '../components/AssetCustodyModal';
import RoleBasedContent from '../components/RoleBasedContent';
import { authenticatedFetch, isAdmin } from '../services/authService';
import { readErrorMessage } from '../services/apiError';
import { API_URLS } from '../config/api';

const AssetsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  // Bumped after a save or delete so DataPage refetches instead of reloading the page.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((key) => key + 1);
  const [custodyAsset, setCustodyAsset] = useState(null);

  useEffect(() => {
    // Only admins need employee list for asset assignment
    if (isAdmin()) {
      authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL())
        .then(response => response.json())
        .then(data => setEmployees(data))
        .catch(err => console.error('Failed to fetch employees:', err));
    }
  }, []);

  const handleAddClick = () => {
    setEditingAsset(null);
    setShowModal(true);
  };

  const handleEditClick = (asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const handleDeleteClick = (asset) => {
    setAssetToDelete(asset);
    setShowDeleteModal(true);
  };

  const closeDelete = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setAssetToDelete(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await authenticatedFetch(
        API_URLS.ASSETS.DELETE(assetToDelete.assetID),
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to delete asset'));
      }

      setShowDeleteModal(false);
      setAssetToDelete(null);
      refresh();
    } catch (error) {
      console.error('Delete error:', error);
      // Keep the dialog open so the reason is read where the action was taken.
      setDeleteError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const renderAssetCard = (asset) => (
    <ItemCard
      icon={Laptop}
      tone="indigo"
      title={asset.name}
      subtitle={asset.serialNumber || 'No serial number'}
      badge={(
        <StatusBadge tone={asset.isActive ? 'success' : 'muted'}>
          {asset.isActive ? 'Active' : 'Inactive'}
        </StatusBadge>
      )}
      actions={isAdmin() ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCustodyAsset(asset)}
            title="Assign, return, and custody history"
          >
            <ArrowLeftRight aria-hidden="true" />
            Custody
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => handleEditClick(asset)} aria-label={`Edit ${asset.name}`}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => handleDeleteClick(asset)}
            aria-label={`Delete ${asset.name}`}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </>
      ) : null}
    >
      <MetaList
        items={[
          { label: 'Description', value: asset.description, fallback: 'Not specified' },
          {
            label: 'Held by',
            value: asset.isAssigned ? asset.employeeName : <StatusBadge tone="muted">In stock</StatusBadge>,
            fallback: '—',
          },
          asset.isAssigned && {
            label: 'Since',
            value: asset.assignmentDate ? new Date(asset.assignmentDate).toLocaleDateString() : '—',
          },
        ]}
      />
    </ItemCard>
  );

  return (
    <>
      <DataPage
        refreshKey={refreshKey}
        title={isAdmin() ? "Asset Inventory" : "My Assets"}
        apiEndpoint={isAdmin() ? API_URLS.ASSETS.GET_ALL() : API_URLS.ASSETS.GET_MY_ASSETS()}
        searchFields={['name', 'description', 'serialNumber', 'employeeName']}
        dateFilter={{ label: 'Assigned', field: 'assignmentDate' }}
        personFilter={{ label: 'Held by', field: 'employeeName', emptyLabel: 'In stock' }}
        renderCard={renderAssetCard}
        subtitle={isAdmin() ? 'Company equipment and who currently holds it.' : 'Equipment currently assigned to you.'}
        emptyIcon={Laptop}
        searchPlaceholder="Search assets..."
        showAddButton={isAdmin()}
        onAddClick={handleAddClick}
      />

      <RoleBasedContent allowedRoles={['Admin']}>
        <AssetModal
          show={showModal}
          onHide={() => setShowModal(false)}
          asset={editingAsset}
          onSave={refresh}
          employees={employees}
        />
      </RoleBasedContent>

      <RoleBasedContent allowedRoles={['Admin']}>
        <AssetCustodyModal
          show={Boolean(custodyAsset)}
          asset={custodyAsset}
          employees={employees}
          onHide={() => setCustodyAsset(null)}
          onChanged={refresh}
        />
      </RoleBasedContent>

      <ConfirmDialog
        open={showDeleteModal}
        onOpenChange={(open) => { if (!open) closeDelete(); }}
        busy={deleting}
        title="Confirm Delete"
        description={`Are you sure you want to delete asset "${assetToDelete?.name}"? This action cannot be undone.`}
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

export default AssetsPage;
