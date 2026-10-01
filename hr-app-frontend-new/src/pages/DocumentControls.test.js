import { render, screen } from '@testing-library/react';
import DocumentTemplatesPage from './DocumentTemplatesPage';
import GeneratedDocumentsPage from './GeneratedDocumentsPage';
import { authenticatedFetch } from '../services/authService';

let mockIsAdmin = false;

jest.mock('../services/authService', () => ({
  authenticatedFetch: jest.fn(),
  isAdmin: () => mockIsAdmin,
}));

const template = { templateID: 'template-1', templateName: 'Employment Letter', templateType: 'Employment' };
const document = { documentID: 'document-1', templateName: 'Employment Letter', documentType: 'Employment', generatedDate: '2024-01-01' };

beforeEach(() => {
  authenticatedFetch.mockResolvedValue({ ok: true, json: async () => [template] });
});

test('document template controls are visible only to admins', async () => {
  mockIsAdmin = false;
  const employeeView = render(<DocumentTemplatesPage />);
  expect(await screen.findByText('Employment Letter')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Create Template' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit template' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete template' })).not.toBeInTheDocument();

  employeeView.unmount();
  mockIsAdmin = true;
  render(<DocumentTemplatesPage />);
  expect(await screen.findByRole('button', { name: 'Create Template' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Edit template' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete template' })).toBeInTheDocument();
});

test('generated document mutation controls are hidden from employees', async () => {
  authenticatedFetch.mockResolvedValue({ ok: true, json: async () => [document] });
  mockIsAdmin = false;
  const employeeView = render(<GeneratedDocumentsPage />);
  expect(await screen.findByText('Employment Letter')).toBeInTheDocument();
  expect(employeeView.container).toHaveTextContent('My Document');
  expect(screen.queryByRole('button', { name: 'Generate Document' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'View document' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete document' })).not.toBeInTheDocument();

  employeeView.unmount();
  mockIsAdmin = true;
  render(<GeneratedDocumentsPage />);
  expect(await screen.findByRole('button', { name: 'Generate Document' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Delete document' })).toBeInTheDocument();
});
