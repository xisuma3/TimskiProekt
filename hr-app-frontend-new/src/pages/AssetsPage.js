import React from 'react';
import { Card } from 'react-bootstrap';
import DataPage from '../components/DataPage';

const AssetsPage = () => {
  const renderAssetCard = (asset) => (
    <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <Card.Title style={{ color: '#6366F1' }}>
          {asset.assetName}
        </Card.Title>
        <Card.Subtitle className="mb-2" style={{ color: '#94A3B8' }}>
          Asset ID: {asset.assetID}
        </Card.Subtitle>
        <Card.Text>
          <strong>Type:</strong> {asset.assetType || 'Not specified'}
          <br />
          <strong>Serial Number:</strong> {asset.serialNumber || 'N/A'}
          <br />
          <strong>Purchase Date:</strong> {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'Not specified'}
          <br />
          <strong>Value:</strong> ${asset.value ? asset.value.toLocaleString() : 'Not specified'}
          <br />
          {asset.assignedTo && (
            <>
              <strong>Assigned To:</strong> {asset.assignedTo}
              <br />
            </>
          )}
          {asset.location && (
            <>
              <strong>Location:</strong> {asset.location}
              <br />
            </>
          )}
          <strong>Status:</strong> {asset.status || 'Active'}
        </Card.Text>
      </Card.Body>
    </Card>
  );

  return (
    <DataPage
      title="Asset Inventory"
      apiEndpoint="http://localhost:5190/api/Asset/GetAll"
      searchFields={['assetName', 'assetType', 'serialNumber', 'location']}
      renderCard={renderAssetCard}
      searchPlaceholder="Search assets..."
    />
  );
};

export default AssetsPage; 