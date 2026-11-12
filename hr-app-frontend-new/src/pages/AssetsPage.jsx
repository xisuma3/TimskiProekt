import { useEffect, useState } from 'react';
import { ArrowLeftRight, Laptop, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '../components/app/ConfirmDialog';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import StatusBadge from '../components/app/StatusBadge';
import DataPage from '../components/DataPage';
import AssetModal from '../components/AssetModal';
import AssetCustodyModal from '../components/AssetCustodyModal';
import RoleBasedContent from '../components/RoleBasedContent';
import { authenticatedFetch, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';

const AssetsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);
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

  const handleDeleteConfirm = async () => {
    try {
      const response = await authenticatedFetch(
        API_URLS.ASSETS.DELETE(assetToDelete.assetID),
        { method: 'DELETE' }
      );

      if (response.ok) {
        window.location.reload();
      } else {
        throw new Error('Failed to delete asset');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete asset');
    } finally {
      setShowDeleteModal(false);
      setAssetToDelete(null);
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
          onSave={() => window.location.reload()}
          employees={employees}
        />
      </RoleBasedContent>

      <RoleBasedContent allowedRoles={['Admin']}>
        <AssetCustodyModal
          show={Boolean(custodyAsset)}
          asset={custodyAsset}
          employees={employees}
          onHide={() => setCustodyAsset(null)}
          onChanged={() => window.location.reload()}
        />
      </RoleBasedContent>

      <ConfirmDialog
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Confirm Delete"
        description={`Are you sure you want to delete asset "${assetToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export default AssetsPage;
