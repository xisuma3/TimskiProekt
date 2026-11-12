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
import { authenticatedFetch, register } from '../services/authService';
import { API_URLS } from '../config/api';

const EmployeeModal = ({ show, onHide, employee = null, onSave, departments = [] }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    position: '',
    departmentID: '',
    hireDate: '',
    managerName: '',
    mentorName: '',
    managerID: null,
    mentorID: null,
    password: '',
    confirmPassword: '',
    applicationUserId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!employee;

  // Generate UUID for new employees
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
  };

  useEffect(() => {
    if (employee) {
      // Find department ID by matching department name
      const matchingDept = departments.find(dept => dept.name === employee.departmentName);
      const departmentID = employee.departmentID || (matchingDept ? matchingDept.departmentID : '');

      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        position: employee.position || '',
        departmentID: departmentID,
        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
        managerName: employee.managerName || '',
        mentorName: employee.mentorName || '',
        managerID: employee.managerID || null,
        mentorID: employee.mentorID || null,
        password: '',
        confirmPassword: '',
        applicationUserId: employee.applicationUserId || ''
      });
    } else {
      // For creating new employee, generate UUID
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        position: '',
        departmentID: '',
        hireDate: '',
        managerName: '',
        mentorName: '',
        managerID: null,
        mentorID: null,
        password: '',
        confirmPassword: '',
        applicationUserId: generateUUID()
      });
    }
    setError('');
  }, [employee, show, departments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        // For editing employees, just update employee data (no user changes)
        const dataToSend = {
          FirstName: formData.firstName,
          LastName: formData.lastName,
          Email: formData.email,
          Position: formData.position,
          DepartmentID: formData.departmentID || null,
          HireDate: formData.hireDate,
          ManagerID: formData.managerID,
          MentorID: formData.mentorID
        };

        const response = await authenticatedFetch(
          API_URLS.EMPLOYEES.UPDATE(employee.employeeID),
          {
            method: 'PUT',
            body: JSON.stringify(dataToSend)
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.errors
            ? Object.values(errorData.errors).flat().join(', ')
            : 'Failed to update employee.';
          throw new Error(errorMessage);
        }

        // Check if response has content (204 No Content returns empty body)
        let savedEmployee = null;
        if (response.status !== 204) {
          savedEmployee = await response.json();
        }
        onSave(savedEmployee || formData);
        onHide();
        return;
      }

      // For new employees - validate passwords first
      if (!formData.password) {
        throw new Error('Password is required for new employees.');
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match.');
      }
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      // Use the enhanced register API that creates both user and employee
      const registerData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        position: formData.position,
        departmentID: formData.departmentID || null,
        hireDate: formData.hireDate
      };

      const result = await register(registerData);

      // The register API now creates both the user and employee
      onSave(result);
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
            <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update their details, team and start date.'
                : 'Create the employee record and the login they will sign in with.'}
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
                <FieldLabel htmlFor="employee-first-name">First Name *</FieldLabel>
                <Input
                  id="employee-first-name"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="employee-last-name">Last Name *</FieldLabel>
                <Input
                  id="employee-last-name"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="employee-email">Email *</FieldLabel>
                <Input
                  id="employee-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="employee-position">Position *</FieldLabel>
                <Input
                  id="employee-position"
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="employee-department">Department *</FieldLabel>
                <NativeSelect
                  id="employee-department"
                  name="departmentID"
                  value={formData.departmentID}
                  onChange={handleChange}
                  required
                  className="w-full"
                >
                  <NativeSelectOption value="">Select Department</NativeSelectOption>
                  {departments.map(dept => (
                    <NativeSelectOption key={dept.departmentID} value={dept.departmentID}>
                      {dept.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="employee-hire-date">Hire Date *</FieldLabel>
                <Input
                  id="employee-hire-date"
                  type="date"
                  name="hireDate"
                  value={formData.hireDate}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="employee-manager">Manager</FieldLabel>
                <Input
                  id="employee-manager"
                  type="text"
                  name="managerName"
                  value={formData.managerName}
                  readOnly
                  className="bg-muted/50"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="employee-mentor">Mentor</FieldLabel>
                <Input
                  id="employee-mentor"
                  type="text"
                  name="mentorName"
                  value={formData.mentorName}
                  readOnly
                  className="bg-muted/50"
                />
              </Field>

              {/* Password fields - only for new employees */}
              {!isEditing && (
                <>
                  <Field>
                    <FieldLabel htmlFor="employee-password">Password *</FieldLabel>
                    <Input
                      id="employee-password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter initial password"
                    />
                    <FieldDescription>Minimum 6 characters</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="employee-confirm-password">Confirm Password *</FieldLabel>
                    <Input
                      id="employee-confirm-password"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm password"
                    />
                  </Field>
                </>
              )}
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

export default EmployeeModal;
