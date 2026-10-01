import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SelfServiceDocumentModal, { usesAssets } from './SelfServiceDocumentModal';
import { authenticatedFetch } from '../services/authService';

jest.mock('../services/authService', () => ({ authenticatedFetch: jest.fn() }));

const templates = [
  { templateID: 't-conf', templateName: 'Employment Confirmation', description: 'For banks and visas',
    templateType: 'Employment', templateContent: '<p>{{employee.firstName}}</p>', allowSelfService: true },
  { templateID: 't-hand', templateName: 'Equipment Handover', templateType: 'Asset',
    templateContent: '{{#assetList}}<li>{{asset.name}}</li>{{/assetList}}', allowSelfService: true },
  { templateID: 't-sal', templateName: 'Salary Adjustment', templateType: 'Salary',
    templateContent: '<p>Salary</p>', allowSelfService: false },
];
const myAssets = [{ assetID: 'a1', name: 'ThinkPad X1', serialNumber: 'SN-1' }];

const mockApi = (onGenerate) =>
  authenticatedFetch.mockImplementation((url, options = {}) => {
    if (url.includes('GenerateMine')) return onGenerate(JSON.parse(options.body));
    if (url.includes('DocumentTemplate')) return Promise.resolve({ ok: true, json: async () => templates });
    if (url.includes('GetMyAssets')) return Promise.resolve({ ok: true, json: async () => myAssets });
    return Promise.resolve({ ok: false, json: async () => ({}) });
  });

beforeEach(() => authenticatedFetch.mockReset());

test('detects templates that list equipment', () => {
  expect(usesAssets('{{#assetList}}x{{/assetList}}')).toBe(true);
  expect(usesAssets('{{ asset.name }}')).toBe(true);
  expect(usesAssets('<p>{{employee.firstName}}</p>')).toBe(false);
});

test('only offers self-service templates and sends just the template for a plain letter', async () => {
  const generate = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ documentID: 'd1' }) }));
  mockApi(generate);
  const onGenerated = jest.fn();
  render(<SelfServiceDocumentModal show onHide={() => {}} onGenerated={onGenerated} />);

  expect(await screen.findByText('Employment Confirmation')).toBeInTheDocument();
  expect(screen.getByText('Equipment Handover')).toBeInTheDocument();
  expect(screen.queryByText('Salary Adjustment')).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText(/Employment Confirmation/));
  expect(screen.queryByText('Equipment to list')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

  await waitFor(() => expect(onGenerated).toHaveBeenCalledWith({ documentID: 'd1' }));
  expect(generate).toHaveBeenCalledWith({ templateID: 't-conf', assetIDs: [] });
});

test('a handover template lists my assets, all ticked by default', async () => {
  const generate = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ documentID: 'd2' }) }));
  mockApi(generate);
  render(<SelfServiceDocumentModal show onHide={() => {}} onGenerated={() => {}} />);

  fireEvent.click(await screen.findByLabelText(/Equipment Handover/));
  const laptop = screen.getByLabelText('ThinkPad X1 · SN-1');
  expect(laptop).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
  await waitFor(() => expect(generate).toHaveBeenCalledWith({ templateID: 't-hand', assetIDs: ['a1'] }));
});

test('shows the server message when generation is refused', async () => {
  mockApi(() => Promise.resolve({ ok: false, json: async () => ({ message: 'This document can only be issued by HR.' }) }));
  render(<SelfServiceDocumentModal show onHide={() => {}} onGenerated={() => {}} />);
  fireEvent.click(await screen.findByLabelText(/Employment Confirmation/));
  fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
  expect(await screen.findByText('This document can only be issued by HR.')).toBeInTheDocument();
});

test('explains when HR has opted nothing in', async () => {
  authenticatedFetch.mockImplementation((url) =>
    Promise.resolve({ ok: true, json: async () => (url.includes('DocumentTemplate') ? [templates[2]] : []) }));
  render(<SelfServiceDocumentModal show onHide={() => {}} onGenerated={() => {}} />);
  expect(await screen.findByText('Nothing available yet')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
});
