import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const DepartmentModal = ({ show, onHide, department = null, onSave }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!department;

  useEffect(() => {
    setFormData({
      name: department?.name || '',
      description: department?.description || '',
    });
    setError('');
  }, [department, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing
        ? API_URLS.DEPARTMENTS.UPDATE(department.departmentID)
        : API_URLS.DEPARTMENTS.CREATE();

      const response = await authenticatedFetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} department.`);
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) onHide(); }}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the department’s name and description.' : 'Create a team people can be assigned to.'}
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
              <FieldLabel htmlFor="department-name">Department name *</FieldLabel>
              <Input id="department-name" name="name" value={formData.name} onChange={handleChange} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="department-description">Description</FieldLabel>
              <Textarea
                id="department-description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onHide}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner />}
              {loading ? 'Saving…' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentModal;
