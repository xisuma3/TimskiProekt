import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SelfServiceDocumentModal from './SelfServiceDocumentModal';
import { authenticatedFetch } from '../services/authService';

vi.mock('../services/authService', () => ({ authenticatedFetch: vi.fn() }));

// What GetSelfService returns: only opted-in templates, no HTML, and a listsAssets flag the
// server derives from the template body.
const templates = [
  { templateID: 't-conf', templateName: 'Employment Confirmation', description: 'For banks and visas',
    templateType: 'Employment', listsAssets: false },
  { templateID: 't-hand', templateName: 'Equipment Handover', templateType: 'Asset', listsAssets: true },
];
const myAssets = [{ assetID: 'a1', name: 'ThinkPad X1', serialNumber: 'SN-1' }];

const mockApi = (onGenerate) =>
  authenticatedFetch.mockImplementation((url, options = {}) => {
    if (url.includes('GenerateMine')) return onGenerate(JSON.parse(options.body));
    if (url.includes('DocumentTemplate/GetSelfService')) return Promise.resolve({ ok: true, json: async () => templates });
    if (url.includes('GetMyAssets')) return Promise.resolve({ ok: true, json: async () => myAssets });
    return Promise.resolve({ ok: false, json: async () => ({}) });
  });

beforeEach(() => { authenticatedFetch.mockReset(); });

test('asks only for the self-service list, never the HR template library', async () => {
  mockApi(() => Promise.resolve({ ok: true, json: async () => ({}) }));
  render(<SelfServiceDocumentModal show onHide={() => {}} onGenerated={() => {}} />);

  expect(await screen.findByText('Employment Confirmation')).toBeInTheDocument();
  const urls = authenticatedFetch.mock.calls.map(([url]) => url);
  expect(urls.some((u) => u.includes('DocumentTemplate/GetSelfService'))).toBe(true);
  expect(urls.some((u) => u.includes('DocumentTemplate/GetAll'))).toBe(false);
});

test('offers the self-service templates and sends just the template for a plain letter', async () => {
  const generate = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ documentID: 'd1' }) }));
  mockApi(generate);
  const onGenerated = vi.fn();
  render(<SelfServiceDocumentModal show onHide={() => {}} onGenerated={onGenerated} />);

  expect(await screen.findByText('Employment Confirmation')).toBeInTheDocument();
  expect(screen.getByText('Equipment Handover')).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText(/Employment Confirmation/));
  expect(screen.queryByText('Equipment to list')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

  await waitFor(() => expect(onGenerated).toHaveBeenCalledWith({ documentID: 'd1' }));
  expect(generate).toHaveBeenCalledWith({ templateID: 't-conf', assetIDs: [] });
});

test('a handover template lists my assets, all ticked by default', async () => {
  const generate = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ documentID: 'd2' }) }));
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
  authenticatedFetch.mockImplementation(() =>
    Promise.resolve({ ok: true, json: async () => [] }));
  render(<SelfServiceDocumentModal show onHide={() => {}} onGenerated={() => {}} />);
  expect(await screen.findByText('Nothing available yet')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
});
