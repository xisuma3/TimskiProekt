import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const AssetModal = ({ show, onHide, asset = null, onSave, employees = [] }) => {
  const [formData, setFormData] = useState({
    name: '', // Backend expects 'Name' field
    description: '', // Backend expects 'Description' field (required)
    serialNumber: '',
    employeeID: '', // Backend expects 'EmployeeID' for assignment
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!asset;

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || '',
        description: asset.description || '',
        serialNumber: asset.serialNumber || '',
        employeeID: asset.employeeID || '',
        isActive: asset.isActive !== undefined ? asset.isActive : true
      });
    } else {
      setFormData({
        name: '',
        description: '',
        serialNumber: '',
        employeeID: '',
        isActive: true
      });
    }
    setError('');
  }, [asset, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing
        ? API_URLS.ASSETS.UPDATE(asset.assetID)
        : API_URLS.ASSETS.CREATE();

      const method = isEditing ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        employeeID: formData.employeeID || null
      };

      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} asset.`);
      }

      onSave();
      onHide();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) onHide(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the asset’s details.' : 'Add a piece of company equipment to the inventory.'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="asset-name">Asset Name *</FieldLabel>
              <Input id="asset-name" type="text" name="name" value={formData.name} onChange={handleChange} required />
            </Field>

            <Field>
              <FieldLabel htmlFor="asset-description">Description *</FieldLabel>
              <Textarea
                id="asset-description"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="asset-serial">Serial Number</FieldLabel>
                <Input
                  id="asset-serial"
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="asset-employee">Assigned To</FieldLabel>
                <NativeSelect
                  id="asset-employee"
                  name="employeeID"
                  value={formData.employeeID}
                  onChange={handleChange}
                  className="w-full"
                >
                  <NativeSelectOption value="">Unassigned</NativeSelectOption>
                  {employees.map(emp => (
                    <NativeSelectOption key={emp.employeeID} value={emp.employeeID}>
                      {emp.firstName} {emp.lastName}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <Field orientation="horizontal">
              <Checkbox
                id="asset-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked === true }))}
              />
              <FieldLabel htmlFor="asset-active" className="font-normal">Active</FieldLabel>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onHide}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner />}
              {loading ? 'Saving…' : (isEditing ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssetModal;
