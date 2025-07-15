import React from 'react';
import { Card } from 'react-bootstrap';
import DataPage from '../components/DataPage';

const DepartmentsPage = () => {
  const renderDepartmentCard = (dept) => (
    <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <Card.Title style={{ color: '#6366F1' }}>
          {dept.departmentName}
        </Card.Title>
        <Card.Subtitle className="mb-2" style={{ color: '#94A3B8' }}>
          Department ID: {dept.departmentID}
        </Card.Subtitle>
        <Card.Text>
          <strong>Description:</strong> {dept.description || 'No description available'}
          <br />
          <strong>Location:</strong> {dept.location || 'Not specified'}
          <br />
          {dept.managerName && (
            <>
              <strong>Manager:</strong> {dept.managerName}
              <br />
            </>
          )}
          {dept.employeeCount && (
            <>
              <strong>Employee Count:</strong> {dept.employeeCount}
              <br />
            </>
          )}
        </Card.Text>
      </Card.Body>
    </Card>
  );

  return (
    <DataPage
      title="Department Directory"
      apiEndpoint="http://localhost:5190/api/Department/GetAll"
      searchFields={['departmentName', 'description', 'location']}
      renderCard={renderDepartmentCard}
      searchPlaceholder="Search departments..."
    />
  );
};

export default DepartmentsPage; 