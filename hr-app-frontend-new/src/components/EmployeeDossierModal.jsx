import { useState, useEffect } from 'react';
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { authenticatedFetch } from '../services/authService';
import { readErrorMessage } from '../services/apiError';
import { API_URLS } from '../config/api';

const EmployeeDossierModal = ({ show, onHide, dossier = null, onSave, employees = [] }) => {
  const [formData, setFormData] = useState({
    employeeID: '',
    birthDate: '',
    address: '',
    emergencyContact: '',
    employmentType: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!dossier;
  const employmentTypes = ['Full-Time', 'Part-Time', 'Contract'];

  useEffect(() => {
    if (dossier) {
      setFormData({
        employeeID: dossier.employeeID || '',
        birthDate: dossier.birthDate ? new Date(dossier.birthDate).toISOString().split('T')[0] : '',
        address: dossier.address || '',
        emergencyContact: dossier.emergencyContact || '',
        employmentType: dossier.employmentType || ''
      });
    } else {
      setFormData({
        employeeID: '',
        birthDate: '',
        address: '',
        emergencyContact: '',
        employmentType: ''
      });
    }
    setError('');
  }, [dossier, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing
        ? API_URLS.EMPLOYEE_DOSSIERS.UPDATE(dossier.dossierID)
        : API_URLS.EMPLOYEE_DOSSIERS.CREATE();

      const method = isEditing ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        // The body may be empty or plain text; never let that become a parsing error.
        throw new Error(await readErrorMessage(response, `Failed to ${isEditing ? 'update' : 'create'} dossier`));
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
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Employee Dossier' : 'Create Employee Dossier'}</DialogTitle>
            <DialogDescription>
              Personal and employment details HR keeps on file for this employee.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="dossier-employee">Employee *</FieldLabel>
                <NativeSelect
                  id="dossier-employee"
                  name="employeeID"
                  value={formData.employeeID}
                  onChange={handleChange}
                  required
                  disabled={isEditing}
                  className="w-full"
                >
                  <NativeSelectOption value="">Select Employee</NativeSelectOption>
                  {employees.map(emp => (
                    <NativeSelectOption key={emp.employeeID} value={emp.employeeID}>
                      {emp.firstName} {emp.lastName}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="dossier-employment-type">Employment Type *</FieldLabel>
                <NativeSelect
                  id="dossier-employment-type"
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  required
                  className="w-full"
                >
                  <NativeSelectOption value="">Select Type</NativeSelectOption>
                  {employmentTypes.map(type => (
                    <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <Field>
                <FieldLabel htmlFor="dossier-birth-date">Birth Date</FieldLabel>
                <Input
                  id="dossier-birth-date"
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="dossier-emergency-contact">Emergency Contact</FieldLabel>
                <Input
                  id="dossier-emergency-contact"
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  placeholder="Name and phone number"
                />
                <FieldDescription>Who we should call in an emergency.</FieldDescription>
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="dossier-address">Address</FieldLabel>
                <Textarea
                  id="dossier-address"
                  rows={3}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Full address"
                />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onHide}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner />}
              {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDossierModal;
